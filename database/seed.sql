-- EduShield AI Seed Data

-- Insert Faculty
INSERT INTO faculty (faculty_id, name, department, email) VALUES
('FAC001', 'Dr. Arvind Swaminathan', 'Information Technology', 'arvind.it@edushield.edu'),
('FAC002', 'Prof. Priya Venkatesh', 'Computer Science & Engineering', 'priya.cse@edushield.edu');

-- General Class Updates (Published by Faculty for all students)
INSERT INTO class_updates (faculty_id, faculty_name, department, subject, update_date, topic, description, document_path) VALUES
(1, 'Dr. Arvind Swaminathan', 'Information Technology', 'Database Management Systems', '2026-09-18', 'Database Normalization (1NF, 2NF, 3NF, BCNF)', 'In today class we covered functional dependencies, candidate keys, and multi-step decomposition up to BCNF with solved exam problems.', '/uploads/dbms_normalization_lecture.pdf'),
(1, 'Dr. Arvind Swaminathan', 'Information Technology', 'Discrete Mathematics', '2026-09-17', 'Recurrence Relations & Generating Functions', 'Comprehensive notes on solving second-order homogeneous linear recurrence relations with characteristic roots.', '/uploads/discrete_math_recurrence.pdf'),
(2, 'Prof. Priya Venkatesh', 'Computer Science & Engineering', 'Operating Systems', '2026-09-16', 'Deadlock Detection & Banker Algorithm', 'Detailed resource allocation graphs, deadlock avoidance conditions, and safety algorithm simulation code.', '/uploads/os_deadlock_bankers.pdf');
