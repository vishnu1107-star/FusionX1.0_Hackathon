import sqlite3
import requests
import json
import os
import sys

BASE_URL = "http://127.0.0.1:5000"
DB_PATH = os.path.join(os.path.dirname(__file__), "edushield.db")

results = {
    "backend_health": False,
    "db_accessible": False,
    "student_table_exists": False,
    "student_count": 0,
    "duplicate_reg_numbers": 0,
    "api_endpoints": {}
}

errors = []

def run_tests():
    print("==================================================")
    print("       EduShield AI E2E System Test Suite        ")
    print("==================================================")

    # 1. Database Check
    print("\n--- 1. DATABASE CHECK ---")
    if os.path.exists(DB_PATH):
        results["db_accessible"] = True
        print(f"[PASS] edushield.db exists at: {DB_PATH}")
    else:
        print(f"[FAIL] edushield.db NOT found at: {DB_PATH}")
        errors.append("Database file backend/edushield.db missing")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Check students table
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='students'")
        if c.fetchone():
            results["student_table_exists"] = True
            print("[PASS] Table 'students' exists in edushield.db")
        else:
            print("[FAIL] Table 'students' does not exist")
            errors.append("Table 'students' missing in database")

        # Check total count
        c.execute("SELECT COUNT(*) FROM students")
        results["student_count"] = c.fetchone()[0]
        print(f"[INFO] Student Count in DB: {results['student_count']}")

        # Check duplicates
        c.execute("SELECT reg_number, COUNT(*) FROM students GROUP BY reg_number HAVING COUNT(*) > 1")
        dups = c.fetchall()
        results["duplicate_reg_numbers"] = len(dups)
        if len(dups) == 0:
            print("[PASS] Registration Numbers are unique (0 duplicates)")
        else:
            print(f"[FAIL] Found {len(dups)} duplicate Registration Numbers: {dups}")
            errors.append(f"Found duplicate Registration Numbers: {dups}")

        conn.close()
    except Exception as e:
        print(f"[FAIL] SQLite database error: {e}")
        errors.append(f"Database error: {e}")

    # 2. Backend Health & API Check
    print("\n--- 2. BACKEND API ENDPOINT CHECKS ---")
    
    # Endpoint 0: Root /
    try:
        r = requests.get(f"{BASE_URL}/", timeout=5)
        if r.status_code == 200 and r.json().get("status") == "ok":
            results["api_endpoints"]["GET /"] = "PASS"
            print("[PASS] GET / -> 200 OK ('status': 'ok')")
        else:
            results["api_endpoints"]["GET /"] = "FAIL"
            errors.append(f"GET / returned {r.status_code}: {r.text}")
    except Exception as e:
        errors.append(f"Failed GET / request: {e}")

    # Endpoint 1: Health
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if r.status_code == 200 and r.json().get("status") == "healthy":
            results["backend_health"] = True
            results["api_endpoints"]["GET /api/health"] = "PASS"
            print("[PASS] GET /api/health -> 200 OK")
        else:
            results["api_endpoints"]["GET /api/health"] = "FAIL"
            errors.append(f"GET /api/health returned {r.status_code}: {r.text}")
    except Exception as e:
        errors.append(f"Failed to connect to backend at {BASE_URL}: {e}")
        print(f"[FAIL] Could not connect to backend: {e}")

    if not results["backend_health"]:
        print("\n[CRITICAL] Backend is not responding. Aborting API tests.")
        return

    # Endpoint 2: Student Login (existing student)
    try:
        payload = {"reg_number": "CEC24CSE001"}
        r = requests.post(f"{BASE_URL}/api/auth/student-login", json=payload, timeout=5)
        if r.status_code == 200 and r.json().get("success"):
            results["api_endpoints"]["POST /api/auth/student-login (CEC24CSE001)"] = "PASS"
            print("[PASS] POST /api/auth/student-login (CEC24CSE001) -> 200 OK")
        else:
            results["api_endpoints"]["POST /api/auth/student-login (CEC24CSE001)"] = "FAIL"
            errors.append(f"Student login failed: {r.status_code} {r.text}")
    except Exception as e:
        errors.append(f"Student login request error: {e}")

    # Endpoint 3: Faculty Login
    try:
        payload = {"faculty_id": "FAC001"}
        r = requests.post(f"{BASE_URL}/api/auth/faculty-login", json=payload, timeout=5)
        if r.status_code == 200 and r.json().get("success"):
            results["api_endpoints"]["POST /api/auth/faculty-login (FAC001)"] = "PASS"
            print("[PASS] POST /api/auth/faculty-login (FAC001) -> 200 OK")
        else:
            results["api_endpoints"]["POST /api/auth/faculty-login (FAC001)"] = "FAIL"
            errors.append(f"Faculty login failed: {r.status_code} {r.text}")
    except Exception as e:
        errors.append(f"Faculty login request error: {e}")

    # Endpoint 4: Student Dashboard
    try:
        r = requests.get(f"{BASE_URL}/api/student/CEC24CSE001/dashboard", timeout=5)
        if r.status_code == 200 and r.json().get("success"):
            results["api_endpoints"]["GET /api/student/CEC24CSE001/dashboard"] = "PASS"
            print("[PASS] GET /api/student/CEC24CSE001/dashboard -> 200 OK")
        else:
            results["api_endpoints"]["GET /api/student/CEC24CSE001/dashboard"] = "FAIL"
            errors.append(f"Student dashboard API failed: {r.status_code} {r.text}")
    except Exception as e:
        errors.append(f"Student dashboard request error: {e}")

    # Endpoint 5: Faculty Dashboard Stats
    try:
        r = requests.get(f"{BASE_URL}/api/faculty/dashboard-stats", timeout=5)
        if r.status_code == 200 and r.json().get("success"):
            results["api_endpoints"]["GET /api/faculty/dashboard-stats"] = "PASS"
            stats = r.json().get("stats", {})
            print(f"[PASS] GET /api/faculty/dashboard-stats -> Total Students: {stats.get('total_students')}")
        else:
            results["api_endpoints"]["GET /api/faculty/dashboard-stats"] = "FAIL"
            errors.append(f"Faculty stats API failed: {r.status_code} {r.text}")
    except Exception as e:
        errors.append(f"Faculty stats request error: {e}")

    # Endpoint 6: Faculty Watchlist
    try:
        r = requests.get(f"{BASE_URL}/api/faculty/watchlist", timeout=5)
        if r.status_code == 200 and r.json().get("success"):
            results["api_endpoints"]["GET /api/faculty/watchlist"] = "PASS"
            wl = r.json().get("watchlist", [])
            print(f"[PASS] GET /api/faculty/watchlist -> Count: {len(wl)}")
        else:
            results["api_endpoints"]["GET /api/faculty/watchlist"] = "FAIL"
            errors.append(f"Faculty watchlist API failed: {r.status_code} {r.text}")
    except Exception as e:
        errors.append(f"Faculty watchlist request error: {e}")

    # Endpoint 7: Class Updates
    try:
        r = requests.get(f"{BASE_URL}/api/class-updates/all", timeout=5)
        if r.status_code == 200 and r.json().get("success"):
            results["api_endpoints"]["GET /api/class-updates/all"] = "PASS"
            print("[PASS] GET /api/class-updates/all -> 200 OK")
        else:
            results["api_endpoints"]["GET /api/class-updates/all"] = "FAIL"
            errors.append(f"Class updates API failed: {r.status_code} {r.text}")
    except Exception as e:
        errors.append(f"Class updates request error: {e}")

    # Endpoint 8: Extracurricular Activities
    try:
        r = requests.get(f"{BASE_URL}/api/extracurricular/student/CEC24CSE001/activities", timeout=5)
        if r.status_code == 200 and r.json().get("success"):
            results["api_endpoints"]["GET /api/extracurricular/student/CEC24CSE001/activities"] = "PASS"
            print("[PASS] GET /api/extracurricular/student/CEC24CSE001/activities -> 200 OK")
        else:
            results["api_endpoints"]["GET /api/extracurricular/student/CEC24CSE001/activities"] = "FAIL"
            errors.append(f"Extracurricular activities API failed: {r.status_code} {r.text}")
    except Exception as e:
        errors.append(f"Extracurricular activities request error: {e}")

    # Endpoint 9: Bonafide Requests History
    try:
        r = requests.get(f"{BASE_URL}/api/bonafide/student/CEC24CSE001/history", timeout=5)
        if r.status_code == 200 and r.json().get("success"):
            results["api_endpoints"]["GET /api/bonafide/student/CEC24CSE001/history"] = "PASS"
            print("[PASS] GET /api/bonafide/student/CEC24CSE001/history -> 200 OK")
        else:
            results["api_endpoints"]["GET /api/bonafide/student/CEC24CSE001/history"] = "FAIL"
            errors.append(f"Bonafide history API failed: {r.status_code} {r.text}")
    except Exception as e:
        errors.append(f"Bonafide history request error: {e}")

    # Endpoint 10: Attendance Options
    try:
        r = requests.get(f"{BASE_URL}/api/attendance/options", timeout=5)
        if r.status_code == 200 and (r.json().get("success") or r.json().get("status") == "success"):
            results["api_endpoints"]["GET /api/attendance/options"] = "PASS"
            print("[PASS] GET /api/attendance/options -> 200 OK")
        else:
            results["api_endpoints"]["GET /api/attendance/options"] = "FAIL"
            errors.append(f"Attendance options API failed: {r.status_code} {r.text}")
    except Exception as e:
        errors.append(f"Attendance options request error: {e}")

    # Summary
    print("\n==================================================")
    print("                TEST RESULTS SUMMARY              ")
    print("==================================================")
    print(f"Backend Health         : {'PASS' if results['backend_health'] else 'FAIL'}")
    print(f"DB Accessible          : {'PASS' if results['db_accessible'] else 'FAIL'}")
    print(f"Student Table Exists   : {'PASS' if results['student_table_exists'] else 'FAIL'}")
    print(f"Total Student Count    : {results['student_count']}")
    print(f"Duplicate Reg Numbers  : {results['duplicate_reg_numbers']}")
    print("\nEndpoint Results:")
    for ep, res in results["api_endpoints"].items():
        print(f"  - {ep}: {res}")

    if errors:
        print("\nErrors Found:")
        for err in errors:
            print(f"  [ERROR] {err}")
    else:
        print("\nALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
