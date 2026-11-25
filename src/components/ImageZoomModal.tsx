'use client';

import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export function ImageZoomModal() {
  const [activeImg, setActiveImg] = useState<{ src: string; alt: string } | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Tangkap klik pada gambar di dalam konten soal atau kelas cbt-zoomable-media
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'IMG' &&
        (target.closest('.prose') ||
          target.closest('.cbt-exam-lockdown') ||
          target.classList.contains('cbt-zoomable-media'))
      ) {
        const img = target as HTMLImageElement;
        // Hindari pop-up untuk logo atau icon kecil
        if (img.width < 50 && img.height < 50) return;

        e.preventDefault();
        e.stopPropagation();
        setActiveImg({ src: img.src, alt: img.alt || 'Gambar Soal' });
        setScale(1);
      }
    };

    document.addEventListener('click', handleImageClick, true);
    return () => {
      document.removeEventListener('click', handleImageClick, true);
    };
  }, []);

  if (!activeImg) return null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.35, 3.5));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.35, 0.7));
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 select-none touch-none"
      onClick={() => setActiveImg(null)}
    >
      {/* Top Floating Control Bar */}
      <div
        className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 bg-slate-900/80 border border-white/20 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 sm:p-2.5 rounded-xl text-white hover:bg-white/20 active:scale-95 transition"
          title="Perbesar (Zoom In)"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 sm:p-2.5 rounded-xl text-white hover:bg-white/20 active:scale-95 transition"
          title="Perkecil (Zoom Out)"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="p-2 sm:p-2.5 rounded-xl text-white hover:bg-white/20 active:scale-95 transition"
          title="Reset Ukuran"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <div className="w-[1px] h-6 bg-white/20 mx-0.5" />
        <button
          type="button"
          onClick={() => setActiveImg(null)}
          className="p-2 sm:p-2.5 rounded-xl bg-red-600/80 text-white hover:bg-red-600 active:scale-95 transition"
          title="Tutup (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image Container with Touch Pinch & Pan */}
      <div
        className="w-full h-full flex items-center justify-center overflow-auto p-4"
        onClick={(e) => {
          // Klik area kosong menutup modal
          if (e.target === e.currentTarget) setActiveImg(null);
        }}
      >
        <img
          src={activeImg.src}
          alt={activeImg.alt}
          style={{
            transform: `scale(${scale})`,
            transition: 'transform 0.15s ease-out',
            touchAction: 'pan-x pan-y pinch-zoom',
          }}
          className="max-h-[85vh] max-w-[92vw] object-contain rounded-xl shadow-2xl pointer-events-auto cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs sm:text-sm bg-black/60 px-3.5 py-1.5 rounded-full border border-white/10 pointer-events-none">
        Sentuh & cubit (pinch) atau gunakan tombol untuk zoom • Ketuk latar untuk menutup
      </div>
    </div>
  );
}

