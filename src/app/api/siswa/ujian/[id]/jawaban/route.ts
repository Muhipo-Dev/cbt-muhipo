import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatusPeserta } from '@/lib/enums';

// API Autosave Jawaban Siswa
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
    const body = await request.json();
    const { soalId, jawabanDipilih, raguRagu, sisaDetik } = body;

    const pesertaUjian = await prisma.pesertaUjian.findUnique({
      where: {
        ujianId_siswaId: {
          ujianId,
          siswaId: user.userId,
        },
      },
      include: {
        ujian: true,
      },
    });

    if (!pesertaUjian || pesertaUjian.status !== StatusPeserta.SEDANG_MENGERJAKAN) {
      return NextResponse.json(
        { success: false, message: 'Sesi ujian tidak sedang aktif' },
        { status: 400 }
      );
    }

    // Upsert Jawaban Peserta
    await prisma.jawabanPeserta.upsert({
      where: {
        pesertaUjianId_soalId: {
          pesertaUjianId: pesertaUjian.id,
          soalId,
        },
      },
      update: {
        jawabanDipilih: jawabanDipilih !== undefined ? String(jawabanDipilih) : undefined,
        raguRagu: raguRagu !== undefined ? Boolean(raguRagu) : undefined,
      },
      create: {
        pesertaUjianId: pesertaUjian.id,
        soalId,
        jawabanDipilih: jawabanDipilih !== undefined ? String(jawabanDipilih) : '',
        raguRagu: raguRagu !== undefined ? Boolean(raguRagu) : false,
      },
    });

    // Update sisa detik
    if (sisaDetik !== undefined) {
      await prisma.pesertaUjian.update({
        where: { id: pesertaUjian.id },
        data: { sisaDetik: Number(sisaDetik) },
      });
    }

    return NextResponse.json({ success: true, message: 'Jawaban tersimpan' });
  } catch (error: any) {
    console.error('Save jawaban error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
