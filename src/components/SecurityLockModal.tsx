'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Maximize2,
  Tv,
  AlertTriangle,
  Lock,
  Smartphone,
  Laptop,
  CheckCircle2,
} from 'lucide-react';
import { detectDeviceSecurityInfo, DeviceSecurityInfo } from '@/lib/cbt-security';

interface SecurityLockModalProps {
  isOpen: boolean;
  onActivateSecurity: () => Promise<boolean>;
  requireScreenShare?: boolean;
}

export function SecurityLockModal({
  isOpen,
  onActivateSecurity,
  requireScreenShare = true,
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
      const success = await onActivateSecurity();
      if (!success) {
        setErrorMsg('Gagal mengaktifkan mode keamanan. Pastikan mengizinkan Fullscreen / Mode Ujian.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Terjadi kendala saat mengaktifkan pengawasan.');
    } finally {
      setActivating(false);
    }
  };

  const isApple = deviceInfo?.isIOS || deviceInfo?.isSafari;
  const isMobileOrTablet = deviceInfo?.isMobile || deviceInfo?.isTablet;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-8 shadow-2xl space-y-4 sm:space-y-5 text-center text-slate-800 animate-in fade-in zoom-in duration-300 my-auto">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
          <ShieldAlert className="w-7 h-7 sm:w-9 sm:h-9 animate-pulse" />
        </div>

        <div>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 sm:px-3 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1.5">
            {isMobileOrTablet ? <Smartphone className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
            <span>Protokol Keamanan ({deviceInfo?.deviceName || 'Perangkat Terdeteksi'})</span>
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 mt-2">
            Aktivasi Kunci & Pengawasan Ujian
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
            Sistem pengawasan aktif untuk <b>Google Chrome, Safari (iOS), Firefox, & Brave</b>.
          </p>
        </div>

        {/* Security Checklist Requirements */}
        <div className="space-y-2 text-left text-xs bg-slate-50 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200">
          <div className="flex items-start gap-2 sm:gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-900 text-xs">Masa Penyesuaian Bebas Pelanggaran (5 Detik Pertama):</b>
              <span className="text-slate-500 block text-[11px] mt-0.5">
                Sistem memberikan waktu <b>5 detik</b> setelah mulai untuk penyesuaian layar, mengizinkan dialog browser, dan beralih ke mode Fullscreen tanpa sanksi pelanggaran.
              </span>
            </div>
          </div>

          {/* Entire Screen Sharing Info (Diutamakan di Laptop/Desktop/MacBook) */}
          {deviceInfo?.hasDisplayMedia && !isMobileOrTablet && (
            <div className="flex items-start gap-2 sm:gap-2.5">
              <Tv className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <b className="text-slate-900 text-xs">1. Izinkan Permintaan Google Chrome / Browser (Seluruh Layar):</b>
                <span className="text-slate-500 block text-[11px] mt-0.5">
                  Saat muncul pop-up izin browser, pilih <b>"Entire Screen / Seluruh Layar"</b> lalu klik <b>"Share / Bagikan"</b>.
                </span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 sm:gap-2.5">
            <Maximize2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-900 text-xs">
                {isMobileOrTablet ? '2. Mode Ujian Mobile (Android & iOS):' : '2. Kunci Layar Penuh (Fullscreen Lockdown):'}
              </b>
              <span className="text-slate-500 block text-[11px] mt-0.5">
                {isApple && isMobileOrTablet
                  ? 'Pada iPhone/iPad Safari: Tetap fokus pada layar ujian Safari, dilarang swipe gesture berpindah tab atau aplikasi.'
                  : isMobileOrTablet
                  ? 'Pada Android (Chrome/Brave): Harap tetap berada di halaman ujian, dilarang split-screen atau pop-up app.'
                  : 'Layar akan otomatis masuk ke mode layar penuh. Dilarang berpindah tab browser, membuka aplikasi lain, atau split-screen.'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 sm:gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-900 text-xs">3. Batas Toleransi Pelanggaran (Maksimal 5x):</b>
              <span className="text-slate-500 block text-[11px] mt-0.5">
                Setelah masa 5 detik berakhir, jika berpindah tab, berpindah aplikasi, atau keluar fullscreen, sistem membunyikan alarm. Pada <b>pelanggaran ke-5</b>, akun ujian akan <b>otomatis terkunci</b> dan wajib dibuka oleh pengawas.
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-start gap-2 text-left animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Izin Browser Wajib Diberikan!</p>
              <p className="text-[11px] font-normal text-rose-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={activating}
          onClick={handleStart}
          className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
        >
          {activating ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Izinkan & Mulai Lembar Ujian</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
