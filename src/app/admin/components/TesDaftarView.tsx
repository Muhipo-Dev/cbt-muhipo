'use client'

import React, { useState } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Search,
  Clock,
  Archive,
  ArchiveRestore,
  Users,
} from 'lucide-react'

interface TesDaftarViewProps {
  jadwalList: any[]
  mapelList?: any[]
  bankSoalList?: any[] // Alias kompatibilitas
  kelasList: any[]
  onNavigateToTambah: () => void
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}

const formatLocalDatetime = (date: Date = new Date()) => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function TesDaftarView({
  jadwalList,
  mapelList,
  bankSoalList,
  kelasList,
  onNavigateToTambah,
  onRefresh,
  showNotification,
  showConfirm,
}: TesDaftarViewProps) {
  const itemsMapel = mapelList && mapelList.length > 0 ? mapelList : (bankSoalList || [])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUjian, setEditingUjian] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    ujianId: '',
    kodeUjian: '',
    judul: '',
    deskripsi: '',
    mataPelajaranId: '',
    durasiMenit: 90,
    waktuMulai: '',
    waktuSelesai: '',
    lockBrowser: true,
    acakSoal: true,
    acakOpsi: true,
    tampilkanHasil: false,
    status: 'DIJADWALKAN',
    kelasIds: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  const handleOpenEdit = (u: any) => {
    setEditingUjian(u)
    setEditForm({
      ujianId: u.id,
      kodeUjian: u.kodeUjian,
      judul: u.judul,
      deskripsi: u.deskripsi || '',
      mataPelajaranId: u.mataPelajaranId || u.bankSoalId,
      durasiMenit: u.durasiMenit,
      waktuMulai: u.waktuMulai ? formatLocalDatetime(new Date(u.waktuMulai)) : '',
      waktuSelesai: u.waktuSelesai ? formatLocalDatetime(new Date(u.waktuSelesai)) : '',
      lockBrowser: u.lockBrowser !== false,
      acakSoal: u.acakSoal !== false,
      acakOpsi: u.acakOpsi !== false,
      tampilkanHasil: u.tampilkanHasil === true,
      status: u.status,
      kelasIds: u.ujianKelas ? u.ujianKelas.map((uk: any) => uk.kelasId) : [],
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_UJIAN',
          ...editForm,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Berhasil', 'Pengaturan tes berhasil diperbarui!', 'success')
        setShowEditModal(false)
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal update tes', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal update: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = (ujian: any) => {
    const isArchived = ujian.status === 'NONAKTIF'
    const action = isArchived ? 'UNARCHIVE_UJIAN' : 'ARCHIVE_UJIAN'
    const title = isArchived ? 'Aktifkan Kembali Tes?' : 'Arsipkan Jadwal Tes?'
    const message = isArchived
      ? `Aktifkan kembali tes "${ujian.judul}"?`
      : `Arsipkan tes "${ujian.judul}"? Data nilai dan pengerjaan tetap aman.`

    showConfirm(title, message, async () => {
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ujianId: ujian.id }),
        })
        const json = await res.json()
        if (json.success) {
          showNotification('Berhasil', json.message || 'Status tes berhasil diubah.', 'success')
          onRefresh()
        } else {
          showNotification('Gagal', json.message || 'Gagal mengubah status tes.', 'error')
        }
      } catch (err: any) {
        showNotification('Error', 'Gagal: ' + err.message, 'error')
      }
    })
  }

  const handleDelete = (ujian: any) => {
    showConfirm(
      'Hapus Jadwal Tes?',
      `PERINGATAN: Apakah Anda yakin ingin menghapus tes "${ujian.judul}" (${ujian.kodeUjian})? Seluruh jawaban dan riwayat pengerjaan siswa untuk tes ini akan terhapus permanen.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE_UJIAN', ujianId: ujian.id }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', 'Jadwal tes berhasil dihapus', 'success')
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus tes', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal menghapus: ' + err.message, 'error')
        }
      }
    )
  }

  const filtered = (jadwalList || []).filter((u) => {
    const mapelName = u.mataPelajaran?.nama || u.bankSoal?.nama || ''
    const matchSearch =
      u.judul?.toLowerCase().includes(search.toLowerCase()) ||
      u.kodeUjian?.toLowerCase().includes(search.toLowerCase()) ||
      mapelName.toLowerCase().includes(search.toLowerCase())

    const matchStatus = filterStatus === 'ALL' || u.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">
      {/* Header & Button Tambah */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span>Daftar Jadwal Tes Ujian Aktif</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daftar seluruh pelaksanaan tes CBT berdasarkan Topik / Mata Pelajaran.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToTambah}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jadwal Tes</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode ujian, judul tes, atau nama topik mapel..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Status Jadwal</option>
            <option value="DIJADWALKAN">Dijadwalkan</option>
            <option value="SEDANG_BERJALAN">Sedang Berjalan</option>
            <option value="NONAKTIF">Diarsipkan (Nonaktif)</option>
          </select>
        </div>
      </div>

      {/* Table Daftar Tes */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Kode Ujian</th>
                <th className="py-3.5 px-4">Judul Tes Ujian</th>
                <th className="py-3.5 px-4">Topik / Mapel</th>
                <th className="py-3.5 px-4">Durasi & Jadwal</th>
                <th className="py-3.5 px-4 text-center">Group & Peserta</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                    Tidak ada jadwal tes yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const mapelObj = u.mataPelajaran || u.bankSoal
                  const isArchived = u.status === 'NONAKTIF'
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {u.kodeUjian}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {u.judul}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300">
                        {mapelObj?.nama || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {u.durasiMenit} Menit
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(u.waktuMulai).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px] border border-blue-500/20">
                          {u._count?.pesertaUjian ?? 0} Siswa
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            isArchived
                              ? 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {isArchived ? 'Nonaktif / Arsip' : u.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer"
                            title="Edit Pengaturan Tes"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchive(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition cursor-pointer"
                            title={isArchived ? 'Aktifkan Kembali' : 'Arsipkan Tes'}
                          >
                            {isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition cursor-pointer"
                            title="Hapus Tes Permanen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal Edit Tes */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Edit Pengaturan Tes Ujian
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Ujian *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.kodeUjian}
                    onChange={(e) => setEditForm({ ...editForm, kodeUjian: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold uppercase focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Topik / Mata Pelajaran *
                  </label>
                  <select
                    required
                    value={editForm.mataPelajaranId}
                    onChange={(e) => setEditForm({ ...editForm, mataPelajaranId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {itemsMapel.map((bs) => (
                      <option key={bs.id} value={bs.id}>
                        [{bs.kode || bs.kodeBank}] {bs.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Tes *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.judul}
                  onChange={(e) => setEditForm({ ...editForm, judul: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Durasi (Menit)
                  </label>
                  <input
                    type="number"
                    required
                    value={editForm.durasiMenit}
                    onChange={(e) => setEditForm({ ...editForm, durasiMenit: parseInt(e.target.value) || 90 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editForm.waktuMulai}
                    onChange={(e) => setEditForm({ ...editForm, waktuMulai: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Waktu Selesai
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editForm.waktuSelesai}
                    onChange={(e) => setEditForm({ ...editForm, waktuSelesai: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
