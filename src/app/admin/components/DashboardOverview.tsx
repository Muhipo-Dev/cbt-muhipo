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
  const stats = dashboardData?.stats || {
    totalSiswa: 0,
    totalKelas: 0,
    totalMapel: 0,
    totalBankSoal: 0,
    totalSoal: 0,
    totalUjianAktif: 0,
  }

  const statCards = [
    {
      title: 'Total Peserta',
      value: stats.totalSiswa,
      sub: `${stats.totalKelas} Rombel/Group`,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      tab: 'peserta_daftar',
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

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>CBT Mandiri Aktif</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Selamat Datang, {currentUser?.name || 'Administrator'}!
            </h2>
            <p className="text-sm text-blue-100 max-w-2xl leading-relaxed">
              Sistem Computer Based Test (CBT) mandiri {settings.schoolName || 'SMA Muhammadiyah 1 Ponorogo'}. Kelola data modul, peserta, dan tes ujian secara mandiri tanpa ketergantungan eksternal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('tes_tambah')}
              className="px-4 py-2.5 rounded-2xl bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 shadow-lg hover:shadow-xl transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-700" />
              <span>Tambah Tes Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={idx}
              onClick={() => onNavigate(card.tab)}
              className="group cursor-pointer bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    {card.title}
                  </span>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">
                    {card.value}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                    {card.sub}
                  </span>
                </div>
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-lg group-hover:scale-110 transition duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Nav Shortcut Buttons */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm dark:shadow-xl backdrop-blur-xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Akses Cepat Fitur CBT</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Topik & Mapel', tab: 'modul_topik', icon: BookOpen, color: 'text-blue-500' },
            { label: 'Input Soal', tab: 'modul_soal', icon: Plus, color: 'text-emerald-500' },
            { label: 'Import Soal Excel', tab: 'modul_import', icon: FileSpreadsheet, color: 'text-purple-500' },
            { label: 'Daftar Peserta', tab: 'peserta_daftar', icon: Users, color: 'text-cyan-500' },
            { label: 'Import Peserta', tab: 'peserta_import', icon: FileSpreadsheet, color: 'text-amber-500' },
            { label: 'Hasil & Rekap', tab: 'tes_hasil', icon: CheckCircle2, color: 'text-rose-500' },
          ].map((item, idx) => {
            const Icon = item.icon
            return (
              <button
                key={idx}
                onClick={() => onNavigate(item.tab)}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/80 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-slate-200/60 dark:border-white/5 text-center transition group cursor-pointer"
              >
                <Icon className={`w-6 h-6 mb-2 ${item.color} group-hover:scale-110 transition`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
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
