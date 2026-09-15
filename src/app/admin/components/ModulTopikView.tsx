'use client'

import React, { useState } from 'react'
import {
  Home,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Search,
  Check,
  X,
  Save,
  RefreshCw,
} from 'lucide-react'

interface ModulTopikViewProps {
  mapelList: any[]
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}

export function ModulTopikView({
  mapelList,
  onRefresh,
  showNotification,
  showConfirm,
}: ModulTopikViewProps) {
  const [selectedModul, setSelectedModul] = useState('Default')
  const [searchQuery, setSearchQuery] = useState('')
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // Selection Checkbox State for Bulk Deletion
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal Tambah / Edit Topik
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [form, setForm] = useState({
    modul: 'Default',
    kode: '',
    nama: '',
    deskripsi: '',
    status: 'Aktif',
    tingkat: 10,
    durasiMenit: 90,
  })
  const [saving, setSaving] = useState(false)

  // Open Modal Tambah Topik
  const handleOpenCreate = () => {
    setEditingItem(null)
    setForm({
      modul: 'Default',
      kode: `TPK-${Date.now().toString().slice(-4)}`,
      nama: '',
      deskripsi: 'Tryout TKA SMA Muhammadiyah 1 Ponorogo, Tahun Pelajaran 2026/2027',
      status: 'Aktif',
      tingkat: 10,
      durasiMenit: 90,
    })
    setShowModal(true)
  }

  // Open Modal Edit Topik
  const handleOpenEdit = (item: any) => {
    setEditingItem(item)
    setForm({
      modul: 'Default',
      kode: item.kode || '',
      nama: item.nama || '',
      deskripsi: item.jurusan && item.jurusan !== 'UMUM'
        ? item.jurusan
        : `Tryout TKA kelas ${item.tingkat || 'XII'} SMA Muhammadiyah 1 Ponorogo, Tahun Pelajaran 2026/2027`,
      status: 'Aktif',
      tingkat: item.tingkat || 10,
      durasiMenit: item.durasiMenit || 90,
    })
    setShowModal(true)
  }

  // Save Topik
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nama.trim() || !form.kode.trim()) {
      showNotification('Peringatan', 'Kode dan Nama Topik wajib diisi', 'warning')
      return
    }

    try {
      setSaving(true)
      const action = editingItem ? 'UPDATE_MAPEL' : 'CREATE_MAPEL'
      const payload = editingItem
        ? { action, id: editingItem.id, ...form }
        : { action, ...form }

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        showNotification(
          'Berhasil',
          editingItem ? 'Topik berhasil diperbarui' : 'Topik baru berhasil dibuat',
          'success'
        )
        setShowModal(false)
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal menyimpan topik', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal menyimpan: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Toggle selection for a row
  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredItems.map((item) => item.id))
    }
  }

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 topik untuk dihapus', 'warning')
      return
    }

    showConfirm(
      'Hapus Topik Terpilih?',
      `Apakah Anda yakin ingin menghapus ${selectedIds.length} topik terpilih beserta seluruh butir soalnya?`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'BULK_DELETE_MAPEL', ids: selectedIds }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Topik terpilih berhasil dihapus', 'success')
            setSelectedIds([])
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus topik', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal menghapus topik: ' + err.message, 'error')
        }
      }
    )
  }

  // Filter & Pagination
  const allItems = mapelList || []
  const filteredItems = allItems.filter((m: any) =>
    m.nama ? m.nama.toLowerCase().includes(searchQuery.toLowerCase()) || m.kode?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  )
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / entriesPerPage))
  const paginatedItems = filteredItems.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage)

  return (
    <div className="w-full space-y-4 font-sans text-slate-800 dark:text-slate-100">
      {/* 1. Header Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-slate-900 dark:text-white flex items-center gap-2">
            Topik
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
              Daftar topik, penambahan topik, pengubahan topik, dan penghapusan topik berdasarkan Modul
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>Home</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">Topik</span>
        </div>
      </div>

      {/* 2. Grid: Left Panel (Pilih Modul) & Right Panel (Daftar Topik) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Card: Pilih Modul */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Pilih Modul</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Modul
              </label>
              <select
                value={selectedModul}
                onChange={(e) => setSelectedModul(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
              >
                <option value="Default">Default</option>
                <option value="Ujian Sekolah">Ujian Sekolah</option>
                <option value="Asesmen Mandiri">Asesmen Mandiri</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Pilih modul terlebih dahulu untuk menampilkan dan menambah topik
            </p>
          </div>
        </div>

        {/* Right Card: Daftar Topik */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Daftar Topik</h2>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Topik</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {/* Table Top Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span>Show</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entries</span>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <span>Search:</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-2.5 py-1 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-white/10">
                    <th className="py-2.5 px-3 w-10 text-center">No. ⇅</th>
                    <th className="py-2.5 px-3">Nama Topik</th>
                    <th className="py-2.5 px-3">Deskripsi</th>
                    <th className="py-2.5 px-3 text-center w-20">Jml. Soal</th>
                    <th className="py-2.5 px-3 text-center w-16">Status</th>
                    <th className="py-2.5 px-3 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        {searchQuery ? 'Tidak ada topik yang sesuai pencarian.' : 'Belum ada data topik.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item: any, idx: number) => {
                      const rowNumber = (currentPage - 1) * entriesPerPage + idx + 1
                      const isSelected = selectedIds.includes(item.id)
                      const soalCount = item._count?.soalList ?? item.soalList?.length ?? 0
                      const deskripsiText = item.jurusan && item.jurusan !== 'UMUM'
                        ? item.jurusan
                        : `Tryout TKA kelas ${item.tingkat || 'XII'} SMA Muhammadiyah 1 Ponorogo, Tahun Pelajaran 2026/2027`

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition ${
                            isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-medium text-slate-500 dark:text-slate-400">
                            {rowNumber}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                            {item.nama}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {deskripsiText}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                            {soalCount}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300">
                            Aktif
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                              >
                                Edit
                              </button>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRow(item.id)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer: Left (Hapus, Info), Right (Pilih Semua, Pagination) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2">
              <div>
                Showing {filteredItems.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to{' '}
                {Math.min(currentPage * entriesPerPage, filteredItems.length)} of {filteredItems.length} entries
              </div>

              <div className="flex items-center gap-1 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded text-xs font-bold border transition ${
                      currentPage === i + 1
                        ? 'bg-[#337ab7] text-white border-[#2e6da4]'
                        : 'border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Bottom Action Buttons: Hapus & Pilih Semua */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
                className="px-4 py-1.5 rounded bg-[#337ab7] hover:bg-[#286090] text-white font-semibold text-xs transition cursor-pointer disabled:opacity-40"
              >
                Hapus
              </button>

              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
              >
                {selectedIds.length === filteredItems.length && filteredItems.length > 0
                  ? 'Batal Pilih Semua'
                  : 'Pilih Semua'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MODAL TAMBAH / EDIT TOPIK */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-md shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#337ab7] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingItem ? 'Edit Topik' : 'Tambah Topik Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Modul
                </label>
                <select
                  value={form.modul}
                  onChange={(e) => setForm({ ...form, modul: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Default">Default</option>
                  <option value="Ujian Sekolah">Ujian Sekolah</option>
                  <option value="Asesmen Mandiri">Asesmen Mandiri</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kode Topik *
                </label>
                <input
                  type="text"
                  required
                  value={form.kode}
                  onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })}
                  placeholder="Contoh: BIND-12, MTK-10"
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Topik *
                </label>
                <input
                  type="text"
                  required
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: Bahasa Indonesia dan Literasi"
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi Topik
                </label>
                <textarea
                  rows={2}
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  placeholder="Deskripsi singkat topik atau target jenjang/tingkat..."
                  className="w-full p-2.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat / Kelas
                  </label>
                  <select
                    value={form.tingkat}
                    onChange={(e) => setForm({ ...form, tingkat: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={10}>Kelas 10 (Fase E)</option>
                    <option value={11}>Kelas 11 (Fase F)</option>
                    <option value={12}>Kelas 12 (Fase F+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-1.5 rounded bg-[#337ab7] hover:bg-[#286090] text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
