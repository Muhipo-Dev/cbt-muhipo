import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['ADMIN', 'PROKTOR', 'GURU'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ujianId = searchParams.get('ujianId');
    const filterHari = searchParams.get('filterHari'); // 'HARI_INI' | 'SEMUA'

    // Pengawasan Ujian untuk Guru:
    // Guru berhak memantau ujian yang berlangsung saat itu/hari itu (sebagai pengawas ruang),
    // serta ujian yang dijadwalkan pada hari yang sama atau ujian miliknya sendiri.
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const ujianWhereClause: any = {};
    if (user.role === 'GURU') {
      if (filterHari === 'SEMUA') {
        // Jika guru memilih tampilkan semua ujian
        ujianWhereClause.OR = [
          { bankSoal: { pembuatId: user.userId } },
          { waktuMulai: { lte: endOfToday }, waktuSelesai: { gte: startOfToday } },
        ];
      } else {
        // Default untuk Guru: Pantauan ujian saat itu & jadwal di hari yang sama (atau ujian buatannya)
        ujianWhereClause.OR = [
          // 1. Ujian yang dijadwalkan / berlangsung di hari yang sama (hari ini)
          {
            waktuMulai: { lte: endOfToday },
            waktuSelesai: { gte: startOfToday },
          },
          // 2. Ujian yang dibuat oleh guru bersangkutan (kapan pun)
          {
            bankSoal: { pembuatId: user.userId },
          },
          // 3. Ujian yang saat ini memiliki peserta aktif sedang mengerjakan
          {
            pesertaUjian: {
              some: { status: 'SEDANG_MENGERJAKAN' },
            },
          },
        ];
      }
    }

    const ujianList = await prisma.ujian.findMany({
      where: ujianWhereClause,
      include: {
        bankSoal: { include: { mataPelajaran: true, pembuat: { select: { id: true, name: true } } } },
      },
      orderBy: [
        { waktuMulai: 'desc' },
        { createdAt: 'desc' },
      ],
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
          logs: {
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { siswa: { name: 'asc' } },
      });

      pesertaList = peserta.map((p) => {
        const violationLogs = p.logs.filter((l) =>
          [
            'TAB_SWITCH_ALERT',
            'WINDOW_BLUR',
            'FULLSCREEN_EXIT',
            'SCREEN_SHARE_STOPPED',
            'KEYBOARD_SHORTCUT_VIOLATION',
            'SECURITY_ALERT',
          ].includes(l.aktivitas)
        );

        // Cari screenshot / foto bukti layar terakhir dari log pelanggaran
        const latestScreenshotLog = p.logs.find((l: any) => l.fotoBukti);

        return {
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
          logsTerakhir: p.logs,
          violationLogs,
          jumlahPelanggaran: violationLogs.length,
          hasViolations: violationLogs.length > 0,
          latestScreenshot: (latestScreenshotLog as any)?.fotoBukti || null,
          latestScreenshotTime: latestScreenshotLog?.createdAt || null,
          latestViolationActivity: violationLogs[0]?.aktivitas || null,
          latestViolationDetail: violationLogs[0]?.detail || null,
          hasLiveScreen: Boolean(global.__cbtLiveScreenStore?.get(p.id) && (Date.now() - (global.__cbtLiveScreenStore?.get(p.id)?.timestamp || 0) < 12000)),
        };
      });
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
    if (!user || !['ADMIN', 'PROKTOR', 'GURU'].includes(user.role)) {
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

      // Hitung skor objektif (PG, PG Kompleks, Benar/Salah, Isian Singkat) otomatis
      let totalNilaiPG = 0;
      let totalNilaiEsai = 0;
      let adaEsai = false;
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
        } else if (soal.tipeSoal === 'PG_KOMPLEKS') {
          let chosenIds: string[] = [];
          try {
            if (jwb?.jawabanDipilih) chosenIds = JSON.parse(jwb.jawabanDipilih);
          } catch (e) {
            chosenIds = [];
          }
          const correctOpsiIds = soal.opsiJawaban.filter((o) => o.isBenar).map((o) => o.id);
          const isIdentical =
            chosenIds.length === correctOpsiIds.length &&
            chosenIds.every((id) => correctOpsiIds.includes(id));
          if (isIdentical) totalNilaiPG += bobot;
        } else if (soal.tipeSoal === 'ISIAN') {
          const kunci = (soal.kunciJawabanTeks || '').trim().toLowerCase();
          const jawab = (jwb?.jawabanDipilih || '').trim().toLowerCase();
          if (kunci.length > 0 && kunci === jawab) {
            totalNilaiEsai += bobot;
          }
        } else if (soal.tipeSoal === 'MENJODOHKAN') {
          let pairsCorrect = 0;
          let totalPairs = 0;
          try {
            const keyPairs: { left: string; right: string }[] = JSON.parse(soal.matchingData || '[]');
            totalPairs = keyPairs.length;
            let userAnswers: Record<string, string> = {};
            if (jwb?.jawabanDipilih) {
              const parsed = JSON.parse(jwb.jawabanDipilih);
              if (Array.isArray(parsed)) {
                parsed.forEach((p: any) => {
                  if (p.left && p.right) userAnswers[p.left.trim().toLowerCase()] = p.right.trim().toLowerCase();
                });
              } else if (typeof parsed === 'object' && parsed !== null) {
                Object.entries(parsed).forEach(([k, v]) => {
                  userAnswers[k.trim().toLowerCase()] = String(v).trim().toLowerCase();
                });
              }
            }
            if (totalPairs > 0) {
              for (const kp of keyPairs) {
                if (userAnswers[kp.left.trim().toLowerCase()] === kp.right.trim().toLowerCase()) {
                  pairsCorrect++;
                }
              }
            }
          } catch (e) {
            pairsCorrect = 0;
          }
          const prop = totalPairs > 0 ? pairsCorrect / totalPairs : 0;
          totalNilaiPG += Number((prop * bobot).toFixed(2));
        } else if (soal.tipeSoal === 'ESAI') {
          adaEsai = true;
        }
      }

      const finalPG = Number(totalNilaiPG.toFixed(2));
      const finalEsai = Number(totalNilaiEsai.toFixed(2));
      const finalTotal = Number((finalPG + finalEsai).toFixed(2));

      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: {
          status: 'SELESAI',
          waktuSelesai: new Date(),
          sisaDetik: 0,
          nilaiPG: finalPG,
          nilaiEsai: finalEsai,
          nilaiTotal: finalTotal,
          isKoreksiSelesai: !adaEsai,
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
