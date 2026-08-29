import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'SISWA') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Ambil data user lengkap
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        kelas: true,
        pesertaUjian: {
          include: {
            ujian: {
              include: {
                bankSoal: {
                  include: {
                    mataPelajaran: true,
                    _count: {
                      select: { soalList: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, message: 'User tidak ditemukan' }, { status: 404 });
    }

    // Format list ujian yang tersedia untuk siswa
    const now = new Date();
    const ujianList = dbUser.pesertaUjian.map((p) => {
      let realSisaDetik = p.sisaDetik;
      
      // Jika belum selesai dan ada jadwal mulai
      if (p.status !== 'SELESAI' && p.ujian.waktuMulai) {
        const totalMaxDetik = p.ujian.durasiMenit * 60;
        const scheduledStart = new Date(p.ujian.waktuMulai);
        const scheduledEnd = new Date(scheduledStart.getTime() + totalMaxDetik * 1000);
        let absoluteEnd = scheduledEnd;
        if (p.ujian.waktuSelesai) {
          const strictEnd = new Date(p.ujian.waktuSelesai);
          if (strictEnd < absoluteEnd) absoluteEnd = strictEnd;
        }

        const diffSec = Math.floor((absoluteEnd.getTime() - now.getTime()) / 1000);
        realSisaDetik = Math.max(0, Math.min(totalMaxDetik, diffSec));
      }

      return {
        pesertaUjianId: p.id,
        ujianId: p.ujian.id,
        kodeUjian: p.ujian.kodeUjian,
        judul: p.ujian.judul,
        deskripsi: p.ujian.deskripsi,
        mataPelajaran: p.ujian.bankSoal.mataPelajaran.nama,
        durasiMenit: p.ujian.durasiMenit,
        jumlahSoal: p.ujian.bankSoal._count.soalList,
        waktuMulai: p.ujian.waktuMulai,
        waktuSelesai: p.ujian.waktuSelesai,
        statusUjian: p.ujian.status,
        statusPeserta: p.status,
        nilaiTotal: p.nilaiTotal,
        tampilkanHasil: p.ujian.tampilkanHasil,
        sisaDetik: realSisaDetik,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        siswa: {
          id: dbUser.id,
          name: dbUser.name,
          username: dbUser.username,
          nisn: dbUser.nisn,
          nomorPeserta: dbUser.nomorPeserta,
          kelas: dbUser.kelas?.nama,
          ruangUjian: dbUser.ruangUjian,
          sesiUjian: dbUser.sesiUjian,
          foto: dbUser.foto,
        },
        ujianList,
      },
    });
  } catch (error: any) {
    console.error('Error fetch siswa ujian:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
