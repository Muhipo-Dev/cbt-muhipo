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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 text-center text-slate-800 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
          <ShieldAlert className="w-9 h-9 animate-pulse" />
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1.5">
            {isMobileOrTablet ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
            <span>Protokol Keamanan ({deviceInfo?.deviceName || 'Perangkat Terdeteksi'})</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2.5">
            Aktivasi Kunci & Pengawasan Ujian
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Sistem pengawasan aktif untuk <b>Chrome, Mozilla Firefox, Brave, Safari (iOS/iPadOS/macOS)</b>.
          </p>
        </div>

        {/* Security Checklist Requirements */}
        <div className="space-y-2.5 text-left text-xs bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
          {/* Entire Screen Sharing Info (Diutamakan di Laptop/Desktop/MacBook) */}
          {deviceInfo?.hasDisplayMedia && !isMobileOrTablet && (
            <div className="flex items-start gap-2.5">
              <Tv className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <b className="text-slate-900">1. Perekaman Seluruh Layar (Entire Screen):</b>
                <span className="text-slate-500 block text-[11px] mt-0.5">
                  Setelah menekan tombol di bawah, pilih tab/opsi <b>"Entire Screen / Seluruh Layar"</b> pada pop-up izin browser untuk pengawasan ujian.
                </span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5">
            <Maximize2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-900">2. Kunci Layar Penuh (Fullscreen Lockdown):</b>
              <span className="text-slate-500 block text-[11px] mt-0.5">
                {isApple && isMobileOrTablet
                  ? 'Pada iPhone/iPad Safari: Tetap fokus pada layar Safari, dilarang swipe app atau berpindah tab.'
                  : 'Layar akan otomatis terkunci penuh. Dilarang berpindah tab browser, membuka aplikasi lain, atau split-screen.'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-900">Peringatan Suara & Alarm Anti-Curang:</b>
              <span className="text-slate-500 block text-[11px] mt-0.5">
                Jika terdeteksi ganti tab atau membuka aplikasi lain, alarm suara peringatan akan otomatis berbunyi dan dicatat ke pengawas.
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          disabled={activating}
          onClick={handleStart}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-2"
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
