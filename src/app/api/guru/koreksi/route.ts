import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['GURU', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ujianId = searchParams.get('ujianId');

    // Filter ujian: GURU hanya melihat ujian dari bank soal miliknya
    const ujianWhereClause: any = {};
    if (user.role === 'GURU') {
      ujianWhereClause.bankSoal = { pembuatId: user.userId };
    }

    const ujianList = await prisma.ujian.findMany({
      where: ujianWhereClause,
      include: {
        bankSoal: {
          include: { mataPelajaran: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeUjianId = ujianId || ujianList[0]?.id;
    let hasilList: any[] = [];
    let activeUjian: any = null;

    if (activeUjianId) {
      // Pastikan guru berhak mengakses ujian ini
      const singleUjianWhere: any = { id: activeUjianId };
      if (user.role === 'GURU') {
        singleUjianWhere.bankSoal = { pembuatId: user.userId };
      }

      activeUjian = await prisma.ujian.findFirst({
        where: singleUjianWhere,
        include: {
          bankSoal: {
            include: {
              mataPelajaran: true,
              soalList: {
                where: { tipeSoal: 'ESAI' },
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

        hasilList = peserta;
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

// POST: Simpan nilai koreksi Essay manual oleh guru
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['GURU', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jawabanPesertaId, skor, catatanKoreksi, pesertaUjianId } = body;

    if (jawabanPesertaId) {
      await prisma.jawabanPeserta.update({
        where: { id: jawabanPesertaId },
        data: {
          skor: Number(skor),
          catatanKoreksi,
          isBenar: Number(skor) > 0,
        },
      });
    }

    // Hitung ulang total nilai untuk peserta ujian ini
    if (pesertaUjianId) {
      const allJawaban = await prisma.jawabanPeserta.findMany({
        where: { pesertaUjianId },
        include: { soal: true },
      });

      let totalPG = 0;
      let totalEsai = 0;

      for (const j of allJawaban) {
        if (j.soal.tipeSoal === 'ESAI') {
          totalEsai += j.skor;
        } else {
          totalPG += j.skor;
        }
      }

      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: {
          nilaiPG: totalPG,
          nilaiEsai: totalEsai,
          nilaiTotal: totalPG + totalEsai,
          isKoreksiSelesai: true,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Nilai essay berhasil disimpan' });
  } catch (error: any) {
    console.error('Save koreksi error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
