'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SchoolBrandHeader } from '@/components/SchoolBrandHeader';
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
    appTitle: 'CBT MUHIPO',
    backgroundUrl: '/muhipo-front.jpg',
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
            appTitle: json.data.appTitle || 'CBT MUHIPO',
            backgroundUrl: json.data.backgroundUrl || '/muhipo-front.jpg',
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
    <div className="min-h-screen relative flex flex-col justify-between text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white overflow-hidden bg-slate-900 transition-colors duration-300">
      {/* Background Wallpaper Master dari Pengaturan Sistem */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 transform scale-100 transition-transform duration-1000 opacity-60 dark:opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url('${settings.backgroundUrl || '/muhipo-front.jpg'}')`,
        }}
      />
      {/* Overlay Transparan Halus */}
      <div className="absolute inset-0 bg-slate-950/20 dark:bg-slate-950/50 backdrop-blur-[1px] z-0 pointer-events-none" />

      {/* Top Header Navbar */}
      <header className="w-full px-4 sm:px-6 lg:px-10 py-3 sm:py-3.5 border-b border-white/20 dark:border-white/10 bg-white/75 dark:bg-slate-950/75 backdrop-blur-md flex items-center justify-between z-10 shadow-sm">
        <SchoolBrandHeader
          subtitle={`Portal Ujian ${settings.schoolName || 'SMA Muhammadiyah 1 Ponorogo'}`}
          logoUrl={settings.logoUrl}
          appTitle={settings.appTitle}
        />
        <div className="flex items-center gap-2.5 sm:gap-4 text-xs font-medium">
          <ThemeToggle />
          {/* Format Waktu & Tanggal Persis Sidebar */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs" suppressHydrationWarning>
            <div className="p-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex items-center gap-2" suppressHydrationWarning>
              <div className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white text-xs" suppressHydrationWarning>
                <span suppressHydrationWarning>{clock.timeString}</span>
                <span className="text-[9px] font-sans font-semibold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  WIB
                </span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium" suppressHydrationWarning>
                {clock.dateString}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-3.5 sm:p-6 z-10">
        <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/75 border border-white/40 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Toggle Tab Portal: Siswa vs Admin/Guru */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100/70 dark:bg-slate-950/60 p-1.5 rounded-2xl border border-slate-200/60 dark:border-white/5 text-xs font-bold backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                setActivePortal('SISWA');
                setErrorMessage('');
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activePortal === 'SISWA'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Portal Siswa</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePortal('ADMIN');
                setErrorMessage('');
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activePortal === 'ADMIN'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin / Guru</span>
            </button>
          </div>

          {/* Title Header Form */}
          <div className="text-center space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {activePortal === 'SISWA' ? 'Masuk Peserta Ujian' : 'Masuk Panel Manajemen'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activePortal === 'SISWA'
                ? 'Gunakan Username / ID Peserta untuk masuk'
                : 'Masuk sebagai Administrator, Guru, atau Proktor'}
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                {activePortal === 'SISWA' ? 'Username / ID Peserta' : 'Username / NIP'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={activePortal === 'SISWA' ? 'Masukkan ID / Username (Contoh: 20261001)' : 'Contoh: admin'}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                  Kata Sandi (Password)
                </label>
                {activePortal === 'SISWA' && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                    (Default: 123456)
                  </span>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={activePortal === 'SISWA' ? 'Masukkan Password Peserta' : 'Masukkan kata sandi...'}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer transition disabled:opacity-50 active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Memverifikasi Akun...' : 'Masuk Sekarang'}</span>
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-3.5 sm:py-4 border-t border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 z-10 px-4">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-center">
          Copyright © 2026 - CBT (Computer Based Test) • SMA Muhammadiyah 1 Ponorogo
        </span>
      </footer>
    </div>
  );
}
