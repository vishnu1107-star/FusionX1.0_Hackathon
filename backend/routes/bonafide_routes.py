import uuid
import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from db import get_db

bonafide_bp = Blueprint('bonafide', __name__)

@bonafide_bp.route('/generate', methods=['POST'])
def generate_bonafide():
    data = request.get_json() or {}
    reg_number = (data.get('reg_number') or '').strip().upper()
    purpose = (data.get('purpose') or '').strip()

    if not (reg_number and purpose):
        return jsonify({'success': False, 'message': 'Registration number and purpose are required.'}), 400

    db = next(get_db())
    try:
        query = text("""
            SELECT id, reg_number, name, department, course, year, semester, mentor_name
            FROM students WHERE UPPER(reg_number) = :reg
        """)
        student = db.execute(query, {'reg': reg_number}).fetchone()
        if not student:
            return jsonify({'success': False, 'message': 'Student not found.'}), 404

        student_id = student[0]
        cert_no = f"ES-BONA-{datetime.date.today().year}-{uuid.uuid4().hex[:6].upper()}"

        insert_query = text("""
            INSERT INTO bonafide_requests (student_id, purpose, certificate_number, status)
            VALUES (:sid, :purp, :cno, 'Generated')
        """)
        db.execute(insert_query, {'sid': student_id, 'purp': purpose, 'cno': cert_no})
        db.commit()

        certificate = {
            'certificate_number': cert_no,
            'issue_date': datetime.date.today().strftime("%d-%m-%Y"),
            'student_name': student[2],
            'reg_number': student[1],
            'department': student[3],
            'course': student[4],
            'year': student[5],
            'semester': student[6],
            'academic_year': '2026 - 2027',
            'purpose': purpose,
            'institution_name': 'EduShield Institute of Engineering & Technology',
            'authorized_signatory': 'Principal & Academic Dean',
            'status': 'Generated'
        }

        return jsonify({'success': True, 'certificate': certificate})
    finally:
        db.close()

@bonafide_bp.route('/student/<reg_number>/history', methods=['GET'])
def get_bonafide_history(reg_number):
    reg_clean = reg_number.strip().upper()
    db = next(get_db())
    try:
        query = text("""
            SELECT b.id, b.purpose, b.certificate_number, b.status, b.generated_at,
                   s.name, s.department, s.course, s.year, s.semester, s.reg_number
            FROM bonafide_requests b
            JOIN students s ON b.student_id = s.id
            WHERE UPPER(s.reg_number) = :reg
            ORDER BY b.id DESC
        """)
        rows = db.execute(query, {'reg': reg_clean}).fetchall()
        certs = [{
            'id': r[0],
            'purpose': r[1],
            'certificate_number': r[2],
            'status': r[3],
            'generated_at': str(r[4]),
            'student_name': r[5],
            'department': r[6],
            'course': r[7],
            'year': r[8],
            'semester': r[9],
            'reg_number': r[10]
        } for r in rows]

        return jsonify({'success': True, 'certificates': certs})
    finally:
        db.close()
