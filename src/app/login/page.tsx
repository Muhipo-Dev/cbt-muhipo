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
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SingleSignInLoginPage() {
  const router = useRouter();
  const [activePortal, setActivePortal] = useState<'SISWA' | 'ADMIN'>('SISWA');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    try {
      const params = new URLSearchParams(window.location.search);
      const portalParam = (params.get('portal') || params.get('role') || '').toUpperCase();
      if (['ADMIN', 'GURU', 'PROKTOR', 'SUPERADMIN', 'MANAGEMENT'].includes(portalParam)) {
        setActivePortal('ADMIN');
      }
    } catch {}

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

      // Routing otomatis berdasarkan role terotentikasi (ramah pengguna mobile & AI Automation seperti ChatGPT/Gemini Task)
      const role = data.user.role;
      if (role === 'SUPERADMIN' || role === 'ADMIN' || role === 'PROKTOR') {
        router.push('/admin');
      } else if (role === 'GURU') {
        router.push('/guru');
      } else {
        router.push('/siswa');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat masuk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] relative flex flex-col justify-between text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white overflow-x-hidden overflow-y-auto bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
      {/* Background Flat Kontras Tinggi (Ringan & Cepat Tanpa Beban Gambar) */}
      <div className="fixed inset-0 bg-slate-100 dark:bg-slate-950 -z-10 pointer-events-none" />

      {/* Top Header Navbar */}
      <header className="w-full px-3 sm:px-6 lg:px-8 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between z-10 shrink-0">
        <SchoolBrandHeader
          subtitle="Portal Ujian SMA Muhammadiyah 1 Ponorogo"
          logoUrl={settings.logoUrl}
          appTitle={settings.appTitle || 'CBT'}
        />
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-medium">
          <ThemeToggle size="sm" />
          <div
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
            suppressHydrationWarning
          >
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <div className="flex items-center gap-1.5" suppressHydrationWarning>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-xs" suppressHydrationWarning>
                {clock.timeString} WIB
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium" suppressHydrationWarning>
                {clock.dateString}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Card (Tegas, Simetris, Tanpa Bentuk Melonjong Berlebihan) */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-5 z-10 min-h-0">
        <div className="w-full max-w-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          {/* Toggle Tab Portal: Siswa vs Admin/Guru */}
          <div
            role="tablist"
            aria-label="Pilih Portal Masuk CBT"
            className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold"
          >
            <button
              id="login-portal-siswa"
              type="button"
              role="tab"
              aria-selected={activePortal === 'SISWA'}
              data-ai-action="switch-portal-siswa"
              onClick={() => {
                setActivePortal('SISWA');
                setErrorMessage('');
              }}
              className={`min-h-[42px] py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs touch-manipulation ${
                activePortal === 'SISWA'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-bold shadow-2xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Portal Siswa</span>
            </button>
            <button
              id="login-portal-admin"
              type="button"
              role="tab"
              aria-selected={activePortal === 'ADMIN'}
              data-ai-action="switch-portal-admin"
              onClick={() => {
                setActivePortal('ADMIN');
                setErrorMessage('');
              }}
              className={`min-h-[42px] py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs touch-manipulation ${
                activePortal === 'ADMIN'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-bold shadow-2xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin / Guru</span>
            </button>
          </div>

          {/* Title Header Form */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {activePortal === 'SISWA' ? 'Login Peserta Ujian' : 'Login Panel Manajemen'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {activePortal === 'SISWA'
                ? 'Masukkan Nomor Peserta dan Kata Sandi ujian Anda.'
                : 'Masuk sebagai Administrator, Guru, atau Proktor.'}
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleLogin} data-ai-form="cbt-login" className="space-y-3.5 text-xs">
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="font-semibold text-slate-700 dark:text-slate-300 text-xs block">
                {activePortal === 'SISWA' ? 'Nomor Peserta' : 'Username / NIP'}
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  id="login-username"
                  name="username"
                  data-ai-field="username"
                  autoComplete="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={activePortal === 'SISWA' ? 'Contoh: 2026001' : 'Masukkan username atau NIP'}
                  className="w-full h-11 pl-9 pr-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-base sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="font-semibold text-slate-700 dark:text-slate-300 text-xs block">
                Kata Sandi
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  id="login-password"
                  name="password"
                  data-ai-field="password"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full h-11 pl-9 pr-11 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-base sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Sembunyikan Kata Sandi' : 'Lihat Kata Sandi'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition cursor-pointer z-10 touch-manipulation"
                  title={showPassword ? 'Sembunyikan Kata Sandi' : 'Lihat Kata Sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              data-ai-action="submit-login"
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 active:scale-[0.99] mt-2 touch-manipulation"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Memverifikasi...' : 'Masuk'}</span>
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <AppFooter className="py-1.5 sm:py-2" />
    </div>
  );
}

