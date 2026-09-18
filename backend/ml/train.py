import os
import glob
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_score, recall_score, f1_score

# Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA_DIR = os.path.join(BASE_DIR, 'database', 'ml_training')
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'backend', 'ml', 'artifacts')
OUTPUT_CSV = os.path.join(DATA_DIR, 'combined_student_training_data.csv')
MODEL_PATH = os.path.join(ARTIFACTS_DIR, 'risk_model.joblib')

# Feature definitions
FEATURES = [
    'attendance_percentage',
    'test_average',
    'assignment_average',
    'submission_delay_count',
    'performance_trend'
]
TARGET = 'risk_level'

TREND_MAP = {'Declining': 0, 'Fluctuating': 1, 'Stable': 2, 'Improving': 3}
RISK_MAP = {'Low': 0, 'Medium': 1, 'High': 2}

def load_and_clean_data():
    files = glob.glob(os.path.join(DATA_DIR, '*.xlsx'))
    if not files:
        raise FileNotFoundError(f"No Excel files found in {DATA_DIR}")

    df_list = []
    total_raw_rows = 0
    file_stats = {}

    for f in files:
        fname = os.path.basename(f)
        try:
            df = pd.read_excel(f)
            total_raw_rows += len(df)
            
            # Ensure columns exist
            required_cols = FEATURES + [TARGET]
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                print(f"[Warning] Skipping {fname}, missing columns: {missing_cols}")
                continue
                
            # Keep only required columns
            df = df[required_cols].copy()
            
            # Record rows before cleaning
            rows_before = len(df)
            
            # Drop missing values
            df = df.dropna()
            rows_after_nan = len(df)
            
            # Drop exact duplicates
            df = df.drop_duplicates()
            rows_final = len(df)
            
            file_stats[fname] = {
                'raw': rows_before,
                'dropped_nan': rows_before - rows_after_nan,
                'dropped_dup': rows_after_nan - rows_final,
                'final': rows_final
            }
            
            df_list.append(df)
        except Exception as e:
            print(f"[Error] Failed to process {fname}: {e}")

    if not df_list:
        raise ValueError("No valid data could be extracted from the Excel files.")

    combined_df = pd.concat(df_list, ignore_index=True)
    
    # Text normalization
    combined_df['performance_trend'] = combined_df['performance_trend'].str.strip().str.title()
    combined_df['risk_level'] = combined_df['risk_level'].str.strip().str.title()
    
    # Filter valid values
    combined_df = combined_df[combined_df['performance_trend'].isin(TREND_MAP.keys())]
    combined_df = combined_df[combined_df['risk_level'].isin(RISK_MAP.keys())]
    
    return combined_df, file_stats, total_raw_rows

def main():
    print("=" * 60)
    print("EduShield AI Authoritative ML Training")
    print("=" * 60)
    
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    
    print("\n1. Loading and Cleaning Data...")
    df, stats, raw_total = load_and_clean_data()
    
    print(f"Total raw rows across files: {raw_total}")
    for fname, st in stats.items():
        print(f"  - {fname}: {st['raw']} raw -> dropped {st['dropped_nan']} NaNs, {st['dropped_dup']} duplicates -> {st['final']} valid")
    
    final_count = len(df)
    print(f"\nFinal combined valid rows: {final_count}")
    
    print("\n2. Encoding Features and Target...")
    # Encoding
    X = df[FEATURES].copy()
    X['performance_trend'] = X['performance_trend'].map(TREND_MAP)
    y = df[TARGET].map(RISK_MAP)
    
    # Save combined dataset
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"Cleaned dataset saved to: {OUTPUT_CSV}")
    
    print("\n3. Class Distribution...")
    print(df[TARGET].value_counts())
    
    print("\n4. Training RandomForestClassifier...")
    # Initialize and train model
    model = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
    model.fit(X, y)
    
    print("\n5. Model Evaluation (on entire authoritative dataset)...")
    y_pred = model.predict(X)
    
    acc = accuracy_score(y, y_pred)
    prec = precision_score(y, y_pred, average='weighted')
    rec = recall_score(y, y_pred, average='weighted')
    f1 = f1_score(y, y_pred, average='weighted')
    
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    
    print("\nClassification Report:")
    target_names = ['Low', 'Medium', 'High']
    present_classes = sorted(y.unique())
    names = [target_names[i] for i in present_classes]
    
    print(classification_report(y, y_pred, target_names=names))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y, y_pred))
    
    print("\n6. Saving Model Artifacts...")
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to: {MODEL_PATH}")
    
    print("\nTraining Complete.")
    print("=" * 60)

if __name__ == "__main__":
    main()
