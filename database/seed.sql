-- EduShield AI Seed Data

-- Insert Faculty
INSERT INTO faculty (faculty_id, name, department, email) VALUES
('FAC001', 'Dr. Arvind Swaminathan', 'Information Technology', 'arvind.it@edushield.edu'),
('FAC002', 'Prof. Priya Venkatesh', 'Computer Science & Engineering', 'priya.cse@edushield.edu');

-- Insert Students (3 Primary Personas + additional class peers)
INSERT INTO students (id, reg_number, name, department, course, year, semester, section, email, phone, mentor_name) VALUES
(1, '23IT002', 'Rahul Sharma', 'Information Technology', 'B.Tech IT', 3, 5, 'A', 'rahul.23it002@edushield.edu', '+91 98765 43210', 'Dr. Arvind Swaminathan'),
(2, '23IT001', 'Ananya Mishra', 'Information Technology', 'B.Tech IT', 3, 5, 'A', 'ananya.23it001@edushield.edu', '+91 98765 43211', 'Dr. Arvind Swaminathan'),
(3, '23IT003', 'Karthik Ram', 'Information Technology', 'B.Tech IT', 3, 5, 'A', 'karthik.23it003@edushield.edu', '+91 98765 43212', 'Dr. Arvind Swaminathan'),
(4, '23IT004', 'Deepak Verma', 'Information Technology', 'B.Tech IT', 3, 5, 'A', 'deepak.23it004@edushield.edu', '+91 98765 43213', 'Dr. Arvind Swaminathan'),
(5, '23IT005', 'Sneha Patel', 'Information Technology', 'B.Tech IT', 3, 5, 'A', 'sneha.23it005@edushield.edu', '+91 98765 43214', 'Dr. Arvind Swaminathan');

-- Academic Records Summary
INSERT INTO academic_records (student_id, attendance_pct, avg_test_score, avg_assignment_score, submission_delays, performance_trend, math_score, dbms_score, os_score, dsa_score) VALUES
(1, 58.00, 42.50, 51.00, 5, 'Declining', 42.00, 48.00, 39.00, 41.00),
(2, 72.00, 64.00, 78.00, 2, 'Fluctuating', 62.00, 68.00, 60.00, 66.00),
(3, 91.50, 84.50, 88.00, 0, 'Improving', 86.00, 89.00, 82.00, 81.00),
(4, 61.00, 49.00, 56.00, 4, 'Declining', 45.00, 52.00, 48.00, 51.00),
(5, 88.00, 79.00, 85.00, 1, 'Stable', 80.00, 82.00, 76.00, 78.00);

-- Detailed Subject Test Scores
INSERT INTO test_scores (student_id, subject, test_name, max_marks, obtained_marks, test_date) VALUES
-- Rahul Sharma (High Risk)
(1, 'Discrete Mathematics', 'Mid-Term Exam', 100, 42.0, '2026-08-20'),
(1, 'Database Management Systems', 'Mid-Term Exam', 100, 48.0, '2026-08-22'),
(1, 'Operating Systems', 'Mid-Term Exam', 100, 39.0, '2026-08-24'),
(1, 'Data Structures & Algorithms', 'Mid-Term Exam', 100, 41.0, '2026-08-26'),
(1, 'Discrete Mathematics', 'Unit Test 1', 50, 18.0, '2026-07-15'),
(1, 'Discrete Mathematics', 'Unit Test 2', 50, 21.0, '2026-08-05'),

-- Ananya Mishra (Medium Risk)
(2, 'Discrete Mathematics', 'Mid-Term Exam', 100, 62.0, '2026-08-20'),
(2, 'Database Management Systems', 'Mid-Term Exam', 100, 68.0, '2026-08-22'),
(2, 'Operating Systems', 'Mid-Term Exam', 100, 60.0, '2026-08-24'),
(2, 'Data Structures & Algorithms', 'Mid-Term Exam', 100, 66.0, '2026-08-26'),

