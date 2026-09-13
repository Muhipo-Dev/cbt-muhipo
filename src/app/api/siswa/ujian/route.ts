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
          where: {
            ujian: {
              OR: [
                { ujianKelas: { none: {} } }, // Ujian umum jika tidak dibatasi kelas
                ...(user.kelasNama ? [{ ujianKelas: { some: { kelas: { nama: user.kelasNama } } } }] : []),
              ],
            },
          },
          include: {
            ujian: {
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
                    soalList: {
                      select: { id: true, tipeSoal: true, bobot: true },
                    },
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

    // Format list ujian yang tersedia untuk siswa berdasarkan tanggal pelaksanaan hari ini
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const formattedList = dbUser.pesertaUjian.map((p) => {
      let realSisaDetik = p.sisaDetik;
      const scheduledStart = p.ujian.waktuMulai ? new Date(p.ujian.waktuMulai) : null;
      const scheduledEnd = p.ujian.waktuSelesai ? new Date(p.ujian.waktuSelesai) : null;

      // Jika belum selesai dan ada jadwal mulai
      if (p.status !== 'SELESAI' && scheduledStart) {
        const totalMaxDetik = p.ujian.durasiMenit * 60;
        const scheduledEndFromDuration = new Date(scheduledStart.getTime() + totalMaxDetik * 1000);
        let absoluteEnd = scheduledEndFromDuration;
        if (scheduledEnd && scheduledEnd < absoluteEnd) {
          absoluteEnd = scheduledEnd;
        }

        const diffSec = Math.floor((absoluteEnd.getTime() - now.getTime()) / 1000);
        realSisaDetik = Math.max(0, Math.min(totalMaxDetik, diffSec));
      }

      const guruPengampuNama =
        p.ujian.bankSoal.mataPelajaran?.gurus?.[0]?.guru?.name ||
        (p.ujian.bankSoal.pembuat?.role === 'GURU' ? p.ujian.bankSoal.pembuat?.name : 'Guru Pengampu');

      const allSoal = p.ujian.bankSoal.soalList || [];
      const totalSoal = allSoal.length;
      const soalEsaiCount = allSoal.filter((s) => s.tipeSoal === 'ESAI' || s.tipeSoal === 'ISIAN').length;
      const soalPgObjektifCount = totalSoal - soalEsaiCount;
      const isHanyaPG = totalSoal > 0 && soalEsaiCount === 0;

      // Status pelaksanaan berdasarkan tanggal hari ini dan status arsip
      const isArchived = p.ujian.status === 'NONAKTIF';
      const isMulaiHariIni = scheduledStart ? scheduledStart >= startOfToday && scheduledStart <= endOfToday : false;
      const isToday = isMulaiHariIni && !isArchived;
      const isPast = (scheduledStart ? scheduledStart < startOfToday : false) || (scheduledEnd ? scheduledEnd < startOfToday : false) || isArchived;
      const isFuture = scheduledStart ? scheduledStart > endOfToday : false;

      return {
        pesertaUjianId: p.id,
        ujianId: p.ujian.id,
        kodeUjian: p.ujian.kodeUjian,
        judul: p.ujian.judul,
        deskripsi: p.ujian.deskripsi,
        mataPelajaran: p.ujian.bankSoal.mataPelajaran.nama,
        guruPengampu: guruPengampuNama,
        durasiMenit: p.ujian.durasiMenit,
        jumlahSoal: totalSoal,
        jumlahSoalPG: soalPgObjektifCount,
        jumlahSoalEsai: soalEsaiCount,
        isHanyaPG,
        waktuMulai: p.ujian.waktuMulai,
        waktuSelesai: p.ujian.waktuSelesai,
        statusUjian: p.ujian.status,
        statusPeserta: p.status,
        nilaiPG: p.nilaiPG != null ? Number(Number(p.nilaiPG).toFixed(2)) : null,
        nilaiEsai: p.nilaiEsai != null ? Number(Number(p.nilaiEsai).toFixed(2)) : null,
        nilaiTotal: p.nilaiTotal != null ? Number(Number(p.nilaiTotal).toFixed(2)) : null,
        isKoreksiSelesai: p.isKoreksiSelesai,
        tampilkanHasil: p.ujian.tampilkanHasil,
        sisaDetik: realSisaDetik,
        isToday,
        isPast,
        isFuture,
        isArsip: isPast || isArchived || (p.status === 'SELESAI' && isPast),
      };
    });

    // Ujian aktif hari ini (hanya yang dijadwalkan di hari ini)
    const ujianListHariIni = formattedList.filter((item) => item.isToday);
    // Arsip ujian (ujian dari hari sebelumnya yang sudah lewat tanggalnya)
    const arsipList = formattedList.filter((item) => item.isArsip);

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
        ujianList: ujianListHariIni,
        arsipList,
        totalHariIni: ujianListHariIni.length,
        totalArsip: arsipList.length,
        serverTime: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetch siswa ujian:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
