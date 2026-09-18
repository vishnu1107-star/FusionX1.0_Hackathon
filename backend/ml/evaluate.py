"""
EduShield AI - Independent Model Evaluation Script
Evaluates the pre-trained Random Forest model on the separate testing dataset.
Strict scientific evaluation: zero synthetic label generation.
"""

import os
import glob
import openpyxl
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(BASE_DIR, '..', '..'))

TEST_FILE = os.path.join(PROJECT_ROOT, 'database', 'ml_testing', 'student_testing_data.xlsx')
TRAIN_DIR = os.path.join(PROJECT_ROOT, 'database', 'ml_training')
MODEL_PATH = os.path.join(BASE_DIR, 'artifacts', 'risk_model.joblib')

TREND_MAP = {'Declining': 0, 'Fluctuating': 1, 'Stable': 2, 'Improving': 3}
RISK_MAP = {'LOW': 0, 'MEDIUM': 1, 'HIGH': 2}
RISK_MAP_REV = {0: 'LOW', 1: 'MEDIUM', 2: 'HIGH'}

def evaluate():
    print("=" * 75)
    print("EduShield AI — Independent ML Model Testing & Evaluation")
    print("=" * 75)

    # 1. Load Pre-trained Model Artifact
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model artifact not found at {MODEL_PATH}")
    clf = joblib.load(MODEL_PATH)
    print(f"\nLoaded pre-trained model artifact: {MODEL_PATH}")

    # 2. Check Data Leakage (Overlap)
    train_files = glob.glob(os.path.join(TRAIN_DIR, '*.xlsx'))
    train_regs = set()
    for tf in train_files:
        wb_tr = openpyxl.load_workbook(tf, data_only=True)
        for r in list(wb_tr.active.iter_rows(values_only=True))[1:]:
            if r and r[0] is not None:
                reg = str(r[0]).strip()
                if reg and not reg.startswith('Note:'):
                    train_regs.add(reg)

    # 3. Load Testing Data
    wb = openpyxl.load_workbook(TEST_FILE, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))

    header = rows[0] if rows else None
    has_risk_level = False
    if header:
        has_risk_level = any(str(h).strip().lower() == 'risk_level' for h in header if h is not None)

    raw_count = len(rows) - 1 if len(rows) > 0 else 0
    valid_records = []
    invalid_count = 0
    test_regs = set()

    for idx, r in enumerate(rows[1:], start=2):
        if not r or r[0] is None:
            invalid_count += 1
            continue
        reg = str(r[0]).strip()
        if not reg or reg.startswith('Note:'):
            invalid_count += 1
            continue

        try:
            att = float(r[1])
            test = float(r[2])
            assign = float(r[3])
            delay = int(r[4])
            trend = str(r[5]).strip()
        except (ValueError, TypeError, IndexError):
            invalid_count += 1
            continue

        actual_risk = None
        if has_risk_level and len(r) > 6 and r[6] is not None:
            actual_risk = str(r[6]).strip().upper()

        test_regs.add(reg)
        valid_records.append({
            'row_idx': idx,
            'reg_number': reg,
            'attendance_percentage': att,
            'test_average': test,
            'assignment_average': assign,
            'submission_delay_count': delay,
            'performance_trend': trend,
            'actual_risk': actual_risk
        })

    overlap_regs = train_regs.intersection(test_regs)

    # 4. Perform Predictions using ONLY 5 features
    results = []
    y_true = []
    y_pred = []

    for item in valid_records:
        t_code = TREND_MAP.get(item['performance_trend'], 2)
        feature_df = pd.DataFrame([{
            'attendance_percentage': item['attendance_percentage'],
            'test_average': item['test_average'],
            'assignment_average': item['assignment_average'],
            'submission_delay_count': item['submission_delay_count'],
            'performance_trend': t_code
        }])

        pred_idx = clf.predict(feature_df)[0]
        probs = clf.predict_proba(feature_df)[0]
        pred_label = RISK_MAP_REV[pred_idx]
        confidence = float(np.max(probs))

        if item['actual_risk'] is not None and item['actual_risk'] in RISK_MAP:
            y_true.append(RISK_MAP[item['actual_risk']])
            y_pred.append(pred_idx)

        results.append({
            'Registration Number': item['reg_number'],
            'Actual Risk': item['actual_risk'] if item['actual_risk'] is not None else "MISSING",
            'Predicted Risk': pred_label,
            'Confidence': f"{confidence:.2f}",
            'Match': item['actual_risk'] == pred_label if item['actual_risk'] is not None else False
        })

    # Print Student-Level Output
    print("\nSTUDENT-LEVEL EVALUATION RESULTS:")
    print("-" * 75)
    print(f"{'Registration Number':<22} | {'Actual Risk':<12} | {'Predicted Risk':<14} | {'Confidence':<10}")
    print("-" * 75)
    for r in results:
        print(f"{r['Registration Number']:<22} | {r['Actual Risk']:<12} | {r['Predicted Risk']:<14} | {r['Confidence']:<10}")
    print("-" * 75)

    # Print Summary Report
    print("\nEVALUATION METRICS & COMPLIANCE SUMMARY:")
    print(f"1.  Testing File Used:                {TEST_FILE}")
    print(f"2.  Total Testing Rows in File:       {raw_count}")
    print(f"3.  Valid Testing Records Evaluated:   {len(valid_records)}")
    print(f"4.  Invalid / Missing Records:        {invalid_count}")
    print(f"5.  Training / Testing Overlap:       {len(overlap_regs)} records (Overlapping Reg Numbers: {list(overlap_regs)})")
    print(f"6.  Exact 5 ML Input Features:        ['attendance_percentage', 'test_average', 'assignment_average', 'submission_delay_count', 'performance_trend']")
    print(f"7.  Target Column:                    'risk_level'")
    print(f"8.  Model Artifact Used:              {MODEL_PATH}")

    if has_risk_level and len(y_true) == len(valid_records):
        acc = accuracy_score(y_true, y_pred)
        prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)
        cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2])
        print(f"9.  Overall Accuracy:                 {acc:.4f} ({acc*100:.2f}%)")
        print(f"10. Weighted Precision:               {prec:.4f}")
        print(f"11. Weighted Recall:                  {rec:.4f}")
        print(f"12. Weighted F1-Score:                {f1:.4f}")
        print("\n13. Confusion Matrix:")
        print(cm)
    else:
        print("\n[ALERT]: Testing dataset is missing the ground-truth risk_level column. Model evaluation cannot be performed.")

if __name__ == '__main__':
    evaluate()
