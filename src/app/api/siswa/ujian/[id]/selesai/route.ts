import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatusPeserta, TipeSoal } from '@/lib/enums';
import {
  matchIsianSingkat,
  matchPGKompleks,
  matchMenjodohkan,
} from '@/lib/cbt-scoring';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'SISWA') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: ujianId } = await context.params;

    const pesertaUjian = await prisma.pesertaUjian.findUnique({
      where: {
        ujianId_siswaId: {
          ujianId,
          siswaId: user.userId,
        },
      },
      include: {
        ujian: {
          include: {
            mataPelajaran: {
              include: {
                soalList: {
                  include: {
                    opsiJawaban: true,
                  },
                },
              },
            },
          },
        },
        jawabanPeserta: true,
      },
    });

    if (!pesertaUjian) {
      return NextResponse.json({ success: false, message: 'Data peserta tidak ditemukan' }, { status: 404 });
    }

    let isAuto = false;
    try {
      const body = await request.json();
      if (body && body.isAuto) isAuto = true;
    } catch (e) {
      // no body or non-json
    }

    // Auto-Grading Soal Objektif & Isian Langsung dari Topik / Mata Pelajaran
    let soalList = pesertaUjian.ujian.mataPelajaran.soalList;
    if (pesertaUjian.urutanSoalIds) {
      try {
        const orderIds = JSON.parse(pesertaUjian.urutanSoalIds);
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          const orderSet = new Set(orderIds);
          soalList = soalList.filter((s) => orderSet.has(s.id));
        }
      } catch (e) {
        // use default soalList
      }
    }
    const jawabanMap = new Map(pesertaUjian.jawabanPeserta.map((j) => [j.soalId, j]));

    // Validasi Minimal Jawaban Terisi (Kecuali jika waktu ujian habis otomatis)
    const minJawaban = (pesertaUjian.ujian as any).minJawaban;
    if (!isAuto && minJawaban && minJawaban > 0) {
      const jumlahTerjawab = soalList.filter((s) => {
        const j = jawabanMap.get(s.id);
        if (!j || !j.jawabanDipilih) return false;
        const val = j.jawabanDipilih.trim();
        if (!val || val === '[]' || val === '{}') return false;
        return true;
      }).length;

      if (jumlahTerjawab < minJawaban) {
        return NextResponse.json(
          {
            success: false,
            message: `Syarat minimal jawaban belum terpenuhi! Anda baru menjawab ${jumlahTerjawab} dari minimal ${minJawaban} butir soal yang diwajibkan.`,
          },
          { status: 400 }
        );
      }
    }

    let totalNilaiPG = 0;
    let totalNilaiEsai = 0;
    let maxNilaiObjektif = 0;
    let totalBobotEsai = 0;
    let adaSoalEsai = false;

    for (const soal of soalList) {
      const jawaban = jawabanMap.get(soal.id);
      const bobot = soal.bobot || 1.0;

      if (soal.tipeSoal === TipeSoal.PG || soal.tipeSoal === TipeSoal.BENAR_SALAH) {
        maxNilaiObjektif += bobot;
        const opsiBenar = soal.opsiJawaban.find((o) => o.isBenar);
        const isBenar = Boolean(jawaban && opsiBenar && jawaban.jawabanDipilih === opsiBenar.id);
        const skor = isBenar ? bobot : 0;

        if (isBenar) totalNilaiPG += bobot;

        if (jawaban) {
          await prisma.jawabanPeserta.update({
            where: { id: jawaban.id },
            data: { isBenar, skor },
          });
        }
      } else if (soal.tipeSoal === TipeSoal.PG_KOMPLEKS) {
        maxNilaiObjektif += bobot;
        let chosenIds: string[] = [];
        try {
          if (jawaban?.jawabanDipilih) {
            chosenIds = JSON.parse(jawaban.jawabanDipilih);
          }
        } catch (e) {
          chosenIds = [];
        }

        const matchResult = matchPGKompleks(chosenIds, soal.opsiJawaban, bobot);
        totalNilaiPG += matchResult.skor;

        if (jawaban) {
          await prisma.jawabanPeserta.update({
            where: { id: jawaban.id },
            data: { isBenar: matchResult.isBenar, skor: matchResult.skor },
          });
        }
      } else if (soal.tipeSoal === TipeSoal.ISIAN) {
        maxNilaiObjektif += bobot;
        const isBenar = matchIsianSingkat(jawaban?.jawabanDipilih || '', soal.kunciJawabanTeks || '');
        const skor = isBenar ? bobot : 0;
        if (isBenar) totalNilaiPG += bobot;

        if (jawaban) {
          await prisma.jawabanPeserta.update({
            where: { id: jawaban.id },
            data: { isBenar, skor },
          });
        }
      } else if (soal.tipeSoal === TipeSoal.MENJODOHKAN) {
        maxNilaiObjektif += bobot;
        const matchResult = matchMenjodohkan(jawaban?.jawabanDipilih || undefined, soal.matchingData || undefined, bobot);
        totalNilaiPG += matchResult.skor;

        if (jawaban) {
          await prisma.jawabanPeserta.update({
            where: { id: jawaban.id },
            data: { isBenar: matchResult.isBenar, skor: matchResult.skor },
          });
        }
      } else if (soal.tipeSoal === TipeSoal.ESAI) {
        adaSoalEsai = true;
        totalBobotEsai += bobot;
      }
    }

    const mapel = pesertaUjian.ujian.mataPelajaran;
    const maxNilai = mapel.nilaiMaksimal ?? 100.0;
    const minNilai = mapel.nilaiMinimal ?? 0.0;

    const totalBobotAssigned = maxNilaiObjektif + totalBobotEsai;
    let rawTotalPG = totalNilaiPG;
    let rawTotalEsai = totalNilaiEsai;

    if (totalBobotAssigned > 0) {
      rawTotalPG = Number(((totalNilaiPG / totalBobotAssigned) * maxNilai).toFixed(2));
      rawTotalEsai = Number(((totalNilaiEsai / totalBobotAssigned) * maxNilai).toFixed(2));
    }

    const finalNilaiPG = Math.min(maxNilai, Math.max(minNilai, rawTotalPG));
    const finalNilaiEsai = Math.min(maxNilai, Math.max(minNilai, rawTotalEsai));
    const rawTotal = Number((finalNilaiPG + finalNilaiEsai).toFixed(2));
    const nilaiTotal = Math.min(maxNilai, Math.max(minNilai, rawTotal));

    await prisma.pesertaUjian.update({
      where: { id: pesertaUjian.id },
      data: {
        status: StatusPeserta.SELESAI,
        waktuSelesai: new Date(),
        sisaDetik: 0,
        nilaiPG: finalNilaiPG,
        nilaiEsai: finalNilaiEsai,
        nilaiTotal,
        isKoreksiSelesai: !adaSoalEsai,
      },
    });

    await prisma.logAktivitasUjian.create({
      data: {
        userId: user.userId,
        pesertaUjianId: pesertaUjian.id,
        aktivitas: 'SELESAI_UJIAN',
        detail: `Siswa menyelesaikan ujian. Nilai PG: ${finalNilaiPG}, Nilai Isian/Esai: ${finalNilaiEsai}, Total: ${nilaiTotal}.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ujian berhasil diselesaikan dan disimpan.',
      data: {
        nilaiPG: finalNilaiPG,
        nilaiEsai: finalNilaiEsai,
        nilaiTotal,
        tampilkanHasil: pesertaUjian.ujian.tampilkanHasil,
      },
    });
  } catch (error: any) {
    console.error('Selesai ujian error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
