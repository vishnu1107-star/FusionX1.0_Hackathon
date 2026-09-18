# EduShield AI — AI-Based Academic Risk Prediction & Personalized Intervention System
**FUSIONX 1.0 National Level Hackathon Prototype**

---

## 📌 Project Overview
**EduShield AI** is an intelligent academic early-warning and intervention platform built for engineering institutions. The system analyzes student academic vectors (lecture attendance %, test scores, assignment quality, deadline submission delays, and performance trajectories) to predict academic failure or backlog risk **BEFORE** internal/final examinations occur.

Rather than giving vague warnings, EduShield AI:
1. **Predicts Early Risk** (LOW, MEDIUM, HIGH + 0–100 Risk Score)
2. **Explains the Root Cause** (Detailed breakdown of contributing factors)
3. **Generates Tailored Interventions** (Unit-specific remedial study plans, practice sets, tutor clinics, mentor alerts, and attendance recovery plans)
4. **Assists Faculty Decision-Making** (OD & Leave workflows where faculty retain decision authority aided by real-time student academic metrics)
5. **Enables Academic Content Updates** (General class updates with downloadable notes/PDFs for all students)
6. **Verifies Extracurricular Portfolios** (Student upload $\rightarrow$ Faculty verification $\rightarrow$ Official verified transcripts)
7. **Generates Official Bonafide Certificates** (Instant generation with auto-populated institutional records and print-ready format)

---

## 🛠️ Technology Stack
- **Frontend**: React (Vite, Modern Responsive CSS, Lucide Icons, Glassmorphism design)
- **Backend**: Python Flask REST API
- **Machine Learning**: Python (Scikit-Learn Random Forest ensemble + multi-factor diagnostic analytics)
- **Database**: PostgreSQL (with automatic schema initialization & SQLite fallback for zero-friction evaluation)

---

## 🚀 Quick Start Guide

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt
# (or: pip install Flask flask-cors psycopg2-binary scikit-learn numpy pandas SQLAlchemy)

# Run Flask server (starts on http://127.0.0.1:5000)
python app.py
```

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server (starts on http://localhost:3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Demo Personas for Instant Hackathon Evaluation

| Persona | Registration No. | Academic Profile | Risk Level | Computed Score |
|---|---|---|---|---|
| **Rahul Sharma** | `23IT002` | Attendance: 58%, Math: 42%, 5 late submissions, declining trend | **HIGH RISK** | **70 / 100** |
| **Ananya Mishra** | `23IT001` | Attendance: 72%, Marks: 64%, 2 late submissions, fluctuating trend | **MEDIUM RISK** | **40 / 100** |
| **Karthik Ram** | `23IT003` | Attendance: 91.5%, Marks: 84.5%, 0 delays, improving trend | **LOW RISK** | **5 / 100** |
| **Faculty Advisor** | `FAC001` | Dr. Arvind Swaminathan (Information Technology) | **Admin / Faculty** | Full Authority |

---

## 🔄 Core AI Flow: PREDICT → EXPLAIN → INTERVENE → MONITOR

```
Student Academic Data
(Attendance %, Test Scores, Delays, Trend)
                 │
                 ▼
      [ Python ML Model ]
                 │
  ┌──────────────┴──────────────┐
  ▼                             ▼
Risk Level (HIGH/MED/LOW)    Risk Factors (Reasons)
Risk Score (0–100)           • Low attendance (58%)
                             • Math deficit (42%)
                             • 5 late submissions
                 │
                 ▼
[ Personalized Intervention Engine ]
  • Mandatory attendance recovery plan
  • Discrete Math Unit 2 Remedial Notes
  • Automated Mentor Alert to Faculty
                 │
                 ▼
[ Ranked Faculty Watchlist & Monitoring ]
```

---

## 📋 Comprehensive Feature Checklist (100% Satisfied)

- [x] **1. Dual-Mode Login**: Student login (Registration number only) & Faculty Advisor login
- [x] **2. Student Profile Card**: Real-time display of Student Name, Reg No, Department, Course, Year, Semester, Mentor
- [x] **3. Academic Dashboard**: Attendance %, Test scores, Assignment scores, Delays, Performance trend
- [x] **4. AI / ML Risk Prediction**: Continuous risk score (0–100) + Risk category (LOW / MEDIUM / HIGH)
- [x] **5. Risk Explanation**: Multi-factor breakdown explaining WHY the student received that risk level
- [x] **6. Personalized Intervention**: Subject-specific remedial study materials, practice problems, remedial sessions, mentor alert
- [x] **7. Student OD Application**: Date range, purpose, location, event details, supporting document upload
- [x] **8. Student Leave Application**: Date range, purpose, medical/proof document upload
- [x] **9. Faculty Dashboard**: High/Med/Low risk summary statistics, pending OD and Leave counters
- [x] **10. Ranked Risk Watchlist**: Faculty watchlist sorted by risk severity with 1-click drill-down academic report
- [x] **11. OD / Leave Management**: Faculty approval/rejection with student academic risk & attendance context provided
- [x] **12. General Class Update Module**: Faculty publishes general class notes & topic updates for all students with attachments
- [x] **13. Extracurricular Activity Module**: Student certificate upload $\rightarrow$ Faculty verification $\rightarrow$ Official verified record
- [x] **14. Bonafide Certificate Generator**: Auto-populated student details, purpose selection, instant preview & printable format
- [x] **15. PostgreSQL Database**: PostgreSQL-compatible `schema.sql` and `seed.sql`

---

*EduShield AI — Built for FUSIONX 1.0 Hackathon.*
