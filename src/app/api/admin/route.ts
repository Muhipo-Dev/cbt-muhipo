import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'dashboard';

    if (tab === 'dashboard') {
      const [
        countSiswa,
        countGuru,
        countKelas,
        countBankSoal,
        countUjian,
        countPesertaMengerjakan,
        countPesertaSelesai,
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'SISWA' } }),
        prisma.user.count({ where: { role: 'GURU' } }),
        prisma.kelas.count(),
        prisma.bankSoal.count(),
        prisma.ujian.count(),
        prisma.pesertaUjian.count({ where: { status: 'SEDANG_MENGERJAKAN' } }),
        prisma.pesertaUjian.count({ where: { status: 'SELESAI' } }),
      ]);

      const recentUjian = await prisma.ujian.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          bankSoal: { include: { mataPelajaran: true } },
          _count: { select: { pesertaUjian: true } },
        },
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
            countUjian,
            countPesertaMengerjakan,
            countPesertaSelesai,
          },
          recentUjian,
          recentLogs,
        },
      });
    }

    if (tab === 'siswa') {
      const siswaList = await prisma.user.findMany({
        where: { role: 'SISWA' },
        include: { kelas: true },
        orderBy: { name: 'asc' },
      });
      const kelasList = await prisma.kelas.findMany({ orderBy: { nama: 'asc' } });
      return NextResponse.json({ success: true, data: { siswaList, kelasList } });
    }

    if (tab === 'guru') {
      const guruList = await prisma.user.findMany({
        where: { role: 'GURU' },
        include: { mataPelajaran: { include: { mataPelajaran: true } } },
        orderBy: { name: 'asc' },
      });
      const mapelList = await prisma.mataPelajaran.findMany({ orderBy: { nama: 'asc' } });
      return NextResponse.json({ success: true, data: { guruList, mapelList } });
    }

    if (tab === 'kelas') {
      const kelasList = await prisma.kelas.findMany({
        include: { _count: { select: { users: true } } },
        orderBy: { nama: 'asc' },
      });
      return NextResponse.json({ success: true, data: kelasList });
    }

    if (tab === 'mapel') {
      const mapelList = await prisma.mataPelajaran.findMany({
        include: { _count: { select: { bankSoalList: true } } },
        orderBy: { nama: 'asc' },
      });
      return NextResponse.json({ success: true, data: mapelList });
    }

    if (tab === 'jadwal') {
      const jadwalList = await prisma.ujian.findMany({
        include: {
          bankSoal: { include: { mataPelajaran: true } },
          _count: { select: { pesertaUjian: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      const bankSoalList = await prisma.bankSoal.findMany({
        include: { mataPelajaran: true },
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
        message: 'Jadwal Ujian berhasil dihapus',
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
