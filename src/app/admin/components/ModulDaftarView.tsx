'use client'

import React, { useState, useEffect } from 'react'
import {
  Home,
  ChevronRight,
  Printer,
  Edit,
  Trash2,
  RefreshCw,
  Plus,
  Save,
  X,
  Volume2,
  FileSpreadsheet,
} from 'lucide-react'
import { MathRenderer } from '@/components/MathRenderer'

interface ModulDaftarViewProps {
  mapelList: any[]
  bankSoalList?: any[] // Alias kompatibilitas
  onSelectMapel?: (id: string) => void
  onNavigateToEditor?: () => void
  onNavigateToImport?: () => void
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void
}

export function ModulDaftarView({
  mapelList,
  bankSoalList,
  onSelectMapel,
  onNavigateToEditor,
  onNavigateToImport,
  onRefresh,
  showNotification,
  showConfirm,
}: ModulDaftarViewProps) {
  const items = mapelList && mapelList.length > 0 ? mapelList : bankSoalList || []
  const [selectedMapelId, setSelectedMapelId] = useState(items[0]?.id || '')
  const [mapelData, setMapelData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // Edit Soal Modal
  const [modalEditSoalOpen, setModalEditSoalOpen] = useState(false)
  const [editingSoal, setEditingSoal] = useState<any | null>(null)
  const [editPertanyaan, setEditPertanyaan] = useState('')
  const [editTipeSoal, setEditTipeSoal] = useState('PG')
  const [editBobot, setEditBobot] = useState(1.0)
  const [savingSoal, setSavingSoal] = useState(false)

  // Edit Jawaban Modal
  const [modalEditJawabanOpen, setModalEditJawabanOpen] = useState(false)
  const [selectedSoalForJawaban, setSelectedSoalForJawaban] = useState<any | null>(null)
  const [opsiList, setOpsiList] = useState<{ id?: string; label: string; konten: string; isBenar: boolean }[]>([])
  const [kunciJawabanTeks, setKunciJawabanTeks] = useState('')
  const [savingJawaban, setSavingJawaban] = useState(false)

  // Fetch Topic Detail
  useEffect(() => {
    if (selectedMapelId) {
      fetchMapelDetail(selectedMapelId)
    } else if (items.length > 0) {
      setSelectedMapelId(items[0].id)
    }
  }, [selectedMapelId, items])

  const fetchMapelDetail = async (id: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/guru/soal?mataPelajaranId=${id}`)
      const json = await res.json()
      if (json.success) {
        setMapelData(json.data)
      }
    } catch (err: any) {
      console.error('Fetch mapel detail error:', err)
    } finally {
      setLoading(false)
    }
  }

  const currentTopic = items.find((it) => it.id === selectedMapelId) || mapelData || {
    id: '',
    nama: 'Bahasa Indonesia dan Literasi',
    kode: 'Default',
  }
  const totalSoalCount = mapelData?.soalList?.length ?? currentTopic?._count?.soalList ?? currentTopic?.soalList?.length ?? 0
  const topicDisplayName = currentTopic
    ? `${currentTopic.kode ? currentTopic.kode + ' - ' : ''}${currentTopic.nama || 'Topik'} [${totalSoalCount}]`
    : 'Topik Terpilih'

  // Open Edit Soal Modal
  const handleOpenEditSoal = (soal: any) => {
    setEditingSoal(soal)
    setEditPertanyaan(soal.pertanyaan || '')
    setEditTipeSoal(soal.tipeSoal || 'PG')
    setEditBobot(soal.bobot || 1.0)
    setModalEditSoalOpen(true)
  }

  // Save Edit Soal
  const handleSaveEditSoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSoal) return
    try {
      setSavingSoal(true)
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SOAL',
          mataPelajaranId: selectedMapelId,
          soalId: editingSoal.id,
          nomorUrut: editingSoal.nomorUrut,
          tipeSoal: editTipeSoal,
          pertanyaan: editPertanyaan,
          bobot: Number(editBobot) || 1.0,
          mediaAudio: editingSoal.mediaAudio,
          mediaGambar: editingSoal.mediaGambar,
          kunciJawabanTeks: editingSoal.kunciJawabanTeks,
          opsiJawaban: editingSoal.opsiJawaban,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Berhasil', 'Butir soal berhasil diperbarui!', 'success')
        setModalEditSoalOpen(false)
        fetchMapelDetail(selectedMapelId)
      } else {
        showNotification('Gagal', json.message || 'Gagal memperbarui soal', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal update: ' + err.message, 'error')
    } finally {
      setSavingSoal(false)
    }
  }

  // Open Edit Jawaban Modal
  const handleOpenEditJawaban = (soal: any) => {
    setSelectedSoalForJawaban(soal)
    setKunciJawabanTeks(soal.kunciJawabanTeks || '')

    if (soal.opsiJawaban && soal.opsiJawaban.length > 0) {
      setOpsiList(
        soal.opsiJawaban.map((o: any) => ({
          id: o.id,
          label: o.label,
          konten: o.konten || '',
          isBenar: Boolean(o.isBenar),
        }))
      )
    } else {
      setOpsiList([
        { label: 'A', konten: '', isBenar: true },
        { label: 'B', konten: '', isBenar: false },
        { label: 'C', konten: '', isBenar: false },
        { label: 'D', konten: '', isBenar: false },
        { label: 'E', konten: '', isBenar: false },
      ])
    }
    setModalEditJawabanOpen(true)
  }

  // Save Edit Jawaban
  const handleSaveEditJawaban = async () => {
    if (!selectedSoalForJawaban) return
    try {
      setSavingJawaban(true)
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SOAL',
          mataPelajaranId: selectedMapelId,
          soalId: selectedSoalForJawaban.id,
          nomorUrut: selectedSoalForJawaban.nomorUrut,
          tipeSoal: selectedSoalForJawaban.tipeSoal,
          pertanyaan: selectedSoalForJawaban.pertanyaan,
          bobot: selectedSoalForJawaban.bobot,
          mediaAudio: selectedSoalForJawaban.mediaAudio,
          mediaGambar: selectedSoalForJawaban.mediaGambar,
          kunciJawabanTeks: kunciJawabanTeks,
          opsiJawaban: opsiList,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Berhasil', 'Pilihan jawaban berhasil disimpan!', 'success')
        setModalEditJawabanOpen(false)
        fetchMapelDetail(selectedMapelId)
      } else {
        showNotification('Gagal', json.message || 'Gagal menyimpan jawaban', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal menyimpan jawaban: ' + err.message, 'error')
    } finally {
      setSavingJawaban(false)
    }
  }

  // Cetak Daftar Soal
  const handlePrint = () => {
    window.print()
  }

  // Format Tipe Soal Text
  const formatTipeLabel = (tipe: string) => {
    switch (tipe) {
      case 'PG':
        return 'Pilihan Ganda'
      case 'PG_KOMPLEKS':
        return 'Pilihan Ganda Kompleks'
      case 'ISIAN':
        return 'Isian Singkat'
      case 'ESAI':
        return 'Esai / Uraian'
      case 'BENAR_SALAH':
        return 'Benar / Salah'
      case 'MENJODOHKAN':
        return 'Menjodohkan'
      default:
        return tipe
    }
  }

  // Filter & Pagination
  const allSoal = mapelData?.soalList || []
  const filteredSoal = allSoal.filter((s: any) =>
    s.pertanyaan ? s.pertanyaan.toLowerCase().includes(searchQuery.toLowerCase()) : true
  )
  const totalPages = Math.max(1, Math.ceil(filteredSoal.length / entriesPerPage))
  const paginatedSoal = filteredSoal.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage)

  return (
    <div className="w-full space-y-4 font-sans text-slate-800 dark:text-slate-100">
      {/* 1. Header Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-slate-900 dark:text-white flex items-center gap-2">
            Daftar Soal
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
              Daftar soal dan jawaban berdasarkan Modul dan Topik
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>Home</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">Daftar Soal</span>
        </div>
      </div>

      {/* 2. CARD 1: PILIH TOPIK */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">Pilih Topik</h2>
        </div>
        <div className="p-4 sm:p-5 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="sm:w-44 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
              Pilih Topik
            </label>
            <div className="flex-1 max-w-2xl">
              <select
                value={selectedMapelId}
                onChange={(e) => {
                  setSelectedMapelId(e.target.value)
                  setCurrentPage(1)
                }}
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                Pilih terlebih dahulu Topik yang akan digunakan sebelum menambah atau mengubah soal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CARD 2: DAFTAR SOAL [NAMA TOPIK] */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">
            Daftar Soal {topicDisplayName}
          </h2>
          <button
            type="button"
            onClick={handlePrint}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Daftar Soal</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          {/* Table Top Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <span>Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span>Search:</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-white/10">
                  <th className="py-2.5 px-3 w-12 text-center">No. ⇅</th>
                  <th className="py-2.5 px-3 w-32">Tipe Soal</th>
                  <th className="py-2.5 px-3">Soal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-blue-500" />
                      <span>Memuat daftar butir soal...</span>
                    </td>
                  </tr>
                ) : paginatedSoal.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      {searchQuery
                        ? 'Tidak ada soal yang cocok dengan pencarian.'
                        : 'Belum ada soal pada topik ini.'}
                    </td>
                  </tr>
                ) : (
                  paginatedSoal.map((soal: any, idx: number) => {
                    const rowNumber = (currentPage - 1) * entriesPerPage + idx + 1
                    const hasAudio = Boolean(soal.mediaAudio)
                    const opsi = soal.opsiJawaban || []

                    return (
                      <tr
                        key={soal.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-3 align-top text-center font-medium text-slate-500 dark:text-slate-400">
                          {rowNumber}
                        </td>
                        <td className="py-3 px-3 align-top font-semibold text-slate-700 dark:text-slate-300">
                          {formatTipeLabel(soal.tipeSoal)}
                        </td>
                        <td className="py-3 px-3 align-top space-y-3">
                          {/* Question Header with Edit Soal Link */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              {/* Audio Player if present */}
                              {hasAudio && (
                                <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-center gap-2 max-w-sm">
                                  <Volume2 className="w-4 h-4 text-purple-600 shrink-0" />
                                  <audio controls className="h-7 w-full">
                                    <source src={soal.mediaAudio} />
                                  </audio>
                                </div>
                              )}

                              {/* Question Rich Text / KaTeX Render */}
                              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-slate-900 dark:text-white">
                                <MathRenderer content={soal.pertanyaan} />
                              </div>
                            </div>

                            {/* Edit Soal button on top right of question */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditSoal(soal)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium shrink-0 cursor-pointer pt-0.5"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit Soal</span>
                            </button>
                          </div>

                          {/* Options / Answers List */}
                          {['PG', 'PG_KOMPLEKS', 'BENAR_SALAH'].includes(soal.tipeSoal) && opsi.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                              {opsi.map((o: any, oIdx: number) => (
                                <div
                                  key={o.id || oIdx}
                                  className="flex items-start justify-between gap-3 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 rounded"
                                >
                                  <div className="flex items-start gap-4 flex-1">
                                    <span className="w-4 font-mono text-slate-400 shrink-0">{oIdx + 1}.</span>
                                    <span
                                      className={`w-14 font-bold shrink-0 ${
                                        o.isBenar
                                          ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {o.isBenar ? 'Benar' : 'Salah'}
                                    </span>
                                    <div className="flex-1">
                                      <MathRenderer content={o.konten} />
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditJawaban(soal)}
                                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium shrink-0 cursor-pointer"
                                  >
                                    <Edit className="w-2.5 h-2.5" />
                                    <span>Edit Jawaban</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Isian / Esai Key */}
                          {['ISIAN', 'ESAI'].includes(soal.tipeSoal) && (
                            <div className="flex items-start justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-600 dark:text-slate-400">
                                  {soal.tipeSoal === 'ISIAN' ? 'Kunci Isian Singkat:' : 'Rubrik Esai:'}
                                </span>
                                <p className="text-slate-800 dark:text-slate-200">
                                  {soal.kunciJawabanTeks || '(Belum diatur)'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenEditJawaban(soal)}
                                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium shrink-0 cursor-pointer"
                              >
                                <Edit className="w-2.5 h-2.5" />
                                <span>Edit Jawaban</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2">
            <div>
              Showing {filteredSoal.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to{' '}
              {Math.min(currentPage * entriesPerPage, filteredSoal.length)} of {filteredSoal.length} entries
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded text-xs font-bold border transition ${
                    currentPage === i + 1
                      ? 'bg-[#337ab7] text-white border-[#2e6da4]'
                      : 'border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODAL EDIT SOAL */}
      {modalEditSoalOpen && editingSoal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-md shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#337ab7] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Edit Butir Soal #{editingSoal.nomorUrut || 1}</h3>
              <button
                type="button"
                onClick={() => setModalEditSoalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSoal} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipe Soal
                  </label>
                  <select
                    value={editTipeSoal}
                    onChange={(e) => setEditTipeSoal(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="PG">Pilihan Ganda</option>
                    <option value="PG_KOMPLEKS">Pilihan Ganda Kompleks</option>
                    <option value="ISIAN">Isian Singkat</option>
                    <option value="ESAI">Esai / Uraian</option>
                    <option value="BENAR_SALAH">Benar / Salah</option>
                    <option value="MENJODOHKAN">Menjodohkan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bobot / Skor
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editBobot}
                    onChange={(e) => setEditBobot(parseFloat(e.target.value) || 1.0)}
                    className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Teks Pertanyaan Soal (Mendukung HTML & KaTeX $...$)
                </label>
                <textarea
                  rows={5}
                  required
                  value={editPertanyaan}
                  onChange={(e) => setEditPertanyaan(e.target.value)}
                  className="w-full p-3 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setModalEditSoalOpen(false)}
                  className="px-4 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSoal}
                  className="px-5 py-1.5 rounded bg-[#337ab7] hover:bg-[#286090] text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSoal ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL EDIT JAWABAN */}
      {modalEditJawabanOpen && selectedSoalForJawaban && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-md shadow-2xl max-w-3xl w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#337ab7] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>Kelola Jawaban Soal #{selectedSoalForJawaban.nomorUrut || 1}</span>
                <span className="px-2 py-0.5 rounded bg-white/20 text-xs font-normal">
                  {selectedSoalForJawaban.tipeSoal}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setModalEditJawabanOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Pertanyaan:
                </span>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MathRenderer content={selectedSoalForJawaban.pertanyaan} />
                </div>
              </div>

              {['PG', 'PG_KOMPLEKS', 'BENAR_SALAH'].includes(selectedSoalForJawaban.tipeSoal) ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-white">
                      Daftar Pilihan Jawaban:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
                        const nextLabel = labels[opsiList.length] || `Opsi ${opsiList.length + 1}`
                        setOpsiList([...opsiList, { label: nextLabel, konten: '', isBenar: false }])
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Tambah Pilihan
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {opsiList.map((opsi, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded border transition flex items-start gap-2.5 ${
                          opsi.isBenar
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...opsiList]
                            if (selectedSoalForJawaban.tipeSoal === 'PG' || selectedSoalForJawaban.tipeSoal === 'BENAR_SALAH') {
                              updated.forEach((o, i) => (o.isBenar = i === idx))
                            } else {
                              updated[idx].isBenar = !updated[idx].isBenar
                            }
                            setOpsiList(updated)
                          }}
                          className={`w-7 h-7 rounded font-bold text-xs shrink-0 flex items-center justify-center cursor-pointer transition ${
                            opsi.isBenar
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                          }`}
                          title={opsi.isBenar ? 'Kunci Jawaban Benar' : 'Klik untuk jadikan Kunci'}
                        >
                          {opsi.label}
                        </button>

                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={opsi.konten}
                            onChange={(e) => {
                              const updated = [...opsiList]
                              updated[idx].konten = e.target.value
                              setOpsiList(updated)
                            }}
                            placeholder={`Teks pilihan ${opsi.label}...`}
                            className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {opsi.isBenar && (
                          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold shrink-0 self-center">
                            BENAR
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (opsiList.length <= 2) {
                              showNotification('Peringatan', 'Minimal harus ada 2 opsi jawaban', 'warning')
                              return
                            }
                            setOpsiList(opsiList.filter((_, i) => i !== idx))
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition shrink-0 self-center"
                          title="Hapus Opsi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-white">
                    {selectedSoalForJawaban.tipeSoal === 'ISIAN'
                      ? 'Kunci Jawaban Isian Singkat:'
                      : 'Rubrik Penilaian Esai:'}
                  </label>
                  <textarea
                    rows={4}
                    value={kunciJawabanTeks}
                    onChange={(e) => setKunciJawabanTeks(e.target.value)}
                    className="w-full p-3 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalEditJawabanOpen(false)}
                className="px-4 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={savingJawaban}
                onClick={handleSaveEditJawaban}
                className="px-5 py-1.5 rounded bg-[#337ab7] hover:bg-[#286090] text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingJawaban ? 'Menyimpan...' : 'Simpan Jawaban'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
