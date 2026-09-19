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
  RotateCcw,
  AlertTriangle,
  Trash,
} from 'lucide-react'

interface ModulTopikViewProps {
  currentUser?: any
  mapelList: any[]
  modulList?: any[]
  onRefresh: () => void
  onNavigateToDaftarSoal?: (id: string) => void
  onNavigateToEditor?: (id: string) => void
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

  // Mode Tampilan: 'ACTIVE' (Daftar Topik) atau 'TRASH' (Recycle Bin)
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'TRASH'>('ACTIVE')
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
  })
  const [saving, setSaving] = useState(false)

  // Perhitungan Data Keseluruhan
  const allItems = mapelList || []
  const activeAllItems = allItems.filter((m: any) => m.status !== 'TERHAPUS')
  const trashAllItems = allItems.filter((m: any) => m.status === 'TERHAPUS')
  const activeCount = activeAllItems.length
  const trashCount = trashAllItems.length

  // Ganti View Mode (Active / Trash)
  const handleSwitchViewMode = (mode: 'ACTIVE' | 'TRASH') => {
    setViewMode(mode)
    setSelectedIds([])
    setCurrentPage(1)
    setSearchQuery('')
  }

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
      const payload = editingModul
        ? { action, id: editingModul.id, ...modulForm }
        : { action, ...modulForm }

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        showNotification(
          'Berhasil',
          editingModul ? 'Modul berhasil diperbarui' : 'Modul baru berhasil ditambahkan',
          'success'
        )
        setSelectedModul(modulForm.nama.trim())
        setShowModulModal(false)
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal menyimpan modul', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal menyimpan modul: ' + err.message, 'error')
    } finally {
      setSavingModul(false)
    }
  }

  // Delete Modul
  const handleDeleteModul = () => {
    if (selectedModul.toLowerCase() === 'default') {
      showNotification('Peringatan', 'Modul "Default" adalah modul utama dan tidak dapat dihapus.', 'warning')
      return
    }

    const target = (modulList || []).find((m: any) => m.nama.toLowerCase() === selectedModul.toLowerCase())
    if (!target) {
      showNotification('Peringatan', `Modul "${selectedModul}" tidak ditemukan di database.`, 'warning')
      return
    }

    showConfirm(
      'Hapus Modul?',
      `Hapus modul "${selectedModul}"? Seluruh topik di dalamnya akan dialihkan ke modul "Default".`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE_MODUL', id: target.id }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Modul berhasil dihapus', 'success')
            setSelectedModul('Default')
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus modul', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal menghapus modul: ' + err.message, 'error')
        }
      }
    )
  }

  // Open Modal Tambah Topik
  const handleOpenCreate = () => {
    setEditingItem(null)
    setForm({
      modul: selectedModul !== 'SEMUA' ? selectedModul : 'Default',
      kode: `TPK-${Date.now().toString().slice(-4)}`,
      nama: '',
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
      modul: item.namaModul || item.modul?.nama || selectedModul || 'Default',
      kode: item.kode || `TPK-${Date.now().toString().slice(-4)}`,
      nama: item.nama || '',
      status: item.status === 'NONAKTIF' ? 'Nonaktif' : 'Aktif',
      tingkat: item.tingkat || 10,
      durasiMenit: item.durasiMenit || 90,
    })
    setShowModal(true)
  }

  // Save Topik
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nama.trim()) {
      showNotification('Peringatan', 'Nama Topik wajib diisi', 'warning')
      return
    }

    try {
      setSaving(true)
      const action = editingItem ? 'UPDATE_MAPEL' : 'CREATE_MAPEL'
      const statusValue = form.status === 'Nonaktif' ? 'NONAKTIF' : 'AKTIF'
      const finalKode = form.kode?.trim() || `TPK-${Date.now().toString().slice(-4)}`
      const payload = editingItem
        ? { action, id: editingItem.id, ...form, kode: finalKode, status: statusValue, namaModul: form.modul }
        : { action, ...form, kode: finalKode, status: statusValue, namaModul: form.modul }

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

  // Archive / Unarchive Single Topic
  const handleArchiveSingle = (item: any) => {
    const isArchived = item.status === 'NONAKTIF'
    const action = isArchived ? 'UNARCHIVE_MAPEL' : 'ARCHIVE_MAPEL'
    const title = isArchived ? 'Aktifkan Kembali Topik?' : 'Arsipkan Topik?'
    const message = isArchived
      ? `Aktifkan kembali topik "${item.nama}"?`
      : `Arsipkan topik "${item.nama}"? Topik yang diarsipkan tidak muncul saat membuat tes baru, namun butir soal tetap aman.`

    showConfirm(title, message, async () => {
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, id: item.id }),
        })
        const json = await res.json()
        if (json.success) {
          showNotification('Berhasil', json.message || 'Status topik diperbarui', 'success')
          onRefresh()
        } else {
          showNotification('Gagal', json.message || 'Gagal mengubah status topik', 'error')
        }
      } catch (err: any) {
        showNotification('Error', 'Gagal: ' + err.message, 'error')
      }
    })
  }

  // Bulk Archive
  const handleBulkArchive = () => {
    if (selectedIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 topik untuk diarsipkan', 'warning')
      return
    }

    showConfirm(
      'Arsipkan Topik Terpilih?',
      `Arsipkan ${selectedIds.length} topik terpilih? Butir soal tetap aman.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'BULK_ARCHIVE_MAPEL', ids: selectedIds }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Topik terpilih diarsipkan', 'success')
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

  // Bulk Unarchive
  const handleBulkUnarchive = () => {
    if (selectedIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 topik untuk diaktifkan kembali', 'warning')
      return
    }

    showConfirm(
      'Aktifkan Kembali Topik Terpilih?',
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
            showNotification('Berhasil', json.message || 'Topik terpilih diaktifkan', 'success')
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
      `Pindahkan topik "${item.nama}" ke Recycle Bin? Butir soal tetap aman dan dapat dipulihkan kapan saja.`,
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
      `Pindahkan ${selectedIds.length} topik terpilih ke Recycle Bin?`,
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

  // 3. Restore Single Topic (Pulihkan Topik dari Recycle Bin)
  const handleRestoreSingle = (item: any) => {
    showConfirm(
      'Pulihkan Topik?',
      `Pulihkan topik "${item.nama}" kembali aktif?`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'RESTORE_MAPEL', id: item.id }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Topik berhasil dipulihkan', 'success')
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal memulihkan topik', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // 4. Bulk Restore Topics (Pulihkan Banyak Topik)
  const handleBulkRestore = () => {
    if (selectedIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 topik untuk dipulihkan', 'warning')
      return
    }

    showConfirm(
      'Pulihkan Topik Terpilih?',
      `Pulihkan ${selectedIds.length} topik terpilih kembali aktif?`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'BULK_RESTORE_MAPEL', ids: selectedIds }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Topik terpilih dipulihkan', 'success')
            setSelectedIds([])
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal memulihkan topik', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // 5. Permanent Delete Single Topic (Hapus Permanen Tunggal)
  const handlePermanentDeleteSingle = (item: any) => {
    showConfirm(
      'Hapus Permanen?',
      `Hapus permanen topik "${item.nama}" beserta butir soalnya? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'PERMANENT_DELETE_MAPEL', id: item.id }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Topik telah dihapus permanen', 'success')
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus topik', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // 6. Bulk Permanent Delete (Hapus Permanen Massal)
  const handleBulkPermanentDelete = () => {
    if (selectedIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 topik untuk dihapus permanen', 'warning')
      return
    }

    showConfirm(
      'Hapus Permanen Topik Terpilih?',
      `Hapus permanen ${selectedIds.length} topik terpilih beserta butir soalnya? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'BULK_PERMANENT_DELETE_MAPEL', ids: selectedIds }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Topik terpilih dihapus permanen', 'success')
            setSelectedIds([])
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus topik', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // 7. Empty Trash (Kosongkan Recycle Bin)
  const handleEmptyTrash = () => {
    if (trashCount === 0) {
      showNotification('Info', 'Recycle Bin saat ini kosong.', 'info')
      return
    }

    showConfirm(
      'Kosongkan Recycle Bin?',
      `Hapus permanen seluruh (${trashCount}) topik di Recycle Bin?`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'EMPTY_TRASH_MAPEL' }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Recycle Bin berhasil dikosongkan', 'success')
            setSelectedIds([])
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal mengosongkan Recycle Bin', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
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
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredItems.map((item) => item.id))
    }
  }

  // Filter Items berdasarkan Mode Tampilan (Active vs Trash)
  const baseItems = viewMode === 'TRASH' ? trashAllItems : activeAllItems
  const modulItems = baseItems.filter((m: any) => {
    const mapelModul = m.namaModul || m.modul?.nama || 'Default'
    const matchModul = selectedModul === 'SEMUA' || mapelModul.toLowerCase() === selectedModul.toLowerCase()

    if (viewMode === 'TRASH') {
      return matchModul
    }

    let matchStatus = true
    if (statusFilter === 'AKTIF') {
      matchStatus = m.status !== 'NONAKTIF'
    } else if (statusFilter === 'NONAKTIF') {
      matchStatus = m.status === 'NONAKTIF'
    }

    return matchModul && matchStatus
  })

  const filteredItems = modulItems.filter((m: any) =>
    m.nama ? m.nama.toLowerCase().includes(searchQuery.toLowerCase()) : true
  )
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / entriesPerPage))
  const paginatedItems = filteredItems.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage)

  return (
    <div className="w-full space-y-4 font-sans text-slate-800 dark:text-slate-100">
      {/* 1. Header Page Title, Tabs & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-slate-900 dark:text-white flex items-center gap-2">
            Topik & Modul Soal
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
              {viewMode === 'ACTIVE'
                ? 'Daftar topik aktif dan pengarsipan topik berdasarkan modul'
                : 'Recycle Bin topik soal yang dihapus'}
            </span>
          </h1>
        </div>

        {/* View Mode Switch Tabs (Daftar Topik vs Recycle Bin) */}
        {canManageTrash && (
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold shadow-xs">
              <button
                type="button"
                onClick={() => handleSwitchViewMode('ACTIVE')}
                className={`px-3.5 py-1.5 rounded-md flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'ACTIVE'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Daftar Topik</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    viewMode === 'ACTIVE'
                      ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchViewMode('TRASH')}
                className={`px-3.5 py-1.5 rounded-md flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'TRASH'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Recycle Bin</span>
                {trashCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold animate-pulse">
                    {trashCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Notice Box */}
      {viewMode === 'ACTIVE' ? (
        <div className="p-3 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>
            Topik yang dihapus akan tersimpan di <strong>Recycle Bin</strong> dan dapat dipulihkan kapan saja.
          </span>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/50 flex items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Topik di <strong>Recycle Bin</strong> dapat dipulihkan kembali ke modul asal atau dihapus permanen.
            </span>
          </div>
          {trashCount > 0 && (
            <button
              type="button"
              onClick={handleEmptyTrash}
              className="shrink-0 px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Kosongkan Recycle Bin</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Grid: Left Panel (Pilih Modul) & Right Panel (Daftar Topik / Recycle Bin) */}
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
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Modul</span>
            </button>
          </div>
          <div className="p-4 sm:p-5 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Modul Aktif
                </label>
                {selectedModul.toLowerCase() !== 'default' && selectedModul !== 'SEMUA' && (
                  <button
                    type="button"
                    onClick={handleDeleteModul}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-0.5 cursor-pointer"
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
                className="w-full px-3 py-2 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
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
              {trashCount > 0 && viewMode === 'ACTIVE' && canManageTrash && (
                <button
                  type="button"
                  onClick={() => handleSwitchViewMode('TRASH')}
                  className="w-full px-4 py-1.5 rounded border border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Buka Recycle Bin ({trashCount})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Card: Daftar Topik / Recycle Bin */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              {viewMode === 'ACTIVE' ? (
                <>
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>
                    Daftar Topik {selectedModul !== 'SEMUA' ? `(${selectedModul})` : ''} - {filteredItems.length} Topik
                  </span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span className="text-rose-700 dark:text-rose-300">
                    Recycle Bin {selectedModul !== 'SEMUA' ? `(${selectedModul})` : ''} - {filteredItems.length} Topik
                  </span>
                </>
              )}
            </h2>

            {viewMode === 'ACTIVE' ? (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Topik</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSwitchViewMode('ACTIVE')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <span>← Kembali ke Daftar Topik</span>
              </button>
            )}
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

                {/* Status Filter Selector (Khusus Active Mode) */}
                {viewMode === 'ACTIVE' && (
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
                )}
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
                  placeholder="Cari nama topik..."
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
                    <th className="py-2.5 px-3">Modul</th>
                    <th className="py-2.5 px-3 text-center w-24">Jml. Soal</th>
                    <th className="py-2.5 px-3 text-center w-28">Status</th>
                    <th className="py-2.5 px-3 text-center w-48">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {viewMode === 'TRASH' ? (
                          <div className="space-y-1.5 py-4">
                            <Trash2 className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                            <p className="font-semibold text-slate-600 dark:text-slate-400">
                              Recycle Bin kosong
                            </p>
                            <p className="text-xs text-slate-400">Tidak ada topik yang dihapus.</p>
                          </div>
                        ) : searchQuery || statusFilter !== 'SEMUA' ? (
                          'Tidak ada topik yang sesuai pencarian.'
                        ) : (
                          <div className="space-y-2">
                            <p>
                              Belum ada topik di modul{' '}
                              <strong>{selectedModul === 'SEMUA' ? 'ini' : selectedModul}</strong>.
                            </p>
                            <button
                              type="button"
                              onClick={handleOpenCreate}
                              className="px-3 py-1.5 rounded bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 cursor-pointer"
                            >
                              + Buat Topik
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item: any, idx: number) => {
                      const rowNumber = (currentPage - 1) * entriesPerPage + idx + 1
                      const isSelected = selectedIds.includes(item.id)
                      const isArchived = item.status === 'NONAKTIF'
                      const isTrash = item.status === 'TERHAPUS'
                      const soalCount = item._count?.soalList ?? item.soalList?.length ?? 0
                      const itemModul = item.namaModul || item.modul?.nama || 'Default'

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition ${
                            isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          } ${isArchived ? 'opacity-80 bg-slate-50/30 dark:bg-slate-900/30' : ''} ${
                            isTrash ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-medium text-slate-500 dark:text-slate-400">
                            {rowNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{item.nama}</span>
                              {isArchived && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold font-mono">
                                  (Arsip)
                                </span>
                              )}
                              {isTrash && (
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold font-mono">
                                  (Recycle Bin)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                              {item.tingkat ? <span>Kelas {item.tingkat}</span> : null}
                              {item.kode ? <span className="font-mono text-[10px] text-slate-400">[{item.kode}]</span> : null}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold text-[11px] border border-blue-200 dark:border-blue-900/40">
                              {itemModul}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                isTrash
                                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                              title={`${soalCount} butir soal tersimpan`}
                            >
                              {soalCount} Soal
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isTrash ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold text-[10px] border border-rose-200 dark:border-rose-800/40">
                                Recycle Bin
                              </span>
                            ) : isArchived ? (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px] border border-slate-300 dark:border-slate-700">
                                Arsip
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800/40">
                                Aktif
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {viewMode === 'TRASH' ? (
                              /* Aksi di Recycle Bin: Restore & Permanent Delete */
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRestoreSingle(item)}
                                  title="Pulihkan topik ini kembali aktif"
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs transition"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Pulihkan</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePermanentDeleteSingle(item)}
                                  title="Hapus Topik Secara Permanen"
                                  className="p-1.5 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition border border-rose-200 dark:border-rose-900/40"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectRow(item.id)}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer ml-1"
                                />
                              </div>
                            ) : (
                              /* Aksi di Daftar Topik Reguler */
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
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer: Left (Info), Right (Pagination) */}
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
              {viewMode === 'TRASH' ? (
                /* Tombol Massal di Recycle Bin: Pulihkan Terpilih & Hapus Permanen Terpilih */
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBulkRestore}
                    disabled={selectedIds.length === 0}
                    className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Pulihkan ({selectedIds.length}) Terpilih</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkPermanentDelete}
                    disabled={selectedIds.length === 0}
                    className="px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Permanen ({selectedIds.length}) Terpilih</span>
                  </button>
                </div>
              ) : (
                /* Tombol Massal di Daftar Reguler */
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
              )}

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

      {/* 3. MODAL TAMBAH / EDIT MODUL */}
      {showModulModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-md shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#337ab7] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4" />
                <span>{editingModul ? 'Edit Modul' : 'Tambah Modul Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModulModal(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModul} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Modul *
                </label>
                <input
                  type="text"
                  required
                  value={modulForm.nama}
                  onChange={(e) => setModulForm({ ...modulForm, nama: e.target.value })}
                  placeholder="Contoh: Tryout TKA, Ujian Sekolah, Asesmen Sumatif"
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModulModal(false)}
                  className="px-4 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingModul}
                  className="px-5 py-1.5 rounded bg-[#337ab7] hover:bg-[#286090] text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingModul ? 'Menyimpan...' : 'Simpan Modul'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL TAMBAH / EDIT TOPIK */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-md shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#337ab7] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingItem ? 'Edit Topik' : 'Tambah Topik Mata Pelajaran Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Modul Induk *
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
                <p className="text-[10px] text-slate-500 mt-1">Topik ini akan berada di dalam modul yang dipilih</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Topik / Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: Al-Islam & Kemuhammadiyahan XII"
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
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
                    Status Topik
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Arsip</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-1.5 rounded bg-[#337ab7] hover:bg-[#286090] text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
