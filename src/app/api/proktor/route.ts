import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runAIProctorAnalysis } from '@/lib/pythonBridge';
import { getCalibratedServerNow, computeAccurateExamRemainingSeconds } from '@/lib/exam-time';
import { evaluateExamSubmissionItems } from '@/lib/cbt-scoring';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'PROKTOR', 'GURU'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ujianId = searchParams.get('ujianId');
    const filterHari = searchParams.get('filterHari');
    const inspectPesertaUjianId = searchParams.get('inspectPesertaUjianId');

    // FITUR OVERRIDE SPECTATOR: Pengawas / Proktor dapat mengintip jawaban realtime & lembar ujian siswa
    if (inspectPesertaUjianId) {
      const targetPeserta = await prisma.pesertaUjian.findUnique({
        where: { id: inspectPesertaUjianId },
        include: {
          siswa: { include: { kelas: true } },
          ujian: {
            include: {
              mataPelajaran: {
                include: {
                  soalList: {
                    include: { opsiJawaban: true },
                    orderBy: { nomorUrut: 'asc' },
                  },
                },
              },
            },
          },
          jawabanPeserta: {
            include: {
              soal: {
                include: { opsiJawaban: true },
              },
            },
          },
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 30,
          },
        },
      });

      if (!targetPeserta) {
        return NextResponse.json({ success: false, message: 'Peserta ujian tidak ditemukan' }, { status: 404 });
      }

      // Susun data terurut sesuai urutanSoalIds siswa
      let orderedSoals = targetPeserta.ujian.mataPelajaran.soalList;
      if (targetPeserta.urutanSoalIds) {
        try {
          const orderIds = JSON.parse(targetPeserta.urutanSoalIds);
          if (Array.isArray(orderIds) && orderIds.length > 0) {
            const soalMap = new Map(orderedSoals.map((s) => [s.id, s]));
            const sorted: typeof orderedSoals = [];
            orderIds.forEach((sid) => {
              const item = soalMap.get(sid);
              if (item) sorted.push(item);
            });
            if (sorted.length > 0) orderedSoals = sorted;
          }
        } catch (e) {}
      }

      const jawabanMap = new Map(targetPeserta.jawabanPeserta.map((j) => [j.soalId, j]));

      const spectatorSoalData = orderedSoals.map((s, idx) => {
        const jwb = jawabanMap.get(s.id);
        return {
          nomorUrut: idx + 1,
          soalId: s.id,
          pertanyaan: s.pertanyaan,
          tipeSoal: s.tipeSoal,
          mediaGambar: s.mediaGambar,
          mediaAudio: s.mediaAudio,
          bobot: s.bobot,
          kunciJawabanTeks: s.kunciJawabanTeks,
          matchingData: s.matchingData,
          opsiJawaban: s.opsiJawaban.map((o) => ({
            id: o.id,
            label: o.label,
            konten: o.konten,
            gambar: o.gambar,
            isBenar: o.isBenar,
          })),
          jawabanSiswa: jwb?.jawabanDipilih || null,
          raguRagu: Boolean(jwb?.raguRagu),
          isBenar: jwb?.isBenar ?? null,
          skor: jwb?.skor ?? 0,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          peserta: {
            id: targetPeserta.id,
            name: targetPeserta.siswa.name,
            username: targetPeserta.siswa.username,
            nomorPeserta: targetPeserta.siswa.nomorPeserta,
            kelas: targetPeserta.siswa.kelas?.nama || '-',
            status: targetPeserta.status,
            sisaDetik: targetPeserta.sisaDetik,
            waktuMulai: targetPeserta.waktuMulai,
            waktuSelesai: targetPeserta.waktuSelesai,
            ipAddress: targetPeserta.ipAddress,
            totalSoal: orderedSoals.length,
            totalDijawab: targetPeserta.jawabanPeserta.filter((j) => {
              if (!j || !j.jawabanDipilih) return false;
              const val = j.jawabanDipilih.trim();
              return Boolean(val && val !== '[]' && val !== '{}');
            }).length,
          },
          ujian: {
            id: targetPeserta.ujian.id,
            judul: targetPeserta.ujian.judul,
            mapel: targetPeserta.ujian.mataPelajaran.nama,
            durasiMenit: targetPeserta.ujian.durasiMenit,
          },
          soalList: spectatorSoalData,
          logs: targetPeserta.logs,
        },
      });
    }

    const now = await getCalibratedServerNow();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const ujianWhereClause: any = {
      mataPelajaran: { status: { not: 'TERHAPUS' } },
    };
    if (user.role === 'GURU') {
      if (filterHari === 'SEMUA') {
        ujianWhereClause.OR = [
          { mataPelajaran: { OR: [{ pembuatId: user.userId }, { gurus: { some: { guruId: user.userId } } }] } },
          { waktuMulai: { lte: endOfToday }, waktuSelesai: { gte: startOfToday } },
        ];
      } else {
        ujianWhereClause.OR = [
          {
            waktuMulai: { lte: endOfToday },
            waktuSelesai: { gte: startOfToday },
          },
          {
            mataPelajaran: { OR: [{ pembuatId: user.userId }, { gurus: { some: { guruId: user.userId } } }] },
          },
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
        mataPelajaran: {
          include: {
            gurus: { include: { guru: { select: { id: true, name: true } } } },
            pembuat: { select: { id: true, name: true } },
            _count: { select: { soalList: true } },
          },
        },
      },
      orderBy: [
        { waktuMulai: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const activeUjian = (ujianId
      ? ujianList.find((u) => u.id === ujianId)
      : null) || ujianList[0] || null;

    let pesertaList: any[] = [];
    if (activeUjian) {
      const peserta = await prisma.pesertaUjian.findMany({
        where: { ujianId: activeUjian.id },
        include: {
          siswa: { include: { kelas: true } },
          jawabanPeserta: {
            select: {
              jawabanDipilih: true,
            },
          },
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
            'APP_SWITCH_ALERT',
            'WINDOW_BLUR',
            'FULLSCREEN_EXIT',
            'SCREEN_SHARE_STOPPED',
            'KEYBOARD_SHORTCUT_VIOLATION',
            'SECURITY_ALERT',
          ].includes(l.aktivitas)
        );

        const validAnswerCount = p.jawabanPeserta.filter((j) => {
          if (!j || !j.jawabanDipilih) return false;
          const val = j.jawabanDipilih.trim();
          return Boolean(val && val !== '[]' && val !== '{}');
        }).length;

        const liveSisaDetik = computeAccurateExamRemainingSeconds({
          now,
          durasiMenit: activeUjian.durasiMenit,
          jadwalSelesai: activeUjian.waktuSelesai,
          pesertaWaktuMulai: p.waktuMulai,
          pesertaSisaDetikTersimpan: p.sisaDetik,
          pesertaUpdatedAt: p.updatedAt,
          pesertaStatus: p.status,
        });

        let totalSoalPeserta = 0;
        if (p.urutanSoalIds) {
          try {
            const parsedIds = JSON.parse(p.urutanSoalIds);
            if (Array.isArray(parsedIds)) totalSoalPeserta = parsedIds.length;
          } catch {}
        }
        if (totalSoalPeserta === 0) {
          totalSoalPeserta = activeUjian.maxSoal || activeUjian.mataPelajaran?._count?.soalList || 0;
        }

        return {
          pesertaUjianId: p.id,
          ujianId: p.ujianId,
          siswaId: p.siswa.id,
          nomorPeserta: p.siswa.nomorPeserta || '-',
          username: p.siswa.username,
          name: p.siswa.name,
          plainPassword: p.siswa.plainPassword || '123456',
          kelas: p.siswa.kelas?.nama || '-',
          status: p.status,
          jumlahJawaban: validAnswerCount,
          totalSoal: totalSoalPeserta,
          sisaDetik: liveSisaDetik,
          ipAddress: p.ipAddress || '-',
          logsTerakhir: p.logs,
          violationLogs,
          jumlahPelanggaran: violationLogs.length,
          hasViolations: violationLogs.length > 0,
          latestViolationActivity: violationLogs[0]?.aktivitas || null,
          latestViolationDetail: violationLogs[0]?.detail || null,
        };
      });
    }

    // Komputasi AI Python untuk Pengawasan Ujian Realtime
    let aiProctorAnalysis = null;
    if (pesertaList && pesertaList.length > 0) {
      try {
        aiProctorAnalysis = await runAIProctorAnalysis(pesertaList);
        // Sematkan hasil analisis AI ke tiap peserta
        if (aiProctorAnalysis?.allStudentsAnalysis) {
          const aiMap = new Map(aiProctorAnalysis.allStudentsAnalysis.map((a: any) => [a.pesertaId, a]));
          pesertaList = pesertaList.map((p) => {
            const aiData: any = aiMap.get(p.pesertaUjianId);
            return {
              ...p,
              aiAnalysis: aiData || null,
              riskScore: aiData?.riskScore ?? 0,
              threatLevel: aiData?.threatLevel ?? 'LOW',
              aiRekomendasi: aiData?.rekomendasi ?? null,
              anomalyFlags: aiData?.anomalyFlags ?? [],
            };
          });
        }
      } catch (err) {
        console.error('[AI Proctor Calculation Error]:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ujianList,
        activeUjian,
        pesertaList,
        aiProctor: aiProctorAnalysis,
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
    if (!user || !['SUPERADMIN', 'ADMIN', 'PROKTOR', 'GURU'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'RESET_PASSWORD' || action === 'CHANGE_PASSWORD') {
      const { siswaId, userId, id, pesertaUjianId, newPassword } = body;
      let targetUserId = userId || siswaId || id;
      if (!targetUserId && pesertaUjianId) {
        const pu = await prisma.pesertaUjian.findUnique({
          where: { id: pesertaUjianId },
          select: { siswaId: true },
        });
        targetUserId = pu?.siswaId;
      }
      if (!targetUserId) {
        return NextResponse.json({ success: false, message: 'Data peserta tidak ditemukan' }, { status: 400 });
      }

      const pass = (newPassword || '123456').trim();
      if (!pass) {
        return NextResponse.json({ success: false, message: 'Password baru tidak boleh kosong' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(pass);
      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { password: hashedPassword, plainPassword: pass },
      });

      if (pesertaUjianId) {
        await prisma.logAktivitasUjian.create({
          data: {
            userId: user.userId,
            pesertaUjianId,
            aktivitas: 'RESET_PASSWORD',
            detail: `Pengawas (${user.name}) mengubah kata sandi siswa (${updatedUser.name}) menjadi "${pass}".`,
          },
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `Password siswa "${updatedUser.name}" (${updatedUser.username}) berhasil diubah menjadi "${pass}".`,
      });
    }

    if (action === 'RESET_LOGIN') {
      const { pesertaUjianId } = body;
      if (!pesertaUjianId) {
        return NextResponse.json({ success: false, message: 'pesertaUjianId diperlukan' }, { status: 400 });
      }
      const existingPu = await prisma.pesertaUjian.findUnique({
        where: { id: pesertaUjianId },
        include: { siswa: true, ujian: true },
      });
      if (!existingPu) {
        return NextResponse.json({ success: false, message: 'Data peserta ujian tidak ditemukan' }, { status: 404 });
      }
      if (existingPu.status === 'SELESAI') {
        return NextResponse.json({
          success: false,
          message: `Siswa "${existingPu.siswa.name}" sudah menyelesaikan ujian. Jawaban dan nilai telah dikunci.`,
        }, { status: 400 });
      }

      // Hitung & simpan sisa waktu akurat saat ini sebelum diset ke RESET_LOGIN agar tidak hilang sedikitpun!
      const now = await getCalibratedServerNow();
      const preservedSeconds = computeAccurateExamRemainingSeconds({
        now,
        durasiMenit: existingPu.ujian.durasiMenit,
        jadwalSelesai: existingPu.ujian.waktuSelesai,
        pesertaWaktuMulai: existingPu.waktuMulai,
        pesertaSisaDetikTersimpan: existingPu.sisaDetik,
        pesertaUpdatedAt: existingPu.updatedAt,
        pesertaStatus: existingPu.status,
      });

      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: {
          status: 'RESET_LOGIN',
          sisaDetik: preservedSeconds,
        },
      });

      await prisma.logAktivitasUjian.create({
        data: {
          userId: user.userId,
          pesertaUjianId,
          aktivitas: 'RESET_LOGIN_BY_PROKTOR',
          detail: `Pengawas (${user.name}) mereset sesi login siswa ${existingPu.siswa.name}. Seluruh jawaban tetap tersimpan aman.`,
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Sesi login "${existingPu.siswa.name}" berhasil direset! Siswa dapat login kembali di perangkat baru/lama dan melanjutkan jawaban sebelumnya.`,
      });
    }

    if (action === 'RESET_ALL_LOGINS') {
      const { ujianId } = body;
      if (!ujianId) {
        return NextResponse.json({ success: false, message: 'ujianId diperlukan' }, { status: 400 });
      }
      const res = await prisma.pesertaUjian.updateMany({
        where: { ujianId, status: { notIn: ['SELESAI', 'BELUM_MULAI'] } },
        data: { status: 'RESET_LOGIN' },
      });
      return NextResponse.json({
        success: true,
        message: `Berhasil mereset status login untuk ${res.count} peserta yang sedang aktif agar dapat login kembali.`,
      });
    }

    if (action === 'LOCK_EXAM') {
      const { pesertaUjianId } = body;
      if (!pesertaUjianId) {
        return NextResponse.json({ success: false, message: 'pesertaUjianId diperlukan' }, { status: 400 });
      }
      const pu = await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: { status: 'TERKUNCI' },
        include: { siswa: true },
      });
      await prisma.logAktivitasUjian.create({
        data: {
          userId: user.userId,
          pesertaUjianId,
          aktivitas: 'EXAM_LOCKED_BY_PROKTOR',
          detail: `Proktor (${user.name}) mengunci lembar ujian siswa ${pu.siswa.name}.`,
        },
      });
      return NextResponse.json({ success: true, message: `Lembar ujian "${pu.siswa.name}" berhasil dikunci.` });
    }

    if (action === 'UNLOCK_EXAM') {
      const { pesertaUjianId } = body;
      if (!pesertaUjianId) {
        return NextResponse.json({ success: false, message: 'pesertaUjianId diperlukan' }, { status: 400 });
      }

      // PENTING: Ketika Proktor membuka kunci ujian (UNLOCK_EXAM), bersihkan juga log pelanggaran lama yang membuat
      // pelanggaran >= 5 agar akun siswa tidak langsung terkunci lagi saat terjadi 1 event adaptasi!
      await prisma.logAktivitasUjian.deleteMany({
        where: {
          pesertaUjianId,
          aktivitas: {
            in: [
              'TAB_SWITCH_ALERT',
              'APP_SWITCH_ALERT',
              'WINDOW_BLUR',
              'FULLSCREEN_EXIT',
              'SCREEN_SHARE_STOPPED',
              'KEYBOARD_SHORTCUT_VIOLATION',
              'SECURITY_ALERT',
            ],
          },
        },
      });

      const pu = await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: { status: 'SEDANG_MENGERJAKAN' },
        include: { siswa: true },
      });
      await prisma.logAktivitasUjian.create({
        data: {
          userId: user.userId,
          pesertaUjianId,
          aktivitas: 'EXAM_UNLOCKED_BY_PROKTOR',
          detail: `Proktor (${user.name}) membuka kunci lembar ujian & mereset toleransi pelanggaran siswa ${pu.siswa.name}.`,
        },
      });
      return NextResponse.json({
        success: true,
        message: `Kunci ujian "${pu.siswa.name}" berhasil dibuka dan toleransi pelanggaran telah dipulihkan.`,
      });
    }

    if (action === 'FORCE_FINISH' || action === 'FINISH_FORCE') {
      const { pesertaUjianId } = body;
      if (!pesertaUjianId) {
        return NextResponse.json({ success: false, message: 'pesertaUjianId diperlukan' }, { status: 400 });
      }

      const pesertaUjian = await prisma.pesertaUjian.findUnique({
        where: { id: pesertaUjianId },
        include: {
          siswa: true,
          ujian: {
            include: {
              mataPelajaran: {
                include: {
                  soalList: { include: { opsiJawaban: true } },
                },
              },
            },
          },
          jawabanPeserta: true,
        },
      });

      if (!pesertaUjian) {
        return NextResponse.json({ success: false, message: 'Data peserta ujian tidak ditemukan' }, { status: 404 });
      }

      // Hitung nilai otomatis dari jawaban yang sudah masuk agar nilai siswa TIDAK menjadi 0 saat diselesaikan paksa!
      let soalList = pesertaUjian.ujian.mataPelajaran.soalList;
      if (pesertaUjian.urutanSoalIds) {
        try {
          const orderIds = JSON.parse(pesertaUjian.urutanSoalIds);
          if (Array.isArray(orderIds) && orderIds.length > 0) {
            const orderSet = new Set(orderIds);
            soalList = soalList.filter((s) => orderSet.has(s.id));
          }
        } catch {}
      }

      const mapel = pesertaUjian.ujian.mataPelajaran;
      const gradeSummary = evaluateExamSubmissionItems({
        soalList,
        jawabanList: pesertaUjian.jawabanPeserta,
        nilaiMaksimal: mapel.nilaiMaksimal,
        nilaiMinimal: mapel.nilaiMinimal,
        preserveManualEssayScores: false,
        modePenilaian: (pesertaUjian.ujian as any).modePenilaian,
      });

      for (const item of gradeSummary.updates) {
        if (item.jawabanId) {
          await prisma.jawabanPeserta.update({
            where: { id: item.jawabanId },
            data: {
              isBenar: item.isBenar,
              skor: item.skor,
              ...(item.catatanKoreksi !== undefined ? { catatanKoreksi: item.catatanKoreksi } : {}),
            },
          });
        } else {
          await prisma.jawabanPeserta.create({
            data: {
              pesertaUjianId,
              soalId: item.soalId,
              jawabanDipilih: item.jawabanDipilih || '',
              raguRagu: false,
              isBenar: item.isBenar,
              skor: item.skor,
              catatanKoreksi: item.catatanKoreksi ?? null,
            },
          });
        }
      }

      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: {
          status: 'SELESAI',
          waktuSelesai: new Date(),
          sisaDetik: 0,
          nilaiPG: gradeSummary.nilaiPG,
          nilaiEsai: gradeSummary.nilaiEsai,
          nilaiTotal: gradeSummary.nilaiTotal,
          isKoreksiSelesai: gradeSummary.isKoreksiSelesai,
        },
      });

      await prisma.logAktivitasUjian.create({
        data: {
          userId: user.userId,
          pesertaUjianId,
          aktivitas: 'FORCE_FINISH_BY_PROKTOR',
          detail: `Proktor (${user.name}) menyelesaikan paksa ujian ${pesertaUjian.siswa.name}. Nilai PG: ${gradeSummary.nilaiPG}, Isian/Esai: ${gradeSummary.nilaiEsai}, Total: ${gradeSummary.nilaiTotal}.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Ujian "${pesertaUjian.siswa.name}" berhasil diselesaikan paksa & dinilai otomatis (PG: ${gradeSummary.nilaiPG}, Isian/Esai: ${gradeSummary.nilaiEsai}, Total: ${gradeSummary.nilaiTotal}).`,
      });
    }

    if (action === 'RESET_PELANGGARAN') {
      const { pesertaUjianId } = body;
      if (!pesertaUjianId) {
        return NextResponse.json({ success: false, message: 'pesertaUjianId diperlukan' }, { status: 400 });
      }

      // 1. Hapus log pelanggaran peserta
      await prisma.logAktivitasUjian.deleteMany({
        where: {
          pesertaUjianId,
          aktivitas: {
            in: [
              'TAB_SWITCH_ALERT',
              'APP_SWITCH_ALERT',
              'WINDOW_BLUR',
              'FULLSCREEN_EXIT',
              'SCREEN_SHARE_STOPPED',
              'KEYBOARD_SHORTCUT_VIOLATION',
              'SECURITY_ALERT',
            ],
          },
        },
      });

      // 2. Jika status peserta TERKUNCI, buka kembali menjadi SEDANG_MENGERJAKAN
      const peserta = await prisma.pesertaUjian.findUnique({ where: { id: pesertaUjianId } });
      if (peserta && peserta.status === 'TERKUNCI') {
        await prisma.pesertaUjian.update({
          where: { id: pesertaUjianId },
          data: { status: 'SEDANG_MENGERJAKAN' },
        });
      }

      // 3. Catat log audit pengawas
      await prisma.logAktivitasUjian.create({
        data: {
          userId: user.userId,
          pesertaUjianId,
          aktivitas: 'RESET_PELANGGARAN',
          detail: `Proktor/Pengawas (${user.name}) mereset total pelanggaran menjadi 0 dan membuka kunci ujian siswa.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Pelanggaran berhasil direset ke 0 dan status ujian aktif kembali.',
      });
    }

    if (action === 'RESET_ALL_PELANGGARAN') {
      const { ujianId } = body;
      if (!ujianId) {
        return NextResponse.json({ success: false, message: 'ujianId diperlukan' }, { status: 400 });
      }

      const pesertaList = await prisma.pesertaUjian.findMany({
        where: { ujianId },
        select: { id: true },
      });
      const pesertaIds = pesertaList.map((p) => p.id);

      if (pesertaIds.length > 0) {
        await prisma.logAktivitasUjian.deleteMany({
          where: {
            pesertaUjianId: { in: pesertaIds },
            aktivitas: {
              in: [
                'TAB_SWITCH_ALERT',
                'APP_SWITCH_ALERT',
                'WINDOW_BLUR',
                'FULLSCREEN_EXIT',
                'SCREEN_SHARE_STOPPED',
                'KEYBOARD_SHORTCUT_VIOLATION',
                'SECURITY_ALERT',
              ],
            },
          },
        });

        await prisma.pesertaUjian.updateMany({
          where: { ujianId, status: 'TERKUNCI' },
          data: { status: 'SEDANG_MENGERJAKAN' },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil mereset pelanggaran untuk seluruh ${pesertaIds.length} peserta pada sesi ujian ini.`,
      });
    }

    if (action === 'ADD_TIME' || action === 'ADD_EXTRA_TIME') {
      const { pesertaUjianId, extraMinutes } = body;
      const extraSeconds = (Number(extraMinutes) || 15) * 60;
      const current = await prisma.pesertaUjian.findUnique({
        where: { id: pesertaUjianId },
        include: { ujian: true },
      });
      if (current) {
        const now = await getCalibratedServerNow();
        const baseRemaining = computeAccurateExamRemainingSeconds({
          now,
          durasiMenit: current.ujian.durasiMenit,
          jadwalSelesai: current.ujian.waktuSelesai,
          pesertaWaktuMulai: current.waktuMulai,
          pesertaSisaDetikTersimpan: current.sisaDetik,
          pesertaUpdatedAt: current.updatedAt,
          pesertaStatus: current.status,
        });
        await prisma.pesertaUjian.update({
          where: { id: pesertaUjianId },
          data: { sisaDetik: baseRemaining + extraSeconds },
        });
      }
      return NextResponse.json({ success: true, message: `Berhasil menambahkan waktu ${extraMinutes} menit.` });
    }

    return NextResponse.json({ success: false, message: 'Action tidak dikenal' }, { status: 400 });
  } catch (error: any) {
    console.error('Proktor POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
