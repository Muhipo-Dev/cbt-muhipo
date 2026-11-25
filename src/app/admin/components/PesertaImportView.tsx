'use client'

import React, { useState, useMemo } from 'react'
import {
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Users,
  Sparkles,
  GraduationCap,
  RefreshCw,
  Copy,
  Layers,
  ArrowRight,
} from 'lucide-react'
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'

interface PesertaImportViewProps {
  siswaList?: any[]
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
}

export function PesertaImportView({
  siswaList = [],
  onRefresh,
  showNotification,
}: PesertaImportViewProps) {
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [mergeMode, setMergeMode] = useState<'REPLACE_MERGE' | 'SKIP_DUPLICATE'>('REPLACE_MERGE')

  // Set username yang sudah terdaftar di database untuk lookup cepat
  const existingUsernameSet = useMemo(() => {
    const s = new Set<string>()
    for (const user of siswaList) {
      if (user.username) s.add(user.username.trim().toLowerCase())
    }
    return s
  }, [siswaList])

  // Analisis deteksi duplikasi pada baris yang di-upload
  const duplicateAnalysis = useMemo(() => {
    const fileSeen = new Map<string, number>()
    let fileDuplicates = 0
    let dbDuplicates = 0

    // Tandai status duplikasi per baris:
    // 'BARU' -> belum ada di DB dan baris pertama di file
    // 'DUPLIKAT_INTERNAL' -> muncul berulang di file Excel yang sama (akan di-merge ke data paling akhir)
    // 'DUPLIKAT_DB' -> sudah terdaftar di database sistem
    const analyzed = parsedRows.map((item, idx) => {
      const u = item.username?.toLowerCase() || ''
      const isExistInDb = existingUsernameSet.has(u)

      let duplicateType: 'BARU' | 'DUPLIKAT_INTERNAL' | 'DUPLIKAT_DB' = 'BARU'

      if (fileSeen.has(u)) {
        duplicateType = 'DUPLIKAT_INTERNAL'
        fileDuplicates++
      } else if (isExistInDb) {
        duplicateType = 'DUPLIKAT_DB'
        dbDuplicates++
      }

      fileSeen.set(u, idx)
      return {
        ...item,
        duplicateType,
        isExistInDb,
      }
    })

    return {
      analyzedRows: analyzed,
      fileDuplicates,
      dbDuplicates,
      totalDuplicates: fileDuplicates + dbDuplicates,
    }
  }, [parsedRows, existingUsernameSet])

  // Download Excel Template Peserta Sesuai Format Resmi
  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('DATA_PESERTA_CBT')

      worksheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Username', key: 'username', width: 24 },
        { header: 'Password', key: 'password', width: 20 },
        { header: 'Nama Lengkap', key: 'nama', width: 32 },
        { header: 'Kelas', key: 'kelas', width: 18 },
        { header: 'Group', key: 'group', width: 26 },
      ]

      // Header Styling
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' },
      }

      // Baris Contoh Sesuai Format
      worksheet.addRow({
        no: 1,
        username: 'username',
        password: 'password',
        nama: 'nama lengkap siswa',
        kelas: 'X (atau X-MIPA 1)',
        group: 'group yang sudah dibuat',
      })

      worksheet.addRow({
        no: 2,
        username: '20261001',
        password: 'password123',
        nama: 'Ahmad Faiz Al-Farisi',
        kelas: 'X-MIPA 1',
        group: 'X-MIPA 1',
      })

      worksheet.addRow({
        no: 3,
        username: '20261002',
        password: '123456',
        nama: 'Nur Aisyah Rahmawati',
        kelas: 'XI-MIPA 2',
        group: 'XI-MIPA 2',
      })

      worksheet.addRow({
        no: 4,
        username: '20261003',
        password: '123456',
        nama: 'Muhammad Rizki Pratama',
        kelas: 'XII-IPS 1',
        group: 'XII-IPS 1',
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Format_Import_Peserta_CBT.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)

      showNotification('Berhasil', 'Template format Excel data peserta (No, Username, Password, Nama Lengkap, Kelas, Group) berhasil diunduh.', 'success')
    } catch (err: any) {
      showNotification('Error', 'Gagal membuat template: ' + err.message, 'error')
    }
  }

  // Helper pembersih & normalisasi teks aman untuk impor peserta
  // Mempertahankan semua simbol nama asli (apostrof/petik ', backtick, hyphen -, titik, kurung, dsb)
  // serta menangani karakter kutip Excel di awal/akhir baris tanpa membuang data.
  const cleanImportString = (val: any, options?: { isUsername?: boolean; isPassword?: boolean; fallback?: string }): string => {
    if (val === undefined || val === null) return options?.fallback || ''
    let str = String(val)
    
    // Normalisasi unicode whitespace (non-breaking space, zero-width space, dll)
    str = str.replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, ' ')
    // Hapus zero-width control chars
    str = str.replace(/[\u200B-\u200D]/g, '')
    
    // Jangan trim password jika itu karakter rahasia, tapi trim spasi eksternal
    if (!options?.isPassword) {
      str = str.trim()
    }

    if (options?.isUsername) {
      // Pada Excel, kolom angka sering diawali tanda petik satu seperti '20261001 atau '00123 agar terbaca teks.
      // Kita bersihkan tanda kutip pembungkus terluar saja, namun tetap izinkan simbol di dalam username jika ada.
      str = str.replace(/^['"`]+|['"`]+$/g, '').trim()
      return str || (options?.fallback || '')
    }

    // Untuk Nama / Kelas / Group:
    // Normalisasi variasi curly quote (\u2018 ‘, \u2019 ’, \u201B ‛, \u0060 `) ke petik standar lurus '
    // agar pencarian & pencocokan nama (misal Ma'ruf, Syafi'i, O'Connor) selalu konsisten dan tidak error.
    str = str.replace(/[\u2018\u2019\u201B\u0060]/g, "'")
    // Normalisasi variasi double quotes curly (\u201C “, \u201D ”) ke tanda kutip lurus "
    str = str.replace(/[\u201C\u201D]/g, '"')

    // Bersihkan multiple spaces berlebih di dalam nama/teks
    str = str.replace(/ {2,}/g, ' ').trim()

    return str || (options?.fallback || '')
  }

  // Handle Excel Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (rawJson.length <= 1) {
          showNotification('Peringatan', 'File Excel kosong atau tidak memiliki baris data.', 'warning')
          return
        }

        const items: any[] = []
        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i]
          if (!row || (row[1] === undefined && row[0] === undefined)) continue

          // Handle format [No, Username, Password, Nama Lengkap, Kelas, Group]
          const username = cleanImportString(row[1] !== undefined ? row[1] : row[0], { isUsername: true })
          if (!username || username.toLowerCase() === 'username') {
            // Check if this is the example row or header repeat
            if (username.toLowerCase() === 'username' && String(row[3] || '').toLowerCase().includes('nama lengkap')) {
              // skip template placeholder row if detected
              continue
            }
          }

          const rawPwd = row[2] !== undefined ? row[2] : '123456'
          const password = cleanImportString(rawPwd, { isPassword: true, fallback: '123456' })
          const nama = cleanImportString(row[3], { fallback: 'Peserta ' + i })
          const kelas = cleanImportString(row[4], { fallback: 'X' })
          const group = cleanImportString(row[5] || row[4], { fallback: 'Umum' })

          // Tetap masukkan semua data peserta meski memiliki karakter/simbol petik (') atau tanda baca
          if (username) {
            items.push({
              username,
              password,
              name: nama,
              nomorPeserta: username,
              kelas: kelas || group,
              group: group || kelas,
              ruang: 'Ruang 1',
              sesi: 1,
              gender: 'L',
            })
          }
        }

        setParsedRows(items)
        showNotification(
          'File Terbaca',
          `Berhasil membaca ${items.length} calon peserta dari file Excel (termasuk karakter khusus & tanda petik dipertahankan dengan aman). Silakan tentukan opsi merger lalu klik "Mulai Import".`,
          'success'
        )
      } catch (err: any) {
        showNotification('Error', 'Gagal membaca file Excel: ' + err.message, 'error')
      }
    }

    reader.readAsArrayBuffer(file)
  }

  // Eksekusi Import Peserta ke Database CBT
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      showNotification('Peringatan', 'Belum ada baris peserta yang siap diimport.', 'warning')
      return
    }

    try {
      setImporting(true)
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'IMPORT_PESERTA_EXCEL',
          rows: parsedRows,
          mergeMode,
        }),
      })

      const json = await res.json()
      if (json.success) {
        showNotification('Import Sukses', json.message || 'Data peserta berhasil diimport ke CBT!', 'success')
        setParsedRows([])
        setFileName('')
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal mengimport data peserta.', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal import: ' + err.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header & Download Template Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-blue-900/40 border border-blue-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="space-y-1">
          <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            <span>Import Data Peserta Ujian dari Excel</span>
          </h2>
          <p className="text-xs text-slate-300">
            Daftarkan akun peserta dengan 6 kolom standar: <strong className="text-white">No</strong>, <strong className="text-white">Username</strong>, <strong className="text-white">Password</strong>, <strong className="text-white">Nama Lengkap</strong>, <strong className="text-white">Kelas</strong>, dan <strong className="text-white">Group</strong>. Dilengkapi sistem deteksi duplikasi pintar & opsi penggabungan (merge/replace data terbaru).
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Unduh Format Template (6 Kolom)</span>
        </button>
      </div>

      {/* File Upload & Opsi Merger Duplikasi Box */}
      <div className="bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xs backdrop-blur-xl space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Pilih File Excel Data Siswa (.xlsx / .xls) *
          </label>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
          />
        </div>

        {/* Opsi Pengaturan Duplikasi & Merger Replace */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-white/10 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Layers className="w-4 h-4 text-blue-500" />
            <span>Pengaturan Duplikasi Pengguna (Duplicate Handling Mode):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label
              className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition text-xs ${
                mergeMode === 'REPLACE_MERGE'
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500/60 text-blue-900 dark:text-blue-100 font-bold shadow-2xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-white/5 text-slate-700 dark:text-slate-400 hover:bg-slate-100/50'
              }`}
            >
              <input
                type="radio"
                name="mergeMode"
                value="REPLACE_MERGE"
                checked={mergeMode === 'REPLACE_MERGE'}
                onChange={() => setMergeMode('REPLACE_MERGE')}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div className="space-y-0.5">
                <span className="block font-bold">
                  🔄 Timpa & Ambil Data Terbaru (Merge & Replace) - Rekomendasi
                </span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block leading-tight">
                  Jika username peserta sudah terdaftar di database atau berulang dalam file, sistem otomatis memperbarui profil (nama, kelas, password, group) dengan data terbaru.
                </span>
              </div>
            </label>

            <label
              className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition text-xs ${
                mergeMode === 'SKIP_DUPLICATE'
                  ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500/60 text-amber-900 dark:text-amber-100 font-bold shadow-2xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-white/5 text-slate-700 dark:text-slate-400 hover:bg-slate-100/50'
              }`}
            >
              <input
                type="radio"
                name="mergeMode"
                value="SKIP_DUPLICATE"
                checked={mergeMode === 'SKIP_DUPLICATE'}
                onChange={() => setMergeMode('SKIP_DUPLICATE')}
                className="mt-0.5 text-amber-600 focus:ring-amber-500"
              />
              <div className="space-y-0.5">
                <span className="block font-bold">
                  ⏭️ Lewati Duplikasi (Skip Duplicates)
                </span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block leading-tight">
                  Abaikan username yang sudah ada di sistem dan hanya daftarkan baris yang benar-benar baru.
                </span>
              </div>
            </label>
          </div>
        </div>

        {fileName && (
          <div className="space-y-3">
            {/* Banner Status Deteksi Duplikasi */}
            <div className="p-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>File: <strong className="text-blue-600 dark:text-blue-400">{fileName}</strong> ({parsedRows.length} total baris peserta)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
                    Baru: {parsedRows.length - duplicateAnalysis.totalDuplicates}
                  </span>
                  {duplicateAnalysis.dbDuplicates > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      Duplikat Database: {duplicateAnalysis.dbDuplicates}
                    </span>
                  )}
                  {duplicateAnalysis.fileDuplicates > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
                      <Copy className="w-3 h-3 text-purple-500" />
                      Duplikat Internal File: {duplicateAnalysis.fileDuplicates}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing || parsedRows.length === 0}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 self-stretch sm:self-auto"
              >
                <Upload className={`w-3.5 h-3.5 ${importing ? 'animate-bounce' : ''}`} />
                <span>{importing ? 'Memproses Import...' : `Mulai Import (${mergeMode === 'REPLACE_MERGE' ? 'Merge & Replace' : 'Skip Duplikat'})`}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Table dengan Indikator Status Duplikasi */}
      {parsedRows.length > 0 && (
        <div className="bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 rounded-xl sm:rounded-2xl overflow-hidden shadow-xs backdrop-blur-xl space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/5 pb-2.5">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Pratinjau Calon Peserta & Status Duplikasi ({parsedRows.length} Siswa)</span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Mode Aktif: <strong className="text-blue-600 dark:text-blue-400">{mergeMode === 'REPLACE_MERGE' ? 'Timpa / Merge Data Terbaru' : 'Lewati Duplikat'}</strong>
            </span>
          </div>

          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 font-bold text-[11px] uppercase tracking-wider sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Status Deteksi</th>
                  <th className="py-2.5 px-3">Password</th>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">Group</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                {duplicateAnalysis.analyzedRows.map((item, idx) => {
                  const isDuplikatDb = item.duplicateType === 'DUPLIKAT_DB'
                  const isDuplikatFile = item.duplicateType === 'DUPLIKAT_INTERNAL'

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        isDuplikatFile
                          ? 'bg-purple-50/40 dark:bg-purple-950/20'
                          : isDuplikatDb
                          ? 'bg-amber-50/40 dark:bg-amber-950/20'
                          : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-slate-400 text-center">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {item.username}
                      </td>
                      <td className="py-2 px-3">
                        {isDuplikatFile ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                            <Copy className="w-2.5 h-2.5" />
                            Duplikat File (Ambil Terbaru)
                          </span>
                        ) : isDuplikatDb ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {mergeMode === 'REPLACE_MERGE' ? 'Ada di DB (Akan Dimutakhirkan)' : 'Ada di DB (Dilewati)'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Peserta Baru
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500">
                        {item.password}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">
                        {item.kelas}
                      </td>
                      <td className="py-2 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.group}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

