from flask import Blueprint, request, jsonify, send_file
import io
import datetime
import openpyxl
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from sqlalchemy import inspect, text
from db import get_db
from ml.model import risk_predictor
from ml.intervention import intervention_engine

faculty_bp = Blueprint('faculty', __name__)

STUDENT_DETAIL_COLUMNS = [
    ('aadhaar_number', 'VARCHAR(32)'),
    ('address', 'TEXT'),
    ('dob', 'DATE'),
    ('father_name', 'VARCHAR(100)'),
    ('mother_name', 'VARCHAR(100)'),
    ('batch', 'VARCHAR(50)'),
]

def ensure_student_detail_columns(db):
    """Add optional upload fields without changing existing student rows."""
    existing = {column['name'] for column in inspect(db.bind).get_columns('students')}
    for column_name, column_type in STUDENT_DETAIL_COLUMNS:
        if column_name not in existing:
            db.execute(text(f"ALTER TABLE students ADD COLUMN {column_name} {column_type}"))
    if any(column_name not in existing for column_name, _ in STUDENT_DETAIL_COLUMNS):
        db.commit()

def clean_upload_value(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None

def format_upload_date(value):
    if value is None:
        return None
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.strftime('%Y-%m-%d')
    return str(value).strip() or None

@faculty_bp.route('/upload-details', methods=['POST'])
def upload_student_details():
    upload = request.files.get('file')
    if not upload or not upload.filename:
        return jsonify({'success': False, 'message': 'Please select an Excel (.xlsx) file.'}), 400
    if not upload.filename.lower().endswith('.xlsx'):
        return jsonify({'success': False, 'message': 'Only .xlsx Excel files are supported.'}), 400

    workbook = None
    try:
        workbook = openpyxl.load_workbook(upload, read_only=False, data_only=True)
        worksheet = workbook.active
        rows = list(worksheet.iter_rows(values_only=True))
        if not rows:
            workbook.close()
            return jsonify({'success': False, 'message': 'The uploaded Excel file is empty.'}), 400
    except Exception as error:
        if workbook is not None:
            workbook.close()
        return jsonify({'success': False, 'message': f'Unable to read the Excel file: {error}'}), 400

    raw_headers = [str(value).strip().lower() if value is not None else '' for value in rows[0]]

    def find_col(aliases):
        for alias in aliases:
            for idx, h in enumerate(raw_headers):
                if h and alias in h:
                    return idx
        return None

    # Detect column indices
    reg_idx = find_col(['registration number', 'registration_number', 'reg_number', 'reg number', 'reg. number', 'registration', 'student_id', 'student id'])
    att_idx = find_col(['attendance_percentage', 'attendance_pct', 'attendance', 'attendence'])
    test_idx = find_col(['test_average', 'avg_test_score', 'test_score', 'test average', 'test'])
    assign_idx = find_col(['assignment_average', 'avg_assignment_score', 'assignment_score', 'assignment average', 'assignment'])
    delay_idx = find_col(['submission_delay_count', 'submission_delays', 'delay_count', 'delays'])
    trend_idx = find_col(['performance_trend', 'trend'])

    # Profile detail columns
    name_idx = find_col(['name', 'student_name', 'student name'])
    dept_idx = find_col(['department', 'dept'])
    course_idx = find_col(['course'])
    year_idx = find_col(['year'])
    sem_idx = find_col(['semester', 'sem'])
    aadhaar_idx = find_col(['aadhaar number', 'aadhaar_number', 'aadhaar'])
    address_idx = find_col(['address'])
    dob_idx = find_col(['dob', 'date of birth'])
    father_idx = find_col(["father's name", 'father_name', 'father name'])
    mother_idx = find_col(["mother's name", 'mother_name', 'mother name'])
    batch_idx = find_col(['batch'])

    if reg_idx is None:
        # Fallback to col 0 if non-empty
        reg_idx = 0

    db = next(get_db())
    processed = 0
    matched_count = 0
    updated_count = 0
    unmatched_count = 0
    invalid_count = 0

    matched_students = []
    unmatched_students = []
    invalid_rows = []

    try:
        ensure_student_detail_columns(db)

        for row_number, row in enumerate(rows[1:], start=2):
            if not any(clean_upload_value(val) for val in row):
                continue
            processed += 1

            registration_number = clean_upload_value(row[reg_idx]) if reg_idx < len(row) else None
            if not registration_number or str(registration_number).startswith('Note:'):
                invalid_count += 1
                invalid_rows.append({'row': row_number, 'reason': 'Missing Registration Number'})
                continue

            # Lookup student in database
            student_row = db.execute(
                text('SELECT id, reg_number, name, department, course, year, semester FROM students WHERE UPPER(reg_number) = UPPER(:reg)'),
                {'reg': registration_number}
            ).fetchone()

            if not student_row:
                unmatched_count += 1
                unmatched_students.append({
                    'row': row_number,
                    'registration_number': registration_number,
                    'reason': 'Student Registration Number not found in system database'
                })
                continue

            matched_count += 1
            student_id = student_row[0]

            # 1. Update Academic Data if present in row
            att = float(row[att_idx]) if att_idx is not None and att_idx < len(row) and row[att_idx] is not None else None
            test_score = float(row[test_idx]) if test_idx is not None and test_idx < len(row) and row[test_idx] is not None else None
            assign_score = float(row[assign_idx]) if assign_idx is not None and assign_idx < len(row) and row[assign_idx] is not None else None
            delays = int(row[delay_idx]) if delay_idx is not None and delay_idx < len(row) and row[delay_idx] is not None else None
            trend = clean_upload_value(row[trend_idx]) if trend_idx is not None and trend_idx < len(row) else 'Stable'

            pred_risk = None
            if att is not None and test_score is not None and assign_score is not None and delays is not None:
                existing_acad = db.execute(
                    text('SELECT id FROM academic_records WHERE student_id = :sid'),
                    {'sid': student_id}
                ).scalar()

                if existing_acad:
                    db.execute(text("""
                        UPDATE academic_records SET
                            attendance_pct = :att,
                            avg_test_score = :test,
                            avg_assignment_score = :assign,
                            submission_delays = :delays,
                            performance_trend = :trend
                        WHERE student_id = :sid
                    """), {
                        'sid': student_id,
                        'att': att,
                        'test': test_score,
                        'assign': assign_score,
                        'delays': delays,
                        'trend': trend or 'Stable'
                    })
                else:
                    db.execute(text("""
                        INSERT INTO academic_records (
                            student_id, attendance_pct, avg_test_score, avg_assignment_score, submission_delays, performance_trend
                        ) VALUES (
                            :sid, :att, :test, :assign, :delays, :trend
                        )
                    """), {
                        'sid': student_id,
                        'att': att,
                        'test': test_score,
                        'assign': assign_score,
                        'delays': delays,
                        'trend': trend or 'Stable'
                    })

                # Compute real-time ML prediction on the 5 uploaded features
                acad_data = {
                    'attendance_pct': att,
                    'avg_test_score': test_score,
                    'avg_assignment_score': assign_score,
                    'submission_delays': delays,
                    'performance_trend': trend or 'Stable'
                }
                pred_risk = risk_predictor.predict_risk(acad_data)
                updated_count += 1

            # 2. Update Student Profile details if present in row
            update_profile_kwargs = {}
            if name_idx is not None and name_idx < len(row) and clean_upload_value(row[name_idx]):
                update_profile_kwargs['name'] = clean_upload_value(row[name_idx])
            if dept_idx is not None and dept_idx < len(row) and clean_upload_value(row[dept_idx]):
                update_profile_kwargs['department'] = clean_upload_value(row[dept_idx])
            if course_idx is not None and course_idx < len(row) and clean_upload_value(row[course_idx]):
                update_profile_kwargs['course'] = clean_upload_value(row[course_idx])
            if aadhaar_idx is not None and aadhaar_idx < len(row) and clean_upload_value(row[aadhaar_idx]):
                update_profile_kwargs['aadhaar_number'] = clean_upload_value(row[aadhaar_idx])
            if address_idx is not None and address_idx < len(row) and clean_upload_value(row[address_idx]):
                update_profile_kwargs['address'] = clean_upload_value(row[address_idx])

            if update_profile_kwargs:
                set_clauses = [f"{col} = :{col}" for col in update_profile_kwargs]
                update_profile_kwargs['sid'] = student_id
                db.execute(text(f"UPDATE students SET {', '.join(set_clauses)} WHERE id = :sid"), update_profile_kwargs)

            matched_students.append({
                'student_id': student_id,
                'reg_number': student_row[1],
                'name': student_row[2],
                'department': student_row[3],
                'attendance_pct': att,
                'avg_test_score': test_score,
                'avg_assignment_score': assign_score,
                'submission_delays': delays,
                'performance_trend': trend,
                'predicted_risk_level': pred_risk['risk_level'] if pred_risk else 'N/A',
                'risk_score': pred_risk['risk_score'] if pred_risk else 0
            })

        db.commit()
        return jsonify({
            'success': True,
            'message': f"Upload completed: {processed} records received, {matched_count} matched, {updated_count} updated, {unmatched_count} unmatched, {invalid_count} invalid.",
            'summary': {
                'records_received': processed,
                'matched': matched_count,
                'updated': updated_count,
                'unmatched': unmatched_count,
                'invalid': invalid_count
            },
            'matched_students': matched_students,
            'unmatched_students': unmatched_students,
            'invalid_rows': invalid_rows
        })
    except Exception as error:
        db.rollback()
        return jsonify({'success': False, 'message': f'Upload processing error: {error}'}), 500
    finally:
        db.close()
        if workbook is not None:
            workbook.close()

def student_detail_payload(row):
    return {
        'id': row[0],
        'reg_number': row[1],
        'name': row[2],
        'department': row[3],
        'course': row[4],
        'year': row[5],
        'semester': row[6],
        'aadhaar_number': row[7],
        'address': row[8],
        'dob': str(row[9]) if row[9] is not None else '',
        'father_name': row[10],
        'mother_name': row[11],
        'batch': row[12]
    }

@faculty_bp.route('/student-details', methods=['GET'])
def list_student_details():
    db = next(get_db())
    try:
        ensure_student_detail_columns(db)
        rows = db.execute(text("""
            SELECT id, reg_number, name, department, course, year, semester,
                   aadhaar_number, address, dob, father_name, mother_name, batch
            FROM students ORDER BY id ASC
        """)).fetchall()
        return jsonify({'success': True, 'students': [student_detail_payload(row) for row in rows]})
    finally:
        db.close()

@faculty_bp.route('/dashboard-stats', methods=['GET'])
def get_faculty_dashboard_stats():
    db = next(get_db())
    try:
        students_query = text("""
            SELECT s.id, s.reg_number, s.name, s.department, 
                   a.attendance_pct, a.avg_test_score, a.avg_assignment_score, 
                   a.submission_delays, a.performance_trend
            FROM students s
            LEFT JOIN academic_records a ON s.id = a.student_id
        """)
        student_rows = db.execute(students_query).fetchall()

        total_students = len(student_rows)
        high_risk_count = 0
        med_risk_count = 0
        low_risk_count = 0

        for row in student_rows:
            if row[4] is not None and row[5] is not None and row[6] is not None and row[7] is not None:
                acad = {
                    'attendance_pct': float(row[4]),
                    'avg_test_score': float(row[5]),
                    'avg_assignment_score': float(row[6]),
                    'submission_delays': int(row[7]),
                    'performance_trend': row[8] or 'Stable'
                }
                pred = risk_predictor.predict_risk(acad)
                lvl = pred['risk_level']
                if lvl == 'HIGH':
                    high_risk_count += 1
                elif lvl == 'MEDIUM':
                    med_risk_count += 1
                else:
                    low_risk_count += 1

        pending_od = db.execute(text("SELECT COUNT(*) FROM od_applications WHERE status = 'Pending'")).scalar() or 0
        pending_leave = db.execute(text("SELECT COUNT(*) FROM leave_applications WHERE status = 'Pending'")).scalar() or 0
        pending_extracurricular = db.execute(text("SELECT COUNT(*) FROM extracurricular_activities WHERE verification_status = 'Pending'")).scalar() or 0

        return jsonify({
            'success': True,
            'stats': {
                'total_students': total_students,
                'high_risk_students': high_risk_count,
                'medium_risk_students': med_risk_count,
                'low_risk_students': low_risk_count,
                'pending_od_applications': int(pending_od),
                'pending_leave_applications': int(pending_leave),
                'pending_extracurricular': int(pending_extracurricular)
            }
        })
    finally:
        db.close()

@faculty_bp.route('/watchlist', methods=['GET'])
def get_risk_watchlist():
    db = next(get_db())
    try:
        query = text("""
            SELECT s.id, s.reg_number, s.name, s.department, s.course, s.year, s.semester,
                   a.attendance_pct, a.avg_test_score, a.avg_assignment_score, 
                   a.submission_delays, a.performance_trend, s.mentor_name
            FROM students s
            LEFT JOIN academic_records a ON s.id = a.student_id
            ORDER BY s.id ASC
        """)
        rows = db.execute(query).fetchall()

        watchlist = []
        for r in rows:
            has_acad = (r[7] is not None and r[8] is not None and r[9] is not None and r[10] is not None)
            if has_acad:
                acad = {
                    'attendance_pct': float(r[7]),
                    'avg_test_score': float(r[8]),
                    'avg_assignment_score': float(r[9]),
                    'submission_delays': int(r[10]),
                    'performance_trend': r[11] or 'Stable',
                    'mentor_name': r[12] or 'Faculty Advisor'
                }
                pred = risk_predictor.predict_risk(acad)
                interventions = intervention_engine.generate_intervention_plan(acad, pred)

                watchlist.append({
                    'id': r[0],
                    'reg_number': r[1],
                    'name': r[2],
                    'department': r[3],
                    'course': r[4],
                    'year': r[5],
                    'semester': r[6],
                    'attendance_pct': acad['attendance_pct'],
                    'avg_test_score': acad['avg_test_score'],
                    'avg_assignment_score': acad['avg_assignment_score'],
                    'submission_delays': acad['submission_delays'],
                    'performance_trend': acad['performance_trend'],
                    'risk_score': pred['risk_score'],
                    'risk_level': pred['risk_level'],
                    'risk_factors': pred['risk_factors'],
                    'intervention_summary': interventions['summary'],
                    'action_items': interventions['action_items'],
                    'mentor_alerted': interventions['mentor_alerted']
                })
            else:
                watchlist.append({
                    'id': r[0],
                    'reg_number': r[1],
                    'name': r[2],
                    'department': r[3],
                    'course': r[4],
                    'year': r[5],
                    'semester': r[6],
                    'attendance_pct': None,
                    'avg_test_score': None,
                    'avg_assignment_score': None,
                    'submission_delays': None,
                    'performance_trend': None,
                    'risk_score': 0,
                    'risk_level': 'Insufficient Data',
                    'risk_factors': ['Insufficient data for prediction'],
                    'intervention_summary': 'Upload academic performance data to generate risk diagnostics.',
                    'action_items': [],
                    'mentor_alerted': False
                })

        risk_order = {'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'Insufficient Data': 0}
        watchlist.sort(key=lambda x: (risk_order.get(x['risk_level'], 0), x['risk_score']), reverse=True)

        return jsonify({
            'success': True,
            'watchlist': watchlist
        })
    finally:
        db.close()

@faculty_bp.route('/student/<reg_number>/report', methods=['GET'])
def get_student_full_report(reg_number):
    db = next(get_db())
    try:
        student = db.execute(text("SELECT * FROM students WHERE UPPER(reg_number) = UPPER(:reg)"), {'reg': reg_number}).fetchone()
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        
        student_id = student[0]
        
        profile = {
            'reg_number': student[1],
            'name': student[2],
            'department': student[3],
            'course': student[4],
            'year': student[5],
            'semester': student[6],
            'section': student[7] if len(student) > 7 else '',
            'email': student[8] if len(student) > 8 else '',
            'phone': student[9] if len(student) > 9 else '',
            'mentor_name': student[10] if len(student) > 10 else 'Faculty Advisor'
        }

        acad_row = db.execute(text("SELECT * FROM academic_records WHERE student_id = :sid"), {'sid': student_id}).fetchone()
        if acad_row and acad_row[2] is not None and acad_row[3] is not None:
            acad = {
                'attendance_pct': float(acad_row[2]),
                'avg_test_score': float(acad_row[3]),
                'avg_assignment_score': float(acad_row[4]),
                'submission_delays': int(acad_row[5]),
                'performance_trend': acad_row[6] or 'Stable'
            }
            pred = risk_predictor.predict_risk(acad)
            interventions = intervention_engine.generate_intervention_plan(acad, pred)
            academic_summary = {**acad, **pred, 'interventions': interventions['action_items']}
        else:
            academic_summary = {
                'attendance_pct': None,
                'avg_test_score': None,
                'avg_assignment_score': None,
                'submission_delays': None,
                'performance_trend': None,
                'risk_score': 0,
                'risk_level': 'Insufficient Data',
                'risk_factors': ['Insufficient data for prediction'],
                'interventions': []
            }

        ods = db.execute(text("SELECT * FROM od_applications WHERE student_id = :sid"), {'sid': student_id}).fetchall()
        od_list = []
        od_days_total = 0
        for od in ods:
            try:
                d1 = datetime.datetime.strptime(od[2], '%Y-%m-%d')
                d2 = datetime.datetime.strptime(od[3], '%Y-%m-%d')
                days = (d2 - d1).days + 1
            except Exception:
                days = 1
            if od[8] == 'Approved':
                od_days_total += days
            od_list.append({'from_date': od[2], 'to_date': od[3], 'purpose': od[4], 'status': od[8], 'days': days})

        leaves = db.execute(text("SELECT * FROM leave_applications WHERE student_id = :sid"), {'sid': student_id}).fetchall()
        leave_list = []
        leave_days_total = 0
        for lv in leaves:
            try:
                d1 = datetime.datetime.strptime(lv[2], '%Y-%m-%d')
                d2 = datetime.datetime.strptime(lv[3], '%Y-%m-%d')
                days = (d2 - d1).days + 1
            except Exception:
                days = 1
            if lv[6] == 'Approved':
                leave_days_total += days
            leave_list.append({'from_date': lv[2], 'to_date': lv[3], 'purpose': lv[4], 'status': lv[6], 'days': days})

        extras = db.execute(text("SELECT * FROM extracurricular_activities WHERE student_id = :sid"), {'sid': student_id}).fetchall()
        extra_list = [{'type': e[2], 'event_name': e[3], 'date': e[4], 'status': e[8]} for e in extras]

        return jsonify({
            'success': True,
            'data': {
                'profile': profile,
                'academic': academic_summary,
                'od_summary': {'total_approved_days': od_days_total, 'details': od_list},
                'leave_summary': {'total_approved_days': leave_days_total, 'details': leave_list},
                'extracurriculars': extra_list
            }
        })
    except Exception as e:
        print("Error fetching report:", e)
        return jsonify({'success': False, 'message': 'Failed to generate report'}), 500
    finally:
        db.close()
