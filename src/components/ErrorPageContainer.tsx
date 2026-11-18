'use client'

import React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Lock,
  CreditCard,
  ShieldAlert,
  FileQuestion,
  Clock,
  ServerCrash,
  Network,
  Wrench,
  WifiOff,
  Home,
  LayoutDashboard,
  RotateCcw,
  HelpCircle,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

export interface ErrorDetail {
  code: number
  title: string
  subtitle: string
  description: string
  badgeColor: string
  gradientFrom: string
  gradientTo: string
  icon: React.ComponentType<{ className?: string }>
  suggestion?: string
}

export const ERROR_CONFIGS: Record<number, ErrorDetail> = {
  400: {
    code: 400,
    title: 'Permintaan Tidak Valid',
    subtitle: '400 Bad Request',
    description: 'Server tidak dapat memproses permintaan ini karena format data tidak valid, parameter salah, atau data ujian korup.',
    suggestion: 'Periksa kembali tautan ujian atau formulir data yang Anda kirimkan, lalu coba kembali.',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-orange-600',
    icon: AlertTriangle,
  },
  401: {
    code: 401,
    title: 'Otentikasi Diperlukan',
    subtitle: '401 Unauthorized',
    description: 'Sesi masuk ujian Anda telah berakhir atau token otentikasi login CBT tidak valid.',
    suggestion: 'Silakan masuk kembali dengan Nomor Peserta / Akun Anda pada Portal Login CBT.',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-indigo-600',
    icon: Lock,
  },
  402: {
    code: 402,
    title: 'Pembayaran Diperlukan',
    subtitle: '402 Payment Required',
    description: 'Akses ke modul atau fitur ini memerlukan verifikasi administrasi status aktif pada sistem sekolah.',
    suggestion: 'Silakan hubungi proktor ruang ujian atau bagian kurikulum & administrasi sekolah.',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    gradientFrom: 'from-purple-600',
    gradientTo: 'to-violet-600',
    icon: CreditCard,
  },
  403: {
    code: 403,
    title: 'Akses Ujian Dibatasi',
    subtitle: '403 Forbidden',
    description: 'Anda tidak memiliki hak akses (permission) untuk membuka lembar soal atau modul manajemen CBT ini.',
    suggestion: 'Pastikan Anda login dengan akun yang sesuai (Siswa terdaftar pada jadwal tes ini atau Admin/Proktor).',
    badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    gradientFrom: 'from-rose-600',
    gradientTo: 'to-red-600',
    icon: ShieldAlert,
  },
  404: {
    code: 404,
    title: 'Halaman Tidak Ditemukan',
    subtitle: '404 Not Found',
    description: 'Halaman atau lembar ujian yang Anda tuju tidak ditemukan. Kemungkinan URL salah, soal telah diarsipkan, atau sedang dipindahkan.',
    suggestion: 'Periksa kembali alamat tautan atau kembali ke portal utama CBT.',
    badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    gradientFrom: 'from-sky-500',
    gradientTo: 'to-blue-600',
    icon: FileQuestion,
  },
  408: {
    code: 408,
    title: 'Waktu Permintaan Habis',
    subtitle: '408 Request Timeout',
    description: 'Server menunggu terlalu lama untuk merespon permintaan ujian Anda. Hal ini bisa terjadi karena latensi jaringan lab.',
    suggestion: 'Muat ulang lembar halaman atau periksa sambungan kabel LAN / WiFi ujian Anda.',
    badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-amber-600',
    icon: Clock,
  },
  429: {
    code: 429,
    title: 'Terlalu Banyak Permintaan',
    subtitle: '429 Too Many Requests',
    description: 'Sistem mendeteksi pengiriman request sinkronisasi yang terlalu sering dalam waktu singkat (Rate Limiting).',
    suggestion: 'Tunggu beberapa detik sebelum mengklik kembali atau menyimpan jawaban.',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    gradientFrom: 'from-amber-600',
    gradientTo: 'to-yellow-600',
    icon: Clock,
  },
  500: {
    code: 500,
    title: 'Kesalahan Server Internal',
    subtitle: '500 Internal Server Error',
    description: 'Terjadi kendala pemrosesan tak terduga pada backend server CBT. Seluruh jawaban tersimpan aman di cache offline (IndexedDB).',
    suggestion: 'Muat ulang halaman atau laporkan ke proktor ruang ujian untuk pemeriksaan status server.',
    badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    gradientFrom: 'from-red-600',
    gradientTo: 'to-rose-700',
    icon: ServerCrash,
  },
  502: {
    code: 502,
    title: 'Gerbang Server Tidak Sah',
    subtitle: '502 Bad Gateway',
    description: 'Server gateway menerima respon yang tidak valid dari service backend saat memproses soal atau autentikasi.',
    suggestion: 'Server utama CBT kemungkinan sedang memulai ulang. Harap coba beberapa saat lagi.',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    gradientFrom: 'from-amber-600',
    gradientTo: 'to-yellow-600',
    icon: Network,
  },
  503: {
    code: 503,
    title: 'Layanan Ujian Tidak Tersedia',
    subtitle: '503 Service Unavailable',
    description: 'Sistem CBT saat ini sedang dalam pemeliharaan berkala (maintenance) atau antrean sinkronisasi server sedang penuh.',
    suggestion: 'Layanan akan segera normal kembali. Harap tunggu aba-aba dari proktor pengawas ujian.',
    badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    gradientFrom: 'from-cyan-600',
    gradientTo: 'to-teal-600',
    icon: Wrench,
  },
  504: {
    code: 504,
    title: 'Waktu Gerbang Habis',
    subtitle: '504 Gateway Timeout',
    description: 'Server gateway tidak mendapat respon tepat waktu dari database CBT atau upstream response.',
    suggestion: 'Cobalah untuk memuat ulang halaman secara berkala atau periksa status koneksi proktor.',
    badgeColor: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    gradientFrom: 'from-violet-600',
    gradientTo: 'to-purple-700',
    icon: WifiOff,
  },
}

