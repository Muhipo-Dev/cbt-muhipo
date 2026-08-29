import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Ambil pengaturan sistem publik / admin
export async function GET() {
  try {
    let settings = await (prisma as any).pengaturanSistem.findUnique({
      where: { id: 'default-settings' },
    });

    if (!settings) {
      settings = await (prisma as any).pengaturanSistem.create({
        data: {
          id: 'default-settings',
          schoolName: 'SMA Muhammadiyah 1 Ponorogo',
          appTitle: 'CBT MUHIPO',
          academicYear: '2026/2027',
          semester: 'Ganjil',
          timezone: 'Asia/Jakarta',
          serverLocation: 'Ponorogo, Jawa Timur',
          logoUrl: '/pic_logo.png',
          backgroundUrl: '/muhipo-front.jpg',
          timeSyncOffsetMs: 0,
        },
      });
    }

    const serverNow = new Date();

    return NextResponse.json({
      success: true,
      data: settings,
      serverTime: {
        timestamp: serverNow.getTime(),
        iso: serverNow.toISOString(),
        timeString: serverNow.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: settings.timezone || 'Asia/Jakarta',
        }),
        dateString: serverNow.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: settings.timezone || 'Asia/Jakarta',
        }),
      },
    });
  } catch (error: any) {
    console.error('Settings GET API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Update pengaturan sistem oleh Superadmin
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      schoolName,
      appTitle,
      academicYear,
      semester,
      timezone,
      serverLocation,
      logoUrl,
      backgroundUrl,
      timeSyncOffsetMs,
    } = body;

    const updated = await (prisma as any).pengaturanSistem.upsert({
      where: { id: 'default-settings' },
      update: {
        schoolName: schoolName?.trim(),
        appTitle: appTitle?.trim(),
        academicYear: academicYear?.trim(),
        semester: semester?.trim(),
        timezone: timezone?.trim(),
        serverLocation: serverLocation?.trim(),
        logoUrl: logoUrl || undefined,
        backgroundUrl: backgroundUrl || undefined,
        timeSyncOffsetMs: Number(timeSyncOffsetMs) || 0,
      },
      create: {
        id: 'default-settings',
        schoolName: schoolName?.trim() || 'SMA Muhammadiyah 1 Ponorogo',
        appTitle: appTitle?.trim() || 'CBT MUHIPO',
        academicYear: academicYear?.trim() || '2026/2027',
        semester: semester?.trim() || 'Ganjil',
        timezone: timezone?.trim() || 'Asia/Jakarta',
        serverLocation: serverLocation?.trim() || 'Ponorogo, Jawa Timur',
        logoUrl: logoUrl || '/pic_logo.png',
        backgroundUrl: backgroundUrl || '/muhipo-front.jpg',
        timeSyncOffsetMs: Number(timeSyncOffsetMs) || 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan sistem CBT berhasil disimpan!',
      data: updated,
    });
  } catch (error: any) {
    console.error('Settings POST API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
