import sqlite3

conn = sqlite3.connect('edushield.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cursor.fetchall()
print("Tables:", [t[0] for t in tables])
print()

cursor.execute("PRAGMA table_info(students)")
cols = cursor.fetchall()
print("students table columns:")
for c in cols:
    print(f"  cid={c[0]} name={c[1]} type={c[2]} notnull={c[3]} default={c[4]} pk={c[5]}")

print()
cursor.execute("SELECT COUNT(*) FROM students")
print("Existing student count:", cursor.fetchone()[0])

cursor.execute("SELECT reg_number, name, department, year, semester FROM students LIMIT 5")
rows = cursor.fetchall()
print("Sample rows:")
for r in rows:
    print(" ", r)

conn.close()
