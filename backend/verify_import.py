import sqlite3, os

DB_PATH = os.path.join(os.path.dirname(__file__), 'edushield.db')
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

print("=== Final Verification ===")
c.execute("SELECT COUNT(*) FROM students")
print(f"Total students in DB: {c.fetchone()[0]}")

print()
print("Breakdown by department:")
c.execute("SELECT department, year, COUNT(*) FROM students GROUP BY department, year ORDER BY department, year")
for row in c.fetchall():
    print(f"  {row[0]:45s} Year {row[1]}: {row[2]} students")

print()
print("3 imported student samples (CSE Y4, ECE Y1, 2nd year):")
for reg in ['CEC24CSE001', 'CEC24ECE001', '2024-EEE-001', '2024-IT-001']:
    c.execute("SELECT reg_number, name, department, year, semester FROM students WHERE reg_number=?", (reg,))
    r = c.fetchone()
    if r:
        print(f"  {r[0]}: {r[1]} | {r[2]} | Year {r[3]} Sem {r[4]}")
    else:
        print(f"  {reg}: NOT FOUND")

conn.close()
