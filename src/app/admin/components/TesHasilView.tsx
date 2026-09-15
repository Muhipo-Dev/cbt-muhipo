'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2, RotateCcw, Search, GraduationCap, ShieldAlert, Award, AlertTriangle } from 'lucide-react'

interface TesHasilViewProps {
  ujianList: any[]
  showNotification: (title: string, message: string, type?: any) => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}

export function TesHasilView({
  ujianList,
  showNotification,
  showConfirm,
}: TesHasilViewProps) {
  const [selectedUjianId, setSelectedUjianId] = useState(ujianList[0]?.id || '')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterKelas, setFilterKelas] = useState('ALL')

  useEffect(() => {
    if (selectedUjianId) {
      fetchHasil(selectedUjianId)
    }
  }, [selectedUjianId])

  const fetchHasil = async (ujianId: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/guru/koreksi?ujianId=${ujianId}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch (err: any) {
      console.error('Fetch hasil error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPeserta = (p: any) => {
    showConfirm(
      'Reset Status Ujian Peserta?',
      `Apakah Anda yakin ingin mereset ujian ${p.siswa?.name}? Status ujian akan kembali ke "BELUM MULAI" dan jawaban sebelumnya akan dikosongkan agar siswa dapat mengulang dari awal.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'RESET_PESERTA_UJIAN',
              pesertaUjianId: p.id,
            }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil Direset', json.message || 'Status pengerjaan siswa berhasil direset.', 'success')
            fetchHasil(selectedUjianId)
          } else {
            showNotification('Gagal', json.message || 'Gagal mereset status peserta', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // Get distinct classes in results
  const kelasOptions = Array.from(
    new Set((data?.hasilList || []).map((h: any) => h.siswa?.kelas?.nama).filter(Boolean))
  ).sort()

  const filtered = (data?.hasilList || []).filter((h: any) => {
    const q = search.toLowerCase().trim()
    const matchSearch =
      !q ||
      h.siswa?.name?.toLowerCase().includes(q) ||
      h.siswa?.username?.toLowerCase().includes(q) ||
      h.siswa?.nomorPeserta?.toLowerCase().includes(q) ||
      h.siswa?.kelas?.nama?.toLowerCase().includes(q)

    const matchKelas = filterKelas === 'ALL' || h.siswa?.kelas?.nama === filterKelas
    return matchSearch && matchKelas
  })

  return (
    <div className="space-y-4">
      {/* Header & Selector */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-500" />
            <span>Hasil & Lembar Pengerjaan Tes Peserta</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daftar perolehan nilai, status pengerjaan ujian, dan opsi reset pengerjaan per siswa.
          </p>
        </div>

        <div>
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
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa, username, atau group..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
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
                <th className="py-3.5 px-4">Username / ID</th>
                <th className="py-3.5 px-4">Nama Peserta</th>
                <th className="py-3.5 px-4">Group</th>
                <th className="py-3.5 px-4 text-center">Nilai PG</th>
                <th className="py-3.5 px-4 text-center">Nilai Esai</th>
                <th className="py-3.5 px-4 text-center">Nilai Total</th>
                <th className="py-3.5 px-4 text-center">Status Pengerjaan</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Memuat hasil tes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Tidak ada data pengerjaan peserta yang ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
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
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          p.status === 'SELESAI'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : p.status === 'SEDANG_MENGERJAKAN'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleResetPeserta(p)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px] font-bold hover:bg-rose-100 transition cursor-pointer flex items-center gap-1 ml-auto"
                        title="Reset status ujian siswa"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Ujian</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
