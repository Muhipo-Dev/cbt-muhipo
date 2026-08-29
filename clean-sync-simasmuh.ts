import { Client } from 'pg';
import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

const SIMASMUH_PG_URL =
  process.env.SIMASMUH_DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public';

async function syncAndPrune() {
  console.log('🚀 Memulai Sinkronisasi Ketat (100% Persis SIMASMUH & Pembersihan Data Dummy)...');
  const client = new Client({ connectionString: SIMASMUH_PG_URL });

  try {
    await client.connect();
    console.log('✅ Terhubung ke Database PostgreSQL SIMASMUH (Port 54322)');

    // 1. SINKRONISASI PENGATURAN SEKOLAH
    const settingsRes = await client.query('SELECT * FROM "Setting" LIMIT 1');
    if (settingsRes.rows.length > 0) {
      const s = settingsRes.rows[0];
      await (prisma as any).pengaturanSistem.upsert({
        where: { id: 'default-settings' },
        update: {
          schoolName: s.schoolName || 'SMA Muhammadiyah 1 Ponorogo',
          academicYear: s.academicYear || '2026/2027',
          semester: s.semester || 'Ganjil',
          timezone: s.timezone || 'Asia/Jakarta',
          serverLocation: s.serverLocation || 'Ponorogo, Jawa Timur',
          logoUrl: s.logoUrl || '/pic_logo.png',
          backgroundUrl: s.backgroundUrl || '/muhipo-front.jpg',
        },
        create: {
          id: 'default-settings',
          schoolName: s.schoolName || 'SMA Muhammadiyah 1 Ponorogo',
          appTitle: 'CBT MUHIPO',
          academicYear: s.academicYear || '2026/2027',
          semester: s.semester || 'Ganjil',
          timezone: s.timezone || 'Asia/Jakarta',
          serverLocation: s.serverLocation || 'Ponorogo, Jawa Timur',
          logoUrl: s.logoUrl || '/pic_logo.png',
          backgroundUrl: s.backgroundUrl || '/muhipo-front.jpg',
        },
      });
    }

    // 2. SINKRONISASI & PEMBERSIHAN KELAS
    console.log('\n[1/4] Sinkronisasi Rombel Kelas SIMASMUH...');
    const classesRes = await client.query(`
      SELECT c.id, c.name, c."gradeLevel", 
        (SELECT s.program FROM "Student" s WHERE s."classId" = c.id AND s.program IS NOT NULL LIMIT 1) as "sampleProgram"
      FROM "Class" c
    `);
    const validClassNames: string[] = [];

    const { normalizeJurusan } = await import('./src/lib/constants');

    for (const row of classesRes.rows) {
      validClassNames.push(row.name);
      const rawProgram = row.sampleProgram || row.name;
      const jurusan = normalizeJurusan(rawProgram);
      await prisma.kelas.upsert({
        where: { nama: row.name },
        update: {
          tingkat: row.gradeLevel || 10,
          jurusan,
        },
        create: {
          nama: row.name,
          tingkat: row.gradeLevel || 10,
          jurusan,
        },
      });
    }

    // Hapus kelas dummy di CBT yang tidak ada di SIMASMUH
    const deletedClasses = await prisma.kelas.deleteMany({
      where: {
        nama: { notIn: validClassNames },
      },
    });
    console.log(`  ✓ Tersinkron: ${validClassNames.length} Kelas | Dihapus (Dummy): ${deletedClasses.count} Kelas`);

    // 3. SINKRONISASI ADMIN & GURU DENGAN ROLE SIMASMUH
    console.log('\n[2/4] Sinkronisasi Akun Admin & Guru dari SIMASMUH...');
    const usersRes = await client.query(`
      SELECT u.id, u.username, u.password as password_hash, u.name, u.role, tp.nip
      FROM "User" u
      LEFT JOIN "TeacherProfile" tp ON tp."userId" = u.id
      WHERE u.role != 'SISWA'
    `);

    const validAdminUsernames: string[] = ['admin', 'proktor1']; // Akun sistem bawaan
    const validGuruUsernames: string[] = [];

    for (const u of usersRes.rows) {
      const roleStr = String(u.role || '').toUpperCase();
      if (roleStr === 'WALI_MURID' || roleStr.includes('WALI')) continue;

      let targetRole: 'ADMIN' | 'GURU' | 'PROKTOR' = 'ADMIN';

      if (roleStr === 'GURU' || roleStr.includes('GURU') || roleStr === 'TEACHER') {
        targetRole = 'GURU';
        validGuruUsernames.push(u.username);
      } else {
        // SUPERADMIN, ADMIN_IT, ADMIN_TU, PEGAWAI (TU), KEPALA_SEKOLAH, dsb.
        targetRole = 'ADMIN';
        validAdminUsernames.push(u.username);
      }

      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username: u.username }, ...(u.nip ? [{ nip: u.nip }] : [])] },
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            username: u.username,
            name: u.name,
            password: u.password_hash || existingUser.password,
            role: targetRole,
            nip: u.nip || existingUser.nip,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            username: u.username,
            password: u.password_hash || (await bcrypt.hash('123456', 10)),
            name: u.name,
            role: targetRole,
            nip: u.nip || undefined,
          },
        });
      }
    }

    console.log(`  ✓ Tersinkron Admin CBT: ${validAdminUsernames.length} Akun (Superadmin, Admin IT, Admin TU, Pegawai, Kepsek)`);
    console.log(`  ✓ Tersinkron Guru CBT: ${validGuruUsernames.length} Guru`);

    // Ambil salah satu guru resmi untuk reassign BankSoal jika ada
    const firstOfficialGuru = await prisma.user.findFirst({
      where: { role: 'GURU', username: { in: validGuruUsernames } },
    });

    if (firstOfficialGuru) {
      await prisma.bankSoal.updateMany({
        where: {
          pembuatId: {
            notIn: (
              await prisma.user.findMany({
                where: { role: 'GURU', username: { in: validGuruUsernames } },
                select: { id: true },
              })
            ).map((g) => g.id),
          },
        },
        data: { pembuatId: firstOfficialGuru.id },
      });
    }

    // Bersihkan user guru yang tidak valid
    const deletedGurus = await prisma.user.deleteMany({
      where: {
        role: 'GURU',
        username: { notIn: validGuruUsernames },
      },
    });
    if (deletedGurus.count > 0) {
      console.log(`  ✓ Guru Dummy Dihapus: ${deletedGurus.count}`);
    }

    // 4. SINKRONISASI & PEMBERSIHAN DATA SISWA (SEPENUHNYA BERBASIS NIS)
    console.log('\n[3/4] Sinkronisasi Siswa SIMASMUH (Username & Password = NIS)...');
    const studentsRes = await client.query(`
      SELECT s.id, s.nisn, s.nis, s.name, s.gender, c.name as class_name
      FROM "Student" s
      LEFT JOIN "Class" c ON s."classId" = c.id
    `);

    const validStudentNisList: string[] = [];

    for (const s of studentsRes.rows) {
      const nis = s.nis ? String(s.nis).trim() : '';
      if (!nis) continue;

      validStudentNisList.push(nis);
      const nisPasswordHash = await bcrypt.hash(nis, 10);

      let cbtKelasId: string | null = null;
      if (s.class_name) {
        const k = await prisma.kelas.findUnique({ where: { nama: s.class_name } });
        if (k) cbtKelasId = k.id;
      }

      const existingStudent = await prisma.user.findFirst({
        where: {
          OR: [{ username: nis }, { nis }, { nomorPeserta: nis }],
        },
      });

      if (existingStudent) {
        await prisma.user.update({
          where: { id: existingStudent.id },
          data: {
            username: nis,
            password: nisPasswordHash,
            name: s.name,
            role: 'SISWA',
            nis,
            nisn: s.nisn?.trim() || existingStudent.nisn,
            nomorPeserta: nis,
            kelasId: cbtKelasId || existingStudent.kelasId,
            jenisKelamin: s.gender === 'P' ? 'P' : 'L',
          },
        });
      } else {
        await prisma.user.create({
          data: {
            username: nis,
            password: nisPasswordHash,
            name: s.name,
            role: 'SISWA',
            nis,
            nisn: s.nisn?.trim() || null,
            nomorPeserta: nis,
            kelasId: cbtKelasId,
            jenisKelamin: s.gender === 'P' ? 'P' : 'L',
            ruangUjian: 'Lab Komputer 1',
            sesiUjian: 1,
          },
        });
      }
    }

    // Hapus seluruh siswa dummy di CBT yang NIS-nya tidak terdaftar di SIMASMUH
    const deletedStudents = await prisma.user.deleteMany({
      where: {
        role: 'SISWA',
        username: { notIn: validStudentNisList },
        nis: { notIn: validStudentNisList },
      },
    });
    console.log(`  ✓ Tersinkron: ${validStudentNisList.length} Siswa | Dihapus (Dummy): ${deletedStudents.count} Siswa`);

    // 5. PENDAFTARAN OTOMATIS KE JADWAL UJIAN AKTIF
    console.log('\n[4/4] Sinkronisasi Peserta Ujian ke Siswa Resmi...');
    const activeUjianList = await prisma.ujian.findMany();
    const allOfficialStudents = await prisma.user.findMany({ where: { role: 'SISWA' } });

    // Hapus relasi ujian untuk user dummy yang mungkin tersisa
    await prisma.pesertaUjian.deleteMany({
      where: {
        siswaId: { notIn: allOfficialStudents.map((s) => s.id) },
      },
    });

    for (const ujian of activeUjianList) {
      for (const sw of allOfficialStudents) {
        await prisma.pesertaUjian.upsert({
          where: {
            ujianId_siswaId: {
              ujianId: ujian.id,
              siswaId: sw.id,
            },
          },
          update: {},
          create: {
            ujianId: ujian.id,
            siswaId: sw.id,
            status: 'BELUM_MULAI',
            sisaDetik: ujian.durasiMenit * 60,
          },
        });
      }
    }

    console.log('\n=============================================================');
    console.log('🎉 SINKRONISASI KETAT BERHASIL SELESAI!');
    console.log(`✅ ${validStudentNisList.length} Siswa Resmi SIMASMUH (NIS = Username = Password)`);
    console.log(`✅ ${validClassNames.length} Rombel Kelas Resmi`);
    console.log(`✅ ${validAdminUsernames.length} Akun Admin Resmi (Superadmin, Admin IT, Admin TU, Pegawai, Kepsek)`);
    console.log(`✅ ${validGuruUsernames.length} Guru Pengampu Resmi`);
    console.log('✅ Semua Data Dummy (siswa01, siswa02, kelas palsu, dsb) Telah Dibersihkan!');
    console.log('=============================================================');
  } catch (err: any) {
    console.error('❌ Gagal sinkronisasi data:', err.message);
  } finally {
    await client.end();
  }
}

syncAndPrune();
