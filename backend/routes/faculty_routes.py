from flask import Blueprint, request, jsonify
from sqlalchemy import text
from db import get_db
from ml.model import risk_predictor
from ml.intervention import intervention_engine

faculty_bp = Blueprint('faculty', __name__)

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
