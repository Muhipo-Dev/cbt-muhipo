import ExcelJS from 'exceljs'

/**
 * Format tanggal & waktu ke format lokal Indonesia (DD/MM/YYYY HH:mm:ss).
 */
export function formatDateTimeId(value?: string | Date | null): string {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const pad = (n: number) => String(n).padStart(2, '0')
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date.getFullYear()
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Hitung durasi pengerjaan antara waktuMulai dan waktuSelesai.
 */
export function formatDurationBetween(
  startValue?: string | Date | null,
  endValue?: string | Date | null
): string {
  if (!startValue || !endValue) return '-'
  const start = startValue instanceof Date ? startValue : new Date(startValue)
  const end = endValue instanceof Date ? endValue : new Date(endValue)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-'

  const diffSec = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000))
  const hours = Math.floor(diffSec / 3600)
  const minutes = Math.floor((diffSec % 3600) / 60)
  const seconds = diffSec % 60

  if (hours > 0) {
    return `${hours} jam ${minutes} mnt ${seconds} dtk`
  }
  if (minutes > 0) {
    return `${minutes} mnt ${seconds} dtk`
  }
  return `${seconds} dtk`
}

function sanitizeFilePart(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export interface ExportRekapParams {
  rows: any[]
  activeUjian: any
  filterKelas: string
  sheetName: string
  filePrefix: string
}

function sanitizeSheetName(raw: string, usedNames: Set<string>): string {
  const base = (raw || 'Tes')
    .replace(/[\\/*?:[\]]/g, '_')
    .trim()
    .slice(0, 28) || 'Tes'
  let candidate = base
  let counter = 2
  while (usedNames.has(candidate)) {
    const suffix = `_${counter}`
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`
    counter++
  }
  usedNames.add(candidate)
  return candidate
}

function appendUjianWorksheet(
  workbook: ExcelJS.Workbook,
  {
    rows,
    activeUjian,
    filterKelas,
    sheetName,
    now,
  }: {
    rows: any[]
    activeUjian: any
    filterKelas: string
    sheetName: string
    now: Date
  }
): void {
  const isPoinSoal =
    String(activeUjian?.modePenilaian || 'POIN_SOAL').toUpperCase() === 'POIN_SOAL'
  const namaTes = activeUjian?.judul || activeUjian?.kodeUjian || '-'
  const namaTopik = activeUjian?.mataPelajaran?.nama || namaTes || 'Topik'
  const kelasLabel = filterKelas && filterKelas !== 'ALL' ? filterKelas : 'Semua Kelas'
  const exportTimestampDisplay = formatDateTimeId(now)

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 4 }],
  })

  const headers = [
    'No',
    'Nama',
    'Nomor Peserta',
    'Kelas',
    'Tanggal & Jam Masuk',
    'Tanggal & Jam Selesai',
    'Durasi Pengerjaan',
    'Poin PG / Pilihan',
    'Poin Isian & Esai',
    'Poin Total',
    'Status Ujian',
  ]

  worksheet.mergeCells(1, 1, 1, headers.length)
  const titleCell = worksheet.getCell(1, 1)
  titleCell.value = `HASIL TES: ${namaTopik.toUpperCase()} (${kelasLabel})`
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E293B' } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  worksheet.getRow(1).height = 26

  worksheet.mergeCells(2, 1, 2, headers.length)
  const subtitleCell = worksheet.getCell(2, 1)
  subtitleCell.value = `Tes: ${namaTes}   |   Kelas: ${kelasLabel}   |   Waktu Export: ${exportTimestampDisplay}`
  subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } }
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  worksheet.getRow(2).height = 20

  worksheet.getRow(3).height = 8

  const headerRow = worksheet.getRow(4)
  headerRow.height = 28
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }
  })

  const colLengths = headers.map((h) => h.length)

  // Urutkan otomatis berdasarkan Nomor Peserta (natural sort)
  const sortedRows = [...rows].sort((a: any, b: any) => {
    const noA = String(a.siswa?.nomorPeserta || a.siswa?.username || '')
    const noB = String(b.siswa?.nomorPeserta || b.siswa?.username || '')
    return noA.localeCompare(noB, 'id', { numeric: true, sensitivity: 'base' })
  })

  sortedRows.forEach((p: any, idx: number) => {
    const totalPoin = Number(Number(p.nilaiTotal ?? 0).toFixed(2))
    const rowValues = [
      idx + 1,
      p.siswa?.name || '-',
      p.siswa?.nomorPeserta || p.siswa?.username || '-',
      p.siswa?.kelas?.nama || p.kelas || '-',
      formatDateTimeId(p.waktuMulai),
      formatDateTimeId(p.waktuSelesai),
      formatDurationBetween(p.waktuMulai, p.waktuSelesai),
      Number(Number(p.nilaiPG || 0).toFixed(2)),
      Number(Number(p.nilaiEsai || 0).toFixed(2)),
      totalPoin,
      p.status || '-',
    ]

    const row = worksheet.getRow(5 + idx)
    row.height = 22
    const isEven = idx % 2 === 1

    rowValues.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1)
      cell.value = val
      cell.font = {
        name: 'Calibri',
        size: 10.5,
        bold: colIdx === 9,
        color: { argb: colIdx === 9 ? 'FF1D4ED8' : 'FF0F172A' },
      }
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        }
      }

      const centerCols = new Set([0, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      cell.alignment = {
        vertical: 'middle',
        horizontal: centerCols.has(colIdx) ? 'center' : 'left',
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }

      const len = String(val ?? '').length
      if (len > colLengths[colIdx]) colLengths[colIdx] = len
    })
  })

  colLengths.forEach((len, idx) => {
    worksheet.getColumn(idx + 1).width = Math.min(Math.max(len + 4, 10), 42)
  })

  // Aktifkan AutoFilter (Sort & Filter) pada header tabel di Excel
  worksheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4 + sortedRows.length, column: headers.length },
  }
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Ekspor data rekap / hasil tes per tes per topik ke file Excel (.xlsx) dengan tampilan rapi.
 */
export async function exportRekapHasilToExcel({
  rows,
  activeUjian,
  filterKelas,
  sheetName,
}: ExportRekapParams): Promise<void> {
  const namaTes = activeUjian?.judul || activeUjian?.kodeUjian || '-'
  const namaTopik = activeUjian?.mataPelajaran?.nama || namaTes || 'Topik'
  const kelasLabel = filterKelas && filterKelas !== 'ALL' ? filterKelas : 'Semua Kelas'
  const now = new Date()

  const pad = (n: number) => String(n).padStart(2, '0')
  const exportFileTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'CBT MUHIPO'
  workbook.created = now

  appendUjianWorksheet(workbook, {
    rows,
    activeUjian,
    filterKelas,
    sheetName,
    now,
  })

  const safeTopik = sanitizeFilePart(namaTopik) || 'Topik'
  const safeKelas = sanitizeFilePart(kelasLabel) || 'Semua_Kelas'
  await downloadWorkbook(workbook, `${safeTopik}_${safeKelas}_${exportFileTimestamp}.xlsx`)
}

/**
 * Ekspor banyak tes sekaligus ke dalam satu file Excel (.xlsx) dengan 1 sheet per tes.
 */
export async function exportMultipleRekapHasilToExcel(
  items: Array<{ rows: any[]; activeUjian: any }>,
  filterKelas: string
): Promise<void> {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const exportFileTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'CBT MUHIPO'
  workbook.created = now

  const usedNames = new Set<string>()
  items.forEach(({ rows, activeUjian }) => {
    const namaTopik = activeUjian?.mataPelajaran?.nama || activeUjian?.judul || 'Tes'
    const sheetName = sanitizeSheetName(namaTopik, usedNames)
    appendUjianWorksheet(workbook, {
      rows,
      activeUjian,
      filterKelas,
      sheetName,
      now,
    })
  })

  const kelasLabel = filterKelas && filterKelas !== 'ALL' ? filterKelas : 'Semua Kelas'
  const safeKelas = sanitizeFilePart(kelasLabel) || 'Semua_Kelas'
  await downloadWorkbook(
    workbook,
    `Gabungan_Hasil_Tes_${safeKelas}_${exportFileTimestamp}.xlsx`
  )
}
