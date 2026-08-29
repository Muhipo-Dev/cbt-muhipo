'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Sparkles, Cloud } from 'lucide-react'

interface ThemeToggleProps {
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function ThemeToggle({ className = '', size = 'default' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    const placeholderSize =
      size === 'sm'
        ? 'w-14 h-8'
        : size === 'lg'
        ? 'w-20 h-11'
        : 'w-16 h-9'
    return (
      <div
        className={`inline-flex rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse border border-slate-300 dark:border-slate-700 shrink-0 ${placeholderSize} ${className}`}
      />
    )
  }

  const isDark = resolvedTheme === 'dark'

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const newTheme = isDark ? 'light' : 'dark'
    setTheme(newTheme)

    if (typeof window !== 'undefined' && document.documentElement) {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
        document.documentElement.classList.remove('light')
      } else {
        document.documentElement.classList.remove('dark')
        document.documentElement.classList.add('light')
      }
      try {
        localStorage.setItem('cbt_theme_cache', newTheme)
      } catch (err) {}
    }
  }

  const switchSize =
    size === 'sm'
      ? 'w-14 h-8 p-1'
      : size === 'lg'
      ? 'w-20 h-11 p-1.5'
      : 'w-16 h-8.5 sm:h-9 p-1 sm:p-1.5'

  const knobSize =
    size === 'sm'
      ? 'w-6 h-6'
      : size === 'lg'
      ? 'w-8 h-8'
      : 'w-6 h-6 sm:w-6.5 sm:h-6.5'

  const translateDist =
    size === 'sm'
      ? 'translate-x-6'
      : size === 'lg'
      ? 'translate-x-9'
      : 'translate-x-7 sm:translate-x-7.5'

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle Tema"
      title={isDark ? 'Beralih ke Mode Terang (Siang)' : 'Beralih ke Mode Gelap (Malam)'}
      className={`relative inline-flex items-center rounded-full transition-all duration-300 ease-in-out cursor-pointer select-none overflow-hidden border shadow-inner active:scale-95 focus:outline-none shrink-0 touch-manipulation ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 border-indigo-500/60 shadow-indigo-950/60 text-amber-300'
          : 'bg-gradient-to-r from-amber-200 via-sky-300 to-blue-400 border-sky-400/70 shadow-sky-200/70 text-amber-500'
      } ${switchSize} ${className}`}
    >
      {/* Background Decorative Particles (Awan Siang & Bintang Malam) */}
      <span className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none overflow-hidden">
        {/* Indikator Awan Mode Siang */}
        <span
          className={`flex items-center transition-all duration-300 transform pointer-events-none ${
            isDark ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
          }`}
        >
          <Cloud className="w-3.5 h-3.5 text-white fill-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] pointer-events-none" />
        </span>

        {/* Indikator Bintang Mode Malam */}
        <span
          className={`flex items-center transition-all duration-300 transform ml-auto pointer-events-none ${
            isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse drop-shadow-[0_0_6px_rgba(252,211,77,0.8)] pointer-events-none" />
        </span>
      </span>

      {/* Tuas Geser Beranimasi Halus (Animated Sliding Knob) */}
      <span
        className={`relative z-10 flex items-center justify-center rounded-full transition-transform duration-300 transform-gpu ease-out shadow-md pointer-events-none ${knobSize} ${
          isDark
            ? `${translateDist} bg-slate-900 border border-amber-400/60 text-amber-300 shadow-indigo-500/50`
            : 'translate-x-0 bg-white border border-amber-300 text-amber-500 shadow-amber-500/30'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 fill-amber-300 transition-transform duration-300 rotate-[-15deg] drop-shadow-[0_0_4px_rgba(252,211,77,0.5)] pointer-events-none" />
        ) : (
          <Sun className="w-3.5 h-3.5 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)] pointer-events-none" />
        )}
      </span>

      {/* Kilau Halus saat Hover */}
      <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  )
}
