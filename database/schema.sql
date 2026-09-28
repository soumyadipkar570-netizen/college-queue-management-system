-- ====================================================================
-- College Queue Management System (CQMS)
-- Database: MySQL 8.0+
-- Schema Definition
-- ====================================================================

CREATE DATABASE IF NOT EXISTS cqms_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cqms_db;

-- --------------------------------------------------------------------
-- 1. Departments Table (Library & Fees Payment Office)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE, -- 'LIB', 'FEE'
  description VARCHAR(255) NULL,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 2. Services Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  token_prefix VARCHAR(10) NOT NULL, -- 'LIB', 'FEE'
  avg_service_minutes INT NOT NULL DEFAULT 5,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  INDEX idx_dept_status (department_id, status)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 3. Counters Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS counters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  counter_name VARCHAR(50) NOT NULL,
  status ENUM('OPEN', 'CLOSED') DEFAULT 'CLOSED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  INDEX idx_counter_dept_status (department_id, status)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 4. Counter Services (Mapping which services a counter serves)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS counter_services (
  counter_id INT NOT NULL,
  service_id INT NOT NULL,
  PRIMARY KEY (counter_id, service_id),
  FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 5. Users Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  college_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('STUDENT', 'LIBRARY_STAFF', 'FEES_STAFF', 'ADMIN') NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_role (role),
  INDEX idx_user_email (email)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 6. Students Profile Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  course VARCHAR(100) NULL DEFAULT NULL,
  semester VARCHAR(20) NOT NULL DEFAULT '5th Semester',
  year INT NOT NULL DEFAULT 3,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 7. Staff Profile Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  department_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 8. Staff Counter Assignments
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_counters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL,
  counter_id INT NOT NULL,
  active_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active_to TIMESTAMP NULL,
  is_current BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE CASCADE,
  INDEX idx_staff_current (staff_id, is_current)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 9. Daily Queues Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS queues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  service_id INT NOT NULL,
  queue_date DATE NOT NULL,
  status ENUM('OPEN', 'PAUSED', 'CLOSED') DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_service_date (service_id, queue_date),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_queue_lookup (department_id, queue_date, status)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 10. Tokens Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  queue_id INT NOT NULL,
  token_number VARCHAR(20) NOT NULL, -- e.g. LIB-001, FEE-001
  sequence_number INT NOT NULL,
  student_id INT NOT NULL,
  service_id INT NOT NULL,
  department_id INT NOT NULL,
  counter_id INT NULL,
  staff_id INT NULL,
  status ENUM('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'SKIPPED') DEFAULT 'WAITING',
  skip_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  called_at TIMESTAMP NULL,
  serving_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  skipped_at TIMESTAMP NULL,
  FOREIGN KEY (queue_id) REFERENCES queues(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_token_status_queue (queue_id, status, sequence_number),
  INDEX idx_token_student_status (student_id, department_id, status),
  INDEX idx_token_created (created_at)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 11. Token Audit / Event History Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS token_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'CREATED', 'CALLED', 'RECALLED', 'SERVING', 'COMPLETED', 'SKIPPED', 'CANCELLED'
  actor_user_id INT NULL,
  counter_id INT NULL,
  metadata TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_event_token (token_id)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 12. Notifications Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_id INT NULL,
  type VARCHAR(50) NOT NULL, -- 'TOKEN_CALLED', 'TOKEN_SERVING', 'TOKEN_COMPLETED', 'TOKEN_SKIPPED', 'INFO'
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE SET NULL,
  INDEX idx_notif_user (user_id, is_read)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 13. System Settings Table (Queue Rules, Active Token Limits)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value VARCHAR(255) NOT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 14. Audit Logs Table (Admin actions & security audit)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NULL,
  metadata TEXT NULL,
  ip_address VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;
