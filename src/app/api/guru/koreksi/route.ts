import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ujianId = searchParams.get('ujianId');

    let ujianList = await prisma.ujian.findMany({
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

// POST: Simpan nilai koreksi Tulisan (Essay / Isian Singkat) manual oleh guru
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
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

    if (pesertaUjianId) {
      const allJawaban = await prisma.jawabanPeserta.findMany({
        where: { pesertaUjianId },
        include: { soal: true },
      });

      let totalPG = 0;
      let totalTulisan = 0;

      for (const j of allJawaban) {
        if (j.soal.tipeSoal === 'ESAI' || j.soal.tipeSoal === 'ISIAN') {
          totalTulisan += j.skor;
        } else {
          totalPG += j.skor;
        }
      }

      const finalPG = Number(totalPG.toFixed(2));
      const finalTulisan = Number(totalTulisan.toFixed(2));
      const finalTotal = Number((finalPG + finalTulisan).toFixed(2));

      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: {
          nilaiPG: finalPG,
          nilaiEsai: finalTulisan,
          nilaiTotal: finalTotal,
          isKoreksiSelesai: true,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Nilai koreksi tulisan berhasil disimpan' });
  } catch (error: any) {
    console.error('Save koreksi error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
