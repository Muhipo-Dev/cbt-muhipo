/**
 * Utility untuk kompresi gambar otomatis di sisi klien (browser) CBT
 * Memastikan file logo dan wallpaper background terkompres cepat dan siap disimpan.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'image/webp' | 'image/jpeg' | 'image/png';
}

export interface CompressResult {
  dataUrl: string;
  blob: Blob;
  file: File;
  originalSizeKb: number;
  compressedSizeKb: number;
  width: number;
  height: number;
}

export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    outputFormat = 'image/webp',
  } = options;

  const originalSizeKb = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          const bestRatio = Math.min(widthRatio, heightRatio);

          width = Math.round(width * bestRatio);
          height = Math.round(height * bestRatio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal memproses canvas gambar.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let format = outputFormat;
        let dataUrl = canvas.toDataURL(format, quality);

        if (format === 'image/webp' && (!dataUrl || !dataUrl.startsWith('data:image/webp'))) {
          format = 'image/jpeg';
          dataUrl = canvas.toDataURL(format, quality);
        }

        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || format;
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }

        const blob = new Blob([u8arr], { type: mime });
        const compressedSizeKb = Math.round(blob.size / 1024);

        const ext = mime === 'image/webp' ? '.webp' : mime === 'image/png' ? '.png' : '.jpg';
        const newFileName = file.name.replace(/\.[^/.]+$/, '') + '_compressed' + ext;
        const compressedFile = new File([blob], newFileName, { type: mime });

        resolve({
          dataUrl,
          blob,
          file: compressedFile,
          originalSizeKb,
          compressedSizeKb,
          width,
          height,
        });
      };

      img.onerror = () => reject(new Error('Gagal memuat file gambar.'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}
