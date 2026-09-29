const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = 3306,
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'cqms_db'
} = process.env;

async function runSeed() {
  console.log('--- Starting CQMS Database Initialization & Seeding ---');
  console.log(`Connecting to MySQL host: ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);

  // Connect to server (without DB first) to ensure database exists
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true
  });

  try {
    console.log(`Ensuring database '${DB_NAME}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${DB_NAME}\`;`);

    // 1. Read & run schema.sql
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    console.log(`Executing schema from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('✓ Schema executed successfully.');

    // 2. Read & run seed.sql
    const seedPath = path.join(__dirname, '../../../database/seed.sql');
    console.log(`Executing seed from: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await connection.query(seedSql);
    console.log('✓ Department, service, counter and settings seed applied.');

    // 3. Create Users with Bcrypt Hashing
    console.log('Hashing passwords and seeding users...');
    const saltRounds = 10;
    const defaultPasswordHash = await bcrypt.hash('student123', saltRounds);
    const libraryPasswordHash = await bcrypt.hash('library123', saltRounds);
    const feesPasswordHash = await bcrypt.hash('fees123', saltRounds);
    const adminPasswordHash = await bcrypt.hash('admin123', saltRounds);

    const usersToInsert = [
      {
        college_id: 'ADM-001',
        name: 'Dr. Amit Roy',
        email: 'admin@cqms.edu',
        password_hash: adminPasswordHash,
        role: 'ADMIN'
      },
      {
        college_id: 'LIB-STAFF-01',
        name: 'Rajesh Sharma',
        email: 'library@cqms.edu',
        password_hash: libraryPasswordHash,
        role: 'LIBRARY_STAFF'
      },
      {
        college_id: 'FEE-STAFF-01',
        name: 'Priya Patel',
        email: 'fees@cqms.edu',
        password_hash: feesPasswordHash,
        role: 'FEES_STAFF'
      },
      {
        college_id: 'BCREC-2024-001',
        name: 'Soumyadip Kar',
        email: 'student@cqms.edu',
        password_hash: defaultPasswordHash,
        role: 'STUDENT'
      },
      {
        college_id: 'BCREC-2024-002',
        name: 'Ananya Sen',
        email: 'student2@cqms.edu',
        password_hash: defaultPasswordHash,
        role: 'STUDENT'
      },
      {
        college_id: 'BCREC-2024-003',
        name: 'Rohan Mukherjee',
        email: 'student3@cqms.edu',
        password_hash: defaultPasswordHash,
        role: 'STUDENT'
      },
      {
        college_id: 'BCREC-2024-004',
        name: 'Souptik Das',
        email: null,
        password_hash: defaultPasswordHash,
        role: 'STUDENT'
      },
      {
        college_id: 'BCREC-2024-005',
        name: 'Subhajeet Gorai',
        email: null,
        password_hash: defaultPasswordHash,
        role: 'STUDENT'
      },
      {
        college_id: 'BCREC-2024-006',
        name: 'Shankar Gorain',
        email: null,
        password_hash: defaultPasswordHash,
        role: 'STUDENT'
      },
      {
        college_id: 'BCREC-2024-007',
        name: 'Srijan Mondal',
        email: null,
        password_hash: defaultPasswordHash,
        role: 'STUDENT'
      }
    ];

    for (const u of usersToInsert) {
      await connection.query(
        `INSERT INTO users (college_id, name, email, password_hash, role)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), password_hash=VALUES(password_hash), role=VALUES(role)`,
        [u.college_id, u.name, u.email, u.password_hash, u.role]
      );
    }
    console.log('✓ Users seeded.');

    // 4. Create Students profile
    const [studentUsers] = await connection.query(`SELECT id, college_id FROM users WHERE role = 'STUDENT'`);
    for (const stu of studentUsers) {
      if (stu.college_id === 'BCREC-2024-001') {
        await connection.query(
          `INSERT INTO students (user_id, course, semester, year)
           VALUES (?, 'B.Tech Computer Science & Engineering', '5th Semester', 3)
           ON DUPLICATE KEY UPDATE course=VALUES(course), semester=VALUES(semester), year=VALUES(year)`,
          [stu.id]
        );
      } else if (stu.college_id === 'BCREC-2024-002') {
        await connection.query(
          `INSERT INTO students (user_id, course, semester, year)
           VALUES (?, 'B.Tech Information Technology', '5th Semester', 3)
           ON DUPLICATE KEY UPDATE course=VALUES(course), semester=VALUES(semester), year=VALUES(year)`,
          [stu.id]
        );
      } else if (stu.college_id === 'BCREC-2024-003') {
        await connection.query(
          `INSERT INTO students (user_id, course, semester, year)
           VALUES (?, 'B.Tech Electronics & Communication', '5th Semester', 3)
           ON DUPLICATE KEY UPDATE course=VALUES(course), semester=VALUES(semester), year=VALUES(year)`,
          [stu.id]
        );
      } else {
        await connection.query(
          `INSERT INTO students (user_id, course, semester, year)
           VALUES (?, 'B.Tech Computer Science & Engineering', '5th Semester', 3)
           ON DUPLICATE KEY UPDATE course=VALUES(course), semester=VALUES(semester), year=VALUES(year)`,
          [stu.id]
        );
      }
    }
    console.log('✓ Student profiles seeded.');

    // 5. Create Staff profile & Staff Counter Assignments
    // Library staff
    const [libStaffUser] = await connection.query(`SELECT id FROM users WHERE email = 'library@cqms.edu'`);
    if (libStaffUser.length > 0) {
      await connection.query(
        `INSERT INTO staff (user_id, employee_id, department_id)
         VALUES (?, 'LIB-STAFF-01', 1)
         ON DUPLICATE KEY UPDATE department_id=VALUES(department_id)`,
        [libStaffUser[0].id]
      );
      const [libStaff] = await connection.query(`SELECT id FROM staff WHERE user_id = ?`, [libStaffUser[0].id]);
      if (libStaff.length > 0) {
        // Assign to Counter 1 (Library Counter 1)
        await connection.query(`DELETE FROM staff_counters WHERE staff_id = ?`, [libStaff[0].id]);
        await connection.query(
          `INSERT INTO staff_counters (staff_id, counter_id, is_current) VALUES (?, 1, TRUE)`,
          [libStaff[0].id]
        );
      }
    }

    // Fees staff
    const [feeStaffUser] = await connection.query(`SELECT id FROM users WHERE email = 'fees@cqms.edu'`);
    if (feeStaffUser.length > 0) {
      await connection.query(
        `INSERT INTO staff (user_id, employee_id, department_id)
         VALUES (?, 'FEE-STAFF-01', 2)
         ON DUPLICATE KEY UPDATE department_id=VALUES(department_id)`,
        [feeStaffUser[0].id]
      );
      const [feeStaff] = await connection.query(`SELECT id FROM staff WHERE user_id = ?`, [feeStaffUser[0].id]);
      if (feeStaff.length > 0) {
        // Assign to Counter 3 (Fees Counter 1)
        await connection.query(`DELETE FROM staff_counters WHERE staff_id = ?`, [feeStaff[0].id]);
        await connection.query(
          `INSERT INTO staff_counters (staff_id, counter_id, is_current) VALUES (?, 3, TRUE)`,
          [feeStaff[0].id]
        );
      }
    }
    console.log('✓ Staff profiles & counter assignments seeded.');

    // 6. Pre-seed today's queues for services
    const today = new Date().toISOString().slice(0, 10);
    const [allServices] = await connection.query(`SELECT id, department_id FROM services`);
    for (const s of allServices) {
      await connection.query(
        `INSERT INTO queues (department_id, service_id, queue_date, status)
         VALUES (?, ?, ?, 'OPEN')
         ON DUPLICATE KEY UPDATE status='OPEN'`,
        [s.department_id, s.id, today]
      );
    }
    console.log(`✓ Daily queues initialized for date: ${today}`);

    console.log('\n======================================================');
    console.log('CQMS DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Demo Credentials:');
    console.log('  Admin:         admin@cqms.edu     / admin123');
    console.log('  Library Staff: library@cqms.edu   / library123');
    console.log('  Fees Staff:    fees@cqms.edu      / fees123');
    console.log('  Student 1:     student@cqms.edu   / student123');
    console.log('  Student 2:     student2@cqms.edu  / student123');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runSeed();
