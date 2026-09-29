const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = 3306,
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'cqms_db'
} = process.env;

async function updateStudentData() {
  console.log('--- Updating CQMS Student Dataset (BCREC Format & 5th Semester / 3rd Year) ---');

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  });

  try {
    // 1. Modify students.course column if necessary to allow NULL
    console.log('Adjusting students table schema if needed...');
    await connection.query(
      `ALTER TABLE students MODIFY COLUMN course VARCHAR(100) NULL DEFAULT NULL`
    );
    await connection.query(
      `ALTER TABLE students MODIFY COLUMN semester VARCHAR(20) NOT NULL DEFAULT '5th Semester'`
    );

    // 2. Fetch existing students by user_id/name to preserve their primary keys and tokens
    console.log('Fetching existing student records...');
    const [existingUsers] = await connection.query(
      `SELECT u.id AS user_id, u.college_id, u.name, u.email, u.password_hash, s.id AS student_id, s.course, s.semester, s.year
       FROM users u
       LEFT JOIN students s ON u.id = s.user_id
       WHERE u.role = 'STUDENT'`
    );

    console.log(`Found ${existingUsers.length} existing student users.`);

    // 3. Update existing 3 students by their primary keys
    // Soumyadip Kar
    const soumya = existingUsers.find(u => u.name.toLowerCase().includes('soumyadip') || u.college_id.includes('001'));
    if (soumya) {
      console.log(`Updating Soumyadip Kar (user_id: ${soumya.user_id}, student_id: ${soumya.student_id})...`);
      await connection.query(
        `UPDATE users SET college_id = 'BCREC-2024-001' WHERE id = ?`,
        [soumya.user_id]
      );
      await connection.query(
        `UPDATE students
         SET course = 'B.Tech Computer Science & Engineering',
             semester = '5th Semester',
             year = 3
         WHERE id = ?`,
        [soumya.student_id]
      );
      console.log('✓ Soumyadip Kar updated to BCREC-2024-001, 3rd Year / 5th Semester.');
    }

    // Ananya Sen
    const ananya = existingUsers.find(u => u.name.toLowerCase().includes('ananya') || u.college_id.includes('002'));
    if (ananya) {
      console.log(`Updating Ananya Sen (user_id: ${ananya.user_id}, student_id: ${ananya.student_id})...`);
      await connection.query(
        `UPDATE users SET college_id = 'BCREC-2024-002' WHERE id = ?`,
        [ananya.user_id]
      );
      await connection.query(
        `UPDATE students
         SET course = 'B.Tech Information Technology',
             semester = '5th Semester',
             year = 3
         WHERE id = ?`,
        [ananya.student_id]
      );
      console.log('✓ Ananya Sen updated to BCREC-2024-002, 3rd Year / 5th Semester.');
    }

    // Rohan Mukherjee
    const rohan = existingUsers.find(u => u.name.toLowerCase().includes('rohan') || u.college_id.includes('003'));
    if (rohan) {
      console.log(`Updating Rohan Mukherjee (user_id: ${rohan.user_id}, student_id: ${rohan.student_id})...`);
      await connection.query(
        `UPDATE users SET college_id = 'BCREC-2024-003' WHERE id = ?`,
        [rohan.user_id]
      );
      await connection.query(
        `UPDATE students
         SET course = 'B.Tech Electronics & Communication',
             semester = '5th Semester',
             year = 3
         WHERE id = ?`,
        [rohan.student_id]
      );
      console.log('✓ Rohan Mukherjee updated to BCREC-2024-003, 3rd Year / 5th Semester.');
    }

    // 4. Add or update the 4 students
    const newStudents = [
      {
        collegeId: 'BCREC-2024-004',
        name: 'Souptik Das',
        email: null,
        course: 'B.Tech Computer Science & Engineering',
        semester: '5th Semester',
        year: 3
      },
      {
        collegeId: 'BCREC-2024-005',
        name: 'Subhajeet Gorai',
        email: null,
        course: 'B.Tech Computer Science & Engineering',
        semester: '5th Semester',
        year: 3
      },
      {
        collegeId: 'BCREC-2024-006',
        name: 'Shankar Gorain',
        email: null,
        course: 'B.Tech Computer Science & Engineering',
        semester: '5th Semester',
        year: 3
      },
      {
        collegeId: 'BCREC-2024-007',
        name: 'Srijan Mondal',
        email: null,
        course: 'B.Tech Computer Science & Engineering',
        semester: '5th Semester',
        year: 3
      }
    ];

    // Use default demo password hash
    const defaultPasswordHash = soumya?.password_hash || (await bcrypt.hash('student123', 10));

    for (const ns of newStudents) {
      // Check if student already exists by college_id or name
      const [existing] = await connection.query(
        `SELECT id FROM users WHERE college_id = ? OR (name = ? AND role = 'STUDENT')`,
        [ns.collegeId, ns.name]
      );

      if (existing.length === 0) {
        console.log(`Inserting new student: ${ns.name} (${ns.collegeId})...`);
        const [userResult] = await connection.query(
          `INSERT INTO users (college_id, name, email, password_hash, role)
           VALUES (?, ?, ?, ?, 'STUDENT')`,
          [ns.collegeId, ns.name, ns.email, defaultPasswordHash]
        );

        await connection.query(
          `INSERT INTO students (user_id, course, semester, year)
           VALUES (?, ?, ?, ?)`,
          [userResult.insertId, ns.course, ns.semester, ns.year]
        );
        console.log(`✓ Added ${ns.name} (${ns.collegeId}).`);
      } else {
        console.log(`Student ${ns.name} (${ns.collegeId}) already exists (user_id: ${existing[0].id}). Updating details...`);
        await connection.query(
          `UPDATE users SET college_id = ?, name = ?, email = ? WHERE id = ?`,
          [ns.collegeId, ns.name, ns.email, existing[0].id]
        );
        await connection.query(
          `UPDATE students SET semester = '5th Semester', year = 3, course = ? WHERE user_id = ?`,
          [ns.course, existing[0].id]
        );
      }
    }

    // 5. Verify the full student dataset
    const [finalStudents] = await connection.query(
      `SELECT u.id AS user_id, u.college_id, u.name, u.email, s.id AS student_id, s.course, s.semester, s.year,
              COUNT(t.id) AS token_count
       FROM users u
       JOIN students s ON u.id = s.user_id
       LEFT JOIN tokens t ON s.id = t.student_id
       WHERE u.role = 'STUDENT'
       GROUP BY s.id
       ORDER BY u.college_id ASC`
    );

    console.log('\n======================================================');
    console.log(`VERIFICATION: ${finalStudents.length} REGISTERED STUDENTS FOUND`);
    console.log('======================================================');
    finalStudents.forEach((s, idx) => {
      console.log(
        `${idx + 1}. [${s.college_id}] ${s.name} | Course: ${s.course || 'Pending / Not Specified'} | Year: ${s.year}rd Year | Sem: ${s.semester} | Tokens: ${s.token_count}`
      );
    });
    console.log('======================================================\n');
  } catch (err) {
    console.error('Error updating student data:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

updateStudentData();
