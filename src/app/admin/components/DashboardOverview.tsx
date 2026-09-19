'use client'

import React from 'react'
import {
  Users,
  BookOpen,
  Calendar,
  MonitorPlay,
  FileSpreadsheet,
  Plus,
  Play,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  KeyRound,
  FileText,
  Database,
} from 'lucide-react'

interface DashboardOverviewProps {
  currentUser: any
  dashboardData: any
  settings: any
  onNavigate: (tabId: string) => void
  onRefresh: () => void
}

export function DashboardOverview({
  currentUser,
  dashboardData,
  settings,
  onNavigate,
  onRefresh,
}: DashboardOverviewProps) {
  const counts = dashboardData?.counts || {}
  const rawStats = dashboardData?.stats || {}

  const stats = {
    totalSiswa: rawStats.totalSiswa ?? counts.countSiswa ?? 0,
    totalKelas: rawStats.totalKelas ?? counts.countKelas ?? 0,
    totalMapel: rawStats.totalMapel ?? counts.countTopik ?? 0,
    totalBankSoal: rawStats.totalBankSoal ?? counts.countBankSoal ?? counts.countTopik ?? 0,
    totalSoal: rawStats.totalSoal ?? counts.countSoalTotal ?? 0,
    totalUjianAktif: rawStats.totalUjianAktif ?? counts.countUjian ?? counts.countUjianHariIni ?? 0,
  }

  const cleanName = (name?: string) => {
    if (!name) return 'Administrator'
    return name.replace(/\s*\([^)]*\)/g, '').trim() || 'Administrator'
  }

  const isProktor = currentUser?.role === 'PROKTOR'

  const statCards = [
    {
      title: 'Total Peserta',
      value: stats.totalSiswa,
      sub: `${stats.totalKelas} Rombel/Group`,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      tab: isProktor ? 'tes_daftar' : 'peserta_daftar',
    },
    {
      title: 'Topik & Bank Soal',
      value: stats.totalBankSoal,
      sub: `${stats.totalSoal} Butir Soal`,
      icon: BookOpen,
      color: 'from-amber-500 to-orange-600',
      tab: 'modul_topik',
    },
    {
      title: 'Mata Pelajaran',
      value: stats.totalMapel,
      sub: 'Kurikulum Merdeka',
      icon: FileSpreadsheet,
      color: 'from-emerald-500 to-teal-600',
      tab: 'modul_topik',
    },
    {
      title: 'Tes / Ujian Aktif',
      value: stats.totalUjianAktif,
      sub: 'Siap dikerjakan',
      icon: MonitorPlay,
      color: 'from-rose-500 to-pink-600',
      tab: 'tes_daftar',
    },
  ]

  const quickNavItems = isProktor
    ? [
        { label: 'Topik & Mapel', tab: 'modul_topik', icon: BookOpen, color: 'text-blue-500' },
        { label: 'Input Soal', tab: 'modul_soal', icon: Plus, color: 'text-emerald-500' },
        { label: 'Import Soal', tab: 'modul_import', icon: FileSpreadsheet, color: 'text-purple-500' },
        { label: 'Daftar Ujian / Tes', tab: 'tes_daftar', icon: MonitorPlay, color: 'text-rose-500' },
        { label: 'Pengawasan Live', tab: 'proktor_live', icon: ShieldCheck, color: 'text-cyan-500' },
        { label: 'Evaluasi Tes', tab: 'tes_evaluasi', icon: Clock, color: 'text-amber-500' },
        { label: 'Rekap Nilai', tab: 'tes_rekap', icon: CheckCircle2, color: 'text-indigo-500' },
      ]
    : [
        { label: 'Topik & Mapel', tab: 'modul_topik', icon: BookOpen, color: 'text-blue-500' },
        { label: 'Input Soal', tab: 'modul_soal', icon: Plus, color: 'text-emerald-500' },
        { label: 'Import Soal', tab: 'modul_import', icon: FileSpreadsheet, color: 'text-purple-500' },
        { label: 'Daftar Peserta', tab: 'peserta_daftar', icon: Users, color: 'text-cyan-500' },
        { label: 'Import Peserta', tab: 'peserta_import', icon: FileSpreadsheet, color: 'text-amber-500' },
        { label: 'Rekap Nilai', tab: 'tes_rekap', icon: CheckCircle2, color: 'text-rose-500' },
        { label: 'Backup & Ekspor', tab: 'backup_data', icon: Database, color: 'text-indigo-500' },
      ]

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Welcome Banner Compact */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-4 sm:p-6 text-white shadow-md">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold text-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isProktor ? 'Portal Proktor CBT Aktif' : 'Sistem CBT Aktif'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Selamat Datang, {cleanName(currentUser?.name)}!
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
              {isProktor
                ? `Portal Pengawas & Proktor CBT ${settings.schoolName || 'SMA Muhammadiyah 1 Ponorogo'}. Kelola bank soal, jadwal ujian, serta monitoring pelaksanaan tes peserta realtime.`
                : `Sistem Computer Based Test (CBT) ${settings.schoolName || 'SMA Muhammadiyah 1 Ponorogo'}. Kelola data modul, peserta, dan pelaksanaan ujian.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isProktor && (
              <button
                onClick={() => onNavigate('proktor_live')}
                className="px-3.5 py-2 rounded-xl bg-blue-600/60 hover:bg-blue-600 text-white font-bold text-xs border border-white/20 shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Pengawasan Live</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('tes_tambah')}
              className="px-3.5 py-2 rounded-xl bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-blue-700" />
              <span>Tambah Tes Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={idx}
              onClick={() => onNavigate(card.tab)}
              className="group cursor-pointer bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:border-blue-500/50 hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate mb-0.5">
                    {card.title}
                  </span>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                    {card.value}
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block truncate">
                    {card.sub}
                  </span>
                </div>
                <div className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-xs group-hover:scale-105 transition shrink-0`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Nav Shortcut Buttons Compact */}
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs backdrop-blur-xl">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-2.5 sm:mb-3">Akses Cepat Fitur CBT</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-2.5">
          {quickNavItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <button
                key={idx}
                onClick={() => onNavigate(item.tab)}
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-slate-200/60 dark:border-slate-800 text-center transition group cursor-pointer active:scale-95"
              >
                <Icon className={`w-5 h-5 mb-1.5 ${item.color} group-hover:scale-110 transition`} />
                <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate w-full">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
