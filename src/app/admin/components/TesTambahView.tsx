'use client'

import React, { useState } from 'react'
import { Plus, Save } from 'lucide-react'

interface TesTambahViewProps {
  mapelList?: any[]
  bankSoalList?: any[] // Alias kompatibilitas
  kelasList: any[]
  onSuccess: () => void
  showNotification: (title: string, message: string, type?: any) => void
}

const formatLocalDatetime = (date: Date = new Date()) => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function TesTambahView({
  mapelList,
  bankSoalList,
  kelasList,
  onSuccess,
  showNotification,
}: TesTambahViewProps) {
  const rawItems = mapelList && mapelList.length > 0 ? mapelList : (bankSoalList || [])
  // Urutkan topik aktif di atas dan tandai yang terarsip
  const items = [...rawItems].sort((a, b) => {
    if (a.status === 'NONAKTIF' && b.status !== 'NONAKTIF') return 1
    if (a.status !== 'NONAKTIF' && b.status === 'NONAKTIF') return -1
    return (a.nama || '').localeCompare(b.nama || '')
  })
  const defaultSelectedId = items.find((it) => it.status !== 'NONAKTIF')?.id || items[0]?.id || ''
  const now = new Date()
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const [form, setForm] = useState({
    kodeUjian: `TES-${Date.now().toString().slice(-4)}`,
    judul: '',
    deskripsi: '',
    mataPelajaranId: defaultSelectedId,
    durasiMenit: 90,
    waktuMulai: formatLocalDatetime(now),
    waktuSelesai: formatLocalDatetime(nextWeek),
    acakSoal: true,
    acakOpsi: true,
    tampilkanHasil: false,
    lockBrowser: true,
    kelasIds: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  const handleSelectAllKelas = () => {
    if (form.kelasIds.length === kelasList.length) {
      setForm({ ...form, kelasIds: [] })
    } else {
      setForm({ ...form, kelasIds: kelasList.map((k) => k.id) })
    }
  }

  const handleToggleKelas = (kelasId: string) => {
    if (form.kelasIds.includes(kelasId)) {
      setForm({ ...form, kelasIds: form.kelasIds.filter((id) => id !== kelasId) })
    } else {
      setForm({ ...form, kelasIds: [...form.kelasIds, kelasId] })
    }
  }

  const handleSaveTes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.judul || !form.mataPelajaranId) {
      showNotification('Peringatan', 'Judul Tes dan Topik / Mata Pelajaran wajib diisi', 'warning')
      return
    }
    if (form.kelasIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal satu Group / Kelas peserta yang berhak mengikuti tes ini.', 'warning')
      return
    }

    try {
      setSaving(true)
      const finalKode = form.kodeUjian || `TES-${Date.now().toString().slice(-6)}`
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_UJIAN',
          ...form,
          kodeUjian: finalKode,
        }),
      })

      const json = await res.json()
      if (json.success) {
        showNotification('Berhasil', 'Jadwal Tes baru berhasil dibuat dan didistribusikan ke peserta!', 'success')
        onSuccess()
      } else {
        showNotification('Gagal', json.message || 'Gagal membuat jadwal tes', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal membuat tes: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm backdrop-blur-xl space-y-5">
      <div className="border-b border-slate-200/80 dark:border-white/10 pb-4">
        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-500" />
          <span>Tambah & Terbitkan Jadwal Tes Baru</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Formulir pembuatan tes ujian CBT berdasarkan Topik / Mata Pelajaran.
        </p>
      </div>

      <form onSubmit={handleSaveTes} className="space-y-5">
        {/* Identitas Tes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Topik / Mata Pelajaran *
            </label>
            <select
              required
              value={form.mataPelajaranId}
              onChange={(e) => {
                const target = items.find((b) => b.id === e.target.value)
                setForm({
                  ...form,
                  mataPelajaranId: e.target.value,
                  durasiMenit: target?.durasiMenit || 90,
                })
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {items.map((bs) => {
                const isArchived = bs.status === 'NONAKTIF'
                return (
                  <option key={bs.id} value={bs.id}>
                    {isArchived ? '[ARSIP] ' : ''}{bs.nama} - {bs._count?.soalList ?? 0} Butir Soal (Kls {bs.tingkat || 10})
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Judul Lengkap Tes Ujian *
            </label>
            <input
              type="text"
              required
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              placeholder="Contoh: Penilaian Akhir Semester Ganjil - Matematika Wajib Kelas X"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Waktu & Durasi */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Durasi Pengerjaan (Menit) *
            </label>
            <input
              type="number"
              required
              value={form.durasiMenit}
              onChange={(e) => setForm({ ...form, durasiMenit: parseInt(e.target.value) || 90 })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Jadwal Waktu Mulai *
            </label>
            <input
              type="datetime-local"
              required
              value={form.waktuMulai}
              onChange={(e) => setForm({ ...form, waktuMulai: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Jadwal Waktu Selesai *
            </label>
            <input
              type="datetime-local"
              required
              value={form.waktuSelesai}
              onChange={(e) => setForm({ ...form, waktuSelesai: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Parameter Pengerjaan & Anti-Cheat */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Opsi Pengerjaan & Keamanan Anti-Cheat:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.acakSoal}
                onChange={(e) => setForm({ ...form, acakSoal: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Acak Butir Soal</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.acakOpsi}
                onChange={(e) => setForm({ ...form, acakOpsi: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Acak Opsi Pilihan</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.lockBrowser}
                onChange={(e) => setForm({ ...form, lockBrowser: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Lockdown Browser</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.tampilkanHasil}
                onChange={(e) => setForm({ ...form, tampilkanHasil: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Tampilkan Nilai ke Siswa</span>
            </label>
          </div>
        </div>

        {/* Pemilihan Group Peserta */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Pilih Group / Kelas yang Mengikuti Tes * ({form.kelasIds.length} Dipilih)
            </label>
            <button
              type="button"
              onClick={handleSelectAllKelas}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {form.kelasIds.length === kelasList.length ? 'Batal Pilih Semua' : 'Pilih Semua Group'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5">
            {kelasList.map((k) => {
              const isSelected = form.kelasIds.includes(k.id)
              return (
                <div
                  key={k.id}
                  onClick={() => handleToggleKelas(k.id)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition cursor-pointer text-xs font-semibold ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-blue-400'
                  }`}
                >
                  <span className="truncate">{k.nama}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menerbitkan Tes...' : 'Simpan & Terbitkan Jadwal Tes'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
