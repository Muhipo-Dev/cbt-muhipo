'use client'

import React from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import { LogOut, User, Menu } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

interface AppNavbarProps {
  subtitle?: string
  hideSubtitleOnMobile?: boolean
  logoHref?: string
  logoUrl?: string | null
  appTitle?: string
  userProfile?: {
    name?: string
    role?: string
    username?: string
  } | null
  onLogout?: () => void
  onToggleSidebar?: () => void
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function AppNavbar({
  subtitle = 'Portal Ujian SMA Muhammadiyah 1 Ponorogo',
  hideSubtitleOnMobile = false,
  logoHref = '/',
  logoUrl = '/pic_logo.png',
  appTitle = 'CBT',
  userProfile,
  onLogout,
  onToggleSidebar,
  actions,
  children,
  className = '',
}: AppNavbarProps) {
  const activeLogo = logoUrl || '/pic_logo.png'

  return (
    <header
      className={`h-14 sm:h-16 lg:h-20 flex items-center justify-between px-3 sm:px-5 lg:px-8 xl:px-12 sticky top-0 z-40 shadow-xs transition-colors duration-300 bg-white/85 dark:bg-slate-950/85 border-b border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white backdrop-blur-xl shrink-0 w-full overflow-x-clip ${className}`}
    >
      {/* SISI KIRI: Logo & Nama Aplikasi CBT */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 cursor-pointer shrink-0 transition"
            title="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link href={logoHref} className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 group min-w-0">
          <div className="p-1 sm:p-1.5 rounded-2xl border shadow-2xs transition-transform group-hover:scale-105 shrink-0 bg-blue-50 dark:bg-white/10 border-blue-200/80 dark:border-white/15 backdrop-blur-md flex items-center justify-center overflow-hidden">
            <img
              src={activeLogo}
              alt="Logo CBT"
              className="h-6 sm:h-7 lg:h-9 w-auto object-contain rounded-lg max-w-[40px] sm:max-w-[48px]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/pic_logo.png';
              }}
            />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm sm:text-base lg:text-lg tracking-tight leading-none text-slate-900 dark:text-white">
                CBT
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 font-sans tracking-normal">
                (Computer Based Test)
              </span>
            </div>
            {subtitle && (
              <span
                className={`text-[9px] sm:text-[10px] lg:text-xs font-normal leading-tight text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[140px] sm:max-w-[200px] lg:max-w-none ${
                  hideSubtitleOnMobile ? 'hidden md:inline' : 'inline'
                }`}
              >
                {subtitle}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* SISI TENGAH */}
      {children && (
        <div className="hidden xl:flex items-center gap-1 2xl:gap-2 text-slate-700 dark:text-slate-200 min-w-0 mx-2 2xl:mx-4 shrink">
          {children}
        </div>
      )}

      {/* SISI KANAN: ThemeToggle + Profil + Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
        {actions}

        {/* Theme Toggle Button (Light/Dark Mode) */}
        <ThemeToggle />

        {userProfile && (
          <div className="flex items-center gap-2 sm:gap-2.5 bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 sm:px-3 py-1.5 rounded-2xl backdrop-blur-md">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-[11px] sm:text-xs shadow-2xs shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="hidden md:flex flex-col text-left leading-tight min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                {userProfile.name || 'Pengguna'}
              </span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">
                {userProfile.role || 'USER'}
              </span>
            </div>
          </div>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 font-bold text-xs transition cursor-pointer active:scale-95"
            title="Keluar dari Akun"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        )}
      </div>
    </header>
  )
}
