"""
EduShield AI - Machine Learning Academic Risk Prediction Engine
Analyzes multi-dimensional student academic parameters to predict risk BEFORE final examinations.
Trains strictly on authoritatively clean user-provided dataset. Zero synthetic/demo data.
"""

import os
import joblib
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'artifacts', 'risk_model.joblib')

RISK_CLASS_MAP = {0: 'LOW', 1: 'MEDIUM', 2: 'HIGH'}

class AcademicRiskPredictor:
    def __init__(self):
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)
        else:
            # Trigger train.py to build the authoritative model artifact if missing
            from ml.train import main as train_model
            train_model()
            if os.path.exists(MODEL_PATH):
                self.model = joblib.load(MODEL_PATH)
            else:
                raise FileNotFoundError(f"ML model artifact could not be found or generated at: {MODEL_PATH}")

    def predict_risk(self, student_data):
        """
        student_data: dict containing
        - attendance_pct (float)
        - avg_test_score (float)
        - avg_assignment_score (float)
        - submission_delays (int)
        - performance_trend (str: 'Improving', 'Stable', 'Fluctuating', 'Declining')
        """
        att = float(student_data.get('attendance_pct', 85.0))
        test = float(student_data.get('avg_test_score', 75.0))
        assign = float(student_data.get('avg_assignment_score', 80.0))
        delays = int(student_data.get('submission_delays', 0))
        trend_str = str(student_data.get('performance_trend', 'Stable')).strip()

        trend_map = {'Declining': 0, 'Fluctuating': 1, 'Stable': 2, 'Improving': 3}
        trend_code = trend_map.get(trend_str, 2)

        # 1. Authoritative 5-Feature ML Prediction Vector with column names
        feature_df = pd.DataFrame([{
            'attendance_percentage': att,
            'test_average': test,
            'assignment_average': assign,
            'submission_delay_count': delays,
            'performance_trend': trend_code
        }])
        pred_class_idx = self.model.predict(feature_df)[0]
        class_probs = self.model.predict_proba(feature_df)[0]
        predicted_risk_level = RISK_CLASS_MAP.get(pred_class_idx, 'MEDIUM')

        # 2. Continuous Risk Score Calculation (0-100)
        att_penalty = max(0, 100 - att) * 0.35
        test_penalty = max(0, 100 - test) * 0.35
        assign_penalty = max(0, 100 - assign) * 0.15
        delay_penalty = min(delays * 4.5, 18.0)
        trend_penalties = {'Declining': 10, 'Fluctuating': 5, 'Stable': 0, 'Improving': -5}
        trend_penalty = trend_penalties.get(trend_str, 0)

        calculated_score = int(round(att_penalty + test_penalty + assign_penalty + delay_penalty + trend_penalty))
        risk_score = max(5, min(98, calculated_score))

        # Risk level comes directly from ML prediction
        risk_level = predicted_risk_level

        # 3. Dynamic Explanation / Contributing Factors Extraction
        risk_factors = []

        if att < 65:
            risk_factors.append(f"Attendance is critically low at {att:.1f}% (Institutional threshold is 75%)")
        elif att < 75:
            risk_factors.append(f"Attendance is below required margin at {att:.1f}%")
        elif att >= 90:
            risk_factors.append(f"Consistently high lecture attendance ({att:.1f}%)")

        if test < 45:
            risk_factors.append(f"Internal test performance is poor (Average {test:.1f}%)")
        elif test < 65:
            risk_factors.append(f"Test performance is moderate (Average {test:.1f}%)")

        if delays >= 4:
            risk_factors.append(f"{delays} assignments submitted past deadline causing cumulative backlog")
        elif delays >= 2:
            risk_factors.append(f"{delays} late assignment submissions recorded")
        elif delays == 0:
            risk_factors.append("All assignments submitted on or before due date")

        if trend_str == 'Declining':
            risk_factors.append("Academic performance trend shows continuous downward trajectory")
        elif trend_str == 'Fluctuating':
            risk_factors.append("Inconsistent marks across successive internal assessments")
        elif trend_str == 'Improving':
            risk_factors.append("Positive upward progression observed in recent tests")

        if not risk_factors:
            risk_factors.append("Academic parameters are within optimal expectations")

        return {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'confidence': float(np.max(class_probs)),
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
