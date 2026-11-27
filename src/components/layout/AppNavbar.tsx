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
  subtitle,
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
  const displayTitle = appTitle?.trim() || 'CBT'

  return (
    <header
      className={`print:hidden mobile-appbar sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 lg:px-6 pt-2 sm:pt-2.5 pb-0.5 shrink-0 ${className}`}
    >
      <div
        className={`w-full ${
          onToggleSidebar ? '' : 'max-w-6xl mx-auto'
        } flex items-center justify-between gap-2 sm:gap-3 min-h-[52px] h-13 sm:h-14 text-slate-900 dark:text-white`}
      >
        {/* SISI KIRI: Logo & Nama Aplikasi CBT */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 transition active:scale-95 touch-manipulation"
              title="Buka Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <Link href={logoHref} className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={activeLogo}
                alt="Logo CBT"
                className="cbt-app-logo w-full h-full max-h-6 max-w-[26px] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/pic_logo.png';
                }}
              />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm tracking-tight leading-none text-slate-900 dark:text-white truncate">
                  {displayTitle}
                </span>
                {displayTitle !== 'CBT' && (
                  <span className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 font-sans tracking-normal hidden xs:inline">
                    (CBT)
                  </span>
                )}
              </div>
              {subtitle && (
                <span
                  className={`text-[10px] font-normal leading-tight text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[150px] sm:max-w-[240px] lg:max-w-none ${
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
          <div className="hidden xl:flex items-center gap-1 2xl:gap-2 text-slate-700 dark:text-slate-200 min-w-0 mx-2 shrink">
            {children}
          </div>
        )}

        {/* SISI KANAN: ThemeToggle + Profil + Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {actions}

          <ThemeToggle size="sm" />

          {userProfile && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
              <div className="hidden md:flex flex-col text-left leading-tight min-w-0">
                <span
                  className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[130px]"
                  title={userProfile.name ? userProfile.name.replace(/\s*\([^)]*\)/g, '').trim() : 'Pengguna'}
                >
                  {userProfile.name ? userProfile.name.replace(/\s*\([^)]*\)/g, '').trim() || 'Pengguna' : 'Pengguna'}
                </span>
                <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">
                  {userProfile.role || 'USER'}
                </span>
              </div>
            </div>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="min-h-[44px] sm:min-h-[38px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/25 font-semibold text-xs transition cursor-pointer active:scale-95 touch-manipulation"
              title="Keluar dari Akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
