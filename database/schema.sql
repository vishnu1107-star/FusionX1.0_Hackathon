-- EduShield AI Database Schema (PostgreSQL Compatible)

DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS bonafide_requests CASCADE;
DROP TABLE IF EXISTS extracurricular_activities CASCADE;
DROP TABLE IF EXISTS class_updates CASCADE;
DROP TABLE IF EXISTS leave_applications CASCADE;
DROP TABLE IF EXISTS od_applications CASCADE;
DROP TABLE IF EXISTS interventions CASCADE;
DROP TABLE IF EXISTS risk_predictions CASCADE;
DROP TABLE IF EXISTS submission_records CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS test_scores CASCADE;
DROP TABLE IF EXISTS academic_records CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;

-- Faculty Table
CREATE TABLE faculty (
    id SERIAL PRIMARY KEY,
    faculty_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students Table
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    reg_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    course VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    semester INT NOT NULL,
    section VARCHAR(10) DEFAULT 'A',
    email VARCHAR(100),
    phone VARCHAR(20),
    mentor_name VARCHAR(100),
    aadhaar_number VARCHAR(32),
    address TEXT,
    dob DATE,
    father_name VARCHAR(100),
    mother_name VARCHAR(100),
    batch VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Academic Records Summary Table
CREATE TABLE academic_records (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    attendance_pct NUMERIC(5,2) NOT NULL,
    avg_test_score NUMERIC(5,2) NOT NULL,
    avg_assignment_score NUMERIC(5,2) NOT NULL,
    submission_delays INT NOT NULL DEFAULT 0,
    performance_trend VARCHAR(50) NOT NULL, -- 'Improving', 'Stable', 'Declining', 'Fluctuating'
    math_score NUMERIC(5,2) DEFAULT 0,
    dbms_score NUMERIC(5,2) DEFAULT 0,
    os_score NUMERIC(5,2) DEFAULT 0,
    dsa_score NUMERIC(5,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Detailed Test Scores
CREATE TABLE test_scores (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    max_marks NUMERIC(5,2) DEFAULT 100,
    obtained_marks NUMERIC(5,2) NOT NULL,
    test_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignments & Submission Delays
CREATE TABLE submission_records (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    title VARCHAR(100) NOT NULL,
    due_date DATE,
    submitted_date DATE,
    delay_days INT DEFAULT 0,
    score NUMERIC(5,2),
    status VARCHAR(50) DEFAULT 'Submitted' -- 'Submitted', 'Late', 'Missing'
);

-- Risk Predictions Table
CREATE TABLE risk_predictions (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    risk_score INT NOT NULL, -- 0 to 100
    risk_level VARCHAR(20) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH'
    risk_factors TEXT NOT NULL, -- JSON string or array
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Personalized Interventions Table
CREATE TABLE interventions (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    risk_level VARCHAR(20) NOT NULL,
    action_items TEXT NOT NULL, -- JSON string or array
    mentor_alerted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- On Duty (OD) Applications Table
CREATE TABLE od_applications (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    event_details TEXT,
    document_path VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    faculty_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Applications Table
CREATE TABLE leave_applications (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    purpose TEXT NOT NULL,
    document_path VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    faculty_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- General Class Updates (Academic Content)
CREATE TABLE class_updates (
    id SERIAL PRIMARY KEY,
    faculty_id INT REFERENCES faculty(id) ON DELETE SET NULL,
    faculty_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    update_date DATE NOT NULL,
    topic VARCHAR(255) NOT NULL,
    description TEXT,
    document_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extracurricular Activities Table
CREATE TABLE extracurricular_activities (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL, -- 'Hackathon', 'Seminar', 'Internship', 'Workshop', 'Project', 'Competition', 'Other'
    event_name VARCHAR(255) NOT NULL,
    activity_date DATE NOT NULL,
    description TEXT,
    participation_details TEXT,
    certificate_path VARCHAR(255),
    verification_status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Verified', 'Rejected'
    faculty_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bonafide Certificate Requests
CREATE TABLE bonafide_requests (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    purpose VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Generated',
    certificate_number VARCHAR(100) UNIQUE,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Records Table
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    faculty_id INT REFERENCES faculty(id) ON DELETE SET NULL,
    subject VARCHAR(100) NOT NULL,
    attendance_date DATE NOT NULL,
    period INT NOT NULL,
    status VARCHAR(10) NOT NULL,
    UNIQUE(student_id, subject, attendance_date, period)
);
