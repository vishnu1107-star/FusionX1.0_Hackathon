import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from sqlalchemy import text
from db import get_db

extracurricular_bp = Blueprint('extracurricular', __name__)
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@extracurricular_bp.route('/add', methods=['POST'])
def add_activity():
    db = next(get_db())
    try:
        reg_number = request.form.get('reg_number', '').strip().upper()
        activity_type = request.form.get('activity_type', '').strip()
        event_name = request.form.get('event_name', '').strip()
        activity_date = request.form.get('activity_date')
        description = request.form.get('description', '').strip()
        participation_details = request.form.get('participation_details', '').strip()

        if not (reg_number and activity_type and event_name and activity_date):
            return jsonify({'success': False, 'message': 'Activity Type, Event Name, and Date are required.'}), 400

        student_id = db.execute(text("SELECT id FROM students WHERE UPPER(reg_number) = :reg"), {'reg': reg_number}).scalar()
        if not student_id:
            return jsonify({'success': False, 'message': 'Student not found.'}), 404

        cert_path = None
        if 'certificate' in request.files:
            file = request.files['certificate']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = f"cert_{uuid.uuid4().hex[:8]}_{secure_filename(file.filename)}"
                upload_folder = current_app.config['UPLOAD_FOLDER']
                file_dest = os.path.join(upload_folder, filename)
                file.save(file_dest)
                cert_path = f"/uploads/{filename}"

        insert_query = text("""
            INSERT INTO extracurricular_activities (student_id, activity_type, event_name, activity_date, description, participation_details, certificate_path, verification_status)
            VALUES (:sid, :atype, :ename, :adate, :desc, :pdetails, :cpath, 'Pending')
        """)
        db.execute(insert_query, {
            'sid': student_id,
            'atype': activity_type,
            'ename': event_name,
            'adate': activity_date,
            'desc': description,
            'pdetails': participation_details,
            'cpath': cert_path
        })
        db.commit()

        return jsonify({'success': True, 'message': 'Extracurricular activity submitted successfully for faculty verification.'})
    finally:
        db.close()

@extracurricular_bp.route('/student/<reg_number>/activities', methods=['GET'])
def get_student_activities(reg_number):
    reg_clean = reg_number.strip().upper()
    db = next(get_db())
    try:
        student_id = db.execute(text("SELECT id FROM students WHERE UPPER(reg_number) = :reg"), {'reg': reg_clean}).scalar()
        if not student_id:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        query = text("""
            SELECT id, activity_type, event_name, activity_date, description, participation_details, certificate_path, verification_status, faculty_remarks, created_at
            FROM extracurricular_activities
            WHERE student_id = :sid
            ORDER BY activity_date DESC, id DESC
        """)
        rows = db.execute(query, {'sid': student_id}).fetchall()
        activities = [{
            'id': r[0],
            'activity_type': r[1],
            'event_name': r[2],
            'activity_date': str(r[3]),
            'description': r[4],
            'participation_details': r[5],
            'certificate_path': r[6],
            'verification_status': r[7],
            'faculty_remarks': r[8],
            'created_at': str(r[9])
        } for r in rows]

        return jsonify({'success': True, 'activities': activities})
    finally:
        db.close()

@extracurricular_bp.route('/faculty/all', methods=['GET'])
def get_faculty_extracurricular_list():
    db = next(get_db())
    try:
        query = text("""
            SELECT e.id, e.activity_type, e.event_name, e.activity_date, e.description, e.participation_details, 
                   e.certificate_path, e.verification_status, e.faculty_remarks, e.created_at,
                   s.reg_number, s.name, s.department
            FROM extracurricular_activities e
            JOIN students s ON e.student_id = s.id
            ORDER BY e.id DESC
        """)
        rows = db.execute(query).fetchall()
        activities = [{
            'id': r[0],
            'activity_type': r[1],
            'event_name': r[2],
            'activity_date': str(r[3]),
            'description': r[4],
            'participation_details': r[5],
            'certificate_path': r[6],
            'verification_status': r[7],
            'faculty_remarks': r[8],
            'created_at': str(r[9]),
            'student_reg': r[10],
            'student_name': r[11],
            'department': r[12]
        } for r in rows]

        return jsonify({'success': True, 'activities': activities})
    finally:
        db.close()

@extracurricular_bp.route('/<int:act_id>/verify', methods=['POST'])
def verify_activity(act_id):
    data = request.get_json() or {}
    status = data.get('status')  # 'Verified' or 'Rejected'
    remarks = data.get('remarks', '')

    if status not in ['Verified', 'Rejected']:
        return jsonify({'success': False, 'message': 'Invalid verification status.'}), 400

    db = next(get_db())
    try:
        db.execute(text("""
            UPDATE extracurricular_activities
            SET verification_status = :status, faculty_remarks = :remarks
            WHERE id = :id
        """), {'status': status, 'remarks': remarks, 'id': act_id})
        db.commit()

        return jsonify({'success': True, 'message': f'Extracurricular activity marked as {status}.'})
    finally:
        db.close()
