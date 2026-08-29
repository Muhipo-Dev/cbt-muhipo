import { Client } from 'pg';
import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

const SIMASMUH_PG_URL =
  process.env.SIMASMUH_DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public';

async function syncNisPasswords() {
  console.log('🚀 Memulai Sinkronisasi Akun & Password Siswa (Username & Password = NIS)...');
  const client = new Client({ connectionString: SIMASMUH_PG_URL });

  try {
    await client.connect();
    console.log('✅ Terhubung ke PostgreSQL SIMASMUH (Port 54322)');

    // Ambil semua data siswa dari SIMASMUH
    const studentsRes = await client.query(`
      SELECT s.id, s.nis, s.nisn, s.name, s.gender, c.name as class_name, c."gradeLevel" as grade_level
      FROM "Student" s
      LEFT JOIN "Class" c ON s."classId" = c.id
    `);

    console.log(`Ditemukan ${studentsRes.rows.length} siswa di database SIMASMUH.`);

    let updatedCount = 0;

    for (const s of studentsRes.rows) {
      const nis = (s.nis || s.nisn || '').trim();
      if (!nis) continue;

      // Hash password sama dengan nomor NIS
      const nisPasswordHash = await bcrypt.hash(nis, 10);

      // Sinkronkan kelas di CBT
      let cbtKelasId: string | null = null;
      if (s.class_name) {
        const k = await prisma.kelas.upsert({
          where: { nama: s.class_name },
          update: {},
          create: {
            nama: s.class_name,
            tingkat: s.grade_level || 10,
            jurusan: s.class_name.toUpperCase().includes('IPS') ? 'IPS' : 'MIPA',
          },
        });
        cbtKelasId = k.id;
      }

      const cleanNomor = nis;

      // Cari user di CBT berdasarkan username, nisn, atau nomorPeserta
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ username: nis }, ...(s.nisn ? [{ nisn: s.nisn.trim() }] : []), { nomorPeserta: cleanNomor }],
        },
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            username: nis,
            password: nisPasswordHash, // PASSWORD SAMA DENGAN NOMOR NIS
            name: s.name,
            role: 'SISWA',
            nisn: s.nisn?.trim() || existingUser.nisn,
            nomorPeserta: cleanNomor,
            kelasId: cbtKelasId || existingUser.kelasId,
            jenisKelamin: s.gender === 'P' ? 'P' : 'L',
          },
        });
      } else {
        await prisma.user.create({
          data: {
            username: nis,
            password: nisPasswordHash, // PASSWORD SAMA DENGAN NOMOR NIS
            name: s.name,
            role: 'SISWA',
            nisn: s.nisn?.trim() || nis,
            nomorPeserta: cleanNomor,
            kelasId: cbtKelasId,
            jenisKelamin: s.gender === 'P' ? 'P' : 'L',
            ruangUjian: 'Lab Komputer 1',
            sesiUjian: 1,
          },
        });
      }
      updatedCount++;
      console.log(`  ✓ Siswa: ${s.name} -> Username: ${nis} | Password: ${nis}`);
    }

    console.log('\n=============================================================');
    console.log(`🎉 Berhasil menyetel ${updatedCount} Akun Siswa CBT!`);
    console.log('👉 Username siswa = Nomor NIS');
    console.log('👉 Password siswa = Nomor NIS');
    console.log('=============================================================');
  } catch (err: any) {
    console.error('❌ Terjadi kesalahan:', err.message);
  } finally {
    await client.end();
    await prisma.$disconnect();
  }
}

syncNisPasswords();
