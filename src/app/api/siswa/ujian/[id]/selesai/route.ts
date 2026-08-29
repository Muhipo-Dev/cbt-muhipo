import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatusPeserta, TipeSoal } from '@prisma/client';

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
            bankSoal: {
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

    // Auto-Grading Soal Objektif (PG, PG Kompleks, Benar/Salah, Isian Singkat)
    const soalList = pesertaUjian.ujian.bankSoal.soalList;
    const jawabanMap = new Map(pesertaUjian.jawabanPeserta.map((j) => [j.soalId, j]));

    let totalNilaiPG = 0;
    let maxNilaiObjektif = 0;
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
        // Check array IDs
        let chosenIds: string[] = [];
        try {
          if (jawaban?.jawabanDipilih) {
            chosenIds = JSON.parse(jawaban.jawabanDipilih);
          }
        } catch (e) {
          chosenIds = [];
        }

        const correctOpsiIds = soal.opsiJawaban.filter((o) => o.isBenar).map((o) => o.id);
        // Cek jika pilihan identik
        const isIdentical =
          chosenIds.length === correctOpsiIds.length &&
          chosenIds.every((id) => correctOpsiIds.includes(id));

        const skor = isIdentical ? bobot : 0;
        if (isIdentical) totalNilaiPG += bobot;

        if (jawaban) {
          await prisma.jawabanPeserta.update({
            where: { id: jawaban.id },
            data: { isBenar: isIdentical, skor },
          });
        }
      } else if (soal.tipeSoal === TipeSoal.ISIAN) {
        maxNilaiObjektif += bobot;
        const kunci = (soal.kunciJawabanTeks || '').trim().toLowerCase();
        const jawab = (jawaban?.jawabanDipilih || '').trim().toLowerCase();
        const isBenar = kunci.length > 0 && kunci === jawab;
        const skor = isBenar ? bobot : 0;
        if (isBenar) totalNilaiPG += bobot;

        if (jawaban) {
          await prisma.jawabanPeserta.update({
            where: { id: jawaban.id },
            data: { isBenar, skor },
          });
        }
      } else if (soal.tipeSoal === TipeSoal.ESAI) {
        adaSoalEsai = true;
      }
    }

    const bankSoal = pesertaUjian.ujian.bankSoal;
    const maxNilai = bankSoal.nilaiMaksimal ?? 100.0;
    const minNilai = bankSoal.nilaiMinimal ?? 0.0;

    // Pastikan nilai tidak melebihi nilai maksimal dan di-round 2 digit desimal
    const rawTotalPG = Number(totalNilaiPG.toFixed(2));
    const finalNilaiPG = Math.min(maxNilai, Math.max(minNilai, rawTotalPG));
    const nilaiTotal = finalNilaiPG;

    // Update status peserta Ujian
    await prisma.pesertaUjian.update({
      where: { id: pesertaUjian.id },
      data: {
        status: StatusPeserta.SELESAI,
        waktuSelesai: new Date(),
        sisaDetik: 0,
        nilaiPG: finalNilaiPG,
        nilaiTotal,
        isKoreksiSelesai: !adaSoalEsai, // Jika tidak ada essay, koreksi otomatis selesai 100%
      },
    });

    // Log selesai ujian
    await prisma.logAktivitasUjian.create({
      data: {
        userId: user.userId,
        pesertaUjianId: pesertaUjian.id,
        aktivitas: 'SELESAI_UJIAN',
        detail: `Siswa menyelesaikan ujian. Nilai PG/Objektif: ${totalNilaiPG}.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ujian berhasil diselesaikan dan disimpan.',
      data: {
        nilaiPG: totalNilaiPG,
        tampilkanHasil: pesertaUjian.ujian.tampilkanHasil,
      },
    });
  } catch (error: any) {
    console.error('Selesai ujian error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
