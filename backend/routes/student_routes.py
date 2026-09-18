from flask import Blueprint, request, jsonify
from sqlalchemy import text
from db import get_db
from ml.model import risk_predictor
from ml.intervention import intervention_engine

student_bp = Blueprint('student', __name__)

@student_bp.route('/<reg_number>/dashboard', methods=['GET'])
def get_student_dashboard(reg_number):
    reg_clean = reg_number.strip().upper()
    db = next(get_db())
    try:
        # 1. Fetch Student Info
        student_query = text("""
            SELECT id, reg_number, name, department, course, year, semester, email, phone, mentor_name
            FROM students WHERE UPPER(reg_number) = :reg
        """)
        student_row = db.execute(student_query, {'reg': reg_clean}).fetchone()
        if not student_row:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        student_id = student_row[0]
        student_info = {
            'id': student_row[0],
            'reg_number': student_row[1],
            'name': student_row[2],
            'department': student_row[3],
            'course': student_row[4],
            'year': student_row[5],
            'semester': student_row[6],
            'email': student_row[7] if student_row[7] else '',
            'phone': student_row[8] if student_row[8] else '',
            'mentor_name': student_row[9] if student_row[9] else 'Faculty Advisor'
        }

        # 2. Fetch Academic Summary
        acad_query = text("""
            SELECT attendance_pct, avg_test_score, avg_assignment_score, submission_delays,
                   performance_trend
            FROM academic_records WHERE student_id = :sid
        """)
        acad_row = db.execute(acad_query, {'sid': student_id}).fetchone()
        
        if acad_row and acad_row[0] is not None and acad_row[1] is not None:
            academic_data = {
                'attendance_pct': float(acad_row[0]),
                'avg_test_score': float(acad_row[1]),
                'avg_assignment_score': float(acad_row[2]),
                'submission_delays': int(acad_row[3]),
                'performance_trend': acad_row[4] or 'Stable',
                'mentor_name': student_info['mentor_name']
            }
            # 3. Compute Real-time ML Risk Prediction & Explanations
            risk_result = risk_predictor.predict_risk(academic_data)
            # 4. Generate Personalized Actionable Interventions
            interventions = intervention_engine.generate_intervention_plan(academic_data, risk_result)
        else:
            academic_data = None
            risk_result = {
                'risk_score': 0,
                'risk_level': 'Insufficient Data',
                'risk_factors': ['Insufficient data for prediction'],
                'confidence': 0.0,
                'metrics_breakdown': {}
            }
            interventions = {
                'summary': 'Upload academic performance data to generate risk diagnostics.',
                'action_items': [],
                'mentor_alerted': False
            }

        # 5. Fetch Detailed Tests
        tests_query = text("""
            SELECT subject, test_name, max_marks, obtained_marks, test_date
            FROM test_scores WHERE student_id = :sid ORDER BY id DESC
        """)
        test_rows = db.execute(tests_query, {'sid': student_id}).fetchall()
        tests_list = [{
            'subject': t[0],
            'test_name': t[1],
            'max_marks': float(t[2]),
            'obtained_marks': float(t[3]),
            'test_date': str(t[4]) if t[4] else ''
        } for t in test_rows]

        # 6. Fetch Assignments
        assign_query = text("""
            SELECT subject, title, due_date, submitted_date, delay_days, score, status
            FROM submission_records WHERE student_id = :sid ORDER BY id DESC
        """)
        assign_rows = db.execute(assign_query, {'sid': student_id}).fetchall()
        assign_list = [{
            'subject': a[0],
            'title': a[1],
            'due_date': str(a[2]) if a[2] else '',
            'submitted_date': str(a[3]) if a[3] else '',
            'delay_days': int(a[4]),
            'score': float(a[5]) if a[5] is not None else None,
            'status': a[6]
        } for a in assign_rows]

        return jsonify({
            'success': True,
            'student': student_info,
            'academic_record': academic_data,
            'risk_prediction': risk_result,
            'intervention_plan': interventions,
            'test_scores': tests_list,
            'assignment_submissions': assign_list
        })
    finally:
        db.close()
