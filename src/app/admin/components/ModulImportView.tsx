'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Home, ChevronRight, Download, Upload, FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Eye, Sigma, BookOpen } from 'lucide-react'
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import { convertEquationToKatex, hasEquationOrFormula } from '@/lib/katexConverter'
import { MathRenderer } from '@/components/MathRenderer'

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
  const [equationConvertedCount, setEquationConvertedCount] = useState(0)
  const [showPreviewList, setShowPreviewList] = useState(true)

  useEffect(() => {
    if (!selectedMapelId && items.length > 0) {
      setSelectedMapelId(items[0].id)
    }
  }, [items, selectedMapelId])

  const selectedMapel = items.find((item: any) => item.id === selectedMapelId)
  const isArabicTopic = useMemo(() => {
    if (!selectedMapel) return false
    const nameStr = `${selectedMapel.nama || ''} ${selectedMapel.kode || ''} ${selectedMapel.deskripsi || ''} ${selectedMapel.namaModul || selectedMapel.modul?.nama || ''}`.toLowerCase()
    return nameStr.includes('arab') || nameStr.includes('arabic') || nameStr.includes('qur') || nameStr.includes('pai') || nameStr.includes('agama') || nameStr.includes('hijaiyah')
  }, [selectedMapel])

  const isJavaneseTopic = useMemo(() => {
    if (!selectedMapel) return false
    const nameStr = `${selectedMapel.nama || ''} ${selectedMapel.kode || ''} ${selectedMapel.deskripsi || ''} ${selectedMapel.namaModul || selectedMapel.modul?.nama || ''}`.toLowerCase()
    return nameStr.includes('jawa') || nameStr.includes('hanacaraka') || nameStr.includes('javanese')
  }, [selectedMapel])

  // Unduh Template Excel Soal Resmi (Otomatis menyesuaikan jika topik Bahasa Arab, Bahasa Jawa, atau Umum/Math)
  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const ws = workbook.addWorksheet('Template_Soal_CBT', {
        views: [{ showGridLines: true }],
      })

      ws.columns = [
        { key: 'col1', width: 8 },   // No.
        { key: 'col2', width: 26 },  // Keterangan
        { key: 'col3', width: 10 },  // Tipe
        { key: 'col4', width: 80 },  // Isi Soal / Jawaban
        { key: 'col5', width: 26 },  // Status Jawaban
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
      ws.mergeCells('A1:E1')
      const titleCell = ws.getCell('A1')
      titleCell.value = isArabicTopic
        ? 'TEMPLATE IMPORT SOAL CBT — KHUSUS BAHASA ARAB / PAI (OTOMATIS RTL & HARAKAT)'
        : isJavaneseTopic
        ? 'TEMPLATE IMPORT SOAL CBT — KHUSUS BAHASA JAWA (AKSARA JAWA & LATIN)'
        : 'TEMPLATE IMPORT SOAL CBT (MENDUKUNG RUMUS KATEX / BAHASA ARAB / AKSARA JAWA)'
      titleCell.font = { name: isArabicTopic ? 'Traditional Arabic' : 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isArabicTopic ? 'FF065F46' : isJavaneseTopic ? 'FF92400E' : 'FF4338CA' },
      }
      ws.getRow(1).height = 28

      // Baris 2: Sub-judul / Keterangan Tipe
      ws.mergeCells('A2:E2')
      const subCell = ws.getCell('A2')
      subCell.value = isArabicTopic
        ? 'Tipe: Q (Pilihan Ganda), Q2 (Esai), Q3 (Jawaban Singkat), Q4 (PG Kompleks), Q5 (Benar/Salah), Q6 (Menjodohkan). Teks Arab harakat & Al-Qur\'an didukung penuh.'
        : isJavaneseTopic
        ? 'Tipe: Q (Pilihan Ganda), Q2 (Esai), Q3 (Jawaban Singkat), Q4 (PG Kompleks), Q5 (Benar/Salah), Q6 (Menjodohkan). Aksara Jawa Unicode didukung penuh.'
        : 'Tipe: Q (Pilihan Ganda), Q2 (Esai), Q3 (Jawaban Singkat), Q4 (PG Kompleks), Q5 (Benar/Salah), Q6 (Menjodohkan). Rumus KaTeX, Arab, & Aksara Jawa otomatis dideteksi.'
      subCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E293B' } }
      subCell.alignment = { horizontal: 'center', vertical: 'middle' }
      subCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isArabicTopic ? 'FFD1FAE5' : isJavaneseTopic ? 'FFFEF3C7' : 'FFE0E7FF' },
      }
      ws.getRow(2).height = 22

      // Baris 3 & 4 kosong
      ws.getRow(3).height = 14
      ws.getRow(4).height = 14

      // Baris 5: Table Header
      const headerRow = ws.getRow(5)
      headerRow.values = ['No.', 'Keterangan', 'Tipe', 'Isi Soal / Jawaban', 'Status Jawaban']
      headerRow.height = 26
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.alignment = { horizontal: colNumber === 4 ? (isArabicTopic ? 'right' : 'left') : 'center', vertical: 'middle' }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' },
        }
        cell.border = tableBorder
      })

      // Data Baris Soal & Jawaban berdasarkan jenis topik
      const rowsData = isArabicTopic
        ? [
            // No 1: PG Bahasa Arab
            { row: [1, 'Soal Pilihan Ganda Arab', 'Q', 'مَا مَعْنَى كَلِمَةِ «مَدْرَسَةٌ» فِي اللُّغَةِ الإِنْدُوْنِيْسِيَّةِ؟', ''], bg: 'FFDCFCE7', isBold: true, isArabic: true },
            { row: ['', 'Jawaban Benar', 'A', 'Sekolah', 1], bg: 'FFDCFCE7', isBold: false },
            { row: ['', '', 'A', 'Rumah Sakit', 0], bg: 'FFFFFFFF', isBold: false },
            { row: ['', '', 'A', 'Perpustakaan', 0], bg: 'FFFFFFFF', isBold: false },
            { row: ['', '', 'A', 'Masjid', 0], bg: 'FFFFFFFF', isBold: false },
            // No 2: PG Teks Arab Lengkap Harakat
            { row: [2, 'Soal PG Kalimat Arab', 'Q', 'أَكْمِلِ الجُمْلَةَ الآتِيَةَ: أَحْمَدُ ... إِلَى المَسْجِدِ صَبَاحًا.', ''], bg: 'FFDCFCE7', isBold: true, isArabic: true },
            { row: ['', 'Jawaban Benar', 'A', 'يَذْهَبُ', 1], bg: 'FFDCFCE7', isBold: false, isArabic: true },
            { row: ['', '', 'A', 'تَذْهَبُ', 0], bg: 'FFFFFFFF', isBold: false, isArabic: true },
            { row: ['', '', 'A', 'نَذْهَبُ', 0], bg: 'FFFFFFFF', isBold: false, isArabic: true },
            { row: ['', '', 'A', 'أَذْهَبُ', 0], bg: 'FFFFFFFF', isBold: false, isArabic: true },
            // No 3: Esai Bahasa Arab
            { row: [3, 'Soal Esai Bahasa Arab', 'Q2', 'تَرْجِمْ هَذِهِ الجُمْلَةَ إِلَى اللُّغَةِ العَرَبِيَّةِ المُنَاسِبَةِ: "Saya belajar Bahasa Arab di SMA Muhammadiyah 1 Ponorogo."', ''], bg: 'FFE0F2FE', isBold: true, isArabic: true },
            // No 4: Jawaban Singkat Arab
            { row: [4, 'Jawaban Singkat Arab', 'Q3', 'مَا هُوَ ضِدُّ كَلِمَةِ «كَبِيْرٌ»؟', 'صَغِيْرٌ'], bg: 'FFFEF3C7', isBold: true, isArabic: true },
            // No 5: PG Kompleks Bahasa Arab
            { row: [5, 'Soal PG Kompleks Arab', 'Q4', 'اخْتَرْ جَمِيْعَ الكَلِمَاتِ الَّتِي تَدُلُّ عَلَى اسْمِ المَكَانِ:', ''], bg: 'FFFCE7F3', isBold: true, isArabic: true },
            { row: ['', 'Jawaban Benar', 'A', 'مَسْجِدٌ (Masjid)', 1], bg: 'FFDCFCE7', isBold: false, isArabic: true },
            { row: ['', '', 'A', 'قَلَمٌ (Pena)', 0], bg: 'FFFFFFFF', isBold: false, isArabic: true },
            { row: ['', 'Jawaban Benar', 'A', 'فَصْلٌ (Kelas)', 1], bg: 'FFDCFCE7', isBold: false, isArabic: true },
            // No 6: Benar/Salah Arab
            { row: [6, 'Soal Benar/Salah Arab', 'Q5', 'كَلِمَةُ «كِتَابٌ» فِي اللُّغَةِ العَرَبِيَّةِ اسْمٌ مُذَكَّرٌ.', ''], bg: 'FFFFE4E6', isBold: true, isArabic: true },
            { row: ['', 'Pernyataan BENAR', 'A', 'Benar', 1], bg: 'FFDCFCE7', isBold: false },
            // No 7: Menjodohkan Arab
            { row: [7, 'Soal Menjodohkan Arab', 'Q6', 'Pasangkan kosakata bahasa Arab berikut dengan artinya dalam bahasa Indonesia!', ''], bg: 'FFF3E8FF', isBold: true },
            { row: ['', 'Premis -> Respons', 'A', 'بَابٌ', 'Pintu'], bg: 'FFFFFFFF', isBold: false, isArabic: true },
            { row: ['', 'Premis -> Respons', 'A', 'نَافِذَةٌ', 'Jendela'], bg: 'FFFFFFFF', isBold: false, isArabic: true },
            { row: ['', 'Premis -> Respons', 'A', 'مَكْتَبٌ', 'Meja'], bg: 'FFFFFFFF', isBold: false, isArabic: true },
          ]
        : isJavaneseTopic
        ? [
            // No 1: PG Aksara Jawa
            { row: [1, 'Soal PG Aksara Jawa', 'Q', 'Wacanen Aksara Jawa ing ngisor iki: ꦲꦤꦕꦫꦏ', ''], bg: 'FFFEF3C7', isBold: true, isJavanese: true },
            { row: ['', 'Jawaban Benar', 'A', 'Hanacaraka', 1], bg: 'FFDCFCE7', isBold: false },
            { row: ['', '', 'A', 'Datasawala', 0], bg: 'FFFFFFFF', isBold: false },
            { row: ['', '', 'A', 'Padhajayanya', 0], bg: 'FFFFFFFF', isBold: false },
            { row: ['', '', 'A', 'Magabathanga', 0], bg: 'FFFFFFFF', isBold: false },
            // No 2: PG Aksara Jawa Pasangan
            { row: [2, 'Soal PG Aksara Jawa', 'Q', 'Tulisan Aksara Jawa kanggo tembung "Siswa Pintar" yaiku...', ''], bg: 'FFFEF3C7', isBold: true },
            { row: ['', 'Jawaban Benar', 'A', 'ꦱꦶꦱ꧀ꦮꦥꦶꦤ꧀ꦠꦂ', 1], bg: 'FFDCFCE7', isBold: false, isJavanese: true },
            { row: ['', '', 'A', 'ꦱꦶꦱ꧀ꦮꦩꦸꦫꦶꦢ꧀', 0], bg: 'FFFFFFFF', isBold: false, isJavanese: true },
            { row: ['', '', 'A', 'ꦱꦼꦏꦺꦴꦭꦃ', 0], bg: 'FFFFFFFF', isBold: false, isJavanese: true },
            { row: ['', '', 'A', 'ꦧꦱꦗꦮ', 0], bg: 'FFFFFFFF', isBold: false, isJavanese: true },
            // No 3: Esai Jawa
            { row: [3, 'Soal Esai Bahasa Jawa', 'Q2', 'Salinen ukara ing ngisor iki nganggo Aksara Jawa: "Kula sinau basa Jawa wonten ing SMA Muhammadiyah 1 Ponorogo."', ''], bg: 'FFE0F2FE', isBold: true },
            // No 4: Jawaban Singkat Jawa
            { row: [4, 'Jawaban Singkat Jawa', 'Q3', 'Aksara swara "u" ing aksara Jawa diarani sandhangan apa?', 'Suku ( ꦸ )'], bg: 'FFFEF3C7', isBold: true },
            // No 5: Menjodohkan Jawa
            { row: [5, 'Soal Menjodohkan Jawa', 'Q6', 'Pasangna sandhangan swara ing sisih kiwa karo unine ing sisih tengen!', ''], bg: 'FFF3E8FF', isBold: true },
            { row: ['', 'Premis -> Respons', 'A', 'Wulu ( ꦶ )', 'Swara i'], bg: 'FFFFFFFF', isBold: false, isJavanese: true },
            { row: ['', 'Premis -> Respons', 'A', 'Suku ( ꦸ )', 'Swara u'], bg: 'FFFFFFFF', isBold: false, isJavanese: true },
            { row: ['', 'Premis -> Respons', 'A', 'Taling ( ꦺ )', 'Swara e'], bg: 'FFFFFFFF', isBold: false, isJavanese: true },
          ]
        : [
            // No 1: PG Umum
            { row: [1, 'Soal Pilihan Ganda', 'Q', 'Ibu kota negara Indonesia adalah...', ''], bg: 'FFE0E7FF', isBold: true },
            { row: ['', 'Jawaban Benar', 'A', 'Jakarta', 1], bg: 'FFDCFCE7', isBold: false },
            { row: ['', '', 'A', 'Surabaya', 0], bg: 'FFFFFFFF', isBold: false },
            { row: ['', '', 'A', 'Bandung', 0], bg: 'FFFFFFFF', isBold: false },
            { row: ['', '', 'A', 'Yogyakarta', 0], bg: 'FFFFFFFF', isBold: false },
            // No 2: PG Matematika (Auto KaTeX / Equation)
            { row: [2, 'Soal PG Rumus Math', 'Q', 'Tentukan himpunan penyelesaian dari persamaan kuadrat $2x^2 - 4x + 2 = 0$ atau $\\frac{1}{2}x = 4$!', ''], bg: 'FFE0E7FF', isBold: true },
            { row: ['', 'Jawaban Benar', 'A', '$x = 1$ atau $x = 8$', 1], bg: 'FFDCFCE7', isBold: false },
            { row: ['', '', 'A', '$x = 2$ atau $x = 4$', 0], bg: 'FFFFFFFF', isBold: false },
            { row: ['', '', 'A', '$x = -1$ atau $x = 6$', 0], bg: 'FFFFFFFF', isBold: false },
            { row: ['', '', 'A', '$x = 0$ atau $x = 2$', 0], bg: 'FFFFFFFF', isBold: false },
            // No 3: Esai
            { row: [3, 'Soal Esai', 'Q2', 'Jelaskan rumus luas lingkaran $L = \\pi r^2$ dan berikan contoh perhitungannya jika jari-jari $r = 7\\text{ cm}$!', ''], bg: 'FFE0F2FE', isBold: true },
            // No 4: Jawaban Singkat
            { row: [4, 'Jawaban Singkat', 'Q3', 'Berapakah nilai dari $\\sqrt{144} \\times 2^3$?', '96'], bg: 'FFFEF3C7', isBold: true },
            // No 5: PG Kompleks
            { row: [5, 'Soal PG Kompleks', 'Q4', 'Manakah di antara rumus fisika berikut yang merupakan besaran turunan?', ''], bg: 'FFFCE7F3', isBold: true },
            { row: ['', 'Jawaban Benar', 'A', 'Kecepatan ($v = \\frac{s}{t}$)', 1], bg: 'FFDCFCE7', isBold: false },
            { row: ['', '', 'A', 'Massa ($m$)', 0], bg: 'FFFFFFFF', isBold: false },
            { row: ['', 'Jawaban Benar', 'A', 'Gaya ($F = m \\times a$)', 1], bg: 'FFDCFCE7', isBold: false },
            // No 6: Benar/Salah
            { row: [6, 'Soal Benar/Salah', 'Q5', 'Nilai dari $\\sin(30^\\circ) = \\frac{1}{2}$ adalah bernilai BENAR.', ''], bg: 'FFFFE4E6', isBold: true },
            { row: ['', 'Pernyataan BENAR', 'A', 'Benar', 1], bg: 'FFDCFCE7', isBold: false },
            // No 7: Menjodohkan
            { row: [7, 'Soal Menjodohkan', 'Q6', 'Pasangkan rumus fisika di kolom kiri dengan besaran yang sesuai di kolom kanan!', ''], bg: 'FFF3E8FF', isBold: true },
            { row: ['', 'Premis -> Respons', 'A', '$E_k = \\frac{1}{2}mv^2$', 'Energi Kinetik'], bg: 'FFFFFFFF', isBold: false },
            { row: ['', 'Premis -> Respons', 'A', '$E_p = mgh$', 'Energi Potensial'], bg: 'FFFFFFFF', isBold: false },
            { row: ['', 'Premis -> Respons', 'A', '$W = F \\times s$', 'Usaha / Kerja'], bg: 'FFFFFFFF', isBold: false },
          ]

      rowsData.forEach((item: any, idx) => {
        const rowIdx = 6 + idx
        const row = ws.getRow(rowIdx)
        row.values = item.row
        row.height = item.isArabic ? 28 : (item.isJavanese ? 26 : 20)

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const fontName = item.isArabic ? 'Traditional Arabic' : (item.isJavanese ? 'Noto Sans Javanese' : 'Calibri')
          const fontSize = item.isArabic ? 13 : (item.isJavanese ? 12 : 10)
          
          cell.font = { name: fontName, size: fontSize, bold: item.isBold }
          cell.alignment = {
            horizontal: colNumber === 4 ? (item.isArabic ? 'right' : 'left') : (colNumber === 2 ? 'left' : 'center'),
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
      const filePrefix = isArabicTopic ? 'Template_Soal_Bahasa_Arab' : (isJavaneseTopic ? 'Template_Soal_Bahasa_Jawa' : 'Template_Import_Soal_CBT')
      a.download = `${filePrefix}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)

      showNotification('Berhasil', `Template Excel ${isArabicTopic ? 'Bahasa Arab (RTL)' : (isJavaneseTopic ? 'Bahasa Jawa' : 'Standar CBT')} berhasil diunduh.`, 'success')
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
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:E50')
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

        let formulaCount = 0

        if (hasTipeColumn) {
          for (const row of rawRows) {
            const rawTipe = String(row['Tipe'] || row['TIPE'] || row['tipe'] || row['Type'] || '').trim().toUpperCase()
            const originalContent = String(row['Isi Soal / Jawaban'] || row['Isi Soal'] || row['Pertanyaan / Soal'] || row['Soal'] || row['Konten'] || '').trim()
            
            if (hasEquationOrFormula(originalContent)) {
              formulaCount++
            }
            const rawContent = convertEquationToKatex(originalContent)
            const rawStatus = row['Status Jawaban'] !== undefined ? row['Status Jawaban'] : row['Status']

            if (rawTipe.startsWith('Q')) {
              if (currentSoal && currentSoal.pertanyaan) {
                itemsList.push(currentSoal)
              }

              let dbTipe = 'PG'
              let defaultBobot = 1.0
              if (rawTipe === 'Q' || rawTipe === 'Q1') {
                dbTipe = 'PG'
                defaultBobot = 1.0
              } else if (rawTipe === 'Q2') {
                dbTipe = 'ESAI'
                defaultBobot = 3.0
              } else if (rawTipe === 'Q3') {
                dbTipe = 'ISIAN'
                defaultBobot = 2.0
              } else if (rawTipe === 'Q4') {
                dbTipe = 'PG_KOMPLEKS'
                defaultBobot = 2.0
              } else if (rawTipe === 'Q5') {
                dbTipe = 'BENAR_SALAH'
                defaultBobot = 1.0
              } else if (rawTipe === 'Q6') {
                dbTipe = 'MENJODOHKAN'
                defaultBobot = 2.0
              }

              currentSoal = {
                nomor: itemsList.length + 1,
                tipeSoal: dbTipe,
                pertanyaan: rawContent,
                bobot: defaultBobot,
                opsi: [],
                rawMatchingPairs: [],
                matchingData: undefined,
                kunciJawabanTeks: undefined,
              }

              if (rawStatus && String(rawStatus).trim()) {
                currentSoal.kunciJawabanTeks = convertEquationToKatex(String(rawStatus).trim())
              }
            } else if (rawTipe === 'A' && currentSoal) {
              if (currentSoal.tipeSoal === 'MENJODOHKAN') {
                const left = rawContent
                const right = convertEquationToKatex(String(rawStatus || '').trim())
                if (left && right) {
                  currentSoal.rawMatchingPairs.push({ left, right })
                }
              } else if (currentSoal.tipeSoal === 'BENAR_SALAH') {
                const statusStr = String(rawStatus).trim()
                const isBenar = statusStr === '1' || statusStr.toLowerCase() === 'benar' || statusStr.toLowerCase() === 'true'
                const contentLower = rawContent.toLowerCase()

                if (contentLower.includes('benar')) {
                  currentSoal.opsi = [
                    { label: 'A', konten: 'Benar', isBenar: isBenar },
                    { label: 'B', konten: 'Salah', isBenar: !isBenar },
                  ]
                } else if (contentLower.includes('salah')) {
                  currentSoal.opsi = [
                    { label: 'A', konten: 'Benar', isBenar: !isBenar },
                    { label: 'B', konten: 'Salah', isBenar: isBenar },
                  ]
                } else if (rawContent) {
                  const label = letters[currentSoal.opsi.length] || `Opsi ${currentSoal.opsi.length + 1}`
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
                const isBenar = String(rawStatus).trim() === '1' || String(rawStatus).toLowerCase() === 'true' || String(rawStatus).toLowerCase() === 'benar'
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
            const rawPertanyaan = row['Pertanyaan / Soal'] || row['Pertanyaan'] || row['Soal'] || ''
            if (hasEquationOrFormula(rawPertanyaan)) formulaCount++
            const pertanyaan = convertEquationToKatex(rawPertanyaan)
            const kunci = String(row['Kunci Jawaban (A/B/C/D/E)'] || row['Kunci'] || '').trim().toUpperCase()

            const opsi = ['A', 'B', 'C', 'D', 'E']
              .map((lbl) => {
                const rawOpt = row[`Pilihan ${lbl}`] || row[`Opsi ${lbl}`] || row[lbl] || ''
                if (hasEquationOrFormula(rawOpt)) formulaCount++
                return {
                  label: lbl,
                  konten: convertEquationToKatex(rawOpt),
                  isBenar: kunci === lbl,
                }
              })
              .filter((o) => o.konten.trim() !== '')

            if (pertanyaan.trim()) {
              itemsList.push({
                nomor: itemsList.length + 1,
                tipeSoal: tipe,
                pertanyaan,
                bobot: tipe === 'ESAI' ? 3.0 : tipe === 'ISIAN' ? 2.0 : 1.0,
                opsi,
                kunciJawabanTeks: convertEquationToKatex(row['Kunci Isian / Rubrik'] || null),
              })
            }
          }
        }

        if (itemsList.length === 0) {
          showNotification('Peringatan', 'Tidak ada butir soal yang valid ditemukan di dalam file Excel.', 'warning')
          return
        }

        setEquationConvertedCount(formulaCount)
        setParsedItems(itemsList)
        showNotification(
          'Berhasil Membaca File',
          `Berhasil membaca ${itemsList.length} butir soal${formulaCount > 0 ? ` (${formulaCount} rumus terdeteksi dan otomatis dikonversi ke KaTeX)` : ''}!`,
          'success'
        )
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
        setEquationConvertedCount(0)
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
              Melakukan Import Soal berdasarkan modul dan topik (Auto KaTeX &amp; Equation Converter)
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
                      {bs.nama} [{soalCount}]
                    </option>
                  )
                })}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Pilih terlebih dahulu Topik yang akan digunakan sebelum melakukan import soal
            </p>

            {/* Language & Script Detection Info */}
            {isArabicTopic && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded text-xs space-y-1 text-emerald-950 dark:text-emerald-200">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="font-arabic text-base">ع</span>
                  <span>Terdeteksi Topik Bahasa Arab:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-900/90 dark:text-emerald-200/90">
                  Sistem otomatis mengaktifkan rendering RTL, font <strong>Amiri / Noto Arabic (Offline)</strong>, dan template Excel yang diunduh akan otomatis berisi contoh soal Bahasa Arab berharakat lengkap.
                </p>
              </div>
            )}

            {isJavaneseTopic && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded text-xs space-y-1 text-amber-950 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                  <span className="font-javanese text-base">ꦲ</span>
                  <span>Terdeteksi Topik Bahasa Jawa:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                  Sistem otomatis mengaktifkan rendering <strong>Aksara Jawa Hanacaraka (Offline)</strong>, dan template Excel yang diunduh akan otomatis berisi format soal Aksara & Latin Jawa.
                </p>
              </div>
            )}

            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded text-xs space-y-1.5 text-indigo-950 dark:text-indigo-200">
              <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-4 h-4" />
                <span>Auto Konversi Rumus KaTeX:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-indigo-900/80 dark:text-indigo-200/80">
                File Excel yang memuat formula Word Equation, MathML, pecahan (½, ¾), akar (√x), pangkat (x²), indeks (x₁), simbol Yunani (α, β, θ, π), atau LaTeX otomatis dikonversi ke KaTeX ($...$).
              </p>
            </div>
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
              <span>Unduh Template Excel Baru</span>
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* File Chooser */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Pilih File Excel (.xlsx / .xls)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
            </div>

            {/* Parsed Preview Status */}
            {parsedItems.length > 0 && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-md space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Siap mengimport <strong>{parsedItems.length}</strong> butir soal ({fileName})
                    </span>
                  </div>
                  {equationConvertedCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 text-[10px] font-bold flex items-center gap-1">
                      <Sigma className="w-3 h-3" />
                      <span>{equationConvertedCount} Rumus Terkonversi</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Explanatory Texts */}
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-white/10 pt-3">
              <p>
                Soal yang dapat diimport: Tipe Pilihan Ganda (Q), Esai (Q2), Jawaban Singkat (Q3), PG Kompleks (Q4), Benar/Salah (Q5), dan Menjodohkan (Q6).
              </p>

              <div className="space-y-1 pt-1">
                <p className="font-bold text-slate-700 dark:text-slate-300">Format Status Jawaban:</p>
                <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                  <li>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Pilihan Ganda (Q) &amp; PG Kompleks (Q4):</span> Isi 1 untuk jawaban benar, 0 untuk salah.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Esai (Q2) &amp; Jawaban Singkat (Q3):</span> Kolom Answer diisi kunci/rubrik teks atau dikosongkan.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Benar/Salah (Q5):</span> Isi 1 jika pernyataan (Answer) adalah Benar, 0 jika Salah.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Menjodohkan (Q6):</span> Kolom Answer diisi Premis (Kiri), dan kolom Status Jawaban diisi dengan Pasangannya (Kanan).
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                disabled={importing || parsedItems.length === 0}
                onClick={handleSubmitImport}
                className="px-6 py-2 rounded bg-[#337ab7] hover:bg-[#286090] text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{importing ? 'Mengimport...' : 'Import Soal'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Preview of Parsed Questions */}
      {parsedItems.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Pratinjau Hasil Pembacaan Soal &amp; Render KaTeX ({parsedItems.length} Soal)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowPreviewList(!showPreviewList)}
              className="text-xs text-blue-600 hover:underline cursor-pointer"
            >
              {showPreviewList ? 'Sembunyikan Pratinjau' : 'Tampilkan Pratinjau'}
            </button>
          </div>

          {showPreviewList && (
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {parsedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/40 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                      <span className="w-5 h-5 rounded bg-[#337ab7] text-white flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>Tipe: {item.tipeSoal}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Bobot: {item.bobot}</span>
                  </div>

                  {/* Pertanyaan render */}
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-white/5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Pertanyaan:</div>
                    <div className="prose prose-xs dark:prose-invert max-w-none font-medium">
                      <MathRenderer content={item.pertanyaan} />
                    </div>
                  </div>

                  {/* Pilihan Jawaban */}
                  {item.opsi && item.opsi.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {item.opsi.map((op: any, oIdx: number) => (
                        <div
                          key={oIdx}
                          className={`p-1.5 px-2.5 rounded border text-[11px] flex items-center gap-2 ${
                            op.isBenar
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-semibold'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-bold text-slate-500">{op.label}.</span>
                          <div className="flex-1">
                            <MathRenderer content={op.konten} />
                          </div>
                          {op.isBenar && <span className="text-[9px] text-emerald-600 font-extrabold">✓ KUNCI</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Menjodohkan Pairs */}
                  {item.tipeSoal === 'MENJODOHKAN' && item.matchingData && (
                    <div className="space-y-1 pt-1">
                      <div className="text-[10px] font-bold text-slate-500">Pasangan Pencocokan:</div>
                      {(() => {
                        try {
                          const pairs = JSON.parse(item.matchingData)
                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {pairs.map((p: any, pIdx: number) => (
                                <div
                                  key={pIdx}
                                  className="p-1.5 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px]"
                                >
                                  <div className="flex-1 font-medium">
                                    <MathRenderer content={p.left} />
                                  </div>
                                  <span className="text-slate-400 px-1.5">➔</span>
                                  <div className="flex-1 text-blue-600 dark:text-blue-400 font-semibold">
                                    <MathRenderer content={p.right} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        } catch (e) {
                          return null
                        }
                      })()}
                    </div>
                  )}

                  {/* Kunci Isian / Esai */}
                  {item.kunciJawabanTeks && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                      <span className="font-bold">Kunci/Rubrik: </span>
                      <MathRenderer content={item.kunciJawabanTeks} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

