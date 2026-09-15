import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

function saveBase64ToFile(dataUrl: string | undefined | null, filePrefix: string): string | undefined {
  if (!dataUrl) return undefined;
  if (!dataUrl.startsWith('data:image/')) return dataUrl; // Already a static URL or path

  try {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) return dataUrl;

    const meta = dataUrl.substring(0, commaIndex);
    const base64Data = dataUrl.substring(commaIndex + 1);

    const mimeMatch = meta.match(/data:image\/([a-zA-Z0-9+.-]+);base64/i);
    let ext = 'webp';
    if (mimeMatch && mimeMatch[1]) {
      ext = mimeMatch[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      else if (ext === 'svg+xml') ext = 'svg';
    }

    const buffer = Buffer.from(base64Data, 'base64');

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${filePrefix}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error(`Failed to save base64 to file (${filePrefix}):`, err);
    return dataUrl;
  }
}

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

    const response = NextResponse.json({
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

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch (error: any) {
    console.error('Settings GET fallback error:', error?.message);
    const serverNow = new Date();
    return NextResponse.json({
      success: true,
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
      serverTime: {
        timestamp: serverNow.getTime(),
        iso: serverNow.toISOString(),
        timeString: serverNow.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta',
        }),
        dateString: serverNow.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        }),
      },
    });
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
    let {
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

    // Simpan file base64 ke disk public/uploads/ agar permanen dan cepat di-cache browser
    if (logoUrl && logoUrl.startsWith('data:image/')) {
      logoUrl = saveBase64ToFile(logoUrl, 'logo-cbt');
    }
    if (backgroundUrl && backgroundUrl.startsWith('data:image/')) {
      backgroundUrl = saveBase64ToFile(backgroundUrl, 'wallpaper-cbt');
    }

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
      message: 'Pengaturan sistem CBT & aset berkas berhasil disimpan permanen!',
      data: updated,
    });
  } catch (error: any) {
    console.error('Settings POST API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
