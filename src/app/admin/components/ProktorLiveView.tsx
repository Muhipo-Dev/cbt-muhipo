'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  MonitorPlay,
  RotateCcw,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Eye,
  RefreshCw,
  Maximize2,
  ShieldAlert,
  ShieldCheck,
  Tv,
  Monitor,
  X,
  ExternalLink,
  Laptop,
  Smartphone,
  Calendar,
  Layers,
} from 'lucide-react'

interface ProktorLiveViewProps {
  proktorData: any
  onResetLogin: (pesertaUjianId: string, namaSiswa: string) => void
  onAddExtraTime: (pesertaUjianId: string, namaSiswa: string) => void
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
}

export function ProktorLiveView({
  proktorData,
  onResetLogin,
  onAddExtraTime,
  onRefresh,
  showNotification,
}: ProktorLiveViewProps) {
  const [selectedUjianId, setSelectedUjianId] = useState<string>('')
  const [selectedKelas, setSelectedKelas] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isLiveAutoRefresh, setIsLiveAutoRefresh] = useState<boolean>(true)
  const [lastRefreshedTime, setLastRefreshedTime] = useState<Date>(new Date())

  // Modal Screen & Violation Audit Detail
  const [inspectModal, setInspectModal] = useState<any>(null)
  const [liveScreenFeed, setLiveScreenFeed] = useState<any>(null)
  const [inspectTab, setInspectTab] = useState<'LIVE' | 'SNAPSHOT' | 'LOGS'>('LIVE')

  const activeUjianList = proktorData?.ujianList || proktorData?.activeUjianList || []

  // Ensure an ujian is selected if available
  const currentUjianId =
    selectedUjianId || (activeUjianList.length > 0 ? activeUjianList[0].id : '')

  const currentUjian = activeUjianList.find((u: any) => u.id === currentUjianId)

  // Filter peserta
  const pesertaList: any[] = proktorData?.pesertaList || []

  // Auto-refresh interval (2 detik)
  useEffect(() => {
    if (!isLiveAutoRefresh) return

    const timer = setInterval(() => {
      onRefresh()
      setLastRefreshedTime(new Date())
    }, 2500)

    return () => clearInterval(timer)
  }, [isLiveAutoRefresh, onRefresh])

  // Polling Live Screen Frame Siswa saat Modal Terbuka
  useEffect(() => {
    if (!inspectModal?.pesertaUjianId) {
      setLiveScreenFeed(null)
      return
    }

    const fetchScreen = async () => {
      try {
        const res = await fetch(
          `/api/proktor/screen?pesertaUjianId=${inspectModal.pesertaUjianId}`
        )
        const json = await res.json()
        if (json.success && json.data) {
          setLiveScreenFeed(json.data)
        }
      } catch (err) {
        // silent
      }
    }

    fetchScreen()
    const screenInterval = setInterval(fetchScreen, 1500)
    return () => clearInterval(screenInterval)
  }, [inspectModal?.pesertaUjianId])

  // Ambil data unik kelas
  const kelasOptions = useMemo(() => {
    const set = new Set<string>()
    pesertaList.forEach((p: any) => {
      if (p.kelas && p.kelas !== '-') set.add(p.kelas)
    })
    return Array.from(set).sort()
  }, [pesertaList])

  // Filtered Peserta
  const filteredPeserta = useMemo(() => {
    return pesertaList.filter((p: any) => {
      const matchUjian = !currentUjianId || p.ujianId === currentUjianId || true // fallback jika semua peserta ditampilkan
      const matchKelas = selectedKelas === 'ALL' || p.kelas === selectedKelas
      const matchSearch =
        !searchQuery.trim() ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nomorPeserta?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchUjian && matchKelas && matchSearch
    })
  }, [pesertaList, currentUjianId, selectedKelas, searchQuery])

  // Quick stats
  const totalMengerjakan = pesertaList.filter(
    (p) => p.status === 'SEDANG_MENGERJAKAN' || p.status === 'MENGERJAKAN'
  ).length
  const totalSelesai = pesertaList.filter((p) => p.status === 'SELESAI').length
  const totalPelanggaran = pesertaList.filter(
    (p) => (p.jumlahPelanggaran || p.pelanggaranCount || 0) > 0
  ).length
  const totalLiveAktif = pesertaList.filter((p) => Boolean(p.hasLiveScreen)).length

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Pengawasan Proktor Live & Anti-Cheat
                </h2>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-black tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  LIVE MONITORING
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pantau layar Chrome siswa, tangkapan snapshot pelanggaran, dan aktivitas pengerjaan real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsLiveAutoRefresh(!isLiveAutoRefresh)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isLiveAutoRefresh
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLiveAutoRefresh ? 'animate-spin' : ''}`}
                style={{ animationDuration: '3s' }}
              />
              <span>{isLiveAutoRefresh ? 'Auto Live (2.5s)' : 'Live Dijeda'}</span>
            </button>

            <button
              onClick={() => {
                onRefresh()
                setLastRefreshedTime(new Date())
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">Total Peserta</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">{pesertaList.length}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
              👥
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">Sedang Mengerjakan</span>
              <span className="text-xl font-black text-blue-700 dark:text-blue-300">{totalMengerjakan}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              ⏳
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">Feed Layar Aktif</span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">{totalLiveAktif}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              🖥️
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block">Terdeteksi Pelanggaran</span>
              <span className="text-xl font-black text-rose-700 dark:text-rose-300">{totalPelanggaran}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
              ⚠️
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/60 dark:border-white/5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Pilih Ujian Aktif</label>
            <select
              value={currentUjianId}
              onChange={(e) => setSelectedUjianId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white"
            >
              {activeUjianList.length === 0 ? (
                <option value="">Semua Sesi Ujian Aktif</option>
              ) : (
                activeUjianList.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.kodeUjian ? `[${u.kodeUjian}] ` : ''}{u.judul} - {u.bankSoal?.mataPelajaran?.nama || u.mataPelajaran?.nama || u.bankSoal?.nama || ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Filter Kelas / Rombel</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white"
            >
              <option value="ALL">Semua Kelas ({pesertaList.length} Peserta)</option>
              {kelasOptions.map((k) => (
                <option key={k} value={k}>
                  {k} ({pesertaList.filter((p) => p.kelas === k).length})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Cari Peserta</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, username..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tabel Live Peserta & Monitoring Screen */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Daftar Peserta Ujian</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {filteredPeserta.length} Siswa
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Klik <b>"Live Layar"</b> atau badge <b>Pelanggaran</b> untuk membuka visual inspeksi pengerjaan siswa.
            </p>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Sinkronisasi: <span className="text-blue-600 dark:text-blue-400 font-bold">{lastRefreshedTime.toLocaleTimeString('id-ID')}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="py-3 px-3 font-bold">No</th>
                <th className="py-3 px-3 font-bold">Peserta</th>
                <th className="py-3 px-3 font-bold">Kelas</th>
                <th className="py-3 px-3 font-bold text-center">Status</th>
                <th className="py-3 px-3 font-bold text-center">Sisa Waktu</th>
                <th className="py-3 px-3 font-bold text-center">Jawaban</th>
                <th className="py-3 px-3 font-bold text-center">Live & Snapshot</th>
                <th className="py-3 px-3 font-bold text-center">Pelanggaran</th>
                <th className="py-3 px-3 font-bold text-center">Aksi Proktor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {filteredPeserta.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Belum ada peserta yang mengikuti sesi ujian ini.
                  </td>
                </tr>
              ) : (
                filteredPeserta.map((p: any, idx: number) => {
                  const isDoing =
                    p.status === 'SEDANG_MENGERJAKAN' || p.status === 'MENGERJAKAN'
                  const isDone = p.status === 'SELESAI'
                  const isTerkunci = p.status === 'TERKUNCI'
                  const pCount = p.jumlahPelanggaran ?? p.pelanggaranCount ?? 0
                  const sisaMnt = p.sisaDetik != null ? Math.ceil(p.sisaDetik / 60) : p.sisaWaktuMenit

                  return (
                    <tr
                      key={p.pesertaUjianId || p.id || idx}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        pCount > 0 ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.hasLiveScreen && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="Feed Layar Aktif" />
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {p.username} {p.nomorPeserta && p.nomorPeserta !== '-' ? `• No: ${p.nomorPeserta}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold">{p.kelas || '-'}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isTerkunci
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                              : isDoing
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 animate-pulse'
                              : isDone
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {p.status || 'BELUM MULAI'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {sisaMnt != null ? `${sisaMnt} m` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        {p.jumlahJawaban != null
                          ? `${p.jumlahJawaban} Soal`
                          : p.terjawabCount != null
                          ? `${p.terjawabCount} / ${p.totalSoal || 0}`
                          : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setInspectModal(p)
                            setInspectTab(p.hasLiveScreen ? 'LIVE' : p.latestScreenshot ? 'SNAPSHOT' : 'LOGS')
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                            p.hasLiveScreen
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 animate-pulse'
                              : p.latestScreenshot
                              ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title="Inspeksi Layar & Bukti Siswa"
                        >
                          {p.hasLiveScreen ? (
                            <Tv className="w-3.5 h-3.5" />
                          ) : (
                            <Monitor className="w-3.5 h-3.5" />
                          )}
                          <span>{p.hasLiveScreen ? 'Live Layar' : p.latestScreenshot ? 'Snapshot' : 'Lihat Layar'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {pCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setInspectModal(p)
                              setInspectTab('LOGS')
                            }}
                            className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-[10px] hover:bg-rose-500/25 transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>{pCount}x Pelanggaran</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5" /> 0
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() =>
                              onResetLogin(p.pesertaUjianId || p.id, p.name)
                            }
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition cursor-pointer"
                            title="Reset Login Ujian Siswa"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              onAddExtraTime(p.pesertaUjianId || p.id, p.name)
                            }
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition cursor-pointer"
                            title="Tambah Waktu Ujian (+Waktu)"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL INSPEKSI LIVE SCREEN STREAM, SNAPSHOT BUKTI & AUDIT PELANGGARAN */}
      {inspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-white border border-white/10">
                  <Monitor className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">
                      {inspectModal.name}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-blue-300 font-mono">
                      {inspectModal.username}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Kelas: <b>{inspectModal.kelas}</b> • Status:{' '}
                    <span className="font-bold text-emerald-400">{inspectModal.status || 'SEDANG_MENGERJAKAN'}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setInspectTab('LIVE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  inspectTab === 'LIVE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Live Screen Stream</span>
                {liveScreenFeed?.isOnline && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setInspectTab('SNAPSHOT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  inspectTab === 'SNAPSHOT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MonitorPlay className="w-3.5 h-3.5" />
                <span>Snapshot Bukti Pelanggaran</span>
                {inspectModal.latestScreenshot && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-white">Ada</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setInspectTab('LOGS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  inspectTab === 'LOGS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Riwayat Audit ({inspectModal.violationLogs?.length ?? inspectModal.jumlahPelanggaran ?? 0})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* TAB 1: LIVE FEED LAYAR CHROME */}
              {inspectTab === 'LIVE' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="relative flex h-2.5 w-2.5">
                        <span
                          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            liveScreenFeed?.isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                        <span
                          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                            liveScreenFeed?.isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                      </span>
                      <span className="text-slate-900 dark:text-white font-bold">
                        {liveScreenFeed?.isOnline
                          ? '🔴 FEED LAYAR REAL-TIME AKTIF'
                          : 'STATUS TERAKHIR PESERTA'}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {liveScreenFeed?.device || 'Chrome Desktop / Mobile'}
                    </div>
                  </div>

                  {liveScreenFeed?.screenImage ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-xl bg-black group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={liveScreenFeed.screenImage}
                        alt={`Live Screen ${inspectModal.name}`}
                        className="w-full h-auto max-h-[380px] object-contain bg-slate-950 mx-auto"
                      />
                      <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-slate-950/85 backdrop-blur-md text-white text-[11px] flex justify-between items-center border border-white/10">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>
                            {liveScreenFeed.isStreamNative
                              ? 'Native Chrome Screen Stream'
                              : 'Mobile Active Exam Guard'} • Update: {Math.round((liveScreenFeed.ageMs || 0) / 1000)}s lalu
                          </span>
                        </div>
                        <a
                          href={liveScreenFeed.screenImage}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold shrink-0 ml-2 shadow-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Perbesar</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 space-y-2">
                      <Monitor className="w-10 h-10 text-slate-400 opacity-50 mx-auto animate-pulse" />
                      <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                        Menunggu feed layar Chrome siswa aktif...
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        Di browser <b>Google Chrome</b> PC/Laptop, siswa akan membagikan Entire Screen saat mengawali ujian. Di smartphone Android/iOS, sistem memancarkan dashboard aktif pengerjaan otomatis.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SNAPSHOT BUKTI PELANGGARAN */}
              {inspectTab === 'SNAPSHOT' && (
                <div className="space-y-3">
                  {inspectModal.latestScreenshot ? (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            <b>Bukti Terakhir:</b> {inspectModal.latestViolationDetail || inspectModal.latestViolationActivity || 'Terdeteksi berpindah tab / layar'}
                          </span>
                        </div>
                        <a
                          href={inspectModal.latestScreenshot}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] shrink-0"
                        >
                          Buka Gambar Penuh
                        </a>
                      </div>

                      <div className="relative rounded-2xl overflow-hidden border-2 border-rose-500/50 shadow-xl bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={inspectModal.latestScreenshot}
                          alt="Snapshot Bukti Pelanggaran"
                          className="w-full h-auto max-h-[380px] object-contain bg-slate-950 mx-auto"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-500 space-y-2">
                      <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto opacity-70" />
                      <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                        Tidak ada snapshot bukti pelanggaran
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Siswa ini belum pernah terdeteksi meninggalkan halaman ujian atau melakukan pelanggaran keyboard.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: LOG AUDIT PELANGGARAN */}
              {inspectTab === 'LOGS' && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                    Riwayat Seluruh Aktivitas & Pelanggaran:
                  </span>
                  <div className="max-h-64 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                    {(!inspectModal.logsTerakhir || inspectModal.logsTerakhir.length === 0) ? (
                      <p className="text-center text-[11px] text-slate-400 py-6">
                        Belum ada riwayat aktivitas yang tercatat.
                      </p>
                    ) : (
                      inspectModal.logsTerakhir.map((log: any, i: number) => {
                        const isViolation = [
                          'TAB_SWITCH_ALERT',
                          'WINDOW_BLUR',
                          'FULLSCREEN_EXIT',
                          'SCREEN_SHARE_STOPPED',
                          'KEYBOARD_SHORTCUT_VIOLATION',
                          'SECURITY_ALERT',
                        ].includes(log.aktivitas)

                        return (
                          <div
                            key={log.id || i}
                            className={`p-2.5 rounded-xl text-xs flex justify-between items-start gap-2 ${
                              isViolation
                                ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-bold font-mono uppercase text-[10px] block text-rose-600 dark:text-rose-400">
                                {log.aktivitas}
                              </span>
                              <p className="text-[11px] mt-0.5">{log.detail || '-'}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {new Date(log.createdAt).toLocaleTimeString('id-ID')}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setInspectModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 cursor-pointer transition"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetLogin(inspectModal.pesertaUjianId || inspectModal.id, inspectModal.name)
                    setInspectModal(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Sesi Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAddExtraTime(inspectModal.pesertaUjianId || inspectModal.id, inspectModal.name)
                    setInspectModal(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>+Tambah Waktu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
