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
  BookOpen,
  Info,
  Layers,
  FolderPlus,
  Archive,
  ArchiveRestore,
  Download,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'

interface ModulTopikViewProps {
  currentUser?: any
  mapelList: any[]
  modulList?: any[]
  onRefresh: () => void
  onNavigateToDaftarSoal?: (id: string) => void
  onNavigateToEditor?: (id: string) => void
  onNavigateToBackup?: () => void
  showNotification: (title: string, message: string, type?: any) => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}

export function ModulTopikView({
  currentUser,
  mapelList,
  modulList = [],
  onRefresh,
  onNavigateToDaftarSoal,
  onNavigateToEditor,
  onNavigateToBackup,
  showNotification,
  showConfirm,
}: ModulTopikViewProps) {
  const userRole = (currentUser?.role || 'ADMIN').toUpperCase()
  const canManageTrash = ['SUPERADMIN', 'SUPER ADMIN', 'ADMIN', 'PROKTOR'].includes(userRole)

  // Ambil list modul unik dari modulList atau dari relasi mapelList
  const rawModulNames = Array.from(
    new Set([
      'Default',
      ...(modulList || []).map((m: any) => m.nama),
      ...(mapelList || []).map((m: any) => m.namaModul || m.modul?.nama).filter(Boolean),
    ])
  )

  const [selectedModul, setSelectedModul] = useState<string>('SEMUA')
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'AKTIF' | 'NONAKTIF'>('SEMUA')
  const [searchQuery, setSearchQuery] = useState('')
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // Selection Checkbox State for Bulk Operations
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal Tambah / Edit Modul
  const [showModulModal, setShowModulModal] = useState(false)
  const [editingModul, setEditingModul] = useState<any | null>(null)
  const [modulForm, setModulForm] = useState({
    nama: '',
  })
  const [savingModul, setSavingModul] = useState(false)

  // Modal Tambah / Edit Topik
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [form, setForm] = useState({
    modul: 'Default',
    kode: '',
    nama: '',
    status: 'Aktif',
    tingkat: 10,
    durasiMenit: 90,
    kkm: 75,
    nilaiMaksimal: 100,
  })
  const [saving, setSaving] = useState(false)

  // Perhitungan Data Keseluruhan
  const allItems = mapelList || []
  const activeAllItems = allItems.filter((m: any) => m.status !== 'TERHAPUS')
  const trashAllItems = allItems.filter((m: any) => m.status === 'TERHAPUS')
  const activeCount = activeAllItems.length
  const trashCount = trashAllItems.length

  // Open Modal Tambah Modul
  const handleOpenCreateModul = () => {
    setEditingModul(null)
    setModulForm({
      nama: '',
    })
    setShowModulModal(true)
  }

  // Save Modul (Create / Update)
  const handleSaveModul = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modulForm.nama.trim()) {
      showNotification('Peringatan', 'Nama modul wajib diisi', 'warning')
      return
    }

    try {
      setSavingModul(true)
      const action = editingModul ? 'UPDATE_MODUL' : 'CREATE_MODUL'
      const payload: any = {
        action,
        nama: modulForm.nama.trim(),
      }
      if (editingModul) payload.id = editingModul.id

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Berhasil', json.message, 'success')
        setShowModulModal(false)
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal menyimpan modul', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal: ' + err.message, 'error')
    } finally {
      setSavingModul(false)
    }
  }

  // Delete Modul
  const handleDeleteModul = (modulName: string) => {
    if (modulName === 'Default' || modulName === 'SEMUA') {
      showNotification('Peringatan', 'Modul Default atau Semua Modul tidak dapat dihapus', 'warning')
      return
    }

    const targetModul = (modulList || []).find((m: any) => m.nama === modulName)
    if (!targetModul) {
      showNotification('Peringatan', 'Data modul tidak ditemukan', 'warning')
      return
    }

    showConfirm(
      'Hapus Modul?',
      `Hapus modul "${modulName}"? Topik-topik di dalamnya akan otomatis dipindahkan ke modul Default.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE_MODUL', id: targetModul.id }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message, 'success')
            setSelectedModul('SEMUA')
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus modul', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // Open Modal Tambah Topik
  const handleOpenCreate = () => {
    setEditingItem(null)
    setForm({
      modul: selectedModul !== 'SEMUA' ? selectedModul : 'Default',
      kode: '',
      nama: '',
      status: 'Aktif',
      tingkat: 10,
      durasiMenit: 90,
      kkm: 75,
      nilaiMaksimal: 100,
    })
    setShowModal(true)
  }

  // Open Modal Edit Topik
  const handleOpenEdit = (item: any) => {
    setEditingItem(item)
    setForm({
      modul: item.namaModul || item.modul?.nama || 'Default',
      kode: item.kode || '',
      nama: item.nama || '',
      status: item.status === 'NONAKTIF' ? 'Nonaktif' : 'Aktif',
      tingkat: item.tingkat || 10,
      durasiMenit: item.durasiMenit || 90,
      kkm: item.kkm !== undefined ? item.kkm : 75,
      nilaiMaksimal: item.nilaiMaksimal !== undefined ? item.nilaiMaksimal : 100,
    })
    setShowModal(true)
  }

  // Save Topik (Create / Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.kode.trim() || !form.nama.trim()) {
      showNotification('Peringatan', 'Kode dan Nama Topik wajib diisi', 'warning')
      return
    }

    try {
      setSaving(true)
      const action = editingItem ? 'UPDATE_MAPEL' : 'CREATE_MAPEL'
      const payload: any = {
        action,
        kode: form.kode.trim().toUpperCase(),
        nama: form.nama.trim(),
        namaModul: form.modul,
        modul: form.modul,
        tingkat: Number(form.tingkat) || 10,
        durasiMenit: Number(form.durasiMenit) || 90,
        kkm: Number(form.kkm) || 75,
        nilaiMaksimal: Number(form.nilaiMaksimal) || 100,
        status: form.status === 'Nonaktif' ? 'NONAKTIF' : 'AKTIF',
      }
      if (editingItem) payload.id = editingItem.id

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Berhasil', json.message || 'Data topik berhasil disimpan', 'success')
        setShowModal(false)
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal menyimpan data topik', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Archive Single Topic
  const handleArchiveSingle = (item: any) => {
    const isCurrentlyArchived = item.status === 'NONAKTIF'
    const newStatus = isCurrentlyArchived ? 'AKTIF' : 'NONAKTIF'
    const action = isCurrentlyArchived ? 'UNARCHIVE_MAPEL' : 'ARCHIVE_MAPEL'

    showConfirm(
      isCurrentlyArchived ? 'Aktifkan Topik?' : 'Arsipkan Topik?',
      isCurrentlyArchived
        ? `Aktifkan kembali topik "${item.nama}" agar dapat digunakan pada jadwal ujian baru?`
        : `Arsipkan topik "${item.nama}"? Seluruh butir soal tetap aman dan tidak akan hilang.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, id: item.id, status: newStatus }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message, 'success')
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal memproses pengarsipan', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // Bulk Archive Topics
  const handleBulkArchive = () => {
    if (selectedIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 topik untuk diarsipkan', 'warning')
      return
    }

    showConfirm(
      'Arsipkan Topik Terpilih?',
      `Arsipkan ${selectedIds.length} topik terpilih? Data butir soal tetap aman.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'BULK_ARCHIVE_MAPEL', ids: selectedIds }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message, 'success')
            setSelectedIds([])
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal mengarsipkan topik', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // Bulk Unarchive Topics
  const handleBulkUnarchive = () => {
    if (selectedIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 topik untuk diaktifkan', 'warning')
      return
    }

    showConfirm(
      'Aktifkan Topik Terpilih?',
      `Aktifkan kembali ${selectedIds.length} topik terpilih?`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'BULK_UNARCHIVE_MAPEL', ids: selectedIds }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message, 'success')
            setSelectedIds([])
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal mengaktifkan topik', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // 1. Soft Delete Single Topic (Pindahkan ke Recycle Bin)
  const handleDeleteSingle = (item: any) => {
    showConfirm(
      'Pindahkan ke Recycle Bin?',
      `Pindahkan topik "${item.nama}" ke Recycle Bin? Butir soal tetap aman dan dapat dipulihkan kapan saja melalui menu Backup & Pemeliharaan.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE_MAPEL', id: item.id }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Topik dipindahkan ke Recycle Bin', 'success')
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal memindahkan topik', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // 2. Bulk Soft Delete (Pindahkan banyak topik ke Recycle Bin)
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 topik untuk dipindahkan ke Recycle Bin', 'warning')
      return
    }

    showConfirm(
      'Pindahkan Topik ke Recycle Bin?',
      `Pindahkan ${selectedIds.length} topik terpilih ke Recycle Bin? Data butir soal dapat dipulihkan sewaktu-waktu di menu Backup & Pemeliharaan.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'BULK_DELETE_MAPEL', ids: selectedIds }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Topik dipindahkan ke Recycle Bin', 'success')
            setSelectedIds([])
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal memindahkan topik', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // 3. Backup Single Topic (JSON)
  const handleBackupSingle = async (item: any) => {
    try {
      showNotification('Memproses', `Menyiapkan cadangan topik "${item.nama}"...`, 'info')
      const res = await fetch(`/api/admin/backup?type=soal_topik&topikId=${item.id}`)
      if (!res.ok) throw new Error('Gagal mengunduh cadangan topik')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      const safeName = item.nama.replace(/[^a-zA-Z0-9_-]/g, '_')
      a.download = `CBT_MUHIPO_SOAL_${safeName}_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      showNotification('Berhasil', `File cadangan topik "${item.nama}" berhasil diunduh.`, 'success')
    } catch (err: any) {
      showNotification('Gagal', 'Gagal backup topik: ' + err.message, 'error')
    }
  }

  // 4. Backup Bulk Selected Topics (JSON)
  const handleBackupBulk = async () => {
    if (selectedIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 topik untuk dicadangkan', 'warning')
      return
    }

    try {
      showNotification('Memproses', `Menyiapkan cadangan ${selectedIds.length} topik terpilih...`, 'info')
      const res = await fetch(`/api/admin/backup?type=soal_topik&ids=${selectedIds.join(',')}`)
      if (!res.ok) throw new Error('Gagal mengunduh cadangan')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = `CBT_MUHIPO_SOAL_SELECTED_${selectedIds.length}_TOPIK_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      showNotification('Berhasil', `Berhasil mencadangkan ${selectedIds.length} topik terpilih.`, 'success')
    } catch (err: any) {
      showNotification('Gagal', 'Gagal backup: ' + err.message, 'error')
    }
  }

  // 5. Backup All Active Topics (JSON)
  const handleBackupAll = async () => {
    try {
      showNotification('Memproses', 'Menyiapkan cadangan seluruh bank soal & topik aktif...', 'info')
      const res = await fetch('/api/admin/backup?type=soal_topik')
      if (!res.ok) throw new Error('Gagal mengunduh cadangan semua soal')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = `CBT_MUHIPO_SOAL_TOPIK_ALL_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      showNotification('Berhasil', 'Seluruh bank soal & topik aktif berhasil dicadangkan.', 'success')
    } catch (err: any) {
      showNotification('Gagal', 'Gagal backup semua soal: ' + err.message, 'error')
    }
  }

  // Toggle selection
  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredItems.map((item: any) => item.id))
    }
  }

  // Filter Data
  const baseItems = activeAllItems

  const filteredByStatus = baseItems.filter((m: any) => {
    if (statusFilter === 'AKTIF') return m.status !== 'NONAKTIF'
    if (statusFilter === 'NONAKTIF') return m.status === 'NONAKTIF'
    return true
  })

  const modulItems =
    selectedModul === 'SEMUA'
      ? filteredByStatus
      : filteredByStatus.filter(
          (m: any) => (m.namaModul || m.modul?.nama || 'Default').toLowerCase() === selectedModul.toLowerCase()
        )

  const filteredItems = modulItems.filter((m: any) =>
    m.nama ? m.nama.toLowerCase().includes(searchQuery.toLowerCase()) : true
  )
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / entriesPerPage))
  const paginatedItems = filteredItems.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage)

  return (
    <div className="w-full space-y-4 font-sans text-slate-800 dark:text-slate-100">
      {/* 1. Header Page Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-slate-900 dark:text-white flex items-center gap-2">
            Topik & Modul Soal
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
              Daftar topik aktif dan pengarsipan topik berdasarkan modul
            </span>
          </h1>
        </div>
      </div>

      {/* 2. Grid: Left Panel (Pilih Modul) & Right Panel (Daftar Topik) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Card: Pilih Modul */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Pilih Modul</span>
            </h2>
            <button
              type="button"
              onClick={handleOpenCreateModul}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Tambah Modul</span>
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Modul Terpilih:
                </label>
                {selectedModul !== 'SEMUA' && selectedModul !== 'Default' && canManageTrash && (
                  <button
                    type="button"
                    onClick={() => handleDeleteModul(selectedModul)}
                    className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Hapus modul yang sedang dipilih"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Modul</span>
                  </button>
                )}
              </div>
              <select
                value={selectedModul}
                onChange={(e) => {
                  setSelectedModul(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-3 py-2 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer"
              >
                <option value="SEMUA">-- Semua Modul --</option>
                {rawModulNames.map((modName) => (
                  <option key={modName} value={modName}>
                    {modName}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="w-full px-4 py-2 rounded bg-[#337ab7] hover:bg-[#286090] text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Topik</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreateModul}
                className="w-full px-4 py-1.5 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <FolderPlus className="w-4 h-4 text-emerald-600" />
                <span>Buat Modul Baru</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Card: Daftar Topik */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>
                Daftar Topik {selectedModul !== 'SEMUA' ? `(${selectedModul})` : ''} - {filteredItems.length} Topik
              </span>
            </h2>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackupAll}
                title="Cadangkan seluruh butir soal dan topik aktif ke format JSON"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup Semua Soal</span>
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Topik</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {/* Table Top Controls & Filter Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex flex-wrap items-center gap-2">
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

                {/* Status Filter Selector */}
                <div className="flex items-center gap-1 ml-2">
                  <span className="font-semibold">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any)
                      setCurrentPage(1)
                    }}
                    className="px-2.5 py-1 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="SEMUA">Semua Status</option>
                    <option value="AKTIF">Aktif</option>
                    <option value="NONAKTIF">Arsip</option>
                  </select>
                </div>
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
                  placeholder="Cari topik..."
                  className="px-2.5 py-1 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Table Daftar Topik */}
            <div className="border border-slate-200 dark:border-white/10 rounded overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-white/10">
                    <th className="py-2.5 px-3 w-10 text-center">No.</th>
                    <th className="py-2.5 px-3">Modul</th>
                    <th className="py-2.5 px-3">Topik / Nama Mata Pelajaran</th>
                    <th className="py-2.5 px-3 text-center">Tingkat</th>
                    <th className="py-2.5 px-3 text-center">Jumlah Soal</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Tidak ada data topik yang ditemukan
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item: any, idx: number) => {
                      const countSoal = item._count?.soalList || item.soalList?.length || 0
                      const modulName = item.namaModul || item.modul?.nama || 'Default'
                      const isArchived = item.status === 'NONAKTIF'
                      const isSelected = selectedIds.includes(item.id)

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                            isSelected ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                            {(currentPage - 1) * entriesPerPage + idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                              {modulName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{item.nama}</span>
                            </div>
                            {item.jurusan && item.jurusan !== 'UMUM' && (
                              <div className="text-[10px] text-slate-400">Jurusan: {item.jurusan}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Kelas {item.tingkat || 10}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => onNavigateToDaftarSoal && onNavigateToDaftarSoal(item.id)}
                              className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-200 cursor-pointer transition"
                            >
                              {countSoal} Butir Soal
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isArchived ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                Diarsipkan
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                Aktif
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onNavigateToDaftarSoal && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToDaftarSoal(item.id)}
                                  title="Kelola Butir Soal"
                                  className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span>Soal</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                title="Edit Topik"
                                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchiveSingle(item)}
                                title={isArchived ? 'Aktifkan Topik' : 'Arsipkan Topik'}
                                className="p-1 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer transition"
                              >
                                {isArchived ? (
                                  <ArchiveRestore className="w-3.5 h-3.5" />
                                ) : (
                                  <Archive className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBackupSingle(item)}
                                title="Backup Topik & Soal Ini (.JSON)"
                                className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer transition"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              {canManageTrash && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSingle(item)}
                                  title="Pindahkan ke Recycle Bin"
                                  className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRow(item.id)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer ml-1"
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

            {/* Table Footer: Pagination */}
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
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded text-xs font-bold border transition cursor-pointer ${
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
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex flex-wrap items-center gap-2">
                {canManageTrash && (
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={selectedIds.length === 0}
                    className="px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-40 flex items-center gap-1 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus ({selectedIds.length}) ke Recycle Bin</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleBackupBulk}
                  disabled={selectedIds.length === 0}
                  className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-40 flex items-center gap-1 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Backup ({selectedIds.length}) Soal Topik</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkArchive}
                  disabled={selectedIds.length === 0}
                  className="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-40 flex items-center gap-1 shadow-xs"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Arsipkan ({selectedIds.length}) Terpilih</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkUnarchive}
                  disabled={selectedIds.length === 0}
                  className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-40 flex items-center gap-1 shadow-xs"
                >
                  <ArchiveRestore className="w-3.5 h-3.5" />
                  <span>Aktifkan ({selectedIds.length}) Terpilih</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
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
      </div>

      {/* Modal Tambah / Edit Modul */}
      {showModulModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#337ab7] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingModul ? 'Edit Nama Modul' : 'Buat Modul Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModulModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModul} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Nama Modul: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modulForm.nama}
                  onChange={(e) => setModulForm({ ...modulForm, nama: e.target.value })}
                  placeholder="Contoh: Modul Penilaian Harian, Modul US, dll."
                  className="w-full px-3 py-2 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModulModal(false)}
                  className="px-4 py-1.5 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingModul}
                  className="px-4 py-1.5 rounded bg-[#337ab7] hover:bg-[#286090] text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingModul ? 'Menyimpan...' : 'Simpan Modul'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Topik */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#337ab7] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingItem ? 'Edit Topik / Mata Pelajaran' : 'Tambah Topik Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Modul:
                </label>
                <select
                  value={form.modul}
                  onChange={(e) => setForm({ ...form, modul: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  {rawModulNames.map((modName) => (
                    <option key={modName} value={modName}>
                      {modName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Kode Topik: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.kode}
                  onChange={(e) => setForm({ ...form, kode: e.target.value })}
                  placeholder="Contoh: MAT-X, BIND-XII"
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Nama Topik / Mata Pelajaran: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: Matematika Wajib Kelas X"
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Tingkat / Kelas:
                  </label>
                  <select
                    value={form.tingkat}
                    onChange={(e) => setForm({ ...form, tingkat: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value={10}>Kelas 10 (X)</option>
                    <option value={11}>Kelas 11 (XI)</option>
                    <option value={12}>Kelas 12 (XII)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Durasi Default:
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={form.durasiMenit}
                      onChange={(e) => setForm({ ...form, durasiMenit: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">Mnt</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Nilai Maksimal Topik:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.nilaiMaksimal}
                    onChange={(e) => setForm({ ...form, nilaiMaksimal: Number(e.target.value) })}
                    placeholder="Default: 100"
                    className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Poin skala kalkulasi (100)</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    KKM (Ketuntasan):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.kkm}
                    onChange={(e) => setForm({ ...form, kkm: Number(e.target.value) })}
                    placeholder="Default: 75"
                    className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Batas kelulusan minimal</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Status:
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif (Arsip)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded bg-[#337ab7] hover:bg-[#286090] text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
