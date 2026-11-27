'use client'

import React, { useState } from 'react'
import { CheckSquare, Square, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react'
import { exportMultipleRekapHasilToExcel } from '@/lib/rekap-export'

interface MultiTesExportPanelProps {
  ujianList: any[]
  filterKelas: string
  showNotification: (title: string, message: string, type?: any) => void
}

export function MultiTesExportPanel({
  ujianList,
  filterKelas,
  showNotification,
}: MultiTesExportPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)

  if (!ujianList || ujianList.length <= 1) return null

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedIds.length === ujianList.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(ujianList.map((u) => u.id))
    }
  }

  const handleExportMultiple = async () => {
    if (selectedIds.length === 0) {
      showNotification('Informasi', 'Pilih minimal 1 tes untuk diekspor.', 'info')
      return
    }

    try {
      setExporting(true)
      showNotification(
        'Memproses',
        `Mengambil data ${selectedIds.length} tes untuk diekspor ke Excel...`,
        'info'
      )

      const results = await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch(`/api/guru/koreksi?ujianId=${id}`)
          const json = await res.json()
          if (!json.success) return null
          const activeUjian =
            json.data?.activeUjian || ujianList.find((u: any) => u.id === id)
          let rows = json.data?.hasilList || []
          if (filterKelas && filterKelas !== 'ALL') {
            rows = rows.filter((h: any) => h.siswa?.kelas?.nama === filterKelas)
          }
          return { rows, activeUjian }
        })
      )

      const validItems = results.filter(
        (item): item is { rows: any[]; activeUjian: any } => item !== null
      )

      if (validItems.length === 0) {
        showNotification('Gagal', 'Tidak ada data tes yang berhasil diambil.', 'error')
        return
      }

      await exportMultipleRekapHasilToExcel(validItems, filterKelas)
      showNotification(
        'Berhasil',
        `${validItems.length} data tes berhasil diekspor ke dalam 1 file Excel.`,
        'success'
      )
    } catch (err: any) {
      showNotification(
        'Gagal',
        'Gagal mengekspor banyak tes: ' + (err?.message || 'Error'),
        'error'
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md overflow-hidden">
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="min-h-[44px] flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer touch-manipulation"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Export Banyak Tes Sekaligus ({selectedIds.length} dipilih)</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        <div className="flex items-center gap-2">
          {expanded && (
            <button
              type="button"
              onClick={toggleAll}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer touch-manipulation"
            >
              {selectedIds.length === ujianList.length ? 'Batal Semua' : 'Pilih Semua'}
            </button>
          )}
          <button
            type="button"
            disabled={exporting || selectedIds.length === 0}
            onClick={handleExportMultiple}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer touch-manipulation active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>
              {exporting
                ? 'Mengekspor...'
                : `Export ${selectedIds.length || ''} Tes Terpilih (.XLSX)`}
            </span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-200/70 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
          {ujianList.map((u: any) => {
            const checked = selectedIds.includes(u.id)
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleId(u.id)}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-left text-xs flex items-center gap-2.5 transition cursor-pointer touch-manipulation ${
                  checked
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold'
                    : 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                {checked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="truncate">{u.judul}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