-- Karthik Ram (Low Risk)
(3, 'Discrete Mathematics', 'Mid-Term Exam', 100, 86.0, '2026-08-20'),
(3, 'Database Management Systems', 'Mid-Term Exam', 100, 89.0, '2026-08-22'),
(3, 'Operating Systems', 'Mid-Term Exam', 100, 82.0, '2026-08-24'),
(3, 'Data Structures & Algorithms', 'Mid-Term Exam', 100, 81.0, '2026-08-26');

-- Assignment Submission Records
INSERT INTO submission_records (student_id, subject, title, due_date, submitted_date, delay_days, score, status) VALUES
-- Rahul Sharma (5 late submissions)
(1, 'Discrete Mathematics', 'Assignment 1 - Graph Theory', '2026-07-20', '2026-07-25', 5, 45.0, 'Late'),
(1, 'Database Management Systems', 'Assignment 1 - ER Modeling', '2026-07-28', '2026-08-01', 4, 52.0, 'Late'),
(1, 'Operating Systems', 'Assignment 1 - Process Scheduling', '2026-08-05', '2026-08-09', 4, 40.0, 'Late'),
(1, 'Data Structures', 'Assignment 1 - Trees & AVL', '2026-08-12', '2026-08-15', 3, 58.0, 'Late'),
(1, 'Discrete Mathematics', 'Assignment 2 - Recurrence Relations', '2026-08-28', '2026-09-02', 5, 50.0, 'Late'),

-- Ananya Mishra (2 late submissions)
(2, 'Discrete Mathematics', 'Assignment 1 - Graph Theory', '2026-07-20', '2026-07-21', 1, 75.0, 'Late'),
(2, 'Database Management Systems', 'Assignment 1 - ER Modeling', '2026-07-28', '2026-07-28', 0, 82.0, 'Submitted'),
(2, 'Operating Systems', 'Assignment 1 - Process Scheduling', '2026-08-05', '2026-08-07', 2, 70.0, 'Late'),
(2, 'Data Structures', 'Assignment 1 - Trees & AVL', '2026-08-12', '2026-08-12', 0, 85.0, 'Submitted'),

-- Karthik Ram (0 late submissions)
(3, 'Discrete Mathematics', 'Assignment 1 - Graph Theory', '2026-07-20', '2026-07-19', 0, 92.0, 'Submitted'),
(3, 'Database Management Systems', 'Assignment 1 - ER Modeling', '2026-07-28', '2026-07-27', 0, 90.0, 'Submitted'),
(3, 'Operating Systems', 'Assignment 1 - Process Scheduling', '2026-08-05', '2026-08-04', 0, 88.0, 'Submitted'),
(3, 'Data Structures', 'Assignment 1 - Trees & AVL', '2026-08-12', '2026-08-11', 0, 86.0, 'Submitted');

-- OD Applications
INSERT INTO od_applications (student_id, from_date, to_date, purpose, location, event_details, document_path, status) VALUES
(1, '2026-09-22', '2026-09-24', 'Hackathon Participation', 'Chennai Institute of Technology, Chennai', 'Finalist at National Smart India Hackathon internal round.', '/uploads/od_hackathon_sample.pdf', 'Pending'),
(2, '2026-09-25', '2026-09-26', 'IEEE Student Paper Presentation', 'Anna University, Guindy', 'Presenting paper on Edge Computing Security.', '/uploads/od_ieee_sample.pdf', 'Pending'),
(3, '2026-09-10', '2026-09-11', 'Inter-College Coding Championship', 'IIT Madras Research Park', 'ACM ICPC Regional Qualifier contest.', '/uploads/od_icpc_sample.pdf', 'Approved');

