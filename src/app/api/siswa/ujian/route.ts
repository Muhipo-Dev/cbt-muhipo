import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'SISWA') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchKeyword = searchParams.get('q')?.toLowerCase().trim();
    const modulFilter = searchParams.get('modul')?.trim();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        kelas: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, message: 'User tidak ditemukan' }, { status: 404 });
    }

    // 1. Ambil seluruh ujian yang ditargetkan untuk kelas siswa ini atau terbuka untuk seluruh kelas
    const userKelasId = dbUser.kelasId;
    const userKelasNama = dbUser.kelas?.nama;

    const accessibleUjianList = await prisma.ujian.findMany({
      where: {
        status: { notIn: ['DRAFT'] },
        mataPelajaran: { status: { not: 'TERHAPUS' } },
        OR: [
          { ujianKelas: { none: {} } },
          ...(userKelasId ? [{ ujianKelas: { some: { kelasId: userKelasId } } }] : []),
          ...(userKelasNama ? [{ ujianKelas: { some: { kelas: { nama: userKelasNama } } } }] : []),
        ],
      },
      include: {
        mataPelajaran: {
          include: {
            modul: { select: { id: true, nama: true } },
            gurus: {
              include: { guru: { select: { id: true, name: true } } },
            },
            pembuat: { select: { id: true, name: true, role: true } },
            _count: {
              select: { soalList: true },
            },
            soalList: {
              select: { id: true, tipeSoal: true },
            },
          },
        },
        ujianKelas: {
          include: { kelas: { select: { id: true, nama: true } } },
        },
      },
      orderBy: [{ waktuMulai: 'asc' }, { createdAt: 'desc' }],
    });

    // 2. Ambil seluruh record PesertaUjian milik siswa ini
    const existingPesertaList = await prisma.pesertaUjian.findMany({
      where: { siswaId: dbUser.id },
    });

    const pesertaMap = new Map<string, (typeof existingPesertaList)[0]>();
    existingPesertaList.forEach((p) => pesertaMap.set(p.ujianId, p));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const formattedList = accessibleUjianList.map((u) => {
      const p = pesertaMap.get(u.id);
      const scheduledStart = u.waktuMulai ? new Date(u.waktuMulai) : null;
      const scheduledEnd = u.waktuSelesai ? new Date(u.waktuSelesai) : null;

      const statusPeserta = p?.status || 'BELUM_MULAI';
      let realSisaDetik = p?.sisaDetik ?? u.durasiMenit * 60;

      if (statusPeserta !== 'SELESAI' && scheduledStart) {
        const totalMaxDetik = u.durasiMenit * 60;
        const scheduledEndFromDuration = new Date(scheduledStart.getTime() + totalMaxDetik * 1000);
        let absoluteEnd = scheduledEndFromDuration;
        if (scheduledEnd && scheduledEnd < absoluteEnd) {
          absoluteEnd = scheduledEnd;
        }

        const diffSec = Math.floor((absoluteEnd.getTime() - now.getTime()) / 1000);
        realSisaDetik = Math.max(0, Math.min(totalMaxDetik, diffSec));
      }

      const guruPengampuNama =
        u.mataPelajaran?.gurus?.[0]?.guru?.name ||
        (u.mataPelajaran?.pembuat?.role === 'GURU' ? u.mataPelajaran?.pembuat?.name : 'Guru Pengampu');

      const allSoal = u.mataPelajaran?.soalList || [];
      const totalSoal = u.mataPelajaran?._count?.soalList ?? allSoal.length;
      const soalEsaiCount = allSoal.filter((s) => s.tipeSoal === 'ESAI' || s.tipeSoal === 'ISIAN').length;
      const soalPgObjektifCount = Math.max(0, totalSoal - soalEsaiCount);
      const isHanyaPG = totalSoal > 0 && soalEsaiCount === 0;

      const isArchived = u.status === 'NONAKTIF';
      const isStarted = scheduledStart ? now >= scheduledStart : true;
      const isEnded = scheduledEnd ? now > scheduledEnd : false;

      // Status waktu & kesiapan
      const isMulaiHariIni = scheduledStart ? scheduledStart >= startOfToday && scheduledStart <= endOfToday : false;
      const isSedangBerlangsungHariIni = scheduledStart && scheduledEnd
        ? scheduledStart <= endOfToday && scheduledEnd >= startOfToday
        : isMulaiHariIni;

      const isToday = isSedangBerlangsungHariIni && !isArchived;
      const isFuture = scheduledStart ? scheduledStart > now : false;
      const isPast = (scheduledEnd ? now > scheduledEnd : false) || isArchived;
      
      const isReady = isStarted && !isEnded && !isArchived && statusPeserta !== 'SELESAI';
      const isWorking = statusPeserta === 'SEDANG_MENGERJAKAN';
      const isFinished = statusPeserta === 'SELESAI';
      const isArsip = isArchived || isPast || (isFinished && isPast);

      const modulNama = u.mataPelajaran?.namaModul || u.mataPelajaran?.modul?.nama || 'Default';

      return {
        pesertaUjianId: p?.id || null,
        ujianId: u.id,
        kodeUjian: u.kodeUjian,
        judul: u.judul,
        deskripsi: u.deskripsi,
        mataPelajaran: u.mataPelajaran?.nama || 'Mata Pelajaran',
        modulNama,
        tingkat: u.mataPelajaran?.tingkat || 10,
        kkm: u.mataPelajaran?.kkm || 75,
        guruPengampu: guruPengampuNama,
        durasiMenit: u.durasiMenit,
        jumlahSoal: totalSoal,
        jumlahSoalPG: soalPgObjektifCount,
        jumlahSoalEsai: soalEsaiCount,
        isHanyaPG,
        waktuMulai: u.waktuMulai,
        waktuSelesai: u.waktuSelesai,
        statusUjian: u.status,
        statusPeserta,
        nilaiPG: p?.nilaiPG != null ? Number(Number(p.nilaiPG).toFixed(2)) : null,
        nilaiEsai: p?.nilaiEsai != null ? Number(Number(p.nilaiEsai).toFixed(2)) : null,
        nilaiTotal: p?.nilaiTotal != null ? Number(Number(p.nilaiTotal).toFixed(2)) : null,
        isKoreksiSelesai: p?.isKoreksiSelesai ?? false,
        tampilkanHasil: u.tampilkanHasil,
        sisaDetik: realSisaDetik,
        isReady,
        isWorking,
        isFinished,
        isToday,
        isPast,
        isFuture,
        isArchived,
        isArsip,
      };
    });

    // Modul list unik untuk filter tab di frontend
    const availableModuls = Array.from(
      new Set(formattedList.map((item) => item.modulNama).filter(Boolean))
    );

    // Filter server-side opsional jika parameter q atau modul dikirim
    let filteredList = formattedList;
    if (searchKeyword) {
      filteredList = filteredList.filter(
        (item) =>
          item.judul.toLowerCase().includes(searchKeyword) ||
          item.kodeUjian.toLowerCase().includes(searchKeyword) ||
          item.mataPelajaran.toLowerCase().includes(searchKeyword) ||
          item.modulNama.toLowerCase().includes(searchKeyword) ||
          item.guruPengampu.toLowerCase().includes(searchKeyword)
      );
    }
    if (modulFilter && modulFilter !== 'SEMUA') {
      filteredList = filteredList.filter(
        (item) => item.modulNama.toLowerCase() === modulFilter.toLowerCase()
      );
    }

    const ujianListHariIni = filteredList.filter((item) => item.isToday && !item.isArsip);
    const ujianListAktifReady = filteredList.filter((item) => item.isReady);
    const ujianListMendatang = filteredList.filter((item) => item.isFuture && !item.isArchived);
    const arsipList = filteredList.filter((item) => item.isArsip || item.isFinished);

    // Statistik komprehensif
    const stats = {
      totalSemua: formattedList.length,
      totalSiap: formattedList.filter((item) => item.isReady).length,
      totalSedangMengerjakan: formattedList.filter((item) => item.isWorking).length,
      totalHariIni: formattedList.filter((item) => item.isToday && !item.isArsip).length,
      totalMendatang: formattedList.filter((item) => item.isFuture).length,
      totalSelesai: formattedList.filter((item) => item.isFinished).length,
      totalArsip: formattedList.filter((item) => item.isArsip).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        siswa: {
          id: dbUser.id,
          name: dbUser.name,
          username: dbUser.username,
          nomorPeserta: dbUser.nomorPeserta,
          kelas: dbUser.kelas?.nama,
          ruangUjian: dbUser.ruangUjian,
          sesiUjian: dbUser.sesiUjian,
          foto: dbUser.foto,
        },
        semuaList: filteredList,
        ujianList: ujianListHariIni.length > 0 ? ujianListHariIni : filteredList.filter((item) => !item.isArsip),
        ujianListAktifReady,
        ujianListMendatang,
        arsipList,
        availableModuls,
        stats,
        serverTime: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetch siswa ujian:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
