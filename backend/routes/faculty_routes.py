from flask import Blueprint, request, jsonify

import io
import datetime
import openpyxl
from flask import send_file
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

    expected_headers = [
        'registration number', 'attendance_percentage', 'test_average', 
        'assignment_average', 'submission_delay_count', 'performance_trend'
    ]

    workbook = None
    try:
        workbook = openpyxl.load_workbook(upload, read_only=True, data_only=True)
        worksheet = workbook.active
        rows = worksheet.iter_rows(values_only=True)
        header = next(rows, None)
        actual_headers = [str(value).strip().lower() if value is not None else '' for value in (header or ())]
        
        # We only care if the first 6 columns match expected_headers (allow trailing columns like risk_level if any)
        if actual_headers[:6] != expected_headers:
            workbook.close()
            return jsonify({
                'success': False,
                'message': 'Invalid Excel columns. Use the academic data template in the exact order.',
                'expected_columns': expected_headers,
                'received_columns': actual_headers
            }), 400
    except Exception as error:
        if workbook is not None:
            workbook.close()
        return jsonify({'success': False, 'message': f'Unable to read the Excel file: {error}'}), 400

    db = next(get_db())
    added_or_updated = 0
    skipped = []
    processed = 0
    try:
        for row_number, row in enumerate(rows, start=2):
            values = list(row)[:6]
            if not any(clean_upload_value(value) for value in values):
                continue
            processed += 1

            registration_number = clean_upload_value(values[0] if len(values) > 0 else None)
            if not registration_number:
                skipped.append({'row': row_number, 'reason': 'Missing Registration Number'})
                continue

            # Check if student exists
            student_id = db.execute(
                text('SELECT id FROM students WHERE UPPER(reg_number) = UPPER(:reg_number)'),
                {'reg_number': registration_number}
            ).scalar()
            
            if not student_id:
                skipped.append({'row': row_number, 'reason': 'Unmatched student', 'registration_number': registration_number})
                continue

            try:
                attendance = float(values[1]) if values[1] is not None else 0.0
                test_avg = float(values[2]) if values[2] is not None else 0.0
                assignment_avg = float(values[3]) if values[3] is not None else 0.0
                delays = int(values[4]) if values[4] is not None else 0
                trend = clean_upload_value(values[5]) or 'Stable'

                # Upsert academic records
                existing_record = db.execute(
                    text('SELECT id FROM academic_records WHERE student_id = :sid'),
                    {'sid': student_id}
                ).scalar()

                if existing_record:
                    db.execute(text("""
                        UPDATE academic_records SET
                            attendance_pct = :att,
                            avg_test_score = :test,
                            avg_assignment_score = :assign,
                            submission_delays = :delays,
                            performance_trend = :trend,
                            last_updated = CURRENT_TIMESTAMP
                        WHERE student_id = :sid
                    """), {
                        'att': attendance, 'test': test_avg, 'assign': assignment_avg,
                        'delays': delays, 'trend': trend, 'sid': student_id
                    })
                else:
                    db.execute(text("""
                        INSERT INTO academic_records (
                            student_id, attendance_pct, avg_test_score, avg_assignment_score,
                            submission_delays, performance_trend
                        ) VALUES (
                            :sid, :att, :test, :assign, :delays, :trend
                        )
                    """), {
                        'sid': student_id, 'att': attendance, 'test': test_avg, 
                        'assign': assignment_avg, 'delays': delays, 'trend': trend
                    })
                added_or_updated += 1
            except Exception as error:
                skipped.append({'row': row_number, 'reason': f'Invalid data format: {error}', 'registration_number': registration_number})

        db.commit()
        return jsonify({
            'success': True,
            'message': f'{added_or_updated} student academic record(s) synced successfully.',
            'summary': {'processed': processed, 'added_or_updated': added_or_updated, 'skipped': len(skipped)},
            'skipped_rows': skipped
        })
    except Exception as error:
        db.rollback()
        return jsonify({'success': False, 'message': f'Upload failed: {error}'}), 500
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


