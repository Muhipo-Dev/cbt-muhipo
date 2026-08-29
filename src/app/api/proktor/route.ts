import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PROKTOR')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ujianId = searchParams.get('ujianId');

    const ujianList = await prisma.ujian.findMany({
      include: {
        bankSoal: { include: { mataPelajaran: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeUjian = ujianId
      ? ujianList.find((u) => u.id === ujianId)
      : ujianList[0] || null;

    let pesertaList: any[] = [];
    if (activeUjian) {
      const peserta = await prisma.pesertaUjian.findMany({
        where: { ujianId: activeUjian.id },
        include: {
          siswa: { include: { kelas: true } },
          _count: { select: { jawabanPeserta: true } },
        },
        orderBy: { siswa: { name: 'asc' } },
      });

      pesertaList = peserta.map((p) => ({
        pesertaUjianId: p.id,
        siswaId: p.siswa.id,
        nis: p.siswa.nis || p.siswa.username,
        nomorPeserta: p.siswa.nomorPeserta || '-',
        username: p.siswa.username,
        name: p.siswa.name,
        kelas: p.siswa.kelas?.nama || '-',
        status: p.status,
        jumlahJawaban: p._count.jawabanPeserta,
        sisaDetik: p.sisaDetik,
        ipAddress: p.ipAddress || '-',
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        ujianList,
        activeUjian,
        pesertaList,
      },
    });
  } catch (error: any) {
    console.error('Proktor GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PROKTOR')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Reset Login / Buka Kunci Siswa Tunggal
    if (action === 'RESET_LOGIN') {
      const { pesertaUjianId } = body;
      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: {
          status: 'RESET_LOGIN',
          ipAddress: null,
          userAgent: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Status login siswa berhasil direset. Siswa dapat login kembali.',
      });
    }

    // Reset Login Semua Siswa dalam Ujian
    if (action === 'RESET_ALL_LOGINS') {
      const { ujianId } = body;
      const res = await prisma.pesertaUjian.updateMany({
        where: {
          ujianId,
          status: { in: ['SEDANG_MENGERJAKAN', 'TERKUNCI'] },
        },
        data: {
          status: 'RESET_LOGIN',
          ipAddress: null,
          userAgent: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil mereset login untuk ${res.count} siswa aktif.`,
      });
    }

    // Kunci Peserta Ujian
    if (action === 'LOCK_EXAM') {
      const { pesertaUjianId } = body;
      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: { status: 'TERKUNCI' },
      });

      return NextResponse.json({
        success: true,
        message: 'Ujian peserta berhasil dikunci.',
      });
    }

    // Buka Kunci Peserta Ujian
    if (action === 'UNLOCK_EXAM') {
      const { pesertaUjianId } = body;
      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: { status: 'RESET_LOGIN' },
      });

      return NextResponse.json({
        success: true,
        message: 'Kunci ujian peserta berhasil dibuka.',
      });
    }

    // Selesaikan Paksa Ujian Siswa
    if (action === 'FINISH_FORCE') {
      const { pesertaUjianId } = body;
      const p = await prisma.pesertaUjian.findUnique({
        where: { id: pesertaUjianId },
        include: {
          ujian: {
            include: {
              bankSoal: {
                include: {
                  soalList: {
                    include: { opsiJawaban: true },
                  },
                },
              },
            },
          },
          jawabanPeserta: true,
        },
      });

      if (!p) {
        return NextResponse.json({ success: false, message: 'Peserta tidak ditemukan' }, { status: 404 });
      }

      // Hitung skor PG otomatis
      let totalNilaiPG = 0;
      const jawabanMap = new Map(p.jawabanPeserta.map((j) => [j.soalId, j]));
      const soalList = p.ujian.bankSoal.soalList;

      for (const soal of soalList) {
        const jwb = jawabanMap.get(soal.id);
        const bobot = soal.bobot || 1.0;

        if (soal.tipeSoal === 'PG' || soal.tipeSoal === 'BENAR_SALAH') {
          const opsiBenar = soal.opsiJawaban.find((o) => o.isBenar);
          if (jwb && opsiBenar && jwb.jawabanDipilih === opsiBenar.id) {
            totalNilaiPG += bobot;
          }
        }
      }

      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: {
          status: 'SELESAI',
          waktuSelesai: new Date(),
          sisaDetik: 0,
          nilaiPG: totalNilaiPG,
          nilaiTotal: totalNilaiPG,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Ujian peserta berhasil diselesaikan secara paksa oleh proktor.',
      });
    }

    // Tambah Waktu Ujian
    if (action === 'ADD_TIME') {
      const { pesertaUjianId, extraMinutes } = body;
      const peserta = await prisma.pesertaUjian.findUnique({
        where: { id: pesertaUjianId },
      });

      if (!peserta) {
        return NextResponse.json({ success: false, message: 'Peserta tidak ditemukan' }, { status: 404 });
      }

      const additionalSeconds = (Number(extraMinutes) || 15) * 60;
      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: {
          sisaDetik: (peserta.sisaDetik || 0) + additionalSeconds,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil menambahkan waktu ${extraMinutes} menit untuk siswa.`,
      });
    }

    return NextResponse.json({ success: false, message: 'Action invalid' }, { status: 400 });
  } catch (error: any) {
    console.error('Proktor POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
