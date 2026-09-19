'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Printer, Search, Award, CheckCircle2, TrendingUp, BarChart2, BookOpen, Layers, Users } from 'lucide-react'

interface CetakNilaiViewProps {
  ujianList: any[]
  mapelList?: any[]
  kelasList?: any[]
  settings?: any
  showNotification: (title: string, message: string, type?: any) => void
}

export function CetakNilaiView({
  ujianList,
  mapelList = [],
  kelasList = [],
  settings = {},
  showNotification,
}: CetakNilaiViewProps) {
  // Filter State
  const [selectedTopikId, setSelectedTopikId] = useState<string>('ALL')
  const [selectedUjianId, setSelectedUjianId] = useState<string>(ujianList[0]?.id || 'ALL')
  const [selectedKelas, setSelectedKelas] = useState<string>('ALL')
  const [search, setSearch] = useState<string>('')

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)

  // Filter Ujian berdasarkan Topik (Mata Pelajaran) jika dipilih
  const filteredUjianList = useMemo(() => {
    if (selectedTopikId === 'ALL') return ujianList
    return ujianList.filter(
      (u: any) => u.mataPelajaranId === selectedTopikId || u.mataPelajaran?.id === selectedTopikId
    )
  }, [ujianList, selectedTopikId])

  // Sync selected ujian jika topik berubah
  useEffect(() => {
    if (selectedTopikId !== 'ALL') {
      const match = filteredUjianList.find((u: any) => u.id === selectedUjianId)
      if (!match) {
        setSelectedUjianId(filteredUjianList[0]?.id || '')
      }
    }
  }, [selectedTopikId, filteredUjianList, selectedUjianId])

  // Fetch nilai saat selectedUjianId berubah
  useEffect(() => {
    if (selectedUjianId && selectedUjianId !== 'ALL') {
      fetchNilaiUjian(selectedUjianId)
    } else {
      setData(null)
    }
  }, [selectedUjianId])

  const fetchNilaiUjian = async (ujianId: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/guru/koreksi?ujianId=${ujianId}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setData(null)
      }
    } catch (err) {
      console.error('Fetch cetak nilai error:', err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const activeUjian = data?.activeUjian || ujianList.find((u: any) => u.id === selectedUjianId)
  const kkm = Number(activeUjian?.bankSoal?.kkm || activeUjian?.mataPelajaran?.kkm || 75.0)

  // Ambil opsi kelas / group unik yang tersedia
  const availableKelasOptions = useMemo(() => {
    const listDariHasil = (data?.hasilList || [])
      .map((h: any) => h.siswa?.kelas?.nama)
      .filter(Boolean)
    const listDariMaster = (kelasList || []).map((k: any) => k.nama).filter(Boolean)
    return Array.from(new Set([...listDariHasil, ...listDariMaster])).sort()
  }, [data, kelasList])

  // Filter Peserta & Nilai
  const filteredHasilList = useMemo(() => {
    return (data?.hasilList || []).filter((h: any) => {
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        h.siswa?.name?.toLowerCase().includes(q) ||
        h.siswa?.nomorPeserta?.toLowerCase().includes(q) ||
        h.siswa?.username?.toLowerCase().includes(q)

      const matchKelas = selectedKelas === 'ALL' || h.siswa?.kelas?.nama === selectedKelas
      return matchSearch && matchKelas
    })
  }, [data, search, selectedKelas])

  // Perhitungan Statistik
  const totalStudents = filteredHasilList.length
  const totalScores = filteredHasilList.map((h: any) => Number(h.nilaiTotal) || 0)
  const highestScore = totalScores.length > 0 ? Math.max(...totalScores) : 0
  const lowestScore = totalScores.length > 0 ? Math.min(...totalScores) : 0
  const avgScore =
    totalScores.length > 0
      ? (totalScores.reduce((a: number, b: number) => a + b, 0) / totalScores.length).toFixed(1)
      : '0.0'
  const passedCount = filteredHasilList.filter((h: any) => (Number(h.nilaiTotal) || 0) >= kkm).length
  const passPercentage = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0

  const handlePrint = () => {
    if (!filteredHasilList.length) {
      showNotification('Peringatan', 'Tidak ada data nilai siswa untuk dicetak pada filter ini.', 'warning')
      return
    }
    window.print()
  }

  return (
    <div className="space-y-5">
      {/* PANEL KONTROL & FILTER (Hidden Saat Print) */}
      <div className="print:hidden space-y-4">
        {/* Header Card */}
        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-500" />
              <span>Cetak Nilai Siswa</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cetak laporan rekapitulasi nilai resmi berdasarkan Topik Mata Pelajaran, Jadwal Tes, dan Kelas Siswa.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!filteredHasilList.length || loading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF (Ctrl+P)</span>
          </button>
        </div>

        {/* Filter Bar 3 Dimensi: Topik, Jadwal Tes, dan Kelas Siswa */}
        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs backdrop-blur-xl grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* 1. Filter Topik / Mapel */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>1. Pilih Topik / Mata Pelajaran</span>
            </label>
            <select
              value={selectedTopikId}
              onChange={(e) => setSelectedTopikId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">-- Semua Topik Mata Pelajaran --</option>
              {mapelList
                .filter((m: any) => m.status !== 'TERHAPUS')
                .map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.kode ? `[${m.kode}] ` : ''}{m.nama} (Kls {m.tingkat || 10})
                  </option>
                ))}
            </select>
          </div>

          {/* 2. Filter Jadwal Tes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>2. Pilih Jadwal Tes / Ujian *</span>
            </label>
            <select
              value={selectedUjianId}
              onChange={(e) => setSelectedUjianId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {filteredUjianList.length === 0 ? (
                <option value="">Tidak ada tes untuk topik ini</option>
              ) : (
                filteredUjianList.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    [{u.kodeUjian}] {u.judul}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 3. Filter Kelas */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>3. Pilih Kelas Siswa</span>
            </label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">-- Semua Kelas --</option>
              {availableKelasOptions.map((k: any) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Metric Cards (Statistik Cepat) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Rata-Rata</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-1.5 text-xl font-black text-blue-600 dark:text-blue-400">{avgScore}</div>
            <span className="text-[10px] text-slate-400">Skor Rata-rata</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Tertinggi / Terendah</span>
              <Award className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-1.5 text-xl font-black text-emerald-600 dark:text-emerald-400">
              {highestScore} <span className="text-xs text-slate-400 font-normal">/ {lowestScore}</span>
            </div>
            <span className="text-[10px] text-slate-400">Skor Max & Min</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Siswa Tuntas</span>
              <CheckCircle2 className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-1.5 text-xl font-black text-purple-600 dark:text-purple-400">
              {passedCount} <span className="text-xs text-slate-400 font-semibold">/ {totalStudents}</span>
            </div>
            <span className="text-[10px] text-slate-400">{totalStudents - passedCount} Remidial</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Ketuntasan</span>
              <BarChart2 className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-1.5 text-xl font-black text-amber-600 dark:text-amber-400">{passPercentage}%</div>
            <span className="text-[10px] text-slate-400">Tingkat Ketuntasan</span>
          </div>
        </div>

        {/* Pencarian Nama / Username */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari siswa dalam daftar nilai..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* LEMBAR CETAK RESMI (Tampil di Layar & Terformat Sempurna Saat Dicetak ke Kertas / PDF) */}
      <div className="bg-white text-black p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none">
        {/* KOP / HEADER RESMI */}
        <div className="border-b-2 border-black pb-3 mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {settings?.logoUrl && (
              <img
                src={settings.logoUrl}
                alt="Logo Sekolah"
                className="w-16 h-16 object-contain shrink-0"
              />
            )}
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight uppercase leading-tight">
                {settings?.schoolName || 'SMA MUHAMMADIYAH 1 PONOROGO'}
              </h1>
              <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-wide uppercase">
                LAPORAN REKAPITULASI HASIL & NILAI CBT
              </h2>
              <p className="text-[10px] text-slate-600">
                Tahun Ajaran: {settings?.academicYear || '2026/2027'} | Semester: {settings?.semester || 'Ganjil'} | Server: {settings?.serverLocation || 'Ponorogo'}
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-600 font-mono shrink-0 hidden sm:block print:block">
            <div>Dicetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</div>
            <div>Waktu: {new Date().toLocaleTimeString('id-ID')}</div>
          </div>
        </div>

        {/* METADATA INFORMASI UJIAN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-lg bg-slate-50 print:bg-transparent print:border print:border-slate-300 mb-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Topik / Mapel:</span>
            <span className="font-bold text-slate-900">
              {activeUjian?.mataPelajaran?.nama || 'Mata Pelajaran Ujian'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Jadwal Tes:</span>
            <span className="font-bold text-slate-900">
              {activeUjian?.judul || '-'} [{activeUjian?.kodeUjian || '-'}]
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Kelas:</span>
            <span className="font-bold text-slate-900">
              {selectedKelas === 'ALL' ? 'Semua Kelas' : selectedKelas}
            </span>
          </div>
        </div>

        {/* TABEL NILAI */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-300 print:border-black">
            <thead>
              <tr className="bg-slate-100 print:bg-slate-200 text-slate-900 font-black text-[11px] uppercase border-b border-slate-300 print:border-black">
                <th className="py-2 px-2.5 border-r border-slate-300 print:border-black w-10 text-center">No</th>
                <th className="py-2 px-3 border-r border-slate-300 print:border-black w-28 font-mono">No Peserta</th>
                <th className="py-2 px-3 border-r border-slate-300 print:border-black">Nama Lengkap Siswa</th>
                <th className="py-2 px-3 border-r border-slate-300 print:border-black w-24">Kelas</th>
                <th className="py-2 px-2.5 border-r border-slate-300 print:border-black text-center w-16">Nilai PG</th>
                <th className="py-2 px-2.5 border-r border-slate-300 print:border-black text-center w-16">Nilai Esai</th>
                <th className="py-2 px-3 border-r border-slate-300 print:border-black text-center w-20">Total Nilai</th>
                <th className="py-2 px-3 border-r border-slate-300 print:border-black text-center w-24">Ketuntasan</th>
                <th className="py-2 px-2.5 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 print:divide-black">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500">
                    Memuat data nilai siswa...
                  </td>
                </tr>
              ) : filteredHasilList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500 font-semibold">
                    Tidak ada data nilai siswa untuk topik, tes, atau kelas yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredHasilList.map((p: any, idx: number) => {
                  const isTuntas = Number(p.nilaiTotal ?? 0) >= kkm
                  return (
                    <tr
                      key={p.id}
                      className={idx % 2 === 1 ? 'bg-slate-50/70 print:bg-slate-100/50' : 'bg-white'}
                    >
                      <td className="py-2 px-2.5 border-r border-slate-200 print:border-black text-center font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 print:border-black font-mono font-bold">
                        {p.siswa?.nomorPeserta || p.siswa?.username || '-'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 print:border-black font-bold">
                        {p.siswa?.name}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 print:border-black">
                        {p.siswa?.kelas?.nama || '-'}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 print:border-black text-center">
                        {p.nilaiPG ?? 0}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 print:border-black text-center">
                        {p.nilaiEsai ?? 0}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 print:border-black text-center font-mono font-black text-sm">
                        {p.nilaiTotal ?? 0}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 print:border-black text-center font-bold">
                        <span
                          className={
                            isTuntas
                              ? 'text-emerald-700 font-bold'
                              : 'text-rose-700 font-bold'
                          }
                        >
                          {isTuntas ? 'TUNTAS' : 'REMIDIAL'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-center text-[10px] text-slate-600 uppercase">
                        {p.status || 'SELESAI'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* TANDA TANGAN / PENGESAHAN LAPORAN RESMI (Khusus Print & Tampilan Bawah) */}
        {filteredHasilList.length > 0 && (
          <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-xs text-center break-inside-avoid">
            <div>
              <p className="text-slate-500">Mengetahui,</p>
              <p className="font-bold text-slate-900 mb-16">Kepala Sekolah / Penanggung Jawab CBT</p>
              <p className="font-bold underline text-slate-900">( .................................................... )</p>
              <p className="text-[10px] text-slate-500">NIP. ....................................................</p>
            </div>
            <div>
              <p className="text-slate-500">Ponorogo, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
              <p className="font-bold text-slate-900 mb-16">Guru Pengampu / Proktor CBT</p>
              <p className="font-bold underline text-slate-900">( .................................................... )</p>
              <p className="text-[10px] text-slate-500">NIP. ....................................................</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
