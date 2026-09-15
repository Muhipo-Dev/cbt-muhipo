'use client'

import React, { useState, useEffect } from 'react'
import {
  Upload,
  Image as ImageIcon,
  Music,
  FileText,
  Trash2,
  Copy,
  Check,
  Search,
  RefreshCw,
  FolderOpen,
  Eye,
  Film,
} from 'lucide-react'

interface ModulFileManagerViewProps {
  showNotification: (title: string, message: string, type?: any) => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}

export function ModulFileManagerView({
  showNotification,
  showConfirm,
}: ModulFileManagerViewProps) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'image' | 'audio' | 'video' | 'doc'>('ALL')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [previewMedia, setPreviewMedia] = useState<any | null>(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/files')
      const json = await res.json()
      if (json.success) {
        setFiles(json.data || [])
      }
    } catch (err: any) {
      console.error('Fetch files error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    const formData = new FormData()
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i])
    }

    try {
      setUploading(true)
      const res = await fetch('/api/admin/files', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Berhasil', json.message || 'File berhasil diunggah!', 'success')
        fetchFiles()
      } else {
        showNotification('Gagal', json.message || 'Gagal mengunggah file.', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal upload: ' + err.message, 'error')
    } finally {
      setUploading(false)
      // reset file input
      e.target.value = ''
    }
  }

  const handleDeleteFile = (file: any) => {
    showConfirm(
      'Hapus File Media?',
      `Apakah Anda yakin ingin menghapus file "${file.name}"? Tautan gambar/audio di soal yang menggunakannya mungkin tidak akan dapat diakses lagi.`,
      async () => {
        try {
          const res = await fetch(`/api/admin/files?fileName=${encodeURIComponent(file.name)}`, {
            method: 'DELETE',
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', 'File berhasil dihapus.', 'success')
            fetchFiles()
            if (previewMedia?.name === file.name) setPreviewMedia(null)
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus file.', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal menghapus file: ' + err.message, 'error')
        }
      }
    )
  }

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2500)
    showNotification('Tersalin', `URL media '${url}' berhasil disalin ke clipboard!`, 'success')
  }

  const filtered = files.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'ALL' || f.type === filterType
    return matchSearch && matchType
  })

  return (
    <div className="space-y-4">
      {/* Header & Upload Area */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-500" />
            <span>File Manager Media & Aset CBT</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unggah dan kelola gambar grafik, diagram, dan audio listening untuk disalin langsung ke lembar butir soal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/30 transition cursor-pointer">
            <Upload className={`w-4 h-4 ${uploading ? 'animate-spin' : ''}`} />
            <span>{uploading ? 'Mengunggah...' : 'Unggah File Media'}</span>
            <input
              type="file"
              multiple
              accept="image/*,audio/*,video/*,.pdf"
              onChange={handleUploadFiles}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={fetchFiles}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
            title="Muat Ulang File"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama file media..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['ALL', 'image', 'audio', 'video', 'doc'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100'
              }`}
            >
              {t === 'ALL'
                ? 'Semua'
                : t === 'image'
                ? 'Gambar'
                : t === 'audio'
                ? 'Audio'
                : t === 'video'
                ? 'Video'
                : 'Dokumen'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Cards of Files */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs font-medium">Memuat berkas file media...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-12 text-center text-slate-400 text-xs space-y-2">
          <FolderOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p>Belum ada file media yang diunggah. Klik tombol "Unggah File Media" di atas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((file) => {
            const isImage = file.type === 'image'
            const isAudio = file.type === 'audio'
            const isVideo = file.type === 'video'

            return (
              <div
                key={file.name}
                className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 shadow-sm backdrop-blur-xl flex flex-col justify-between space-y-3 hover:border-blue-400 dark:hover:border-blue-500/50 transition group"
              >
                {/* Media Preview Box */}
                <div
                  onClick={() => setPreviewMedia(file)}
                  className="w-full h-32 rounded-xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-200/60 dark:border-white/5 cursor-pointer relative"
                >
                  {isImage ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-contain p-1 group-hover:scale-105 transition"
                    />
                  ) : isAudio ? (
                    <div className="flex flex-col items-center gap-2 text-purple-500">
                      <Music className="w-8 h-8 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-400">Audio Listening</span>
                    </div>
                  ) : isVideo ? (
                    <div className="flex flex-col items-center gap-2 text-blue-500">
                      <Film className="w-8 h-8" />
                      <span className="text-[10px] font-bold text-slate-400">Video MP4</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileText className="w-8 h-8" />
                      <span className="text-[10px] font-bold">{file.ext}</span>
                    </div>
                  )}
                </div>

                {/* File Information */}
                <div className="space-y-1">
                  <p
                    className="text-xs font-bold text-slate-900 dark:text-white truncate"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{file.sizeFormatted}</span>
                    <span className="uppercase text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                      {file.type}
                    </span>
                  </div>
                </div>

                {/* Inline Audio Player jika Audio */}
                {isAudio && (
                  <audio controls className="w-full h-8 mt-1" src={file.url}>
                    Your browser does not support audio.
                  </audio>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => handleCopy(file.url)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center gap-1 hover:bg-blue-100 transition cursor-pointer"
                    title="Salin URL untuk ditempel ke pertanyaan soal"
                  >
                    {copiedUrl === file.url ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteFile(file)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition cursor-pointer"
                    title="Hapus File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Preview Media */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-2xl w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-white truncate max-w-md">
                {previewMedia.name}
              </span>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/10"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="max-h-[500px] flex items-center justify-center overflow-auto">
              {previewMedia.type === 'image' ? (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.name}
                  className="max-h-[450px] w-auto rounded-xl object-contain"
                />
              ) : previewMedia.type === 'audio' ? (
                <div className="w-full p-6 text-center space-y-4">
                  <Music className="w-16 h-16 text-purple-400 mx-auto animate-pulse" />
                  <audio controls autoPlay className="w-full" src={previewMedia.url} />
                </div>
              ) : previewMedia.type === 'video' ? (
                <video controls autoPlay className="w-full max-h-[450px] rounded-xl" src={previewMedia.url} />
              ) : (
                <div className="p-8 text-center text-slate-300 text-xs">
                  Format berkas: {previewMedia.ext}. Tautan: <b>{previewMedia.url}</b>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-xs text-slate-400">{previewMedia.sizeFormatted}</span>
              <button
                type="button"
                onClick={() => handleCopy(previewMedia.url)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Path URL</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