-- Leave Applications
INSERT INTO leave_applications (student_id, from_date, to_date, purpose, document_path, status) VALUES
(1, '2026-09-28', '2026-09-29', 'Medical leave due to viral fever and doctor consultation.', '/uploads/medical_cert_sample.pdf', 'Pending'),
(2, '2026-09-14', '2026-09-15', 'Attending sister marriage function in native town.', NULL, 'Approved');

-- General Class Updates (Published by Faculty for all students)
INSERT INTO class_updates (faculty_id, faculty_name, department, subject, update_date, topic, description, document_path) VALUES
(1, 'Dr. Arvind Swaminathan', 'Information Technology', 'Database Management Systems', '2026-09-18', 'Database Normalization (1NF, 2NF, 3NF, BCNF)', 'In today class we covered functional dependencies, candidate keys, and multi-step decomposition up to BCNF with solved exam problems.', '/uploads/dbms_normalization_lecture.pdf'),
(1, 'Dr. Arvind Swaminathan', 'Information Technology', 'Discrete Mathematics', '2026-09-17', 'Recurrence Relations & Generating Functions', 'Comprehensive notes on solving second-order homogeneous linear recurrence relations with characteristic roots.', '/uploads/discrete_math_recurrence.pdf'),
(2, 'Prof. Priya Venkatesh', 'Computer Science & Engineering', 'Operating Systems', '2026-09-16', 'Deadlock Detection & Banker Algorithm', 'Detailed resource allocation graphs, deadlock avoidance conditions, and safety algorithm simulation code.', '/uploads/os_deadlock_bankers.pdf');

-- Extracurricular Activities
INSERT INTO extracurricular_activities (student_id, activity_type, event_name, activity_date, description, participation_details, certificate_path, verification_status) VALUES
(1, 'Hackathon', 'DevForge 2026 Hackathon', '2026-08-15', 'Built an automated IoT energy monitoring dashboard in 36 hours.', 'Team Lead - Runner Up Trophy Winner', '/uploads/devforge_certificate.pdf', 'Pending'),
(2, 'Workshop', 'Generative AI & LLM Deployment Masterclass', '2026-07-22', '2-day hands-on workshop on LangChain, RAG pipelines, and vector databases.', 'Active Participant & Project Submitter', '/uploads/genai_workshop_cert.pdf', 'Verified'),
(3, 'Internship', 'Summer Cloud Engineering Intern at Zoho Corp', '2026-06-01', 'Worked on cloud infrastructure monitoring, microservice observability, and automated testing.', 'Completed 8-week internship with outstanding rating', '/uploads/zoho_internship_cert.pdf', 'Verified');

-- Bonafide Certificates
INSERT INTO bonafide_requests (student_id, purpose, status, certificate_number, generated_at) VALUES
(3, 'Passport Application & Police Verification', 'Generated', 'ES-BONA-2026-0891', '2026-09-05 11:30:00'),
(2, 'Education Bank Loan Application (SBI)', 'Generated', 'ES-BONA-2026-0742', '2026-08-18 14:15:00');

-- Mock Attendance Records
INSERT INTO attendance_records (student_id, faculty_id, subject, attendance_date, period, status) VALUES
(1, 1, 'Database Management Systems', '2026-09-17', 1, 'Absent'),
(2, 1, 'Database Management Systems', '2026-09-17', 1, 'Present'),
(3, 1, 'Database Management Systems', '2026-09-17', 1, 'Present'),
(4, 1, 'Database Management Systems', '2026-09-17', 1, 'Absent'),
(5, 1, 'Database Management Systems', '2026-09-17', 1, 'Present'),
(1, 1, 'Database Management Systems', '2026-09-18', 2, 'Present'),
(2, 1, 'Database Management Systems', '2026-09-18', 2, 'Present'),
(3, 1, 'Database Management Systems', '2026-09-18', 2, 'Present'),
(4, 1, 'Database Management Systems', '2026-09-18', 2, 'Absent'),
(5, 1, 'Database Management Systems', '2026-09-18', 2, 'Present');
