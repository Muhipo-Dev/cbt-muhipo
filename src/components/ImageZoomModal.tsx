'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export function ImageZoomModal() {
  const [activeImg, setActiveImg] = useState<{ src: string; alt: string } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs untuk gesture pinch-to-zoom & pan 1-jari di layar smartphone (Chrome Android & Safari iOS)
  const pinchDistanceRef = useRef<number | null>(null);
  const pinchInitialScaleRef = useRef<number>(1);
  const panStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    // Tangkap klik/tap pada gambar di dalam konten soal atau kelas cbt-zoomable-media
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'IMG' &&
        !target.classList.contains('cbt-app-logo') &&
        (target.closest('.prose') ||
          target.closest('.cbt-exam-lockdown') ||
          target.classList.contains('cbt-zoomable-media'))
      ) {
        const img = target as HTMLImageElement;
        // Hindari pop-up untuk logo atau icon kecil
        if (img.width < 44 && img.height < 44) return;

        e.preventDefault();
        e.stopPropagation();
        setActiveImg({ src: img.src, alt: img.alt || 'Gambar Soal' });
        setScale(1);
        setOffset({ x: 0, y: 0 });
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
    setScale((prev) => Math.min(Number((prev + 0.4).toFixed(2)), 4.5));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => {
      const next = Math.max(Number((prev - 0.4).toFixed(2)), 0.75);
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchDistanceRef.current = getDistance(e.touches);
      pinchInitialScaleRef.current = scale;
      panStartRef.current = null;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      // Double-tap untuk toggle zoom 1x <-> 2.2x pada smartphone
      if (now - lastTapRef.current < 280) {
        e.preventDefault();
        if (scale > 1.1) {
          setScale(1);
          setOffset({ x: 0, y: 0 });
        } else {
          setScale(2.2);
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (scale > 1) {
        panStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          origX: offset.x,
          origY: offset.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistanceRef.current !== null) {
      e.preventDefault();
      const currentDist = getDistance(e.touches);
      const ratio = currentDist / pinchDistanceRef.current;
      const nextScale = Math.min(4.5, Math.max(0.75, pinchInitialScaleRef.current * ratio));
      setScale(nextScale);
      if (nextScale <= 1) setOffset({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && panStartRef.current && scale > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - panStartRef.current.x;
      const dy = e.touches[0].clientY - panStartRef.current.y;
      setOffset({
        x: panStartRef.current.origX + dx,
        y: panStartRef.current.origY + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    pinchDistanceRef.current = null;
    panStartRef.current = null;
  };

  return (
    <div
      id="cbt-image-zoom-lightbox"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 select-none touch-none"
      onClick={() => setActiveImg(null)}
    >
      {/* Top Floating Control Bar (44px+ Touch Targets) */}
      <div
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 sm:top-6 sm:right-6 flex items-center gap-1.5 bg-slate-900/90 border border-white/20 p-1.5 rounded-2xl shadow-2xl z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-white hover:bg-white/20 active:scale-95 transition flex items-center justify-center touch-manipulation"
          title="Perbesar (Zoom In)"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-white hover:bg-white/20 active:scale-95 transition flex items-center justify-center touch-manipulation"
          title="Perkecil (Zoom Out)"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-white hover:bg-white/20 active:scale-95 transition flex items-center justify-center touch-manipulation"
          title="Reset Ukuran (100%)"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <div className="w-[1px] h-6 bg-white/20 mx-0.5" />
        <button
          type="button"
          onClick={() => setActiveImg(null)}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-500 active:scale-95 transition flex items-center justify-center touch-manipulation"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image Container with Native-Feel 2-Finger Pinch & 1-Finger Pan */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden p-2 sm:p-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveImg(null);
        }}
      >
        <img
          src={activeImg.src}
          alt={activeImg.alt}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            transition: pinchDistanceRef.current || panStartRef.current ? 'none' : 'transform 0.15s ease-out',
            touchAction: 'none',
          }}
          className="max-h-[82vh] max-w-[94vw] object-contain rounded-xl shadow-2xl pointer-events-auto cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>

      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 text-white/85 text-[11px] sm:text-xs bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-white/15 pointer-events-none whitespace-nowrap">
        Cubit 2 jari / ketuk 2x untuk zoom ({Math.round(scale * 100)}%) • Geser untuk melihat detail
      </div>
    </div>
  );
}
