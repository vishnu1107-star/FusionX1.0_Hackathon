"""
Import student records from 4 Excel files into backend/edushield.db students table.
"""

import sqlite3
import openpyxl
import re
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'edushield.db')

EXCEL_FILES = [
    {
        "path": os.path.join(os.path.dirname(__file__), '..', 'database', 'student_master', 'CSE YEAR 4.xlsx'),
        "label": "CSE YEAR 4.xlsx"
    },
    {
        "path": os.path.join(os.path.dirname(__file__), '..', 'database', 'student_master', 'ECE YEAR 1.xlsx'),
        "label": "ECE YEAR 1.xlsx"
    },
    {
        "path": os.path.join(os.path.dirname(__file__), '..', 'database', 'student_master', 'Second year.xlsx'),
        "label": "Second year.xlsx"
    },
    {
        "path": os.path.join(os.path.dirname(__file__), '..', 'database', 'student_master', 'Third year.xlsx'),
        "label": "Third year.xlsx"
    },
]

ORDINAL_MAP = {
    'first': 1, '1st': 1, '1': 1,
    'second': 2, '2nd': 2, '2': 2,
    'third': 3, '3rd': 3, '3': 3,
    'fourth': 4, '4th': 4, '4': 4,
    'fifth': 5, '5th': 5, '5': 5,
    'sixth': 6, '6th': 6, '6': 6,
    'seventh': 7, '7th': 7, '7': 7,
    'eighth': 8, '8th': 8, '8': 8,
}

def parse_int_field(value):
    """Parse year/semester values like '4', '2nd Year', '3rd', '5th', etc."""
    if value is None:
        return None
    s = str(value).strip().lower()
    # Direct match
    if s in ORDINAL_MAP:
        return ORDINAL_MAP[s]
    # Extract leading digits
    m = re.match(r'^(\d+)', s)
    if m:
        return int(m.group(1))
    # Extract ordinal words
    for key, val in ORDINAL_MAP.items():
        if key in s:
            return val
    return None

def clean_str(value, maxlen=None):
    if value is None:
        return None
    s = str(value).strip()
    if maxlen:
        s = s[:maxlen]
    return s if s else None

def get_header_map(header_row):
    """Return dict: col_name_lower -> index"""
    return {str(h).strip().lower(): i for i, h in enumerate(header_row) if h is not None}

def import_file(cursor, fpath, label):
    stats = {"read": 0, "inserted": 0, "skipped_dup": 0, "errors": 0}
    wb = openpyxl.load_workbook(fpath, data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        print(f"  [WARN] No rows in {label}")
        return stats

    header = rows[0]
    hmap = get_header_map(header)

    # Column index lookups (case-insensitive)
    def col(name):
        return hmap.get(name.lower())

    reg_col = col('registration number')
    name_col = col('name')
    dept_col = col('department')
    course_col = col('course')
    year_col = col('year')
    sem_col = col('semester')

    if reg_col is None or name_col is None:
        print(f"  [ERROR] Cannot find required columns in {label}. Header: {header}")
        stats["errors"] += 1
        return stats

    for row_idx, row in enumerate(rows[1:], start=2):
        # Skip fully empty rows
        if all(v is None or str(v).strip() == '' for v in row):
            continue

        stats["read"] += 1

        reg_number = clean_str(row[reg_col], 50)
        student_name = clean_str(row[name_col], 100)
        department = clean_str(row[dept_col], 100) if dept_col is not None else None
        course = clean_str(row[course_col], 100) if course_col is not None else None
        year_raw = row[year_col] if year_col is not None else None
        sem_raw = row[sem_col] if sem_col is not None else None

        year_val = parse_int_field(year_raw)
        sem_val = parse_int_field(sem_raw)

        # Validate required non-null fields
        if not reg_number:
            print(f"  [SKIP] Row {row_idx}: missing reg_number")
            stats["errors"] += 1
            continue
        if not student_name:
            print(f"  [SKIP] Row {row_idx}: missing name for {reg_number}")
            stats["errors"] += 1
            continue
        if not department:
            department = "Unknown"
        if not course:
            course = "Unknown"
        if year_val is None:
            year_val = 0
        if sem_val is None:
            sem_val = 0

        # Check for duplicate
        cursor.execute("SELECT id FROM students WHERE reg_number = ?", (reg_number,))
        existing = cursor.fetchone()
        if existing:
            stats["skipped_dup"] += 1
            continue

        try:
            cursor.execute("""
                INSERT INTO students (reg_number, name, department, course, year, semester)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (reg_number, student_name, department, course, year_val, sem_val))
            stats["inserted"] += 1
        except Exception as e:
            print(f"  [ERROR] Row {row_idx} ({reg_number}): {e}")
            stats["errors"] += 1

    wb.close()
    return stats

def main():
    print("=" * 65)
    print("EduShield Student Import")
    print("=" * 65)
    print(f"Database: {DB_PATH}")
    print()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM students")
    initial_count = cursor.fetchone()[0]
    print(f"Initial student count in DB: {initial_count}\n")

    total_read = 0
    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    for f in EXCEL_FILES:
        print(f"Processing: {f['label']}")
        try:
            stats = import_file(cursor, f['path'], f['label'])
            conn.commit()
            total_read += stats['read']
            total_inserted += stats['inserted']
            total_skipped += stats['skipped_dup']
            total_errors += stats['errors']
            print(f"  Read: {stats['read']}  Inserted: {stats['inserted']}  Duplicates skipped: {stats['skipped_dup']}  Errors: {stats['errors']}")
        except Exception as e:
            print(f"  [FATAL ERROR] {f['label']}: {e}")
            import traceback; traceback.print_exc()
            conn.rollback()
        print()

    cursor.execute("SELECT COUNT(*) FROM students")
    final_count = cursor.fetchone()[0]

    print("=" * 65)
    print("IMPORT SUMMARY")
    print("=" * 65)
    print(f"  Total rows read from Excel files : {total_read}")
    print(f"  Total inserted                   : {total_inserted}")
    print(f"  Total duplicates skipped         : {total_skipped}")
    print(f"  Total errors                     : {total_errors}")
    print(f"  Initial student count            : {initial_count}")
    print(f"  Final student count in DB        : {final_count}")
    print()

    print("Verification — 3 sample imported students:")
    cursor.execute("""
        SELECT reg_number, name, department, year, semester
        FROM students
        ORDER BY id DESC
        LIMIT 3
    """)
    for row in cursor.fetchall():
        print(f"  reg_number={row[0]}  name={row[1]}  dept={row[2]}  year={row[3]}  sem={row[4]}")

    conn.close()
    print("\nDone.")

if __name__ == "__main__":
    main()