interface ErrorPageContainerProps {
  code?: number
  customTitle?: string
  customDescription?: string
  reset?: () => void
}

export default function ErrorPageContainer({
  code = 404,
  customTitle,
  customDescription,
  reset,
}: ErrorPageContainerProps) {
  const config = ERROR_CONFIGS[code] || ERROR_CONFIGS[404]
  const IconComponent = config.icon

  const handleReload = () => {
    if (reset) {
      reset()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden select-none">
      {/* Background Decorative Ambient Orbs */}
      <div className="absolute top-1/4 -left-32 w-72 sm:w-96 h-72 sm:h-96 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Top Navbar Header */}
      <header className="mobile-appbar w-full h-14 sm:h-16 px-3 sm:px-6 md:px-8 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex items-center justify-between z-20 sticky top-0 shadow-xs">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 p-1 sm:p-1.5 rounded-xl border shadow-2xs transition-transform group-hover:scale-105 shrink-0 bg-blue-50 dark:bg-slate-800/80 border-blue-200/80 dark:border-slate-700 flex items-center justify-center overflow-hidden">
            <img
              src="/pic_logo.png"
              alt="Logo CBT MUHIPO"
              className="cbt-app-logo w-full h-full max-h-7 sm:max-h-8 object-contain rounded"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/favicon.ico'
              }}
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-black text-base sm:text-lg md:text-xl tracking-tight leading-none text-blue-600 dark:text-blue-400">
              CBT v2 SMA Muhipo
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-normal leading-tight mt-0.5">
              Sistem Ujian SMA Muhammadiyah 1 Ponorogo
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className={`px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border ${config.badgeColor} flex items-center gap-1.5 shadow-xs`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
            <span>HTTP {config.code}</span>
          </div>
          <ThemeToggle size="sm" />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8 z-10 my-auto">
        <div className="w-full max-w-lg md:max-w-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-xl sm:shadow-2xl relative overflow-hidden my-auto transform transition-all duration-300">
          {/* Top Decorative Line */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo}`} />

          <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
            {/* Error Code Graphic & Animated Icon */}
            <div className="relative flex items-center justify-center py-2 sm:py-4">
              <span className={`text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter opacity-15 dark:opacity-25 bg-clip-text text-transparent bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo}`}>
                {config.code}
              </span>
              <div className={`absolute p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} text-white shadow-lg sm:shadow-xl shadow-blue-500/20 transform hover:scale-105 transition-transform`}>
                <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />
              </div>
            </div>

            {/* Title and Descriptions */}
            <div className="space-y-1.5 sm:space-y-2 max-w-md px-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {config.subtitle}
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {customTitle || config.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5 sm:pt-1">
                {customDescription || config.description}
              </p>
            </div>

            {/* Responsive Suggestion Card */}
            {config.suggestion && (
              <div className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2.5 text-left">
                <HelpCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-500 shrink-0 mt-0.5" />
                <span className="leading-snug">{config.suggestion}</span>
              </div>
            )}

            {/* Action Buttons Grid */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1 sm:pt-2">
              <button
                type="button"
                onClick={handleReload}
                className="w-full flex items-center justify-center gap-2 h-10 sm:h-11 rounded-xl text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 active:scale-[0.98] transition-transform cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Coba Lagi</span>
              </button>

              <Link
                href="/login"
                className={`w-full flex items-center justify-center gap-2 h-10 sm:h-11 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} text-white shadow-md hover:opacity-95 active:scale-[0.98] transition-all`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Portal CBT</span>
              </Link>

              <Link
                href="/"
                className="w-full sm:col-span-2 flex items-center justify-center gap-2 h-9 sm:h-10 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Kembali ke Beranda</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Centered Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-3 sm:py-4 px-4 sm:px-8 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 z-20">
        <div className="flex items-center justify-center gap-2 font-semibold text-[11px] sm:text-xs text-center">
          <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>CBT v2 SMA Muhipo &copy; 2026 — SMA Muhammadiyah 1 Ponorogo</span>
        </div>
      </footer>
    </div>
  )
}
