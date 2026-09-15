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
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface BackupDataViewProps {
  stats: any
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
  showConfirm: (title: string, message: string, onConfirm: () => void, type?: any) => void
}

export function BackupDataView({
  stats,
  onRefresh,
  showNotification,
  showConfirm,
}: BackupDataViewProps) {
  const [downloadingJson, setDownloadingJson] = useState(false)
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

  // 1. Download Database Backup JSON
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
      a.download = `CBT_MUHIPO_BACKUP_${dateStr}.json`
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

  // 2. Ekspor Semua Rekap Nilai ke Excel
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

  // 3. Ekspor Data Peserta ke Excel
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

  // 4. Handle File JSON Restore Selection
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

  // 5. Execute Restore
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

  // 6. Maintenance / Wipe Actions
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
              <span>Backup, Ekspor & Pemeliharaan Data</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20">
                Sistem CBT
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola cadangan basis data lengkap, ekspor nilai & peserta ke format Excel, serta fasilitas reset/pembersihan data berkala.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sinkronkan Statistik</span>
        </button>
      </div>

      {/* 2. Area Ekspor & Cadangan Basis Data */}
      <div className="bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-sm dark:shadow-xl backdrop-blur-xl overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Ekspor & Unduh Cadangan Data (Backup)
            </h3>
          </div>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <span>{downloadingJson ? 'Menyiapkan File...' : 'Unduh Backup (.JSON)'}</span>
            </button>
          </div>

          {/* Card 2: Export All Nilai Excel */}
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

          {/* Card 3: Export Peserta Excel */}
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

      {/* 3. Area Restore / Pemulihan Data */}
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

      {/* 4. Area Pembersihan & Penghapusan Data (Maintenance) */}
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
