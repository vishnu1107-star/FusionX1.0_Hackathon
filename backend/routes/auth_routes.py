from flask import Blueprint, request, jsonify
from sqlalchemy import text
from db import get_db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/student-login', methods=['POST'])
def student_login():
    data = request.get_json() or {}
    reg_number = (data.get('reg_number') or '').strip().upper()

    if not reg_number:
        return jsonify({'success': False, 'message': 'Registration Number is required.'}), 400

    db = next(get_db())
    try:
        query = text("SELECT id, reg_number, name, department, course, year, semester, email, phone, mentor_name FROM students WHERE UPPER(reg_number) = :reg")
        result = db.execute(query, {'reg': reg_number}).fetchone()

        if not result:
            return jsonify({'success': False, 'message': f'Student with Registration Number {reg_number} not found.'}), 404

        student = {
            'id': result[0],
            'reg_number': result[1],
            'name': result[2],
            'department': result[3],
            'course': result[4],
            'year': result[5],
            'semester': result[6],
            'email': result[7],
            'phone': result[8],
            'mentor_name': result[9]
        }

        return jsonify({
            'success': True,
            'role': 'student',
            'student': student
        })
    finally:
        db.close()

@auth_bp.route('/faculty-login', methods=['POST'])
def faculty_login():
    data = request.get_json() or {}
    faculty_id = (data.get('faculty_id') or 'FAC001').strip().upper()

    db = next(get_db())
    try:
        query = text("SELECT id, faculty_id, name, department, email FROM faculty WHERE UPPER(faculty_id) = :fid")
        result = db.execute(query, {'fid': faculty_id}).fetchone()

        if not result:
            # Fallback to first faculty record if custom id given
            result = db.execute(text("SELECT id, faculty_id, name, department, email FROM faculty LIMIT 1")).fetchone()

        faculty = {
            'id': result[0],
            'faculty_id': result[1],
            'name': result[2],
            'department': result[3],
            'email': result[4]
        }

        return jsonify({
            'success': True,
            'role': 'faculty',
            'faculty': faculty
        })
    finally:
        db.close()

@auth_bp.route('/demo-students', methods=['GET'])
def get_demo_students():
    db = next(get_db())
    try:
        query = text("""
            SELECT s.reg_number, s.name, s.department, s.course, s.year, s.semester, 
                   a.attendance_pct, a.avg_test_score, a.submission_delays, a.performance_trend
            FROM students s
            LEFT JOIN academic_records a ON s.id = a.student_id
            ORDER BY s.id ASC
        """)
        rows = db.execute(query).fetchall()
        demo_list = []
        for r in rows:
            demo_list.append({
                'reg_number': r[0],
                'name': r[1],
                'department': r[2],
                'course': r[3],
                'year': r[4],
                'semester': r[5],
                'attendance_pct': float(r[6]) if r[6] is not None else 75.0,
                'avg_test_score': float(r[7]) if r[7] is not None else 70.0,
                'delays': int(r[8]) if r[8] is not None else 0,
                'trend': r[9] or 'Stable'
            })
        return jsonify({'success': True, 'students': demo_list})
    finally:
        db.close()
