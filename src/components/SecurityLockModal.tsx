'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Maximize2,
  AlertTriangle,
  Lock,
  Smartphone,
  Laptop,
  CheckCircle2,
} from 'lucide-react';
import { enforceExambroKioskSecurity } from '@/lib/cbt-exambro-bridge';
import {
  detectDeviceSecurityInfo,
  DeviceSecurityInfo,
  requestUniversalFullscreen,
  enableChromeKeyboardLock,
  cbtSecurityAudio,
  cbtWakeLock,
} from '@/lib/cbt-security';

interface SecurityLockModalProps {
  isOpen: boolean;
  onActivateSecurity: () => Promise<boolean>;
  requireScreenShare?: boolean;
}

export function SecurityLockModal({
  isOpen,
  onActivateSecurity,
}: SecurityLockModalProps) {
  const [activating, setActivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceSecurityInfo | null>(null);

  useEffect(() => {
    setDeviceInfo(detectDeviceSecurityInfo());
  }, []);

  if (!isOpen) return null;

  const handleStart = async () => {
    setActivating(true);
    setErrorMsg(null);
    try {
      // LAYER 1 (Web View CBT DOM Security): Audio unlock, WakeLock (layar anti-redup), Fullscreen (documentElement), Keyboard Lock
      cbtSecurityAudio.unlockAudio();
      cbtWakeLock.requestWakeLock().catch(() => {});

      const devInfo = detectDeviceSecurityInfo();
      if (devInfo.hasFullscreen) {
        // Gunakan document.documentElement agar portal seperti ImageZoomModal tetap tampak di atas layar penuh
        await requestUniversalFullscreen(document.documentElement).catch(() => {});
        await enableChromeKeyboardLock().catch(() => {});
      }

      // LAYER 2 (Native Android Exambro APK & Kiosk Mode): FLAG_SECURE & Hardware Lock
      enforceExambroKioskSecurity();

      // Jalankan aktivasi keamanan lembar ujian
      await onActivateSecurity();
    } catch (e: any) {
      console.warn('Modal security start warning:', e);
    } finally {
      setActivating(false);
    }
  };

  const isApple = deviceInfo?.isIOS || deviceInfo?.isSafari;
  const isMobileOrTablet = deviceInfo?.isMobile || deviceInfo?.isTablet;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-7 shadow-2xl space-y-4 sm:space-y-5 text-center text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in duration-200 my-auto">
        <div className="w-12 h-12 sm:w-15 sm:h-15 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
          <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse" />
        </div>

        <div>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 sm:px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1.5">
            {isMobileOrTablet ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
            <span>Protokol Kiosk ({deviceInfo?.deviceName || 'Perangkat Terdeteksi'})</span>
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
            Aktivasi Mode Ujian Terkunci
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Dioptimalkan untuk <b>Chrome Ponsel (Android), Safari (iPhone/iPad), Exambro, & SEB</b>.
          </p>
        </div>

        {/* Security Checklist Requirements */}
        <div className="space-y-2.5 text-left text-xs bg-slate-50 dark:bg-slate-950/70 p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-900 dark:text-white text-xs">1. Masa Adaptasi 5 Detik Bebas Sanksi:</b>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] mt-0.5 leading-relaxed">
                Tersedia jeda <b>5 detik pertama</b> saat masuk ke mode layar penuh tanpa dihitung pelanggaran. Layar ponsel otomatis dijaga tetap menyala.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Maximize2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-900 dark:text-white text-xs">
                {isMobileOrTablet ? '2. Kunci Kiosk Browser Ponsel (Chrome & Safari):' : '2. Kunci Layar Penuh (Fullscreen Lockdown):'}
              </b>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] mt-0.5 leading-relaxed">
                {isApple && isMobileOrTablet
                  ? 'Pada Safari iPhone/iPad: Tetap berada di layar ujian. Dilarang menggeser aplikasi (App Switcher), membuka tab baru, atau Split View.'
                  : isMobileOrTablet
                  ? 'Pada Chrome Android / Exambro: Layar dikunci penuh. Dilarang keluar tab, menekan tombol Home/Recent, atau membuka layar belah (Split-Screen / Jendela Mengambang).'
                  : 'Layar otomatis masuk ke mode layar penuh. Dilarang berpindah tab browser, membuka aplikasi lain, atau menekan Escape.'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-900 dark:text-white text-xs">3. Hanya Izin Touchscreen, Scroll, Zoom &amp; Cubit Layar:</b>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] mt-0.5 leading-relaxed">
                Selama ujian berlangsung, peserta <b>hanya diizinkan melakukan sentuhan layar (touchscreen), gulir halaman (scroll), perbesar tampilan (zoom), dan cubit layar 2 jari (pinch-to-zoom)</b>. Fitur pilih teks (Select), salin (Copy), tempel (Paste), klik kanan, &amp; tangkapan layar <b>diblokir total</b> (maks. <b>10x pelanggaran</b> sebelum terkunci otomatis). Layar penuh keluar otomatis setelah seluruh soal selesai diisi.
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-2 text-left animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Izin Browser Diperlukan</p>
              <p className="text-[11px] font-normal text-rose-700 dark:text-rose-300 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={activating}
          onClick={handleStart}
          className="min-h-[48px] w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 touch-manipulation"
        >
          {activating ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Aktifkan Mode Ujian & Mulai Kerjakan</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
