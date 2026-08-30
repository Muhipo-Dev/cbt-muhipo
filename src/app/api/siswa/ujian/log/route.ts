import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
      },
    });

    // Jika pesertaUjianId tersedia, hitung akumulasi pelanggaran
    let totalPelanggaran = 0;
    let isLocked = false;

    if (pesertaUjianId) {
      totalPelanggaran = await prisma.logAktivitasUjian.count({
        where: {
          pesertaUjianId,
          aktivitas: {
            in: [
              'TAB_SWITCH_ALERT',
              'WINDOW_BLUR',
              'FULLSCREEN_EXIT',
              'SCREEN_SHARE_STOPPED',
              'KEYBOARD_SHORTCUT_VIOLATION',
              'SECURITY_ALERT',
            ],
          },
        },
      });

      // Jika pelanggaran fatal (misal lebih dari 5 kali), kunci ujian otomatis
      if (totalPelanggaran >= 5) {
        await prisma.pesertaUjian.update({
          where: { id: pesertaUjianId },
          data: { status: 'TERKUNCI' },
        });
        isLocked = true;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        logId: logEntry.id,
        totalPelanggaran,
        isLocked,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
