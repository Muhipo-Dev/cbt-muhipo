import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Client } from 'pg';

const SIMASMUH_PG_URL =
  process.env.SIMASMUH_DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public';

async function getSimasmuhClient() {
  const client = new Client({ connectionString: SIMASMUH_PG_URL });
  await client.connect();
  return client;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'dashboard';

    if (tab === 'dashboard') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const [
        countSiswa,
        countGuru,
        countKelas,
        countBankSoal,
        countUjianTotal,
        countUjianHariIni,
        countPesertaMengerjakan,
        countPesertaSelesai,
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'SISWA' } }),
        prisma.user.count({
          where: {
            OR: [
              { role: 'GURU' },
              { mataPelajaran: { some: {} } },
            ],
          },
        }),
        prisma.kelas.count(),
        prisma.bankSoal.count(),
        prisma.ujian.count(),
        prisma.ujian.count({
          where: {
            waktuMulai: { lte: endOfToday },
            waktuSelesai: { gte: startOfToday },
          },
        }),
        // Live Peserta Sedang Mengerjakan Hari Ini
        prisma.pesertaUjian.count({
          where: {
            status: 'SEDANG_MENGERJAKAN',
            ujian: {
              waktuMulai: { lte: endOfToday },
              waktuSelesai: { gte: startOfToday },
            },
          },
        }),
        // Live Peserta Selesai Hari Ini
        prisma.pesertaUjian.count({
          where: {
            status: 'SELESAI',
            OR: [
              { waktuSelesai: { gte: startOfToday, lte: endOfToday } },
              {
                ujian: {
                  waktuMulai: { lte: endOfToday },
                  waktuSelesai: { gte: startOfToday },
                },
              },
            ],
          },
        }),
      ]);

      const rawRecentUjian = await prisma.ujian.findMany({
        take: 10,
        orderBy: [{ waktuMulai: 'desc' }, { createdAt: 'desc' }],
        include: {
          bankSoal: { include: { mataPelajaran: true } },
          _count: { select: { pesertaUjian: true } },
        },
      });

      const recentUjian = rawRecentUjian.map((u) => {
        const wMulai = u.waktuMulai ? new Date(u.waktuMulai) : null;
        const wSelesai = u.waktuSelesai ? new Date(u.waktuSelesai) : null;
        const isArchived = u.status === 'NONAKTIF';
        const isMulaiHariIni = wMulai ? wMulai >= startOfToday && wMulai <= endOfToday : false;
        const isToday = isMulaiHariIni && !isArchived;
        const isPast = (wMulai ? wMulai < startOfToday : false) || (wSelesai ? wSelesai < startOfToday : false) || isArchived;
        return {
          ...u,
          isToday,
          isPast,
          isArchived,
        };
      });

      const recentLogs = await prisma.logAktivitasUjian.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });

      return NextResponse.json({
        success: true,
        data: {
          counts: {
            countSiswa,
            countGuru,
            countKelas,
            countBankSoal,
            countUjian: countUjianHariIni > 0 ? countUjianHariIni : countUjianTotal,
            countUjianTotal,
            countUjianHariIni,
            countPesertaMengerjakan,
            countPesertaSelesai,
          },
          recentUjian,
          recentLogs,
          serverDate: now.toISOString(),
        },
      });
    }

    if (tab === 'siswa') {
      try {
        const client = await getSimasmuhClient();
        try {
          const studentsRes = await client.query(`
            SELECT 
              s.id, 
              s.nisn, 
              s.nis, 
              s.name, 
              s.gender, 
              c.name as class_name, 
              c.id as class_id,
              c."gradeLevel" as tingkat,
              COALESCE(u.username, s.nis) as username,
              u.role
            FROM "Student" s
            LEFT JOIN "Class" c ON s."classId" = c.id
            LEFT JOIN "User" u ON s."userId" = u.id OR s.nis = u.username
            ORDER BY s.name ASC
          `);
          const classesRes = await client.query(`
            SELECT id, name as nama, "gradeLevel" as tingkat FROM "Class" ORDER BY name ASC
          `);

          const siswaList = studentsRes.rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            username: row.username || row.nis,
            nis: row.nis,
            nisn: row.nisn,
            nomorPeserta: row.nis,
            jenisKelamin: row.gender === 'P' ? 'P' : 'L',
            role: 'SISWA',
            kelasId: row.class_id,
            kelas: row.class_name ? { id: row.class_id, nama: row.class_name, tingkat: row.tingkat } : null,
            ruangUjian: 'Lab Komputer 1',
            sesiUjian: 1,
          }));

          return NextResponse.json({
            success: true,
            data: {
              siswaList,
              kelasList: classesRes.rows,
            },
          });
        } finally {
          await client.end();
        }
      } catch (err) {
        // Fallback: ambil dari database CBT lokal jika SIMASMUH offline
        const siswaList = await prisma.user.findMany({
          where: { role: 'SISWA' },
          include: { kelas: true },
          orderBy: { name: 'asc' },
        });
        const kelasList = await prisma.kelas.findMany({ orderBy: { nama: 'asc' } });
        return NextResponse.json({ success: true, data: { siswaList, kelasList } });
      }
    }

    if (tab === 'guru') {
      try {
        const client = await getSimasmuhClient();
        try {
          const teachersRes = await client.query(`
            SELECT 
              u.id, 
              u.username, 
              u.name, 
              u.role,
              COALESCE(NULLIF(TRIM(tp.nip), ''), NULLIF(TRIM(u."nipNbm"), '')) as nip
            FROM "User" u
            LEFT JOIN "TeacherProfile" tp ON tp."userId" = u.id
            WHERE u.role = 'GURU' 
               OR u."subRole" = 'GURU'
               OR EXISTS (SELECT 1 FROM "TeacherSubject" ts WHERE ts."teacherId" = tp.id)
            ORDER BY u.name ASC
          `);
          const mapelsRes = await client.query(`
            SELECT id, name as nama, code as kode FROM "Subject" ORDER BY name ASC
          `);

          const guruList = teachersRes.rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            username: row.username,
            nip: row.nip,
            role: 'GURU',
            mataPelajaran: [],
          }));

          return NextResponse.json({
            success: true,
            data: {
              guruList,
              mapelList: mapelsRes.rows,
            },
          });
        } finally {
          await client.end();
        }
      } catch (err) {
        const guruList = await prisma.user.findMany({
          where: {
            OR: [
              { role: 'GURU' },
              { mataPelajaran: { some: {} } },
            ],
          },
          include: { mataPelajaran: { include: { mataPelajaran: true } } },
          orderBy: { name: 'asc' },
        });
        const mapelList = await prisma.mataPelajaran.findMany({ orderBy: { nama: 'asc' } });
        return NextResponse.json({ success: true, data: { guruList, mapelList } });
      }
    }

    if (tab === 'kelas') {
      try {
        const client = await getSimasmuhClient();
        try {
          const classesRes = await client.query(`
            SELECT 
              c.id, 
              c.name as nama, 
              c."gradeLevel" as tingkat,
              COALESCE((SELECT count(*) FROM "Student" s WHERE s."classId" = c.id), 0)::int as student_count
            FROM "Class" c 
            ORDER BY c.name ASC
          `);
          const kelasList = classesRes.rows.map((row: any) => ({
            id: row.id,
            nama: row.nama,
            tingkat: row.tingkat,
            jurusan: 'Reguler',
            _count: { users: row.student_count },
          }));
          return NextResponse.json({ success: true, data: kelasList });
        } finally {
          await client.end();
        }
      } catch (err) {
        const kelasList = await prisma.kelas.findMany({
          include: { _count: { select: { users: true } } },
          orderBy: { nama: 'asc' },
        });
        return NextResponse.json({ success: true, data: kelasList });
      }
    }

    if (tab === 'mapel') {
      try {
        const client = await getSimasmuhClient();
        try {
          const subjectsRes = await client.query(`
            SELECT id, name as nama, code as kode FROM "Subject" ORDER BY name ASC
          `);
          const mapelList = subjectsRes.rows.map((row: any) => ({
            id: row.id,
            kode: row.kode,
            nama: row.nama,
            _count: { bankSoalList: 0 },
          }));
          return NextResponse.json({ success: true, data: mapelList });
        } finally {
          await client.end();
        }
      } catch (err) {
        const mapelList = await prisma.mataPelajaran.findMany({
          include: { _count: { select: { bankSoalList: true } } },
          orderBy: { nama: 'asc' },
        });
        return NextResponse.json({ success: true, data: mapelList });
      }
    }

    if (tab === 'jadwal') {
      const jadwalList = await prisma.ujian.findMany({
        include: {
          bankSoal: {
            include: {
              mataPelajaran: {
                include: {
                  gurus: {
                    include: { guru: { select: { id: true, name: true } } },
                  },
                },
              },
              pembuat: { select: { id: true, name: true, role: true } },
            },
          },
          _count: { select: { pesertaUjian: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      const bankSoalList = await prisma.bankSoal.findMany({
        include: {
          mataPelajaran: {
            include: {
              gurus: {
                include: { guru: { select: { id: true, name: true } } },
              },
            },
          },
          pembuat: { select: { id: true, name: true, role: true } },
        },
      });
      const kelasList = await prisma.kelas.findMany({ orderBy: { nama: 'asc' } });
      return NextResponse.json({ success: true, data: { jadwalList, bankSoalList, kelasList } });
    }

    return NextResponse.json({ success: false, message: 'Tab invalid' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'CREATE_SISWA') {
      const {
        username,
        password,
        name,
        nis,
        nisn,
        nomorPeserta,
        kelasId,
        ruangUjian,
        sesiUjian,
        jenisKelamin,
      } = body;
      const cleanNis = nis || username;
      const hashedPassword = await bcrypt.hash(password || '123456', 10);
      const newSiswa = await prisma.user.create({
        data: {
          username: cleanNis,
          password: hashedPassword,
          name,
          role: 'SISWA',
          nis: cleanNis,
          nisn: nisn || null,
          nomorPeserta: nomorPeserta || cleanNis,
          kelasId: kelasId || null,
          ruangUjian: ruangUjian || 'Lab 1',
          sesiUjian: Number(sesiUjian) || 1,
          jenisKelamin: jenisKelamin || 'L',
        },
      });
      return NextResponse.json({ success: true, message: 'Siswa berhasil ditambahkan', data: newSiswa });
    }

    if (action === 'CREATE_GURU') {
      const { username, password, name, nip, mataPelajaranId } = body;
      const hashedPassword = await bcrypt.hash(password || '123456', 10);
      const newGuru = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
          role: 'GURU',
          nip,
          mataPelajaran: mataPelajaranId
            ? {
                create: { mataPelajaranId },
              }
            : undefined,
        },
      });
      return NextResponse.json({ success: true, message: 'Guru berhasil ditambahkan', data: newGuru });
    }

    if (action === 'CREATE_KELAS') {
      const { nama, tingkat, jurusan } = body;
      const newKelas = await prisma.kelas.create({
        data: {
          nama,
          tingkat: Number(tingkat),
          jurusan,
        },
      });
      return NextResponse.json({ success: true, message: 'Kelas berhasil dibuat', data: newKelas });
    }

    if (action === 'CREATE_MAPEL') {
      const { kode, nama } = body;
      const newMapel = await prisma.mataPelajaran.create({
        data: {
          kode,
          nama,
        },
      });
      return NextResponse.json({ success: true, message: 'Mapel berhasil dibuat', data: newMapel });
    }

    if (action === 'CREATE_UJIAN') {
      const {
        kodeUjian,
        judul,
        bankSoalId,
        durasiMenit,
        waktuMulai,
        waktuSelesai,
        lockBrowser,
        acakSoal,
        acakOpsi,
        kelasIds,
      } = body;

      const newUjian = await prisma.ujian.create({
        data: {
          kodeUjian,
          judul,
          bankSoalId,
          durasiMenit: Number(durasiMenit),
          waktuMulai: waktuMulai ? new Date(waktuMulai) : new Date(),
          waktuSelesai: waktuSelesai
            ? new Date(waktuSelesai)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lockBrowser: lockBrowser !== false,
          acakSoal: acakSoal !== false,
          acakOpsi: acakOpsi !== false,
          status: 'DIJADWALKAN',
          ...(kelasIds && Array.isArray(kelasIds) && kelasIds.length > 0
            ? {
                ujianKelas: {
                  create: kelasIds.map((kId: string) => ({ kelasId: kId })),
                },
              }
            : {}),
        },
      });

      // Daftarkan siswa dari kelas terkait secara otomatis
      if (kelasIds && Array.isArray(kelasIds) && kelasIds.length > 0) {
        const siswaInKelas = await prisma.user.findMany({
          where: { role: 'SISWA', kelasId: { in: kelasIds } },
        });

        if (siswaInKelas.length > 0) {
          await prisma.pesertaUjian.createMany({
            data: siswaInKelas.map((s) => ({
              ujianId: newUjian.id,
              siswaId: s.id,
              status: 'BELUM_MULAI',
              sisaDetik: Number(durasiMenit) * 60,
            })),
            skipDuplicates: true,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Jadwal Ujian berhasil dibuat dan didistribusikan ke peserta!',
        data: newUjian,
      });
    }

    if (action === 'ARCHIVE_UJIAN') {
      const { ujianId, status = 'NONAKTIF' } = body;
      const updated = await prisma.ujian.update({
        where: { id: ujianId },
        data: { status: status as any },
      });
      return NextResponse.json({
        success: true,
        message: 'Jadwal Ujian berhasil diarsipkan! Seluruh riwayat nilai siswa, jawaban, dan audit pelanggaran tetap tersimpan aman.',
        data: updated,
      });
    }

    if (action === 'UNARCHIVE_UJIAN') {
      const { ujianId } = body;
      const updated = await prisma.ujian.update({
        where: { id: ujianId },
        data: { status: 'DIJADWALKAN' },
      });
      return NextResponse.json({
        success: true,
        message: 'Jadwal Ujian berhasil dipulihkan / diaktifkan kembali dari arsip.',
        data: updated,
      });
    }

    if (action === 'DELETE_UJIAN') {
      const { ujianId } = body;
      const peserta = await prisma.pesertaUjian.findMany({ where: { ujianId }, select: { id: true } });
      const pesertaIds = peserta.map((p) => p.id);

      if (pesertaIds.length > 0) {
        await prisma.jawabanPeserta.deleteMany({ where: { pesertaUjianId: { in: pesertaIds } } });
        await prisma.logAktivitasUjian.deleteMany({ where: { pesertaUjianId: { in: pesertaIds } } });
        await prisma.pesertaUjian.deleteMany({ where: { ujianId } });
      }
      await prisma.ujian.delete({ where: { id: ujianId } });

      return NextResponse.json({
        success: true,
        message: 'Jadwal Ujian berhasil dihapus permanen',
      });
    }

    if (action === 'RESET_PASSWORD') {
      const { userId } = body;
      const defaultPassword = await bcrypt.hash('123456', 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: defaultPassword },
      });
      return NextResponse.json({
        success: true,
        message: 'Password user berhasil direset ke default (123456)',
      });
    }

    return NextResponse.json({ success: false, message: 'Action tidak dikenal' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin POST API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