@faculty_bp.route('/student-details/<int:student_id>', methods=['PUT'])
def update_student_details(student_id):
    data = request.get_json() or {}
    required = ['reg_number', 'name', 'department', 'course', 'year', 'semester']
    if any(not str(data.get(field, '')).strip() for field in required):
        return jsonify({'success': False, 'message': 'Registration Number, Name, Department, Course, Year, and Semester are required.'}), 400

    db = next(get_db())
    try:
        ensure_student_detail_columns(db)
        existing_student = db.execute(text('SELECT id FROM students WHERE id = :student_id'), {'student_id': student_id}).scalar()
        if not existing_student:
            return jsonify({'success': False, 'message': 'Student record not found.'}), 404
        duplicate = db.execute(text("""
            SELECT id FROM students
            WHERE UPPER(reg_number) = UPPER(:reg_number) AND id != :student_id
        """), {'reg_number': str(data['reg_number']).strip(), 'student_id': student_id}).scalar()
        if duplicate:
            return jsonify({'success': False, 'message': 'That Registration Number already exists.'}), 409

        result = db.execute(text("""
            UPDATE students SET
                reg_number = :reg_number, name = :name, department = :department,
                course = :course, year = :year, semester = :semester,
                aadhaar_number = :aadhaar_number, address = :address, dob = :dob,
                father_name = :father_name, mother_name = :mother_name, batch = :batch
            WHERE id = :student_id
        """), {
            'student_id': student_id,
            'reg_number': str(data['reg_number']).strip(),
            'name': str(data['name']).strip(),
            'department': str(data['department']).strip(),
            'course': str(data['course']).strip(),
            'year': int(data['year']),
            'semester': int(data['semester']),
            'aadhaar_number': clean_upload_value(data.get('aadhaar_number')),
            'address': clean_upload_value(data.get('address')),
            'dob': clean_upload_value(data.get('dob')),
            'father_name': clean_upload_value(data.get('father_name')),
            'mother_name': clean_upload_value(data.get('mother_name')),
            'batch': clean_upload_value(data.get('batch'))
        })
        if result.rowcount != 1:
            db.rollback()
            return jsonify({'success': False, 'message': 'Student record not found.'}), 404
        db.commit()
        return jsonify({'success': True, 'message': 'Student details saved successfully.'})
    except (TypeError, ValueError):
        db.rollback()
        return jsonify({'success': False, 'message': 'Year and Semester must be valid numbers.'}), 400
    finally:
        db.close()


@faculty_bp.route('/student-details/<int:student_id>', methods=['DELETE'])
def delete_student_details(student_id):
    db = next(get_db())
    try:
        result = db.execute(text('DELETE FROM students WHERE id = :student_id'), {'student_id': student_id})
        if result.rowcount != 1:
            db.rollback()
            return jsonify({'success': False, 'message': 'Student record not found.'}), 404
        db.commit()
        return jsonify({'success': True, 'message': 'Student details deleted successfully.'})
    finally:
        db.close()


