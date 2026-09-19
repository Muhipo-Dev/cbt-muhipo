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
  EyeOff,
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
  KeyRound,
} from 'lucide-react'

interface ProktorLiveViewProps {
  proktorData: any
  onResetLogin: (pesertaUjianId: string, namaSiswa: string) => void
  onAddExtraTime: (pesertaUjianId: string, namaSiswa: string) => void
  onResetPelanggaran: (pesertaUjianId: string, namaSiswa: string) => void
  onResetAllPelanggaran: (ujianId: string) => void
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
}

export function ProktorLiveView({
  proktorData,
  onResetLogin,
  onAddExtraTime,
  onResetPelanggaran,
  onResetAllPelanggaran,
  onRefresh,
  showNotification,
}: ProktorLiveViewProps) {
  const [selectedUjianId, setSelectedUjianId] = useState<string>('')
  const [selectedKelas, setSelectedKelas] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isLiveAutoRefresh, setIsLiveAutoRefresh] = useState<boolean>(true)
  const [lastRefreshedTime, setLastRefreshedTime] = useState<Date>(new Date())

  // Modal Audit Log Pelanggaran & Peringatan Siswa
  const [inspectModal, setInspectModal] = useState<any>(null)

  // Modal Ubah Password Siswa
  const [passwordModal, setPasswordModal] = useState<any>(null)
  const [newPasswordInput, setNewPasswordInput] = useState<string>('')
  const [isSavingPassword, setIsSavingPassword] = useState<boolean>(false)
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false)

  const handleOpenChangePassword = (p: any) => {
    setPasswordModal(p)
    setNewPasswordInput('')
    setShowPasswordText(false)
  }

  const handleConfirmChangePassword = async () => {
    if (!passwordModal) return
    const pass = newPasswordInput.trim()
    if (!pass) {
      showNotification('Peringatan', 'Silakan masukkan kata sandi baru untuk peserta.', 'warning')
      return
    }

    try {
      setIsSavingPassword(true)
      const res = await fetch('/api/proktor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_PASSWORD',
          siswaId: passwordModal.siswaId || passwordModal.id,
          pesertaUjianId: passwordModal.pesertaUjianId,
          newPassword: pass,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotification(
          'Password Berhasil Diubah',
          json.message || `Password siswa "${passwordModal.name}" berhasil diubah menjadi "${pass}"`,
          'success'
        )
        setPasswordModal(null)
        setNewPasswordInput('')
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal mengubah password siswa', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal mengubah password: ' + err.message, 'error')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const activeUjianList = proktorData?.ujianList || proktorData?.activeUjianList || []

  // Ensure an ujian is selected if available
  const currentUjianId =
    selectedUjianId || (activeUjianList.length > 0 ? activeUjianList[0].id : '')

  const currentUjian = activeUjianList.find((u: any) => u.id === currentUjianId)

  // Filter peserta
  const pesertaList: any[] = proktorData?.pesertaList || []

  // Auto-refresh interval (3 detik)
  useEffect(() => {
    if (!isLiveAutoRefresh) return

    const timer = setInterval(() => {
      onRefresh()
      setLastRefreshedTime(new Date())
    }, 3000)

    return () => clearInterval(timer)
  }, [isLiveAutoRefresh, onRefresh])

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
                  Pengawasan Proktor Live & Log Peringatan
                </h2>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-black tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  LOG MONITORING AKTIF
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pantau log aktivitas peserta, status pengerjaan real-time, dan log peringatan pelanggaran siswa secara efisien tanpa membebani perangkat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {totalPelanggaran > 0 && (
              <button
                type="button"
                onClick={() => onResetAllPelanggaran(currentUjianId)}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Reset semua pelanggaran siswa pada sesi ini"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Reset Semua Pelanggaran ({totalPelanggaran})</span>
              </button>
            )}

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
              <span>{isLiveAutoRefresh ? 'Auto Sync (3s)' : 'Sync Dijeda'}</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
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

          <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block">Terdeteksi Pelanggaran</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-rose-700 dark:text-rose-300">{totalPelanggaran}</span>
                {totalPelanggaran > 0 && (
                  <button
                    type="button"
                    onClick={() => onResetAllPelanggaran(currentUjianId)}
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs transition flex items-center gap-1"
                    title="Reset semua pelanggaran"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
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

      {/* 2. Tabel Pengawasan Log Peserta Ujian */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-white/5 pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Daftar Peserta & Aktivitas Ujian</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {filteredPeserta.length} Siswa
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monitoring status pengerjaan, sisa waktu, jumlah soal terjawab, dan riwayat log peringatan siswa.
            </p>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Sync Terakhir: <span className="text-blue-600 dark:text-blue-400 font-bold">{lastRefreshedTime.toLocaleTimeString('id-ID')}</span>
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
                <th className="py-3 px-3 font-bold text-center">Log Peringatan</th>
                <th className="py-3 px-3 font-bold text-center">Aksi Proktor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {filteredPeserta.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
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
                        <div className="font-bold text-slate-900 dark:text-white">
                          {p.name}
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
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
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
                          onClick={() => setInspectModal(p)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                            pCount > 0 || isTerkunci
                              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title="Lihat Riwayat Log & Peringatan Siswa"
                        >
                          {pCount > 0 ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          <span>{pCount > 0 ? `${pCount}x Peringatan` : 'Lihat Log'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {(pCount > 0 || isTerkunci) && (
                            <button
                              onClick={() =>
                                onResetPelanggaran(p.pesertaUjianId || p.id, p.name)
                              }
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition cursor-pointer"
                              title="Reset Peringatan Siswa & Buka Kunci"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                          <button
                            onClick={() => handleOpenChangePassword(p)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                            title="Ubah Password Peserta"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
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

      {/* 3. MODAL LOG AUDIT AKTIVITAS & PERINGATAN PELANGGARAN SISWA */}
      {inspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-white border border-white/10">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
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

            {/* Modal Body: Log List */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-white/10">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Riwayat Log Aktivitas & Peringatan ({inspectModal.logsTerakhir?.length || 0})
                </span>
                {((inspectModal.jumlahPelanggaran ?? 0) > 0 || inspectModal.status === 'TERKUNCI') && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetPelanggaran(inspectModal.pesertaUjianId || inspectModal.id, inspectModal.name)
                      setInspectModal(null)
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Reset Peringatan (0)</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(!inspectModal.logsTerakhir || inspectModal.logsTerakhir.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 opacity-70" />
                    <p className="text-xs font-semibold">Tidak ada catatan pelanggaran atau aktivitas mencurigakan.</p>
                  </div>
                ) : (
                  inspectModal.logsTerakhir.map((log: any, i: number) => {
                    const isViolation = [
                      'TAB_SWITCH_ALERT',
                      'APP_SWITCH_ALERT',
                      'WINDOW_BLUR',
                      'FULLSCREEN_EXIT',
                      'SCREEN_SHARE_STOPPED',
                      'KEYBOARD_SHORTCUT_VIOLATION',
                      'SECURITY_ALERT',
                    ].includes(log.aktivitas)

                    return (
                      <div
                        key={log.id || i}
                        className={`p-3 rounded-xl text-xs flex justify-between items-start gap-2 ${
                          isViolation
                            ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5'
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

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setInspectModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 cursor-pointer transition"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {((inspectModal.jumlahPelanggaran ?? 0) > 0 || inspectModal.status === 'TERKUNCI') && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetPelanggaran(inspectModal.pesertaUjianId || inspectModal.id, inspectModal.name)
                      setInspectModal(null)
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs cursor-pointer transition flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Reset Peringatan</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onResetLogin(inspectModal.pesertaUjianId || inspectModal.id, inspectModal.name)
                    setInspectModal(null)
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs cursor-pointer transition flex items-center gap-1.5"
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
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>+Tambah Waktu</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = { ...inspectModal }
                    setInspectModal(null)
                    handleOpenChangePassword(target)
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Ubah Password</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL UBAH PASSWORD SISWA */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Ubah Kata Sandi Peserta
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ganti password siswa secara langsung saat sesi ujian berlangsung.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-white/5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Nama Siswa:</span>
                <span className="font-bold text-slate-900 dark:text-white">{passwordModal.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Username / ID:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{passwordModal.username}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Kelas:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{passwordModal.kelas || '-'}</span>
              </div>
              {passwordModal.plainPassword && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-500">Password Saat Ini:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{passwordModal.plainPassword}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Kata Sandi Baru:
              </label>
              <div className="relative">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleConfirmChangePassword()
                    }
                  }}
                  placeholder="Masukkan password baru..."
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  title={showPasswordText ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10.5px] text-slate-400">Pilihan Cepat:</span>
                <button
                  type="button"
                  onClick={() => setNewPasswordInput('123456')}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Default 123456
                </button>
                {passwordModal.username && (
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput(passwordModal.username)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    Gunakan Username
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Siswa dapat langsung login kembali menggunakan kata sandi baru ini.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isSavingPassword}
                onClick={() => {
                  setPasswordModal(null)
                  setNewPasswordInput('')
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingPassword}
                onClick={handleConfirmChangePassword}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSavingPassword ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Simpan Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
