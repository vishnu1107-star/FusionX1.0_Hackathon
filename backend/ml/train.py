"""
EduShield AI - Authoritative ML Model Training Script
Trains ML model strictly on user-provided Excel datasets in database/ml_training/
"""

import os
import glob
import openpyxl
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support

# Base Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.normpath(os.path.join(BASE_DIR, '..', '..', 'database', 'ml_training'))
ARTIFACT_DIR = os.path.join(BASE_DIR, 'artifacts')
OS_OUTPUT_CSV = os.path.join(DATASET_DIR, 'combined_student_training_data.csv')
MODEL_JOBLIB = os.path.join(ARTIFACT_DIR, 'risk_model.joblib')

TREND_MAP = {'Declining': 0, 'Fluctuating': 1, 'Stable': 2, 'Improving': 3}
RISK_MAP = {'LOW': 0, 'MEDIUM': 1, 'HIGH': 2}
RISK_MAP_REV = {0: 'LOW', 1: 'MEDIUM', 2: 'HIGH'}

def compute_risk_level(att, test, assign, delay):
    """Fallback standard risk formula if risk_level is not present in row"""
    if att < 65 or test < 40 or assign < 40 or delay > 5:
        return 'HIGH'
    elif att < 80 or test < 60 or assign < 60 or delay > 2:
        return 'MEDIUM'
    else:
        return 'LOW'

def load_and_clean_datasets():
    files = glob.glob(os.path.join(DATASET_DIR, '*.xlsx'))
    cleaned_records = []
    file_stats = {}

    for fpath in files:
        fname = os.path.basename(fpath)
        wb = openpyxl.load_workbook(fpath, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))

        valid_count = 0
        for r in rows[1:]:
            if not r or r[0] is None:
                continue
            reg = str(r[0]).strip()
            if not reg or reg.startswith('Note:'):
                continue
            
            # Extract features
            att = float(r[1])
            test = float(r[2])
            assign = float(r[3])
            delay = int(r[4])
            trend = str(r[5]).strip()

            risk = r[6] if len(r) > 6 and r[6] is not None else None
            if risk is None or str(risk).strip() == '':
                risk = compute_risk_level(att, test, assign, delay)
            else:
                risk = str(risk).strip().upper()

            cleaned_records.append({
                'reg_number': reg,
                'attendance_percentage': att,
                'test_average': test,
                'assignment_average': assign,
                'submission_delay_count': delay,
                'performance_trend': trend,
                'risk_level': risk,
                'source_file': fname
            })
            valid_count += 1
        
        file_stats[fname] = valid_count

    df = pd.DataFrame(cleaned_records)
    return df, file_stats

def main():
    print("=" * 70)
    print("EduShield AI - ML Model Training Pipeline")
    print("=" * 70)
    
    df, file_stats = load_and_clean_datasets()
    
    print("\nSource File Record Breakdown:")
    for fname, count in file_stats.items():
        print(f"  - {fname}: {count} valid records")
    print(f"\nTotal Cleaned Training Records: {len(df)}")

    # Check for Antigravity demo records
    demo_mask = df['reg_number'].str.contains('23IT001|23IT002|23IT003|23IT004|23IT005|RAHUL|ANANYA|KARTHIK|DEEPAK|SNEHA', case=False, regex=True)
    demo_count = demo_mask.sum()
    print(f"Antigravity-generated demo records found in dataset: {demo_count}")

    # Save clean dataset to CSV
    export_cols = ['attendance_percentage', 'test_average', 'assignment_average', 'submission_delay_count', 'performance_trend', 'risk_level']
    df[export_cols].to_csv(OS_OUTPUT_CSV, index=False)
    print(f"Exported clean combined dataset to: {OS_OUTPUT_CSV}")

    # Encode features for ML
    X = pd.DataFrame({
        'attendance_percentage': df['attendance_percentage'],
        'test_average': df['test_average'],
        'assignment_average': df['assignment_average'],
        'submission_delay_count': df['submission_delay_count'],
        'performance_trend': df['performance_trend'].map(TREND_MAP).fillna(2).astype(int)
    })
    y = df['risk_level'].map(RISK_MAP).astype(int)

    class_dist = df['risk_level'].value_counts().to_dict()
    print("\nFinal Target Class Distribution:")
    for cls in ['LOW', 'MEDIUM', 'HIGH']:
        print(f"  - {cls}: {class_dist.get(cls, 0)}")

    # Train RandomForestClassifier
    clf = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
    clf.fit(X, y)

    y_pred = clf.predict(X)
    acc = accuracy_score(y, y_pred)
    prec, rec, f1, _ = precision_recall_fscore_support(y, y_pred, average='weighted')
    cm = confusion_matrix(y, y_pred)

    print("\nModel Evaluation Summary:")
    print(f"  - Accuracy:  {acc:.4f}")
    print(f"  - Precision: {prec:.4f}")
    print(f"  - Recall:    {rec:.4f}")
    print(f"  - F1-Score:  {f1:.4f}")
    print("\nConfusion Matrix:")
    print(cm)

    # Save model artifact
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    joblib.dump(clf, MODEL_JOBLIB)
    print(f"\nTrained model artifact successfully saved to: {MODEL_JOBLIB}")
    print("=" * 70)

if __name__ == '__main__':
    main()
