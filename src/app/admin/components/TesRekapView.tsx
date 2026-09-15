'use client'

import React, { useState, useEffect } from 'react'
import { Download, FileSpreadsheet, CheckCircle2, AlertTriangle, Search, Award, TrendingUp, BarChart2 } from 'lucide-react'
import * as XLSX from 'xlsx'

interface TesRekapViewProps {
  ujianList: any[]
  showNotification: (title: string, message: string, type?: any) => void
}

export function TesRekapView({
  ujianList,
  showNotification,
}: TesRekapViewProps) {
  const [selectedUjianId, setSelectedUjianId] = useState(ujianList[0]?.id || '')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedKelas, setSelectedKelas] = useState('ALL')

  useEffect(() => {
    if (selectedUjianId) {
      fetchRekap(selectedUjianId)
    }
  }, [selectedUjianId])

  const fetchRekap = async (ujianId: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/guru/koreksi?ujianId=${ujianId}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch (err: any) {
      console.error('Fetch rekap error:', err)
    } finally {
      setLoading(false)
    }
  }

  const kkm = Number(data?.activeUjian?.bankSoal?.kkm ?? 75.0)

  const kelasOptions = Array.from(
    new Set((data?.hasilList || []).map((h: any) => h.siswa?.kelas?.nama).filter(Boolean))
  ).sort()

  const filtered = (data?.hasilList || []).filter((h: any) => {
    const q = search.toLowerCase().trim()
    const matchSearch =
      !q ||
      h.siswa?.name?.toLowerCase().includes(q) ||
      h.siswa?.nomorPeserta?.toLowerCase().includes(q) ||
      h.siswa?.username?.toLowerCase().includes(q)

    const matchKelas = selectedKelas === 'ALL' || h.siswa?.kelas?.nama === selectedKelas
    return matchSearch && matchKelas
  })

  // Statistics calculation
  const totalStudents = filtered.length
  const totalScores = filtered.map((h: any) => Number(h.nilaiTotal) || 0)
  const highestScore = totalScores.length > 0 ? Math.max(...totalScores) : 0
  const lowestScore = totalScores.length > 0 ? Math.min(...totalScores) : 0
  const avgScore = totalScores.length > 0 ? (totalScores.reduce((a: number, b: number) => a + b, 0) / totalScores.length).toFixed(1) : 0
  const passedCount = filtered.filter((h: any) => (Number(h.nilaiTotal) || 0) >= kkm).length
  const passPercentage = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0

  const handleExportExcel = () => {
    if (!filtered.length) {
      showNotification('Informasi', 'Belum ada data nilai untuk diekspor.', 'info')
      return
    }

    const rows = filtered.map((p: any, idx: number) => {
      const isTuntas = Number(p.nilaiTotal ?? 0) >= kkm
      return {
        No: idx + 1,
        Username: p.siswa.username,
        'Nomor Peserta': p.siswa.nomorPeserta || p.siswa.username,
        'Nama Lengkap': p.siswa.name,
        'Group / Kelas': p.siswa.kelas?.nama || '-',
        'Nilai PG / Pilihan': Number(Number(p.nilaiPG || 0).toFixed(2)),
        'Nilai Isian & Esai': Number(Number(p.nilaiEsai || 0).toFixed(2)),
        'Total Nilai CBT': Number(Number(p.nilaiTotal || 0).toFixed(2)),
        'KKM Mapel': kkm,
        Ketuntasan: isTuntas ? 'TUNTAS' : 'REMIDIAL',
        'Status Ujian': p.status,
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Nilai')
    const suffix = selectedKelas !== 'ALL' ? `_${selectedKelas}` : ''
    XLSX.writeFile(workbook, `Rekap_Nilai_${data?.activeUjian?.kodeUjian || 'Tes'}${suffix}.xlsx`)
    showNotification('Berhasil', 'Rekap nilai berhasil diekspor ke Excel.', 'success')
  }

  return (
    <div className="space-y-4">
      {/* Header & Selector */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <span>Rekapitulasi Nilai & Laporan Hasil Tes</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Laporan statistik perolehan nilai, persentase ketuntasan KKM, dan ekspor lembar rekap Excel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedUjianId}
            onChange={(e) => setSelectedUjianId(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {ujianList.map((u) => (
              <option key={u.id} value={u.id}>
                [{u.kodeUjian}] {u.judul}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/30 transition cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Rekap Excel</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Rata-Rata Nilai</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">{avgScore}</div>
          <span className="text-[10px] text-slate-400 font-semibold">KKM Acuan: {kkm}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Nilai Tertinggi</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{highestScore}</div>
          <span className="text-[10px] text-slate-400 font-semibold">Nilai Terendah: {lowestScore}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Peserta Tuntas</span>
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">
            {passedCount} <span className="text-xs text-slate-400 font-semibold">/ {totalStudents}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">{totalStudents - passedCount} Perlu Remidial</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Ketuntasan Klasikal</span>
            <BarChart2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{passPercentage}%</div>
          <span className="text-[10px] text-slate-400 font-semibold">Tuntas KKM &gt;= {kkm}</span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari siswa atau username..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Group / Kelas</option>
            {kelasOptions.map((k: any) => (
              <option key={k} value={k}>
                Group: {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4">Username / ID</th>
                <th className="py-3.5 px-4">Nama Lengkap Siswa</th>
                <th className="py-3.5 px-4">Group</th>
                <th className="py-3.5 px-4 text-center">Nilai PG</th>
                <th className="py-3.5 px-4 text-center">Nilai Esai</th>
                <th className="py-3.5 px-4 text-center">Nilai Total</th>
                <th className="py-3.5 px-4 text-center">Ketuntasan (KKM {kkm})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Memuat rekapitulasi nilai...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Tidak ada data nilai peserta untuk filter ini.
                  </td>
                </tr>
              ) : (
                filtered.map((p: any, idx: number) => {
                  const isTuntas = (Number(p.nilaiTotal) || 0) >= kkm
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-medium text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {p.siswa?.username}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {p.siswa?.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {p.siswa?.kelas?.nama || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {p.nilaiPG ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {p.nilaiEsai ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                          {p.nilaiTotal ?? 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                            isTuntas
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isTuntas ? '✓ TUNTAS' : '⚠ REMIDIAL'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
