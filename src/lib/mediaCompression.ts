import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export const MAX_MEDIA_FILE_SIZE = 300 * 1024 * 1024; // 300 MB maksimal

export interface MediaCompressionResult {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  originalSize: number;
  compressedSize: number;
  isCompressed: boolean;
  width?: number;
  height?: number;
}

/**
 * Kompresi gambar menggunakan Sharp (server-side):
 * - Mempertahankan resolusi asli (tanpa resize downscale paksa)
 * - Mengompresi efisien menggunakan WebP / MozJPEG / PNG optimizer
 * - Menghapus metadata EXIF berlebih yang memperberat ukuran file
 * - Tetap menjaga ketajaman gambar agar teks / diagram soal tetap terbaca jelas
 */
export async function compressImageBuffer(
  inputBuffer: Buffer,
  originalExt: string
): Promise<MediaCompressionResult> {
  const originalSize = inputBuffer.length;
  const cleanExt = originalExt.toLowerCase().replace('.', '');

  // Lewati kompresi jika format vektor SVG atau animasi GIF (agar animasi tidak rusak)
  if (cleanExt === 'svg' || cleanExt === 'gif') {
    return {
      buffer: inputBuffer,
      mimeType: cleanExt === 'svg' ? 'image/svg+xml' : 'image/gif',
      ext: `.${cleanExt}`,
      originalSize,
      compressedSize: originalSize,
      isCompressed: false,
    };
  }

  try {
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    let pipeline = sharp(inputBuffer).rotate(); // auto-orient berdasarkan EXIF lalu strip EXIF

    let outputBuffer: Buffer;
    let finalExt = `.${cleanExt}`;
    let finalMime = 'image/jpeg';

    if (cleanExt === 'png') {
      // Kompres PNG tanpa mengurangi resolusi (lossless/near-lossless palette)
      outputBuffer = await pipeline
        .png({
          quality: 85,
          compressionLevel: 9,
          palette: true,
          effort: 7,
        })
        .toBuffer();
      finalMime = 'image/png';
      finalExt = '.png';
    } else if (cleanExt === 'webp') {
      // Kompres WebP mempertahankan dimensi asli dengan kualitas tinggi
      outputBuffer = await pipeline
        .webp({
          quality: 82,
          effort: 5,
        })
        .toBuffer();
      finalMime = 'image/webp';
      finalExt = '.webp';
    } else {
      // JPG / JPEG
      outputBuffer = await pipeline
        .jpeg({
          quality: 82,
          mozjpeg: true,
          chromaSubsampling: '4:4:4', // preserve color sharpness untuk diagram/soal
        })
        .toBuffer();
      finalMime = 'image/jpeg';
      finalExt = '.jpg';
    }

    // Jika hasil kompresi ternyata lebih besar dari file asli (kasus gambar sangat kecil), gunakan yang asli
    const useCompressed = outputBuffer.length < originalSize;
    const finalBuffer = useCompressed ? outputBuffer : inputBuffer;

    return {
      buffer: finalBuffer,
      mimeType: useCompressed ? finalMime : (cleanExt === 'png' ? 'image/png' : 'image/jpeg'),
      ext: finalExt,
      originalSize,
      compressedSize: finalBuffer.length,
      isCompressed: useCompressed,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (err) {
    console.warn('[compressImageBuffer] Gagal mengompres gambar dengan Sharp, menggunakan buffer asli:', err);
    return {
      buffer: inputBuffer,
      mimeType: cleanExt === 'png' ? 'image/png' : 'image/jpeg',
      ext: `.${cleanExt}`,
      originalSize,
      compressedSize: originalSize,
      isCompressed: false,
    };
  }
}

/**
 * Memproses string konten soal / teks (misal pertanyaan, opsi jawaban, matching)
 * yang mengandung base64 data URL:
 * data:image/(png|jpeg|webp|jpg);base64,...
 * Mengonversinya menjadi file lokal di /uploads/ yang sudah terkompresi Sharp,
 * sehingga database tidak bloat dan gambar dimuat sangat cepat melalui CDN/HTTP cache!
 */
export async function extractAndCompressBase64Media(content: string): Promise<string> {
  if (!content || typeof content !== 'string') return content;

  // Regex mencari data URI gambar base64
  const base64Regex = /data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)/g;

  let match: RegExpExecArray | null;
  const matches: { full: string; type: string; base64: string }[] = [];

  while ((match = base64Regex.exec(content)) !== null) {
    matches.push({
      full: match[0],
      type: match[1],
      base64: match[2],
    });
  }

  if (matches.length === 0) return content;

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  let updatedContent = content;

  for (const item of matches) {
    try {
      const buffer = Buffer.from(item.base64, 'base64');
      const compressed = await compressImageBuffer(buffer, item.type);

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const filename = `soal_media_${timestamp}_${randomStr}${compressed.ext}`;
      const destPath = path.join(uploadDir, filename);

      fs.writeFileSync(destPath, compressed.buffer);

      const mediaUrl = `/uploads/${filename}`;
      // Gantikan base64 panjang dengan URL relatif terkompresi
      updatedContent = updatedContent.replace(item.full, mediaUrl);
    } catch (err) {
      console.error('[extractAndCompressBase64Media] Gagal memproses base64 gambar:', err);
    }
  }

  return updatedContent;
}

/**
 * Mengunduh gambar eksternal (http:// atau https://) secara otomatis ke /uploads/
 * dan mengompresinya agar soal dapat ditampilkan secara offline melalui jaringan intranet sekolah.
 */
export async function cacheExternalImagesToLocal(content: string): Promise<string> {
  if (!content || typeof content !== 'string') return content;

  const urlRegex = /(?:src=["']|!\[[^\]]*\]\()(https?:\/\/[^"')\s>]+)/gi;
  const urls = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[1];
    if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      urls.add(url);
    }
  }

  if (urls.size === 0) return content;

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  let updatedContent = content;

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) continue;

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const extFromType = contentType.split('/')[1]?.split(';')[0] || 'png';
      const compressed = await compressImageBuffer(buffer, extFromType);

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const filename = `soal_ext_${timestamp}_${randomStr}${compressed.ext}`;
      const destPath = path.join(uploadDir, filename);

      fs.writeFileSync(destPath, compressed.buffer);
      const localUrl = `/uploads/${filename}`;

      updatedContent = updatedContent.split(url).join(localUrl);
    } catch {
      // Abaikan jika server offline atau URL gagal diunduh; biarkan URL asli
    }
  }

  return updatedContent;
}

