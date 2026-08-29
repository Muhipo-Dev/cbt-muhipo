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

    await prisma.logAktivitasUjian.create({
      data: {
        userId: user.userId,
        pesertaUjianId: pesertaUjianId || null,
        aktivitas: aktivitas || 'SECURITY_ALERT',
        detail: detail || 'Aktivitas mencurigakan / pergantian tab / keluar fullscreen',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
