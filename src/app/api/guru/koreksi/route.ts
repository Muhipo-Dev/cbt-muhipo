import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runAIEssayEvaluation, runAIMathIsianMatch } from '@/lib/pythonBridge';
import {
  matchIsianSingkat,
  evaluateEsaiOtomatis,
  evaluateExamSubmissionItems,
} from '@/lib/cbt-scoring';

function resolveAssignedSoalList<T extends { id: string }>(fullSoalList: T[], urutanSoalIds?: string | null): T[] {
  if (!urutanSoalIds) return fullSoalList;
  try {
    const orderIds = JSON.parse(urutanSoalIds);
    if (Array.isArray(orderIds) && orderIds.length > 0) {
      const orderSet = new Set(orderIds);
      const filtered = fullSoalList.filter((s) => orderSet.has(s.id));
      if (filtered.length > 0) return filtered;
    }
  } catch {
    // ignore malformed json
  }
  return fullSoalList;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ujianId = searchParams.get('ujianId');

    const ujianList = await prisma.ujian.findMany({
      where: {
        mataPelajaran: { status: { not: 'TERHAPUS' } },
      },
      include: {
        mataPelajaran: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeUjianId = ujianId || ujianList[0]?.id;
    let hasilList: any[] = [];
    let activeUjian: any = null;

    if (activeUjianId) {
      activeUjian = await prisma.ujian.findFirst({
        where: { id: activeUjianId },
        include: {
          mataPelajaran: {
            include: {
              soalList: {
                where: { tipeSoal: { in: ['ESAI', 'ISIAN'] } },
                orderBy: { nomorUrut: 'asc' },
              },
            },
          },
        },
      });

      if (activeUjian) {
        const peserta = await prisma.pesertaUjian.findMany({
          where: { ujianId: activeUjianId },
          include: {
            siswa: {
              include: { kelas: true },
            },
            jawabanPeserta: {
              include: {
                soal: true,
              },
            },
          },
          orderBy: { siswa: { name: 'asc' } },
        });

        hasilList = peserta.map((p) => ({
          ...p,
          nilaiPG: p.nilaiPG != null ? Number(Number(p.nilaiPG).toFixed(2)) : 0,
          nilaiEsai: p.nilaiEsai != null ? Number(Number(p.nilaiEsai).toFixed(2)) : 0,
          nilaiTotal: p.nilaiTotal != null ? Number(Number(p.nilaiTotal).toFixed(2)) : 0,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ujianList,
        activeUjian,
        hasilList,
      },
    });
  } catch (error: any) {
    console.error('Koreksi essay error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Evaluasi Otomatis & Simpan Koreksi Tulisan (Essay / Isian Singkat)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, jawabanPesertaId, skor, catatanKoreksi, pesertaUjianId, ujianId } = body;

    // 1. EVALUASI OTOMATIS PER BUTIR JAWABAN (ISIAN = EXACT MATCH PENUH/0, ESAI = PENUH/SETENGAH/0)
    if (action === 'AI_EVALUATE_ANSWER') {
      const { jawabanSiswa, rubrikKunci, tipeSoal, bobot, pertanyaan, geminiApiKey } = body;
      const safeBobot = Number(bobot) > 0 ? Number(bobot) : 1.0;

      if (tipeSoal === 'ISIAN') {
        // Isian WAJIB Exact Match (nilai penuh jika persis, 0 jika tidak persis)
        const isExactTs = matchIsianSingkat(jawabanSiswa || '', rubrikKunci || '');
        const pyRes = await runAIMathIsianMatch(jawabanSiswa || '', rubrikKunci || '');
        const isExact = isExactTs || Boolean(pyRes?.isBenar);
        const skorUsulan = isExact ? safeBobot : 0;

        return NextResponse.json({
          success: true,
          aiEvaluation: {
            isBenar: isExact,
            skorUsulan,
            similarity: isExact ? 100 : 0,
            kategori: isExact ? 'PENUH' : 'NOL',
            engine: pyRes?.engine || 'CBT Exact Isian Matcher',
            feedback: isExact
              ? `Exact Match! Jawaban isian sesuai persis dengan kunci -> Nilai Penuh (${skorUsulan}/${safeBobot}).`
              : 'Jawaban isian tidak sama persis dengan kunci -> Nilai 0.',
          },
        });
      }

      // Esai: Nilai Penuh (100%), Setengah (50%), atau Nol (0%)
      const tsEval = evaluateEsaiOtomatis(jawabanSiswa || '', rubrikKunci || '', safeBobot);
      const pyEval = await runAIEssayEvaluation(
        jawabanSiswa || '',
        rubrikKunci || '',
        safeBobot,
        pertanyaan || '',
        geminiApiKey || ''
      );

      // Utamakan Gemini AI Studio jika aktif, atau ambil hasil terbaik yang sudah terkuantisasi (0 / 50% / 100%)
      const usePy =
        pyEval &&
        typeof pyEval.skorUsulan === 'number' &&
        (String(pyEval.engine || '').includes('Gemini') || pyEval.skorUsulan > tsEval.skor);

      const rawProposed = usePy ? Number(pyEval.skorUsulan) : tsEval.skor;
      // Pastikan selalu mengikuti aturan 3 tingkat: Penuh (100%), Setengah (50%), atau 0
      let finalSkorUsulan = 0;
      let kategori: 'PENUH' | 'SETENGAH' | 'NOL' | 'BELUM_ADA_KUNCI' = tsEval.kategori;
      if (tsEval.kategori !== 'BELUM_ADA_KUNCI') {
        const ratio = safeBobot > 0 ? rawProposed / safeBobot : 0;
        if (ratio >= 0.75) {
          finalSkorUsulan = safeBobot;
          kategori = 'PENUH';
        } else if (ratio >= 0.35) {
          finalSkorUsulan = Number((safeBobot * 0.5).toFixed(2));
          kategori = 'SETENGAH';
        } else {
          finalSkorUsulan = 0;
          kategori = 'NOL';
        }
      }

      return NextResponse.json({
        success: true,
        aiEvaluation: {
          isBenar: finalSkorUsulan > 0,
          skorUsulan: finalSkorUsulan,
          kategori,
          similarity: usePy ? pyEval.similarity : tsEval.kemiripanPersen,
          engine: usePy ? pyEval.engine : 'CBT Auto-Rubric Engine (Penuh/Setengah/0)',
          feedback: usePy ? pyEval.feedback : tsEval.catatan,
        },
      });
    }

    // 2. PENILAIAN OTOMATIS ULANG MASSAL SELURUH PESERTA PADA JADWAL TES (ISIAN EXACT + ESAI PENUH/SETENGAH/0 + PG)
    if (action === 'AUTO_GRADE_UJIAN') {
      if (!ujianId && !pesertaUjianId) {
        return NextResponse.json(
          { success: false, message: 'Parameter ujianId atau pesertaUjianId diperlukan.' },
          { status: 400 }
        );
      }

      const targetPesertaList = await prisma.pesertaUjian.findMany({
        where: pesertaUjianId
          ? { id: pesertaUjianId }
          : {
              ujianId,
              status: { in: ['SELESAI', 'SEDANG_MENGERJAKAN', 'TERKUNCI'] },
            },
        include: {
          ujian: {
            include: {
              mataPelajaran: {
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

      let gradedCount = 0;
      for (const p of targetPesertaList) {
        const mapel = p.ujian.mataPelajaran;
        const assignedSoal = resolveAssignedSoalList(mapel.soalList, p.urutanSoalIds);
        const summary = evaluateExamSubmissionItems({
          soalList: assignedSoal,
          jawabanList: p.jawabanPeserta,
          nilaiMaksimal: mapel.nilaiMaksimal,
          nilaiMinimal: mapel.nilaiMinimal,
          preserveManualEssayScores: false,
        });

        for (const item of summary.updates) {
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
                pesertaUjianId: p.id,
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
          where: { id: p.id },
          data: {
            nilaiPG: summary.nilaiPG,
            nilaiEsai: summary.nilaiEsai,
            nilaiTotal: summary.nilaiTotal,
            isKoreksiSelesai: summary.isKoreksiSelesai,
          },
        });
        gradedCount++;
      }

      return NextResponse.json({
        success: true,
        gradedCount,
        message: `Penilaian otomatis berhasil diterapkan pada ${gradedCount} peserta (Isian Exact Match = Nilai Penuh/0, Esai = Penuh/Setengah/0).`,
      });
    }

    // 3. SIMPAN SKOR KOREKSI MANUAL / REKOMENDASI GURU DENGAN KALKULASI PROPORSIONAL 0..100 YANG KONSISTEN
    if (jawabanPesertaId) {
      await prisma.jawabanPeserta.update({
        where: { id: jawabanPesertaId },
        data: {
          skor: Math.max(0, Number(skor) || 0),
          ...(catatanKoreksi !== undefined ? { catatanKoreksi } : {}),
          isBenar: Number(skor) > 0,
        },
      });
    }

    if (pesertaUjianId) {
      const targetPeserta = await prisma.pesertaUjian.findUnique({
        where: { id: pesertaUjianId },
        include: {
          ujian: {
            include: {
              mataPelajaran: {
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

      if (targetPeserta) {
        const mapel = targetPeserta.ujian.mataPelajaran;
        const assignedSoal = resolveAssignedSoalList(mapel.soalList, targetPeserta.urutanSoalIds);
        const summary = evaluateExamSubmissionItems({
          soalList: assignedSoal,
          jawabanList: targetPeserta.jawabanPeserta,
          nilaiMaksimal: mapel.nilaiMaksimal,
          nilaiMinimal: mapel.nilaiMinimal,
          preserveManualEssayScores: true,
        });

        await prisma.pesertaUjian.update({
          where: { id: pesertaUjianId },
          data: {
            nilaiPG: summary.nilaiPG,
            nilaiEsai: summary.nilaiEsai,
            nilaiTotal: summary.nilaiTotal,
            isKoreksiSelesai: true,
          },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Nilai koreksi tulisan berhasil disimpan' });
  } catch (error: any) {
    console.error('Save koreksi error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
