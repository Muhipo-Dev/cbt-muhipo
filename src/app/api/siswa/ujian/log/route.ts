import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { evaluateExamSubmissionItems } from '@/lib/cbt-scoring';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pesertaUjianId, aktivitas, detail } = body;

    const logEntry = await prisma.logAktivitasUjian.create({
      data: {
        userId: user.userId,
        pesertaUjianId: pesertaUjianId || null,
        aktivitas: aktivitas || 'SECURITY_ALERT',
        detail: detail || 'Aktivitas mencurigakan / pergantian tab / keluar fullscreen',
      } as any,
    });

    // Jika pesertaUjianId tersedia, hitung akumulasi pelanggaran
    let totalPelanggaran = 0;
    let isLocked = false;
    let nilaiTotalSaved: number | null = null;

    if (pesertaUjianId) {
      totalPelanggaran = await prisma.logAktivitasUjian.count({
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

      // Kunci ujian otomatis jika akumulasi pelanggaran mencapai 5 kali atau lebih, dan hitung nilai yang sudah masuk
      if (totalPelanggaran >= 5) {
        const peserta = await prisma.pesertaUjian.findUnique({
          where: { id: pesertaUjianId },
          include: {
            ujian: {
              include: {
                mataPelajaran: true,
              },
            },
            jawabanPeserta: true,
          },
        });

        let nilaiPG = 0;
        let nilaiEsai = 0;
        let nilaiTotal = 0;
        let isKoreksiSelesai = false;

        if (peserta && peserta.status !== 'SELESAI') {
          let soalIds: string[] = [];
          try {
            if (peserta.urutanSoalIds) {
              soalIds = JSON.parse(peserta.urutanSoalIds);
            }
          } catch {
            soalIds = [];
          }

          const soalList = await prisma.soal.findMany({
            where: soalIds.length > 0 ? { id: { in: soalIds } } : { mataPelajaranId: peserta.ujian.mataPelajaranId },
            include: { opsiJawaban: true },
          });

          const gradeSummary = evaluateExamSubmissionItems({
            soalList,
            jawabanList: peserta.jawabanPeserta,
            nilaiMaksimal: peserta.ujian.mataPelajaran.nilaiMaksimal,
            nilaiMinimal: peserta.ujian.mataPelajaran.nilaiMinimal,
            modePenilaian: (peserta.ujian as any).modePenilaian,
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
            }
          }

          nilaiPG = gradeSummary.nilaiPG;
          nilaiEsai = gradeSummary.nilaiEsai;
          nilaiTotal = gradeSummary.nilaiTotal;
          nilaiTotalSaved = nilaiTotal;
          isKoreksiSelesai = gradeSummary.isKoreksiSelesai;

          await prisma.pesertaUjian.update({
            where: { id: pesertaUjianId },
            data: {
              status: 'TERKUNCI',
              waktuSelesai: new Date(),
              nilaiPG,
              nilaiEsai,
              nilaiTotal,
              isKoreksiSelesai,
            },
          });
        }
        isLocked = true;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        logId: logEntry.id,
        totalPelanggaran,
        isLocked,
        nilaiTotal: nilaiTotalSaved,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
