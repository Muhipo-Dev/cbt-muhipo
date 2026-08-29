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

    // Reset Login / Buka Kunci Siswa
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
        message: 'Status ujian siswa berhasil direset. Siswa dapat login dan melanjutkan ujian kembali.',
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
