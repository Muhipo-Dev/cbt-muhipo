import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    const safePathSegments = pathSegments.map((segment) => path.basename(segment));
    const filePath = path.join(process.cwd(), 'public', 'uploads', ...safePathSegments);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.wav') contentType = 'audio/wav';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error serving upload file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