@faculty_bp.route('/dashboard-stats', methods=['GET'])
def get_faculty_dashboard_stats():
    db = next(get_db())
    try:
        # Get all students with academic records
        students_query = text("""
            SELECT s.id, s.reg_number, s.name, s.department, 
                   a.attendance_pct, a.avg_test_score, a.avg_assignment_score, 
                   a.submission_delays, a.performance_trend,
                   a.math_score, a.dbms_score, a.os_score, a.dsa_score
            FROM students s
            LEFT JOIN academic_records a ON s.id = a.student_id
        """)
        student_rows = db.execute(students_query).fetchall()

        total_students = len(student_rows)
        high_risk_count = 0
        med_risk_count = 0
        low_risk_count = 0

        for row in student_rows:
            acad = {
                'attendance_pct': float(row[4]) if row[4] is not None else 75.0,
                'avg_test_score': float(row[5]) if row[5] is not None else 70.0,
                'avg_assignment_score': float(row[6]) if row[6] is not None else 75.0,
                'submission_delays': int(row[7]) if row[7] is not None else 0,
                'performance_trend': row[8] or 'Stable',
                'math_score': float(row[9] or 70.0),
                'dbms_score': float(row[10] or 70.0),
                'os_score': float(row[11] or 70.0),
                'dsa_score': float(row[12] or 70.0)
            }
            pred = risk_predictor.predict_risk(acad)
            lvl = pred['risk_level']
            if lvl == 'HIGH':
                high_risk_count += 1
            elif lvl == 'MEDIUM':
                med_risk_count += 1
            else:
                low_risk_count += 1

        # Count pending applications
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
                   a.submission_delays, a.performance_trend,
                   a.math_score, a.dbms_score, a.os_score, a.dsa_score, s.mentor_name
            FROM students s
            LEFT JOIN academic_records a ON s.id = a.student_id
            ORDER BY s.id ASC
        """)
        rows = db.execute(query).fetchall()

        watchlist = []
        for r in rows:
            acad = {
                'attendance_pct': float(r[7]) if r[7] is not None else 75.0,
                'avg_test_score': float(r[8]) if r[8] is not None else 70.0,
                'avg_assignment_score': float(r[9]) if r[9] is not None else 75.0,
                'submission_delays': int(r[10]) if r[10] is not None else 0,
                'performance_trend': r[11] or 'Stable',
                'math_score': float(r[12] or 70.0),
                'dbms_score': float(r[13] or 70.0),
                'os_score': float(r[14] or 70.0),
                'dsa_score': float(r[15] or 70.0),
                'mentor_name': r[16] or 'Faculty Advisor'
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

        # Rank: High risk on top (sorted by risk_score descending)
        risk_order = {'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
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
        # 1. Profile
        student = db.execute(text("SELECT * FROM students WHERE reg_number = :reg"), {'reg': reg_number}).fetchone()
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
            'section': student[7],
            'email': student[8],
            'phone': student[9],
            'mentor_name': student[10]
        }

        # 2. Academic & Risk (We'll use risk_predictor and intervention_engine directly)
        acad_row = db.execute(text("SELECT * FROM academic_records WHERE student_id = :sid"), {'sid': student_id}).fetchone()
        acad = {
            'attendance_pct': float(acad_row[2]) if acad_row and acad_row[2] is not None else 75.0,
            'avg_test_score': float(acad_row[3]) if acad_row and acad_row[3] is not None else 70.0,
            'avg_assignment_score': float(acad_row[4]) if acad_row and acad_row[4] is not None else 75.0,
            'submission_delays': int(acad_row[5]) if acad_row and acad_row[5] is not None else 0,
            'performance_trend': acad_row[6] if acad_row and acad_row[6] else 'Stable',
            'math_score': float(acad_row[7] if acad_row and acad_row[7] else 70.0),
            'dbms_score': float(acad_row[8] if acad_row and acad_row[8] else 70.0),
            'os_score': float(acad_row[9] if acad_row and acad_row[9] else 70.0),
            'dsa_score': float(acad_row[10] if acad_row and acad_row[10] else 70.0)
        }
        pred = risk_predictor.predict_risk(acad)
        interventions = intervention_engine.generate_intervention_plan(acad, pred)

        academic_summary = {**acad, **pred, 'interventions': interventions['action_items']}

        # 3. OD Applications
        ods = db.execute(text("SELECT * FROM od_applications WHERE student_id = :sid"), {'sid': student_id}).fetchall()
        od_list = []
        od_days_total = 0
        for od in ods:
            d1 = datetime.datetime.strptime(od[2], '%Y-%m-%d')
            d2 = datetime.datetime.strptime(od[3], '%Y-%m-%d')
            days = (d2 - d1).days + 1
            if od[8] == 'Approved':
                od_days_total += days
            od_list.append({
                'from_date': od[2],
                'to_date': od[3],
                'purpose': od[4],
                'status': od[8],
                'days': days
            })

        # 4. Leave Applications
        leaves = db.execute(text("SELECT * FROM leave_applications WHERE student_id = :sid"), {'sid': student_id}).fetchall()
        leave_list = []
        leave_days_total = 0
        for lv in leaves:
            d1 = datetime.datetime.strptime(lv[2], '%Y-%m-%d')
            d2 = datetime.datetime.strptime(lv[3], '%Y-%m-%d')
            days = (d2 - d1).days + 1
            if lv[6] == 'Approved':
                leave_days_total += days
            leave_list.append({
                'from_date': lv[2],
                'to_date': lv[3],
                'purpose': lv[4],
                'status': lv[6],
                'days': days
            })

        # 5. Extracurriculars
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


@faculty_bp.route('/student/<reg_number>/report/pdf', methods=['GET'])
def download_student_report_pdf(reg_number):
    # Reuse the json endpoint logic to gather data
    from flask import current_app
    with current_app.test_request_context():
        resp = get_student_full_report(reg_number)
        if resp.status_code != 200:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        data = resp.get_json()['data']

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=1, spaceAfter=20)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], spaceBefore=15, spaceAfter=10, textColor=colors.HexColor('#2c3e50'))
    normal_style = styles['Normal']

    # 1. Header
    elements.append(Paragraph(f"Comprehensive Student Report", title_style))
    elements.append(Paragraph(f"<b>Student Name:</b> {data['profile']['name']}  |  <b>Reg No:</b> {data['profile']['reg_number']}", normal_style))
    elements.append(Paragraph(f"<b>Department:</b> {data['profile']['department']}  |  <b>Year/Sem:</b> {data['profile']['year']}/{data['profile']['semester']}", normal_style))
    elements.append(Spacer(1, 20))

    # 2. Academic Performance
    elements.append(Paragraph("Academic Diagnostics", heading_style))
    acad = data['academic']
    acad_data = [
        ['Metric', 'Value'],
        ['Attendance', f"{acad['attendance_pct']}%"],
        ['Avg Test Score', f"{acad['avg_test_score']}%"],
        ['Assignment Score', f"{acad['avg_assignment_score']}%"],
        ['Submission Delays', f"{acad['submission_delays']} delays"],
        ['Performance Trend', acad['performance_trend']],
        ['Risk Level', acad['risk_level']],
        ['Risk Score', f"{acad['risk_score']}/100"]
    ]
    t = Table(acad_data, colWidths=[200, 200])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), colors.HexColor('#34495e')),
        ('TEXTCOLOR', (0,0), (1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#ecf0f1')),
        ('GRID', (0,0), (-1,-1), 1, colors.white)
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))

    # 3. OD & Leave Summary
    elements.append(Paragraph("OD & Leave Summary", heading_style))
    od_lv_data = [
        ['Type', 'Total Approved Days'],
        ['On Duty (OD)', str(data['od_summary']['total_approved_days'])],
        ['Leave', str(data['leave_summary']['total_approved_days'])]
    ]
    t2 = Table(od_lv_data, colWidths=[200, 200])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), colors.HexColor('#8b5cf6')),
        ('TEXTCOLOR', (0,0), (1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f3f4f6')),
        ('GRID', (0,0), (-1,-1), 1, colors.white)
    ]))
    elements.append(t2)
    elements.append(Spacer(1, 20))

    # 4. Extracurriculars
    elements.append(Paragraph("Extracurricular Activities", heading_style))
    if data['extracurriculars']:
        ex_data = [['Type', 'Event', 'Date', 'Status']]
        for ex in data['extracurriculars']:
            ex_data.append([ex['type'], ex['event_name'], ex['date'], ex['status']])
        t3 = Table(ex_data, colWidths=[100, 150, 80, 70])
        t3.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f3f4f6')),
            ('GRID', (0,0), (-1,-1), 1, colors.white)
        ]))
        elements.append(t3)
    else:
        elements.append(Paragraph("No extracurricular activities recorded.", normal_style))
    
    elements.append(Spacer(1, 20))

    # 5. Risk Factors & Interventions
    elements.append(Paragraph("Risk Factors & Action Items", heading_style))
    for factor in acad.get('risk_factors', []):
        elements.append(Paragraph(f"- {factor}", normal_style))
    
    elements.append(Spacer(1, 10))
    for item in acad.get('interventions', []):
        elements.append(Paragraph(f"<b>[{item['priority']}] {item['title']}</b>: {item['recommendation']}", normal_style))

    doc.build(elements)
    buffer.seek(0)
    
    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"Student_Report_{reg_number}.pdf",
        mimetype='application/pdf'
    )
