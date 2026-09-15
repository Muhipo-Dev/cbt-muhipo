'use client'

import React, { useState, useEffect } from 'react'
import { Home, ChevronRight, Download, Upload, FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'

interface ModulImportViewProps {
  mapelList?: any[]
  bankSoalList?: any[] // Alias kompatibilitas
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
}

export function ModulImportView({
  mapelList,
  bankSoalList,
  onRefresh,
  showNotification,
}: ModulImportViewProps) {
  const items = mapelList && mapelList.length > 0 ? mapelList : bankSoalList || []
  const [selectedMapelId, setSelectedMapelId] = useState(items[0]?.id || '')
  const [parsedItems, setParsedItems] = useState<any[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!selectedMapelId && items.length > 0) {
      setSelectedMapelId(items[0].id)
    }
  }, [items, selectedMapelId])

  // Unduh Template Excel Soal Resmi (Semua Tipe: Q, Q2, Q3, Q4, Q5, Q6)
  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const ws = workbook.addWorksheet('Template_Soal_CBT', {
        views: [{ showGridLines: true }],
      })

      ws.columns = [
        { key: 'col1', width: 6 },   // No.
        { key: 'col2', width: 22 },  // Keterangan
        { key: 'col3', width: 10 },  // Tipe
        { key: 'col4', width: 64 },  // Isi Soal / Jawaban
        { key: 'col5', width: 22 },  // Status Jawaban
        { key: 'col6', width: 14 },  // Kesulitan / Bobot
      ]

      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      }

      const tableBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FF374151' } },
        left: { style: 'thin', color: { argb: 'FF374151' } },
        bottom: { style: 'thin', color: { argb: 'FF374151' } },
        right: { style: 'thin', color: { argb: 'FF374151' } },
      }

      // Baris 1: Judul Utama
      ws.mergeCells('A1:F1')
      const titleCell = ws.getCell('A1')
      titleCell.value = 'FORM EXCEL SOAL CBT (SEMUA TIPE)'
      titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF337AB7' },
      }
      ws.getRow(1).height = 28

      // Baris 2: Sub-judul / Keterangan Tipe
      ws.mergeCells('A2:F2')
      const subCell = ws.getCell('A2')
      subCell.value = 'Tipe: Q (Pilihan Ganda), Q2 (Esai), Q3 (Jawaban Singkat), Q4 (PG Kompleks), Q5 (Benar/Salah), Q6 (Menjodohkan)'
      subCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } }
      subCell.alignment = { horizontal: 'center', vertical: 'middle' }
      subCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E7FF' },
      }
      ws.getRow(2).height = 22

      // Baris 3 & 4 kosong
      ws.getRow(3).height = 14
      ws.getRow(4).height = 14

      // Baris 5: Table Header
      const headerRow = ws.getRow(5)
      headerRow.values = ['No.', 'Keterangan', 'Tipe', 'Isi Soal / Jawaban', 'Status Jawaban', 'Kesulitan']
      headerRow.height = 26
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.alignment = { horizontal: colNumber === 4 ? 'left' : 'center', vertical: 'middle' }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' },
        }
        cell.border = tableBorder
      })

      // Data Baris Soal & Jawaban
      const rowsData = [
        { row: [1, 'Soal Pilihan Ganda', 'Q', 'Ibu kota negara Republik Indonesia adalah...', '', 1], bg: 'FFE0E7FF', isBold: true },
        { row: ['', 'Jawaban Benar', 'A', 'Jakarta', 1, ''], bg: 'FFDCFCE7', isBold: false },
        { row: ['', '', 'A', 'Surabaya', 0, ''], bg: 'FFFFFFFF', isBold: false },
        { row: ['', '', 'A', 'Bandung', 0, ''], bg: 'FFFFFFFF', isBold: false },
        { row: ['', '', 'A', 'Yogyakarta', 0, ''], bg: 'FFFFFFFF', isBold: false },
        { row: [2, 'Soal Esai', 'Q2', 'Jelaskan pengertian Pancasila sebagai dasar falsafah negara Indonesia!', '', 2], bg: 'FFE0F2FE', isBold: true },
        { row: [3, 'Jawaban Singkat', 'Q3', 'Sebutkan 3 pulau terbesar di Indonesia!', '', 1], bg: 'FFFEF3C7', isBold: true },
        { row: [4, 'Soal PG Kompleks', 'Q4', 'Manakah yang termasuk organ pernapasan pada manusia?', '', 2], bg: 'FFFCE7F3', isBold: true },
        { row: ['', 'Jawaban Benar', 'A', 'Hidung', 1, ''], bg: 'FFDCFCE7', isBold: false },
        { row: ['', '', 'A', 'Lambung', 0, ''], bg: 'FFFFFFFF', isBold: false },
        { row: ['', 'Jawaban Benar', 'A', 'Paru-paru', 1, ''], bg: 'FFDCFCE7', isBold: false },
        { row: [5, 'Soal Benar/Salah', 'Q5', 'Fotosintesis pada tumbuhan hijau terjadi di dalam kloroplas', '', 1], bg: 'FFFFE4E6', isBold: true },
        { row: ['', 'Pernyataan BENAR', 'A', 'Benar', 1, ''], bg: 'FFDCFCE7', isBold: false },
        { row: [6, 'Soal Menjodohkan', 'Q6', 'Pasangkan nama negara dengan ibu kotanya yang tepat!', '', 2], bg: 'FFF3E8FF', isBold: true },
        { row: ['', 'Premis -> Respons', 'A', 'Indonesia', 'Jakarta', ''], bg: 'FFFFFFFF', isBold: false },
        { row: ['', 'Premis -> Respons', 'A', 'Malaysia', 'Kuala Lumpur', ''], bg: 'FFFFFFFF', isBold: false },
      ]

      rowsData.forEach((item, idx) => {
        const rowIdx = 6 + idx
        const row = ws.getRow(rowIdx)
        row.values = item.row
        row.height = 20

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { name: 'Calibri', size: 10, bold: item.isBold }
          cell.alignment = {
            horizontal: colNumber === 4 ? 'left' : (colNumber === 2 ? 'left' : 'center'),
            vertical: 'middle',
          }
          if (item.bg !== 'FFFFFFFF') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: item.bg },
            }
          }
          cell.border = thinBorder
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Form_Excel_Soal_Baru_Semua_Tipe.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)

      showNotification('Berhasil', 'Template format Excel soal berhasil diunduh.', 'success')
    } catch (err: any) {
      showNotification('Error', 'Gagal membuat template Excel: ' + err.message, 'error')
    }
  }

  // Handle File Upload & Parse
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

        let headerRowIndex = 0
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:F50')
        for (let r = range.s.r; r <= Math.min(range.e.r, 20); r++) {
          let foundHeader = false
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r, c })]
            const val = cell ? String(cell.v).toLowerCase().trim() : ''
            if (val === 'tipe' || val === 'isi soal / jawaban' || val === 'keterangan' || val === 'pertanyaan') {
              foundHeader = true
              break
            }
          }
          if (foundHeader) {
            headerRowIndex = r
            break
          }
        }

        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' })

        if (!rawRows || rawRows.length === 0) {
          showNotification('Peringatan', 'File Excel kosong atau format tidak sesuai.', 'warning')
          return
        }

        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        const itemsList: any[] = []
        let currentSoal: any = null

        const hasTipeColumn = rawRows.some(
          (r) => r['Tipe'] !== undefined || r['TIPE'] !== undefined || r['tipe'] !== undefined || r['Type'] !== undefined
        )

        if (hasTipeColumn) {
          for (const row of rawRows) {
            const rawTipe = String(row['Tipe'] || row['TIPE'] || row['tipe'] || row['Type'] || '').trim().toUpperCase()
            const rawContent = String(row['Isi Soal / Jawaban'] || row['Isi Soal'] || row['Pertanyaan / Soal'] || row['Soal'] || row['Konten'] || '').trim()
            const rawStatus = row['Status Jawaban'] !== undefined ? row['Status Jawaban'] : row['Status']
            const rawBobot = row['Kesulitan'] !== undefined && row['Kesulitan'] !== '' ? Number(row['Kesulitan']) : (row['Bobot'] ? Number(row['Bobot']) : null)

            if (rawTipe.startsWith('Q')) {
              if (currentSoal && currentSoal.pertanyaan) {
                itemsList.push(currentSoal)
              }

              let dbTipe = 'PG'
              if (rawTipe === 'Q' || rawTipe === 'Q1') dbTipe = 'PG'
              else if (rawTipe === 'Q2') dbTipe = 'ESAI'
              else if (rawTipe === 'Q3') dbTipe = 'ISIAN'
              else if (rawTipe === 'Q4') dbTipe = 'PG_KOMPLEKS'
              else if (rawTipe === 'Q5') dbTipe = 'BENAR_SALAH'
              else if (rawTipe === 'Q6') dbTipe = 'MENJODOHKAN'

              currentSoal = {
                nomor: itemsList.length + 1,
                tipeSoal: dbTipe,
                pertanyaan: rawContent,
                bobot: rawBobot && rawBobot > 0 ? rawBobot : (dbTipe === 'ESAI' ? 3.0 : dbTipe === 'ISIAN' ? 2.0 : 1.0),
                opsi: [],
                rawMatchingPairs: [],
                matchingData: undefined,
                kunciJawabanTeks: undefined,
              }

              if (rawStatus && String(rawStatus).trim()) {
                currentSoal.kunciJawabanTeks = String(rawStatus).trim()
              }
            } else if (rawTipe === 'A' && currentSoal) {
              if (currentSoal.tipeSoal === 'MENJODOHKAN') {
                const left = rawContent
                const right = String(rawStatus || '').trim()
                if (left && right) {
                  currentSoal.rawMatchingPairs.push({ left, right })
                }
              } else if (currentSoal.tipeSoal === 'BENAR_SALAH') {
                const isBenar = String(rawStatus).trim() === '1' || String(rawStatus).toLowerCase() === 'benar' || String(rawStatus).toLowerCase() === 'true'
                const label = letters[currentSoal.opsi.length] || `Opsi ${currentSoal.opsi.length + 1}`
                if (rawContent) {
                  currentSoal.opsi.push({
                    label,
                    konten: rawContent,
                    isBenar,
                  })
                }
              } else if (currentSoal.tipeSoal === 'ISIAN' || currentSoal.tipeSoal === 'ESAI') {
                if (rawContent && !currentSoal.kunciJawabanTeks) {
                  currentSoal.kunciJawabanTeks = rawContent
                }
              } else {
                const isBenar = String(rawStatus).trim() === '1' || String(rawStatus).toLowerCase() === 'true'
                const label = letters[currentSoal.opsi.length] || `Opsi ${currentSoal.opsi.length + 1}`
                if (rawContent) {
                  currentSoal.opsi.push({
                    label,
                    konten: rawContent,
                    isBenar,
                  })
                }
              }
            }
          }

          if (currentSoal && currentSoal.pertanyaan) {
            itemsList.push(currentSoal)
          }

          for (const item of itemsList) {
            if (item.tipeSoal === 'MENJODOHKAN' && item.rawMatchingPairs && item.rawMatchingPairs.length > 0) {
              item.matchingData = JSON.stringify(item.rawMatchingPairs)
            }
            delete item.rawMatchingPairs
          }
        } else {
          for (const row of rawRows) {
            const tipe = (row['Tipe Soal'] || 'PG').toUpperCase()
            const pertanyaan = row['Pertanyaan / Soal'] || row['Pertanyaan'] || row['Soal'] || ''
            const bobot = Number(row['Bobot'] || row['Kesulitan']) || 1.0
            const kunci = String(row['Kunci Jawaban (A/B/C/D/E)'] || row['Kunci'] || '').trim().toUpperCase()

            const opsi = ['A', 'B', 'C', 'D', 'E']
              .map((lbl) => ({
                label: lbl,
                konten: row[`Pilihan ${lbl}`] || row[`Opsi ${lbl}`] || row[lbl] || '',
                isBenar: kunci === lbl,
              }))
              .filter((o) => o.konten.trim() !== '')

            if (pertanyaan.trim()) {
              itemsList.push({
                nomor: itemsList.length + 1,
                tipeSoal: tipe,
                pertanyaan,
                bobot,
                opsi,
                kunciJawabanTeks: row['Kunci Isian / Rubrik'] || null,
              })
            }
          }
        }

        if (itemsList.length === 0) {
          showNotification('Peringatan', 'Tidak ada butir soal yang valid ditemukan di dalam file Excel.', 'warning')
          return
        }

        setParsedItems(itemsList)
        showNotification('Berhasil', `Berhasil membaca ${itemsList.length} butir soal dari file Excel!`, 'success')
      } catch (err: any) {
        showNotification('Error', 'Gagal memproses file Excel: ' + err.message, 'error')
      }
    }

    reader.readAsArrayBuffer(file)
  }

  // Handle Submit Import
  const handleSubmitImport = async () => {
    if (!selectedMapelId) {
      showNotification('Peringatan', 'Pilih Topik tujuan terlebih dahulu', 'warning')
      return
    }
    if (parsedItems.length === 0) {
      showNotification('Peringatan', 'Silakan pilih dan upload file Excel soal terlebih dahulu', 'warning')
      return
    }

    try {
      setImporting(true)
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'IMPORT_SOAL',
          mataPelajaranId: selectedMapelId,
          soalItems: parsedItems,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Berhasil', json.message || `Berhasil mengimport ${parsedItems.length} butir soal!`, 'success')
        setParsedItems([])
        setFileName('')
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal mengimport soal', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal import: ' + err.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="w-full space-y-4 font-sans text-slate-800 dark:text-slate-100">
      {/* 1. Header Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-slate-900 dark:text-white flex items-center gap-2">
            Mengimport Soal
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
              Melakukan Import Soal berdasarkan modul dan topik
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>Home</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">Import Soal</span>
        </div>
      </div>

      {/* 2. Grid Layout: Left Panel (Pilih Topik) & Right Panel (Import Soal) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Card: Pilih Topik */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Pilih Topik</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Pilih Topik
              </label>
              <select
                value={selectedMapelId}
                onChange={(e) => setSelectedMapelId(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
              >
                {items.length === 0 && <option value="">(Belum ada topik)</option>}
                {items.map((bs) => {
                  const soalCount = bs._count?.soalList ?? bs.soalList?.length ?? 0
                  return (
                    <option key={bs.id} value={bs.id}>
                      {bs.kode || bs.kodeBank || 'Default'} - {bs.nama} [{soalCount}]
                    </option>
                  )
                })}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Pilih terlebih dahulu Topik yang akan digunakan sebelum melakukan import soal
            </p>
          </div>
        </div>

        {/* Right Card: Import Soal */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Import Soal</h2>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Form Excel Soal Baru (Semua Tipe)</span>
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* File Chooser */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Pilih File
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                />
              </div>
            </div>

            {/* Explanatory Texts */}
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-white/10 pt-3">
              <p>
                Soal yang dapat diimport: Tipe Pilihan Ganda (Q), Esai (Q2), Jawaban Singkat (Q3), PG Kompleks (Q4), Benar/Salah (Q5), dan Menjodohkan (Q6). Tidak dapat melakukan import soal yang terdapat gambar atau audio.
              </p>

              <div className="space-y-1 pt-1">
                <p className="font-bold text-slate-700 dark:text-slate-300">Format Status Jawaban:</p>
                <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                  <li>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Pilihan Ganda (Q) &amp; PG Kompleks (Q4):</span> Isi 1 untuk jawaban benar, 0 untuk salah.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Esai (Q2) &amp; Jawaban Singkat (Q3):</span> Kolom Answer dikosongkan (tidak perlu pilihan jawaban).
                  </li>
                  <li>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Benar/Salah (Q5):</span> Isi 1 jika pernyataan (Answer) adalah Benar, 0 jika Salah.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Menjodohkan (Q6):</span> Kolom Answer diisi Premis, dan kolom Status Jawaban diisi dengan Pasangannya (Respons).
                  </li>
                </ul>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <p>File Excel yang didukung adalah Microsoft Excel 2003 dan Microsoft Excel 2007</p>
                <p>SAVE AS ke Office 2007 jika gagal mengupload data dalam format Office 2003</p>
              </div>
            </div>

            {/* Parsed Preview if available */}
            {parsedItems.length > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Siap mengimport <strong>{parsedItems.length}</strong> butir soal ({fileName})
                  </span>
                </div>
              </div>
            )}

            {/* Bottom Button */}
            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                disabled={importing || parsedItems.length === 0}
                onClick={handleSubmitImport}
                className="px-6 py-2 rounded bg-[#337ab7] hover:bg-[#286090] text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{importing ? 'Mengimport...' : 'Import'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
