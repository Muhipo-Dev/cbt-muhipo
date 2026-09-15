'use client'

import React, { useState } from 'react'
import { Plus, Edit, Trash2, Users, Search, School, GraduationCap } from 'lucide-react'

interface PesertaGroupViewProps {
  kelasList: any[]
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}

export function PesertaGroupView({
  kelasList,
  onRefresh,
  showNotification,
  showConfirm,
}: PesertaGroupViewProps) {
  const [search, setSearch] = useState('')
  const [filterTingkat, setFilterTingkat] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [form, setForm] = useState({
    nama: '',
    tingkat: 10,
    jurusan: 'MIPA',
  })
  const [saving, setSaving] = useState(false)

  const handleOpenCreate = () => {
    setEditingItem(null)
    setForm({ nama: '', tingkat: 10, jurusan: 'MIPA' })
    setShowModal(true)
  }

  const handleOpenEdit = (item: any) => {
    setEditingItem(item)
    setForm({
      nama: item.nama,
      tingkat: item.tingkat || 10,
      jurusan: item.jurusan || 'MIPA',
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nama.trim()) {
      showNotification('Peringatan', 'Nama Group/Kelas wajib diisi', 'warning')
      return
    }

    try {
      setSaving(true)
      const action = editingItem ? 'UPDATE_KELAS' : 'CREATE_KELAS'
      const payload = editingItem ? { action, id: editingItem.id, ...form } : { action, ...form }

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        showNotification('Berhasil', editingItem ? 'Group berhasil diperbarui' : 'Group baru berhasil dibuat', 'success')
        setShowModal(false)
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal menyimpan group', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal menyimpan: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (item: any) => {
    showConfirm(
      'Hapus Group / Kelas?',
      `Apakah Anda yakin ingin menghapus group "${item.nama}"? Siswa di dalam group ini akan disetel menjadi tanpa group.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE_KELAS', id: item.id }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', 'Group berhasil dihapus', 'success')
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus group', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal menghapus group: ' + err.message, 'error')
        }
      }
    )
  }

  const filtered = (kelasList || []).filter((k) => {
    const matchSearch =
      k.nama.toLowerCase().includes(search.toLowerCase()) ||
      (k.jurusan && k.jurusan.toLowerCase().includes(search.toLowerCase()))
    const matchTingkat = filterTingkat === 'ALL' || String(k.tingkat) === filterTingkat
    return matchSearch && matchTingkat
  })

  return (
    <div className="space-y-4">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span>Data Group / Rombel Peserta Ujian</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola kelompok peserta, kelas, dan rombongan belajar mandiri untuk alokasi distribusi ujian.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Group Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama group / kelas atau jurusan..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={filterTingkat}
            onChange={(e) => setFilterTingkat(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Tingkat</option>
            <option value="10">Kelas 10 (X)</option>
            <option value="11">Kelas 11 (XI)</option>
            <option value="12">Kelas 12 (XII)</option>
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
                <th className="py-3.5 px-4">Nama Group / Kelas</th>
                <th className="py-3.5 px-4">Tingkat</th>
                <th className="py-3.5 px-4">Jurusan / Kelompok</th>
                <th className="py-3.5 px-4 text-center">Jumlah Peserta Terdaftar</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Tidak ada group peserta yang ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((k, idx) => (
                  <tr key={k.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {k.nama}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">
                      Kelas {k.tingkat}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300">
                      {k.jurusan || 'Umum'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px] border border-blue-500/20">
                        {k._count?.users ?? 0} Siswa
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(k)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer"
                          title="Edit Group"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(k)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition cursor-pointer"
                          title="Hapus Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Group */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {editingItem ? 'Edit Data Group / Kelas' : 'Tambah Group / Kelas Baru'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Group / Kelas *
                </label>
                <input
                  type="text"
                  required
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: XII-MIPA 1, X-A, XI-IPS 2"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Kelas *
                  </label>
                  <select
                    value={form.tingkat}
                    onChange={(e) => setForm({ ...form, tingkat: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value={10}>Kelas 10 (X)</option>
                    <option value={11}>Kelas 11 (XI)</option>
                    <option value={12}>Kelas 12 (XII)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jurusan / Kelompok
                  </label>
                  <input
                    type="text"
                    value={form.jurusan}
                    onChange={(e) => setForm({ ...form, jurusan: e.target.value })}
                    placeholder="MIPA / IPS / Umum"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Buat Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
