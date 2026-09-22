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
  Download,
  FileSpreadsheet,
} from 'lucide-react'
import * as XLSX from 'xlsx'

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
  const itemsMapel = (mapelList && mapelList.length > 0 ? mapelList : (bankSoalList || [])).filter(
    (m: any) => m.status !== 'TERHAPUS'
  )
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterModul, setFilterModul] = useState('SEMUA')
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUjian, setEditingUjian] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    ujianId: '',
    kodeUjian: '',
    judul: '',
    deskripsi: '',
    mataPelajaranId: '',
    durasiMenit: 90,
    minSoal: '' as string | number,
    maxSoal: '' as string | number,
    minJawaban: '' as string | number,
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
      minSoal: u.minSoal ?? '',
      maxSoal: u.maxSoal ?? '',
      minJawaban: u.minJawaban ?? '',
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
      ? `Aktifkan kembali tes "${ujian.judul}"? Tes akan kembali dijadwalkan untuk siswa.`
      : `Arsipkan tes "${ujian.judul}"? Jadwal tes akan dipindahkan ke arsip, namun data nilai dan jawaban peserta tetap aman.`

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
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map((item) => item.id))
    }
  }

  // Bulk Archive Tests
  const handleBulkArchive = () => {
    if (selectedIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 jadwal tes untuk diarsipkan', 'warning')
      return
    }

    showConfirm(
      'Arsipkan Jadwal Tes Terpilih?',
      `Apakah Anda yakin ingin mengarsipkan ${selectedIds.length} tes terpilih? Data nilai peserta tetap tersimpan rapi.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'BULK_ARCHIVE_UJIAN', ids: selectedIds }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Jadwal tes terpilih berhasil diarsipkan', 'success')
            setSelectedIds([])
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal mengarsipkan tes', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // Bulk Unarchive Tests
  const handleBulkUnarchive = () => {
    if (selectedIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 jadwal tes untuk diaktifkan kembali', 'warning')
      return
    }

    showConfirm(
      'Aktifkan Kembali Jadwal Tes Terpilih?',
      `Apakah Anda yakin ingin mengaktifkan kembali ${selectedIds.length} tes terpilih?`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'BULK_UNARCHIVE_UJIAN', ids: selectedIds }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Jadwal tes terpilih berhasil diaktifkan kembali', 'success')
            setSelectedIds([])
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal mengaktifkan tes', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal: ' + err.message, 'error')
        }
      }
    )
  }

  // Bulk Delete Tests
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 jadwal tes untuk dihapus', 'warning')
      return
    }

    showConfirm(
      'Hapus Jadwal Tes Terpilih?',
      `PERINGATAN: Apakah Anda yakin ingin menghapus ${selectedIds.length} jadwal tes terpilih secara permanen beserta seluruh jawaban siswa?`,
      async () => {
        try {
          for (const uId of selectedIds) {
            await fetch('/api/admin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'DELETE_UJIAN', ujianId: uId }),
            })
          }
          showNotification('Berhasil', `Berhasil menghapus ${selectedIds.length} jadwal tes.`, 'success')
          setSelectedIds([])
          onRefresh()
        } catch (err: any) {
          showNotification('Error', 'Gagal menghapus: ' + err.message, 'error')
        }
      }
    )
  }

  // 1. Backup Jadwal Tes (JSON)
  const handleBackupJadwalJson = async () => {
    try {
      showNotification('Memproses', 'Menyiapkan cadangan jadwal tes (.json)...', 'info')
      const res = await fetch('/api/admin/backup?type=jadwal_tes')
      if (!res.ok) throw new Error('Gagal mengunduh backup jadwal')

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

      showNotification('Berhasil', 'File cadangan jadwal tes (.json) berhasil diunduh.', 'success')
    } catch (err: any) {
      showNotification('Gagal', 'Gagal backup jadwal: ' + err.message, 'error')
    }
  }

  // 2. Ekspor Jadwal Tes ke Excel (.XLSX)
  const handleExportJadwalExcel = () => {
    if (!filtered || filtered.length === 0) {
      showNotification('Peringatan', 'Tidak ada jadwal tes untuk diekspor', 'warning')
      return
    }

    const rows = filtered.map((u: any, idx: number) => ({
      No: idx + 1,
      'Kode Ujian': u.kodeUjian,
      'Judul Ujian': u.judul,
      'Topik / Mapel': u.mataPelajaran?.nama || u.bankSoal?.nama || '-',
      'Durasi (Menit)': u.durasiMenit,
      Token: u.token || '-',
      'Waktu Mulai': u.waktuMulai ? new Date(u.waktuMulai).toLocaleString('id-ID') : '-',
      'Waktu Selesai': u.waktuSelesai ? new Date(u.waktuSelesai).toLocaleString('id-ID') : '-',
      'Alokasi Kelas': u.ujianKelas ? u.ujianKelas.map((uk: any) => uk.kelas?.nama).filter(Boolean).join(', ') : 'Semua',
      'Acak Soal': u.acakSoal ? 'Ya' : 'Tidak',
      'Acak Opsi': u.acakOpsi ? 'Ya' : 'Tidak',
      'Lock Browser': u.lockBrowser ? 'Aktif' : 'Nonaktif',
      'Tampilkan Nilai': u.tampilkanHasil ? 'Ya' : 'Tidak',
      Status: u.status,
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal_Tes')
    const dateStr = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `Jadwal_Tes_CBT_${dateStr}.xlsx`)
    showNotification('Berhasil', `Berhasil mengekspor ${rows.length} jadwal tes ke Excel.`, 'success')
  }

  const rawModulNames = Array.from(
    new Set([
      'SEMUA',
      ...(itemsMapel || []).map((m: any) => m.namaModul || m.modul?.nama).filter(Boolean),
    ])
  )

  const filtered = (jadwalList || []).filter((u) => {
    const mapelName = u.mataPelajaran?.nama || u.bankSoal?.nama || ''
    const modulName = u.mataPelajaran?.namaModul || u.mataPelajaran?.modul?.nama || ''
    const matchSearch =
      u.judul?.toLowerCase().includes(search.toLowerCase()) ||
      u.kodeUjian?.toLowerCase().includes(search.toLowerCase()) ||
      mapelName.toLowerCase().includes(search.toLowerCase()) ||
      modulName.toLowerCase().includes(search.toLowerCase())

    let matchStatus = true
    if (filterStatus === 'AKTIF') {
      matchStatus = u.status !== 'NONAKTIF'
    } else if (filterStatus === 'NONAKTIF') {
      matchStatus = u.status === 'NONAKTIF'
    } else if (filterStatus !== 'ALL') {
      matchStatus = u.status === filterStatus
    }

    let matchModul = true
    if (filterModul !== 'SEMUA') {
      matchModul = modulName.toLowerCase() === filterModul.toLowerCase()
    }

    return matchSearch && matchStatus && matchModul
  })

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / (entriesPerPage === 999 ? (filtered.length || 1) : entriesPerPage)) || 1
  const paginatedList = entriesPerPage === 999
    ? filtered
    : filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage)

  return (
    <div className="space-y-4">
      {/* Header & Button Tambah */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span>Daftar Jadwal & Arsip Tes Ujian</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daftar seluruh pelaksanaan tes CBT aktif maupun riwayat arsip tes berdasarkan Topik Mapel.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleBackupJadwalJson}
            title="Cadangkan seluruh jadwal tes ke file JSON"
            className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup Jadwal (.JSON)</span>
          </button>

          <button
            type="button"
            onClick={handleExportJadwalExcel}
            title="Ekspor seluruh jadwal tes ke Excel"
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToTambah}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Jadwal Tes</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Cari kode ujian, judul tes, atau nama topik mapel..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={filterModul}
            onChange={(e) => {
              setFilterModul(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="SEMUA">Semua Modul Kategori</option>
            {rawModulNames.filter(m => m !== 'SEMUA').map((m) => (
              <option key={m} value={m}>
                Modul: {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Status (Aktif & Arsip)</option>
            <option value="AKTIF">Hanya Jadwal Aktif</option>
            <option value="DIJADWALKAN">Status: Dijadwalkan</option>
            <option value="SEDANG_BERJALAN">Status: Sedang Berjalan</option>
            <option value="NONAKTIF">Status: Diarsipkan (Nonaktif)</option>
          </select>
        </div>
      </div>

      {/* Table Daftar Tes */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5"
                  />
                </th>
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
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                    Tidak ada jadwal tes yang sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((u) => {
                  const mapelObj = u.mataPelajaran || u.bankSoal
                  const isArchived = u.status === 'NONAKTIF'
                  const isSelected = selectedIds.includes(u.id)

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      } ${isArchived ? 'opacity-80 bg-slate-50/30 dark:bg-slate-900/30' : ''}`}
                    >
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(u.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {u.kodeUjian}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{u.judul}</span>
                          {isArchived && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-semibold">
                              (Arsip)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300">
                        <div>{mapelObj?.nama || '-'}</div>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {u.maxSoal ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                              Kuota: {u.minSoal && u.minSoal !== u.maxSoal ? `${u.minSoal}-${u.maxSoal}` : u.maxSoal} Soal
                            </span>
                          ) : null}
                          {u.minJawaban ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                              Min: {u.minJawaban} Jwb
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {u.durasiMenit} Menit
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(u.waktuMulai).toLocaleDateString('id-ID', { dateStyle: 'medium' })}{' '}
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                              {new Date(u.waktuMulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
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
                          {isArchived ? 'Diarsipkan (Nonaktif)' : u.status}
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
                            title={isArchived ? 'Aktifkan Kembali Tes' : 'Arsipkan Tes'}
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

        {/* Table Bottom Pagination & Bulk Actions */}
        <div className="p-3 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-40"
            >
              Hapus ({selectedIds.length}) Terpilih
            </button>

            <button
              type="button"
              onClick={handleBulkArchive}
              disabled={selectedIds.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-40 flex items-center gap-1"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Arsipkan ({selectedIds.length}) Terpilih</span>
            </button>

            <button
              type="button"
              onClick={handleBulkUnarchive}
              disabled={selectedIds.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-40 flex items-center gap-1"
            >
              <ArchiveRestore className="w-3.5 h-3.5" />
              <span>Aktifkan ({selectedIds.length}) Terpilih</span>
            </button>

            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
            >
              {selectedIds.length === filtered.length && filtered.length > 0
                ? 'Batal Pilih Semua'
                : 'Pilih Semua'}
            </button>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 text-xs">
              Menampilkan {paginatedList.length} dari {filtered.length} tes (Halaman {currentPage} / {totalPages})
            </span>

            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value={10}>10 / hal</option>
              <option value={25}>25 / hal</option>
              <option value={50}>50 / hal</option>
              <option value={100}>100 / hal</option>
              <option value={999}>Semua</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edit Tes */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Edit Pengaturan Tes Ujian
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        {bs.nama}
                      </option>
                    ))}
                  </select>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Durasi (Menit) *
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
                    Waktu Mulai *
                  </label>
                  <input
                    type="datetime-local"
                    step="60"
                    required
                    value={editForm.waktuMulai}
                    onChange={(e) => setEditForm({ ...editForm, waktuMulai: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Waktu Selesai *
                  </label>
                  <input
                    type="datetime-local"
                    step="60"
                    required
                    value={editForm.waktuSelesai}
                    onChange={(e) => setEditForm({ ...editForm, waktuSelesai: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Kuota Butir Soal per Siswa & Kunci Minimal Jawaban */}
              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-blue-950 dark:text-blue-300">
                    Distribusi, Kuota Butir Soal & Kunci Minimal Jawaban (Opsional)
                  </label>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-100/70 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                    Fisher-Yates (Knuth) Shuffle
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Minimal Soal Ditampilkan
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.minSoal}
                      onChange={(e) => setEditForm({ ...editForm, minSoal: e.target.value })}
                      placeholder="Contoh: 30 (Kosongkan jika semua)"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Maksimal Soal Ditampilkan
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.maxSoal}
                      onChange={(e) => setEditForm({ ...editForm, maxSoal: e.target.value })}
                      placeholder="Contoh: 30 (Kosongkan jika semua)"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Minimal Jawaban Siswa</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">(Wajib)</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.minJawaban}
                      onChange={(e) => setEditForm({ ...editForm, minJawaban: e.target.value })}
                      placeholder="Contoh: 25 (Batas submit)"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  💡 <em>Jika <strong>Minimal Jawaban Siswa</strong> diisi (misal: 25), siswa yang menjawab kurang dari 25 butir soal tidak dapat menyelesaikan/mengumpulkan ujian hingga kuota minimal terpenuhi.</em>
                </p>
              </div>

              {/* Opsi Pengerjaan & Keamanan Anti-Cheat */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Opsi Pengerjaan & Keamanan Anti-Cheat:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={editForm.acakSoal}
                      onChange={(e) => setEditForm({ ...editForm, acakSoal: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Acak Butir Soal</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={editForm.acakOpsi}
                      onChange={(e) => setEditForm({ ...editForm, acakOpsi: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Acak Opsi Pilihan</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={editForm.lockBrowser}
                      onChange={(e) => setEditForm({ ...editForm, lockBrowser: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Lockdown Browser</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={editForm.tampilkanHasil}
                      onChange={(e) => setEditForm({ ...editForm, tampilkanHasil: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Tampilkan Nilai ke Siswa</span>
                  </label>
                </div>
              </div>

              {/* Pemilihan Group / Kelas Peserta */}
              {kelasList && kelasList.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Group / Kelas yang Mengikuti ({editForm.kelasIds.length} Dipilih)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (editForm.kelasIds.length === kelasList.length) {
                          setEditForm({ ...editForm, kelasIds: [] })
                        } else {
                          setEditForm({ ...editForm, kelasIds: kelasList.map((k) => k.id) })
                        }
                      }}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {editForm.kelasIds.length === kelasList.length ? 'Batalkan Semua' : 'Pilih Semua Group'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 custom-scrollbar">
                    {kelasList.map((k) => {
                      const isSelected = editForm.kelasIds.includes(k.id)
                      return (
                        <label
                          key={k.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                            isSelected
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 text-blue-900 dark:text-blue-200 font-bold'
                              : 'border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setEditForm({
                                  ...editForm,
                                  kelasIds: editForm.kelasIds.filter((id: string) => id !== k.id),
                                })
                              } else {
                                setEditForm({
                                  ...editForm,
                                  kelasIds: [...editForm.kelasIds, k.id],
                                })
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className="truncate">{k.nama}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
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
