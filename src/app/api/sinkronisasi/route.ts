import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

const SIMASMUH_PG_URL =
  process.env.SIMASMUH_DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public';

async function getSimasmuhClient() {
  const client = new Client({ connectionString: SIMASMUH_PG_URL });
  await client.connect();
  return client;
}

// GET: Cek Status Sinkronisasi Real-Time antara SIMASMUH & CBT MUHIPO
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let isSimasmuhConnected = false;
    let simasmuhStats = {
      siswaCount: 0,
      kelasCount: 0,
      mapelCount: 0,
      guruCount: 0,
    };

    try {
      const client = await getSimasmuhClient();
      try {
        const [stRes, clRes, sbRes, tcRes] = await Promise.all([
          client.query('SELECT count(*) FROM "Student"'),
          client.query('SELECT count(*) FROM "Class"'),
          client.query('SELECT count(*) FROM "Subject"'),
          client.query('SELECT count(*) FROM "TeacherProfile"'),
        ]);

        simasmuhStats = {
          siswaCount: parseInt(stRes.rows[0].count, 10) || 0,
          kelasCount: parseInt(clRes.rows[0].count, 10) || 0,
          mapelCount: parseInt(sbRes.rows[0].count, 10) || 0,
          guruCount: parseInt(tcRes.rows[0].count, 10) || 0,
        };
        isSimasmuhConnected = true;
      } finally {
        await client.end();
      }
    } catch (e: any) {
      console.warn('SIMASMUH DB direct connection failed:', e.message);
    }

    // Ambil data lokal CBT MUHIPO
    const [
      cbtSiswaCount,
      cbtKelasCount,
      cbtMapelCount,
      cbtBankSoalCount,
      cbtSoalCount,
      cbtUjianCount,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'SISWA' } }),
      prisma.kelas.count(),
      prisma.mataPelajaran.count(),
      prisma.bankSoal.count(),
      prisma.soal.count(),
      prisma.ujian.count(),
    ]);

    // Daftar Bank Soal & Status Kesiapan Ujian
    const bankSoalKesiapan = await prisma.bankSoal.findMany({
      include: {
        mataPelajaran: true,
        pembuat: true,
        _count: { select: { soalList: true, ujianList: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        simasmuh: {
          connected: isSimasmuhConnected,
          port: 54322,
          ...simasmuhStats,
        },
        cbt: {
          port: 54332,
          siswaCount: cbtSiswaCount,
          kelasCount: cbtKelasCount,
          mapelCount: cbtMapelCount,
          bankSoalCount: cbtBankSoalCount,
          soalCount: cbtSoalCount,
          ujianCount: cbtUjianCount,
        },
        bankSoalKesiapan: bankSoalKesiapan.map((b) => ({
          id: b.id,
          kodeBank: b.kodeBank,
          nama: b.nama,
          tingkat: b.tingkat,
          mapelKode: b.mataPelajaran.kode,
          mapelNama: b.mataPelajaran.nama,
          jumlahSoal: b._count.soalList,
          isSiapUjian: b._count.soalList > 0,
          terjadwalCount: b._count.ujianList,
        })),
      },
    });
  } catch (error: any) {
    console.error('Sinkronisasi GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Jalankan Sinkronisasi Penuh (Siswa, NIS/NISN, Kelas, Mapel & Guru)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { target = 'ALL' } = body; // 'ALL' | 'SISWA' | 'KELAS_MAPEL'

    const client = await getSimasmuhClient();

    let stats = {
      kelasCount: 0,
      mapelCount: 0,
      siswaCount: 0,
      guruCount: 0,
    };

    try {
      // 1. SINKRONISASI KELAS (Class SIMASMUH -> Kelas CBT)
      if (target === 'ALL' || target === 'KELAS_MAPEL') {
        const classesRes = await client.query('SELECT id, name, "gradeLevel" FROM "Class"');
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
          stats.kelasCount++;
        }

        // 2. SINKRONISASI MATA PELAJARAN (Subject SIMASMUH -> MataPelajaran CBT)
        const subjectsRes = await client.query('SELECT id, name, code FROM "Subject"');
        for (const row of subjectsRes.rows) {
          await prisma.mataPelajaran.upsert({
            where: { kode: row.code },
            update: { nama: row.name },
            create: {
              kode: row.code,
              nama: row.name,
            },
          });
          stats.mapelCount++;
        }
      }

      // 3. SINKRONISASI SISWA (Student SIMASMUH -> User SISWA CBT)
      if (target === 'ALL' || target === 'SISWA') {
        const defaultPasswordHash = await bcrypt.hash('123456', 10);
        const studentsRes = await client.query(`
          SELECT s.id, s.nisn, s.nis, s.name, s.gender, c.name as class_name
          FROM "Student" s
          LEFT JOIN "Class" c ON s."classId" = c.id
        `);

        for (const s of studentsRes.rows) {
          // Cari ID Kelas Lokal CBT
          let cbtKelasId: string | null = null;
          if (s.class_name) {
            const k = await prisma.kelas.findUnique({ where: { nama: s.class_name } });
            if (k) cbtKelasId = k.id;
          }

          // Gunakan NIS sebagai username utama CBT
          const cleanNis = s.nis ? String(s.nis).trim() : '';
          const cleanNisn = s.nisn ? String(s.nisn).trim() : '';
          const username = cleanNis || cleanNisn || `siswa_${s.id.slice(0, 8)}`;
          const nomorPeserta = cleanNis || cleanNisn || username;

          await prisma.user.upsert({
            where: { username },
            update: {
              name: s.name,
              nis: cleanNis || undefined,
              nisn: cleanNisn || undefined,
              nomorPeserta,
              kelasId: cbtKelasId,
              jenisKelamin: s.gender === 'P' ? 'P' : 'L',
            },
            create: {
              username,
              password: defaultPasswordHash,
              name: s.name,
              role: 'SISWA',
              nis: cleanNis || username,
              nisn: cleanNisn || null,
              nomorPeserta,
              kelasId: cbtKelasId,
              jenisKelamin: s.gender === 'P' ? 'P' : 'L',
              ruangUjian: 'Lab Komputer 1',
              sesiUjian: 1,
            },
          });
          stats.siswaCount++;
        }
        // Hapus siswa CBT yang tidak terdaftar di SIMASMUH
        const validNisList = studentsRes.rows.map((r: any) => r.nis ? String(r.nis).trim() : '').filter(Boolean);
        if (validNisList.length > 0) {
          await prisma.user.deleteMany({
            where: {
              role: 'SISWA',
              username: { notIn: validNisList },
              nis: { notIn: validNisList },
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Sinkronisasi SIMASMUH Berhasil! (${stats.siswaCount} Siswa, ${stats.kelasCount} Rombel Kelas, ${stats.mapelCount} Mapel)`,
        stats,
      });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error('Sinkronisasi POST error:', error);
    return NextResponse.json({
      success: false,
      message: `Gagal sinkronisasi data SIMASMUH: ${error.message}. Pastikan container SIMASMUH (port 54322) aktif.`,
    }, { status: 500 });
  }
}
