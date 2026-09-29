-- ====================================================================
-- College Queue Management System (CQMS)
-- Database Seed Data
-- ====================================================================

USE cqms_db;

-- --------------------------------------------------------------------
-- Departments
-- --------------------------------------------------------------------
INSERT INTO departments (id, name, code, description, status) VALUES
(1, 'College Library', 'LIB', 'Central Academic Library, Book Issue, Returns & Scholar Resources', 'ACTIVE'),
(2, 'Fees Payment Office', 'FEE', 'Accounts Section for Tuition Fees, Verification & Financial Aid Desk', 'ACTIVE')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), status=VALUES(status);

-- --------------------------------------------------------------------
-- Services
-- --------------------------------------------------------------------
-- Library Services
INSERT INTO services (id, department_id, name, token_prefix, avg_service_minutes, status) VALUES
(1, 1, 'Book Issue', 'LIB', 5, 'ACTIVE'),
(2, 1, 'Book Return', 'LIB', 3, 'ACTIVE'),
(3, 1, 'Book Renewal', 'LIB', 3, 'ACTIVE'),
(4, 1, 'Fine / Query', 'LIB', 6, 'ACTIVE'),
(5, 1, 'Library Card / Help', 'LIB', 7, 'ACTIVE')
ON DUPLICATE KEY UPDATE name=VALUES(name), token_prefix=VALUES(token_prefix), avg_service_minutes=VALUES(avg_service_minutes), status=VALUES(status);

-- Fees Payment Office Services
INSERT INTO services (id, department_id, name, token_prefix, avg_service_minutes, status) VALUES
(6, 2, 'Semester Fee Payment', 'FEE', 8, 'ACTIVE'),
(7, 2, 'Receipt Collection', 'FEE', 4, 'ACTIVE'),
(8, 2, 'Payment Verification', 'FEE', 6, 'ACTIVE'),
(9, 2, 'Due / Fine Query', 'FEE', 5, 'ACTIVE'),
(10, 2, 'Scholarship / Fee Query', 'FEE', 7, 'ACTIVE')
ON DUPLICATE KEY UPDATE name=VALUES(name), token_prefix=VALUES(token_prefix), avg_service_minutes=VALUES(avg_service_minutes), status=VALUES(status);

-- --------------------------------------------------------------------
-- Counters
-- --------------------------------------------------------------------
INSERT INTO counters (id, department_id, counter_name, status) VALUES
(1, 1, 'Library Counter 1 (Circulation)', 'OPEN'),
(2, 1, 'Library Counter 2 (Desk Help)', 'CLOSED'),
(3, 2, 'Fees Counter 1 (Payment & Receipts)', 'OPEN'),
(4, 2, 'Fees Counter 2 (Verification & Query)', 'CLOSED')
ON DUPLICATE KEY UPDATE counter_name=VALUES(counter_name), status=VALUES(status);

-- --------------------------------------------------------------------
-- Counter Services mapping (which counter handles which services)
-- --------------------------------------------------------------------
INSERT IGNORE INTO counter_services (counter_id, service_id) VALUES
-- Library Counter 1 handles Book Issue, Return, Renewal
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
-- Library Counter 2 handles Fine / Query, Card / Help
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5),
-- Fees Counter 1 handles Semester Fee Payment, Receipt Collection
(3, 6), (3, 7), (3, 8), (3, 9), (3, 10),
-- Fees Counter 2 handles Verification, Dues, Scholarship
(4, 6), (4, 7), (4, 8), (4, 9), (4, 10);

-- --------------------------------------------------------------------
-- System Settings
-- --------------------------------------------------------------------
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('max_active_tokens_per_student_per_dept', '1', 'Maximum active waiting/called tokens a student can hold per department'),
('token_grace_period_minutes', '5', 'Grace period before a called token can be marked as skipped'),
('default_queue_discipline', 'FIFO', 'Queue ordering discipline'),
('operating_hours_start', '09:00', 'College office queue opening time'),
('operating_hours_end', '17:00', 'College office queue closing time')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), description=VALUES(description);

-- --------------------------------------------------------------------
-- Registered Students (3rd Year, 5th Semester, BCREC format)
-- --------------------------------------------------------------------
INSERT INTO users (id, college_id, name, email, password_hash, role) VALUES
(4, 'BCREC-2024-001', 'Soumyadip Kar', 'student@cqms.edu', '$2a$10$9Gv1p34z8sT/44kR9e6o.e3i27Yv5p.M3BvW8rV4P9L5V0q.R5O7S', 'STUDENT'),
(5, 'BCREC-2024-002', 'Ananya Sen', 'student2@cqms.edu', '$2a$10$9Gv1p34z8sT/44kR9e6o.e3i27Yv5p.M3BvW8rV4P9L5V0q.R5O7S', 'STUDENT'),
(6, 'BCREC-2024-003', 'Rohan Mukherjee', 'student3@cqms.edu', '$2a$10$9Gv1p34z8sT/44kR9e6o.e3i27Yv5p.M3BvW8rV4P9L5V0q.R5O7S', 'STUDENT'),
(7, 'BCREC-2024-004', 'Souptik Das', NULL, '$2a$10$9Gv1p34z8sT/44kR9e6o.e3i27Yv5p.M3BvW8rV4P9L5V0q.R5O7S', 'STUDENT'),
(8, 'BCREC-2024-005', 'Subhajeet Gorai', NULL, '$2a$10$9Gv1p34z8sT/44kR9e6o.e3i27Yv5p.M3BvW8rV4P9L5V0q.R5O7S', 'STUDENT'),
(9, 'BCREC-2024-006', 'Shankar Gorain', NULL, '$2a$10$9Gv1p34z8sT/44kR9e6o.e3i27Yv5p.M3BvW8rV4P9L5V0q.R5O7S', 'STUDENT'),
(10, 'BCREC-2024-007', 'Srijan Mondal', NULL, '$2a$10$9Gv1p34z8sT/44kR9e6o.e3i27Yv5p.M3BvW8rV4P9L5V0q.R5O7S', 'STUDENT')
ON DUPLICATE KEY UPDATE college_id=VALUES(college_id), name=VALUES(name), email=VALUES(email);

INSERT INTO students (user_id, course, semester, year) VALUES
(4, 'B.Tech Computer Science & Engineering', '5th Semester', 3),
(5, 'B.Tech Information Technology', '5th Semester', 3),
(6, 'B.Tech Electronics & Communication', '5th Semester', 3),
(7, 'B.Tech Computer Science & Engineering', '5th Semester', 3),
(8, 'B.Tech Computer Science & Engineering', '5th Semester', 3),
(9, 'B.Tech Computer Science & Engineering', '5th Semester', 3),
(10, 'B.Tech Computer Science & Engineering', '5th Semester', 3)
ON DUPLICATE KEY UPDATE course=VALUES(course), semester=VALUES(semester), year=VALUES(year);
