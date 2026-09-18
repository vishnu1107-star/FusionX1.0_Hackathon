from flask import Blueprint, request, jsonify
from sqlalchemy import text
from db import get_db
from ml.model import risk_predictor
import json

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/options', methods=['GET'])
def get_options():
    db = next(get_db())
    try:
        departments = [row[0] for row in db.execute(text("SELECT DISTINCT department FROM students ORDER BY department")).fetchall()]
        years = [row[0] for row in db.execute(text("SELECT DISTINCT year FROM students ORDER BY year")).fetchall()]
        sections = [row[0] for row in db.execute(text("SELECT DISTINCT section FROM students ORDER BY section")).fetchall()]
        
        subjects = [
            "Discrete Mathematics",
            "Database Management Systems",
            "Operating Systems",
            "Data Structures & Algorithms",
            "Machine Learning",
            "Computer Networks"
        ]

        return jsonify({
            'status': 'success',
            'data': {
                'departments': departments,
                'years': years,
                'sections': sections,
                'subjects': subjects
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        db.close()

@attendance_bp.route('/students', methods=['GET'])
def get_students():
    department = request.args.get('department')
    year = request.args.get('year')
    section = request.args.get('section')

    if not all([department, year, section]):
        return jsonify({'status': 'error', 'message': 'Missing required parameters'}), 400

    db = next(get_db())
    try:
        query = text("""
            SELECT id, reg_number, name 
            FROM students 
            WHERE department = :dept AND year = :yr AND section = :sec
            ORDER BY reg_number
        """)
        rows = db.execute(query, {'dept': department, 'yr': year, 'sec': section}).fetchall()
        
        students = [{'id': row[0], 'reg_number': row[1], 'name': row[2]} for row in rows]

        return jsonify({'status': 'success', 'data': students}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        db.close()

@attendance_bp.route('/submit', methods=['POST'])
def submit_attendance():
    data = request.json
    faculty_id_str = data.get('faculty_id')
    subject = data.get('subject')
    date = data.get('date')
    period = data.get('period')
    attendance_data = data.get('attendance')

    if not all([faculty_id_str, subject, date, period, attendance_data]):
        return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400

    db = next(get_db())
    try:
        student_ids = [item['student_id'] for item in attendance_data]
        if not student_ids:
            return jsonify({'status': 'error', 'message': 'No students provided'}), 400

        # Check duplicates
        dup_query = text("""
            SELECT COUNT(*) FROM attendance_records 
            WHERE subject = :sub AND attendance_date = :dt AND period = :prd AND student_id = :sid
        """)
        dup_count = db.execute(dup_query, {
            'sub': subject, 'dt': date, 'prd': period, 'sid': student_ids[0]
        }).scalar()
        
        if dup_count > 0:
            return jsonify({'status': 'error', 'message': 'Attendance already marked for this session'}), 409

        # Get faculty PK
        fac_row = db.execute(text("SELECT id FROM faculty WHERE faculty_id = :fid"), {'fid': faculty_id_str}).fetchone()
        if not fac_row:
             return jsonify({'status': 'error', 'message': 'Faculty not found'}), 404
        fac_pk = fac_row[0]

        # Insert records
        insert_query = text("""
            INSERT INTO attendance_records (student_id, faculty_id, subject, attendance_date, period, status)
            VALUES (:sid, :fid, :sub, :dt, :prd, :st)
        """)
        
        for item in attendance_data:
            db.execute(insert_query, {
                'sid': item['student_id'],
                'fid': fac_pk,
                'sub': subject,
                'dt': date,
                'prd': period,
                'st': item['status']
            })
            
        # Re-calculate overall attendance % and update ML risk for each student
        for item in attendance_data:
            s_id = item['student_id']
            records = db.execute(text("SELECT status FROM attendance_records WHERE student_id = :sid"), {'sid': s_id}).fetchall()
            
            total_classes = len(records)
            if total_classes > 0:
                present_classes = sum(1 for r in records if r[0] == 'Present')
                new_pct = (present_classes / total_classes) * 100
                
                db.execute(text("UPDATE academic_records SET attendance_pct = :pct WHERE student_id = :sid"), {'pct': new_pct, 'sid': s_id})
                
                ac_rec = db.execute(text("""
                    SELECT attendance_pct, avg_test_score, avg_assignment_score, submission_delays, performance_trend,
                           math_score, dbms_score, os_score, dsa_score
                    FROM academic_records WHERE student_id = :sid
                """), {'sid': s_id}).fetchone()
                
                if ac_rec:
                    student_data = {
                        'attendance_pct': ac_rec[0],
                        'avg_test_score': ac_rec[1],
                        'avg_assignment_score': ac_rec[2],
                        'submission_delays': ac_rec[3],
                        'performance_trend': ac_rec[4],
                        'math_score': ac_rec[5],
                        'dbms_score': ac_rec[6],
                        'os_score': ac_rec[7],
                        'dsa_score': ac_rec[8]
                    }
                    
                    risk_result = risk_predictor.predict_risk(student_data)
                    
                    # Update risk predictions
                    db.execute(text("""
                        UPDATE risk_predictions 
                        SET risk_score = :r_score, risk_level = :r_level, risk_factors = :r_factors, calculated_at = CURRENT_TIMESTAMP
                        WHERE student_id = :sid
                    """), {
                        'r_score': risk_result['risk_score'],
                        'r_level': risk_result['risk_level'],
                        'r_factors': json.dumps(risk_result['risk_factors']),
                        'sid': s_id
                    })

        db.commit()
        return jsonify({'status': 'success', 'message': 'Attendance marked and risk profiles updated successfully'}), 200

    except Exception as e:
        db.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        db.close()

@attendance_bp.route('/review', methods=['GET'])
def get_attendance_review():
    db = next(get_db())
    try:
        total_students = db.execute(text("SELECT COUNT(*) FROM students")).scalar()
        
        # Need to use date('now') or similar depending on DB. 
        # Using a simple query for sqlite compatibility if date functions differ, but CURRENT_DATE works in both usually.
        present_today = db.execute(text("SELECT COUNT(*) FROM attendance_records WHERE attendance_date = CURRENT_DATE AND status = 'Present'")).scalar()
        absent_today = db.execute(text("SELECT COUNT(*) FROM attendance_records WHERE attendance_date = CURRENT_DATE AND status = 'Absent'")).scalar()
        
        overall_pct = db.execute(text("SELECT AVG(attendance_pct) FROM academic_records")).scalar() or 0
        
        low_att_rows = db.execute(text("""
            SELECT s.reg_number, s.name, a.attendance_pct 
            FROM students s 
            JOIN academic_records a ON s.id = a.student_id 
            WHERE a.attendance_pct < 75.0 
            ORDER BY a.attendance_pct ASC
        """)).fetchall()
        
        low_attendance_students = [{'reg_number': r[0], 'name': r[1], 'attendance_pct': round(float(r[2]), 1)} for r in low_att_rows]

        return jsonify({
            'status': 'success',
            'data': {
                'total_students': total_students,
                'present_today': present_today,
                'absent_today': absent_today,
                'overall_pct': round(float(overall_pct), 1),
                'low_attendance_students': low_attendance_students
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        db.close()
