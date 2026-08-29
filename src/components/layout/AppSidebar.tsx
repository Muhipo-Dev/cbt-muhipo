'use client'

import React from 'react'
import Link from 'next/link'
import { X, LucideIcon, Clock } from 'lucide-react'
import { useRealtimeServerClock } from '@/lib/time-sync'

export interface NavTabItem {
  id: string
  name: string
  icon: LucideIcon
  href?: string
}

interface AppSidebarProps {
  isOpen: boolean
  onClose: () => void
  items: NavTabItem[]
  activeId: string
  onSelect: (id: string) => void
  title?: string
}

export function AppSidebar({
  isOpen,
  onClose,
  items,
  activeId,
  onSelect,
  title = 'CBT MUHIPO',
}: AppSidebarProps) {
  const clock = useRealtimeServerClock(60000)

  return (
    <>
      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Frame Persis SIMASMUH dengan Dark & Light Mode */}
      <aside
        className={`w-72 bg-white/95 dark:bg-slate-950/95 border-r border-slate-200 dark:border-white/10 text-slate-800 dark:text-white backdrop-blur-2xl flex flex-col fixed inset-y-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header: Area Informasi Waktu Tanggal dan Jam Real-Time WIB */}
        <div className="h-16 flex items-center justify-between px-4 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-blue-600/10 dark:from-blue-900/60 dark:to-indigo-900/60 border-b border-slate-200 dark:border-white/10 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 shadow-inner flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white text-base tracking-tight leading-none">
                <span>{clock.timeString}</span>
                <span className="text-[10px] font-sans font-semibold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  WIB
                </span>
              </div>
              <span
                className="text-[11px] text-slate-600 dark:text-slate-300 truncate font-medium mt-1 leading-tight"
                title={clock.dateString}
              >
                {clock.dateString}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 text-slate-500 dark:text-white/70 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5 custom-scrollbar">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activeId === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id)
                  onClose()
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold cursor-pointer text-left ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-600/30 text-blue-600 dark:text-blue-200 border border-blue-200 dark:border-blue-400/30 backdrop-blur-md shadow-xs'
                    : 'text-slate-600 dark:text-slate-300/80 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-600 dark:text-blue-300' : 'text-slate-400 dark:text-slate-400'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </button>
            )
          })}
        </div>
      </aside>
    </>
  )
}
