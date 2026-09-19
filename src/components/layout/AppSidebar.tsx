'use client'

import React, { useState, useEffect } from 'react'
import { X, LucideIcon, Clock, ChevronDown, ChevronRight, Circle } from 'lucide-react'
import { useRealtimeServerClock } from '@/lib/time-sync'

export interface NavSubItem {
  id: string
  name: string
}

export interface NavTabItem {
  id: string
  name: string
  icon: LucideIcon
  href?: string
  subItems?: NavSubItem[]
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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    data_modul: true,
    data_peserta: true,
    data_tes: true,
  })

  // Auto-expand group jika salah satu sub-item sedang aktif
  useEffect(() => {
    items.forEach((item) => {
      if (item.subItems && item.subItems.some((s) => s.id === activeId)) {
        setExpandedGroups((prev) => ({ ...prev, [item.id]: true }))
      }
    })
  }, [activeId, items])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  return (
    <>
      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          className="print:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Frame CBT Theme */}
      <aside
        className={`print:hidden w-72 bg-slate-900/95 dark:bg-slate-950/95 border-r border-slate-800 dark:border-white/10 text-slate-200 backdrop-blur-2xl flex flex-col fixed inset-y-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header: Jam Server Real-Time */}
        <div className="h-14 sm:h-15 flex items-center justify-between px-3.5 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-inner flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1 font-mono font-bold text-white text-sm tracking-tight leading-none">
                <span>{clock.timeString}</span>
                <span className="text-[9px] font-sans font-semibold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                  WIB
                </span>
              </div>
              <span
                className="text-[10px] text-slate-400 truncate font-medium mt-0.5 leading-tight"
                title={clock.dateString}
              >
                {clock.dateString}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Menu Items with Accordions */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 custom-scrollbar">
          {items.map((item) => {
            const Icon = item.icon
            const hasSub = !!item.subItems && item.subItems.length > 0
            const isGroupExpanded = expandedGroups[item.id] ?? false
            const isChildActive = hasSub && item.subItems?.some((s) => s.id === activeId)
            const isDirectActive = activeId === item.id

            if (hasSub) {
              return (
                <div key={item.id} className="space-y-0.5">
                  {/* Group Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all duration-150 text-xs font-semibold cursor-pointer ${
                      isChildActive
                        ? 'bg-blue-600/20 text-white font-bold border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isChildActive ? 'text-blue-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                        isGroupExpanded ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>

                  {/* Sub-items List (Collapsible) */}
                  {isGroupExpanded && (
                    <div className="pl-3.5 pr-1 py-0.5 space-y-0.5 border-l border-slate-700/60 ml-3 mt-0.5">
                      {item.subItems?.map((sub) => {
                        const isSubActive = activeId === sub.id
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              onSelect(sub.id)
                              onClose()
                            }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 cursor-pointer ${
                              isSubActive
                                ? 'bg-blue-600 text-white font-bold shadow-xs'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <Circle
                              className={`w-1.5 h-1.5 shrink-0 ${
                                isSubActive ? 'text-white fill-white' : 'text-slate-500 fill-slate-500'
                              }`}
                            />
                            <span className="truncate">{sub.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // Direct Tab Item without subitems
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id)
                  onClose()
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all duration-150 text-xs font-semibold cursor-pointer ${
                  isDirectActive
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isDirectActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                {isDirectActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </aside>
    </>
  )
}

