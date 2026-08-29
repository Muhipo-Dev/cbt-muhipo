import { Client } from 'pg';
import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

const SIMASMUH_PG_URL =
  process.env.SIMASMUH_DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public';

async function syncAllData() {
  console.log('🚀 Memulai Sinkronisasi Penuh Data dari SIMASMUH ke CBT MUHIPO...');
  const client = new Client({ connectionString: SIMASMUH_PG_URL });

  try {
    await client.connect();
    console.log('✅ Terhubung ke Database PostgreSQL SIMASMUH (Port 54322)');

    // 1. SINKRONISASI PENGATURAN SISTEM
    console.log('\n[1/5] Menyinkronkan Pengaturan Sekolah & Akademik...');
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
      console.log(`  -> Pengaturan Berhasil Disinkronkan: ${s.schoolName} (${s.academicYear} ${s.semester})`);
    }

    // 2. SINKRONISASI ROMBONGAN BELAJAR
    console.log('\n[2/5] Menyinkronkan Rombel Kelas...');
    const classesRes = await client.query('SELECT id, name, "gradeLevel" FROM "Class"');
    let kelasCount = 0;
    for (const row of classesRes.rows) {
      const jurusan = row.name.toUpperCase().includes('IPS') ? 'IPS' : 'MIPA';
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
      kelasCount++;
    }
    console.log(`  -> Berhasil Menyinkronkan ${kelasCount} Rombel Kelas.`);

    // 3. SINKRONISASI MATA PELAJARAN (Jika ada di SIMASMUH, jika kosong siapkan mapel standar)
    console.log('\n[3/5] Menyinkronkan Mata Pelajaran...');
    const subjectsRes = await client.query('SELECT id, name, code FROM "Subject"');
    let mapelCount = 0;
    for (const row of subjectsRes.rows) {
      await prisma.mataPelajaran.upsert({
        where: { kode: row.code },
        update: { nama: row.name },
        create: {
          kode: row.code,
          nama: row.name,
        },
      });
      mapelCount++;
    }
    if (mapelCount === 0) {
      // Pastikan ada Mapel Kurikulum Standar
      const defaultMapels = [
        { kode: 'MTK-W', nama: 'Matematika Wajib' },
        { kode: 'MTK-P', nama: 'Matematika Peminatan (MIPA)' },
        { kode: 'FIS-12', nama: 'Fisika' },
        { kode: 'KIM-12', nama: 'Kimia' },
        { kode: 'BIO-12', nama: 'Biologi' },
        { kode: 'EKO-12', nama: 'Ekonomi' },
        { kode: 'GEO-12', nama: 'Geografi' },
        { kode: 'SOS-12', nama: 'Sosiologi' },
        { kode: 'PAI-12', nama: 'Pendidikan Agama Islam & Kemuhammadiyahan' },
        { kode: 'BIN-12', nama: 'Bahasa Indonesia' },
        { kode: 'BIG-12', nama: 'Bahasa Inggris' },
      ];
      for (const m of defaultMapels) {
        await prisma.mataPelajaran.upsert({
          where: { kode: m.kode },
          update: { nama: m.nama },
          create: m,
        });
        mapelCount++;
      }
    }
    console.log(`  -> Berhasil Menyinkronkan ${mapelCount} Mata Pelajaran.`);

    // 4. SINKRONISASI GURU PENGAMPU
    console.log('\n[4/5] Menyinkronkan Guru Pengampu...');
    const teachersRes = await client.query(`
      SELECT tp.id, tp.nip, u.name, u.username, u.password
      FROM "TeacherProfile" tp
      JOIN "User" u ON tp."userId" = u.id
    `);
    let guruCount = 0;
    for (const t of teachersRes.rows) {
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username: t.username }, ...(t.nip ? [{ nip: t.nip }] : [])] },
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: t.name,
            nip: t.nip || existingUser.nip,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            username: t.username,
            password: t.password || (await bcrypt.hash('123456', 10)),
            name: t.name,
            role: 'GURU',
            nip: t.nip || undefined,
          },
        });
      }
      guruCount++;
    }
    console.log(`  -> Berhasil Menyinkronkan ${guruCount} Guru Pengampu.`);

    // 5. SINKRONISASI DATA SISWA
    console.log('\n[5/5] Menyinkronkan Data Siswa Peserta CBT...');
    const defaultPasswordHash = await bcrypt.hash('123456', 10);
    const studentsRes = await client.query(`
      SELECT s.id, s.nisn, s.nis, s.name, s.gender, c.name as class_name
      FROM "Student" s
      LEFT JOIN "Class" c ON s."classId" = c.id
    `);

    let siswaCount = 0;
    for (const s of studentsRes.rows) {
      let cbtKelasId: string | null = null;
      if (s.class_name) {
        const k = await prisma.kelas.findUnique({ where: { nama: s.class_name } });
        if (k) cbtKelasId = k.id;
      }

      const cleanNisn = s.nisn?.trim() || null;
      const cleanNis = s.nis?.trim() || null;
      const username = cleanNis || cleanNisn || `siswa_${s.id.slice(0, 8)}`;
      const nomorPeserta = cleanNis || cleanNisn || username;

      // Cari apakah user dengan username, nis, nisn, atau nomorPeserta sudah ada
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            ...(cleanNis ? [{ nis: cleanNis }] : []),
            ...(cleanNisn ? [{ nisn: cleanNisn }] : []),
            { nomorPeserta },
          ],
        },
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: s.name,
            nis: cleanNis || existingUser.nis,
            nisn: cleanNisn || existingUser.nisn,
            nomorPeserta,
            kelasId: cbtKelasId || existingUser.kelasId,
            jenisKelamin: s.gender === 'P' ? 'P' : 'L',
          },
        });
      } else {
        await prisma.user.create({
          data: {
            username,
            password: defaultPasswordHash,
            name: s.name,
            role: 'SISWA',
            nis: cleanNis || username,
            nisn: cleanNisn,
            nomorPeserta,
            kelasId: cbtKelasId,
            jenisKelamin: s.gender === 'P' ? 'P' : 'L',
            ruangUjian: 'Lab Komputer 1',
            sesiUjian: 1,
          },
        });
      }
      siswaCount++;
    }
    console.log(`  -> Berhasil Menyinkronkan ${siswaCount} Siswa Peserta CBT.`);

    // 6. Hubungkan Bank Soal Matematika ke Jadwal Ujian Aktif
    console.log('\n[6/6] Menyiapkan Jadwal Ujian untuk Siswa yang telah Tersinkron...');
    const mtkBank = await prisma.bankSoal.findFirst({
      include: { mataPelajaran: true, soalList: true },
    });

    if (mtkBank && mtkBank.soalList.length > 0) {
      const activeUjian = await prisma.ujian.findFirst({
        where: { bankSoalId: mtkBank.id },
      });

      if (activeUjian) {
        const allSiswa = await prisma.user.findMany({ where: { role: 'SISWA' } });
        for (const sw of allSiswa) {
          await prisma.pesertaUjian.upsert({
            where: {
              ujianId_siswaId: {
                ujianId: activeUjian.id,
                siswaId: sw.id,
              },
            },
            update: {},
            create: {
              ujianId: activeUjian.id,
              siswaId: sw.id,
              status: 'BELUM_MULAI',
              sisaDetik: activeUjian.durasiMenit * 60,
            },
          });
        }
        console.log(`  -> ${allSiswa.length} Siswa Terdaftar Otomatis ke Ujian "${activeUjian.judul}".`);
      }
    }

    console.log('\n=============================================================');
    console.log('🎉 SINKRONISASI PENUH CBT MUHIPO DARI SIMASMUH SELESAI 100%!');
    console.log(`- ${siswaCount} Siswa Peserta Ujian`);
    console.log(`- ${kelasCount} Rombel Kelas`);
    console.log(`- ${mapelCount} Mata Pelajaran`);
    console.log(`- ${guruCount} Guru Pengampu`);
    console.log('=============================================================');
  } catch (err: any) {
    console.error('❌ Gagal sinkronisasi data:', err.message);
  } finally {
    await client.end();
    await prisma.$disconnect();
  }
}

syncAllData();
