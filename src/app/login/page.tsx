'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SchoolBrandHeader } from '@/components/SchoolBrandHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useRealtimeServerClock } from '@/lib/time-sync';
import {
  LogIn,
  KeyRound,
  User,
  GraduationCap,
  Shield,
  Clock,
} from 'lucide-react';

export default function SingleSignInLoginPage() {
  const router = useRouter();
  const [activePortal, setActivePortal] = useState<'SISWA' | 'ADMIN'>('SISWA');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [settings, setSettings] = useState({
    schoolName: 'SMA Muhammadiyah 1 Ponorogo',
    appTitle: 'CBT',
    backgroundUrl: '/muhipo-log.jpg',
    logoUrl: '/pic_logo.png',
  });

  const clock = useRealtimeServerClock(60000);

  useEffect(() => {
    fetch('/api/pengaturan')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSettings({
            schoolName: json.data.schoolName || 'SMA Muhammadiyah 1 Ponorogo',
            appTitle: json.data.appTitle || 'CBT',
            backgroundUrl: json.data.backgroundUrl || '/muhipo-log.jpg',
            logoUrl: json.data.logoUrl || '/pic_logo.png',
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login gagal. Periksa kembali Username / ID dan Kata Sandi.');
      }

      const role = data.user.role;
      if (activePortal === 'SISWA') {
        if (role !== 'SISWA') {
          throw new Error('Akun ini terdaftar sebagai Admin/Guru/Proktor. Silakan beralih ke Portal Admin CBT.');
        }
        router.push('/siswa');
      } else {
        if (role === 'SISWA') {
          throw new Error('Akun ini adalah akun Siswa. Silakan pilih tab Portal Siswa.');
        }
        if (role === 'SUPERADMIN' || role === 'ADMIN' || role === 'PROKTOR') router.push('/admin');
        else if (role === 'GURU') router.push('/guru');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat masuk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen h-dvh max-h-screen max-h-dvh relative flex flex-col justify-between text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white overflow-hidden bg-slate-950 transition-colors duration-300">
      {/* Background Wallpaper Master dari Pengaturan Sistem */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 transform scale-100 transition-transform duration-1000 opacity-90 dark:opacity-80 brightness-100 dark:brightness-[0.88] dark:contrast-[1.10] pointer-events-none"
        style={{
          backgroundImage: `url('${settings.backgroundUrl || '/muhipo-log.jpg'}')`,
        }}
      />
      {/* Overlay Transparan Halus */}
      <div className="absolute inset-0 bg-slate-100/75 dark:bg-slate-950/65 dark:bg-gradient-to-b dark:from-slate-950/75 dark:via-slate-900/60 dark:to-slate-950/80 backdrop-blur-[2px] z-0 pointer-events-none" />

      {/* Top Header Navbar */}
      <header className="w-full px-3 sm:px-6 lg:px-10 py-1.5 sm:py-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md flex items-center justify-between z-10 shadow-xs shrink-0">
        <SchoolBrandHeader
          subtitle="Portal Ujian SMA Muhammadiyah 1 Ponorogo"
          logoUrl={settings.logoUrl}
          appTitle={settings.appTitle || 'CBT'}
        />
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
          <ThemeToggle size="sm" />
          {/* Format Waktu & Tanggal Persis Sidebar */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 backdrop-blur-md shadow-xs" suppressHydrationWarning>
            <div className="p-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5" suppressHydrationWarning>
              <div className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white text-xs" suppressHydrationWarning>
                <span suppressHydrationWarning>{clock.timeString}</span>
                <span className="text-[9px] font-sans font-semibold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  WIB
                </span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium" suppressHydrationWarning>
                {clock.dateString}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-4 z-10 min-h-0">
        <div className="w-full max-w-[350px] sm:max-w-[375px] bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl space-y-3.5 sm:space-y-4">
          {/* Toggle Tab Portal: Siswa vs Admin/Guru (Disembunyikan di Mobile, khusus Desktop/Tablet) */}
          <div className="hidden sm:grid grid-cols-2 gap-1 bg-slate-100/90 dark:bg-slate-950/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                setActivePortal('SISWA');
                setErrorMessage('');
              }}
              className={`py-1.5 sm:py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs ${activePortal === 'SISWA'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Portal Siswa</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePortal('ADMIN');
                setErrorMessage('');
              }}
              className={`py-1.5 sm:py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs ${activePortal === 'ADMIN'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin / Guru</span>
            </button>
          </div>

          {/* Title Header Form */}
          <div className="text-center space-y-0.5">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {activePortal === 'SISWA' ? 'Masuk Peserta Ujian' : 'Masuk Panel Manajemen'}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              {activePortal === 'SISWA'
                ? 'Gunakan Nomor Peserta untuk masuk'
                : 'Masuk sebagai Administrator, Guru, atau Proktor'}
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 sm:p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs">
                {activePortal === 'SISWA' ? 'Nomor Peserta' : 'Username / NIP'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={activePortal === 'SISWA' ? 'Input nomor peserta' : 'Contoh: admin'}
                  className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs">
                Kata Sandi
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={activePortal === 'SISWA' ? 'Masukkan Kata Sandi Peserta' : 'Masukkan kata sandi...'}
                  className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer transition disabled:opacity-50 active:scale-[0.99] mt-1"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Memverifikasi Akun...' : 'Masuk Sekarang'}</span>
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <AppFooter className="py-1.5 sm:py-2" />
    </div>
  );
}

