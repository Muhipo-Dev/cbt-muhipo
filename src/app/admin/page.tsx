'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import NextImage from 'next/image'
import { AppNavbar } from '@/components/layout/AppNavbar'
import { AppSidebar, NavTabItem } from '@/components/layout/AppSidebar'
import { AppFooter } from '@/components/layout/AppFooter'
import { MathRenderer } from '@/components/MathRenderer'
import { compressImageFile } from '@/lib/imageCompressor'
import {
  LayoutDashboard,
  MonitorPlay,
  BookOpen,
  FileSpreadsheet,
  Calendar,
  Users,
  GraduationCap,
  School,
  Printer,
  ShieldCheck,
  Plus,
  Clock,
  Search,
  KeyRound,
  RotateCcw,
  Settings,
  Image as ImageIcon,
  Save,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  ArrowDownToLine,
  Database,
  Link2,
  CalendarDays,
  Sparkles,
  Upload,
  Download,
  Send,
  Edit,
  Trash2,
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function ComprehensiveAdminDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Global Search Filter
  const [searchQuery, setSearchQuery] = useState('')

  // 1. Dashboard State
  const [dashboardData, setDashboardData] = useState<any>(null)

  // 2. Proktor Live State
  const [proktorData, setProktorData] = useState<any>(null)
  const [selectedProktorUjianId, setSelectedProktorUjianId] = useState('')
  const [extraTimeModal, setExtraTimeModal] = useState<any>(null)
  const [extraMinutes, setExtraMinutes] = useState(15)

  // 3. Bank Soal State
  const [bankSoalList, setBankSoalList] = useState<any[]>([])
  const [mapelList, setMapelList] = useState<any[]>([])
  const [selectedBankSoal, setSelectedBankSoal] = useState<any>(null)
  const [showCreateBankModal, setShowCreateBankModal] = useState(false)
  const [newBankForm, setNewBankForm] = useState({
    kodeBank: '',
    nama: '',
    tingkat: 12,
    jurusan: 'MIPA',
    durasiMenit: 90,
    mataPelajaranId: '',
  })
  const [importDurasiMenit, setImportDurasiMenit] = useState<number>(90)
  const [soalForm, setSoalForm] = useState({
    soalId: '',
    tipeSoal: 'PG',
    pertanyaan: '',
    bobot: 2.0,
    kunciJawabanTeks: '',
    opsiJawaban: [
      { label: 'A', konten: '', isBenar: true },
      { label: 'B', konten: '', isBenar: false },
      { label: 'C', konten: '', isBenar: false },
      { label: 'D', konten: '', isBenar: false },
      { label: 'E', konten: '', isBenar: false },
    ],
  })

  // 4. Koreksi & Rekap State
  const [koreksiData, setKoreksiData] = useState<any>(null)
  const [selectedKoreksiUjianId, setSelectedKoreksiUjianId] = useState('')

  // 5. Data Siswa, Guru, Kelas, Jadwal
  const [siswaData, setSiswaData] = useState<any>(null)
  const [guruData, setGuruData] = useState<any>(null)
  const [kelasList, setKelasList] = useState<any[]>([])
  const [jadwalData, setJadwalData] = useState<any>(null)

  // 6. Sinkronisasi SIMASMUH State
  const [syncData, setSyncData] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)

  // 7. Settings State
  const [settingsForm, setSettingsForm] = useState({
    schoolName: 'SMA Muhammadiyah 1 Ponorogo',
    appTitle: 'CBT MUHIPO',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    timezone: 'Asia/Jakarta',
    serverLocation: 'Ponorogo, Jawa Timur',
    logoUrl: '/pic_logo.png',
    backgroundUrl: '/muhipo-front.jpg',
    timeSyncOffsetMs: 0,
  })
  const [serverTimeData, setServerTimeData] = useState<any>(null)
  const [savingSettings, setSavingSettings] = useState(false)

  // Modals
  const [showSiswaModal, setShowSiswaModal] = useState(false)
  const [siswaForm, setSiswaForm] = useState({
    username: '',
    password: '',
    name: '',
    nis: '',
    nisn: '',
    nomorPeserta: '',
    kelasId: '',
    ruangUjian: 'Lab Komputer 1',
    sesiUjian: 1,
    jenisKelamin: 'L',
  })

  const [showGuruModal, setShowGuruModal] = useState(false)
  const [guruForm, setGuruForm] = useState({
    username: '',
    password: '',
    name: '',
    nip: '',
    mataPelajaranId: '',
  })

  const [showKelasModal, setShowKelasModal] = useState(false)
  const [kelasForm, setKelasForm] = useState({ nama: '', tingkat: 10, jurusan: 'MIPA' })
  const [showMapelModal, setShowMapelModal] = useState(false)
  const [mapelForm, setMapelForm] = useState({ kode: '', nama: '' })

  const [showJadwalModal, setShowJadwalModal] = useState(false)
  const [jadwalForm, setJadwalForm] = useState({
    kodeUjian: '',
    judul: '',
    bankSoalId: '',
    durasiMenit: 60,
    waktuMulai: '',
    waktuSelesai: '',
    lockBrowser: true,
    acakSoal: true,
    acakOpsi: true,
    kelasIds: [] as string[],
  })

  // State Modal Edit Bank Soal, Import Soal, dan Distribusi Soal ke Kelas
  const [editBankModal, setEditBankModal] = useState<any>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importingBankId, setImportingBankId] = useState('')
  const [importFileText, setImportFileText] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [distributeModal, setDistributeModal] = useState<any>(null)
  const [distributeForm, setDistributeForm] = useState({
    kodeUjian: '',
    judul: '',
    durasiMenit: 90,
    kelasIds: [] as string[],
    waktuMulai: '',
    waktuSelesai: '',
    lockBrowser: true,
    acakSoal: true,
    acakOpsi: true,
  })

  const sidebarNavItems: NavTabItem[] = [
    { id: 'dashboard', name: 'Dashboard Utama', icon: LayoutDashboard },
    { id: 'sinkronisasi', name: 'Sinkronisasi SIMASMUH', icon: Database },
    { id: 'proktor_live', name: 'Live Monitoring Ujian', icon: MonitorPlay },
    { id: 'bank_soal', name: 'Bank Soal & KaTeX', icon: BookOpen },
    { id: 'koreksi_nilai', name: 'Koreksi & Rekap Nilai', icon: FileSpreadsheet },
    { id: 'jadwal', name: 'Jadwal Ujian', icon: Calendar },
    { id: 'siswa', name: 'Data Siswa (NIS/NISN)', icon: GraduationCap },
    { id: 'guru', name: 'Data Guru Pengampu', icon: Users },
    { id: 'kelas_mapel', name: 'Rombel Kelas & Mapel', icon: School },
    { id: 'cetak', name: 'Cetak Dokumen Ujian', icon: Printer },
    { id: 'pengaturan', name: 'Pengaturan Sistem', icon: Settings },
  ]

  useEffect(() => {
    fetchSessionAndAdminData()
  }, [activeTab, selectedProktorUjianId, selectedKoreksiUjianId])

  const fetchSessionAndAdminData = async () => {
    try {
      setLoading(true)
      const meRes = await fetch('/api/auth/me')
      const meJson = await meRes.json()
      if (meJson.success) {
        setCurrentUser(meJson.user)
      }

      if (activeTab === 'dashboard') {
        const res = await fetch('/api/admin?tab=dashboard')
        const json = await res.json()
        if (json.success) setDashboardData(json.data)
      } else if (activeTab === 'sinkronisasi') {
        const res = await fetch('/api/sinkronisasi')
        const json = await res.json()
        if (json.success) setSyncData(json.data)
      } else if (activeTab === 'proktor_live') {
        const url = selectedProktorUjianId
          ? `/api/proktor?ujianId=${selectedProktorUjianId}`
          : '/api/proktor'
        const res = await fetch(url)
        const json = await res.json()
        if (json.success) setProktorData(json.data)
      } else if (activeTab === 'bank_soal') {
        const res = await fetch('/api/guru/soal')
        const json = await res.json()
        if (json.success) {
          setBankSoalList(json.data.bankSoalList)
          setMapelList(json.data.mapelList)
          if (json.data.mapelList.length > 0) {
            setNewBankForm((prev) => ({ ...prev, mataPelajaranId: json.data.mapelList[0].id }))
          }
        }
      } else if (activeTab === 'koreksi_nilai') {
        const url = selectedKoreksiUjianId
          ? `/api/guru/koreksi?ujianId=${selectedKoreksiUjianId}`
          : '/api/guru/koreksi'
        const res = await fetch(url)
        const json = await res.json()
        if (json.success) setKoreksiData(json.data)
      } else if (activeTab === 'jadwal') {
        const res = await fetch('/api/admin?tab=jadwal')
        const json = await res.json()
        if (json.success) setJadwalData(json.data)
      } else if (activeTab === 'siswa') {
        const res = await fetch('/api/admin?tab=siswa')
        const json = await res.json()
        if (json.success) setSiswaData(json.data)
      } else if (activeTab === 'guru') {
        const res = await fetch('/api/admin?tab=guru')
        const json = await res.json()
        if (json.success) setGuruData(json.data)
      } else if (activeTab === 'kelas_mapel') {
        const [kRes, mRes] = await Promise.all([
          fetch('/api/admin?tab=kelas'),
          fetch('/api/admin?tab=mapel'),
        ]);
        const [kJson, mJson] = await Promise.all([kRes.json(), mRes.json()])
        if (kJson.success) setKelasList(kJson.data)
        if (mJson.success) setMapelList(mJson.data)
      } else if (activeTab === 'pengaturan') {
        const res = await fetch('/api/pengaturan')
        const json = await res.json()
        if (json.success) {
          setSettingsForm({
            schoolName: json.data.schoolName || 'SMA Muhammadiyah 1 Ponorogo',
            appTitle: json.data.appTitle || 'CBT MUHIPO',
            academicYear: json.data.academicYear || '2026/2027',
            semester: json.data.semester || 'Ganjil',
            timezone: json.data.timezone || 'Asia/Jakarta',
            serverLocation: json.data.serverLocation || 'Ponorogo, Jawa Timur',
            logoUrl: json.data.logoUrl || '/pic_logo.png',
            backgroundUrl: json.data.backgroundUrl || '/muhipo-front.jpg',
            timeSyncOffsetMs: json.data.timeSyncOffsetMs || 0,
          })
          setServerTimeData(json.serverTime)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleRunSync = async (target: string) => {
    setSyncing(true)
    try {
      const res = await fetch('/api/sinkronisasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      const json = await res.json()
      alert(json.message)
      fetchSessionAndAdminData()
    } catch (e) {
      alert('Gagal menjalankan sinkronisasi data.')
    } finally {
      setSyncing(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'POST' })
    router.push('/login')
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImageFile(file, { maxWidth: 600, maxHeight: 600, quality: 0.8 })
      setSettingsForm((prev) => ({ ...prev, logoUrl: compressed.dataUrl }))
    } catch (err) {
      console.error('Gagal mengompres logo:', err)
      alert('Terjadi kesalahan saat memproses logo.')
    }
  }

  const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.82 })
      setSettingsForm((prev) => ({ ...prev, backgroundUrl: compressed.dataUrl }))
    } catch (err) {
      console.error('Gagal mengompres background master:', err)
      alert('Terjadi kesalahan saat memproses wallpaper background.')
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const res = await fetch('/api/pengaturan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      })
      const json = await res.json()
      if (json.success) {
        alert('Pengaturan sistem CBT berhasil disimpan!')
        fetchSessionAndAdminData()
      } else {
        alert(json.message || 'Gagal menyimpan pengaturan.')
      }
    } catch (e) {
      alert('Terjadi kesalahan saat menyimpan pengaturan.')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleResetPassword = async (userId: string, userName: string) => {
    if (!confirm(`Reset kata sandi ${userName} ke default (123456)?`)) return
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_PASSWORD', userId }),
      })
      const json = await res.json()
      alert(json.message)
    } catch (e) {
      alert('Gagal reset password')
    }
  }

  const handleResetLogin = async (pesertaUjianId: string, namaSiswa: string) => {
    if (!confirm(`Reset status ujian siswa "${namaSiswa}" agar dapat login kembali?`)) return
    try {
      const res = await fetch('/api/proktor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_LOGIN', pesertaUjianId }),
      })
      const json = await res.json()
      if (json.success) {
        alert(json.message)
        fetchSessionAndAdminData()
      }
    } catch (e) {
      alert('Gagal reset status ujian')
    }
  }

  const handleAddExtraTime = async () => {
    if (!extraTimeModal) return
    try {
      const res = await fetch('/api/proktor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_TIME',
          pesertaUjianId: extraTimeModal.pesertaUjianId,
          extraMinutes,
        }),
      })
      const json = await res.json()
      if (json.success) {
        alert(json.message)
        setExtraTimeModal(null)
        fetchSessionAndAdminData()
      }
    } catch (e) {
      alert('Gagal tambah waktu')
    }
  }

  const handleSelectBankSoal = async (id: string) => {
    try {
      const res = await fetch(`/api/guru/soal?bankSoalId=${id}`)
      const json = await res.json()
      if (json.success) setSelectedBankSoal(json.data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateBankSoal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_BANK_SOAL', ...newBankForm }),
      })
      const json = await res.json()
      if (json.success) {
        alert('Bank Soal berhasil dibuat!')
        setShowCreateBankModal(false)
        fetchSessionAndAdminData()
      }
    } catch (e) {
      alert('Gagal membuat bank soal')
    }
  }

  const handleUpdateBankSoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editBankModal) return
    try {
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_BANK_SOAL',
          bankSoalId: editBankModal.id,
          kodeBank: editBankModal.kodeBank,
          nama: editBankModal.nama,
          tingkat: editBankModal.tingkat,
          jurusan: editBankModal.jurusan,
          mataPelajaranId: editBankModal.mataPelajaranId,
        }),
      })
      const json = await res.json()
      if (json.success) {
        alert('Bank Soal berhasil diperbarui!')
        setEditBankModal(null)
        fetchSessionAndAdminData()
        if (selectedBankSoal?.id === editBankModal.id) {
          handleSelectBankSoal(editBankModal.id)
        }
      } else {
        alert(json.message || 'Gagal memperbarui bank soal')
      }
    } catch (e) {
      alert('Terjadi kesalahan saat memperbarui bank soal')
    }
  }

  const handleDeleteBankSoal = async (bankSoalId: string, nama: string) => {
    if (!confirm(`Hapus Bank Soal "${nama}" beserta seluruh butir soal dan jadwal terkait?`)) return
    try {
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_BANK_SOAL', bankSoalId }),
      })
      const json = await res.json()
      if (json.success) {
        alert(json.message)
        if (selectedBankSoal?.id === bankSoalId) {
          setSelectedBankSoal(null)
        }
        fetchSessionAndAdminData()
      } else {
        alert(json.message || 'Gagal menghapus bank soal')
      }
    } catch (e) {
      alert('Gagal menghapus bank soal')
    }
  }

  const handleDeleteSingleSoal = async (soalId: string) => {
    if (!confirm('Yakin ingin menghapus butir soal ini?')) return
    try {
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_SOAL', soalId }),
      })
      const json = await res.json()
      if (json.success) {
        alert('Soal berhasil dihapus!')
        if (selectedBankSoal) handleSelectBankSoal(selectedBankSoal.id)
      }
    } catch (e) {
      alert('Gagal menghapus soal')
    }
  }

  // Unduh Template Format Import Excel Soal
  const handleDownloadTemplateSoal = () => {
    const sampleRows = [
      {
        'Nomor': 1,
        'Tipe Soal': 'PG',
        'Pertanyaan / Soal': 'Berapakah hasil dari 25 + 15? (Mendukung KaTeX: $\\sqrt{16} = 4$)',
        'Bobot': 2,
        'Pilihan A': '30',
        'Pilihan B': '35',
        'Pilihan C': '40',
        'Pilihan D': '45',
        'Pilihan E': '50',
        'Kunci Jawaban (A/B/C/D/E)': 'C',
        'Kunci Teks/Rubrik Essay': '',
      },
      {
        'Nomor': 2,
        'Tipe Soal': 'PG_KOMPLEKS',
        'Pertanyaan / Soal': 'Manakah di antara bilangan berikut yang merupakan bilangan prima? (Pilih semua yang benar)',
        'Bobot': 3,
        'Pilihan A': '2',
        'Pilihan B': '3',
        'Pilihan C': '4',
        'Pilihan D': '5',
        'Pilihan E': '9',
        'Kunci Jawaban (A/B/C/D/E)': 'A,B,D',
        'Kunci Teks/Rubrik Essay': '',
      },
      {
        'Nomor': 3,
        'Tipe Soal': 'BENAR_SALAH',
        'Pertanyaan / Soal': 'Matahari terbit dari sebelah timur dan terbenam di sebelah barat.',
        'Bobot': 2,
        'Pilihan A': 'Benar',
        'Pilihan B': 'Salah',
        'Pilihan C': '',
        'Pilihan D': '',
        'Pilihan E': '',
        'Kunci Jawaban (A/B/C/D/E)': 'A',
        'Kunci Teks/Rubrik Essay': '',
      },
      {
        'Nomor': 4,
        'Tipe Soal': 'ISIAN',
        'Pertanyaan / Soal': 'Ibu kota negara Indonesia yang baru di Kalimantan Timur adalah...',
        'Bobot': 3,
        'Pilihan A': '',
        'Pilihan B': '',
        'Pilihan C': '',
        'Pilihan D': '',
        'Pilihan E': '',
        'Kunci Jawaban (A/B/C/D/E)': '',
        'Kunci Teks/Rubrik Essay': 'Nusantara',
      },
      {
        'Nomor': 5,
        'Tipe Soal': 'ESAI',
        'Pertanyaan / Soal': 'Jelaskan tujuan didirikannya organisasi Muhammadiyah oleh K.H. Ahmad Dahlan pada tahun 1912!',
        'Bobot': 10,
        'Pilihan A': '',
        'Pilihan B': '',
        'Pilihan C': '',
        'Pilihan D': '',
        'Pilihan E': '',
        'Kunci Jawaban (A/B/C/D/E)': '',
        'Kunci Teks/Rubrik Essay': 'Memurnikan ajaran Islam sesuai Al-Quran & Sunnah serta memajukan pendidikan dan kesejahteraan umat.',
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(sampleRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Format_Import_Soal')
    XLSX.writeFile(workbook, 'Template_Import_Soal_CBT_MUHIPO.xlsx')
  }

  // Upload & Parse File Excel Soal
  const handleFileUploadSoal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsName = wb.SheetNames[0]
        const ws = wb.Sheets[wsName]
        const data = XLSX.utils.sheet_to_json(ws)

        if (!data || data.length === 0) {
          alert('File Excel kosong atau format tidak sesuai.')
          return
        }

        const parsedItems = data.map((row: any) => {
          const tipe = (row['Tipe Soal'] || 'PG').toUpperCase()
          const pertanyaan = row['Pertanyaan / Soal'] || row['Pertanyaan'] || row['Soal'] || ''
          const bobot = Number(row['Bobot']) || 2.0
          const kunci = String(row['Kunci Jawaban (A/B/C/D/E)'] || row['Kunci'] || '').trim().toUpperCase()
          const kunciTeks = row['Kunci Teks/Rubrik Essay'] || row['Kunci Essay'] || ''

          const opsi = ['A', 'B', 'C', 'D', 'E']
            .map((lbl) => {
              const konten = row[`Pilihan ${lbl}`] || row[`Opsi ${lbl}`] || row[lbl] || ''
              return {
                label: lbl,
                konten: String(konten || '').trim(),
                isBenar: kunci.includes(lbl),
              }
            })
            .filter((o) => o.konten !== '')

          return {
            tipeSoal: tipe,
            pertanyaan,
            bobot,
            opsi,
            kunciJawabanTeks: kunciTeks || undefined,
          }
        }).filter((item) => item.pertanyaan.trim() !== '')

        if (parsedItems.length === 0) {
          alert('Tidak ditemukan baris pertanyaan soal yang valid pada file Excel.')
          return
        }

        setImportFileText(JSON.stringify(parsedItems))
        alert(`Berhasil membaca ${parsedItems.length} butir soal dari file Excel. Klik "Proses Import Soal" untuk menyimpan.`)
      } catch (err) {
        console.error(err)
        alert('Gagal membaca file Excel. Pastikan file menggunakan format Template Resmi.')
      }
    }
    reader.readAsBinaryString(file)
  }

  // Eksekusi Simpan Soal Import ke Database
  const handleExecuteImportSoal = async () => {
    if (!importingBankId) {
      alert('Pilih Bank Soal tujuan import terlebih dahulu.')
      return
    }
    if (!importFileText) {
      alert('Silakan pilih file Excel soal terlebih dahulu.')
      return
    }

    try {
      setImportLoading(true)
      const soalItems = JSON.parse(importFileText)
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'IMPORT_SOAL',
          bankSoalId: importingBankId,
          durasiMenit: importDurasiMenit,
          soalItems,
        }),
      })
      const json = await res.json()
      if (json.success) {
        alert(json.message)
        setShowImportModal(false)
        setImportFileText('')
        handleSelectBankSoal(importingBankId)
        fetchSessionAndAdminData()
      } else {
        alert(json.message || 'Gagal mengimport butir soal')
      }
    } catch (e) {
      alert('Terjadi kesalahan saat mengimport soal.')
    } finally {
      setImportLoading(false)
    }
  }

  // Eksekusi Distribusi / Kirim Soal ke Kelas Tertentu
  const handleExecuteKirimKeKelas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!distributeModal) return
    if (!distributeForm.kelasIds.length) {
      alert('Pilih minimal 1 kelas tujuan distribusi ujian.')
      return
    }

    try {
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'KIRIM_KE_KELAS',
          bankSoalId: distributeModal.id,
          ...distributeForm,
        }),
      })
      const json = await res.json()
      if (json.success) {
        alert(json.message)
        setDistributeModal(null)
        fetchSessionAndAdminData()
      } else {
        alert(json.message || 'Gagal mendistribusikan soal ke kelas')
      }
    } catch (e) {
      alert('Terjadi kesalahan saat mendistribusikan soal ke kelas.')
    }
  }

  const handleSaveSoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBankSoal) return
    try {
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SOAL',
          bankSoalId: selectedBankSoal.id,
          ...soalForm,
        }),
      })
      const json = await res.json()
      if (json.success) {
        alert('Soal berhasil disimpan!')
        handleSelectBankSoal(selectedBankSoal.id)
        setSoalForm({
          soalId: '',
          tipeSoal: 'PG',
          pertanyaan: '',
          bobot: 2.0,
          kunciJawabanTeks: '',
          opsiJawaban: [
            { label: 'A', konten: '', isBenar: true },
            { label: 'B', konten: '', isBenar: false },
            { label: 'C', konten: '', isBenar: false },
            { label: 'D', konten: '', isBenar: false },
            { label: 'E', konten: '', isBenar: false },
          ],
        })
      }
    } catch (e) {
      alert('Gagal simpan soal')
    }
  }

  const handleCreateSiswa = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_SISWA', ...siswaForm }),
      })
      const json = await res.json()
      if (json.success) {
        alert('Siswa berhasil didaftarkan!')
        setShowSiswaModal(false)
        fetchSessionAndAdminData()
      }
    } catch (e) {
      alert('Gagal tambah siswa')
    }
  }

  const handleCreateGuru = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_GURU', ...guruForm }),
      })
      const json = await res.json()
      if (json.success) {
        alert('Guru berhasil didaftarkan!')
        setShowGuruModal(false)
        fetchSessionAndAdminData()
      }
    } catch (e) {
      alert('Gagal tambah guru')
    }
  }

  const handleCreateKelas = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_KELAS', ...kelasForm }),
      })
      const json = await res.json()
      if (json.success) {
        alert('Kelas berhasil ditambahkan!')
        setShowKelasModal(false)
        fetchSessionAndAdminData()
      }
    } catch (e) {
      alert('Gagal tambah kelas')
    }
  }

  const handleCreateMapel = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_MAPEL', ...mapelForm }),
      })
      const json = await res.json()
      if (json.success) {
        alert('Mata Pelajaran berhasil ditambahkan!')
        setShowMapelModal(false)
        fetchSessionAndAdminData()
      }
    } catch (e) {
      alert('Gagal tambah mapel')
    }
  }

  const handleCreateJadwal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_UJIAN', ...jadwalForm }),
      })
      const json = await res.json()
      if (json.success) {
        alert('Jadwal Ujian berhasil dibuat!')
        setShowJadwalModal(false)
        fetchSessionAndAdminData()
      }
    } catch (e) {
      alert('Gagal membuat jadwal ujian')
    }
  }

  const handleExportExcel = () => {
    if (!koreksiData?.hasilList?.length) {
      alert('Belum ada data nilai untuk diekspor.')
      return
    }
    const rows = koreksiData.hasilList.map((p: any, idx: number) => ({
      No: idx + 1,
      NIS: p.siswa.nis || p.siswa.username,
      NISN: p.siswa.nisn || '-',
      'Nama Siswa': p.siswa.name,
      Kelas: p.siswa.kelas?.nama || '-',
      'Nilai PG/Objektif': p.nilaiPG,
      'Nilai Essay': p.nilaiEsai,
      'Total Nilai': p.nilaiTotal,
      Status: p.status,
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Nilai_CBT')
    XLSX.writeFile(workbook, `Rekap_Nilai_${koreksiData?.activeUjian?.kodeUjian || 'Ujian'}.xlsx`)
  }

  const filteredSiswaList = useMemo(() => {
    if (!siswaData?.siswaList) return []
    if (!searchQuery.trim()) return siswaData.siswaList
    const q = searchQuery.toLowerCase()
    return siswaData.siswaList.filter(
      (s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.nis?.toLowerCase().includes(q) ||
        s.username?.toLowerCase().includes(q) ||
        s.nisn?.toLowerCase().includes(q) ||
        s.kelas?.nama?.toLowerCase().includes(q)
    )
  }, [siswaData, searchQuery])

  const activeBg = settingsForm.backgroundUrl || '/muhipo-front.jpg'

  return (
    <div className="min-h-screen relative flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-300 overflow-x-hidden">
      {/* 1. Latar Belakang Wallpaper Sekolah Terpadu (Persis SIMASMUH) */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
        {activeBg.startsWith('http') || activeBg.startsWith('data:') ? (
          <img
            src={activeBg}
            alt="Latar Belakang SMA MUHIPO"
            className="object-cover object-center w-full h-full scale-105"
          />
        ) : (
          <NextImage
            src={activeBg}
            alt="Latar Belakang SMA MUHIPO"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center w-full h-full scale-105"
          />
        )}
      </div>

      {/* 2. Glassmorphism Backdrop Overlay Dinamis (Light: Bersih & Sejuk, Dark: Kontras & Elegan) */}
      <div className="fixed inset-0 bg-slate-100/85 dark:bg-slate-950/85 backdrop-blur-[2px] -z-20 pointer-events-none transition-colors duration-300" />

      {/* 3. Kerangka Sidebar Induk Terpadu (Fixed Left) */}
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={sidebarNavItems}
        activeId={activeTab}
        onSelect={(id) => {
          setActiveTab(id)
          setSearchQuery('')
        }}
      />

      {/* 4. Area Konten Utama (Bergeser ke Kanan pada Desktop lg:ml-72 persis SIMASMUH) */}
      <div className="flex-1 lg:ml-72 flex flex-col justify-between min-w-0 transition-all duration-300 relative z-10">
        {/* Navbar Induk Terpadu (Kiri Logo & AppTitle, Kanan Tahun Ajaran, Switch Theme, Profil, Logout) */}
        <AppNavbar
          appTitle={settingsForm.appTitle || 'CBT MUHIPO'}
          subtitle="Portal Ujian SMA Muhammadiyah 1 Ponorogo"
          logoUrl={settingsForm.logoUrl}
          onToggleSidebar={() => setSidebarOpen(true)}
          userProfile={{
            name: currentUser?.name || 'Super Administrator',
            role: currentUser?.role || 'SUPER ADMIN',
            username: currentUser?.username,
          }}
          actions={
            <div className="hidden md:flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-700 dark:text-blue-200 font-bold text-[10px] sm:text-xs shrink-0 backdrop-blur-md">
              <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300 shrink-0" />
              <span>TA: {settingsForm.academicYear} ({settingsForm.semester})</span>
            </div>
          }
          onLogout={handleLogout}
        />

        {/* Isi Halaman Dashboard dengan Glassmorphism Cards */}
        <main className="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto flex-1">
          {/* Quick Page Title & Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/75 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-xl">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                Panel Manajemen CBT Muhipo
              </span>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white capitalize">
                {sidebarNavItems.find((i) => i.id === activeTab)?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl font-medium backdrop-blur-sm">
                T.A {settingsForm.academicYear} • Semester {settingsForm.semester}
              </span>
            </div>
          </div>

          {/* TAB: SINKRONISASI DATA SIMASMUH & KESIAPAN BANK SOAL */}
          {activeTab === 'sinkronisasi' && syncData && (
            <div className="space-y-6">
              {/* Status Koneksi SIMASMUH */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-500" />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Database SIMASMUH (:54322)</h3>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        syncData.simasmuh.connected
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {syncData.simasmuh.connected ? 'ONLINE & TERHUBUNG' : 'OFFLINE'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                      <span className="text-slate-500 dark:text-slate-400 block">Siswa Terdaftar</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{syncData.simasmuh.siswaCount}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                      <span className="text-slate-500 dark:text-slate-400 block">Rombel Kelas</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{syncData.simasmuh.kelasCount}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                      <span className="text-slate-500 dark:text-slate-400 block">Mata Pelajaran</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{syncData.simasmuh.mapelCount}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                      <span className="text-slate-500 dark:text-slate-400 block">Guru Pengampu</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{syncData.simasmuh.guruCount}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      onClick={() => handleRunSync('ALL')}
                      disabled={syncing || !syncData.simasmuh.connected}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan Semua Data'}</span>
                    </button>
                    <button
                      onClick={() => handleRunSync('SISWA')}
                      disabled={syncing || !syncData.simasmuh.connected}
                      className="py-2.5 px-4 rounded-xl bg-slate-100/80 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200 dark:border-white/20 text-slate-800 dark:text-white font-bold text-xs cursor-pointer transition disabled:opacity-50"
                    >
                      Sinkron Siswa Saja
                    </button>
                  </div>
                </div>

                {/* Status Lokal CBT Muhipo */}
                <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Database Lokal CBT (:54332)</h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                      AKTIF & TERSINKRON
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                      <span className="text-slate-500 dark:text-slate-400 block">Siswa Aktif CBT</span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{syncData.cbt.siswaCount}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                      <span className="text-slate-500 dark:text-slate-400 block">Rombel Kelas CBT</span>
                      <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{syncData.cbt.kelasCount}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                      <span className="text-slate-500 dark:text-slate-400 block">Mata Pelajaran</span>
                      <span className="text-xl font-bold text-purple-600 dark:text-purple-400">{syncData.cbt.mapelCount}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                      <span className="text-slate-500 dark:text-slate-400 block">Total Butir Soal</span>
                      <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{syncData.cbt.soalCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabel Verifikasi Kesiapan Bank Soal untuk Diujikan */}
              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Status Kesiapan Bank Soal Ujian</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sistem memeriksa ketersediaan butir soal pada bank soal sebelum jadwal ujian dapat dikerjakan siswa.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap sm:whitespace-normal">
                    <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                      <tr>
                        <th className="py-3 px-4">Kode Bank</th>
                        <th className="py-3 px-4">Nama Bank Soal</th>
                        <th className="py-3 px-4">Mapel Terhubung</th>
                        <th className="py-3 px-4">Tingkat</th>
                        <th className="py-3 px-4 text-center">Jumlah Butir Soal</th>
                        <th className="py-3 px-4 text-center">Status Kesiapan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {syncData.bankSoalKesiapan?.map((b: any) => (
                        <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{b.kodeBank}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{b.nama}</td>
                          <td className="py-3 px-4">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{b.mapelNama}</span> ({b.mapelKode})
                          </td>
                          <td className="py-3 px-4">Kelas {b.tingkat}</td>
                          <td className="py-3 px-4 text-center font-bold">{b.jumlahSoal} Soal</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                                b.isSiapUjian
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {b.isSiapUjian ? '✓ SIAP DIUJIKAN' : '⚠ BELUM ADA SOAL'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && dashboardData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3.5">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-lg backdrop-blur-md">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Total Siswa</span>
                  <span className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400">{dashboardData.counts.countSiswa}</span>
                </div>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-lg backdrop-blur-md">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Total Guru</span>
                  <span className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400">{dashboardData.counts.countGuru}</span>
                </div>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-lg backdrop-blur-md">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Rombel Kelas</span>
                  <span className="text-lg sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">{dashboardData.counts.countKelas}</span>
                </div>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-lg backdrop-blur-md">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Bank Soal</span>
                  <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{dashboardData.counts.countBankSoal}</span>
                </div>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-lg backdrop-blur-md">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Jadwal Ujian</span>
                  <span className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400">{dashboardData.counts.countUjian}</span>
                </div>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 shadow-xs dark:shadow-lg backdrop-blur-md">
                  <span className="text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-400 block font-semibold">Sedang Ujian</span>
                  <span className="text-lg sm:text-2xl font-black text-amber-500 dark:text-amber-300">{dashboardData.counts.countPesertaMengerjakan}</span>
                </div>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 shadow-xs dark:shadow-lg backdrop-blur-md">
                  <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">Selesai Ujian</span>
                  <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-300">{dashboardData.counts.countPesertaSelesai}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Jadwal Ujian Terdaftar
                  </h3>
                  <div className="space-y-2.5">
                    {dashboardData.recentUjian.map((u: any) => (
                      <div
                        key={u.id}
                        className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs backdrop-blur-sm"
                      >
                        <div>
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold block">{u.kodeUjian}</span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{u.judul}</h4>
                          <p className="text-slate-500 dark:text-slate-400">
                            Mapel: <b>{u.bankSoal.mataPelajaran.nama}</b> • Durasi: <b>{u.durasiMenit} Menit</b>
                          </p>
                        </div>
                        <span className="self-start sm:self-center px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                          {u.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-500" />
                    Audit Trail / Aktivitas Siswa
                  </h3>
                  <div className="space-y-2">
                    {dashboardData.recentLogs?.map((l: any) => (
                      <div key={l.id} className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200/60 dark:border-white/5 text-xs backdrop-blur-sm">
                        <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                          <span>{l.user.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(l.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{l.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROKTOR LIVE */}
          {activeTab === 'proktor_live' && (
            <div className="space-y-6">
              <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Monitoring Ruang Ujian</h3>
                  <select
                    value={selectedProktorUjianId}
                    onChange={(e) => setSelectedProktorUjianId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white backdrop-blur-sm"
                  >
                    {proktorData?.ujianList?.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.kodeUjian} - {u.judul}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ujian Aktif: <b>{proktorData?.activeUjian?.judul}</b> ({proktorData?.activeUjian?.durasiMenit} Menit)
                </p>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Status Pengerjaan Peserta</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap sm:whitespace-normal">
                    <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                      <tr>
                        <th className="py-3 px-4">NIS</th>
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4">Kelas</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Jawaban</th>
                        <th className="py-3 px-4 text-right">Aksi Proktor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {proktorData?.pesertaList?.map((p: any) => (
                        <tr key={p.pesertaUjianId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{p.nis || p.nomorPeserta || p.username}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{p.name}</td>
                          <td className="py-3 px-4">{p.kelas}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">{p.jumlahJawaban} Soal</td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleResetLogin(p.pesertaUjianId, p.name)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-[11px] font-bold cursor-pointer"
                            >
                              Reset Login
                            </button>
                            {p.status === 'SEDANG_MENGERJAKAN' && (
                              <button
                                onClick={() => setExtraTimeModal(p)}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/40 text-blue-600 dark:text-blue-300 text-[11px] font-bold cursor-pointer"
                              >
                                +Waktu
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BANK SOAL & KATEX */}
          {activeTab === 'bank_soal' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Kolom Kiri: Daftar Bank Soal */}
              <div className="lg:col-span-5 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-white/10">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Bank Soal & Ujian</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Kelola soal, import Excel, dan kirim ke kelas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadTemplateSoal}
                      title="Unduh Format Excel Template Soal"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Format Excel</span>
                    </button>
                    <button
                      onClick={() => setShowCreateBankModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Bank</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {bankSoalList.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      Belum ada Bank Soal. Klik tombol "Tambah Bank" di atas.
                    </div>
                  ) : (
                    bankSoalList.map((bs) => (
                      <div
                        key={bs.id}
                        onClick={() => handleSelectBankSoal(bs.id)}
                        className={`p-4 rounded-2xl border transition cursor-pointer relative group ${
                          selectedBankSoal?.id === bs.id
                            ? 'bg-blue-50/90 dark:bg-blue-600/15 border-blue-500 text-slate-900 dark:text-white shadow-md'
                            : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                              {bs.kodeBank}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">{bs.nama}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {bs.mataPelajaran?.nama} • Tingkat {bs.tingkat} ({bs.jurusan || 'UMUM'}) • {bs.durasiMenit || 90} Mnt
                            </p>
                          </div>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 font-mono">
                            {bs._count?.soalList || 0} Soal
                          </span>
                        </div>

                        {/* Quick Action Buttons for each Bank Soal */}
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-200/60 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setImportingBankId(bs.id)
                              setShowImportModal(true)
                            }}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Import Soal</span>
                          </button>
                          <button
                            onClick={() => {
                              setDistributeModal(bs)
                              setDistributeForm({
                                kodeUjian: `PAS-${bs.kodeBank}-${new Date().getFullYear()}`,
                                judul: `Ujian ${bs.nama}`,
                                durasiMenit: 90,
                                kelasIds: [],
                                waktuMulai: new Date().toISOString().slice(0, 16),
                                waktuSelesai: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                                lockBrowser: true,
                                acakSoal: true,
                                acakOpsi: true,
                              })
                            }}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Kirim ke Kelas</span>
                          </button>
                          <button
                            onClick={() => setEditBankModal(bs)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                            title="Edit Info Bank Soal"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBankSoal(bs.id, bs.nama)}
                            className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer"
                            title="Hapus Bank Soal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Kolom Kanan: Editor Soal & Daftar Soal Terdaftar */}
              <div className="lg:col-span-7 space-y-6">
                {selectedBankSoal ? (
                  <div className="space-y-6">
                    {/* Header Info Bank Terpilih */}
                    <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 shadow-sm dark:shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                            {selectedBankSoal.kodeBank}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {selectedBankSoal.mataPelajaran?.nama}
                          </span>
                        </div>
                        <h3 className="font-black text-lg text-slate-900 dark:text-white mt-1">
                          {selectedBankSoal.nama}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setImportingBankId(selectedBankSoal.id)
                            setShowImportModal(true)
                          }}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Import Soal Excel</span>
                        </button>
                        <button
                          onClick={() => {
                            setDistributeModal(selectedBankSoal)
                            setDistributeForm({
                              kodeUjian: `PAS-${selectedBankSoal.kodeBank}-${new Date().getFullYear()}`,
                              judul: `Ujian ${selectedBankSoal.nama}`,
                              durasiMenit: 90,
                              kelasIds: [],
                              waktuMulai: new Date().toISOString().slice(0, 16),
                              waktuSelesai: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                              lockBrowser: true,
                              acakSoal: true,
                              acakOpsi: true,
                            })
                          }}
                          className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim ke Kelas</span>
                        </button>
                      </div>
                    </div>

                    {/* Form Input / Edit Butir Soal */}
                    <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-white/10">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <Plus className="w-4 h-4 text-blue-500" />
                          <span>{soalForm.soalId ? 'Edit Butir Soal' : 'Tambah Butir Soal Baru'}</span>
                        </h4>
                        {soalForm.soalId && (
                          <button
                            onClick={() =>
                              setSoalForm({
                                soalId: '',
                                tipeSoal: 'PG',
                                pertanyaan: '',
                                bobot: 2.0,
                                kunciJawabanTeks: '',
                                opsiJawaban: [
                                  { label: 'A', konten: '', isBenar: true },
                                  { label: 'B', konten: '', isBenar: false },
                                  { label: 'C', konten: '', isBenar: false },
                                  { label: 'D', konten: '', isBenar: false },
                                  { label: 'E', konten: '', isBenar: false },
                                ],
                              })
                            }
                            className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
                          >
                            + Reset ke Tambah Baru
                          </button>
                        )}
                      </div>

                      <form onSubmit={handleSaveSoal} className="space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tipe Soal</label>
                            <select
                              value={soalForm.tipeSoal}
                              onChange={(e) => setSoalForm({ ...soalForm, tipeSoal: e.target.value })}
                              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-medium cursor-pointer"
                            >
                              <option value="PG">Pilihan Ganda (PG Tunggal)</option>
                              <option value="PG_KOMPLEKS">PG Kompleks (Multi Select)</option>
                              <option value="BENAR_SALAH">Benar / Salah</option>
                              <option value="ISIAN">Isian Singkat</option>
                              <option value="ESAI">Uraian / Essay</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Bobot Nilai</label>
                            <input
                              type="number"
                              step="0.5"
                              value={soalForm.bobot}
                              onChange={(e) => setSoalForm({ ...soalForm, bobot: Number(e.target.value) })}
                              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                            Pertanyaan (Mendukung Formula KaTeX $...$ / $$...$$):
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={soalForm.pertanyaan}
                            onChange={(e) => setSoalForm({ ...soalForm, pertanyaan: e.target.value })}
                            placeholder="Tuliskan teks pertanyaan soal..."
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-sans text-sm"
                          />
                        </div>

                        {soalForm.pertanyaan && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10">
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase block mb-1">Live Preview Rumus KaTeX:</span>
                            <MathRenderer content={soalForm.pertanyaan} />
                          </div>
                        )}

                        {(soalForm.tipeSoal === 'PG' || soalForm.tipeSoal === 'PG_KOMPLEKS') && (
                          <div className="space-y-2 pt-2">
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold">Pilihan Jawaban & Kunci:</label>
                            {soalForm.opsiJawaban.map((opsi, idx) => (
                              <div key={opsi.label} className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 font-bold flex items-center justify-center text-slate-800 dark:text-slate-200 shrink-0">
                                  {opsi.label}
                                </span>
                                <input
                                  type="text"
                                  value={opsi.konten}
                                  onChange={(e) => {
                                    const updated = [...soalForm.opsiJawaban]
                                    updated[idx].konten = e.target.value
                                    setSoalForm({ ...soalForm, opsiJawaban: updated })
                                  }}
                                  placeholder={`Pilihan ${opsi.label}...`}
                                  className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...soalForm.opsiJawaban]
                                    if (soalForm.tipeSoal === 'PG') {
                                      updated.forEach((o, i) => (o.isBenar = i === idx))
                                    } else {
                                      updated[idx].isBenar = !updated[idx].isBenar
                                    }
                                    setSoalForm({ ...soalForm, opsiJawaban: updated })
                                  }}
                                  className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                                    opsi.isBenar ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {opsi.isBenar ? '✓ Kunci Benar' : 'Set Kunci'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {(soalForm.tipeSoal === 'ISIAN' || soalForm.tipeSoal === 'ESAI') && (
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                              {soalForm.tipeSoal === 'ISIAN' ? 'Kunci Jawaban Singkat:' : 'Rubrik / Pedoman Nilai Essay:'}
                            </label>
                            <input
                              type="text"
                              value={soalForm.kunciJawabanTeks}
                              onChange={(e) => setSoalForm({ ...soalForm, kunciJawabanTeks: e.target.value })}
                              placeholder="Kunci teks jawaban atau kriteria penilaian..."
                              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                            />
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition shadow-md"
                        >
                          {soalForm.soalId ? 'Update Butir Soal' : 'Simpan Soal ke Bank'}
                        </button>
                      </form>
                    </div>

                    {/* Daftar Butir Soal yang Tersimpan */}
                    <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-base text-slate-900 dark:text-white">
                          Daftar Butir Soal ({selectedBankSoal.soalList?.length || 0} Butir)
                        </h4>
                      </div>

                      <div className="space-y-3">
                        {(!selectedBankSoal.soalList || selectedBankSoal.soalList.length === 0) ? (
                          <div className="text-center py-8 text-slate-500 text-xs">
                            Belum ada butir soal dalam bank ini. Silakan input soal di atas atau klik tombol <b>Import Soal Excel</b>.
                          </div>
                        ) : (
                          selectedBankSoal.soalList.map((s: any, idx: number) => (
                            <div
                              key={s.id}
                              className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 space-y-3 text-xs"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    Tipe: {s.tipeSoal} • Bobot: {s.bobot}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSoalForm({
                                        soalId: s.id,
                                        tipeSoal: s.tipeSoal,
                                        pertanyaan: s.pertanyaan,
                                        bobot: s.bobot,
                                        kunciJawabanTeks: s.kunciJawabanTeks || '',
                                        opsiJawaban: s.opsiJawaban?.length
                                          ? s.opsiJawaban.map((o: any) => ({
                                              label: o.label,
                                              konten: o.konten,
                                              isBenar: o.isBenar,
                                            }))
                                          : [
                                              { label: 'A', konten: '', isBenar: true },
                                              { label: 'B', konten: '', isBenar: false },
                                              { label: 'C', konten: '', isBenar: false },
                                              { label: 'D', konten: '', isBenar: false },
                                              { label: 'E', konten: '', isBenar: false },
                                            ],
                                      })
                                      window.scrollTo({ top: 400, behavior: 'smooth' })
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSingleSoal(s.id)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </div>

                              <div className="text-slate-900 dark:text-white font-medium pl-8">
                                <MathRenderer content={s.pertanyaan} />
                              </div>

                              {s.opsiJawaban && s.opsiJawaban.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8 pt-1">
                                  {s.opsiJawaban.map((op: any) => (
                                    <div
                                      key={op.id || op.label}
                                      className={`p-2 rounded-xl border flex items-center gap-2 ${
                                        op.isBenar
                                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-bold'
                                          : 'bg-slate-100/60 dark:bg-slate-900 border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-400'
                                      }`}
                                    >
                                      <span className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px]">
                                        {op.label}
                                      </span>
                                      <span className="text-xs">{op.konten}</span>
                                      {op.isBenar && <span className="ml-auto text-[10px] text-emerald-600 font-bold">✓ Kunci</span>}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {s.kunciJawabanTeks && (
                                <div className="pl-8 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                                  Kunci / Rubrik: {s.kunciJawabanTeks}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl text-slate-500 dark:text-slate-400 text-xs backdrop-blur-md">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                    Pilih salah satu Bank Soal di sebelah kiri untuk melihat, mengedit butir soal, mengimport Excel, atau mendistribusikan ke kelas.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: KOREKSI & REKAP NILAI */}
          {activeTab === 'koreksi_nilai' && (
            <div className="space-y-6">
              <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Rekapitulasi Nilai & Koreksi</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{koreksiData?.activeUjian?.judul}</p>
                </div>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md cursor-pointer transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Unduh Rekap Nilai Excel (.xlsx)</span>
                </button>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap sm:whitespace-normal">
                    <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                      <tr>
                        <th className="py-3 px-4">NIS</th>
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4">Kelas</th>
                        <th className="py-3 px-4">Nilai PG</th>
                        <th className="py-3 px-4">Nilai Essay</th>
                        <th className="py-3 px-4">Total Skor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {koreksiData?.hasilList?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{p.siswa.nis || p.siswa.username}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{p.siswa.name}</td>
                          <td className="py-3 px-4">{p.siswa.kelas?.nama}</td>
                          <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">{p.nilaiPG}</td>
                          <td className="py-3 px-4 text-amber-600 dark:text-amber-400 font-bold">{p.nilaiEsai}</td>
                          <td className="py-3 px-4 font-black text-slate-900 dark:text-white">{p.nilaiTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: JADWAL UJIAN */}
          {activeTab === 'jadwal' && (
            <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Jadwal Ujian Aktif</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Atur jadwal dan distribusi ujian ke kelas peserta</p>
                </div>
                <button
                  onClick={() => setShowJadwalModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Jadwal</span>
                </button>
              </div>

              <div className="space-y-3">
                {jadwalData?.jadwalList?.map((u: any) => (
                  <div key={u.id} className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs backdrop-blur-sm">
                    <div>
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{u.kodeUjian}</span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{u.judul}</h4>
                      <p className="text-slate-500 dark:text-slate-400">Durasi: {u.durasiMenit} Menit • Peserta: {u._count.pesertaUjian} Siswa</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold self-start sm:self-center">
                      {u.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: DATA SISWA DENGAN SEARCH */}
          {activeTab === 'siswa' && (
            <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Data Siswa (Tersinkron SIMASMUH)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Daftar akun peserta CBT berbasis NIS & NISN</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunSync('SISWA')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tarik Data SIMASMUH</span>
                  </button>
                  <button
                    onClick={() => setShowSiswaModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Manual</span>
                  </button>
                </div>
              </div>

              {/* Search Bar Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari siswa berdasarkan Nama, NIS, NISN, atau Kelas..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 backdrop-blur-sm"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap sm:whitespace-normal">
                  <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                    <tr>
                      <th className="py-3 px-4">NIS</th>
                      <th className="py-3 px-4">NISN</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Ruang / Sesi</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                    {filteredSiswaList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                          Tidak ditemukan data siswa.
                        </td>
                      </tr>
                    ) : (
                      filteredSiswaList.map((s: any) => (
                        <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{s.nis || s.username}</td>
                          <td className="py-3 px-4 font-mono">{s.nisn || '-'}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{s.name}</td>
                          <td className="py-3 px-4">{s.kelas?.nama}</td>
                          <td className="py-3 px-4">{s.ruangUjian} (Sesi {s.sesiUjian})</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleResetPassword(s.id, s.name)}
                              className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold cursor-pointer"
                            >
                              Reset Password
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: DATA GURU */}
          {activeTab === 'guru' && (
            <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Data Guru Pengampu</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Guru pembuat soal CBT</p>
                </div>
                <button
                  onClick={() => setShowGuruModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Guru</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap sm:whitespace-normal">
                  <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                    <tr>
                      <th className="py-3 px-4">NIP</th>
                      <th className="py-3 px-4">Nama Guru</th>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Mata Pelajaran</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                    {guruData?.guruList?.map((g: any) => (
                      <tr key={g.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono">{g.nip || '-'}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{g.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">@{g.username}</td>
                        <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                          {g.mataPelajaran?.map((m: any) => m.mataPelajaran.nama).join(', ') || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleResetPassword(g.id, g.name)}
                            className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold cursor-pointer"
                          >
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: KELAS & MAPEL */}
          {activeTab === 'kelas_mapel' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Daftar Rombel / Kelas</h3>
                  <button
                    onClick={() => setShowKelasModal(true)}
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {kelasList.map((k: any) => (
                    <div key={k.id} className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 flex justify-between items-center text-xs backdrop-blur-sm">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{k.nama}</h4>
                        <p className="text-slate-500 dark:text-slate-400">Tingkat {k.tingkat} • Jurusan {k.jurusan}</p>
                      </div>
                      <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{k._count.users} Siswa</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Daftar Mata Pelajaran (SIMASMUH Sync)</h3>
                  <button
                    onClick={() => setShowMapelModal(true)}
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {mapelList.map((m: any) => (
                    <div key={m.id} className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 flex justify-between items-center text-xs backdrop-blur-sm">
                      <div>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold block">{m.kode}</span>
                        <h4 className="font-bold text-slate-900 dark:text-white">{m.nama}</h4>
                      </div>
                      <span className="font-mono text-slate-500 dark:text-slate-400">{m._count?.bankSoalList || 0} Bank Soal</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: CETAK */}
          {activeTab === 'cetak' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 space-y-3 shadow-sm dark:shadow-xl backdrop-blur-xl">
                <Printer className="w-6 h-6 text-blue-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cetak Kartu Ujian Siswa</h4>
                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                >
                  Cetak Kartu Ujian
                </button>
              </div>
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 space-y-3 shadow-sm dark:shadow-xl backdrop-blur-xl">
                <Printer className="w-6 h-6 text-cyan-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cetak Daftar Hadir</h4>
                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer"
                >
                  Cetak Daftar Hadir
                </button>
              </div>
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 space-y-3 shadow-sm dark:shadow-xl backdrop-blur-xl">
                <Printer className="w-6 h-6 text-emerald-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cetak Berita Acara</h4>
                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                >
                  Cetak Berita Acara
                </button>
              </div>
            </div>
          )}

          {/* TAB 10: PENGATURAN SISTEM */}
          {activeTab === 'pengaturan' && (
            <div className="space-y-6">
              <div className="bg-white/85 dark:bg-gradient-to-r dark:from-blue-900/60 dark:to-indigo-900/60 border border-slate-200/80 dark:border-blue-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 shadow-inner">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                      Waktu & Tanggal Server Terverifikasi
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                      {serverTimeData?.timeString || '--:--:--'}{' '}
                      <span className="text-xs font-sans px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30">
                        WIB
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                      {serverTimeData?.dateString || 'Sinkronisasi dengan server PostgreSQL...'} • Zona:{' '}
                      <b className="text-blue-600 dark:text-blue-300">{settingsForm.timezone}</b>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchSessionAndAdminData}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200 dark:border-white/20 text-xs font-semibold text-slate-800 dark:text-white transition cursor-pointer backdrop-blur-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkron Ulang</span>
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl shadow-sm dark:shadow-xl backdrop-blur-xl overflow-hidden">
                  {/* Header Form Identitas Sekolah */}
                  <div className="border-b border-slate-100 dark:border-slate-800/80 p-5 sm:p-6">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-base sm:text-lg">
                      <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3>Identitas Sekolah</h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      Informasi identitas, logo resmi, dan wallpaper latar belakang sistem.
                    </p>
                  </div>

                  <div className="p-5 sm:p-6 space-y-6">
                    {/* 1. Logo Sekolah & Sistem (Terkompres Otomatis) */}
                    <div className="space-y-2">
                      <label className="block text-slate-900 dark:text-slate-200 font-semibold text-xs">
                        Logo Sekolah & Sistem (Terkompres Otomatis)
                      </label>
                      <div className="flex items-center gap-4">
                        {settingsForm.logoUrl && (
                          <img
                            src={settingsForm.logoUrl}
                            alt="Preview Logo"
                            className="w-12 h-12 object-contain rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 shrink-0 shadow-xs"
                          />
                        )}
                        <input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-blue-600/20 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-600/30 file:cursor-pointer cursor-pointer border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 p-1.5"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Logo ini digunakan pada navbar, favicon browser, dan dokumen resmi.
                      </p>
                    </div>

                    {/* 2. Wallpaper Background Master */}
                    <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                      <label className="block font-bold text-slate-900 dark:text-slate-100 text-xs">
                        Wallpaper Background Master
                      </label>
                      <div className="flex items-center gap-4 mt-2">
                        {settingsForm.backgroundUrl ? (
                          <div className="relative w-20 h-12 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 shadow-xs">
                            <img
                              src={settingsForm.backgroundUrl}
                              alt="Preview Background Master"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="relative w-20 h-12 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 shadow-xs">
                            <img
                              src="/muhipo-front.jpg"
                              alt="Default Background Master"
                              className="w-full h-full object-cover opacity-70"
                            />
                          </div>
                        )}
                        <input
                          id="backgroundMaster"
                          type="file"
                          accept="image/*"
                          onChange={handleBackgroundChange}
                          className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-blue-600/20 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-600/30 file:cursor-pointer cursor-pointer border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 p-1.5"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Wallpaper latar belakang yang diselaraskan di seluruh halaman aplikasi.
                      </p>
                    </div>

                    {/* 3. Alamat Lengkap & Nama Sekolah */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-xs">
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                          Nama Lembaga / Sekolah *
                        </label>
                        <input
                          type="text"
                          required
                          value={settingsForm.schoolName}
                          onChange={(e) => setSettingsForm({ ...settingsForm, schoolName: e.target.value })}
                          placeholder="SMA Muhammadiyah 1 Ponorogo"
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                          Judul Aplikasi Web *
                        </label>
                        <input
                          type="text"
                          required
                          value={settingsForm.appTitle}
                          onChange={(e) => setSettingsForm({ ...settingsForm, appTitle: e.target.value })}
                          placeholder="CBT MUHIPO"
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                        Lokasi Server
                      </label>
                      <input
                        type="text"
                        value={settingsForm.serverLocation}
                        onChange={(e) => setSettingsForm({ ...settingsForm, serverLocation: e.target.value })}
                        placeholder="Ponorogo, Jawa Timur"
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* 4. Tahun Pelajaran & Semester Utama (Acuan Serentak Seluruh Aplikasi - Matching SIMASMUH) */}
                    <div className="border-t border-slate-200/80 dark:border-slate-800 pt-6 bg-blue-50/60 dark:bg-blue-950/30 p-4 sm:p-5 rounded-2xl border border-blue-100 dark:border-blue-900/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                              Tahun Pelajaran & Semester Utama
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              Pengaturan tunggal ini menjadi acuan serentak di seluruh data aplikasi CBT.
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded-full shadow-xs flex items-center gap-1 shrink-0 self-start sm:self-auto">
                          <Sparkles className="w-3 h-3" />
                          Aktif: {settingsForm.academicYear} ({settingsForm.semester})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
                        <div className="space-y-1.5">
                          <label className="block font-bold text-slate-700 dark:text-slate-200">
                            Tahun Pelajaran Utama *
                          </label>
                          <input
                            type="text"
                            required
                            value={settingsForm.academicYear}
                            onChange={(e) => setSettingsForm({ ...settingsForm, academicYear: e.target.value })}
                            placeholder="Contoh: 2026/2027"
                            className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block font-bold text-slate-700 dark:text-slate-200">
                            Semester Utama *
                          </label>
                          <select
                            value={settingsForm.semester}
                            onChange={(e) => setSettingsForm({ ...settingsForm, semester: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                          >
                            <option value="Ganjil">Ganjil (Semester 1)</option>
                            <option value="Genap">Genap (Semester 2)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 5. Zona Waktu & Offset Milidetik */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                      <div className="space-y-1.5">
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                          Zona Waktu Sistem
                        </label>
                        <select
                          value={settingsForm.timezone}
                          onChange={(e) => setSettingsForm({ ...settingsForm, timezone: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium cursor-pointer"
                        >
                          <option value="Asia/Jakarta">Asia/Jakarta (WIB - UTC+7)</option>
                          <option value="Asia/Makassar">Asia/Makassar (WITA - UTC+8)</option>
                          <option value="Asia/Jayapura">Asia/Jayapura (WIT - UTC+9)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                          Koreksi Offset Waktu (Milidetik)
                        </label>
                        <input
                          type="number"
                          value={settingsForm.timeSyncOffsetMs}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, timeSyncOffsetMs: Number(e.target.value) })
                          }
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Form Simpan */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 p-5 sm:p-6">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingSettings ? 'Menyimpan Pengaturan...' : 'Simpan Identitas Sekolah & Pengaturan Sistem'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </main>

        {/* 5. AppFooter Persis SIMASMUH */}
        <AppFooter />
      </div>

      {/* Modals */}
      {showSiswaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Tambah Siswa Baru</h3>
            <form onSubmit={handleCreateSiswa} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={siswaForm.name}
                    onChange={(e) => setSiswaForm({ ...siswaForm, name: e.target.value })}
                    placeholder="Nama siswa"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nomor Induk Siswa (NIS)</label>
                  <input
                    type="text"
                    required
                    value={siswaForm.nis || siswaForm.username}
                    onChange={(e) => setSiswaForm({ ...siswaForm, nis: e.target.value, username: e.target.value })}
                    placeholder="Contoh: 12345"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">NISN (Opsional)</label>
                  <input
                    type="text"
                    value={siswaForm.nisn}
                    onChange={(e) => setSiswaForm({ ...siswaForm, nisn: e.target.value })}
                    placeholder="NISN siswa"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Kelas</label>
                  <select
                    value={siswaForm.kelasId}
                    onChange={(e) => setSiswaForm({ ...siswaForm, kelasId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {siswaData?.kelasList?.map((k: any) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Password Default</label>
                  <input
                    type="text"
                    required
                    value={siswaForm.password || '123456'}
                    onChange={(e) => setSiswaForm({ ...siswaForm, password: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Ruang / Sesi</label>
                  <input
                    type="text"
                    value={siswaForm.ruangUjian}
                    onChange={(e) => setSiswaForm({ ...siswaForm, ruangUjian: e.target.value })}
                    placeholder="Lab 1"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSiswaModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Buat Bank Soal Baru */}
      {showCreateBankModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Tambah Bank Soal Baru</h3>
              <button
                onClick={() => setShowCreateBankModal(false)}
                className="text-slate-400 hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateBankSoal} className="space-y-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Kode Bank Soal</label>
                <input
                  type="text"
                  required
                  value={newBankForm.kodeBank}
                  onChange={(e) => setNewBankForm({ ...newBankForm, kodeBank: e.target.value.toUpperCase() })}
                  placeholder="Contoh: BS-MTK-X-2026"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Bank Soal</label>
                <input
                  type="text"
                  required
                  value={newBankForm.nama}
                  onChange={(e) => setNewBankForm({ ...newBankForm, nama: e.target.value })}
                  placeholder="Contoh: Bank Soal Matematika Wajib Kelas X"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tingkat</label>
                  <select
                    value={newBankForm.tingkat}
                    onChange={(e) => setNewBankForm({ ...newBankForm, tingkat: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    <option value={10}>Kelas 10 (Fase E)</option>
                    <option value={11}>Kelas 11 (Fase F)</option>
                    <option value={12}>Kelas 12 (Fase F)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Jurusan</label>
                  <select
                    value={newBankForm.jurusan || 'UMUM'}
                    onChange={(e) => setNewBankForm({ ...newBankForm, jurusan: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    <option value="MIPA">MIPA / IPA</option>
                    <option value="IPS">IPS</option>
                    <option value="UMUM">Umum (Semua Jurusan)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Mata Pelajaran</label>
                  <select
                    value={newBankForm.mataPelajaranId}
                    onChange={(e) => setNewBankForm({ ...newBankForm, mataPelajaranId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    {mapelList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama} ({m.kode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Durasi Standar (Menit)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={360}
                    value={newBankForm.durasiMenit}
                    onChange={(e) => setNewBankForm({ ...newBankForm, durasiMenit: Number(e.target.value) })}
                    placeholder="90"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateBankModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer shadow-md"
                >
                  Simpan Bank Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Bank Soal */}
      {editBankModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Informasi Bank Soal</h3>
              <button
                onClick={() => setEditBankModal(null)}
                className="text-slate-400 hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateBankSoal} className="space-y-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Kode Bank</label>
                <input
                  type="text"
                  required
                  value={editBankModal.kodeBank}
                  onChange={(e) => setEditBankModal({ ...editBankModal, kodeBank: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Bank Soal</label>
                <input
                  type="text"
                  required
                  value={editBankModal.nama}
                  onChange={(e) => setEditBankModal({ ...editBankModal, nama: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tingkat</label>
                  <select
                    value={editBankModal.tingkat}
                    onChange={(e) => setEditBankModal({ ...editBankModal, tingkat: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    <option value={10}>Kelas 10 (Fase E)</option>
                    <option value={11}>Kelas 11 (Fase F)</option>
                    <option value={12}>Kelas 12 (Fase F)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Jurusan</label>
                  <select
                    value={editBankModal.jurusan || 'UMUM'}
                    onChange={(e) => setEditBankModal({ ...editBankModal, jurusan: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    <option value="MIPA">MIPA / IPA</option>
                    <option value="IPS">IPS</option>
                    <option value="UMUM">Umum (Semua Jurusan)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Mata Pelajaran</label>
                  <select
                    value={editBankModal.mataPelajaranId}
                    onChange={(e) => setEditBankModal({ ...editBankModal, mataPelajaranId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    {mapelList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama} ({m.kode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={editBankModal.durasiMenit || 90}
                    onChange={(e) => setEditBankModal({ ...editBankModal, durasiMenit: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditBankModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Soal Excel */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>Import Butir Soal dari File Excel</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Upload file Excel berisi butir soal PG, PG Kompleks, KaTeX, & Essay
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-500/30 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-300">Belum punya template format Excel?</h4>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Gunakan template standar agar pembacaan soal otomatis dan akurat.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplateSoal}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Pilih Bank Soal Tujuan:
                  </label>
                  <select
                    value={importingBankId}
                    onChange={(e) => setImportingBankId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Pilih Bank Soal --</option>
                    {bankSoalList.map((bs) => (
                      <option key={bs.id} value={bs.id}>
                        {bs.nama} ({bs.kodeBank}) - {bs.mataPelajaran?.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Durasi (Menit):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={importDurasiMenit}
                    onChange={(e) => setImportDurasiMenit(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Pilih File Excel (.xlsx / .xls):
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUploadSoal}
                  className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 dark:file:bg-emerald-600/20 file:text-emerald-700 dark:file:text-emerald-300 hover:file:bg-emerald-100 file:cursor-pointer border border-slate-300 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-slate-950 p-1.5"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={importLoading || !importFileText}
                  onClick={handleExecuteImportSoal}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md disabled:opacity-50"
                >
                  {importLoading ? 'Memproses Import...' : 'Proses Import Soal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kirim Soal ke Kelas Tertentu */}
      {distributeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-cyan-500" />
                  <span>Kirim / Jadwalkan Soal ke Kelas</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bank Soal: <b>{distributeModal.nama}</b> ({distributeModal.kodeBank})
                </p>
              </div>
              <button
                onClick={() => setDistributeModal(null)}
                className="text-slate-400 hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteKirimKeKelas} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Kode Ujian</label>
                  <input
                    type="text"
                    required
                    value={distributeForm.kodeUjian}
                    onChange={(e) => setDistributeForm({ ...distributeForm, kodeUjian: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    required
                    value={distributeForm.durasiMenit}
                    onChange={(e) => setDistributeForm({ ...distributeForm, durasiMenit: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Judul Ujian</label>
                <input
                  type="text"
                  required
                  value={distributeForm.judul}
                  onChange={(e) => setDistributeForm({ ...distributeForm, judul: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              {/* Pilihan Rombel Kelas Target */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                  Pilih Kelas Tujuan Ujian (Centang Kelas):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10">
                  {kelasList.map((k) => {
                    const isChecked = distributeForm.kelasIds.includes(k.id)
                    return (
                      <label
                        key={k.id}
                        className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                          isChecked
                            ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-800 dark:text-cyan-200 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDistributeForm({ ...distributeForm, kelasIds: [...distributeForm.kelasIds, k.id] })
                            } else {
                              setDistributeForm({
                                ...distributeForm,
                                kelasIds: distributeForm.kelasIds.filter((id) => id !== k.id),
                              })
                            }
                          }}
                          className="rounded text-cyan-600"
                        />
                        <span className="truncate">{k.nama}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Opsi Anti-Cheat & Acak */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributeForm.lockBrowser}
                    onChange={(e) => setDistributeForm({ ...distributeForm, lockBrowser: e.target.checked })}
                  />
                  <span>Anti-Cheat</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributeForm.acakSoal}
                    onChange={(e) => setDistributeForm({ ...distributeForm, acakSoal: e.target.checked })}
                  />
                  <span>Acak Soal</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributeForm.acakOpsi}
                    onChange={(e) => setDistributeForm({ ...distributeForm, acakOpsi: e.target.checked })}
                  />
                  <span>Acak Opsi</span>
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setDistributeModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer shadow-md"
                >
                  Kirim & Aktifkan Ujian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
