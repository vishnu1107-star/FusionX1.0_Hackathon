import sys
sys.path.insert(0, '..')
import openpyxl

files = [
    "../database/student_master/CSE YEAR 4.xlsx",
    "../database/student_master/ECE YEAR 1.xlsx",
    "../database/student_master/Second year.xlsx",
    "../database/student_master/Third year.xlsx",
]

for fpath in files:
    print(f"\n{'='*60}")
    print(f"FILE: {fpath}")
    try:
        wb = openpyxl.load_workbook(fpath, data_only=True)
        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            print(f"  Sheet: {sheet_name} | Rows: {ws.max_row} | Cols: {ws.max_column}")
            # Print first 3 rows
            for i, row in enumerate(ws.iter_rows(max_row=4, values_only=True)):
                print(f"    Row {i+1}: {row}")
    except Exception as e:
        print(f"  ERROR: {e}")
