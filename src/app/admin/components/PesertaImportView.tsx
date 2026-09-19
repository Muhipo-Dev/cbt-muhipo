'use client'

import React, { useState } from 'react'
import { Download, Upload, CheckCircle2, AlertTriangle, Users, Sparkles, GraduationCap } from 'lucide-react'
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'

interface PesertaImportViewProps {
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
}

export function PesertaImportView({
  onRefresh,
  showNotification,
}: PesertaImportViewProps) {
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)

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
        { header: 'Kelas', key: 'kelas', width: 16 },
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
        kelas: 'X',
        group: 'group yang sudah dibuat',
      })

      worksheet.addRow({
        no: 2,
        username: '20261001',
        password: 'password123',
        nama: 'Ahmad Faiz Al-Farisi',
        kelas: 'X',
        group: 'X-MIPA 1',
      })

      worksheet.addRow({
        no: 3,
        username: '20261002',
        password: '123456',
        nama: 'Nur Aisyah Rahmawati',
        kelas: 'XI',
        group: 'XI-MIPA 2',
      })

      worksheet.addRow({
        no: 4,
        username: '20261003',
        password: '123456',
        nama: 'Muhammad Rizki Pratama',
        kelas: 'XII',
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
          if (!row || (!row[1] && !row[0])) continue

          // Handle format [No, Username, Password, Nama Lengkap, Kelas, Group]
          const username = String(row[1] || row[0] || '').trim()
          if (!username || username.toLowerCase() === 'username') {
            // Check if this is the example row or header repeat
            if (username.toLowerCase() === 'username' && String(row[3] || '').includes('nama lengkap')) {
              // skip template placeholder row if detected
              continue
            }
          }

          const password = String(row[2] || '123456').trim()
          const nama = String(row[3] || 'Peserta ' + i).trim()
          const kelas = String(row[4] || 'X').trim()
          const group = String(row[5] || row[4] || 'Umum').trim()

          items.push({
            username,
            password,
            name: nama,
            nomorPeserta: username,
            kelas,
            group,
            ruang: 'Ruang 1',
            sesi: 1,
            gender: 'L',
          })
        }

        setParsedRows(items)
        showNotification(
          'File Terbaca',
          `Berhasil membaca ${items.length} calon peserta dari file Excel. Silakan periksa pratinjau dan klik "Mulai Import".`,
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
    <div className="space-y-5">
      {/* Header & Download Template Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-blue-900/40 border border-blue-500/30 rounded-2xl p-5 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
            <span>Import Data Peserta Ujian dari Excel</span>
          </h2>
          <p className="text-xs text-slate-300">
            Daftarkan akun peserta dengan 6 kolom standar: <strong className="text-white">No</strong>, <strong className="text-white">Username</strong>, <strong className="text-white">Password</strong>, <strong className="text-white">Nama Lengkap</strong>, <strong className="text-white">Kelas</strong>, dan <strong className="text-white">Group</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Unduh Format Template (6 Kolom)</span>
        </button>
      </div>

      {/* File Upload Box */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-sm backdrop-blur-xl space-y-4">
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

        {fileName && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              File terpilih: {fileName} ({parsedRows.length} peserta terdeteksi)
            </span>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={importing || parsedRows.length === 0}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Upload className={`w-3.5 h-3.5 ${importing ? 'animate-bounce' : ''}`} />
              <span>{importing ? 'Memproses Import...' : 'Mulai Import Peserta Sekarang'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm backdrop-blur-xl space-y-3 p-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Pratinjau Data Calon Peserta ({parsedRows.length} Siswa)</span>
          </h3>

          <div className="overflow-x-auto max-h-[450px]">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 font-bold text-[11px] uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 w-12">No</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Password</th>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">Group</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                {parsedRows.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {item.username}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

