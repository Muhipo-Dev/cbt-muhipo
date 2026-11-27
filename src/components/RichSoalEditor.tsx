'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image as ImageIcon,
  Table as TableIcon,
  Code,
  Sparkles,
  Eye,
  EyeOff,
  RemoveFormatting,
  Undo2,
  Redo2,
  Minus,
} from 'lucide-react'
import { MathRenderer } from '@/components/MathRenderer'
import { convertEquationToKatex } from '@/lib/katexConverter'

interface RichSoalEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

const KATEX_TEMPLATES = [
  { label: 'Pecahan', snippet: '$\\frac{a}{b}$' },
  { label: 'Akar', snippet: '$\\sqrt{x}$' },
  { label: 'Pangkat', snippet: '$x^{2}$' },
  { label: 'Indeks', snippet: '$x_{1}$' },
  { label: 'Kali', snippet: '$\\times$' },
  { label: 'Bagi', snippet: '$\\div$' },
  { label: 'Plus/Min', snippet: '$\\pm$' },
  { label: 'Derajat', snippet: '$90^{\\circ}$' },
  { label: 'Pi', snippet: '$\\pi$' },
  { label: 'Sigma', snippet: '$\\sum_{i=1}^{n}$' },
]

const ARABIC_TEMPLATES = [
  { label: 'Bismillah', snippet: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
  { label: 'Fathah', snippet: 'ـَ' },
  { label: 'Kasrah', snippet: 'ـِ' },
  { label: 'Dammah', snippet: 'ـُ' },
  { label: 'Sukun', snippet: 'ـْ' },
  { label: 'Tasydid', snippet: 'ـّ' },
  { label: 'Tanda Tanya', snippet: '؟' },
]

export function RichSoalEditor({ value, onChange, placeholder }: RichSoalEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSourceMode, setIsSourceMode] = useState(false)
  const [showKatex, setShowKatex] = useState(false)
  const [showArabic, setShowArabic] = useState(false)
  const [showTableMenu, setShowTableMenu] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const [showPreview, setShowPreview] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!isSourceMode && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [isSourceMode, value])

  const syncDom = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const execCmd = (cmd: string, val?: string) => {
    if (isSourceMode) return
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    syncDom()
  }

  const insertHtml = (html: string) => {
    if (isSourceMode) {
      onChange((value || '') + html)
      return
    }
    editorRef.current?.focus()
    document.execCommand('insertHTML', false, html)
    syncDom()
  }

  const getActiveTableCell = (): { cell: HTMLTableCellElement; row: HTMLTableRowElement; table: HTMLTableElement } | null => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    let node: Node | null = sel.anchorNode
    let cell: HTMLTableCellElement | null = null
    let row: HTMLTableRowElement | null = null
    let table: HTMLTableElement | null = null
    while (node && node !== editorRef.current) {
      if (node.nodeName === 'TD' || node.nodeName === 'TH') cell = node as HTMLTableCellElement
      if (node.nodeName === 'TR') row = node as HTMLTableRowElement
      if (node.nodeName === 'TABLE') {
        table = node as HTMLTableElement
        break
      }
      node = node.parentNode
    }
    if (cell && row && table) return { cell, row, table }
    return null
  }

  const insertTable = (rows: number, cols: number) => {
    const rCount = Math.max(1, Math.min(20, rows))
    const cCount = Math.max(1, Math.min(12, cols))
    let html = '<table class="cbt-table w-full border-collapse border border-slate-400 my-2 text-xs"><thead><tr>'
    for (let c = 0; c < cCount; c++) {
      html += `<th class="border border-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 font-bold text-left">Header ${c + 1}</th>`
    }
    html += '</tr></thead><tbody>'
    for (let r = 1; r < rCount; r++) {
      html += '<tr>'
      for (let c = 0; c < cCount; c++) {
        html += '<td class="border border-slate-400 px-2 py-1.5">Isi</td>'
      }
      html += '</tr>'
    }
    html += '</tbody></table><p><br/></p>'
    insertHtml(html)
    setShowTableMenu(false)
  }

  const addTableRow = () => {
    const ctx = getActiveTableCell()
    if (!ctx) return
    const newRow = ctx.row.cloneNode(true) as HTMLTableRowElement
    Array.from(newRow.cells).forEach((c) => {
      c.innerHTML = 'Isi'
    })
    ctx.row.parentNode?.insertBefore(newRow, ctx.row.nextSibling)
    syncDom()
  }

  const deleteTableRow = () => {
    const ctx = getActiveTableCell()
    if (!ctx) return
    if (ctx.table.rows.length <= 1) {
      ctx.table.remove()
    } else {
      ctx.row.remove()
    }
    syncDom()
  }

  const addTableCol = () => {
    const ctx = getActiveTableCell()
    if (!ctx) return
    const colIdx = ctx.cell.cellIndex
    Array.from(ctx.table.rows).forEach((tr) => {
      const isHeader = tr.cells[0]?.nodeName === 'TH'
      const newCell = document.createElement(isHeader ? 'th' : 'td')
      newCell.className = isHeader
        ? 'border border-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 font-bold text-left'
        : 'border border-slate-400 px-2 py-1.5'
      newCell.innerHTML = isHeader ? 'Header' : 'Isi'
      const refCell = tr.cells[colIdx + 1] || null
      tr.insertBefore(newCell, refCell)
    })
    syncDom()
  }

  const deleteTableCol = () => {
    const ctx = getActiveTableCell()
    if (!ctx) return
    const colIdx = ctx.cell.cellIndex
    if (ctx.row.cells.length <= 1) {
      ctx.table.remove()
    } else {
      Array.from(ctx.table.rows).forEach((tr) => {
        if (tr.cells[colIdx]) tr.deleteCell(colIdx)
      })
    }
    syncDom()
  }

  const deleteTable = () => {
    const ctx = getActiveTableCell()
    if (!ctx) return
    ctx.table.remove()
    syncDom()
  }

  const uploadImageFile = async (file: File) => {
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok && data?.url) {
        insertHtml(
          `<img src="${data.url}" alt="Gambar Soal" class="cbt-zoomable-media my-2 max-h-72 max-w-full object-contain cursor-zoom-in" />`
        )
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Word-like Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-t-md">
        <button type="button" onClick={() => execCmd('undo')} title="Undo" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCmd('redo')} title="Redo" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-slate-300 dark:bg-white/20 mx-0.5" />

        <select
          aria-label="Ukuran Teks"
          onChange={(e) => {
            if (e.target.value) execCmd('formatBlock', e.target.value)
            e.target.value = ''
          }}
          defaultValue=""
          className="px-1.5 py-1 text-[11px] rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <option value="" disabled>Gaya</option>
          <option value="P">Normal</option>
          <option value="H2">Judul Besar</option>
          <option value="H3">Subjudul</option>
          <option value="BLOCKQUOTE">Kutipan</option>
        </select>

        <button type="button" onClick={() => execCmd('bold')} title="Bold (Ctrl+B)" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCmd('italic')} title="Italic (Ctrl+I)" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCmd('underline')} title="Underline (Ctrl+U)" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCmd('strikeThrough')} title="Coret (Strikethrough)" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCmd('subscript')} title="Subscript (x₂)" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <Subscript className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCmd('superscript')} title="Superscript (x²)" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <Superscript className="w-3.5 h-3.5" />
        </button>

        <input
          type="color"
          title="Warna Teks"
          onChange={(e) => execCmd('foreColor', e.target.value)}
          className="w-6 h-6 p-0.5 rounded border border-slate-300 dark:border-white/20 bg-white cursor-pointer"
        />

        <span className="w-px h-4 bg-slate-300 dark:bg-white/20 mx-0.5" />
        <button type="button" onClick={() => execCmd('justifyLeft')} title="Rata Kiri" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCmd('justifyCenter')} title="Rata Tengah" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCmd('justifyRight')} title="Rata Kanan" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <AlignRight className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCmd('justifyFull')} title="Rata Kiri-Kanan" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <AlignJustify className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-slate-300 dark:bg-white/20 mx-0.5" />
        <button type="button" onClick={() => execCmd('insertUnorderedList')} title="Bullet List" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <List className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCmd('insertOrderedList')} title="Numbered List" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCmd('insertHorizontalRule')} title="Garis Pemisah" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCmd('removeFormat')} title="Hapus Format" className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-300 dark:bg-white/20 mx-0.5" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadImageFile(file)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          title="Sisipkan Gambar"
          className="px-2 py-1 rounded text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
        >
          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>{uploading ? 'Mengunggah...' : 'Gambar'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowTableMenu((v) => !v)}
          className={`px-2 py-1 rounded text-[11px] font-semibold border flex items-center gap-1 cursor-pointer ${
            showTableMenu
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-200'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>Tabel</span>
        </button>

        <button
          type="button"
          onClick={() => setShowKatex((v) => !v)}
          className={`px-2 py-1 rounded text-[11px] font-semibold border flex items-center gap-1 cursor-pointer ${
            showKatex
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-200'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>KaTeX</span>
        </button>
        <button
          type="button"
          onClick={() => setShowArabic((v) => !v)}
          className={`px-2 py-1 rounded text-[11px] font-semibold border flex items-center gap-1 cursor-pointer ${
            showArabic
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-200'
          }`}
        >
          <span className="font-arabic text-xs leading-none">ع</span>
          <span>Arab</span>
        </button>
        <button
          type="button"
          onClick={() => setIsSourceMode((v) => !v)}
          className={`px-2 py-1 rounded text-[11px] font-semibold border flex items-center gap-1 cursor-pointer ${
            isSourceMode
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-200'
          }`}
        >
          <Code className="w-3 h-3" />
          <span>HTML</span>
        </button>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="ml-auto px-2 py-1 rounded text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
        >
          {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          <span>{showPreview ? 'Tutup Pratinjau' : 'Pratinjau'}</span>
        </button>
      </div>

      {/* Table Menu */}
      {showTableMenu && (
        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-indigo-800 dark:text-indigo-200">Buat Tabel:</span>
          <label className="flex items-center gap-1">
            <span>Baris</span>
            <input type="number" min={1} max={20} value={tableRows} onChange={(e) => setTableRows(Number(e.target.value) || 1)} className="w-12 px-1.5 py-0.5 rounded border bg-white dark:bg-slate-900" />
          </label>
          <label className="flex items-center gap-1">
            <span>Kolom</span>
            <input type="number" min={1} max={12} value={tableCols} onChange={(e) => setTableCols(Number(e.target.value) || 1)} className="w-12 px-1.5 py-0.5 rounded border bg-white dark:bg-slate-900" />
          </label>
          <button type="button" onClick={() => insertTable(tableRows, tableCols)} className="px-2.5 py-1 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 cursor-pointer">
            + Sisipkan Tabel
          </button>
          <span className="w-px h-4 bg-indigo-300 dark:bg-indigo-700" />
          <button type="button" onClick={addTableRow} className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-indigo-200 hover:bg-indigo-100 cursor-pointer">+ Baris</button>
          <button type="button" onClick={deleteTableRow} className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-indigo-200 hover:bg-indigo-100 cursor-pointer">- Baris</button>
          <button type="button" onClick={addTableCol} className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-indigo-200 hover:bg-indigo-100 cursor-pointer">+ Kolom</button>
          <button type="button" onClick={deleteTableCol} className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-indigo-200 hover:bg-indigo-100 cursor-pointer">- Kolom</button>
          <button type="button" onClick={deleteTable} className="px-2 py-1 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer">Hapus Tabel</button>
        </div>
      )}

      {/* KaTeX Assistant */}
      {showKatex && (
        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded flex flex-wrap gap-1.5">
          {KATEX_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => insertHtml(t.snippet)}
              className="px-2 py-1 text-[11px] rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Arabic Assistant */}
      {showArabic && (
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded flex flex-wrap gap-1.5 items-center">
          <button
            type="button"
            onClick={() =>
              insertHtml('<div class="font-arabic dir-rtl" style="font-size: 1.3em; line-height: 2;">كَتَبَ النَّصَّ هُنَا</div>')
            }
            className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
          >
            + Blok Arab RTL
          </button>
          {ARABIC_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => insertHtml(t.snippet)}
              className="px-2 py-1 text-xs font-arabic rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
            >
              {t.label} ({t.snippet})
            </button>
          ))}
        </div>
      )}

      {/* Editor Area */}
      {isSourceMode ? (
        <textarea
          rows={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Ketikkan kode HTML / KaTeX ($...$) di sini...'}
          className="w-full p-3 font-mono text-xs bg-white dark:bg-slate-950 border border-t-0 border-slate-300 dark:border-white/20 rounded-b-md focus:outline-none focus:border-blue-500"
        />
      ) : (
        <div
          ref={editorRef}
          dir="auto"
          contentEditable
          onInput={syncDom}
          onBlur={syncDom}
          onKeyDown={(e) => {
            if (!(e.ctrlKey || e.metaKey)) return
            const key = e.key.toLowerCase()
            if (key === 'b') { e.preventDefault(); execCmd('bold') }
            else if (key === 'i') { e.preventDefault(); execCmd('italic') }
            else if (key === 'u') { e.preventDefault(); execCmd('underline') }
            else if (key === 'l' && e.shiftKey) { e.preventDefault(); execCmd('insertUnorderedList') }
            else if (key === '7' && e.shiftKey) { e.preventDefault(); execCmd('insertOrderedList') }
            else if (key === 'l') { e.preventDefault(); execCmd('justifyLeft') }
            else if (key === 'e') { e.preventDefault(); execCmd('justifyCenter') }
            else if (key === 'r') { e.preventDefault(); execCmd('justifyRight') }
            else if (key === 'j') { e.preventDefault(); execCmd('justifyFull') }
            else if (key === 'z' && e.shiftKey) { e.preventDefault(); execCmd('redo') }
            else if (key === 'z') { e.preventDefault(); execCmd('undo') }
            else if (key === 'y') { e.preventDefault(); execCmd('redo') }
            else if (key === '\\') { e.preventDefault(); execCmd('removeFormat') }
          }}
          onPaste={async (e) => {
            const items = Array.from(e.clipboardData?.items || [])
            const imageItem = items.find((item) => item.type.startsWith('image/'))
            if (imageItem) {
              e.preventDefault()
              const file = imageItem.getAsFile()
              if (file) await uploadImageFile(file)
              return
            }
            setTimeout(syncDom, 20)
          }}
          className="w-full min-h-[150px] max-h-[320px] p-3 text-sm bg-white dark:bg-slate-950 border border-t-0 border-slate-300 dark:border-white/20 rounded-b-md focus:outline-none focus:border-blue-500 overflow-y-auto leading-relaxed"
        />
      )}

      {/* Live Preview */}
      {showPreview && value && (
        <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded space-y-1">
          <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
            Live Pratinjau Soal:
          </div>
          <div className="p-2 bg-white dark:bg-slate-900 rounded border border-blue-100 dark:border-blue-900/50 text-xs">
            <MathRenderer content={convertEquationToKatex(value)} />
          </div>
        </div>
      )}
    </div>
  )
}
