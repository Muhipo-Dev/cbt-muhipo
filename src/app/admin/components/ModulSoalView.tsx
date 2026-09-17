'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Save,
  RotateCcw,
  RefreshCw,
  Search,
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
  Quote,
  Table as TableIcon,
  Image as ImageIcon,
  Music,
  Code,
  Sigma,
  Omega,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  X,
  Volume2,
  Home,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Eye,
  Calculator,
  HelpCircle,
  BookOpen,
  Upload,
  Link as LinkIcon,
  ArrowRight,
} from 'lucide-react'
import { MathRenderer } from '@/components/MathRenderer'

interface ModulSoalViewProps {
  mapelList?: any[]
  bankSoalList?: any[] // Alias kompatibilitas
  modulList?: any[]
  selectedMapelId?: string
  onSelectMapel?: (id: string) => void
  onNavigateToTopik?: () => void
  onNavigateToDaftarSoal?: (id?: string) => void
  showNotification: (title: string, message: string, type?: any) => void
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void
}

export function ModulSoalView({
  mapelList,
  bankSoalList,
  modulList = [],
  selectedMapelId,
  onSelectMapel,
  onNavigateToTopik,
  onNavigateToDaftarSoal,
  showNotification,
  showConfirm,
}: ModulSoalViewProps) {
  const items = mapelList && mapelList.length > 0 ? mapelList : bankSoalList || []

  // Ambil list modul unik
  const rawModulNames = Array.from(
    new Set([
      'SEMUA',
      'Default',
      ...(modulList || []).map((m: any) => m.nama),
      ...(items || []).map((m: any) => m.namaModul || m.modul?.nama).filter(Boolean),
    ])
  )

  const [selectedModul, setSelectedModul] = useState<string>('SEMUA')

  // Topik yang difilter berdasarkan modul terpilih
  const filteredMapelByModul = items.filter((m: any) => {
    if (selectedModul === 'SEMUA') return true
    const itemModul = m.namaModul || m.modul?.nama || 'Default'
    return itemModul.toLowerCase() === selectedModul.toLowerCase()
  })

  const [activeMapelId, setActiveMapelId] = useState(
    selectedMapelId || filteredMapelByModul[0]?.id || items[0]?.id || ''
  )
  const [mapelData, setMapelData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)

  // Search & Pagination in Daftar Soal Table
  const [searchQuery, setSearchQuery] = useState('')
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // Form State
  const [editingSoalId, setEditingSoalId] = useState<string | null>(null)
  const [pertanyaan, setPertanyaan] = useState('')
  const [mediaAudio, setMediaAudio] = useState('')
  const [putarSekali, setPutarSekali] = useState<'0' | '1'>('0')
  const [tipeSoal, setTipeSoal] = useState('PG')
  const [tingkatKesulitan, setTingkatKesulitan] = useState('1')
  const [bobot, setBobot] = useState(1.0)
  const [isSourceMode, setIsSourceMode] = useState(false)

  // KaTeX Assistant & Live Preview
  const [showKatexAssistant, setShowKatexAssistant] = useState(true)
  const [showArabicAssistant, setShowArabicAssistant] = useState(false)
  const [showJavaneseAssistant, setShowJavaneseAssistant] = useState(false)
  const [showLivePreview, setShowLivePreview] = useState(true)
  const [katexModalOpen, setKatexModalOpen] = useState(false)
  const [customKatexInput, setCustomKatexInput] = useState('')
  const [katexTarget, setKatexTarget] = useState<{
    type: 'pertanyaan' | 'opsi' | 'matching_left' | 'matching_right'
    index?: number
  }>({ type: 'pertanyaan' })

  // Kelola Jawaban Modal State
  const [modalJawabanOpen, setModalJawabanOpen] = useState(false)
  const [currentSoalJawaban, setCurrentSoalJawaban] = useState<any | null>(null)
  const [opsiList, setOpsiList] = useState<{ id?: string; label: string; konten: string; isBenar: boolean }[]>([])
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>([])
  const [kunciJawabanTeks, setKunciJawabanTeks] = useState('')
  const [savingJawaban, setSavingJawaban] = useState(false)
  const [uploadingTarget, setUploadingTarget] = useState<{
    type: 'pertanyaan' | 'opsi' | 'matching_left' | 'matching_right'
    index?: number
  } | null>(null)

  const editorRef = useRef<HTMLDivElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const mediaUploadInputRef = useRef<HTMLInputElement>(null)

  // Sync selectedMapelId
  useEffect(() => {
    if (selectedMapelId) {
      setActiveMapelId(selectedMapelId)
    } else if (filteredMapelByModul.length > 0 && !activeMapelId) {
      setActiveMapelId(filteredMapelByModul[0].id)
    }
  }, [selectedMapelId, items])

  // Sync when modul changes
  useEffect(() => {
    if (filteredMapelByModul.length > 0) {
      const exists = filteredMapelByModul.some((m) => m.id === activeMapelId)
      if (!exists) {
        setActiveMapelId(filteredMapelByModul[0].id)
        if (onSelectMapel) onSelectMapel(filteredMapelByModul[0].id)
      }
    }
  }, [selectedModul])

  // Fetch Topic Data
  useEffect(() => {
    if (activeMapelId) {
      fetchMapelDetail(activeMapelId)
    }
  }, [activeMapelId])

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

  // Active topic object
  const currentTopic = items.find((it) => it.id === activeMapelId) || mapelData || {
    id: '',
    nama: 'Bahasa Indonesia dan Literasi',
    kode: 'Default',
  }
  const topicDisplayName = currentTopic
    ? `${currentTopic.kode ? currentTopic.kode + ' - ' : ''}${currentTopic.nama || 'Topik'}`
    : 'Topik Terpilih'

  // Automatic Math & Science Topic Detection
  const isMathTopic = useMemo(() => {
    const textToCheck = `${currentTopic?.nama || ''} ${currentTopic?.kode || ''}`.toLowerCase()
    return /matematika|mtk|math|numerasi|kalkulus|aljabar|geometri|fisika|kimia|ipa|science/i.test(textToCheck)
  }, [currentTopic])

  // Auto enable KaTeX Assistant and Live Preview when Math topic is detected
  useEffect(() => {
    if (isMathTopic) {
      setShowKatexAssistant(true)
      setShowLivePreview(true)
    }
  }, [isMathTopic])

  // Reset form
  const handleResetForm = () => {
    setEditingSoalId(null)
    setPertanyaan('')
    setMediaAudio('')
    setPutarSekali('0')
    setTipeSoal('PG')
    setTingkatKesulitan('1')
    setBobot(1.0)
    setIsSourceMode(false)
    if (editorRef.current) {
      editorRef.current.innerHTML = ''
    }
    if (audioInputRef.current) {
      audioInputRef.current.value = ''
    }
  }

  // Edit existing soal in question creator
  const handleEditSoal = (soal: any) => {
    setEditingSoalId(soal.id)
    setPertanyaan(soal.pertanyaan || '')
    setMediaAudio(soal.mediaAudio || '')
    setTipeSoal(soal.tipeSoal || 'PG')
    setTingkatKesulitan(String(soal.tingkatKesulitan || 1))
    setBobot(Number(soal.bobot) || 1.0)
    setIsSourceMode(false)

    if (editorRef.current) {
      editorRef.current.innerHTML = soal.pertanyaan || ''
    }

    const editorCard = document.getElementById('card-editor-soal')
    if (editorCard) {
      editorCard.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Open Kelola Jawaban Modal
  const handleOpenKelolaJawaban = (soal: any) => {
    setCurrentSoalJawaban(soal)
    setKunciJawabanTeks(soal.kunciJawabanTeks || '')

    // Handle Menjodohkan
    if (soal.tipeSoal === 'MENJODOHKAN') {
      let pairs: { left: string; right: string }[] = []
      try {
        if (soal.matchingData) {
          pairs = typeof soal.matchingData === 'string' ? JSON.parse(soal.matchingData) : soal.matchingData
        }
      } catch (e) {
        pairs = []
      }
      if (!Array.isArray(pairs) || pairs.length === 0) {
        pairs = [
          { left: '', right: '' },
          { left: '', right: '' },
          { left: '', right: '' },
          { left: '', right: '' },
        ]
      }
      setMatchingPairs(pairs)
    }

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
    setModalJawabanOpen(true)
  }

  // Insert text/formula/media helper for any target
  const insertTextToTarget = (
    text: string,
    target?: {
      type: 'pertanyaan' | 'opsi' | 'matching_left' | 'matching_right'
      index?: number
    }
  ) => {
    const t = target || katexTarget
    if (t.type === 'pertanyaan') {
      insertTextAtCursor(text)
    } else if (t.type === 'opsi' && typeof t.index === 'number') {
      setOpsiList((prev) => {
        const next = [...prev]
        if (next[t.index!]) {
          const cur = next[t.index!].konten || ''
          next[t.index!].konten = cur ? `${cur} ${text}` : text
        }
        return next
      })
    } else if (t.type === 'matching_left' && typeof t.index === 'number') {
      setMatchingPairs((prev) => {
        const next = [...prev]
        if (next[t.index!]) {
          const cur = next[t.index!].left || ''
          next[t.index!].left = cur ? `${cur} ${text}` : text
        }
        return next
      })
    } else if (t.type === 'matching_right' && typeof t.index === 'number') {
      setMatchingPairs((prev) => {
        const next = [...prev]
        if (next[t.index!]) {
          const cur = next[t.index!].right || ''
          next[t.index!].right = cur ? `${cur} ${text}` : text
        }
        return next
      })
    }
  }

  // Handle direct file upload for target option/question
  const handleMediaUploadForTarget = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadingTarget) return

    const formData = new FormData()
    formData.append('files', file)

    try {
      showNotification('Mengunggah', `Sedang mengunggah ${file.name}...`, 'info')
      const res = await fetch('/api/admin/files', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      let fileUrl = ''
      if (json.success && json.data?.[0]?.url) {
        fileUrl = json.data[0].url
      } else if (json.uploadedFiles?.[0]?.url) {
        fileUrl = json.uploadedFiles[0].url
      } else {
        fileUrl = `/uploads/${file.name}`
      }

      const isImg = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
      const isAudio = /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name)
      const snippet = isImg
        ? `![${file.name}](${fileUrl}) `
        : isAudio
        ? `[Audio: ${file.name}](${fileUrl}) `
        : `[File: ${file.name}](${fileUrl}) `

      insertTextToTarget(snippet, uploadingTarget)
      showNotification('Berhasil', `Media ${file.name} berhasil diunggah dan disisipkan!`, 'success')
    } catch (err: any) {
      showNotification('Error', 'Gagal mengunggah media: ' + err.message, 'error')
    } finally {
      setUploadingTarget(null)
      if (mediaUploadInputRef.current) mediaUploadInputRef.current.value = ''
    }
  }

  // Trigger file picker for specific target
  const triggerMediaUpload = (target: {
    type: 'pertanyaan' | 'opsi' | 'matching_left' | 'matching_right'
    index?: number
  }) => {
    setUploadingTarget(target)
    setTimeout(() => {
      mediaUploadInputRef.current?.click()
    }, 50)
  }

  // Prompt for media URL for specific target
  const promptMediaUrl = (target: {
    type: 'pertanyaan' | 'opsi' | 'matching_left' | 'matching_right'
    index?: number
  }) => {
    const url = prompt('Masukkan URL Gambar / Media (contoh: /uploads/foto.jpg atau https://...):')
    if (url && url.trim()) {
      const cleanUrl = url.trim()
      const isImg = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(cleanUrl) || cleanUrl.includes('image') || cleanUrl.includes('/uploads/')
      const snippet = isImg ? `![Gambar](${cleanUrl}) ` : `${cleanUrl} `
      insertTextToTarget(snippet, target)
    }
  }

  // Rich Text Editor Command Helpers
  const execEditorCommand = (command: string, value: string | undefined = undefined) => {
    if (isSourceMode) return
    document.execCommand(command, false, value)
    if (editorRef.current) {
      setPertanyaan(editorRef.current.innerHTML)
    }
  }

  const insertTextAtCursor = (text: string) => {
    if (isSourceMode) {
      setPertanyaan((prev) => prev + text)
      return
    }
    if (editorRef.current) {
      editorRef.current.focus()
    }
    document.execCommand('insertHTML', false, text)
    if (editorRef.current) {
      setPertanyaan(editorRef.current.innerHTML)
    }
  }

  // Quick KaTeX Formula Templates
  const katexQuickTemplates = [
    { label: 'Pecahan', snippet: '$\\frac{a}{b}$ ', preview: 'a/b' },
    { label: 'Akar', snippet: '$\\sqrt{x}$ ', preview: '√x' },
    { label: 'Akar-n', snippet: '$\\sqrt[n]{x}$ ', preview: 'ⁿ√x' },
    { label: 'Pangkat', snippet: '$x^{2}$ ', preview: 'x²' },
    { label: 'Indeks', snippet: '$x_{1}$ ', preview: 'x₁' },
    { label: 'Perkalian', snippet: '$\\times$ ', preview: '×' },
    { label: 'Pembagian', snippet: '$\\div$ ', preview: '÷' },
    { label: 'Plus-Minus', snippet: '$\\pm$ ', preview: '±' },
    { label: 'Tidak Sama', snippet: '$\\neq$ ', preview: '≠' },
    { label: 'Kurang Dari / Sama', snippet: '$\\le$ ', preview: '≤' },
    { label: 'Lebih Dari / Sama', snippet: '$\\ge$ ', preview: '≥' },
    { label: 'Derajat', snippet: '$^\\circ$ ', preview: '°' },
    { label: 'Integral', snippet: '$\\int_{a}^{b} f(x) \\, dx$ ', preview: '∫' },
    { label: 'Sigma', snippet: '$\\sum_{i=1}^{n} x_i$ ', preview: '∑' },
    { label: 'Limit', snippet: '$\\lim_{x \\to 0}$ ', preview: 'lim' },
    { label: 'Trigonometri', snippet: '$\\sin(x) + \\cos(x) = 1$ ', preview: 'sin/cos' },
    { label: 'Logaritma', snippet: '$\\log_{a}(b)$ ', preview: 'log' },
    { label: 'Matriks 2x2', snippet: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$ ', preview: '[a b; c d]' },
    { label: 'Alpha (α)', snippet: '$\\alpha$ ', preview: 'α' },
    { label: 'Beta (β)', snippet: '$\\beta$ ', preview: 'β' },
    { label: 'Theta (θ)', snippet: '$\\theta$ ', preview: 'θ' },
    { label: 'Pi (π)', snippet: '$\\pi$ ', preview: 'π' },
    { label: 'Delta (Δ)', snippet: '$\\Delta$ ', preview: 'Δ' },
    { label: 'Omega (Ω)', snippet: '$\\Omega$ ', preview: 'Ω' },
  ]

  // Quick Arabic Characters & Harakat Templates
  const arabicQuickTemplates = [
    { label: 'Bismillah', snippet: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ ' },
    { label: 'Fathah', snippet: ' \u064E' },
    { label: 'Kasrah', snippet: ' \u0650' },
    { label: 'Dhammah', snippet: ' \u064F' },
    { label: 'Fathatain', snippet: ' \u064B' },
    { label: 'Kasratain', snippet: ' \u064D' },
    { label: 'Dhammatain', snippet: ' \u064C' },
    { label: 'Sukun', snippet: ' \u0652' },
    { label: 'Tasydid', snippet: ' \u0651' },
    { label: 'Tanda Ayat', snippet: ' ۝ ' },
    { label: 'Alif Khanjariyah', snippet: '\u0670' },
    { label: 'Hamzah', snippet: 'ء' },
    { label: 'Ta Marbuthah', snippet: 'ة' },
    { label: 'Alif Maqshurah', snippet: 'ى' },
    { label: 'Tanda Tanya Arab', snippet: '؟' },
    { label: 'Koma Arab', snippet: '،' },
    { label: 'Titik Koma Arab', snippet: '؛' },
  ]

  // Quick Aksara Jawa Unicode Templates (Hanacaraka & Sandhangan)
  const javaneseQuickTemplates = [
    { label: 'Ha', char: 'ꦲ' },
    { label: 'Na', char: 'ꦤ' },
    { label: 'Ca', char: 'ꦕ' },
    { label: 'Ra', char: 'ꦫ' },
    { label: 'Ka', char: 'ꦏ' },
    { label: 'Da', char: 'ꦢ' },
    { label: 'Ta', char: 'ꦠ' },
    { label: 'Sa', char: 'ꦱ' },
    { label: 'Wa', char: 'ꦮ' },
    { label: 'La', char: 'ꦭ' },
    { label: 'Pa', char: 'ꦥ' },
    { label: 'Dha', char: 'ꦝ' },
    { label: 'Ja', char: 'ꦗ' },
    { label: 'Ya', char: 'ꦪ' },
    { label: 'Nya', char: 'ꦚ' },
    { label: 'Ma', char: 'ꦩ' },
    { label: 'Ga', char: 'ꦒ' },
    { label: 'Ba', char: 'ꦧ' },
    { label: 'Tha', char: 'ꦛ' },
    { label: 'Nga', char: 'ꦔ' },
    { label: 'Pangkon (Mati)', char: '꧀' },
    { label: 'Wulu (i)', char: 'ꦶ' },
    { label: 'Suku (u)', char: 'ꦸ' },
    { label: 'Taling (e)', char: 'ꦺ' },
    { label: 'Pepet (ê)', char: 'ꦼ' },
    { label: 'Taling Tarung (o)', char: 'ꦺꦴ' },
    { label: 'Wignyan (h)', char: 'ꦃ' },
    { label: 'Layar (r)', char: 'ꦂ' },
    { label: 'Cecak (ng)', char: 'ꦁ' },
    { label: 'Pada Adeg (Awal)', char: '꧋' },
    { label: 'Pada Lingsa (Koma)', char: '꧈' },
    { label: 'Pada Lungsi (Titik)', char: '꧉' },
  ]

  // Upload Audio Handler
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('files', file)

    try {
      setUploadingAudio(true)
      const res = await fetch('/api/admin/files', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.success && json.uploadedFiles?.[0]?.url) {
        setMediaAudio(json.uploadedFiles[0].url)
        showNotification('Berhasil', 'File audio berhasil diunggah!', 'success')
      } else {
        setMediaAudio(`/uploads/${file.name}`)
        showNotification('Informasi', 'File audio ditautkan: ' + file.name, 'info')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal mengunggah audio: ' + err.message, 'error')
    } finally {
      setUploadingAudio(false)
    }
  }

  // Save Soal Handler
  const handleSaveSoal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!activeMapelId) {
      showNotification('Peringatan', 'Pilih Topik terlebih dahulu', 'warning')
      return
    }

    const finalPertanyaan = isSourceMode ? pertanyaan : (editorRef.current?.innerHTML || pertanyaan).trim()
    if (!finalPertanyaan || finalPertanyaan === '<p><br></p>' || finalPertanyaan === '<br>') {
      showNotification('Peringatan', 'Teks pertanyaan soal wajib diisi!', 'warning')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SOAL',
          mataPelajaranId: activeMapelId,
          soalId: editingSoalId || undefined,
          tipeSoal,
          pertanyaan: finalPertanyaan,
          bobot: Number(bobot) || 1.0,
          mediaAudio: mediaAudio || null,
          mediaGambar: null,
          opsiJawaban:
            ['PG', 'PG_KOMPLEKS', 'BENAR_SALAH'].includes(tipeSoal) && !editingSoalId
              ? [
                  { label: 'A', konten: 'Pilihan Jawaban A', isBenar: true },
                  { label: 'B', konten: 'Pilihan Jawaban B', isBenar: false },
                  { label: 'C', konten: 'Pilihan Jawaban C', isBenar: false },
                  { label: 'D', konten: 'Pilihan Jawaban D', isBenar: false },
                  { label: 'E', konten: 'Pilihan Jawaban E', isBenar: false },
                ]
              : undefined,
        }),
      })

      const json = await res.json()
      if (json.success) {
        showNotification('Berhasil', 'Data soal berhasil disimpan!', 'success')
        await fetchMapelDetail(activeMapelId)

        const savedSoal = json.data
        handleResetForm()

        if (['PG', 'PG_KOMPLEKS', 'BENAR_SALAH', 'MENJODOHKAN'].includes(tipeSoal) && savedSoal) {
          handleOpenKelolaJawaban(savedSoal)
        }
      } else {
        showNotification('Gagal', json.message || 'Gagal menyimpan soal', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal menyimpan soal: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete Soal Handler
  const handleDeleteSoal = async (soalId: string) => {
    const doDelete = async () => {
      try {
        const res = await fetch('/api/guru/soal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'DELETE_SOAL', soalId, mataPelajaranId: activeMapelId }),
        })
        const json = await res.json()
        if (json.success) {
          showNotification('Berhasil', 'Soal berhasil dihapus', 'success')
          fetchMapelDetail(activeMapelId)
          if (editingSoalId === soalId) handleResetForm()
        } else {
          showNotification('Gagal', json.message || 'Gagal menghapus soal', 'error')
        }
      } catch (err: any) {
        showNotification('Error', 'Gagal menghapus soal: ' + err.message, 'error')
      }
    }

    if (showConfirm) {
      showConfirm('Hapus Soal', 'Apakah Anda yakin ingin menghapus butir soal ini beserta jawabannya?', doDelete)
    } else if (confirm('Apakah Anda yakin ingin menghapus butir soal ini?')) {
      doDelete()
    }
  }

  // Save Jawaban (Modal) Handler
  const handleSaveJawabanModal = async () => {
    if (!currentSoalJawaban) return

    try {
      setSavingJawaban(true)
      const isMatching = currentSoalJawaban.tipeSoal === 'MENJODOHKAN'
      const isChoice = ['PG', 'PG_KOMPLEKS', 'BENAR_SALAH'].includes(currentSoalJawaban.tipeSoal)

      const validPairs = matchingPairs.filter((p) => p.left.trim() || p.right.trim())

      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SOAL',
          mataPelajaranId: activeMapelId,
          soalId: currentSoalJawaban.id,
          nomorUrut: currentSoalJawaban.nomorUrut,
          tipeSoal: currentSoalJawaban.tipeSoal,
          pertanyaan: currentSoalJawaban.pertanyaan,
          bobot: currentSoalJawaban.bobot,
          mediaAudio: currentSoalJawaban.mediaAudio,
          mediaGambar: currentSoalJawaban.mediaGambar,
          kunciJawabanTeks: kunciJawabanTeks,
          opsiJawaban: isChoice ? opsiList : undefined,
          matchingData: isMatching ? JSON.stringify(validPairs) : undefined,
        }),
      })

      const json = await res.json()
      if (json.success) {
        showNotification('Berhasil', 'Pilihan jawaban / pasangan berhasil disimpan!', 'success')
        setModalJawabanOpen(false)
        fetchMapelDetail(activeMapelId)
      } else {
        showNotification('Gagal', json.message || 'Gagal menyimpan jawaban', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal menyimpan jawaban: ' + err.message, 'error')
    } finally {
      setSavingJawaban(false)
    }
  }

  // Filter & Pagination for Soal List
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
            Mengelola Soal
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
              Mengelola soal berdasarkan modul dan topik
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>Home</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">Soal</span>
        </div>
      </div>

      {/* 2. CARD 1: PILIH MODUL & TOPIK */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">Pilih Modul & Topik Mata Pelajaran</h2>
          {isMathTopic && (
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium flex items-center gap-1 border border-indigo-200 dark:border-indigo-800">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Rekomendasi: Format KaTeX didukung untuk topik matematika ini</span>
            </span>
          )}
        </div>
        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* 1. Pilih Modul */}
            <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                1. Pilih Modul:
              </label>
              <select
                value={selectedModul}
                onChange={(e) => {
                  setSelectedModul(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-3 py-2 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
              >
                {rawModulNames.map((modName) => (
                  <option key={modName} value={modName}>
                    {modName === 'SEMUA' ? '-- Semua Modul --' : `Modul: ${modName}`}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Pilih Topik dalam Modul */}
            <div className="md:col-span-8 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                2. Pilih Topik Mata Pelajaran ({filteredMapelByModul.length}):
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={activeMapelId}
                  onChange={(e) => {
                    const newId = e.target.value
                    setActiveMapelId(newId)
                    if (onSelectMapel) onSelectMapel(newId)
                    handleResetForm()
                  }}
                  className="flex-1 px-3 py-2 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                >
                  {filteredMapelByModul.length === 0 && <option value="">(Belum ada topik pada modul ini)</option>}
                  {filteredMapelByModul.map((bs) => {
                    const itemModul = bs.namaModul || bs.modul?.nama || 'Default'
                    const isArchived = bs.status === 'NONAKTIF'
                    return (
                      <option key={bs.id} value={bs.id}>
                        {isArchived ? '[ARSIP] ' : ''}{bs.kode || bs.kodeBank || 'Default'} - {bs.nama} [{itemModul}]
                      </option>
                    )
                  })}
                </select>

                <div className="flex items-center gap-2 shrink-0">
                  {onNavigateToTopik && (
                    <button
                      type="button"
                      onClick={onNavigateToTopik}
                      className="px-3 py-2 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>Kelola Topik</span>
                    </button>
                  )}
                  {onNavigateToDaftarSoal && (
                    <button
                      type="button"
                      onClick={() => onNavigateToDaftarSoal(activeMapelId)}
                      className="px-3 py-2 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Daftar Soal</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Pilih <strong>Modul</strong> dan <strong>Topik</strong> sebelum menulis atau mengedit butir soal. Anda dapat membuat topik mapel baru melalui tombol <strong>Kelola Topik</strong>.
          </p>
        </div>
      </div>

      {/* 3. CARD 2: MENGELOLA SOAL [NAMA TOPIK] */}
      <div
        id="card-editor-soal"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden"
      >
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">
            {editingSoalId ? `Edit Soal: ${topicDisplayName}` : `Mengelola Soal ${topicDisplayName}`}
          </h2>
          <div className="flex items-center gap-2">
            {isMathTopic && (
              <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                <Sigma className="w-3 h-3 text-indigo-600" />
                <span>Mode Formula KaTeX Aktif</span>
              </span>
            )}
            {editingSoalId && (
              <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[11px] font-bold border border-amber-300 dark:border-amber-700">
                Sedang Mengedit Soal
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveSoal} className="p-4 sm:p-6 space-y-4">
          {/* Row 1: Soal Editor */}
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="sm:w-44 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 pt-2">
              Soal
            </label>
            <div className="flex-1 space-y-2">
              {/* WYSIWYG Toolbar */}
              <div className="border border-slate-300 dark:border-white/20 rounded-t-md bg-slate-100 dark:bg-slate-800/90 p-1.5 flex flex-wrap items-center gap-1 text-slate-700 dark:text-slate-200 select-none">
                {/* Source toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (isSourceMode && editorRef.current) {
                      editorRef.current.innerHTML = pertanyaan
                    } else if (!isSourceMode && editorRef.current) {
                      setPertanyaan(editorRef.current.innerHTML)
                    }
                    setIsSourceMode(!isSourceMode)
                  }}
                  className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 border ${
                    isSourceMode
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-50'
                  }`}
                  title="Source HTML"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Source</span>
                </button>

                <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-600 mx-0.5" />

                {/* Text Formatting */}
                <button
                  type="button"
                  onClick={() => execEditorCommand('bold')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Tebal (Bold)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('italic')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Miring (Italic)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('underline')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Garis Bawah (Underline)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('strikeThrough')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Coret (Strikethrough)"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('subscript')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Subscript (X₂)"
                >
                  <Subscript className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('superscript')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Superscript (X²)"
                >
                  <Superscript className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-600 mx-0.5" />

                {/* Alignment */}
                <button
                  type="button"
                  onClick={() => execEditorCommand('justifyLeft')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Rata Kiri"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('justifyCenter')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Rata Tengah"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('justifyRight')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Rata Kanan"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('justifyFull')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Rata Kanan Kiri (Justify)"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-600 mx-0.5" />

                {/* Lists & Quotes */}
                <button
                  type="button"
                  onClick={() => execEditorCommand('insertOrderedList')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Daftar Bernomor"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('insertUnorderedList')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Daftar Simbol"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('formatBlock', '<blockquote>')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Kutipan (Quote)"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-600 mx-0.5" />

                {/* Inserts: Table, Image, Math KaTeX Dialog, Omega */}
                <button
                  type="button"
                  onClick={() => {
                    const imgUrl = prompt('Masukkan URL Gambar (atau path dari File Manager /uploads/...):')
                    if (imgUrl) {
                      insertTextAtCursor(`<img src="${imgUrl}" alt="Gambar Soal" style="max-width:100%; height:auto; margin:8px 0; border-radius:4px;" />`)
                    }
                  }}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Sisipkan Gambar (URL/Upload)"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </button>

                {/* KaTeX Math Assistant Button */}
                <button
                  type="button"
                  onClick={() => setKatexModalOpen(true)}
                  className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1 border border-indigo-200 dark:border-indigo-800 cursor-pointer shadow-2xs"
                  title="Buka Generator Rumus KaTeX (Rekomendasi)"
                >
                  <Sigma className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>KaTeX Formula</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowKatexAssistant(!showKatexAssistant)}
                  className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 border cursor-pointer transition ${
                    showKatexAssistant
                      ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50'
                  }`}
                  title="Tampilkan / Sembunyikan Bantuan Formula Rekomendasi KaTeX"
                >
                  <Calculator className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{showKatexAssistant ? 'KaTeX' : 'Bantuan KaTeX'}</span>
                </button>

                {/* Bahasa Arab Quick Assistant Button */}
                <button
                  type="button"
                  onClick={() => setShowArabicAssistant(!showArabicAssistant)}
                  className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border cursor-pointer transition ${
                    showArabicAssistant
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                      : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border-slate-300 dark:border-slate-600 hover:bg-emerald-50'
                  }`}
                  title="Bantuan Penulisan Bahasa Arab & Harakat (Offline)"
                >
                  <span className="font-arabic text-sm leading-none">ع</span>
                  <span>{showArabicAssistant ? 'Tutup Arab' : 'Bahasa Arab'}</span>
                </button>

                {/* Bahasa Jawa Quick Assistant Button */}
                <button
                  type="button"
                  onClick={() => setShowJavaneseAssistant(!showJavaneseAssistant)}
                  className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border cursor-pointer transition ${
                    showJavaneseAssistant
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                      : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border-slate-300 dark:border-slate-600 hover:bg-amber-50'
                  }`}
                  title="Bantuan Penulisan Aksara Jawa Hanacaraka (Offline)"
                >
                  <span className="font-javanese text-sm leading-none">ꦲ</span>
                  <span>{showJavaneseAssistant ? 'Tutup Jawa' : 'Aksara Jawa'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const symbol = prompt('Ketik simbol khusus (contoh: α, β, θ, π, Ω, ±, ≤, ≥, √):', 'Ω')
                    if (symbol) {
                      insertTextAtCursor(symbol)
                    }
                  }}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Simbol Khusus (Omega / Greek)"
                >
                  <Omega className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const tableHtml = `<table border="1" style="border-collapse: collapse; width: 100%; margin: 8px 0;"><thead><tr><th style="padding: 6px; border: 1px solid #ccc; background: #f8fafc;">Kolom 1</th><th style="padding: 6px; border: 1px solid #ccc; background: #f8fafc;">Kolom 2</th></tr></thead><tbody><tr><td style="padding: 6px; border: 1px solid #ccc;">Data A</td><td style="padding: 6px; border: 1px solid #ccc;">Data B</td></tr></tbody></table><p></p>`
                    insertTextAtCursor(tableHtml)
                  }}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Sisipkan Tabel"
                >
                  <TableIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </button>
              </div>

              {/* KaTeX Quick Math Bar */}
              {showKatexAssistant && (
                <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-md space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-indigo-900 dark:text-indigo-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Rekomendasi KaTeX (Klik simbol untuk menyisipkan rumus):</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowLivePreview(!showLivePreview)}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{showLivePreview ? 'Sembunyikan Live Preview' : 'Tampilkan Live Preview'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowKatexAssistant(false)}
                        className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                        title="Tutup panel bantuan rekomendasi"
                      >
                        ✕ Sembunyikan
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {katexQuickTemplates.map((t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => insertTextAtCursor(t.snippet)}
                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 text-[11px] font-mono text-indigo-800 dark:text-indigo-200 shadow-2xs transition cursor-pointer"
                        title={`Sisipkan template: ${t.snippet}`}
                      >
                        <span className="font-sans font-semibold mr-1 text-[10px] text-slate-500">{t.label}:</span>
                        <span className="font-bold">{t.preview}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bahasa Arab Assistant Bar (Keyboard & Harakat Helper) */}
              {showArabicAssistant && (
                <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-md space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-emerald-900 dark:text-emerald-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="font-arabic text-sm">ع</span>
                      <span>Bantuan Input Bahasa Arab & Harakat (Offline):</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => insertTextAtCursor('<div class="font-arabic dir-rtl" style="font-size: 1.3em; line-height: 2;">كَتَبَ النَّصَّ هُنَا</div>')}
                        className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer font-medium"
                      >
                        + Sisipkan Blok Teks RTL Arab
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowArabicAssistant(false)}
                        className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                      >
                        ✕ Tutup
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {arabicQuickTemplates.map((t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => insertTextAtCursor(t.snippet)}
                        className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 shadow-2xs transition cursor-pointer flex items-center gap-1"
                        title={`Sisipkan: ${t.label}`}
                      >
                        <span className="text-[10px] text-slate-500 font-sans">{t.label}:</span>
                        <span className="font-arabic font-bold text-sm">{t.snippet}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Aksara Jawa Assistant Bar (Hanacaraka & Sandhangan) */}
              {showJavaneseAssistant && (
                <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-amber-900 dark:text-amber-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="font-javanese text-sm">ꦲ</span>
                      <span>Palette Aksara Jawa Hanacaraka & Sandhangan (Offline):</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => insertTextAtCursor('<span class="font-javanese" style="font-size: 1.25em;">ꦲꦤꦕꦫꦏ</span>')}
                        className="text-[10px] px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-700 cursor-pointer font-medium"
                      >
                        + Sisipkan Format Aksara Jawa
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowJavaneseAssistant(false)}
                        className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                      >
                        ✕ Tutup
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 max-h-36 overflow-y-auto custom-scrollbar p-1">
                    {javaneseQuickTemplates.map((t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => insertTextAtCursor(t.char)}
                        className="px-2 py-1 rounded bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 shadow-2xs transition cursor-pointer flex items-center gap-1"
                        title={`Aksara ${t.label}: ${t.char}`}
                      >
                        <span className="text-[10px] text-slate-500 font-sans">{t.label}:</span>
                        <span className="font-javanese font-bold text-base">{t.char}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor Workspace Area */}
              {isSourceMode ? (
                <textarea
                  rows={8}
                  value={pertanyaan}
                  onChange={(e) => setPertanyaan(e.target.value)}
                  placeholder="Ketikkan kode HTML / KaTeX rumus ($...$) di sini..."
                  className="w-full p-3 font-mono text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 rounded-b-none focus:outline-none focus:border-blue-500"
                />
              ) : (
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={() => {
                    if (editorRef.current) {
                      setPertanyaan(editorRef.current.innerHTML)
                    }
                  }}
                  className="w-full min-h-[160px] p-3 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 rounded-b-none focus:outline-none focus:border-blue-500 overflow-y-auto leading-relaxed"
                  style={{ minHeight: '160px' }}
                />
              )}

              {/* Status path bar */}
              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800/80 border border-t-0 border-slate-300 dark:border-white/20 rounded-b-md text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>body &gt; p</span>
                <span className="text-[10px] text-slate-400">Gunakan $...$ untuk rumus inline dan $$...$$ untuk rumus block</span>
              </div>

              {/* Live KaTeX Render Preview Box */}
              {showLivePreview && pertanyaan && (
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Live Pratinjau Render KaTeX &amp; Teks Soal:</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-blue-100 dark:border-blue-900/50 text-xs text-slate-900 dark:text-white prose dark:prose-invert max-w-none">
                    <MathRenderer content={pertanyaan} />
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                File gambar dapat di copy langsung atau di upload terlebih dahulu. File gambar yang didukung adalah jpg dan png.
              </p>
            </div>
          </div>

          {/* Row 2: File Audio */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <label className="sm:w-44 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 pt-1.5">
              File Audio
            </label>
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/mp3,audio/*"
                  onChange={handleAudioUpload}
                  className="text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                />
                {uploadingAudio && (
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Mengunggah audio...
                  </span>
                )}
                {mediaAudio && (
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs">
                    <Volume2 className="w-3.5 h-3.5 text-purple-600" />
                    <span className="font-mono text-[11px] truncate max-w-xs">{mediaAudio}</span>
                    <button
                      type="button"
                      onClick={() => setMediaAudio('')}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold ml-1"
                      title="Hapus Audio"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                File audio yang akan ditambah pada soal. (mp3). Jika ingin menghapus audio pada soal, maka Soalnya harus dihapus dahulu, setelah itu membuat soal ulang.
              </p>
            </div>
          </div>

          {/* Row 3: Putar Sekali */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <label className="sm:w-44 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 pt-1.5">
              Putar Sekali
            </label>
            <div className="flex-1 space-y-1.5">
              <select
                value={putarSekali}
                onChange={(e) => setPutarSekali(e.target.value as '0' | '1')}
                className="w-full sm:w-80 px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
              >
                <option value="0">Tidak</option>
                <option value="1">Ya</option>
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Memutar Audio sebanyak satu kali dalam satu tes
              </p>
            </div>
          </div>

          {/* Row 4: Tipe Soal & Tingkat Kesulitan */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="sm:w-44 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
              Tipe Soal
            </label>
            <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <select
                  value={tipeSoal}
                  onChange={(e) => setTipeSoal(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                >
                  <option value="PG">Pilihan Ganda</option>
                  <option value="PG_KOMPLEKS">Pilihan Ganda Kompleks</option>
                  <option value="ISIAN">Isian Singkat</option>
                  <option value="ESAI">Uraian / Esai</option>
                  <option value="BENAR_SALAH">Pernyataan Benar / Salah</option>
                  <option value="MENJODOHKAN">Menjodohkan</option>
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                  Tingkat Kesulitan
                </label>
                <select
                  value={tingkatKesulitan}
                  onChange={(e) => setTingkatKesulitan(e.target.value)}
                  className="w-24 px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 5: Pilihan Jawaban Notice */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <label className="sm:w-44 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 pt-0.5">
              Pilihan Jawaban
            </label>
            <div className="flex-1">
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Pilihan Jawaban ditambahkan <span className="text-rose-600 dark:text-rose-400 font-bold">setelah</span>{' '}
                soal disimpan. Jendela Kelola Jawaban akan terbuka otomatis setelah Anda menekan tombol Simpan.
              </p>
            </div>
          </div>

          {/* Row 6: Action Buttons (Simpan / Batal) */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded bg-[#337ab7] hover:bg-[#286090] text-white font-semibold text-xs transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
            </button>
            <button
              type="button"
              onClick={handleResetForm}
              className="px-5 py-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-600 transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      </div>

      {/* 4. CARD 3: DAFTAR SOAL [NAMA TOPIK] */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-md shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">
            Daftar Soal {topicDisplayName}
          </h2>
          <button
            type="button"
            onClick={() => fetchMapelDetail(activeMapelId)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data Soal</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          {/* Table Top Controls: Show entries & Search */}
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
                placeholder=""
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-white/10">
                  <th className="py-2.5 px-3 w-12 text-center">No.</th>
                  <th className="py-2.5 px-3">Soal</th>
                  <th className="py-2.5 px-3 w-32 text-center">Jawaban</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-blue-500" />
                      <span>Memuat butir soal...</span>
                    </td>
                  </tr>
                ) : paginatedSoal.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      {searchQuery
                        ? 'Tidak ada soal yang cocok dengan pencarian.'
                        : 'Belum ada soal pada topik ini. Buat soal baru menggunakan form di atas.'}
                    </td>
                  </tr>
                ) : (
                  paginatedSoal.map((soal: any, idx: number) => {
                    const rowNumber = (currentPage - 1) * entriesPerPage + idx + 1
                    const hasAudio = Boolean(soal.mediaAudio)
                    const optionCount = soal.opsiJawaban?.length || 0

                    return (
                      <tr
                        key={soal.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-3 align-top text-center font-medium text-slate-500 dark:text-slate-400">
                          {rowNumber}
                        </td>
                        <td className="py-3 px-3 align-top space-y-2">
                          {/* Audio Player if present */}
                          {hasAudio && (
                            <div className="mb-2 p-2 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-center gap-2">
                              <Volume2 className="w-4 h-4 text-purple-600 shrink-0" />
                              <audio controls className="h-8 max-w-sm w-full">
                                <source src={soal.mediaAudio} />
                              </audio>
                            </div>
                          )}

                          {/* Soal Content (Rendered with HTML / Math) */}
                          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                            <MathRenderer content={soal.pertanyaan} />
                          </div>

                          {/* Type & Points tags */}
                          <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                              Tipe: {soal.tipeSoal}
                            </span>
                            <span>Bobot: {soal.bobot}</span>
                            {optionCount > 0 && <span>• {optionCount} Opsi</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top text-center space-y-1">
                          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            {optionCount}
                          </div>

                          <div className="flex flex-col gap-1 items-stretch">
                            {/* Tombol Jawaban */}
                            <button
                              type="button"
                              onClick={() => handleOpenKelolaJawaban(soal)}
                              className="px-2.5 py-1 rounded bg-[#5bc0de] hover:bg-[#31b0d5] text-white text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                              title="Kelola Opsi Jawaban"
                            >
                              Jawaban
                            </button>

                            {/* Tombol Edit */}
                            <button
                              type="button"
                              onClick={() => handleEditSoal(soal)}
                              className="px-2.5 py-1 rounded bg-[#f0ad4e] hover:bg-[#ec971f] text-white text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                              title="Edit Soal"
                            >
                              Edit
                            </button>

                            {/* Tombol Hapus */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSoal(soal.id)}
                              className="px-2.5 py-1 rounded bg-[#d9534f] hover:bg-[#c9302c] text-white text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                              title="Hapus Soal"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer: Showing X to Y of Z & Pagination */}
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

      {/* Hidden File Input for Image/Media Uploads into specific targets */}
      <input
        type="file"
        ref={mediaUploadInputRef}
        onChange={handleMediaUploadForTarget}
        accept="image/*,audio/*,video/*"
        className="hidden"
      />

      {/* 5. MODAL FORMULA KATEX / MATH INSERTER */}
      {katexModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-md shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-indigo-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Sigma className="w-4 h-4" />
                <span>
                  KaTeX Math Formula Inserter
                  {katexTarget.type === 'opsi' && typeof katexTarget.index === 'number'
                    ? ` (Pilihan ${opsiList[katexTarget.index]?.label || ''})`
                    : katexTarget.type === 'matching_left' && typeof katexTarget.index === 'number'
                    ? ` (Kotak Kiri #${katexTarget.index + 1})`
                    : katexTarget.type === 'matching_right' && typeof katexTarget.index === 'number'
                    ? ` (Kotak Kanan #${katexTarget.index + 1})`
                    : ' (Pertanyaan Soal)'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setKatexModalOpen(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ketikkan Rumus LaTeX / KaTeX:
                </label>
                <textarea
                  rows={3}
                  value={customKatexInput}
                  onChange={(e) => setCustomKatexInput(e.target.value)}
                  placeholder="Contoh: \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} atau \int_{0}^{\pi} \sin(x) dx"
                  className="w-full p-2.5 font-mono text-xs rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Quick Template Clickers inside Modal */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Template Cepat:
                </label>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-white/10">
                  {katexQuickTemplates.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomKatexInput((prev) => prev + item.snippet.replace(/\$/g, ''))}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      {item.label} ({item.preview})
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview of Inputted Formula */}
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded space-y-1">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                  Hasil Render KaTeX:
                </span>
                <div className="p-2 bg-white dark:bg-slate-900 rounded border border-indigo-100 dark:border-indigo-900/50 min-h-[40px] flex items-center justify-center text-sm">
                  {customKatexInput.trim() ? (
                    <MathRenderer content={`$$${customKatexInput}$$`} />
                  ) : (
                    <span className="text-xs text-slate-400 italic">Rumus akan muncul di sini...</span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setKatexModalOpen(false)}
                className="px-4 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (customKatexInput.trim()) {
                    insertTextToTarget(`$${customKatexInput.trim()}$ `, katexTarget)
                    setCustomKatexInput('')
                    setKatexModalOpen(false)
                  }
                }}
                className="px-5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                <span>
                  {katexTarget.type === 'opsi' && typeof katexTarget.index === 'number'
                    ? `Sisipkan ke Pilihan ${opsiList[katexTarget.index]?.label || ''}`
                    : katexTarget.type === 'matching_left' && typeof katexTarget.index === 'number'
                    ? `Sisipkan ke Kotak Kiri #${katexTarget.index + 1}`
                    : katexTarget.type === 'matching_right' && typeof katexTarget.index === 'number'
                    ? `Sisipkan ke Kotak Kanan #${katexTarget.index + 1}`
                    : 'Sisipkan ke Pertanyaan Soal'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL KELOLA JAWABAN */}
      {modalJawabanOpen && currentSoalJawaban && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-md shadow-2xl max-w-4xl w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#337ab7] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>Kelola Jawaban Soal #{currentSoalJawaban.nomorUrut || 1}</span>
                <span className="px-2 py-0.5 rounded bg-white/20 text-xs font-semibold">
                  {currentSoalJawaban.tipeSoal === 'PG'
                    ? 'Pilihan Ganda'
                    : currentSoalJawaban.tipeSoal === 'PG_KOMPLEKS'
                    ? 'Pilihan Majemuk / PG Kompleks'
                    : currentSoalJawaban.tipeSoal === 'MENJODOHKAN'
                    ? 'Mencocokkan / Menjodohkan'
                    : currentSoalJawaban.tipeSoal === 'BENAR_SALAH'
                    ? 'Pernyataan Benar / Salah'
                    : currentSoalJawaban.tipeSoal}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setModalJawabanOpen(false)}
                className="text-white/80 hover:text-white transition cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Question Preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Pertanyaan:
                </span>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MathRenderer content={currentSoalJawaban.pertanyaan} />
                </div>
              </div>

              {/* A. OPSI PILIHAN GANDA / PG KOMPLEKS / BENAR SALAH */}
              {['PG', 'PG_KOMPLEKS', 'BENAR_SALAH'].includes(currentSoalJawaban.tipeSoal) && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-800 dark:text-white block">
                        Daftar Pilihan Jawaban:
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Mendukung Rumus KaTeX ($...$), Gambar, Audio, dan Media pada setiap pilihan jawaban.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
                        const nextLabel = labels[opsiList.length] || `Opsi ${opsiList.length + 1}`
                        setOpsiList([...opsiList, { label: nextLabel, konten: '', isBenar: false }])
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" /> Tambah Pilihan
                    </button>
                  </div>

                  <div className="space-y-3">
                    {opsiList.map((opsi, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border transition space-y-2.5 ${
                          opsi.isBenar
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700 shadow-2xs'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10'
                        }`}
                      >
                        {/* Top Row: Label Button, Input, Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...opsiList]
                                if (currentSoalJawaban.tipeSoal === 'PG' || currentSoalJawaban.tipeSoal === 'BENAR_SALAH') {
                                  updated.forEach((o, i) => (o.isBenar = i === idx))
                                } else {
                                  updated[idx].isBenar = !updated[idx].isBenar
                                }
                                setOpsiList(updated)
                              }}
                              className={`w-8 h-8 rounded-md font-bold text-xs shrink-0 flex items-center justify-center cursor-pointer transition ${
                                opsi.isBenar
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                              }`}
                              title={opsi.isBenar ? 'Kunci Jawaban Benar' : 'Klik untuk jadikan Kunci'}
                            >
                              {opsi.label}
                            </button>
                          </div>

                          <div className="flex-1 w-full space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={opsi.konten}
                                onChange={(e) => {
                                  const updated = [...opsiList]
                                  updated[idx].konten = e.target.value
                                  setOpsiList(updated)
                                }}
                                placeholder={`Teks, rumus KaTeX ($...$), atau URL media pilihan ${opsi.label}...`}
                                className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                              />

                              {/* Action Buttons for this Option */}
                              <div className="flex items-center gap-1 shrink-0">
                                {/* KaTeX modal open */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setKatexTarget({ type: 'opsi', index: idx })
                                    setCustomKatexInput('')
                                    setKatexModalOpen(true)
                                  }}
                                  className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  title={`Sisipkan Rumus KaTeX ke Pilihan ${opsi.label}`}
                                >
                                  <Sigma className="w-3.5 h-3.5 text-indigo-600" />
                                  <span className="hidden sm:inline">KaTeX</span>
                                </button>

                                {/* Direct Image/Media Upload */}
                                <button
                                  type="button"
                                  onClick={() => triggerMediaUpload({ type: 'opsi', index: idx })}
                                  className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  title={`Unggah & Sisipkan Gambar ke Pilihan ${opsi.label}`}
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="hidden sm:inline">Gambar</span>
                                </button>

                                {/* URL Media Prompt */}
                                <button
                                  type="button"
                                  onClick={() => promptMediaUrl({ type: 'opsi', index: idx })}
                                  className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
                                  title={`Sisipkan URL Media ke Pilihan ${opsi.label}`}
                                >
                                  <LinkIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {opsi.isBenar && (
                                <span className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                                  KUNCI
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
                                className="p-1.5 rounded text-slate-400 hover:text-rose-600 transition shrink-0 cursor-pointer"
                                title="Hapus Opsi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Quick KaTeX Formula Chips */}
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mr-1">
                                Cepat:
                              </span>
                              {[
                                { label: '½', snippet: '$\\frac{a}{b}$ ' },
                                { label: '√x', snippet: '$\\sqrt{x}$ ' },
                                { label: 'x²', snippet: '$x^{2}$ ' },
                                { label: '×', snippet: '$\\times$ ' },
                                { label: '÷', snippet: '$\\div$ ' },
                                { label: '±', snippet: '$\\pm$ ' },
                                { label: '≠', snippet: '$\\neq$ ' },
                                { label: '≤', snippet: '$\\le$ ' },
                                { label: '≥', snippet: '$\\ge$ ' },
                                { label: '°', snippet: '$^\\circ$ ' },
                              ].map((chip, cIdx) => (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => insertTextToTarget(chip.snippet, { type: 'opsi', index: idx })}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-[10px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                                  title={`Sisipkan rumus ${chip.snippet}`}
                                >
                                  {chip.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Live Rendered Math/Media Preview */}
                        {opsi.konten && opsi.konten.trim() && (
                          <div className="ml-0 sm:ml-10 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-white/10 text-xs">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Preview Render Pilihan {opsi.label}:
                            </div>
                            <div className="prose prose-xs dark:prose-invert max-w-none">
                              <MathRenderer content={opsi.konten} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* B. EDITOR MENCOCOKKAN / MENJODOHKAN */}
              {currentSoalJawaban.tipeSoal === 'MENJODOHKAN' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-800 dark:text-white block">
                        Pasangan Kotak Pencocokan (Kotak Kiri ➔ Kotak Kanan):
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Isi premis di kotak kiri dan pasangannya di kotak kanan. Setiap kotak mendukung KaTeX ($...$) dan Media Gambar/Audio.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={matchingPairs.length >= 10}
                      onClick={() => {
                        if (matchingPairs.length < 10) {
                          setMatchingPairs([...matchingPairs, { left: '', right: '' }])
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/40 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 flex items-center gap-1 self-start sm:self-auto cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Pasangan ({matchingPairs.length}/10)
                    </button>
                  </div>

                  <div className="space-y-3">
                    {matchingPairs.map((pair, pIdx) => (
                      <div
                        key={pIdx}
                        className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-white/10 space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-1.5">
                          <span className="w-6 h-6 rounded bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                            #{pIdx + 1}
                          </span>
                          {matchingPairs.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setMatchingPairs(matchingPairs.filter((_, i) => i !== pIdx))
                              }}
                              className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus Baris Ini
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Kotak Kiri */}
                          <div className="space-y-1.5 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-white/10">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Kotak Kiri #{pIdx + 1} (Premis/Istilah):
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setKatexTarget({ type: 'matching_left', index: pIdx })
                                    setCustomKatexInput('')
                                    setKatexModalOpen(true)
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Sisipkan KaTeX ke Kotak Kiri"
                                >
                                  <Sigma className="w-3 h-3" /> KaTeX
                                </button>
                                <button
                                  type="button"
                                  onClick={() => triggerMediaUpload({ type: 'matching_left', index: pIdx })}
                                  className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Unggah Gambar ke Kotak Kiri"
                                >
                                  <ImageIcon className="w-3 h-3" /> Gambar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => promptMediaUrl({ type: 'matching_left', index: pIdx })}
                                  className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] cursor-pointer"
                                  title="Sisipkan URL Media"
                                >
                                  <LinkIcon className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <input
                              type="text"
                              value={pair.left}
                              onChange={(e) => {
                                const next = [...matchingPairs]
                                next[pIdx].left = e.target.value
                                setMatchingPairs(next)
                              }}
                              placeholder="Premis / istilah / pertanyaan kiri..."
                              className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            />

                            {/* Quick Chips */}
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              {[
                                { label: '½', snippet: '$\\frac{a}{b}$ ' },
                                { label: '√x', snippet: '$\\sqrt{x}$ ' },
                                { label: 'x²', snippet: '$x^{2}$ ' },
                                { label: '×', snippet: '$\\times$ ' },
                                { label: '±', snippet: '$\\pm$ ' },
                              ].map((chip, cIdx) => (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => insertTextToTarget(chip.snippet, { type: 'matching_left', index: pIdx })}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-[10px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                  {chip.label}
                                </button>
                              ))}
                            </div>

                            {pair.left && pair.left.trim() && (
                              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-white/5 text-xs">
                                <div className="text-[9px] font-bold text-slate-400 uppercase">Preview Render Kiri:</div>
                                <div className="prose prose-xs dark:prose-invert max-w-none">
                                  <MathRenderer content={pair.left} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Kotak Kanan */}
                          <div className="space-y-1.5 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-white/10">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Kotak Kanan #{pIdx + 1} (Jawaban Pasangan):
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setKatexTarget({ type: 'matching_right', index: pIdx })
                                    setCustomKatexInput('')
                                    setKatexModalOpen(true)
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Sisipkan KaTeX ke Kotak Kanan"
                                >
                                  <Sigma className="w-3 h-3" /> KaTeX
                                </button>
                                <button
                                  type="button"
                                  onClick={() => triggerMediaUpload({ type: 'matching_right', index: pIdx })}
                                  className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Unggah Gambar ke Kotak Kanan"
                                >
                                  <ImageIcon className="w-3 h-3" /> Gambar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => promptMediaUrl({ type: 'matching_right', index: pIdx })}
                                  className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] cursor-pointer"
                                  title="Sisipkan URL Media"
                                >
                                  <LinkIcon className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <input
                              type="text"
                              value={pair.right}
                              onChange={(e) => {
                                const next = [...matchingPairs]
                                next[pIdx].right = e.target.value
                                setMatchingPairs(next)
                              }}
                              placeholder="Respons / jawaban pasangan kanan..."
                              className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            />

                            {/* Quick Chips */}
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              {[
                                { label: '½', snippet: '$\\frac{a}{b}$ ' },
                                { label: '√x', snippet: '$\\sqrt{x}$ ' },
                                { label: 'x²', snippet: '$x^{2}$ ' },
                                { label: '×', snippet: '$\\times$ ' },
                                { label: '±', snippet: '$\\pm$ ' },
                              ].map((chip, cIdx) => (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => insertTextToTarget(chip.snippet, { type: 'matching_right', index: pIdx })}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-[10px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                  {chip.label}
                                </button>
                              ))}
                            </div>

                            {pair.right && pair.right.trim() && (
                              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-white/5 text-xs">
                                <div className="text-[9px] font-bold text-slate-400 uppercase">Preview Render Kanan:</div>
                                <div className="prose prose-xs dark:prose-invert max-w-none">
                                  <MathRenderer content={pair.right} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* C. ISIAN SINGKAT / ESAI */}
              {['ISIAN', 'ESAI'].includes(currentSoalJawaban.tipeSoal) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-white">
                      {currentSoalJawaban.tipeSoal === 'ISIAN'
                        ? 'Kunci Jawaban Isian Singkat (Cocok Teks Persis):'
                        : 'Rubrik Penilaian Esai / Catatan Jawaban Benar:'}
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setKatexTarget({ type: 'pertanyaan' })
                          setCustomKatexInput('')
                          setKatexModalOpen(true)
                        }}
                        className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Sigma className="w-3 h-3" /> KaTeX
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={kunciJawabanTeks}
                    onChange={(e) => setKunciJawabanTeks(e.target.value)}
                    placeholder="Tuliskan kunci jawaban teks atau panduan penilaian..."
                    className="w-full p-3 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  {kunciJawabanTeks && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-white/10 text-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Preview Render:</div>
                      <MathRenderer content={kunciJawabanTeks} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalJawabanOpen(false)}
                className="px-4 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={savingJawaban}
                onClick={handleSaveJawabanModal}
                className="px-5 py-1.5 rounded bg-[#337ab7] hover:bg-[#286090] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
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

