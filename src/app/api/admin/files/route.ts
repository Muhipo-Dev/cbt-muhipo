import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Pastikan direktori uploads tersedia
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!fs.existsSync(UPLOAD_DIR)) {
      return NextResponse.json({ success: true, data: [] });
    }

    const fileNames = fs.readdirSync(UPLOAD_DIR);
    const fileList = fileNames
      .filter((name) => !name.startsWith('.'))
      .map((name) => {
        const filePath = path.join(UPLOAD_DIR, name);
        const stats = fs.statSync(filePath);
        const ext = path.extname(name).toLowerCase();
        
        let type: 'image' | 'audio' | 'video' | 'doc' | 'other' = 'other';
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
          type = 'image';
        } else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext)) {
          type = 'audio';
        } else if (['.mp4', '.webm', '.ogg'].includes(ext)) {
          type = 'video';
        } else if (['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext)) {
          type = 'doc';
        }

        return {
          name,
          url: `/uploads/${encodeURIComponent(name)}`,
          size: stats.size,
          sizeFormatted: (stats.size / 1024).toFixed(1) + ' KB',
          createdAt: stats.birthtime || stats.mtime,
          type,
          ext,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, data: fileList });
  } catch (error: any) {
    console.error('File manager error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membaca direktori file: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      // Periksa single file field 'file'
      const singleFile = formData.get('file') as File | null;
      if (singleFile) {
        files.push(singleFile);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada file yang diunggah.' },
        { status: 400 }
      );
    }

    const savedFiles: any[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const uniqueName = `${timestamp}_${originalName}`;
      const filePath = path.join(UPLOAD_DIR, uniqueName);

      fs.writeFileSync(filePath, buffer);

      const ext = path.extname(uniqueName).toLowerCase();
      let type: 'image' | 'audio' | 'video' | 'doc' | 'other' = 'other';
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
        type = 'image';
      } else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext)) {
        type = 'audio';
      } else if (['.mp4', '.webm', '.ogg'].includes(ext)) {
        type = 'video';
      }

      savedFiles.push({
        name: uniqueName,
        url: `/uploads/${encodeURIComponent(uniqueName)}`,
        size: buffer.length,
        sizeFormatted: (buffer.length / 1024).toFixed(1) + ' KB',
        type,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengunggah ${savedFiles.length} file!`,
      data: savedFiles,
    });
  } catch (error: any) {
    console.error('Upload file error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengunggah file: ' + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json(
        { success: false, message: 'Nama file wajib disertakan' },
        { status: 400 }
      );
    }

    // Hindari path traversal
    const safeFileName = path.basename(fileName);
    const filePath = path.join(UPLOAD_DIR, safeFileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({
        success: true,
        message: `File ${safeFileName} berhasil dihapus.`,
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'File tidak ditemukan.' },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus file: ' + error.message },
      { status: 500 }
    );
  }
}
