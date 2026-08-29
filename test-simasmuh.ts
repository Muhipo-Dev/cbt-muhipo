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
    const rolesRes = await client.query('SELECT DISTINCT role FROM "User"');
    const usersRes = await client.query('SELECT id, username, role, name FROM "User"');
    console.log('SIMASMUH ROLES:', rolesRes.rows);
    console.log('SIMASMUH USERS:', usersRes.rows);
  } catch (err: any) {
    console.error('SIMASMUH CONNECTION FAILED:', err.message);
  } finally {
    await client.end();
  }

  const { prisma } = await import('./src/lib/prisma');
  await prisma.user.deleteMany({
    where: { username: { in: ['085156001102', 'siswa01', 'siswa02'] } },
  });
  const cbtUsers = await prisma.user.findMany({
    select: { id: true, username: true, role: true, name: true, nip: true, nis: true },
    orderBy: { role: 'asc' },
  });
  console.log('CBT LOCAL USERS COUNT:', cbtUsers.length);
  console.log('CBT LOCAL USERS:', cbtUsers);
}

testSimasmuh();
