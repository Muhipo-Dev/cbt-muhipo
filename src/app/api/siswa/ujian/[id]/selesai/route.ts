import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatusPeserta, TipeSoal } from '@/lib/enums';
import {
  evaluateExamSubmissionItems,
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
    let clientJawabanMap: Record<string, { jawabanDipilih?: string; raguRagu?: boolean }> | null = null;
    try {
      const body = await request.json();
      if (body) {
        if (body.isAuto) isAuto = true;
        if (body.jawabanMap && typeof body.jawabanMap === 'object') {
          clientJawabanMap = body.jawabanMap;
        }
      }
    } catch (e) {
      // no body or non-json
    }

    // Jika client mengirim payload jawabanMap lengkap saat submit (termasuk soal terakhir yang baru saja dijawab),
    // simpan / upsert seketika ke database sebelum penilaian agar tidak ada soal yang tertinggal!
    if (clientJawabanMap && Object.keys(clientJawabanMap).length > 0) {
      const existingDbJawaban = new Map(pesertaUjian.jawabanPeserta.map((j) => [j.soalId, j]));
      for (const [soalId, item] of Object.entries(clientJawabanMap)) {
        if (!soalId || !item) continue;
        const chosenVal = item.jawabanDipilih !== undefined ? String(item.jawabanDipilih) : '';
        const raguVal = Boolean(item.raguRagu);

        const existing = existingDbJawaban.get(soalId);
        if (existing) {
          // Update jika berbeda atau belum terisi di DB
          if (existing.jawabanDipilih !== chosenVal || existing.raguRagu !== raguVal) {
            await prisma.jawabanPeserta.update({
              where: { id: existing.id },
              data: {
                jawabanDipilih: chosenVal,
                raguRagu: raguVal,
              },
            });
            existing.jawabanDipilih = chosenVal;
            existing.raguRagu = raguVal;
          }
        } else {
          // Buat record baru jika belum ada di DB
          const created = await prisma.jawabanPeserta.create({
            data: {
              pesertaUjianId: pesertaUjian.id,
              soalId,
              jawabanDipilih: chosenVal,
              raguRagu: raguVal,
            },
          });
          existingDbJawaban.set(soalId, created as any);
          pesertaUjian.jawabanPeserta.push(created as any);
        }
      }
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

    // Validasi Wajib Mengisi Seluruh Soal (atau Minimal Jawaban jika disetel khusus) sebelum menyelesaikan ujian!
    // Pengecualian hanya ketika waktu habis otomatis (isAuto === true) atau diselesaikan paksa oleh Proktor.
    if (!isAuto) {
      const totalSoalWajib =
        (pesertaUjian.ujian as any).minJawaban && Number((pesertaUjian.ujian as any).minJawaban) > 0
          ? Math.min(soalList.length, Number((pesertaUjian.ujian as any).minJawaban))
          : soalList.length;

      const jumlahTerjawab = soalList.filter((s) => {
        const j = jawabanMap.get(s.id);
        if (!j || !j.jawabanDipilih) return false;
        const val = j.jawabanDipilih.trim();
        if (!val || val === '[]' || val === '{}') return false;
        if (s.tipeSoal === TipeSoal.MENJODOHKAN && s.matchingData) {
          try {
            const expectedPairs = JSON.parse(s.matchingData);
            const answeredPairs = JSON.parse(val);
            if (Array.isArray(expectedPairs) && expectedPairs.length > 0 && typeof answeredPairs === 'object' && answeredPairs !== null) {
              return Object.keys(answeredPairs).filter((k) => Boolean(answeredPairs[k])).length >= expectedPairs.length;
            }
          } catch {}
        }
        return true;
      }).length;

      if (jumlahTerjawab < totalSoalWajib) {
        const belumDijawab = totalSoalWajib - jumlahTerjawab;
        return NextResponse.json(
          {
            success: false,
            message: `Belum dapat menyelesaikan ujian! Anda wajib mengisi seluruh soal terlebih dahulu (masih ada ${belumDijawab} soal yang belum dijawab dari ${totalSoalWajib} soal).`,
          },
          { status: 400 }
        );
      }
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
            pesertaUjianId: pesertaUjian.id,
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

    const finalNilaiPG = gradeSummary.nilaiPG;
    const finalNilaiEsai = gradeSummary.nilaiEsai;
    const nilaiTotal = gradeSummary.nilaiTotal;

    await prisma.pesertaUjian.update({
      where: { id: pesertaUjian.id },
      data: {
        status: StatusPeserta.SELESAI,
        waktuSelesai: new Date(),
        sisaDetik: 0,
        nilaiPG: finalNilaiPG,
        nilaiEsai: finalNilaiEsai,
        nilaiTotal,
        isKoreksiSelesai: gradeSummary.isKoreksiSelesai,
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
