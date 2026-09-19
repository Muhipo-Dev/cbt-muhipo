'use client'

import React, { useState } from 'react'
import {
  Download,
  Upload,
  Database,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Server,
  FileJson,
  RotateCcw,
  Sparkles,
  Lock,
  Layers,
  Search,
  BookOpen,
  ArrowUpRight,
  Archive,
  Info,
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface BackupDataViewProps {
  stats?: any
  mapelList?: any[]
  modulList?: any[]
  currentUser?: any
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
  showConfirm: (title: string, message: string, onConfirm: () => void, type?: any) => void
  onNavigateToTopik?: () => void
}

export function BackupDataView({
  stats,
  mapelList = [],
  modulList = [],
  currentUser,
  onRefresh,
  showNotification,
  showConfirm,
  onNavigateToTopik,
}: BackupDataViewProps) {
  const [downloadingJson, setDownloadingJson] = useState(false)
  const [downloadingSoal, setDownloadingSoal] = useState(false)
  const [downloadingJadwal, setDownloadingJadwal] = useState(false)
  const [downloadingHasil, setDownloadingHasil] = useState(false)
  const [exportingNilai, setExportingNilai] = useState(false)
  const [exportingSiswa, setExportingSiswa] = useState(false)

  // Restore State
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restorePreview, setRestorePreview] = useState<any | null>(null)
  const [restoring, setRestoring] = useState(false)

  // Maintenance & Wipe State
  const [wipeAction, setWipeAction] = useState<string | null>(null)
  const [factoryConfirmText, setFactoryConfirmText] = useState('')
  const [wiping, setWiping] = useState(false)

  // --- RECYCLE BIN STATE ---
  const [trashSearchQuery, setTrashSearchQuery] = useState('')
  const [trashSelectedModul, setTrashSelectedModul] = useState('SEMUA')
  const [trashEntriesPerPage, setTrashEntriesPerPage] = useState(10)
  const [trashCurrentPage, setTrashCurrentPage] = useState(1)
  const [selectedTrashIds, setSelectedTrashIds] = useState<string[]>([])
  const [trashActionLoading, setTrashActionLoading] = useState(false)

  // Ambil list modul unik
  const rawModulNames = Array.from(
    new Set([
      'Default',
      ...(modulList || []).map((m: any) => m.nama),
      ...(mapelList || []).map((m: any) => m.namaModul || m.modul?.nama).filter(Boolean),
    ])
  )

  // Filter Items Recycle Bin (status === 'TERHAPUS')
  const allItems = mapelList || []
  const trashAllItems = allItems.filter((m: any) => m.status === 'TERHAPUS')
  const activeAllItems = allItems.filter((m: any) => m.status !== 'TERHAPUS')
  const trashCount = trashAllItems.length

  const filteredTrashByModul =
    trashSelectedModul === 'SEMUA'
      ? trashAllItems
      : trashAllItems.filter(
          (m: any) =>
            (m.namaModul || m.modul?.nama || 'Default').toLowerCase() === trashSelectedModul.toLowerCase()
        )

  const filteredTrashItems = filteredTrashByModul.filter((m: any) => {
    const q = trashSearchQuery.toLowerCase()
    const matchName = m.nama ? m.nama.toLowerCase().includes(q) : false
    const matchKode = m.kode ? m.kode.toLowerCase().includes(q) : false
    return matchName || matchKode
  })

  const totalTrashPages = Math.max(1, Math.ceil(filteredTrashItems.length / trashEntriesPerPage))
  const paginatedTrashItems = filteredTrashItems.slice(
    (trashCurrentPage - 1) * trashEntriesPerPage,
    trashCurrentPage * trashEntriesPerPage
  )

  // Toggle selection row in Recycle Bin
  const toggleSelectTrashRow = (id: string) => {
    setSelectedTrashIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAllTrash = () => {
    if (selectedTrashIds.length === filteredTrashItems.length && filteredTrashItems.length > 0) {
      setSelectedTrashIds([])
    } else {
      setSelectedTrashIds(filteredTrashItems.map((item: any) => item.id))
    }
  }

  // 1. Restore Single Topic (Pulihkan Topik dari Recycle Bin)
  const handleRestoreSingle = (item: any) => {
    showConfirm(
      'Pulihkan Topik?',
      `Pulihkan topik "${item.nama}" beserta seluruh butir soalnya kembali ke daftar topik aktif?`,
      async () => {
        try {
          setTrashActionLoading(true)
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'RESTORE_MAPEL', id: item.id }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil Dipulihkan', json.message || 'Topik berhasil dipulihkan', 'success')
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal memulihkan topik', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        } finally {
          setTrashActionLoading(false)
        }
      },
      'info'
    )
  }

  // 2. Bulk Restore Topics (Pulihkan Banyak Topik)
  const handleBulkRestore = () => {
    if (selectedTrashIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 topik di Recycle Bin untuk dipulihkan', 'warning')
      return
    }

    showConfirm(
      'Pulihkan Topik Terpilih?',
      `Pulihkan ${selectedTrashIds.length} topik terpilih kembali ke daftar aktif?`,
      async () => {
        try {
          setTrashActionLoading(true)
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'BULK_RESTORE_MAPEL', ids: selectedTrashIds }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil Dipulihkan', json.message || 'Topik terpilih berhasil dipulihkan', 'success')
            setSelectedTrashIds([])
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal memulihkan topik terpilih', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        } finally {
          setTrashActionLoading(false)
        }
      },
      'info'
    )
  }

  // 3. Permanent Delete Single Topic (Hapus Permanen Tunggal)
  const handlePermanentDeleteSingle = (item: any) => {
    showConfirm(
      'Hapus Permanen Topik Ini?',
      `Hapus permanen topik "${item.nama}" beserta seluruh butir soal, opsi jawaban, dan riwayat ujian terkait? Tindakan ini bersifat PERMANEN dan TIDAK BISA DIBATALKAN.`,
      async () => {
        try {
          setTrashActionLoading(true)
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'PERMANENT_DELETE_MAPEL', id: item.id }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil Dihapus', json.message || 'Topik telah dihapus permanen dari sistem', 'success')
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus topik', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        } finally {
          setTrashActionLoading(false)
        }
      },
      'danger'
    )
  }

  // 4. Bulk Permanent Delete (Hapus Permanen Terpilih)
  const handleBulkPermanentDelete = () => {
    if (selectedTrashIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 topik untuk dihapus permanen', 'warning')
      return
    }

    showConfirm(
      'Hapus Permanen Topik Terpilih?',
      `Hapus permanen ${selectedTrashIds.length} topik terpilih beserta seluruh butir soalnya? Data tidak dapat dipulihkan kembali setelah dihapus permanen.`,
      async () => {
        try {
          setTrashActionLoading(true)
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'BULK_PERMANENT_DELETE_MAPEL', ids: selectedTrashIds }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil Dihapus', json.message || 'Topik terpilih telah dihapus permanen', 'success')
            setSelectedTrashIds([])
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus topik terpilih', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        } finally {
          setTrashActionLoading(false)
        }
      },
      'danger'
    )
  }

  // 5. Empty Trash (Kosongkan Seluruh Recycle Bin)
  const handleEmptyTrash = () => {
    if (trashCount === 0) {
      showNotification('Info', 'Recycle Bin saat ini sudah kosong.', 'info')
      return
    }

    showConfirm(
      'Kosongkan Seluruh Recycle Bin?',
      `Apakah Anda yakin ingin menghapus permanen seluruh (${trashCount}) topik di Recycle Bin beserta semua butir soalnya? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        try {
          setTrashActionLoading(true)
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'EMPTY_TRASH_MAPEL' }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Recycle Bin Dikosongkan', json.message || 'Seluruh item di Recycle Bin berhasil dibersihkan', 'success')
            setSelectedTrashIds([])
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal mengosongkan Recycle Bin', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        } finally {
          setTrashActionLoading(false)
        }
      },
      'danger'
    )
  }

  // 6. Backup Single Deleted Topic (JSON)
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

  // 7. Backup Bulk Selected Deleted Topics (JSON)
  const handleBackupBulk = async () => {
    if (selectedTrashIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 topik untuk dicadangkan', 'warning')
      return
    }

    try {
      showNotification('Memproses', `Menyiapkan cadangan ${selectedTrashIds.length} topik terpilih...`, 'info')
      const res = await fetch(`/api/admin/backup?type=soal_topik&ids=${selectedTrashIds.join(',')}`)
      if (!res.ok) throw new Error('Gagal mengunduh cadangan')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = `CBT_MUHIPO_SOAL_TRASH_${selectedTrashIds.length}_TOPIK_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      showNotification('Berhasil', `Berhasil mencadangkan ${selectedTrashIds.length} topik terpilih.`, 'success')
    } catch (err: any) {
      showNotification('Gagal', 'Gagal backup: ' + err.message, 'error')
    }
  }

  // --- BACKUP DOWNLOAD ACTIONS ---
  // Download Full Database JSON
  const handleDownloadBackupJson = async () => {
    try {
      setDownloadingJson(true)
      const res = await fetch('/api/admin/backup')
      if (!res.ok) throw new Error('Gagal mengunduh backup')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = `CBT_MUHIPO_FULL_BACKUP_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      showNotification('Berhasil', 'File cadangan basis data (.json) berhasil diunduh.', 'success')
    } catch (err: any) {
      showNotification('Gagal', err.message || 'Gagal mengunduh backup JSON', 'error')
    } finally {
      setDownloadingJson(false)
    }
  }

  // Download Backup Soal & Topik Modul (JSON)
  const handleDownloadSoalTopikJson = async () => {
    try {
      setDownloadingSoal(true)
      const res = await fetch('/api/admin/backup?type=soal_topik')
      if (!res.ok) throw new Error('Gagal mengunduh backup soal')

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

      showNotification('Berhasil', 'File cadangan master butir soal & topik (.json) berhasil diunduh.', 'success')
    } catch (err: any) {
      showNotification('Gagal', err.message || 'Gagal mengunduh backup soal', 'error')
    } finally {
      setDownloadingSoal(false)
    }
  }

  // Download Backup Jadwal Tes (JSON)
  const handleDownloadJadwalTesJson = async () => {
    try {
      setDownloadingJadwal(true)
      const res = await fetch('/api/admin/backup?type=jadwal_tes')
      if (!res.ok) throw new Error('Gagal mengunduh backup jadwal tes')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = `CBT_MUHIPO_JADWAL_TES_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      showNotification('Berhasil', 'File cadangan jadwal tes & sesi ujian (.json) berhasil diunduh.', 'success')
    } catch (err: any) {
      showNotification('Gagal', err.message || 'Gagal mengunduh backup jadwal', 'error')
    } finally {
      setDownloadingJadwal(false)
    }
  }

  // Download Backup Hasil Tes (JSON)
  const handleDownloadHasilTesJson = async () => {
    try {
      setDownloadingHasil(true)
      const res = await fetch('/api/admin/backup?type=hasil_tes')
      if (!res.ok) throw new Error('Gagal mengunduh backup hasil tes')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = `CBT_MUHIPO_HASIL_TES_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      showNotification('Berhasil', 'File cadangan lembar jawaban & hasil tes (.json) berhasil diunduh.', 'success')
    } catch (err: any) {
      showNotification('Gagal', err.message || 'Gagal mengunduh backup hasil', 'error')
    } finally {
      setDownloadingHasil(false)
    }
  }

  // Ekspor Semua Rekap Nilai ke Excel
  const handleExportAllNilai = async () => {
    try {
      setExportingNilai(true)
      const res = await fetch('/api/admin/backup?type=rekap_nilai_all')
      const json = await res.json()
      if (!json.success || !json.data || json.data.length === 0) {
        showNotification('Informasi', 'Belum ada data nilai ujian untuk diekspor.', 'info')
        return
      }

      const worksheet = XLSX.utils.json_to_sheet(json.data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Master_Rekap_Nilai')
      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(workbook, `Rekap_Nilai_Seluruh_Ujian_${dateStr}.xlsx`)

      showNotification('Berhasil', `Berhasil mengekspor ${json.total} baris nilai ujian ke Excel.`, 'success')
    } catch (err: any) {
      showNotification('Gagal', 'Gagal mengekspor nilai: ' + err.message, 'error')
    } finally {
      setExportingNilai(false)
    }
  }

  // Ekspor Data Peserta ke Excel
  const handleExportSiswa = async () => {
    try {
      setExportingSiswa(true)
      const res = await fetch('/api/admin?tab=siswa')
      const json = await res.json()
      const siswaList = json.data?.siswaList || []

      if (siswaList.length === 0) {
        showNotification('Informasi', 'Belum ada data peserta siswa.', 'info')
        return
      }

      const rows = siswaList.map((s: any, idx: number) => ({
        No: idx + 1,
        'Nama Lengkap': s.name,
        Username: s.username,
        'Nomor Peserta': s.nomorPeserta || s.username,
        'Group / Kelas': s.kelas?.nama || 'Umum',
        'Ruang Ujian': s.ruangUjian || 'Ruang 1',
        'Sesi Ujian': s.sesiUjian || 1,
        'Jenis Kelamin': s.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki',
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Peserta')
      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(workbook, `Data_Peserta_CBT_${dateStr}.xlsx`)

      showNotification('Berhasil', `Berhasil mengekspor ${rows.length} data peserta ke Excel.`, 'success')
    } catch (err: any) {
      showNotification('Gagal', 'Gagal mengekspor peserta: ' + err.message, 'error')
    } finally {
      setExportingSiswa(false)
    }
  }

  // Handle File JSON Restore Selection
  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setRestoreFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (parsed.meta && parsed.data) {
          setRestorePreview(parsed)
        } else {
          showNotification('Format Tidak Cocok', 'File JSON bukan cadangan valid CBT MUHIPO.', 'warning')
          setRestoreFile(null)
          setRestorePreview(null)
        }
      } catch (err) {
        showNotification('File Korup', 'Gagal membaca format JSON dari file.', 'error')
        setRestoreFile(null)
        setRestorePreview(null)
      }
    }
    reader.readAsText(file)
  }

  // Execute Restore
  const handleExecuteRestore = () => {
    if (!restorePreview) return

    showConfirm(
      'Konfirmasi Pemulihan Database',
      'Apakah Anda yakin ingin memulihkan basis data dari file ini? Data yang ada akan disinkronkan dan ditimpa sesuai isi file cadangan.',
      async () => {
        try {
          setRestoring(true)
          const res = await fetch('/api/admin/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'RESTORE_DATABASE_JSON',
              backupData: restorePreview,
            }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Pemulihan Sukses', json.message || 'Basis data berhasil dipulihkan!', 'success')
            setRestoreFile(null)
            setRestorePreview(null)
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal memulihkan database', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal restore: ' + err.message, 'error')
        } finally {
          setRestoring(false)
        }
      },
      'warning'
    )
  }

  // Maintenance / Wipe Actions
  const handleExecuteWipe = async (action: string) => {
    try {
      setWiping(true)
      const payload: any = { action }
      if (action === 'FACTORY_RESET') {
        payload.confirmText = factoryConfirmText
      }

      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Pembersihan Berhasil', json.message, 'success')
        setWipeAction(null)
        setFactoryConfirmText('')
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal melakukan pembersihan data', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal: ' + err.message, 'error')
    } finally {
      setWiping(false)
    }
  }

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100">
      {/* 1. Header Banner */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Backup, Pemulihan & Pemeliharaan Data</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20">
                Sistem CBT
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola cadangan database, Recycle Bin pemulihan topik soal terhapus, ekspor spreadsheet, serta fasilitas reset pemeliharaan server.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigateToTopik && (
            <button
              type="button"
              onClick={onNavigateToTopik}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-900 transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Buka Daftar Topik</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sinkronkan Statistik</span>
          </button>
        </div>
      </div>

      {/* Quick Status Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Topik Modul Aktif</span>
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
            {activeAllItems.length}{' '}
            <span className="text-xs font-normal text-slate-400">Topik</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total Butir Soal</span>
            <Database className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
            {stats?.totalSoal ?? 0}{' '}
            <span className="text-xs font-normal text-slate-400">Soal</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Siswa Terdaftar</span>
            <Server className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
            {stats?.totalSiswa ?? 0}{' '}
            <span className="text-xs font-normal text-slate-400">Peserta</span>
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-xs transition ${
            trashCount > 0
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
              : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Recycle Bin Topik</span>
            <Trash2
              className={`w-3.5 h-3.5 ${
                trashCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'
              }`}
            />
          </div>
          <div
            className={`mt-1 text-xl font-black ${
              trashCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
            }`}
          >
            {trashCount}{' '}
            <span className="text-xs font-normal text-slate-400">Terhapus</span>
          </div>
        </div>
      </div>

      {/* 2. AREA FITUR UTAMA: RECYCLE BIN & PEMULIHAN TOPIK SOAL */}
      <div className="bg-white/90 dark:bg-slate-900/85 border border-rose-200/80 dark:border-rose-900/40 rounded-3xl shadow-sm dark:shadow-xl backdrop-blur-xl overflow-hidden">
        <div className="border-b border-rose-100 dark:border-rose-900/30 p-5 sm:p-6 bg-gradient-to-r from-rose-50/60 to-orange-50/40 dark:from-rose-950/30 dark:to-orange-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-600 text-white shadow-md">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Recycle Bin Modul & Topik Soal
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  {trashCount} Item Terhapus
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Kelola topik mata pelajaran dan butir soal yang dihapus. Anda dapat memulihkan (Restore) kembali ke daftar aktif atau menghapus permanen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {trashCount > 0 && (
              <button
                type="button"
                onClick={handleEmptyTrash}
                disabled={trashActionLoading}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Recycle Bin</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span>Show</span>
                <select
                  value={trashEntriesPerPage}
                  onChange={(e) => {
                    setTrashEntriesPerPage(Number(e.target.value))
                    setTrashCurrentPage(1)
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:border-rose-500 font-semibold"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entries</span>
              </div>

              {/* Filter Modul */}
              <div className="flex items-center gap-1.5 ml-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Modul:</span>
                <select
                  value={trashSelectedModul}
                  onChange={(e) => {
                    setTrashSelectedModul(e.target.value)
                    setTrashCurrentPage(1)
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="SEMUA">-- Semua Modul --</option>
                  {rawModulNames.map((modName) => (
                    <option key={modName} value={modName}>
                      {modName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span>Cari di Sampah:</span>
              <div className="relative">
                <input
                  type="text"
                  value={trashSearchQuery}
                  onChange={(e) => {
                    setTrashSearchQuery(e.target.value)
                    setTrashCurrentPage(1)
                  }}
                  placeholder="Cari kode/nama topik..."
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:border-rose-500 text-slate-900 dark:text-white"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Table Recycle Bin */}
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-white/10">
                  <th className="py-3 px-3.5 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedTrashIds.length === filteredTrashItems.length &&
                        filteredTrashItems.length > 0
                      }
                      onChange={handleToggleSelectAllTrash}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 w-10 text-center">No.</th>
                  <th className="py-3 px-3">Modul</th>
                  <th className="py-3 px-3">Topik / Mata Pelajaran</th>
                  <th className="py-3 px-3 text-center">Tingkat</th>
                  <th className="py-3 px-3 text-center">Total Soal</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center w-48">Aksi Pemulihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {paginatedTrashItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                          Recycle Bin Bersih & Kosong
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                          Tidak ada topik atau butir soal yang berada di keranjang sampah. Seluruh data topik aktif tersimpan aman.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTrashItems.map((item: any, idx: number) => {
                    const countSoal = item._count?.soalList || item.soalList?.length || 0
                    const modulName = item.namaModul || item.modul?.nama || 'Default'
                    const isSelected = selectedTrashIds.includes(item.id)

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition ${
                          isSelected ? 'bg-rose-50/70 dark:bg-rose-950/40' : ''
                        }`}
                      >
                        <td className="py-3 px-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectTrashRow(item.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-500">
                          {(trashCurrentPage - 1) * trashEntriesPerPage + idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                            {modulName}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{item.nama}</span>
                            <span className="text-[10px] font-mono font-normal text-slate-400">
                              ({item.kode})
                            </span>
                          </div>
                          {item.jurusan && item.jurusan !== 'UMUM' && (
                            <div className="text-[10px] text-slate-400">Jurusan: {item.jurusan}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Kelas {item.tingkat || 10}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {countSoal} Butir Soal
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            Di Recycle Bin
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Restore Button */}
                            <button
                              type="button"
                              onClick={() => handleRestoreSingle(item)}
                              disabled={trashActionLoading}
                              title="Pulihkan topik ini kembali aktif"
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs transition"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Pulihkan</span>
                            </button>

                            {/* Download Single Backup Before Deleting */}
                            <button
                              type="button"
                              onClick={() => handleBackupSingle(item)}
                              title="Unduh Cadangan JSON Soal Topik Ini"
                              className="p-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 cursor-pointer transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Permanent Delete Button */}
                            <button
                              type="button"
                              onClick={() => handlePermanentDeleteSingle(item)}
                              disabled={trashActionLoading}
                              title="Hapus Topik & Soal Secara Permanen"
                              className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition"
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

          {/* Table Footer & Bulk Operations */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2">
            <div>
              Menampilkan{' '}
              {filteredTrashItems.length === 0
                ? 0
                : (trashCurrentPage - 1) * trashEntriesPerPage + 1}{' '}
              sampai {Math.min(trashCurrentPage * trashEntriesPerPage, filteredTrashItems.length)} dari{' '}
              {filteredTrashItems.length} topik di sampah
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                disabled={trashCurrentPage <= 1}
                onClick={() => setTrashCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                Sebelumnya
              </button>

              {Array.from({ length: totalTrashPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTrashCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    trashCurrentPage === i + 1
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                type="button"
                disabled={trashCurrentPage >= totalTrashPages}
                onClick={() => setTrashCurrentPage((p) => Math.min(totalTrashPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>

          {/* Bulk Action Buttons Toolbar */}
          {trashCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkRestore}
                  disabled={selectedTrashIds.length === 0 || trashActionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Pulihkan ({selectedTrashIds.length}) Terpilih</span>
                </button>

                <button
                  type="button"
                  onClick={handleBackupBulk}
                  disabled={selectedTrashIds.length === 0}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Backup ({selectedTrashIds.length}) Soal Terpilih (.JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkPermanentDelete}
                  disabled={selectedTrashIds.length === 0 || trashActionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Permanen ({selectedTrashIds.length}) Terpilih</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleToggleSelectAllTrash}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                {selectedTrashIds.length === filteredTrashItems.length && filteredTrashItems.length > 0
                  ? 'Batal Pilih Semua'
                  : 'Pilih Semua'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Area Ekspor & Cadangan Basis Data (Backup) */}
      <div className="bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-sm dark:shadow-xl backdrop-blur-xl overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Ekspor & Unduh Cadangan Data (Backup)
            </h3>
          </div>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Full JSON Backup */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-200/80 dark:border-blue-900/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                <FileJson className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Cadangan Lengkap Database (JSON)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Mencakup seluruh data sistem: Pengaturan, Siswa, Kelas, Topik, Butir Soal, Jadwal Ujian, serta Lembar Jawaban & Nilai.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackupJson}
              disabled={downloadingJson}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingJson ? 'Menyiapkan File...' : 'Unduh Full Backup (.JSON)'}</span>
            </button>
          </div>

          {/* Card 2: Backup Master Soal & Topik Modul */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/10 border border-indigo-200/80 dark:border-indigo-900/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Backup Soal Topik Modul (JSON)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Cadangan seluruh master modul, topik mata pelajaran, butir soal terinput, bobot, dan opsi kunci jawaban lengkap.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadSoalTopikJson}
              disabled={downloadingSoal}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingSoal ? 'Menyiapkan Soal...' : 'Backup Soal Topik (.JSON)'}</span>
            </button>
          </div>

          {/* Card 3: Backup Jadwal Tes & Konfigurasi */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/80 dark:border-amber-900/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
                <FileJson className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Backup Jadwal Tes (JSON)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Cadangan seluruh jadwal ujian, alokasi kelas, konfigurasi token, durasi waktu, serta pengaturan keamanan browser.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadJadwalTesJson}
              disabled={downloadingJadwal}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingJadwal ? 'Menyiapkan Jadwal...' : 'Backup Jadwal Tes (.JSON)'}</span>
            </button>
          </div>

          {/* Card 4: Backup Hasil Tes Lengkap (JSON) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50/80 to-cyan-50/50 dark:from-teal-950/20 dark:to-cyan-950/10 border border-teal-200/80 dark:border-teal-900/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                <FileJson className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Backup Hasil & Lembar Jawaban (JSON)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Cadangan detail seluruh lembar pengerjaan peserta, pilihan butir soal per siswa, skor PG/Esai, dan riwayat ujian.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadHasilTesJson}
              disabled={downloadingHasil}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingHasil ? 'Menyiapkan Hasil...' : 'Backup Hasil Tes (.JSON)'}</span>
            </button>
          </div>

          {/* Card 5: Export All Nilai Excel */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-200/80 dark:border-emerald-900/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Master Rekap Nilai Seluruh Ujian (Excel)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Rekap komprehensif nilai seluruh siswa dari semua tes ujian (Skor PG, Skor Esai, Total Nilai CBT, KKM & Kelulusan).
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportAllNilai}
              disabled={exportingNilai}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{exportingNilai ? 'Mengompilasi Nilai...' : 'Ekspor Rekap Nilai (.XLSX)'}</span>
            </button>
          </div>

          {/* Card 6: Export Peserta Excel */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/10 border border-purple-200/80 dark:border-purple-900/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Ekspor Database Peserta Siswa (Excel)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Unduh seluruh data peserta aktif beserta nomor peserta, group kelas, ruang ujian, dan sesi ujian dalam format spreadsheet.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportSiswa}
              disabled={exportingSiswa}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{exportingSiswa ? 'Mengekspor Siswa...' : 'Ekspor Data Siswa (.XLSX)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Area Restore / Pemulihan Data */}
      <div className="bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-sm dark:shadow-xl backdrop-blur-xl overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Pulihkan Data dari File Cadangan (Restore)
            </h3>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-2">
            <FileJson className="w-8 h-8 text-indigo-500" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Pilih file cadangan JSON CBT MUHIPO untuk memulihkan database
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleSelectRestoreFile}
              className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300 cursor-pointer"
            />
          </div>

          {restorePreview && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>File Cadangan Valid Terverifikasi</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Tanggal Cadangan: {new Date(restorePreview.meta?.exportedAt).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900">
                  <span className="text-[10px] text-slate-500 block">Peserta:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {restorePreview.meta?.counts?.users || 0} Pengguna
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900">
                  <span className="text-[10px] text-slate-500 block">Topik:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {restorePreview.meta?.counts?.mataPelajaran || 0} Mapel
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900">
                  <span className="text-[10px] text-slate-500 block">Soal:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {restorePreview.meta?.counts?.soal || 0} Butir Soal
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900">
                  <span className="text-[10px] text-slate-500 block">Ujian:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {restorePreview.meta?.counts?.ujian || 0} Sesi Tes
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={restoring}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{restoring ? 'Memulihkan Basis Data...' : 'Jalankan Pemulihan Database Sekarang'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Area Pembersihan & Penghapusan Data (Maintenance) */}
      <div className="bg-white/90 dark:bg-slate-900/85 border border-rose-200/80 dark:border-rose-900/40 rounded-3xl shadow-sm dark:shadow-xl backdrop-blur-xl overflow-hidden">
        <div className="border-b border-rose-100 dark:border-rose-900/30 p-5 sm:p-6 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Pemeliharaan & Pembersihan Data (Maintenance)
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400">
                Tindakan penghapusan data bersifat permanen. Disarankan untuk mengunduh Backup JSON terlebih dahulu.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Action 1: Reset Hasil Ujian */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                  <span>Kosongkan Hasil Pengerjaan Ujian</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Menghapus semua lembar jawaban siswa dan rekap nilai, sehingga siswa dapat mengikuti ujian ulang dari awal. Master soal dan siswa tetap aman.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  showConfirm(
                    'Kosongkan Hasil Ujian?',
                    'Apakah Anda yakin ingin menghapus seluruh jawaban dan nilai siswa? Tindakan ini tidak dapat dibatalkan.',
                    () => handleExecuteWipe('RESET_HASIL_UJIAN'),
                    'warning'
                  )
                }
                className="w-full py-2 px-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 transition cursor-pointer"
              >
                Hapus Hasil Ujian Saja
              </button>
            </div>

            {/* Action 2: Reset Data Siswa */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Kosongkan Data Siswa & Group</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Menghapus seluruh akun siswa dan data kelas untuk persiapan tahun ajaran baru. Topik dan bank soal tetap dipertahankan.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  showConfirm(
                    'Kosongkan Data Siswa?',
                    'Apakah Anda yakin ingin menghapus seluruh akun siswa dan group kelas?',
                    () => handleExecuteWipe('RESET_DATA_SISWA'),
                    'warning'
                  )
                }
                className="w-full py-2 px-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold text-xs hover:bg-rose-100 transition cursor-pointer"
              >
                Hapus Data Siswa & Kelas
              </button>
            </div>

            {/* Action 3: Reset Soal & Topik */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Kosongkan Topik & Bank Soal</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Menghapus seluruh topik mata pelajaran, butir soal, dan jadwal tes yang ada di sistem. Data akun siswa tetap aman.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  showConfirm(
                    'Kosongkan Seluruh Soal & Topik?',
                    'Apakah Anda yakin ingin menghapus seluruh master topik dan butir soal?',
                    () => handleExecuteWipe('RESET_DATA_SOAL'),
                    'warning'
                  )
                }
                className="w-full py-2 px-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold text-xs hover:bg-rose-100 transition cursor-pointer"
              >
                Hapus Seluruh Soal & Topik
              </button>
            </div>
          </div>

          {/* Action 4: Factory Reset Total */}
          <div className="p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-3">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-black text-sm text-rose-900 dark:text-rose-200">
                  Pembersihan Pabrik (Factory Reset Total CBT)
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  Mengembalikan sistem ke kondisi awal (mengosongkan seluruh soal, siswa, nilai, ujian, dan log). Akun Superadmin aktif Anda akan tetap dipertahankan.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <input
                type="text"
                value={factoryConfirmText}
                onChange={(e) => setFactoryConfirmText(e.target.value)}
                placeholder='Ketik "RESET CBT MUHIPO"'
                className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-xs font-mono font-bold text-rose-900 dark:text-rose-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleExecuteWipe('FACTORY_RESET')}
                disabled={wiping || factoryConfirmText !== 'RESET CBT MUHIPO'}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{wiping ? 'Mereset Sistem...' : 'Jalankan Factory Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
