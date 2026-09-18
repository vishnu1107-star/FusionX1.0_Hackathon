"""
EduShield AI - Machine Learning Academic Risk Prediction Engine
Analyzes multi-dimensional student academic parameters to predict risk BEFORE final examinations.
"""

import os
import numpy as np
import joblib

class AcademicRiskPredictor:
    def __init__(self):
        # Load the authoritative ML model trained on Excel data
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        model_path = os.path.join(base_dir, 'backend', 'ml', 'artifacts', 'risk_model.joblib')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model artifact not found at {model_path}. Please run backend/ml/train.py first.")
            
        self.model = joblib.load(model_path)

    def predict_risk(self, student_data):
        """
        student_data: dict containing
        - attendance_pct (float)
        - avg_test_score (float)
        - avg_assignment_score (float)
        - submission_delays (int)
        - performance_trend (str: 'Improving', 'Stable', 'Fluctuating', 'Declining')
        - math_score, dbms_score, os_score, dsa_score (optional floats for interventions)
        """
        att = float(student_data.get('attendance_pct', 85.0))
        test = float(student_data.get('avg_test_score', 75.0))
        assign = float(student_data.get('avg_assignment_score', 80.0))
        delays = int(student_data.get('submission_delays', 0))
        trend_str = student_data.get('performance_trend', 'Stable')

        trend_map = {'Declining': 0, 'Fluctuating': 1, 'Stable': 2, 'Improving': 3}
        trend_code = trend_map.get(trend_str, 2)

        math_score = float(student_data.get('math_score', test))
        dbms_score = float(student_data.get('dbms_score', test))
        os_score = float(student_data.get('os_score', test))
        dsa_score = float(student_data.get('dsa_score', test))

        # 1. Feature Vector ML Prediction (Using EXACTLY 5 authoritative features)
        # Features: attendance_percentage, test_average, assignment_average, submission_delay_count, performance_trend
        feature_vec = np.array([[att, test, assign, delays, trend_code]])
        
        # We do not use the raw predicted class to override the heuristic logic to remain 
        # compatible with the frontend/intervention engine, but we DO use the model's confidence.
        # However, the prompt specifically requested: "It can predict LOW/MEDIUM/HIGH".
        # Let's use the model's predicted risk as the final risk_level, keeping the risk_score continuous calculation for the UI gauge.
        pred_class_encoded = self.model.predict(feature_vec)[0]
        class_probs = self.model.predict_proba(feature_vec)[0]
        
        risk_map = {0: 'LOW', 1: 'MEDIUM', 2: 'HIGH'}
        predicted_risk_level = risk_map.get(pred_class_encoded, 'LOW')

        # 2. Precise Continuous Risk Score Calculation (0-100) (Retained for UI compatibility)
        # Weights: Attendance (35%), Test Scores (35%), Assignments (15%), Delays (10%), Trend (5%)
        att_penalty = max(0, 100 - att) * 0.35
        test_penalty = max(0, 100 - test) * 0.35
        assign_penalty = max(0, 100 - assign) * 0.15
        delay_penalty = min(delays * 4.5, 18.0)
        trend_penalties = {'Declining': 10, 'Fluctuating': 5, 'Stable': 0, 'Improving': -5}
        trend_penalty = trend_penalties.get(trend_str, 0)

        calculated_score = int(round(att_penalty + test_penalty + assign_penalty + delay_penalty + trend_penalty))
        risk_score = max(5, min(98, calculated_score))

        # We override the heuristic risk level with our actual ML model's prediction
        risk_level = predicted_risk_level

        # 3. Dynamic Explanation / Contributing Factors Extraction (Retained for UI compatibility)
        risk_factors = []

        # Attendance factor
        if att < 65:
            risk_factors.append(f"Attendance is critically low at {att:.1f}% (Institutional threshold is 75%)")
        elif att < 75:
            risk_factors.append(f"Attendance is below required margin at {att:.1f}%")
        elif att >= 90:
            risk_factors.append(f"Consistently high lecture attendance ({att:.1f}%)")

        # Test score factors
        if test < 45:
            risk_factors.append(f"Internal test performance is poor (Average {test:.1f}%)")
        elif test < 65:
            risk_factors.append(f"Test performance is moderate (Average {test:.1f}%)")

        # Subject-specific weaknesses
        subjects = [('Discrete Mathematics', math_score), ('Database Management Systems', dbms_score), 
                    ('Operating Systems', os_score), ('Data Structures', dsa_score)]
        weak_subjects = [(s, sc) for s, sc in subjects if sc < 50]
        if weak_subjects:
            for s, sc in weak_subjects:
                risk_factors.append(f"Critical subject deficit in {s} ({sc:.1f}%)")

        # Assignment delay factors
        if delays >= 4:
            risk_factors.append(f"{delays} assignments submitted past deadline causing cumulative backlog")
        elif delays >= 2:
            risk_factors.append(f"{delays} late assignment submissions recorded")
        elif delays == 0:
            risk_factors.append("All assignments submitted on or before due date")

        # Trend factors
        if trend_str == 'Declining':
            risk_factors.append("Academic performance trend shows continuous downward trajectory")
        elif trend_str == 'Fluctuating':
            risk_factors.append("Inconsistent marks across successive internal assessments")
        elif trend_str == 'Improving':
            risk_factors.append("Positive upward progression observed in recent tests")

        if not risk_factors:
            risk_factors.append("Academic parameters are within optimal expectations")

        # Create the final result
        # Ensure we return probabilities in a way that is compatible
        # class_probs represents the probability array [Low, Medium, High] for our model
        # Let's extract the probability of the predicted class for confidence
        confidence = float(np.max(class_probs))

        return {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'confidence': confidence,
            'metrics_breakdown': {
                'attendance': att,
                'test_score': test,
                'assignment_score': assign,
                'delays': delays,
                'trend': trend_str
            }
        }

# Global Singleton Instance
risk_predictor = AcademicRiskPredictor()
