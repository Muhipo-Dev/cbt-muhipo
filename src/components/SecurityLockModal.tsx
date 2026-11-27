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
    <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto overscroll-contain">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-4 text-left text-slate-800 dark:text-slate-100 my-auto">
        <div className="flex items-start gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {isMobileOrTablet ? <Smartphone className="w-3.5 h-3.5 shrink-0" /> : <Laptop className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{deviceInfo?.deviceName || 'Perangkat Terdeteksi'}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Tata Tertib &amp; Penguncian Layar Ujian
            </h2>
          </div>
        </div>

        {/* Security Checklist Requirements */}
        <div className="space-y-3 text-xs bg-slate-50 dark:bg-slate-950 p-3.5 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-900 dark:text-white">1. Masa Penyesuaian Awal (5 Detik):</b>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] mt-0.5 leading-relaxed">
                Sistem menyediakan waktu penyesuaian selama 5 detik saat memasuki mode layar penuh tanpa dicatat sebagai pelanggaran. Layar perangkat dijaga tetap menyala selama sesi berlangsung.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Maximize2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-900 dark:text-white">
                {isMobileOrTablet ? '2. Ketentuan Mode Layar Penuh Perangkat:' : '2. Ketentuan Penguncian Layar Penuh:'}
              </b>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] mt-0.5 leading-relaxed">
                {isApple && isMobileOrTablet
                  ? 'Peserta wajib tetap berada pada halaman ujian Safari. Tidak diperkenankan berpindah aplikasi, membuka tab baru, atau mengaktifkan tampilan layar terbagi (Split View).'
                  : isMobileOrTablet
                  ? 'Aplikasi Kiosk dikunci & di-pin dalam mode layar penuh. Percobaan menekan tombol keluar, kembali, berpindah aplikasi, atau Split-Screen akan memicu alert dan tercatat sebagai pelanggaran.'
                  : 'Peramban dikunci dalam mode layar penuh. Tidak diperkenankan berpindah tab, membuka jendela aplikasi lain, atau keluar dari layar penuh sebelum ujian selesai.'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-900 dark:text-white">3. Aksesibilitas Layar &amp; Integritas Akademik:</b>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] mt-0.5 leading-relaxed">
                Peserta <b>tetap dapat menyentuh layar, menggulir halaman, serta memperbesar tampilan soal dengan dua jari</b>. Fitur salin-tempel, seleksi teks, dan tangkapan layar dinonaktifkan (batas toleransi <b>5 kali pelanggaran</b>). Mode layar penuh berakhir otomatis setelah seluruh soal selesai dikumpulkan.
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Izin Browser Diperlukan</p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={activating}
          onClick={handleStart}
          className="min-h-[46px] w-full py-2.5 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] touch-manipulation"
        >
          {activating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Masuk Layar Penuh &amp; Mulai Ujian</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
