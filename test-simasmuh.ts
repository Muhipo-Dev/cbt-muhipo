import { Client } from 'pg';

async function testSimasmuh() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public',
  });
  try {
    await client.connect();
    const studentsRes = await client.query('SELECT count(*) FROM "Student"');
    const classesRes = await client.query('SELECT count(*) FROM "Class"');
    const subjectsRes = await client.query('SELECT count(*) FROM "Subject"');
    const sampleStudents = await client.query(
      'SELECT id, nisn, nis, name, gender, "classId" FROM "Student" LIMIT 3'
    );
    console.log('SIMASMUH CONNECTED SUCCESSFULLY:');
    console.log({
      students: studentsRes.rows[0].count,
      classes: classesRes.rows[0].count,
      subjects: subjectsRes.rows[0].count,
      sampleStudents: sampleStudents.rows,
    });
  } catch (err: any) {
    console.error('SIMASMUH CONNECTION FAILED:', err.message);
  } finally {
    await client.end();
  }
}

testSimasmuh();
