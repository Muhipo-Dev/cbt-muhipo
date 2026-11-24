import { NextRequest, NextResponse } from 'next/server';
import { generateSEBConfigFile } from '@/lib/seb-config';

// GET: Unduh atau konfigurasi langsung Safe Exam Browser (.seb)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ujianId = searchParams.get('ujianId');
    
    // Ambil host dari request headers
    const host = request.headers.get('host') || 'localhost:4020';
    const proto = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');
    
    const startUrl = ujianId 
      ? `${proto}://${host}/siswa/ujian/${ujianId}`
      : `${proto}://${host}/login`;

    const sebXml = generateSEBConfigFile({
      startUrl,
      title: 'CBT MUHIPO - Safe Exam Browser',
      allowPreferencesWindow: false,
      allowReload: true,
    });

    return new NextResponse(sebXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-seb',
        'Content-Disposition': `attachment; filename="cbt-muhipo${ujianId ? `-${ujianId}` : ''}.seb"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating SEB config:', error);
    return NextResponse.json({ success: false, message: 'Gagal membuat file konfigurasi SEB' }, { status: 500 });
  }
}
