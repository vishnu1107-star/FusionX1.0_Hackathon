import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from sqlalchemy import text
from db import get_db
from ml.model import risk_predictor

app_bp = Blueprint('applications', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app_bp.route('/od/apply', methods=['POST'])
def apply_od():
    db = next(get_db())
    try:
        reg_number = request.form.get('reg_number', '').strip().upper()
        from_date = request.form.get('from_date')
        to_date = request.form.get('to_date')
        purpose = request.form.get('purpose', '').strip()
        location = request.form.get('location', '').strip()
        event_details = request.form.get('event_details', '').strip()

        if not (reg_number and from_date and to_date and purpose and location):
            return jsonify({'success': False, 'message': 'All required fields (Dates, Purpose, Location) must be provided.'}), 400

        student_id = db.execute(text("SELECT id FROM students WHERE UPPER(reg_number) = :reg"), {'reg': reg_number}).scalar()
        if not student_id:
            return jsonify({'success': False, 'message': 'Student not found.'}), 404

        doc_path = None
        if 'document' in request.files:
            file = request.files['document']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = f"od_{uuid.uuid4().hex[:8]}_{secure_filename(file.filename)}"
                upload_folder = current_app.config['UPLOAD_FOLDER']
                file_dest = os.path.join(upload_folder, filename)
                file.save(file_dest)
                doc_path = f"/uploads/{filename}"

        insert_query = text("""
            INSERT INTO od_applications (student_id, from_date, to_date, purpose, location, event_details, document_path, status)
            VALUES (:sid, :from_d, :to_d, :purp, :loc, :details, :doc, 'Pending')
        """)
        db.execute(insert_query, {
            'sid': student_id,
            'from_d': from_date,
            'to_d': to_date,
            'purp': purpose,
            'loc': location,
            'details': event_details,
            'doc': doc_path
        })
        db.commit()

        return jsonify({'success': True, 'message': 'OD Application submitted successfully with status Pending.'})
    finally:
        db.close()

@app_bp.route('/leave/apply', methods=['POST'])
def apply_leave():
    db = next(get_db())
    try:
        reg_number = request.form.get('reg_number', '').strip().upper()
        from_date = request.form.get('from_date')
        to_date = request.form.get('to_date')
        purpose = request.form.get('purpose', '').strip()

        if not (reg_number and from_date and to_date and purpose):
            return jsonify({'success': False, 'message': 'All required fields (Dates, Purpose) must be provided.'}), 400

        student_id = db.execute(text("SELECT id FROM students WHERE UPPER(reg_number) = :reg"), {'reg': reg_number}).scalar()
        if not student_id:
            return jsonify({'success': False, 'message': 'Student not found.'}), 404

        doc_path = None
        if 'document' in request.files:
            file = request.files['document']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = f"leave_{uuid.uuid4().hex[:8]}_{secure_filename(file.filename)}"
                upload_folder = current_app.config['UPLOAD_FOLDER']
                file_dest = os.path.join(upload_folder, filename)
                file.save(file_dest)
                doc_path = f"/uploads/{filename}"

        insert_query = text("""
            INSERT INTO leave_applications (student_id, from_date, to_date, purpose, document_path, status)
            VALUES (:sid, :from_d, :to_d, :purp, :doc, 'Pending')
        """)
        db.execute(insert_query, {
            'sid': student_id,
            'from_d': from_date,
            'to_d': to_date,
            'purp': purpose,
            'doc': doc_path
        })
        db.commit()

        return jsonify({'success': True, 'message': 'Leave Application submitted successfully with status Pending.'})
    finally:
        db.close()

@app_bp.route('/student/<reg_number>/history', methods=['GET'])
def get_student_applications(reg_number):
    reg_clean = reg_number.strip().upper()
    db = next(get_db())
    try:
        student_id = db.execute(text("SELECT id FROM students WHERE UPPER(reg_number) = :reg"), {'reg': reg_clean}).scalar()
        if not student_id:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        # OD applications
        od_rows = db.execute(text("""
            SELECT id, from_date, to_date, purpose, location, event_details, document_path, status, faculty_remarks, created_at
            FROM od_applications WHERE student_id = :sid ORDER BY id DESC
        """), {'sid': student_id}).fetchall()

        ods = [{
            'id': r[0],
            'type': 'OD',
            'from_date': str(r[1]),
            'to_date': str(r[2]),
            'purpose': r[3],
            'location': r[4],
            'event_details': r[5],
            'document_path': r[6],
            'status': r[7],
            'faculty_remarks': r[8],
            'created_at': str(r[9])
        } for r in od_rows]

        # Leave applications
        leave_rows = db.execute(text("""
            SELECT id, from_date, to_date, purpose, document_path, status, faculty_remarks, created_at
            FROM leave_applications WHERE student_id = :sid ORDER BY id DESC
        """), {'sid': student_id}).fetchall()

        leaves = [{
            'id': r[0],
            'type': 'Leave',
            'from_date': str(r[1]),
            'to_date': str(r[2]),
            'purpose': r[3],
            'document_path': r[4],
            'status': r[5],
            'faculty_remarks': r[6],
            'created_at': str(r[7])
        } for r in leave_rows]

        return jsonify({'success': True, 'od_applications': ods, 'leave_applications': leaves})
    finally:
        db.close()

@app_bp.route('/faculty/all', methods=['GET'])
def get_all_applications_for_faculty():
    db = next(get_db())
    try:
        # OD applications joined with student and academic info
        od_query = text("""
            SELECT o.id, o.from_date, o.to_date, o.purpose, o.location, o.event_details, o.document_path, o.status, o.faculty_remarks, o.created_at,
                   s.reg_number, s.name, s.department, s.course, s.year, s.semester,
                   a.attendance_pct, a.avg_test_score, a.submission_delays, a.performance_trend,
                   a.math_score, a.dbms_score, a.os_score, a.dsa_score
            FROM od_applications o
            JOIN students s ON o.student_id = s.id
            LEFT JOIN academic_records a ON s.id = a.student_id
            ORDER BY o.id DESC
        """)
        od_rows = db.execute(od_query).fetchall()

        applications = []
        for r in od_rows:
            acad = {
                'attendance_pct': float(r[16]) if r[16] is not None else 75.0,
                'avg_test_score': float(r[17]) if r[17] is not None else 70.0,
                'submission_delays': int(r[18]) if r[18] is not None else 0,
                'performance_trend': r[19] or 'Stable',
                'math_score': float(r[20] or 70.0),
                'dbms_score': float(r[21] or 70.0),
                'os_score': float(r[22] or 70.0),
                'dsa_score': float(r[23] or 70.0)
            }
            risk_info = risk_predictor.predict_risk(acad)
            applications.append({
                'id': r[0],
                'application_type': 'OD',
                'from_date': str(r[1]),
                'to_date': str(r[2]),
                'purpose': r[3],
                'location': r[4],
                'event_details': r[5],
                'document_path': r[6],
                'status': r[7],
                'faculty_remarks': r[8],
                'created_at': str(r[9]),
                'student_reg': r[10],
                'student_name': r[11],
                'department': r[12],
                'course': r[13],
                'year': r[14],
                'semester': r[15],
                'attendance_pct': acad['attendance_pct'],
                'risk_level': risk_info['risk_level'],
                'risk_score': risk_info['risk_score'],
                'risk_factors': risk_info['risk_factors']
            })

        # Leave applications joined with student and academic info
        leave_query = text("""
            SELECT l.id, l.from_date, l.to_date, l.purpose, l.document_path, l.status, l.faculty_remarks, l.created_at,
                   s.reg_number, s.name, s.department, s.course, s.year, s.semester,
                   a.attendance_pct, a.avg_test_score, a.submission_delays, a.performance_trend,
                   a.math_score, a.dbms_score, a.os_score, a.dsa_score
            FROM leave_applications l
            JOIN students s ON l.student_id = s.id
            LEFT JOIN academic_records a ON s.id = a.student_id
            ORDER BY l.id DESC
        """)
        leave_rows = db.execute(leave_query).fetchall()

        for r in leave_rows:
            acad = {
                'attendance_pct': float(r[14]) if r[14] is not None else 75.0,
                'avg_test_score': float(r[15]) if r[15] is not None else 70.0,
                'submission_delays': int(r[16]) if r[16] is not None else 0,
                'performance_trend': r[17] or 'Stable',
                'math_score': float(r[18] or 70.0),
                'dbms_score': float(r[19] or 70.0),
                'os_score': float(r[20] or 70.0),
                'dsa_score': float(r[21] or 70.0)
            }
            risk_info = risk_predictor.predict_risk(acad)
            applications.append({
                'id': r[0],
                'application_type': 'Leave',
                'from_date': str(r[1]),
                'to_date': str(r[2]),
                'purpose': r[3],
                'location': 'N/A',
                'event_details': '',
                'document_path': r[4],
                'status': r[5],
                'faculty_remarks': r[6],
                'created_at': str(r[7]),
                'student_reg': r[8],
                'student_name': r[9],
                'department': r[10],
                'course': r[11],
                'year': r[12],
                'semester': r[13],
                'attendance_pct': acad['attendance_pct'],
                'risk_level': risk_info['risk_level'],
                'risk_score': risk_info['risk_score'],
                'risk_factors': risk_info['risk_factors']
            })

        return jsonify({'success': True, 'applications': applications})
    finally:
        db.close()

@app_bp.route('/faculty/action', methods=['POST'])
def faculty_action():
    data = request.get_json() or {}
    app_type = data.get('type')  # 'OD' or 'Leave'
    app_id = data.get('id')
    action = data.get('action')  # 'Approved' or 'Rejected'
    remarks = data.get('remarks', '')

    if app_type not in ['OD', 'Leave'] or not app_id or action not in ['Approved', 'Rejected']:
        return jsonify({'success': False, 'message': 'Invalid application type or action.'}), 400

    db = next(get_db())
    try:
        table = "od_applications" if app_type == 'OD' else "leave_applications"
        update_query = text(f"UPDATE {table} SET status = :status, faculty_remarks = :remarks WHERE id = :id")
        result = db.execute(update_query, {'status': action, 'remarks': remarks, 'id': app_id})
        if result.rowcount != 1:
            db.rollback()
            return jsonify({'success': False, 'message': f'{app_type} application was not found.'}), 404
        db.commit()

        return jsonify({'success': True, 'message': f'{app_type} application has been {action}.'})
    finally:
        db.close()
