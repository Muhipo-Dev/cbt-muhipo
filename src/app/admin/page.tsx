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
  Eye,
  ShieldAlert,
  Monitor,
  Maximize2,
  LogIn,
  Play,
  AlertOctagon,
  Activity,
  Radio,
  Check,
  Lock,
  Unlock,
  FileText,
  Ban,
  Video,
  Music,
  HelpCircle,
  Compass,
  Archive,
  ArchiveRestore,
  FolderArchive,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { DAFTAR_JURUSAN_MUHIPO, DAFTAR_TIPE_UJIAN } from '@/lib/constants'
import { NotificationModal, NotificationType } from '@/components/NotificationModal'

const formatLocalDatetime = (date: Date = new Date()) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

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
  const [dashboardJadwalSearch, setDashboardJadwalSearch] = useState('')
  const [dashboardJadwalSort, setDashboardJadwalSort] = useState<'terbaru' | 'terlama' | 'judul_asc' | 'judul_desc' | 'mapel_asc'>('terbaru')

  // 2. Proktor Live State & Live Polling (2 Detik Auto-Refresh)
  const [proktorData, setProktorData] = useState<any>(null)
  const [selectedProktorUjianId, setSelectedProktorUjianId] = useState('')
  const [selectedProktorKelas, setSelectedProktorKelas] = useState('ALL')
  const [extraTimeModal, setExtraTimeModal] = useState<any>(null)
  const [extraMinutes, setExtraMinutes] = useState(15)
  const [violationScreenModal, setViolationScreenModal] = useState<any>(null)
  const [liveScreenFeed, setLiveScreenFeed] = useState<any>(null)
  const [isLiveActive, setIsLiveActive] = useState(true)
  const [lastLiveUpdated, setLastLiveUpdated] = useState<Date>(new Date())

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
    jamMulai: '09:00',
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
  const [koreksiUjianList, setKoreksiUjianList] = useState<any[]>([])
  const [koreksiData, setKoreksiData] = useState<any>(null)
  const [selectedKoreksiUjianId, setSelectedKoreksiUjianId] = useState('')
  const [selectedKoreksiKelas, setSelectedKoreksiKelas] = useState('ALL')
  const [koreksiSubTab, setKoreksiSubTab] = useState<'rekap' | 'koreksi_esai'>('rekap')

  // 5. Data Siswa, Guru, Kelas, Jadwal
  const [siswaData, setSiswaData] = useState<any>(null)
  const [guruData, setGuruData] = useState<any>(null)
  const [kelasList, setKelasList] = useState<any[]>([])
  const [jadwalData, setJadwalData] = useState<any>(null)
  const [jadwalFilterTab, setJadwalFilterTab] = useState<'ALL' | 'AKTIF' | 'ARSIP'>('AKTIF')
  const [jadwalSearch, setJadwalSearch] = useState('')

  // 6. Sinkronisasi SIMASMUH State
  const [syncData, setSyncData] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)

  // 6b. Cetak Dokumen State
  const [cetakDocType, setCetakDocType] = useState<'kartu' | 'daftar_hadir' | 'berita_acara' | 'rekap_nilai'>('kartu')
  const [cetakKelasFilter, setCetakKelasFilter] = useState('ALL')
  const [cetakSesiFilter, setCetakSesiFilter] = useState('ALL')
  const [cetakRuangFilter, setCetakRuangFilter] = useState('ALL')
  const [cetakJadwalId, setCetakJadwalId] = useState('')
  const [cetakPengawas1, setCetakPengawas1] = useState('Drs. H. Pengawas 1, M.Pd.')
  const [cetakPengawas2, setCetakPengawas2] = useState('Pengawas Ruang 2, S.Pd.')

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

  // Modal Panduan Operasional Admin & Proktor
  const [showAdminGuideModal, setShowAdminGuideModal] = useState(false)

  // 8. In-App Notification / Dialog Modal State
  const [notifModal, setNotifModal] = useState<{
    isOpen: boolean
    type: NotificationType
    title: string
    message: string | React.ReactNode
    confirmText?: string
    cancelText?: string
    onConfirm?: () => void
    onCancel?: () => void
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  })

  const showNotification = (
    title: string,
    message: string | React.ReactNode,
    type: NotificationType = 'info',
    onConfirm?: () => void
  ) => {
    setNotifModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText: 'Tutup',
      onConfirm: () => {
        setNotifModal((prev) => ({ ...prev, isOpen: false }))
        if (onConfirm) onConfirm()
      },
    })
  }

  const showConfirm = (
    title: string,
    message: string | React.ReactNode,
    onConfirm: () => void,
    type: NotificationType = 'warning',
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal'
  ) => {
    setNotifModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        setNotifModal((prev) => ({ ...prev, isOpen: false }))
        onConfirm()
      },
      onCancel: () => {
        setNotifModal((prev) => ({ ...prev, isOpen: false }))
      },
    })
  }

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
    tipeUjian: 'PAS',
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
    tipeUjian: 'PAS',
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
    { id: 'kelas_mapel', name: 'Data Kelas & Mapel', icon: School },
    { id: 'cetak', name: 'Cetak Dokumen Ujian', icon: Printer },
    { id: 'pengaturan', name: 'Pengaturan Sistem', icon: Settings },
  ]

  useEffect(() => {
    fetchSessionAndAdminData()
  }, [activeTab, selectedProktorUjianId, selectedKoreksiUjianId])

  // Live Auto-Refresh Polling Setiap 2 Detik untuk Live Monitoring Ujian & Dashboard
  useEffect(() => {
    if (!isLiveActive) return

    const interval = setInterval(async () => {
      try {
        if (activeTab === 'proktor_live') {
          const url = selectedProktorUjianId
            ? `/api/proktor?ujianId=${selectedProktorUjianId}`
            : '/api/proktor'
          const res = await fetch(url)
          const json = await res.json()
          if (json.success) {
            setProktorData(json.data)
            setLastLiveUpdated(new Date())
          }
        } else if (activeTab === 'dashboard') {
          const res = await fetch('/api/admin?tab=dashboard')
          const json = await res.json()
          if (json.success) {
            setDashboardData(json.data)
            setLastLiveUpdated(new Date())
          }
        }
      } catch (err) {
        // Silent polling error
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [activeTab, selectedProktorUjianId, isLiveActive])

  // Realtime Polling Layar Siswa (Active Screen Stream) jika modal inspeksi layar dibuka di Admin
  useEffect(() => {
    if (!violationScreenModal?.pesertaUjianId) {
      setLiveScreenFeed(null)
      return
    }

    const fetchLiveFeed = async () => {
      try {
        const res = await fetch(`/api/proktor/screen?pesertaUjianId=${violationScreenModal.pesertaUjianId}`)
        const json = await res.json()
        if (json.success && json.data) {
          setLiveScreenFeed(json.data)
        }
      } catch (err) {
        // silent
      }
    }

    fetchLiveFeed()
    const liveInterval = setInterval(fetchLiveFeed, 1500)
    return () => clearInterval(liveInterval)
  }, [violationScreenModal?.pesertaUjianId])

  const fetchSessionAndAdminData = async () => {
    try {
      setLoading(true)
      const meRes = await fetch('/api/auth/me')
      const meJson = await meRes.json()
      if (meJson.success) {
        setCurrentUser(meJson.user)
      }

      // Selalu muat Pengaturan Sistem (Logo, Wallpaper, Identitas) di awal agar tidak reset saat refresh
      try {
        const pRes = await fetch('/api/pengaturan')
        const pJson = await pRes.json()
        if (pJson.success && pJson.data) {
          setSettingsForm({
            schoolName: pJson.data.schoolName || 'SMA Muhammadiyah 1 Ponorogo',
            appTitle: pJson.data.appTitle || 'CBT MUHIPO',
            academicYear: pJson.data.academicYear || '2026/2027',
            semester: pJson.data.semester || 'Ganjil',
            timezone: pJson.data.timezone || 'Asia/Jakarta',
            serverLocation: pJson.data.serverLocation || 'Ponorogo, Jawa Timur',
            logoUrl: pJson.data.logoUrl || '/pic_logo.png',
            backgroundUrl: pJson.data.backgroundUrl || '/muhipo-front.jpg',
            timeSyncOffsetMs: pJson.data.timeSyncOffsetMs || 0,
          })
          if (pJson.serverTime) setServerTimeData(pJson.serverTime)
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
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
        if (json.success) {
          setKoreksiUjianList(json.data.ujianList || [])
          setKoreksiData(json.data)
          if (!selectedKoreksiUjianId && json.data.activeUjian?.id) {
            setSelectedKoreksiUjianId(json.data.activeUjian.id)
          }
        }
      } else if (activeTab === 'jadwal') {
        const res = await fetch('/api/admin?tab=jadwal')
        const json = await res.json()
        if (json.success) {
          setJadwalData(json.data)
          if (json.data?.kelasList) setKelasList(json.data.kelasList)
          if (json.data?.bankSoalList) setBankSoalList(json.data.bankSoalList)
        }
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
      } else if (activeTab === 'cetak') {
        const [sRes, jRes, kRes, nRes] = await Promise.all([
          fetch('/api/admin?tab=siswa'),
          fetch('/api/admin?tab=jadwal'),
          fetch('/api/admin?tab=kelas'),
          fetch('/api/guru/koreksi'),
        ]);
        const [sJson, jJson, kJson, nJson] = await Promise.all([
          sRes.json(),
          jRes.json(),
          kRes.json(),
          nRes.json(),
        ]);
        if (sJson.success) setSiswaData(sJson.data)
        if (jJson.success) {
          setJadwalData(jJson.data)
          if (jJson.data?.jadwalList?.length > 0 && !cetakJadwalId) {
            setCetakJadwalId(jJson.data.jadwalList[0].id)
          }
        }
        if (kJson.success) setKelasList(kJson.data)
        if (nJson.success && nJson.data) {
          setKoreksiData(nJson.data)
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
      if (json.success) {
        showNotification('Sinkronisasi SIMASMUH', json.message, 'success')
      } else {
        showNotification('Gagal Sinkronisasi', json.message || 'Gagal sinkronisasi data SIMASMUH.', 'error')
      }
      fetchSessionAndAdminData()
    } catch (e) {
      showNotification('Koneksi Error', 'Gagal menjalankan sinkronisasi data dari SIMASMUH. Pastikan database SIMASMUH aktif.', 'error')
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
      showNotification('Memproses', 'Mengompres dan menyimpan logo...', 'info')
      const compressed = await compressImageFile(file, { maxWidth: 600, maxHeight: 600, quality: 0.85 })
      const newSettings = { ...settingsForm, logoUrl: compressed.dataUrl }
      setSettingsForm(newSettings)

      // Auto-save langsung ke server & database agar tersimpan permanen
      const res = await fetch('/api/pengaturan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      const json = await res.json()
      if (json.success && json.data?.logoUrl) {
        setSettingsForm((prev) => ({ ...prev, logoUrl: json.data.logoUrl }))
        showNotification('Sukses', 'Logo berhasil disimpan permanen ke basis data!', 'success')
      } else {
        showNotification('Peringatan', json.message || 'Gagal menyimpan logo ke database.', 'warning')
      }
    } catch (err) {
      console.error('Gagal mengompres logo:', err)
      showNotification('Peringatan', 'Terjadi kesalahan saat memproses logo.', 'warning')
    }
  }

  const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      showNotification('Memproses', 'Mengompres dan menyimpan wallpaper background...', 'info')
      const compressed = await compressImageFile(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.85 })
      const newSettings = { ...settingsForm, backgroundUrl: compressed.dataUrl }
      setSettingsForm(newSettings)

      // Auto-save langsung ke server & database agar tersimpan permanen
      const res = await fetch('/api/pengaturan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      const json = await res.json()
      if (json.success && json.data?.backgroundUrl) {
        setSettingsForm((prev) => ({ ...prev, backgroundUrl: json.data.backgroundUrl }))
        showNotification('Sukses', 'Wallpaper Background Master berhasil disimpan permanen ke basis data!', 'success')
      } else {
        showNotification('Peringatan', json.message || 'Gagal menyimpan wallpaper ke database.', 'warning')
      }
    } catch (err) {
      console.error('Gagal mengompres background master:', err)
      showNotification('Peringatan', 'Terjadi kesalahan saat memproses wallpaper background.', 'warning')
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
        showNotification('Pengaturan Disimpan', 'Pengaturan sistem CBT & aset berkas berhasil disimpan!', 'success')
        if (json.data) {
          setSettingsForm({
            schoolName: json.data.schoolName || settingsForm.schoolName,
            appTitle: json.data.appTitle || settingsForm.appTitle,
            academicYear: json.data.academicYear || settingsForm.academicYear,
            semester: json.data.semester || settingsForm.semester,
            timezone: json.data.timezone || settingsForm.timezone,
            serverLocation: json.data.serverLocation || settingsForm.serverLocation,
            logoUrl: json.data.logoUrl || settingsForm.logoUrl,
            backgroundUrl: json.data.backgroundUrl || settingsForm.backgroundUrl,
            timeSyncOffsetMs: json.data.timeSyncOffsetMs ?? settingsForm.timeSyncOffsetMs,
          })
        }
        fetchSessionAndAdminData()
      } else {
        showNotification('Gagal Simpan', json.message || 'Gagal menyimpan pengaturan.', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Terjadi kesalahan saat menyimpan pengaturan.', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleResetPassword = async (userId: string, userName: string) => {
    showConfirm(
      'Reset Kata Sandi',
      `Reset kata sandi ${userName} ke default (123456)?`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'RESET_PASSWORD', userId }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Reset Berhasil', json.message, 'success')
          } else {
            showNotification('Gagal', json.message || 'Gagal reset password', 'error')
          }
        } catch (e) {
          showNotification('Error', 'Gagal reset password', 'error')
        }
      }
    )
  }

  const handleResetLogin = async (pesertaUjianId: string, namaSiswa: string) => {
    showConfirm(
      'Reset Login Ujian',
      `Reset status ujian siswa "${namaSiswa}" agar dapat login kembali?`,
      async () => {
        try {
          const res = await fetch('/api/proktor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'RESET_LOGIN', pesertaUjianId }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Reset Status Ujian', json.message, 'success')
            fetchSessionAndAdminData()
          } else {
            showNotification('Gagal', json.message || 'Gagal reset status ujian', 'error')
          }
        } catch (e) {
          showNotification('Error', 'Gagal reset status ujian', 'error')
        }
      }
    )
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
        showNotification('Waktu Tambahan', json.message, 'success')
        setExtraTimeModal(null)
        fetchSessionAndAdminData()
      } else {
        showNotification('Gagal', json.message || 'Gagal tambah waktu', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Gagal tambah waktu', 'error')
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
        showNotification('Bank Soal Dibuat', 'Bank Soal berhasil dibuat!', 'success')
        setShowCreateBankModal(false)
        fetchSessionAndAdminData()
      } else {
        showNotification('Gagal', json.message || 'Gagal membuat bank soal', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Gagal membuat bank soal', 'error')
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
        showNotification('Bank Soal Diperbarui', 'Bank Soal berhasil diperbarui!', 'success')
        setEditBankModal(null)
        fetchSessionAndAdminData()
        if (selectedBankSoal?.id === editBankModal.id) {
          handleSelectBankSoal(editBankModal.id)
        }
      } else {
        showNotification('Gagal', json.message || 'Gagal memperbarui bank soal', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Terjadi kesalahan saat memperbarui bank soal', 'error')
    }
  }

  const handleCreateJadwal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jadwalForm.bankSoalId) {
      showNotification('Peringatan', 'Silakan pilih Bank Soal terlebih dahulu.', 'warning')
      return
    }
    if (!jadwalForm.kelasIds || jadwalForm.kelasIds.length === 0) {
      showNotification('Peringatan', 'Pilih minimal 1 kelas tujuan ujian.', 'warning')
      return
    }

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_UJIAN',
          ...jadwalForm,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Jadwal Berhasil Dibuat', json.message || 'Jadwal Ujian berhasil dibuat dan didistribusikan ke peserta!', 'success')
        setShowJadwalModal(false)
        setJadwalForm({
          tipeUjian: 'PAS',
          kodeUjian: '',
          judul: '',
          bankSoalId: '',
          durasiMenit: 90,
          waktuMulai: formatLocalDatetime(),
          waktuSelesai: formatLocalDatetime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          lockBrowser: true,
          acakSoal: true,
          acakOpsi: true,
          kelasIds: [],
        })
        fetchSessionAndAdminData()
      } else {
        showNotification('Gagal', json.message || 'Gagal membuat jadwal ujian', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Terjadi kesalahan saat membuat jadwal ujian.', 'error')
    }
  }

  const handleArchiveJadwal = async (ujianId: string, judul: string) => {
    showConfirm(
      'Arsipkan Jadwal Ujian',
      `Arsipkan ujian "${judul}"? Ujian akan dipindahkan ke tab Arsip Ujian dan disembunyikan dari jadwal aktif siswa. Seluruh nilai peserta, riwayat butir jawaban, dan rekaman audit log pelanggaran tetap tersimpan aman dan utuh.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ARCHIVE_UJIAN', ujianId }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Jadwal Diarsipkan', json.message, 'success')
            fetchSessionAndAdminData()
          } else {
            showNotification('Gagal', json.message || 'Gagal mengarsipkan jadwal ujian', 'error')
          }
        } catch (e) {
          showNotification('Error', 'Gagal mengarsipkan jadwal ujian', 'error')
        }
      },
      'warning',
      'Ya, Arsipkan Ujian'
    )
  }

  const handleUnarchiveJadwal = async (ujianId: string, judul: string) => {
    showConfirm(
      'Aktifkan Kembali Jadwal Ujian',
      `Aktifkan kembali jadwal ujian "${judul}" dari arsip ke daftar ujian aktif?`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'UNARCHIVE_UJIAN', ujianId }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Jadwal Diaktifkan', json.message, 'success')
            fetchSessionAndAdminData()
          } else {
            showNotification('Gagal', json.message || 'Gagal mengaktifkan jadwal ujian', 'error')
          }
        } catch (e) {
          showNotification('Error', 'Gagal mengaktifkan jadwal ujian', 'error')
        }
      },
      'info',
      'Ya, Aktifkan Kembali'
    )
  }

  const handleDeleteJadwal = async (ujianId: string, judul: string) => {
    showConfirm(
      'Hapus Permanen Jadwal Ujian',
      `PERINGATAN: Menghapus permanen Jadwal Ujian "${judul}" akan membersihkan seluruh data pengerjaan peserta dan rekaman log. Jika Anda hanya ingin menyudahi ujian dan menyimpan histori nilainya, gunakan tombol ARSIPKAN. Yakin ingin hapus permanen?`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE_UJIAN', ujianId }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Jadwal Dihapus', 'Jadwal Ujian berhasil dihapus permanen!', 'success')
            fetchSessionAndAdminData()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus jadwal ujian', 'error')
          }
        } catch (e) {
          showNotification('Error', 'Gagal menghapus jadwal ujian', 'error')
        }
      },
      'error',
      'Ya, Hapus Permanen'
    )
  }

  const handleDeleteBankSoal = async (bankSoalId: string, nama: string) => {
    showConfirm(
      'Hapus Bank Soal',
      `Hapus Bank Soal "${nama}" beserta seluruh butir soal dan jadwal terkait?`,
      async () => {
        try {
          const res = await fetch('/api/guru/soal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE_BANK_SOAL', bankSoalId }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Bank Soal Dihapus', json.message, 'success')
            if (selectedBankSoal?.id === bankSoalId) {
              setSelectedBankSoal(null)
            }
            fetchSessionAndAdminData()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus bank soal', 'error')
          }
        } catch (e) {
          showNotification('Error', 'Gagal menghapus bank soal', 'error')
        }
      },
      'error',
      'Ya, Hapus Bank Soal'
    )
  }

  const handleDeleteSingleSoal = async (soalId: string) => {
    showConfirm(
      'Hapus Butir Soal',
      'Yakin ingin menghapus butir soal ini?',
      async () => {
        try {
          const res = await fetch('/api/guru/soal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE_SOAL', soalId }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Soal Dihapus', 'Soal berhasil dihapus!', 'success')
            if (selectedBankSoal) handleSelectBankSoal(selectedBankSoal.id)
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus soal', 'error')
          }
        } catch (e) {
          showNotification('Error', 'Gagal menghapus soal', 'error')
        }
      },
      'error',
      'Ya, Hapus Soal'
    )
  }

  // Unduh Template Format Import Excel Soal
  const handleDownloadTemplateSoal = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('Format_Import_Soal', {
        views: [{ showGridLines: true }]
      });

      // Definisikan Lebar Kolom
      ws.columns = [
        { key: 'col1', width: 8 },   // No.
        { key: 'col2', width: 24 },  // Keterangan
        { key: 'col3', width: 10 },  // Tipe
        { key: 'col4', width: 68 },  // Isi Soal / Jawaban
        { key: 'col5', width: 22 },  // Status Jawaban
      ];

      // Border Thin Helper
      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };

      const tableBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FF374151' } },
        left: { style: 'thin', color: { argb: 'FF374151' } },
        bottom: { style: 'thin', color: { argb: 'FF374151' } },
        right: { style: 'thin', color: { argb: 'FF374151' } }
      };

      // Baris 1: Judul Utama
      ws.mergeCells('A1:E1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'TEMPLATE IMPORT SOAL CBT';
      titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4338CA' } // Indigo / Biru Ungu
      };
      ws.getRow(1).height = 28;

      // Baris 2: Sub-judul / Keterangan Tipe
      ws.mergeCells('A2:E2');
      const subCell = ws.getCell('A2');
      subCell.value = 'Tipe: Q (Pilihan Ganda), Q2 (Esai), Q3 (Jawaban Singkat), Q4 (PG Kompleks), Q5 (Benar/Salah), Q6 (Menjodohkan)';
      subCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E7FF' } // Indigo muda
      };
      ws.getRow(2).height = 22;

      // Baris 3 & 4 kosong
      ws.getRow(3).height = 14;
      ws.getRow(4).height = 14;

      // Baris 5: Table Header
      const headerRow = ws.getRow(5);
      headerRow.values = ['No.', 'Keterangan', 'Tipe', 'Isi Soal / Jawaban', 'Status Jawaban'];
      headerRow.height = 26;
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: colNumber === 4 ? 'left' : 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' } // Dark Slate Navy
        };
        cell.border = tableBorder;
      });

      // Data Baris Soal & Jawaban beserta Styling Warna
      const rowsData = [
        // No 1: PG
        { row: [1, 'Soal Pilihan Ganda', 'Q', 'Ibu kota negara Indonesia adalah...', ''], bg: 'FFE0E7FF', isBold: true },
        { row: ['', 'Jawaban Benar', 'A', 'Jakarta', 1], bg: 'FFDCFCE7', isBold: false }, // Hijau muda (benar)
        { row: ['', '', 'A', 'Surabaya', 0], bg: 'FFFFFFFF', isBold: false },
        { row: ['', '', 'A', 'Bandung', 0], bg: 'FFFFFFFF', isBold: false },
        { row: ['', '', 'A', 'Yogyakarta', 0], bg: 'FFFFFFFF', isBold: false },
        // No 2: Esai
        { row: [2, 'Soal Esai', 'Q2', 'Jelaskan pengertian Pancasila sebagai dasar negara Indonesia!', ''], bg: 'FFE0F2FE', isBold: true }, // Sky Blue
        // No 3: Jawaban Singkat
        { row: [3, 'Jawaban Singkat', 'Q3', 'Sebutkan 3 pulau terbesar di Indonesia!', ''], bg: 'FFFEF3C7', isBold: true }, // Amber / Kuning
        // No 4: PG Kompleks
        { row: [4, 'Soal PG Kompleks', 'Q4', 'Manakah yang termasuk organ pernapasan pada manusia?', ''], bg: 'FFFCE7F3', isBold: true }, // Pink
        { row: ['', 'Jawaban Benar', 'A', 'Hidung', 1], bg: 'FFDCFCE7', isBold: false },
        { row: ['', '', 'A', 'Lambung', 0], bg: 'FFFFFFFF', isBold: false },
        { row: ['', 'Jawaban Benar', 'A', 'Paru-paru', 1], bg: 'FFDCFCE7', isBold: false },
        // No 5: Benar/Salah
        { row: [5, 'Soal Benar/Salah', 'Q5', 'Fotosintesis terjadi di dalam kloroplas tumbuhan', ''], bg: 'FFFFE4E6', isBold: true }, // Rose muda
        { row: ['', 'Pernyataan BENAR', 'A', 'Benar', 1], bg: 'FFDCFCE7', isBold: false },
        // No 6: Menjodohkan
        { row: [6, 'Soal Menjodohkan', 'Q6', 'Pasangkan negara dengan ibu kotanya!', ''], bg: 'FFF3E8FF', isBold: true }, // Purple muda
        { row: ['', 'Premis -> Respons', 'A', 'Indonesia', 'Jakarta'], bg: 'FFFFFFFF', isBold: false },
        { row: ['', 'Premis -> Respons', 'A', 'Malaysia', 'Kuala Lumpur'], bg: 'FFFFFFFF', isBold: false },
      ];

      rowsData.forEach((item, idx) => {
        const rowIdx = 6 + idx;
        const row = ws.getRow(rowIdx);
        row.values = item.row;
        row.height = 20;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { name: 'Calibri', size: 10, bold: item.isBold };
          cell.alignment = {
            horizontal: colNumber === 4 ? 'left' : (colNumber === 2 ? (item.isBold ? 'left' : 'left') : 'center'),
            vertical: 'middle'
          };
          if (item.bg !== 'FFFFFFFF') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: item.bg }
            };
          }
          cell.border = thinBorder;
        });
      });

      // Generate Buffer and Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'Template_Import_Soal_CBT_MUHIPO.xlsx';
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download template error:', err);
      showNotification('Error', 'Gagal membuat file template Excel', 'error');
    }
  };

  // Upload & Parse File Excel Soal
  const handleFileUploadSoal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];

        // Deteksi baris header secara dinamis (mencari baris yang mengandung 'Tipe' / 'Isi Soal')
        let headerRowIndex = 0;
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:E50');
        for (let r = range.s.r; r <= Math.min(range.e.r, 20); r++) {
          let foundHeader = false;
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            const val = cell ? String(cell.v).toLowerCase().trim() : '';
            if (val === 'tipe' || val === 'isi soal / jawaban' || val === 'keterangan' || val === 'pertanyaan') {
              foundHeader = true;
              break;
            }
          }
          if (foundHeader) {
            headerRowIndex = r;
            break;
          }
        }

        const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: '' });

        if (!rawRows || rawRows.length === 0) {
          showNotification('Peringatan Format', 'File Excel kosong atau format tidak sesuai.', 'warning');
          return;
        }

        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const parsedItems: any[] = [];
        let currentSoal: any = null;

        // Cek apakah file menggunakan format vertikal baru (ada kolom Tipe / Type / TIPE)
        const hasTipeColumn = rawRows.some(
          (r) => r['Tipe'] !== undefined || r['TIPE'] !== undefined || r['tipe'] !== undefined || r['Type'] !== undefined
        );

        if (hasTipeColumn) {
          // ================= FORMAT BARU VERTIKAL (Q, Q2..Q6, A logika 1/0) =================
          for (const row of rawRows) {
            const rawTipe = String(row['Tipe'] || row['TIPE'] || row['tipe'] || row['Type'] || '').trim().toUpperCase();
            const rawContent = String(row['Isi Soal / Jawaban'] || row['Isi Soal'] || row['Pertanyaan / Soal'] || row['Soal'] || row['Konten'] || '').trim();
            const rawStatus = row['Status Jawaban'] !== undefined ? row['Status Jawaban'] : row['Status'];
            const rawBobot = row['Kesulitan'] !== undefined && row['Kesulitan'] !== '' ? Number(row['Kesulitan']) : (row['Bobot'] ? Number(row['Bobot']) : null);

            // Deteksi baris Soal (Q, Q1, Q2, Q3, Q4, Q5, Q6)
            if (rawTipe.startsWith('Q')) {
              // Simpan soal sebelumnya jika ada
              if (currentSoal && currentSoal.pertanyaan) {
                parsedItems.push(currentSoal);
              }

              let dbTipe = 'PG';
              if (rawTipe === 'Q' || rawTipe === 'Q1') dbTipe = 'PG';
              else if (rawTipe === 'Q2') dbTipe = 'ESAI';
              else if (rawTipe === 'Q3') dbTipe = 'ISIAN';
              else if (rawTipe === 'Q4') dbTipe = 'PG_KOMPLEKS';
              else if (rawTipe === 'Q5') dbTipe = 'BENAR_SALAH';
              else if (rawTipe === 'Q6') dbTipe = 'MENJODOHKAN';

              currentSoal = {
                tipeSoal: dbTipe,
                pertanyaan: rawContent,
                bobot: rawBobot && rawBobot > 0 ? rawBobot : (dbTipe === 'ESAI' ? 4.0 : dbTipe === 'ISIAN' ? 2.0 : 1.0),
                opsi: [],
                rawMatchingPairs: [],
                matchingData: undefined,
                kunciJawabanTeks: undefined,
              }

              // Jika ada kunci/rubrik langsung di baris Q
              if (rawStatus && String(rawStatus).trim()) {
                currentSoal.kunciJawabanTeks = String(rawStatus).trim()
              }
            } else if (rawTipe === 'A' && currentSoal) {
              // Deteksi baris Jawaban / Opsi untuk soal yang sedang aktif
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
                // PG & PG_KOMPLEKS
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

          // Masukkan soal terakhir
          if (currentSoal && currentSoal.pertanyaan) {
            parsedItems.push(currentSoal)
          }

          // Post-processing untuk setiap soal
          for (const item of parsedItems) {
            if (item.tipeSoal === 'MENJODOHKAN' && item.rawMatchingPairs && item.rawMatchingPairs.length > 0) {
              item.matchingData = JSON.stringify(item.rawMatchingPairs)
            }
            delete item.rawMatchingPairs
          }
        } else {
          // ================= KOMPATIBILITAS FORMAT HORIZONTAL LAMA =================
          for (const row of rawRows) {
            const tipe = (row['Tipe Soal'] || 'PG').toUpperCase()
            const pertanyaan = row['Pertanyaan / Soal'] || row['Pertanyaan'] || row['Soal'] || ''
            const bobot = Number(row['Bobot'] || row['Kesulitan']) || 2.0
            const kunci = String(row['Kunci Jawaban (A/B/C/D/E)'] || row['Kunci'] || '').trim().toUpperCase()
            const kunciTeks = row['Kunci Teks/Rubrik Essay'] || row['Kunci Essay'] || ''

            let matchingData: string | undefined = undefined
            if (tipe === 'MENJODOHKAN') {
              const pairs: { left: string; right: string }[] = []
              ;['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((lbl) => {
                const val = String(row[`Pilihan ${lbl}`] || row[`Opsi ${lbl}`] || row[lbl] || '').trim()
                if (val && val.includes('=')) {
                  const [left, ...rest] = val.split('=')
                  const right = rest.join('=').trim()
                  if (left.trim() && right) {
                    pairs.push({ left: left.trim(), right })
                  }
                }
              })
              if (pairs.length > 0) {
                matchingData = JSON.stringify(pairs)
              }
            }

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

            if (pertanyaan.trim() !== '') {
              parsedItems.push({
                tipeSoal: tipe,
                pertanyaan,
                bobot,
                opsi,
                matchingData,
                kunciJawabanTeks: kunciTeks || undefined,
              })
            }
          }
        }

        if (parsedItems.length === 0) {
          showNotification('Peringatan Data', 'Tidak ditemukan baris pertanyaan soal yang valid pada file Excel.', 'warning')
          return
        }

        setImportFileText(JSON.stringify(parsedItems))
        showNotification('File Terbaca', `Berhasil membaca ${parsedItems.length} butir soal dari file Excel. Klik "Proses Import Soal" untuk menyimpan.`, 'success')
      } catch (err) {
        console.error(err)
        showNotification('Gagal Membaca File', 'Gagal membaca file Excel. Pastikan file menggunakan format Template Resmi.', 'error')
      }
    }
    reader.readAsBinaryString(file)
  }

  // Eksekusi Simpan Soal Import ke Database
  const handleExecuteImportSoal = async () => {
    if (!importingBankId) {
      showNotification('Peringatan', 'Pilih Bank Soal tujuan import terlebih dahulu.', 'warning')
      return
    }
    if (!importFileText) {
      showNotification('Peringatan', 'Silakan pilih file Excel soal terlebih dahulu.', 'warning')
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
        showNotification('Import Berhasil', json.message, 'success')
        setShowImportModal(false)
        setImportFileText('')
        handleSelectBankSoal(importingBankId)
        fetchSessionAndAdminData()
      } else {
        showNotification('Gagal Import', json.message || 'Gagal mengimport butir soal', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Terjadi kesalahan saat mengimport soal.', 'error')
    } finally {
      setImportLoading(false)
    }
  }

  // Eksekusi Distribusi / Kirim Soal ke Kelas Tertentu
  const handleExecuteKirimKeKelas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!distributeModal) return
    if (!distributeForm.kelasIds.length) {
      showNotification('Peringatan', 'Pilih minimal 1 kelas tujuan distribusi ujian.', 'warning')
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
        showNotification('Distribusi Ujian Sukses', json.message, 'success')
        setDistributeModal(null)
        fetchSessionAndAdminData()
      } else {
        showNotification('Gagal', json.message || 'Gagal mendistribusikan soal ke kelas', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Terjadi kesalahan saat mendistribusikan soal ke kelas.', 'error')
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
        showNotification('Soal Disimpan', 'Soal berhasil disimpan!', 'success')
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
      } else {
        showNotification('Gagal Simpan', json.message || 'Gagal menyimpan butir soal', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Gagal simpan soal', 'error')
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
        showNotification('Siswa Didaftarkan', 'Siswa berhasil didaftarkan!', 'success')
        setShowSiswaModal(false)
        fetchSessionAndAdminData()
      } else {
        showNotification('Gagal', json.message || 'Gagal tambah siswa', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Gagal tambah siswa', 'error')
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
        showNotification('Guru Didaftarkan', 'Guru berhasil didaftarkan!', 'success')
        setShowGuruModal(false)
        fetchSessionAndAdminData()
      } else {
        showNotification('Gagal', json.message || 'Gagal tambah guru', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Gagal tambah guru', 'error')
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
        showNotification('Kelas Dibuat', 'Kelas berhasil ditambahkan!', 'success')
        setShowKelasModal(false)
        fetchSessionAndAdminData()
      } else {
        showNotification('Gagal', json.message || 'Gagal tambah kelas', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Gagal tambah kelas', 'error')
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
        showNotification('Mapel Dibuat', 'Mata Pelajaran berhasil ditambahkan!', 'success')
        setShowMapelModal(false)
        fetchSessionAndAdminData()
      } else {
        showNotification('Gagal', json.message || 'Gagal tambah mapel', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Gagal tambah mapel', 'error')
    }
  }



  const fetchKoreksiData = async (ujianId?: string) => {
    try {
      const url = ujianId ? `/api/guru/koreksi?ujianId=${ujianId}` : '/api/guru/koreksi'
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setKoreksiUjianList(json.data.ujianList || [])
        setKoreksiData(json.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSimpanNilaiEssay = async (jawabanPesertaId: string, skor: number, pesertaUjianId: string) => {
    try {
      const res = await fetch('/api/guru/koreksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jawabanPesertaId,
          skor,
          pesertaUjianId,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Nilai Disimpan', 'Nilai isian/essay berhasil disimpan dan total skor otomatis terakumulasi!', 'success')
        fetchKoreksiData(selectedKoreksiUjianId)
      } else {
        showNotification('Gagal', json.message || 'Gagal menyimpan nilai', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Gagal menyimpan nilai', 'error')
    }
  }

  // List Kelas Unik untuk Filter Ruang Ujian / Proktor Live
  const proktorKelasOptions = useMemo(() => {
    if (!proktorData?.pesertaList) return []
    const unique = new Set<string>()
    proktorData.pesertaList.forEach((p: any) => {
      if (p.kelas && p.kelas !== '-') unique.add(p.kelas)
    })
    return Array.from(unique).sort()
  }, [proktorData])

  // Filtered Peserta Proktor Live berdasarkan Jadwal Terpilih & Kelas
  const filteredProktorPeserta = useMemo(() => {
    if (!proktorData?.pesertaList) return []
    return proktorData.pesertaList.filter((p: any) => {
      const matchKelas = selectedProktorKelas === 'ALL' || p.kelas === selectedProktorKelas
      const matchSearch =
        !searchQuery.trim() ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.kelas?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchKelas && matchSearch
    })
  }, [proktorData, selectedProktorKelas, searchQuery])

  // List Kelas Unik untuk Filter Rekap & Koreksi Nilai
  const koreksiKelasOptions = useMemo(() => {
    if (!koreksiData?.hasilList) return []
    const unique = new Set<string>()
    koreksiData.hasilList.forEach((p: any) => {
      const kelasNama = p.siswa?.kelas?.nama
      if (kelasNama) unique.add(kelasNama)
    })
    return Array.from(unique).sort()
  }, [koreksiData])

  // Filtered Peserta Koreksi & Rekap Nilai berdasarkan Jadwal Terpilih & Kelas
  const filteredKoreksiPeserta = useMemo(() => {
    if (!koreksiData?.hasilList) return []
    return koreksiData.hasilList.filter((p: any) => {
      const kelasNama = p.siswa?.kelas?.nama
      const matchKelas = selectedKoreksiKelas === 'ALL' || kelasNama === selectedKoreksiKelas
      const matchSearch =
        !searchQuery.trim() ||
        p.siswa?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.siswa?.nis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.siswa?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kelasNama?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchKelas && matchSearch
    })
  }, [koreksiData, selectedKoreksiKelas, searchQuery])

  const handleExportExcel = () => {
    const listToExport = filteredKoreksiPeserta.length > 0 ? filteredKoreksiPeserta : koreksiData?.hasilList
    if (!listToExport?.length) {
      showNotification('Informasi', 'Belum ada data nilai untuk diekspor.', 'info')
      return
    }
    const currentKkm = Number(koreksiData?.activeUjian?.bankSoal?.kkm ?? 75)
    const rows = listToExport.map((p: any, idx: number) => {
      const isTuntas = Number(p.nilaiTotal ?? 0) >= currentKkm
      const nilaiPGFormatted = p.nilaiPG != null ? Number(Number(p.nilaiPG).toFixed(2)) : 0
      const nilaiEsaiFormatted = p.nilaiEsai != null ? Number(Number(p.nilaiEsai).toFixed(2)) : 0
      const nilaiTotalFormatted = p.nilaiTotal != null ? Number(Number(p.nilaiTotal).toFixed(2)) : 0

      return {
        No: idx + 1,
        NIS: p.siswa.nis || p.siswa.username,
        NISN: p.siswa.nisn || '-',
        'Nama Siswa': p.siswa.name,
        Kelas: p.siswa.kelas?.nama || '-',
        'Nilai PG/Pilihan': nilaiPGFormatted,
        'Nilai Isian/Essay': nilaiEsaiFormatted,
        'Total Nilai': nilaiTotalFormatted,
        'KKM Mapel': currentKkm,
        'Ketuntasan': isTuntas ? 'TUNTAS' : 'REMIDIAL',
        'Status Ujian': p.status,
      }
    })
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Nilai_CBT')
    const namaKelasSuffix = selectedKoreksiKelas !== 'ALL' ? `_${selectedKoreksiKelas}` : ''
    XLSX.writeFile(workbook, `Rekap_Nilai_${koreksiData?.activeUjian?.kodeUjian || 'Ujian'}${namaKelasSuffix}.xlsx`)
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
          subtitle="Manajemen Ujian SMA Muhammadiyah 1 Ponorogo"
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
                      <span className="text-slate-500 dark:text-slate-400 block">Daftar Rombel</span>
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
                      onClick={() => handleRunSync('NILAI')}
                      disabled={syncing || !syncData.simasmuh.connected}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition disabled:opacity-50"
                      title="Kirim Nilai CBT ke Master Nilai (Grade) SIMASMUH"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Nilai ke SIMASMUH</span>
                    </button>
                    <button
                      onClick={() => handleRunSync('SISWA')}
                      disabled={syncing || !syncData.simasmuh.connected}
                      className="py-2.5 px-3 rounded-xl bg-slate-100/80 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200 dark:border-white/20 text-slate-800 dark:text-white font-bold text-xs cursor-pointer transition disabled:opacity-50"
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
              {/* Statistik Utama CBT Muhipo (Clean & Rapi 4 Metrik Utama + Detail Status) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-md backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Siswa</span>
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{dashboardData.counts.countSiswa}</span>
                    <span className="text-[11px] text-slate-400">({dashboardData.counts.countKelas} Rombel)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-md backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Bank Soal</span>
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{dashboardData.counts.countBankSoal}</span>
                    <span className="text-[11px] text-slate-400">({dashboardData.counts.countGuru} Guru)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-md backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Jadwal Ujian</span>
                    <Calendar className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                      {dashboardData.counts.countUjianHariIni !== undefined ? dashboardData.counts.countUjianHariIni : dashboardData.counts.countUjian}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {dashboardData.counts.countUjianHariIni !== undefined
                        ? `Hari Ini (${dashboardData.counts.countUjianTotal || dashboardData.counts.countUjian} Total)`
                        : 'Sesi Aktif'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-md backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Live Peserta (Hari Ini)</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <Activity className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold block">
                        Sedang Ujian: {dashboardData.counts.countPesertaMengerjakan}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block">
                        Selesai Hari Ini: {dashboardData.counts.countPesertaSelesai}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD PANDUAN & SOP OPERASIONAL PROKTOR / ADMIN CBT */}
              <div className="bg-white/90 dark:bg-slate-900/90 border border-blue-500/30 dark:border-blue-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Petunjuk & SOP Proktor / Administrator CBT</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          Siap Ujian
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Panduan terpadu pelaksanaan ujian, monitoring live 2s, penanganan gangguan peserta, dan cetak dokumen.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdminGuideModal(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer self-start sm:self-auto"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Buka SOP & Panduan Lengkap</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div
                    onClick={() => setActiveTab('jadwal')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 hover:border-blue-500/50 hover:shadow-md transition cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-500/15 dark:bg-blue-500/20">Fase 1</span>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Pra-Ujian & Jadwal</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Verifikasi rombel siswa, pastikan jadwal ujian aktif dan token ujian terbit.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('proktor_live')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 hover:border-cyan-500/50 hover:shadow-md transition cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-cyan-500/15 dark:bg-cyan-500/20">Fase 2</span>
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Monitoring Real-Time</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Pantau live 2 detik status pengerjaan, tangkapan layar ujian, dan audit pelanggaran.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('proktor_live')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 hover:border-amber-500/50 hover:shadow-md transition cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-500/15 dark:bg-amber-500/20">Fase 3</span>
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Troubleshooting</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Reset login 1-klik untuk siswa ganti HP, tambah menit ekstra, atau kunci ujian pelanggar.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      setActiveTab('cetak')
                      setCetakDocType('rekap_nilai')
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 hover:border-emerald-500/50 hover:shadow-md transition cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/15 dark:bg-emerald-500/20">Fase 4</span>
                      <Printer className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Pasca Ujian & Dokumen</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Cetak Berita Acara, Daftar Hadir resmi, Kartu Peserta, dan Rekap Nilai Excel.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span>Jadwal Ujian Terdaftar</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                        {(() => {
                          const list = dashboardData?.recentUjian || [];
                          const q = dashboardJadwalSearch.toLowerCase().trim();
                          const filtered = list.filter((u: any) => {
                            if (!q) return true;
                            const judul = (u.judul || '').toLowerCase();
                            const kode = (u.kodeUjian || '').toLowerCase();
                            const mapel = (u.bankSoal?.mataPelajaran?.nama || '').toLowerCase();
                            return judul.includes(q) || kode.includes(q) || mapel.includes(q);
                          });
                          return `${filtered.length} Jadwal`;
                        })()}
                      </span>
                    </h3>

                    {/* Filter Sort By */}
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={dashboardJadwalSort}
                        onChange={(e: any) => setDashboardJadwalSort(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:border-blue-500"
                        title="Urutkan Jadwal Ujian"
                      >
                        <option value="terbaru">Terbaru Dibuat</option>
                        <option value="terlama">Terlama Dibuat</option>
                        <option value="judul_asc">Judul Ujian (A-Z)</option>
                        <option value="judul_desc">Judul Ujian (Z-A)</option>
                        <option value="mapel_asc">Mata Pelajaran (A-Z)</option>
                      </select>
                    </div>
                  </div>

                  {/* Input Search Berdasarkan Judul / Kode / Mapel */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={dashboardJadwalSearch}
                      onChange={(e) => setDashboardJadwalSearch(e.target.value)}
                      placeholder="Cari berdasarkan judul ujian, kode ujian, atau mata pelajaran..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 backdrop-blur-sm"
                    />
                    {dashboardJadwalSearch && (
                      <button
                        type="button"
                        onClick={() => setDashboardJadwalSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* List Jadwal Ujian Terfilter & Tersorting */}
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {(() => {
                      const list = dashboardData?.recentUjian || [];
                      const q = dashboardJadwalSearch.toLowerCase().trim();

                      let filtered = list.filter((u: any) => {
                        if (!q) return true;
                        const judul = (u.judul || '').toLowerCase();
                        const kode = (u.kodeUjian || '').toLowerCase();
                        const mapel = (u.bankSoal?.mataPelajaran?.nama || '').toLowerCase();
                        return judul.includes(q) || kode.includes(q) || mapel.includes(q);
                      });

                      filtered = [...filtered].sort((a: any, b: any) => {
                        if (dashboardJadwalSort === 'terbaru') {
                          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                        }
                        if (dashboardJadwalSort === 'terlama') {
                          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                        }
                        if (dashboardJadwalSort === 'judul_asc') {
                          return (a.judul || '').localeCompare(b.judul || '');
                        }
                        if (dashboardJadwalSort === 'judul_desc') {
                          return (b.judul || '').localeCompare(a.judul || '');
                        }
                        if (dashboardJadwalSort === 'mapel_asc') {
                          const mapelA = a.bankSoal?.mataPelajaran?.nama || '';
                          const mapelB = b.bankSoal?.mataPelajaran?.nama || '';
                          return mapelA.localeCompare(mapelB);
                        }
                        return 0;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-6 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-white/5">
                            {dashboardJadwalSearch
                              ? `Tidak ditemukan jadwal ujian dengan kata kunci "${dashboardJadwalSearch}"`
                              : 'Belum ada jadwal ujian terdaftar.'}
                          </div>
                        );
                      }

                      return filtered.map((u: any) => {
                        const wMulai = u.waktuMulai ? new Date(u.waktuMulai) : null;
                        const wSelesai = u.waktuSelesai ? new Date(u.waktuSelesai) : null;
                        const isArchived = u.status === 'NONAKTIF';

                        const now = new Date();
                        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

                        const isMulaiHariIni = wMulai ? wMulai >= startOfToday && wMulai <= endOfToday : false;
                        const isToday = isMulaiHariIni && !isArchived;
                        const isPast = (wMulai ? wMulai < startOfToday : false) || (wSelesai ? wSelesai < startOfToday : false) || isArchived;

                        return (
                          <div
                            key={u.id}
                            className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs backdrop-blur-sm hover:border-slate-300 dark:hover:border-white/20 transition"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{u.kodeUjian}</span>
                                {isToday ? (
                                  <span className="px-2 py-0.2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-500/20">
                                    Hari Ini
                                  </span>
                                ) : isPast ? (
                                  <span className="px-2 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                                    Arsip
                                  </span>
                                ) : null}
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{u.judul}</h4>
                              <p className="text-slate-500 dark:text-slate-400">
                                Mapel: <b>{u.bankSoal?.mataPelajaran?.nama || '-'}</b> • Durasi: <b>{u.durasiMenit} Menit</b>
                                {wMulai && ` • ${wMulai.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                              </p>
                            </div>
                            <span className={`self-start sm:self-center px-2.5 py-1 rounded-full font-bold text-[11px] ${
                              isToday
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                : isPast
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {isToday ? 'SESI AKTIF HARI INI' : isPast ? 'ARSIP' : u.status}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-500" />
                        Audit Trail & Log Pelanggaran
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Aktivitas login, pengerjaan, dan pelanggaran realtime
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>Live 2s</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {dashboardData.recentLogs?.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        Belum ada riwayat aktivitas terbaru.
                      </div>
                    ) : (
                      dashboardData.recentLogs?.map((l: any) => {
                        const act = (l.aktivitas || '').toUpperCase()
                        const isViolation = [
                          'TAB_SWITCH_ALERT',
                          'WINDOW_BLUR',
                          'FULLSCREEN_EXIT',
                          'SCREEN_SHARE_STOPPED',
                          'KEYBOARD_SHORTCUT_VIOLATION',
                          'SECURITY_ALERT',
                        ].includes(act)
                        const isLogin = act === 'LOGIN'
                        const isStart = act === 'MULAI_UJIAN' || act.includes('START')
                        const isFinish = act === 'SELESAI_UJIAN' || act.includes('SELESAI')
                        const isReset = act.includes('RESET') || act.includes('UNLOCK')

                        // Color theme config
                        let containerStyle = 'bg-slate-50/80 dark:bg-slate-950/70 border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300'
                        let badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        let IconComponent = ShieldCheck
                        let iconColor = 'text-slate-500'

                        if (isViolation) {
                          containerStyle = 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                          badgeStyle = 'bg-rose-500 text-white font-black'
                          IconComponent = AlertOctagon
                          iconColor = 'text-rose-500'
                        } else if (isLogin) {
                          containerStyle = 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                          badgeStyle = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          IconComponent = LogIn
                          iconColor = 'text-emerald-600 dark:text-emerald-400'
                        } else if (isStart) {
                          containerStyle = 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
                          badgeStyle = 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                          IconComponent = Play
                          iconColor = 'text-blue-600 dark:text-blue-400'
                        } else if (isFinish) {
                          containerStyle = 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200'
                          badgeStyle = 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                          IconComponent = CheckCircle2
                          iconColor = 'text-purple-600 dark:text-purple-400'
                        } else if (isReset) {
                          containerStyle = 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                          badgeStyle = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          IconComponent = Unlock
                          iconColor = 'text-amber-600 dark:text-amber-400'
                        }

                        return (
                          <div
                            key={l.id}
                            className={`p-3 rounded-2xl border text-xs backdrop-blur-sm space-y-1.5 transition ${containerStyle}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <IconComponent className={`w-4 h-4 shrink-0 ${iconColor}`} />
                                <span className="font-bold truncate">{l.user?.name || 'Siswa'}</span>
                                {l.user?.nis && (
                                  <span className="font-mono text-[10px] text-slate-400">({l.user.nis})</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                {new Date(l.createdAt).toLocaleTimeString('id-ID')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] opacity-90 line-clamp-2">{l.detail}</p>
                              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold shrink-0 border ${badgeStyle}`}>
                                {act}
                              </span>
                            </div>

                            {/* Tombol Lihat Bukti Snapshot jika ada foto bukti */}
                            {l.fotoBukti && (
                              <button
                                type="button"
                                onClick={() =>
                                  setViolationScreenModal({
                                    name: l.user?.name || 'Siswa',
                                    nis: l.user?.nis || l.user?.username,
                                    kelas: l.user?.kelas?.nama || '-',
                                    status: 'SEDANG_MENGERJAKAN',
                                    jumlahPelanggaran: 1,
                                    latestScreenshot: l.fotoBukti,
                                    latestScreenshotTime: l.createdAt,
                                    latestViolationDetail: l.detail,
                                  })
                                }
                                className="w-full mt-1 py-1 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs cursor-pointer transition"
                              >
                                <Monitor className="w-3 h-3" />
                                <span>Lihat Bukti Snapshot Layar</span>
                              </button>
                            )}
                          </div>
                        )
                      })
                    )}
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                        <span>Live Monitoring Ruang Ujian</span>
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-black tracking-wide">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          LIVE (2s Auto-Refresh)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Ujian Aktif: <b>{proktorData?.activeUjian?.judul || 'Pilih Ujian'}</b> ({proktorData?.activeUjian?.durasiMenit || 0} Menit) • Update: <span className="font-mono text-cyan-600 dark:text-cyan-400">{lastLiveUpdated.toLocaleTimeString('id-ID')}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLiveActive(!isLiveActive)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        isLiveActive
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLiveActive ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                      <span>{isLiveActive ? 'Live Aktif (2s)' : 'Live Dijeda'}</span>
                    </button>

                    <select
                      value={selectedProktorUjianId}
                      onChange={(e) => {
                        setSelectedProktorUjianId(e.target.value)
                        setSelectedProktorKelas('ALL')
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white backdrop-blur-sm focus:outline-none focus:border-cyan-500 font-bold"
                    >
                      {proktorData?.ujianList?.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.kodeUjian} - {u.judul}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedProktorKelas}
                      onChange={(e) => setSelectedProktorKelas(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white backdrop-blur-sm focus:outline-none focus:border-cyan-500 font-semibold"
                    >
                      <option value="ALL">Semua Kelas ({proktorData?.pesertaList?.length || 0})</option>
                      {proktorKelasOptions.map((k) => (
                        <option key={k} value={k}>
                          Kelas {k} ({proktorData?.pesertaList?.filter((p: any) => p.kelas === k).length || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Status Pengerjaan Peserta</span>
                      {selectedProktorKelas !== 'ALL' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                          Kelas: {selectedProktorKelas}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Menampilkan <b>{filteredProktorPeserta.length}</b> siswa aktif {selectedProktorKelas !== 'ALL' ? `di rombel ${selectedProktorKelas}` : 'di semua kelas'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Filter Cepat:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedProktorKelas('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        selectedProktorKelas === 'ALL'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      Semua
                    </button>
                    {proktorKelasOptions.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setSelectedProktorKelas(k)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          selectedProktorKelas === k
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap sm:whitespace-normal">
                    <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                      <tr>
                        <th className="py-3 px-4">NIS</th>
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4">Kelas</th>
                        <th className="py-3 px-4">Status & Keamanan</th>
                        <th className="py-3 px-4 text-center">Jawaban</th>
                        <th className="py-3 px-4 text-right">Aksi Proktor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {filteredProktorPeserta.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400 text-xs font-semibold">
                            Tidak ada data peserta ujian untuk filter kelas/pencarian ini.
                          </td>
                        </tr>
                      ) : (
                        filteredProktorPeserta.map((p: any) => (
                          <tr key={p.pesertaUjianId} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${p.jumlahPelanggaran > 0 ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''}`}>
                            <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{p.nis || p.nomorPeserta || p.username}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.jumlahPelanggaran > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shadow-xs animate-pulse">
                                  <ShieldAlert className="w-3 h-3" />
                                  {p.jumlahPelanggaran} Pelanggaran
                                </span>
                              )}
                            </div>
                            {p.latestViolationDetail && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 truncate max-w-xs">
                                ⚠ {p.latestViolationDetail}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">{p.kelas}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              p.status === 'TERKUNCI'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : p.status === 'SEDANG_MENGERJAKAN'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">{p.jumlahJawaban} Soal</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Tombol Lihat Layar Siswa (Live Realtime Monitor & Snapshot) */}
                              <button
                                onClick={() => setViolationScreenModal(p)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs ${
                                  p.hasLiveScreen
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                                    : p.latestScreenshot || p.jumlahPelanggaran > 0
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                                title="Pantau Layar Realtime & Log Siswa"
                              >
                                {p.hasLiveScreen ? (
                                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                ) : (
                                  <Monitor className="w-3.5 h-3.5" />
                                )}
                                <span>{p.hasLiveScreen ? 'Live Layar' : 'Lihat Layar'}</span>
                              </button>

                              <button
                                onClick={() => handleResetLogin(p.pesertaUjianId, p.name)}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-[11px] font-bold cursor-pointer hover:bg-rose-100"
                              >
                                Reset Login
                              </button>

                              {p.status === 'SEDANG_MENGERJAKAN' && (
                                <button
                                  onClick={() => setExtraTimeModal(p)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/40 text-blue-600 dark:text-blue-300 text-[11px] font-bold cursor-pointer hover:bg-blue-100"
                                >
                                  +Waktu
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )))}
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
                              {bs.mataPelajaran?.nama} • Pengampu: <b className="text-slate-800 dark:text-slate-200">{bs.mataPelajaran?.gurus?.[0]?.guru?.name || (bs.pembuat?.role === 'GURU' ? bs.pembuat?.name : 'Guru Mata Pelajaran')}</b> • {bs.durasiMenit || 90} Mnt
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
                              const defaultTipe = 'PAS'
                              setDistributeModal(bs)
                              setDistributeForm({
                                tipeUjian: defaultTipe,
                                kodeUjian: `${defaultTipe}-${bs.kodeBank}-${new Date().getFullYear()}`,
                                judul: `${defaultTipe} ${bs.nama}`,
                                durasiMenit: bs.durasiMenit || 90,
                                kelasIds: [],
                                waktuMulai: formatLocalDatetime(),
                                waktuSelesai: formatLocalDatetime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
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
                            {selectedBankSoal.mataPelajaran?.nama} • Pengampu: <b>{selectedBankSoal.mataPelajaran?.gurus?.[0]?.guru?.name || (selectedBankSoal.pembuat?.role === 'GURU' ? selectedBankSoal.pembuat?.name : 'Guru Mata Pelajaran')}</b>
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
                            const defaultTipe = 'PAS'
                            setDistributeModal(selectedBankSoal)
                            setDistributeForm({
                              tipeUjian: defaultTipe,
                              kodeUjian: `${defaultTipe}-${selectedBankSoal.kodeBank}-${new Date().getFullYear()}`,
                              judul: `${defaultTipe} ${selectedBankSoal.nama}`,
                              durasiMenit: selectedBankSoal.durasiMenit || 90,
                              kelasIds: [],
                              waktuMulai: formatLocalDatetime(),
                              waktuSelesai: formatLocalDatetime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
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
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                              Pertanyaan (Mendukung Formula KaTeX $...$ / $$...$$):
                            </label>
                            {/* Toolbar Sisipkan Media Gambar / Video / Audio pada Pertanyaan */}
                            <div className="flex items-center gap-1.5">
                              {/* Sisipkan Gambar */}
                              <label className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>+ Gambar</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      const reader = new FileReader()
                                      reader.onload = () => {
                                        const base64 = reader.result as string
                                        setSoalForm((prev: any) => ({
                                          ...prev,
                                          pertanyaan: prev.pertanyaan
                                            ? `${prev.pertanyaan}\n<img src="${base64}" alt="Ilustrasi Soal" class="my-2 rounded-xl max-h-60 mx-auto border" />`
                                            : `<img src="${base64}" alt="Ilustrasi Soal" class="my-2 rounded-xl max-h-60 mx-auto border" />`,
                                        }))
                                      }
                                      reader.readAsDataURL(file)
                                    }
                                  }}
                                />
                              </label>

                              {/* Sisipkan Audio Suara */}
                              <label className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs">
                                <Music className="w-3.5 h-3.5" />
                                <span>+ Suara</span>
                                <input
                                  type="file"
                                  accept="audio/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      const reader = new FileReader()
                                      reader.onload = () => {
                                        const base64 = reader.result as string
                                        setSoalForm((prev: any) => ({
                                          ...prev,
                                          pertanyaan: prev.pertanyaan
                                            ? `${prev.pertanyaan}\n<audio controls src="${base64}" class="my-2 w-full"></audio>`
                                            : `<audio controls src="${base64}" class="my-2 w-full"></audio>`,
                                        }))
                                      }
                                      reader.readAsDataURL(file)
                                    }
                                  }}
                                />
                              </label>

                              {/* Sisipkan Video / YouTube */}
                              <button
                                type="button"
                                onClick={() => {
                                  const url = prompt('Masukkan URL Video / Link YouTube (Contoh: https://www.youtube.com/watch?v=...):')
                                  if (url) {
                                    setSoalForm((prev: any) => ({
                                      ...prev,
                                      pertanyaan: prev.pertanyaan
                                        ? `${prev.pertanyaan}\n${url}`
                                        : url,
                                    }))
                                  }
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>+ Video/YouTube</span>
                              </button>
                            </div>
                          </div>

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
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase block mb-1">Live Preview Rumus KaTeX & Media:</span>
                            <MathRenderer content={soalForm.pertanyaan} />
                          </div>
                        )}

                        {/* Panduan Kunci Formula KaTeX Interaktif (Click to Insert) - Khusus Mapel Eksak & Sains/Komputasi */}
                        {(() => {
                          const targetText = [
                            selectedBankSoal?.nama || '',
                            selectedBankSoal?.kodeBank || '',
                            selectedBankSoal?.mataPelajaran?.nama || '',
                            selectedBankSoal?.mataPelajaran?.kode || '',
                          ]
                            .join(' ')
                            .toLowerCase();

                          const isStemBank = [
                            'matematika',
                            'mtk',
                            'math',
                            'fisika',
                            'fis',
                            'kimia',
                            'kim',
                            'tik',
                            'informatika',
                            'koding',
                            'coding',
                            'artificial',
                            'ai',
                            'komputer',
                            'rekayasa',
                            'robotik',
                            'algoritma',
                            'ipa',
                            'sains',
                          ].some((keyword) => targetText.includes(keyword));

                          if (!isStemBank) return null;

                          return (
                            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5 text-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold">
                                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <span>Panduan & Kunci Cepat Rumus KaTeX (Klik untuk Menyisipkan)</span>
                                </div>
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                  Gunakan tanda <b>$...$</b> untuk sebaris atau <b>$$...$$</b> untuk blok tengah
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-64 overflow-y-auto pr-1">
                                {[
                                  // 1. Aljabar & Aritmatika
                                  { label: 'Pecahan (\\frac)', code: '$\\frac{a}{b}$' },
                                  { label: 'Pangkat / Eksponen', code: '$x^{2} + y^{2} = r^{2}$' },
                                  { label: 'Akar Kuadrat', code: '$\\sqrt{x^2 + 1}$' },
                                  { label: 'Akar Derajat n', code: '$\\sqrt[n]{x}$' },
                                  { label: 'Logaritma', code: '$\\log_a(b) = c$' },
                                  { label: 'Nilai Mutlak', code: '$|x - 5| \\le 3$' },
                                  { label: 'Persamaan Kuadrat (ABC)', code: '$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$' },
                                  { label: 'Faktorial', code: '$n! = n \\times (n-1)!$' },

                                  // 2. Kalkulus & Analisis
                                  { label: 'Turunan (Derivatif)', code: '$\\frac{df}{dx} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$' },
                                  { label: 'Integral Tentu', code: '$\\int_{a}^{b} f(x) dx$' },
                                  { label: 'Integral Tak Tentu', code: '$\\int (3x^2 + 2x - 5) dx$' },
                                  { label: 'Limit Aljabar', code: '$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$' },
                                  { label: 'Sigma / Deret', code: '$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$' },
                                  { label: 'Produk Notasi', code: '$\\prod_{i=1}^{n} x_i$' },

                                  // 3. Matriks & Vektor
                                  { label: 'Matriks 2x2', code: '$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$' },
                                  { label: 'Matriks 3x3', code: '$$\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}$$' },
                                  { label: 'Determinan Matriks', code: '$$\\det(A) = \\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}$$' },
                                  { label: 'Vektor Notasi', code: '$\\vec{v} = a\\hat{i} + b\\hat{j} + c\\hat{k}$' },
                                  { label: 'Dot Product', code: '$\\vec{a} \\cdot \\vec{b} = |\\vec{a}||\\vec{b}| \\cos\\theta$' },
                                  { label: 'Cross Product', code: '$\\vec{a} \\times \\vec{b}$' },

                                  // 4. Trigonometri & Geometri
                                  { label: 'Identitas Pythagoras', code: '$\\sin^2\\theta + \\cos^2\\theta = 1$' },
                                  { label: 'Sudut & Derajat', code: '$\\alpha = 45^\\circ, \\theta = 90^\\circ$' },
                                  { label: 'Trigonometri Aturan Sinus', code: '$\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}$' },

                                  // 5. Fisika & Sains
                                  { label: 'Hukum Newton II', code: '$\\sum \\vec{F} = m \\cdot \\vec{a}$' },
                                  { label: 'Energi Kinetik', code: '$E_k = \\frac{1}{2} m v^2$' },
                                  { label: 'Hukum Ohm & Daya', code: '$V = I \\cdot R, \\quad P = V \\cdot I$' },
                                  { label: 'Gravitasi Newton', code: '$F = G \\frac{m_1 m_2}{r^2}$' },
                                  { label: 'Efek Doppler', code: '$f_p = \\frac{v \\pm v_p}{v \\mp v_s} f_s$' },

                                  // 6. Kimia & Reaksi
                                  { label: 'Reaksi Pembakaran', code: '$CH_4 + 2O_2 \\rightarrow CO_2 + 2H_2O$' },
                                  { label: 'Ion & Muatan Kimia', code: '$Ca^{2+} + 2Cl^- \\rightarrow CaCl_2$' },
                                  { label: 'Termokimia Delta H', code: '$\\Delta H = -393.5 \\text{ kJ/mol}$' },

                                  // 7. Informatika / Koding / Logika
                                  { label: 'Logika AND / OR / NOT', code: '$P \\land Q, \\quad P \\lor Q, \\quad \\neg P$' },
                                  { label: 'Implikasi & Biimplikasi', code: '$P \\implies Q, \\quad P \\iff Q$' },
                                  { label: 'Kompleksitas Algoritma', code: '$\\mathcal{O}(n \\log n), \\quad \\Omega(n), \\quad \\Theta(1)$' },
                                  { label: 'Himpunan & Irisan', code: '$A \\cap B, \\quad A \\cup B, \\quad x \\in A$' },
                                  { label: 'Himpunan Kosong / Subset', code: '$A \\subset B, \\quad \\emptyset, \\quad A^c$' },

                                  // 8. Simbol Yunani & Khusus
                                  { label: 'Simbol $\\alpha, \\beta, \\gamma$', code: '$\\alpha, \\beta, \\gamma, \\delta$' },
                                  { label: 'Simbol $\\pi, \\lambda, \\mu, \\sigma$', code: '$\\pi \\approx 3.14, \\quad \\lambda, \\mu, \\sigma$' },
                                  { label: 'Simbol $\\Omega, \\Delta, \\infty$', code: '$\\Omega, \\quad \\Delta, \\quad \\infty$' },
                                  { label: 'Simbol $\\approx, \\ne, \\pm$', code: '$a \\approx b, \\quad x \\ne 0, \\quad \\pm 5$' },
                                  { label: 'Relasi $\\le, \\ge, \\ll$', code: '$x \\le 10, \\quad y \\ge 0, \\quad a \\ll b$' },
                                ].map((item, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      setSoalForm((prev: any) => ({
                                        ...prev,
                                        pertanyaan: prev.pertanyaan ? `${prev.pertanyaan} ${item.code}` : item.code,
                                      }))
                                    }}
                                    className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-left transition cursor-pointer shadow-2xs group"
                                    title={`Klik untuk sisipkan formula: ${item.code}`}
                                  >
                                    <span className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-300 truncate">
                                      + {item.label}
                                    </span>
                                    <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 truncate block mt-0.5 opacity-80">
                                      {item.code}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {(soalForm.tipeSoal === 'PG' || soalForm.tipeSoal === 'PG_KOMPLEKS') && (
                          <div className="space-y-2 pt-2">
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold">Pilihan Jawaban & Sisip Media:</label>
                            {soalForm.opsiJawaban.map((opsi: any, idx: number) => (
                              <div key={opsi.label} className="space-y-1">
                                <div className="flex items-center gap-2">
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

                                  {/* Tombol Sisip Gambar Opsi */}
                                  <label
                                    className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center justify-center cursor-pointer transition shrink-0"
                                    title={`Sisipkan Gambar pada Pilihan ${opsi.label}`}
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                          const reader = new FileReader()
                                          reader.onload = () => {
                                            const base64 = reader.result as string
                                            const updated = [...soalForm.opsiJawaban]
                                            updated[idx].konten = updated[idx].konten
                                              ? `${updated[idx].konten} <img src="${base64}" class="inline-block max-h-24 rounded border my-1" />`
                                              : `<img src="${base64}" class="inline-block max-h-24 rounded border my-1" />`
                                            setSoalForm({ ...soalForm, opsiJawaban: updated })
                                          }
                                          reader.readAsDataURL(file)
                                        }
                                      }}
                                    />
                                  </label>

                                  {/* Tombol Sisip Audio Opsi */}
                                  <label
                                    className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center justify-center cursor-pointer transition shrink-0"
                                    title={`Sisipkan Suara pada Pilihan ${opsi.label}`}
                                  >
                                    <Music className="w-3.5 h-3.5" />
                                    <input
                                      type="file"
                                      accept="audio/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                          const reader = new FileReader()
                                          reader.onload = () => {
                                            const base64 = reader.result as string
                                            const updated = [...soalForm.opsiJawaban]
                                            updated[idx].konten = updated[idx].konten
                                              ? `${updated[idx].konten} <audio controls src="${base64}" class="inline-block w-48 h-8 align-middle"></audio>`
                                              : `<audio controls src="${base64}" class="inline-block w-48 h-8 align-middle"></audio>`
                                            setSoalForm({ ...soalForm, opsiJawaban: updated })
                                          }
                                          reader.readAsDataURL(file)
                                        }
                                      }}
                                    />
                                  </label>

                                  {/* Tombol Sisip Video Opsi */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = prompt(`Masukkan URL Video / YouTube untuk Pilihan ${opsi.label}:`)
                                      if (url) {
                                        const updated = [...soalForm.opsiJawaban]
                                        updated[idx].konten = updated[idx].konten ? `${updated[idx].konten} ${url}` : url
                                        setSoalForm({ ...soalForm, opsiJawaban: updated })
                                      }
                                    }}
                                    className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center justify-center cursor-pointer transition shrink-0"
                                    title={`Sisipkan Link Video untuk Pilihan ${opsi.label}`}
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...soalForm.opsiJawaban]
                                      if (soalForm.tipeSoal === 'PG') {
                                        updated.forEach((o: any, i: number) => (o.isBenar = i === idx))
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

                                {opsi.konten && (
                                  <div className="pl-9 text-[11px] text-slate-600 dark:text-slate-300">
                                    <MathRenderer content={opsi.konten} />
                                  </div>
                                )}
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
                                {['PG', 'PG_KOMPLEKS', 'BENAR_SALAH'].includes(s.tipeSoal) && s.opsiJawaban && s.opsiJawaban.length > 0 && (
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
                                        <span className="truncate flex-1">{op.konten}</span>
                                        {op.isBenar && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Kunci</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {s.kunciJawabanTeks && (
                                  <div className="pl-8 pt-1 text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                    <span className="font-bold text-amber-600 dark:text-amber-400">
                                      {s.tipeSoal === 'ISIAN' ? 'Kunci Jawaban Singkat:' : 'Rubrik / Pedoman Nilai Essay:'}
                                    </span>
                                    <span className="font-medium">{s.kunciJawabanTeks}</span>
                                  </div>
                                )}
                              </div>
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

          {/* TAB 4: KOREKSI ESSAY & REKAP NILAI */}
          {activeTab === 'koreksi_nilai' && (() => {
            const currentKkm = Number(koreksiData?.activeUjian?.bankSoal?.kkm ?? 75);
            const totalSiswa = filteredKoreksiPeserta.length;
            const tuntasCount = filteredKoreksiPeserta.filter((p: any) => Number(p.nilaiTotal ?? 0) >= currentKkm).length;
            const remidiCount = totalSiswa - tuntasCount;
            const persenTuntas = totalSiswa > 0 ? Math.round((tuntasCount / totalSiswa) * 100) : 0;
            const avgNilai = totalSiswa > 0 
              ? (filteredKoreksiPeserta.reduce((acc: number, p: any) => acc + Number(p.nilaiTotal ?? 0), 0) / totalSiswa).toFixed(1)
              : '0';

            // Hitung butir soal esai & isian
            const samplePeserta = koreksiData?.hasilList?.[0];
            const hasEssaySoal = samplePeserta?.jawabanPeserta?.some((j: any) => j.soal?.tipeSoal === 'ESAI' || j.soal?.tipeSoal === 'ISIAN');

            return (
              <div className="space-y-6">
                {/* Header & Selector */}
                <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
                      Rekapitulasi Nilai & Koreksi Isian / Esai
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {koreksiData?.activeUjian?.judul || 'Pilih Jadwal Ujian'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Mapel: <b>{koreksiData?.activeUjian?.bankSoal?.mataPelajaran?.nama || '-'}</b> • KKM Standar: <b className="text-blue-600 dark:text-blue-400">{currentKkm} Poin</b> • Total <b>{filteredKoreksiPeserta.length}</b> siswa {selectedKoreksiKelas !== 'ALL' ? `kelas ${selectedKoreksiKelas}` : 'seluruh kelas'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Selector Jadwal Ujian */}
                    <select
                      value={selectedKoreksiUjianId}
                      onChange={(e) => {
                        setSelectedKoreksiUjianId(e.target.value)
                        setSelectedKoreksiKelas('ALL')
                        fetchKoreksiData(e.target.value)
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {koreksiUjianList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.kodeUjian} - {u.judul}
                        </option>
                      ))}
                    </select>

                    {/* Selector Kelas Rombel */}
                    <select
                      value={selectedKoreksiKelas}
                      onChange={(e) => setSelectedKoreksiKelas(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="ALL">Semua Kelas ({koreksiData?.hasilList?.length || 0})</option>
                      {koreksiKelasOptions.map((k) => (
                        <option key={k} value={k}>
                          Kelas {k} ({koreksiData?.hasilList?.filter((p: any) => p.siswa?.kelas?.nama === k).length || 0})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Ekspor Excel {selectedKoreksiKelas !== 'ALL' ? `(${selectedKoreksiKelas})` : ''}</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Tabs: Area Koreksi Esai & Rekap Nilai KKM */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-950/80 border border-slate-200/80 dark:border-white/10 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setKoreksiSubTab('rekap')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
                        koreksiSubTab === 'rekap'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Rekap Nilai & Ketuntasan KKM</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                        {filteredKoreksiPeserta.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setKoreksiSubTab('koreksi_esai')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
                        koreksiSubTab === 'koreksi_esai'
                          ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Edit className="w-4 h-4" />
                      <span>Area Koreksi Isian / Esai</span>
                      {hasEssaySoal && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                          Manual
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Filter Cepat Barisan Kelas */}
                  {koreksiKelasOptions.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs max-w-full">
                      <span className="text-slate-400 text-[11px] font-semibold shrink-0">Filter:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedKoreksiKelas('ALL')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 cursor-pointer text-xs ${
                          selectedKoreksiKelas === 'ALL'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Semua ({koreksiData?.hasilList?.length || 0})
                      </button>
                      {koreksiKelasOptions.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setSelectedKoreksiKelas(k)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 cursor-pointer text-xs ${
                            selectedKoreksiKelas === k
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {k} ({koreksiData?.hasilList?.filter((p: any) => p.siswa?.kelas?.nama === k).length || 0})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* VIEW 1: REKAP NILAI BERDASARKAN KKM KELAS */}
                {koreksiSubTab === 'rekap' && (
                  <div className="space-y-6">
                    {/* Ringkasan Statistik Ketuntasan KKM */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm backdrop-blur-xl">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                          Target KKM Mapel
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{currentKkm}</span>
                          <span className="text-xs text-slate-500">Poin Minimal</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-1">Acuan standar kelulusan</p>
                      </div>

                      <div className="bg-white/90 dark:bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-sm backdrop-blur-xl bg-gradient-to-br from-emerald-500/5 to-transparent">
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase">
                          Peserta Tuntas (≥ KKM)
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{tuntasCount}</span>
                          <span className="text-xs text-emerald-600/80 font-bold">({persenTuntas}%)</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-1">Memenuhi kriteria ketuntasan</p>
                      </div>

                      <div className="bg-white/90 dark:bg-slate-900/90 border border-rose-500/30 rounded-2xl p-4 shadow-sm backdrop-blur-xl bg-gradient-to-br from-rose-500/5 to-transparent">
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block uppercase">
                          Perlu Remidial (&lt; KKM)
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{remidiCount}</span>
                          <span className="text-xs text-rose-600/80 font-bold">({100 - persenTuntas}%)</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-1">Belum mencapai KKM</p>
                      </div>

                      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm backdrop-blur-xl">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                          Rata-Rata Nilai
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{avgNilai}</span>
                          <span className="text-xs text-slate-500">/ 100</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-1">
                          {selectedKoreksiKelas !== 'ALL' ? `Kelas ${selectedKoreksiKelas}` : 'Semua Rombel'}
                        </p>
                      </div>
                    </div>

                    {/* Tabel Rekapitulasi Nilai Per Kelas */}
                    <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-sm dark:shadow-xl backdrop-blur-xl overflow-hidden">
                      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex justify-between items-center">
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                            Tabel Rekapitulasi Hasil Ujian & Ketuntasan Siswa
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedKoreksiKelas !== 'ALL' ? `Rombel Kelas ${selectedKoreksiKelas}` : 'Seluruh Rombel Kelas'} • Nilai otomatis dievaluasi terhadap KKM ({currentKkm})
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                          {filteredKoreksiPeserta.length} Peserta
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
                              <th className="py-3 px-4 w-12 text-center">No</th>
                              <th className="py-3 px-4">Nama Siswa</th>
                              <th className="py-3 px-4">NIS / Username</th>
                              <th className="py-3 px-4">Kelas</th>
                              <th className="py-3 px-4 text-center">Nilai PG</th>
                              <th className="py-3 px-4 text-center">Nilai Isian/Esai</th>
                              <th className="py-3 px-4 text-center">Total Nilai</th>
                              <th className="py-3 px-4 text-center">KKM</th>
                              <th className="py-3 px-4 text-center">Status Ketuntasan</th>
                              <th className="py-3 px-4 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                            {filteredKoreksiPeserta.length === 0 ? (
                              <tr>
                                <td colSpan={10} className="text-center py-10 text-slate-400 italic">
                                  Tidak ada data peserta ujian untuk filter kelas ini.
                                </td>
                              </tr>
                            ) : (
                              filteredKoreksiPeserta.map((p: any, idx: number) => {
                                const isTuntas = Number(p.nilaiTotal ?? 0) >= currentKkm;
                                const hasTulisan = p.jawabanPeserta?.some((j: any) => j.soal?.tipeSoal === 'ESAI' || j.soal?.tipeSoal === 'ISIAN');
                                const displayPG = p.nilaiPG != null ? Number(Number(p.nilaiPG).toFixed(2)) : 0;
                                const displayEsai = p.nilaiEsai != null ? Number(Number(p.nilaiEsai).toFixed(2)) : 0;
                                const displayTotal = p.nilaiTotal != null ? Number(Number(p.nilaiTotal).toFixed(2)) : 0;

                                return (
                                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                                    <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                      {p.siswa?.name}
                                    </td>
                                    <td className="py-3 px-4 font-mono text-slate-500">
                                      {p.siswa?.nis || p.siswa?.username}
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400">
                                      {p.siswa?.kelas?.nama || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                      {displayPG}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-500 dark:text-amber-400">
                                      {displayEsai}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                                      {displayTotal}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-400">
                                      {currentKkm}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black ${
                                        isTuntas
                                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                      }`}>
                                        {isTuntas ? '✓ TUNTAS' : '✗ REMIDIAL'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      {hasTulisan ? (
                                        <button
                                          type="button"
                                          onClick={() => setKoreksiSubTab('koreksi_esai')}
                                          className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-[10.5px] hover:bg-amber-100 cursor-pointer"
                                        >
                                          Koreksi Esai
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 font-mono">Auto (PG)</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 2: AREA KOREKSI ISIAN / ESAI */}
                {koreksiSubTab === 'koreksi_esai' && (
                  <div className="space-y-4">
                    {filteredKoreksiPeserta.length === 0 ? (
                      <div className="text-center py-12 bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl text-slate-500 text-xs font-semibold">
                        Tidak ada data peserta ujian untuk filter kelas ini.
                      </div>
                    ) : (
                      filteredKoreksiPeserta.map((peserta: any) => {
                        const tulisanAnswers = peserta.jawabanPeserta?.filter((j: any) => j.soal?.tipeSoal === 'ESAI' || j.soal?.tipeSoal === 'ISIAN') || [];
                        const isTuntas = Number(peserta.nilaiTotal ?? 0) >= currentKkm;
                        const displayPG = peserta.nilaiPG != null ? Number(Number(peserta.nilaiPG).toFixed(2)) : 0;
                        const displayEsai = peserta.nilaiEsai != null ? Number(Number(peserta.nilaiEsai).toFixed(2)) : 0;
                        const displayTotal = peserta.nilaiTotal != null ? Number(Number(peserta.nilaiTotal).toFixed(2)) : 0;

                        return (
                          <div
                            key={peserta.id}
                            className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4"
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-3">
                              <div>
                                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                                  NIS: {peserta.siswa?.nis || peserta.siswa?.username} • Kelas {peserta.siswa?.kelas?.nama}
                                </span>
                                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span>{peserta.siswa?.name}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    isTuntas
                                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                                  }`}>
                                    {isTuntas ? 'Tuntas KKM' : 'Remidial'}
                                  </span>
                                </h4>
                              </div>

                              <div className="flex items-center gap-4 text-xs font-mono">
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400">Nilai PG:</span>{' '}
                                  <b className="text-emerald-600 dark:text-emerald-400">{displayPG}</b>
                                </div>
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400">Nilai Isian/Esai:</span>{' '}
                                  <b className="text-amber-500 dark:text-amber-400">{displayEsai}</b>
                                </div>
                                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10">
                                  <span className="text-slate-500 dark:text-slate-400">Total:</span>{' '}
                                  <b className="text-slate-900 dark:text-white text-sm">{displayTotal}</b>
                                </div>
                              </div>
                            </div>

                            {/* Tulisan & Isian List */}
                            {tulisanAnswers.length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-2">
                                Tidak ada butir soal isian atau essay pada ujian ini (Seluruh butir soal berbentuk pilihan ganda / objektif otomatis).
                              </p>
                            ) : (
                              <div className="space-y-3 pt-1">
                                {tulisanAnswers.map((j: any, i: number) => {
                                  const isIsian = j.soal?.tipeSoal === 'ISIAN';
                                  const isEssay = j.soal?.tipeSoal === 'ESAI';
                                  const badgeTipe = isIsian ? 'Isian Singkat' : 'Uraian / Essay';

                                  return (
                                    <div key={j.id} className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 space-y-2 text-xs">
                                      <div className="flex justify-between items-center font-semibold text-slate-700 dark:text-slate-300">
                                        <div className="flex items-center gap-2">
                                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                            isIsian 
                                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                          }`}>
                                            {badgeTipe}
                                          </span>
                                          <span>Soal Tulisan #{i + 1} (Bobot Maksimal: <b>{j.soal?.bobot} Poin</b>)</span>
                                        </div>
                                        <span className="font-mono text-slate-500 text-[11px]">
                                          Skor Saat Ini: <b className={j.skor > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>{j.skor}</b> / {j.soal?.bobot}
                                        </span>
                                      </div>
                                      <div className="text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-900 p-2.5 rounded-xl">
                                        <MathRenderer content={j.soal?.pertanyaan} />
                                      </div>

                                      {j.soal?.kunciJawabanTeks && (
                                        <div className="p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-[11.5px]">
                                          <span className="font-bold">Kunci / Rubrik Acuan Guru:</span> {j.soal.kunciJawabanTeks}
                                        </div>
                                      )}

                                      <div className="pt-1">
                                        <span className="text-slate-500 dark:text-slate-400 block font-semibold mb-1">Jawaban yang Ditulis Siswa:</span>
                                        <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono whitespace-pre-wrap">
                                          {j.jawabanDipilih || <span className="italic text-slate-400">(Siswa tidak mengisi jawaban)</span>}
                                        </div>
                                      </div>

                                      {/* Scoring Input */}
                                      <div className="flex flex-wrap items-center gap-3 pt-2">
                                        <label className="text-slate-700 dark:text-slate-300 font-semibold">Beri Nilai ({badgeTipe}):</label>
                                        <input
                                          type="number"
                                          min={0}
                                          max={j.soal?.bobot}
                                          step="0.5"
                                          defaultValue={j.skor}
                                          id={`score-${j.id}`}
                                          className="w-24 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-center font-bold"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const input = document.getElementById(`score-${j.id}`) as HTMLInputElement
                                            handleSimpanNilaiEssay(j.id, Number(input.value), peserta.id)
                                          }}
                                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition shadow-sm"
                                        >
                                          Simpan Nilai
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const input = document.getElementById(`score-${j.id}`) as HTMLInputElement
                                            if (input) input.value = String(j.soal?.bobot || 0)
                                            handleSimpanNilaiEssay(j.id, Number(j.soal?.bobot || 0), peserta.id)
                                          }}
                                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition text-[11px]"
                                        >
                                          Beri Nilai Maksimal ({j.soal?.bobot})
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 5: JADWAL UJIAN */}
          {activeTab === 'jadwal' && (() => {
            const rawJadwalList = jadwalData?.jadwalList || [];
            const q = jadwalSearch.toLowerCase().trim();

            const filteredList = rawJadwalList.filter((u: any) => {
              const isArchived = u.status === 'NONAKTIF';
              if (jadwalFilterTab === 'AKTIF' && isArchived) return false;
              if (jadwalFilterTab === 'ARSIP' && !isArchived) return false;

              if (!q) return true;
              const judul = (u.judul || '').toLowerCase();
              const kode = (u.kodeUjian || '').toLowerCase();
              const mapel = (u.bankSoal?.mataPelajaran?.nama || '').toLowerCase();
              return judul.includes(q) || kode.includes(q) || mapel.includes(q);
            });

            const countAktif = rawJadwalList.filter((u: any) => u.status !== 'NONAKTIF').length;
            const countArsip = rawJadwalList.filter((u: any) => u.status === 'NONAKTIF').length;

            return (
              <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span>Manajemen Jadwal Ujian & Arsip</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Kelola jadwal aktif, arsipkan ujian selesai, serta amankan histori nilai dan pelanggaran peserta
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const firstBs = bankSoalList[0]
                      const defaultTipe = 'PAS'
                      setJadwalForm({
                        tipeUjian: defaultTipe,
                        kodeUjian: firstBs ? `${defaultTipe}-${firstBs.kodeBank}-${new Date().getFullYear()}` : `${defaultTipe}-${new Date().getFullYear()}`,
                        judul: firstBs ? `${defaultTipe} ${firstBs.nama}` : '',
                        bankSoalId: firstBs?.id || '',
                        durasiMenit: firstBs?.durasiMenit || 90,
                        waktuMulai: formatLocalDatetime(),
                        waktuSelesai: formatLocalDatetime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                        lockBrowser: true,
                        acakSoal: true,
                        acakOpsi: true,
                        kelasIds: [],
                      })
                      setShowJadwalModal(true)
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 cursor-pointer transition active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Buat Jadwal Ujian Baru</span>
                  </button>
                </div>

                {/* Banner Info Pengarsipan */}
                <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-500/30 text-xs flex items-start gap-3">
                  <Archive className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                    <b>Fitur Arsipkan:</b> Mengarsipkan jadwal ujian akan memindahkan sesi ujian ke daftar arsip dan menyembunyikannya dari jadwal aktif siswa, dengan <b>tetap menyimpan utuh</b> seluruh riwayat nilai siswa, jawaban, dan audit log pelanggaran untuk kebutuhan rekap dan pencetakan nilai.
                  </div>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/5 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setJadwalFilterTab('AKTIF')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        jadwalFilterTab === 'AKTIF'
                          ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Jadwal Aktif</span>
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-800 text-[10px]">
                        {countAktif}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setJadwalFilterTab('ARSIP')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        jadwalFilterTab === 'ARSIP'
                          ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Arsip Ujian</span>
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
                        {countArsip}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setJadwalFilterTab('ALL')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        jadwalFilterTab === 'ALL'
                          ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>Semua ({rawJadwalList.length})</span>
                    </button>
                  </div>

                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={jadwalSearch}
                      onChange={(e) => setJadwalSearch(e.target.value)}
                      placeholder="Cari jadwal ujian, kode, atau mapel..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 backdrop-blur-sm"
                    />
                    {jadwalSearch && (
                      <button
                        type="button"
                        onClick={() => setJadwalSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredList.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-white/5 rounded-2xl text-xs text-slate-400">
                      <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        {jadwalSearch
                          ? `Tidak ditemukan jadwal dengan kata kunci "${jadwalSearch}"`
                          : jadwalFilterTab === 'ARSIP'
                          ? 'Belum ada Jadwal Ujian yang diarsipkan.'
                          : 'Belum ada Jadwal Ujian aktif yang dibuat.'}
                      </p>
                      <p className="mt-1 text-[11px]">
                        {jadwalFilterTab === 'ARSIP'
                          ? 'Klik tombol Arsipkan pada jadwal aktif untuk memindahkannya ke arsip.'
                          : 'Klik tombol + Buat Jadwal Ujian Baru di atas untuk menjadwalkan ujian.'}
                      </p>
                    </div>
                  ) : (
                    filteredList.map((u: any) => {
                      const isArchived = u.status === 'NONAKTIF';

                      return (
                        <div
                          key={u.id}
                          className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs backdrop-blur-sm shadow-xs transition ${
                            isArchived
                              ? 'bg-slate-100/70 dark:bg-slate-950/50 border-slate-300/70 dark:border-white/5 opacity-85 hover:opacity-100'
                              : 'bg-slate-50/80 dark:bg-slate-950 border-slate-200/60 dark:border-white/10'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">
                                {u.kodeUjian}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isArchived
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                    : u.status === 'SEDANG_BERJALAN'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {isArchived ? 'ARSIP (NONAKTIF)' : u.status}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{u.judul}</h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                Mulai: <b>{new Date(u.waktuMulai).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</b>
                              </span>
                              <span>• Durasi: <b>{u.durasiMenit} Menit</b></span>
                              <span>• Peserta Terdaftar: <b>{u._count?.pesertaUjian || 0} Siswa</b></span>
                              <span>• Bank Soal: <b>{u.bankSoal?.nama || '-'}</b></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {isArchived ? (
                              <button
                                type="button"
                                onClick={() => handleUnarchiveJadwal(u.id, u.judul)}
                                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer transition flex items-center gap-1.5"
                                title="Pulihkan dan aktifkan kembali ujian ini"
                              >
                                <ArchiveRestore className="w-3.5 h-3.5" />
                                <span>Pulihkan Jadwal</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleArchiveJadwal(u.id, u.judul)}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer transition flex items-center gap-1.5"
                                title="Arsipkan ujian ini (nilai dan riwayat peserta tetap tersimpan)"
                              >
                                <Archive className="w-3.5 h-3.5" />
                                <span>Arsipkan</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteJadwal(u.id, u.judul)}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer transition flex items-center gap-1"
                              title="Hapus permanen jadwal ujian"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Data Guru Pengampu (Tersinkron SIMASMUH)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Guru pembuat soal CBT & data akun SIMASMUH</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunSync('GURU')}
                    disabled={syncing}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer shadow-md disabled:opacity-50 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>Tarik Data SIMASMUH</span>
                  </button>
                  <button
                    onClick={() => setShowGuruModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Guru</span>
                  </button>
                </div>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Daftar Kelas (Rombel)</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Tersinkron dengan SIMASMUH</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunSync('KELAS')}
                      disabled={syncing}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition"
                      title="Sinkronisasi Rombel Kelas dari SIMASMUH"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                      <span>Sync SIMASMUH</span>
                    </button>
                    <button
                      onClick={() => setShowKelasModal(true)}
                      className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-md"
                      title="Tambah Kelas Manual"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Daftar Mata Pelajaran</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Tersinkron dengan SIMASMUH</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunSync('MAPEL')}
                      disabled={syncing}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition"
                      title="Sinkronisasi Mata Pelajaran dari SIMASMUH"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                      <span>Sync SIMASMUH</span>
                    </button>
                    <button
                      onClick={() => setShowMapelModal(true)}
                      className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-md"
                      title="Tambah Mapel Manual"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {mapelList.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-white/10 space-y-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Belum ada data mata pelajaran di CBT.
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Data akan otomatis terisi saat SIMASMUH memiliki mata pelajaran dan Anda menekan tombol <b>Sync SIMASMUH</b>.
                      </p>
                    </div>
                  ) : (
                    mapelList.map((m: any) => (
                      <div key={m.id} className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 flex justify-between items-center text-xs backdrop-blur-sm">
                        <div>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold block">{m.kode}</span>
                          <h4 className="font-bold text-slate-900 dark:text-white">{m.nama}</h4>
                        </div>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{m._count?.bankSoalList || 0} Bank Soal</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: CETAK DOKUMEN UJIAN RESMI */}
          {activeTab === 'cetak' && (
            <div className="space-y-6">
              {/* Toolbar Pilihan Dokumen & Filter */}
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4 print:hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Printer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Pusat Cetak Dokumen Ujian CBT
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Pilih format dokumen resmi, sesuaikan filter rombel/ruangan, dan cetak langsung.
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {cetakDocType === 'rekap_nilai' && (
                          <button
                            type="button"
                            onClick={handleExportExcel}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 transition"
                          >
                            <Download className="w-4 h-4" />
                            <span>Unduh File Excel</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer active:scale-95 transition"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Cetak Sekarang (Print / PDF)</span>
                        </button>
                      </div>
                    </p>
                  </div>
                </div>

                {/* Tab Pilihan Dokumen */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'kartu', label: '🪪 Kartu Peserta Ujian', desc: 'Kartu ujian per siswa' },
                    { id: 'daftar_hadir', label: '📋 Daftar Hadir Ujian', desc: 'Presensi tanda tangan' },
                    { id: 'berita_acara', label: '📜 Berita Acara Ujian', desc: 'Laporan pengawas ruang' },
                    { id: 'rekap_nilai', label: '📊 Rekap Nilai Ujian', desc: 'Daftar nilai per mapel' },
                  ].map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setCetakDocType(doc.id as any)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        cetakDocType === doc.id
                          ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-bold text-xs block">{doc.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">{doc.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Filter Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Filter Rombel Kelas:
                    </label>
                    <select
                      value={cetakKelasFilter}
                      onChange={(e) => setCetakKelasFilter(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                    >
                      <option value="ALL">Semua Kelas ({siswaData?.siswaList?.length || 0} Siswa)</option>
                      {kelasList.map((k: any) => (
                        <option key={k.id} value={k.id}>
                          Kelas {k.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Filter Jadwal Ujian:
                    </label>
                    <select
                      value={cetakJadwalId}
                      onChange={(e) => {
                        const newJadwalId = e.target.value
                        setCetakJadwalId(newJadwalId)
                        fetchKoreksiData(newJadwalId)
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                    >
                      {(jadwalData?.jadwalList || []).map((j: any) => (
                        <option key={j.id} value={j.id}>
                          {j.kodeUjian} — {j.judul}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Nama Pengawas 1:
                    </label>
                    <input
                      type="text"
                      value={cetakPengawas1}
                      onChange={(e) => setCetakPengawas1(e.target.value)}
                      placeholder="Nama Pengawas 1"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Nama Pengawas 2 / Proktor:
                    </label>
                    <input
                      type="text"
                      value={cetakPengawas2}
                      onChange={(e) => setCetakPengawas2(e.target.value)}
                      placeholder="Nama Pengawas 2"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Area Tampilan Dokumen Cetak */}
              {(() => {
                const rawStudents = (siswaData?.siswaList || []).filter((s: any) => {
                  if (cetakKelasFilter !== 'ALL' && s.kelasId !== cetakKelasFilter) return false;
                  return true;
                });

                const activeJadwal = (jadwalData?.jadwalList || []).find((j: any) => j.id === cetakJadwalId) || (jadwalData?.jadwalList || [])[0];

                return (
                  <div className="bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200 print:border-0 print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black">
                    {/* 1. DOKUMEN: KARTU PESERTA UJIAN */}
                    {cetakDocType === 'kartu' && (
                      <div>
                        <div className="text-center pb-4 mb-6 border-b-2 border-black print:border-black">
                          <h2 className="text-lg font-black uppercase tracking-wide">
                            {settingsForm.schoolName || 'SMA MUHAMMADIYAH 1 PONOROGO'}
                          </h2>
                          <h3 className="text-base font-bold text-blue-700 print:text-black uppercase">
                            KARTU PESERTA UJIAN BERBASIS KOMPUTER (CBT)
                          </h3>
                          <p className="text-xs text-slate-600 print:text-black">
                            Tahun Pelajaran {settingsForm.academicYear} • Semester {settingsForm.semester}
                          </p>
                        </div>

                        {rawStudents.length === 0 ? (
                          <div className="text-center py-12 text-slate-400 text-xs">
                            Tidak ada siswa yang sesuai dengan filter.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-4">
                            {rawStudents.map((st: any) => (
                              <div
                                key={st.id}
                                className="border-2 border-slate-800 rounded-xl p-3.5 bg-white text-slate-900 relative space-y-2.5 print:break-inside-avoid"
                              >
                                {/* Header Kartu */}
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-300">
                                  <img
                                    src={settingsForm.logoUrl || '/pic_logo.png'}
                                    alt="Logo"
                                    className="w-9 h-9 object-contain shrink-0"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = '/pic_logo.png';
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <h5 className="font-extrabold text-[11px] uppercase truncate leading-tight">
                                      {settingsForm.schoolName || 'SMA MUHAMMADIYAH 1'}
                                    </h5>
                                    <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider block">
                                      KARTU PESERTA CBT
                                    </span>
                                  </div>
                                </div>

                                {/* Body Info Siswa */}
                                <div className="flex gap-2.5 text-[11px] leading-tight">
                                  <div className="w-16 h-20 bg-slate-100 border border-slate-300 rounded flex flex-col items-center justify-center text-[8px] text-slate-400 shrink-0 font-mono">
                                    <span>FOTO</span>
                                    <span>2 x 3</span>
                                  </div>
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div>
                                      <span className="text-[9px] text-slate-500 uppercase block font-semibold">Nama Peserta:</span>
                                      <b className="text-[11px] font-bold text-slate-900 uppercase truncate block">
                                        {st.name}
                                      </b>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-500 uppercase block font-semibold">NIS / Username:</span>
                                      <b className="text-[11px] font-bold font-mono text-blue-600">
                                        {st.username}
                                      </b>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                                      <div>
                                        <span className="text-[9px] text-slate-500 uppercase block">Kelas:</span>
                                        <b>{st.kelas?.nama || '-'}</b>
                                      </div>
                                      <div>
                                        <span className="text-[9px] text-slate-500 uppercase block">Ruang / Sesi:</span>
                                        <b>{st.ruangUjian || 'Lab 1'} / S{st.sesiUjian || 1}</b>
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-500 uppercase block font-semibold">Password Default:</span>
                                      <b className="font-mono text-slate-700">{st.passwordRaw || '123456'}</b>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. DOKUMEN: DAFTAR HADIR PESERTA */}
                    {cetakDocType === 'daftar_hadir' && (
                      <div className="space-y-5">
                        {/* Kop Resmi */}
                        <div className="flex items-center gap-4 pb-4 border-b-2 border-black">
                          <img
                            src={settingsForm.logoUrl || '/pic_logo.png'}
                            alt="Logo Sekolah"
                            className="w-16 h-16 object-contain"
                          />
                          <div className="text-center flex-1">
                            <h2 className="text-base sm:text-lg font-black uppercase tracking-wide">
                              {settingsForm.schoolName || 'SMA MUHAMMADIYAH 1 PONOROGO'}
                            </h2>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-700 print:text-black">
                              DAFTAR HADIR PESERTA UJIAN BERBASIS KOMPUTER (CBT)
                            </h3>
                            <p className="text-xs text-slate-600 print:text-black">
                              Tahun Pelajaran {settingsForm.academicYear} • Semester {settingsForm.semester}
                            </p>
                          </div>
                        </div>

                        {/* Rincian Ujian */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-2 bg-slate-50 print:bg-transparent p-2 rounded border border-slate-200 print:border-0">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Mata Pelajaran:</span>
                            <b className="font-bold">{activeJadwal?.bankSoal?.mataPelajaran?.nama || 'Semua Mapel'}</b>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Kode Ujian:</span>
                            <b className="font-mono">{activeJadwal?.kodeUjian || '-'}</b>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Rombel Kelas:</span>
                            <b>{cetakKelasFilter === 'ALL' ? 'Semua Rombel' : kelasList.find((k: any) => k.id === cetakKelasFilter)?.nama || '-'}</b>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Hari / Tanggal:</span>
                            <b>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b>
                          </div>
                        </div>

                        {/* Tabel Presensi */}
                        <table className="w-full text-xs border-collapse border border-black">
                          <thead>
                            <tr className="bg-slate-100 print:bg-slate-100 text-center font-bold">
                              <th className="border border-black p-2 w-10">No</th>
                              <th className="border border-black p-2 w-28">NIS / No. Peserta</th>
                              <th className="border border-black p-2 text-left">Nama Lengkap Siswa</th>
                              <th className="border border-black p-2 w-24">Kelas</th>
                              <th className="border border-black p-2 w-20">Ruang / Sesi</th>
                              <th className="border border-black p-2 w-36 text-center" colSpan={2}>
                                Tanda Tangan
                              </th>
                              <th className="border border-black p-2 w-20">Keterangan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rawStudents.map((st: any, idx: number) => (
                              <tr key={st.id} className="border-b border-black">
                                <td className="border border-black p-2 text-center font-mono">{idx + 1}</td>
                                <td className="border border-black p-2 font-mono text-center">{st.username}</td>
                                <td className="border border-black p-2 font-semibold uppercase">{st.name}</td>
                                <td className="border border-black p-2 text-center">{st.kelas?.nama || '-'}</td>
                                <td className="border border-black p-2 text-center text-[10px]">
                                  {st.ruangUjian || 'Lab 1'} / S{st.sesiUjian || 1}
                                </td>
                                <td className="border border-black p-2 w-18 h-8 text-[9px] text-slate-400 align-top">
                                  {idx % 2 === 0 ? `${idx + 1}. .........` : ''}
                                </td>
                                <td className="border border-black p-2 w-18 h-8 text-[9px] text-slate-400 align-top">
                                  {idx % 2 !== 0 ? `${idx + 1}. .........` : ''}
                                </td>
                                <td className="border border-black p-2 text-center text-[10px]">Hadir</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Tanda Tangan Pengawas */}
                        <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-center print:break-inside-avoid">
                          <div className="space-y-16">
                            <p>Pengawas Ruang 1,</p>
                            <div>
                              <b className="underline font-bold block">{cetakPengawas1}</b>
                              <span className="text-[10px] text-slate-500">NIP. .................................................</span>
                            </div>
                          </div>
                          <div className="space-y-16">
                            <p>Pengawas Ruang 2 / Proktor,</p>
                            <div>
                              <b className="underline font-bold block">{cetakPengawas2}</b>
                              <span className="text-[10px] text-slate-500">NIP. .................................................</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. DOKUMEN: BERITA ACARA UJIAN */}
                    {cetakDocType === 'berita_acara' && (
                      <div className="space-y-5">
                        {/* Kop Resmi */}
                        <div className="flex items-center gap-4 pb-4 border-b-2 border-black">
                          <img
                            src={settingsForm.logoUrl || '/pic_logo.png'}
                            alt="Logo Sekolah"
                            className="w-16 h-16 object-contain"
                          />
                          <div className="text-center flex-1">
                            <h2 className="text-base sm:text-lg font-black uppercase tracking-wide">
                              {settingsForm.schoolName || 'SMA MUHAMMADIYAH 1 PONOROGO'}
                            </h2>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-700 print:text-black">
                              BERITA ACARA PELAKSANAAN UJIAN BERBASIS KOMPUTER (CBT)
                            </h3>
                            <p className="text-xs text-slate-600 print:text-black">
                              Tahun Pelajaran {settingsForm.academicYear} • Semester {settingsForm.semester}
                            </p>
                          </div>
                        </div>

                        <div className="text-xs leading-relaxed space-y-3">
                          <p>
                            Pada hari ini, <b>{new Date().toLocaleDateString('id-ID', { weekday: 'long' })}</b> tanggal{' '}
                            <b>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</b>,
                            telah diselenggarakan Penilaian / Ujian Berbasis Komputer (CBT) untuk:
                          </p>

                          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 p-3 bg-slate-50 print:bg-transparent rounded border border-slate-200 print:border-black">
                            <div>Mata Pelajaran: <b>{activeJadwal?.bankSoal?.mataPelajaran?.nama || 'Matematika'}</b></div>
                            <div>Kode Ujian: <b>{activeJadwal?.kodeUjian || '-'}</b></div>
                            <div>Kelas: <b>{cetakKelasFilter === 'ALL' ? 'Semua Kelas' : kelasList.find((k: any) => k.id === cetakKelasFilter)?.nama || '-'}</b></div>
                            <div>Durasi Ujian: <b>{activeJadwal?.durasiMenit || 90} Menit</b></div>
                          </div>

                          <div className="space-y-1.5 pt-2">
                            <h4 className="font-bold">Rincian Kehadiran Peserta Ujian:</h4>
                            <ul className="list-disc list-inside space-y-1">
                              <li>Jumlah Peserta Terdaftar : <b>{rawStudents.length} Siswa</b></li>
                              <li>Jumlah Peserta Hadir : <b>{rawStudents.length} Siswa</b></li>
                              <li>Jumlah Peserta Tidak Hadir : <b>0 Siswa</b></li>
                            </ul>
                          </div>

                          <div className="space-y-1.5 pt-2">
                            <h4 className="font-bold">Catatan Selama Pelaksanaan Ujian:</h4>
                            <div className="border border-slate-300 print:border-black rounded p-3 min-h-[70px] text-slate-600 print:text-black">
                              Pelaksanaan ujian berlangsung tertib, aman, lancar, dan seluruh peserta terkoneksi secara stabil ke server CBT MUHIPO.
                            </div>
                          </div>
                        </div>

                        {/* Tanda Tangan Pengawas & Proktor */}
                        <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center print:break-inside-avoid">
                          <div className="space-y-16">
                            <p>Pengawas Ruang 1,</p>
                            <div>
                              <b className="underline font-bold block">{cetakPengawas1}</b>
                              <span className="text-[10px] text-slate-500">NIP. .................................................</span>
                            </div>
                          </div>
                          <div className="space-y-16">
                            <p>Pengawas Ruang 2 / Proktor,</p>
                            <div>
                              <b className="underline font-bold block">{cetakPengawas2}</b>
                              <span className="text-[10px] text-slate-500">NIP. .................................................</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. DOKUMEN: REKAP NILAI UJIAN */}
                    {cetakDocType === 'rekap_nilai' && (
                      <div className="space-y-4">
                        {/* Kop Resmi */}
                        <div className="flex items-center gap-4 pb-4 border-b-2 border-black">
                          <img
                            src={settingsForm.logoUrl || '/pic_logo.png'}
                            alt="Logo Sekolah"
                            className="w-16 h-16 object-contain"
                          />
                          <div className="text-center flex-1">
                            <h2 className="text-base sm:text-lg font-black uppercase tracking-wide">
                              {settingsForm.schoolName || 'SMA MUHAMMADIYAH 1 PONOROGO'}
                            </h2>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-700 print:text-black">
                              REKAPITULASI HASIL NILAI UJIAN CBT
                            </h3>
                            <p className="text-xs text-slate-600 print:text-black">
                              Mata Pelajaran: <b>{activeJadwal?.bankSoal?.mataPelajaran?.nama || 'Matematika'}</b> • Tahun {settingsForm.academicYear}
                            </p>
                          </div>
                        </div>

                        {(() => {
                          const hasilUjianList = koreksiData?.hasilList || [];
                          const currentKkm = Number(activeJadwal?.bankSoal?.kkm ?? koreksiData?.activeUjian?.bankSoal?.kkm ?? 75);

                          const rowsToDisplay = rawStudents.map((st: any) => {
                            const foundHasil = hasilUjianList.find((h: any) => h.siswa?.id === st.id || h.siswa?.username === st.username);
                            const nilaiPG = foundHasil?.nilaiPG != null ? Number(Number(foundHasil.nilaiPG).toFixed(2)) : 0;
                            const nilaiEsai = foundHasil?.nilaiEsai != null ? Number(Number(foundHasil.nilaiEsai).toFixed(2)) : 0;
                            const nilaiTotal = foundHasil?.nilaiTotal != null ? Number(Number(foundHasil.nilaiTotal).toFixed(2)) : 0;
                            const statusPeserta = foundHasil?.status || 'BELUM_MENGERJAKAN';
                            const isTuntas = nilaiTotal >= currentKkm;

                            return {
                              st,
                              nilaiPG,
                              nilaiEsai,
                              nilaiTotal,
                              statusPeserta,
                              isTuntas,
                            };
                          });

                          return (
                            <table className="w-full text-xs border-collapse border border-black">
                              <thead>
                                <tr className="bg-slate-100 text-center font-bold">
                                  <th className="border border-black p-2 w-10">No</th>
                                  <th className="border border-black p-2 w-28">NIS / No. Peserta</th>
                                  <th className="border border-black p-2 text-left">Nama Lengkap Siswa</th>
                                  <th className="border border-black p-2 w-24">Kelas</th>
                                  <th className="border border-black p-2 w-20 text-center">Nilai PG</th>
                                  <th className="border border-black p-2 w-20 text-center">Nilai Essay</th>
                                  <th className="border border-black p-2 w-20 text-center">Total Skor</th>
                                  <th className="border border-black p-2 w-24 text-center">Ketuntasan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rowsToDisplay.map(({ st, nilaiPG, nilaiEsai, nilaiTotal, statusPeserta, isTuntas }: any, idx: number) => (
                                  <tr key={st.id} className="border-b border-black text-center">
                                    <td className="border border-black p-2 font-mono">{idx + 1}</td>
                                    <td className="border border-black p-2 font-mono">{st.username}</td>
                                    <td className="border border-black p-2 text-left font-semibold uppercase">{st.name}</td>
                                    <td className="border border-black p-2">{st.kelas?.nama || '-'}</td>
                                    <td className="border border-black p-2 font-mono">{nilaiPG}</td>
                                    <td className="border border-black p-2 font-mono">{nilaiEsai}</td>
                                    <td className="border border-black p-2 font-mono font-bold text-blue-700 print:text-black">
                                      {nilaiTotal}
                                    </td>
                                    <td className="border border-black p-2 font-bold text-[11px]">
                                      {statusPeserta === 'SELESAI' ? (
                                        <span className={isTuntas ? 'text-emerald-600 print:text-black' : 'text-rose-600 print:text-black'}>
                                          {isTuntas ? 'TUNTAS' : 'REMIDIAL'}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 print:text-black">{statusPeserta}</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })()}
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
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-900 dark:text-slate-200 font-semibold text-xs">
                          Logo Sekolah & Sistem (Terkompres Otomatis)
                        </label>
                        {settingsForm.logoUrl && settingsForm.logoUrl !== '/pic_logo.png' && (
                          <button
                            type="button"
                            onClick={async () => {
                              const newSettings = { ...settingsForm, logoUrl: '/pic_logo.png' }
                              setSettingsForm(newSettings)
                              await fetch('/api/pengaturan', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(newSettings),
                              })
                              showNotification('Sukses', 'Logo dikembalikan ke default.', 'success')
                            }}
                            className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium hover:underline cursor-pointer"
                          >
                            Reset Default
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {settingsForm.logoUrl && (
                          <img
                            src={settingsForm.logoUrl}
                            alt="Preview Logo"
                            className="w-12 h-12 object-contain rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 shrink-0 shadow-xs"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/pic_logo.png';
                            }}
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
                      <div className="flex items-center justify-between">
                        <label className="block font-bold text-slate-900 dark:text-slate-100 text-xs">
                          Wallpaper Background Master
                        </label>
                        {settingsForm.backgroundUrl && settingsForm.backgroundUrl !== '/muhipo-front.jpg' && (
                          <button
                            type="button"
                            onClick={async () => {
                              const newSettings = { ...settingsForm, backgroundUrl: '/muhipo-front.jpg' }
                              setSettingsForm(newSettings)
                              await fetch('/api/pengaturan', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(newSettings),
                              })
                              showNotification('Sukses', 'Wallpaper latar belakang dikembalikan ke default.', 'success')
                            }}
                            className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium hover:underline cursor-pointer"
                          >
                            Reset Default
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        {settingsForm.backgroundUrl ? (
                          <div className="relative w-20 h-12 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 shadow-xs">
                            <img
                              src={settingsForm.backgroundUrl}
                              alt="Preview Background Master"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/muhipo-front.jpg';
                              }}
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
      {/* Modal Inspeksi Layar Pelanggaran Siswa */}
      {violationScreenModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Inspeksi Layar Siswa: {violationScreenModal.name}</span>
                    {violationScreenModal.jumlahPelanggaran > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                        {violationScreenModal.jumlahPelanggaran} Pelanggaran
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    NIS: <b>{violationScreenModal.nis || violationScreenModal.username}</b> • Kelas: <b>{violationScreenModal.kelas}</b> • Status: <b>{violationScreenModal.status}</b>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViolationScreenModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Tab/Switcher Tampilan: Layar Realtime Aktif vs Bukti Pelanggaran Terakhir */}
            <div className="space-y-3">
              {/* Header Live Feed */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${liveScreenFeed?.isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${liveScreenFeed?.isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <span>{liveScreenFeed?.isOnline ? '🔴 LIVE MONITORING AKTIF' : 'STATUS TERAKHIR PESERTA'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {liveScreenFeed ? (
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                      {liveScreenFeed.browser} • {liveScreenFeed.device}
                    </span>
                  ) : (
                    <span>Menghubungkan ke layar siswa...</span>
                  )}
                </div>
              </div>

              {/* Tampilan Feed Layar Realtime */}
              {liveScreenFeed?.screenImage ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-xl bg-black group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={liveScreenFeed.screenImage}
                    alt={`Layar Aktif ${violationScreenModal.name}`}
                    className="w-full h-auto max-h-[380px] object-contain bg-slate-950 mx-auto"
                  />
                  <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-slate-950/85 backdrop-blur-md text-white text-[11px] flex justify-between items-center border border-white/10">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>
                        {liveScreenFeed.isStreamNative ? 'Native Chrome Screen Stream' : 'Mobile Active Exam Guard'} • Update: {Math.round(liveScreenFeed.ageMs / 1000)}s lalu
                      </span>
                    </div>
                    <a
                      href={liveScreenFeed.screenImage}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold shrink-0 ml-2 shadow-xs transition cursor-pointer"
                    >
                      Buka Penuh
                    </a>
                  </div>
                </div>
              ) : violationScreenModal.latestScreenshot ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-lg bg-black group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={violationScreenModal.latestScreenshot}
                    alt={`Layar Pelanggaran ${violationScreenModal.name}`}
                    className="w-full h-auto max-h-[360px] object-contain bg-slate-950 mx-auto"
                  />
                  <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-slate-950/80 backdrop-blur-sm text-white text-[11px] flex justify-between items-center">
                    <span className="font-mono truncate">
                      ⚠ Snapshot Tersimpan: {violationScreenModal.latestViolationDetail || 'Terdeteksi berpindah layar'}
                    </span>
                    <a
                      href={violationScreenModal.latestScreenshot}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-[10px] font-bold shrink-0 ml-2"
                    >
                      Buka Penuh
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 space-y-2">
                  <Monitor className="w-10 h-10 text-slate-400 opacity-50 mx-auto animate-pulse" />
                  <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                    Menunggu koneksi feed layar siswa aktif...
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Jika siswa menggunakan <b>Google Chrome</b> di Laptop/PC dengan screen share aktif, feed monitor akan langsung mengalir secara realtime. Di perangkat Mobile Android/iOS, sistem memancarkan visual status ujian siswa secara otomatis.
                  </p>
                </div>
              )}
            </div>

            {/* Riwayat Log Pelanggaran Siswa */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Riwayat Log Aktivitas & Peringatan:
              </span>
              <div className="max-h-44 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                {(!violationScreenModal.logsTerakhir || violationScreenModal.logsTerakhir.length === 0) ? (
                  <p className="text-center text-[11px] text-slate-400 py-3">Tidak ada catatan aktivitas mencurigakan.</p>
                ) : (
                  violationScreenModal.logsTerakhir.map((log: any, idx: number) => {
                    const isViolation = [
                      'TAB_SWITCH_ALERT',
                      'WINDOW_BLUR',
                      'FULLSCREEN_EXIT',
                      'SCREEN_SHARE_STOPPED',
                      'KEYBOARD_SHORTCUT_VIOLATION',
                      'SECURITY_ALERT',
                    ].includes(log.aktivitas);

                    return (
                      <div
                        key={log.id || idx}
                        className={`p-2 rounded-lg text-[11px] flex justify-between items-start gap-2 ${
                          isViolation
                            ? 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold font-mono uppercase text-[10px] block">
                            {log.aktivitas}
                          </span>
                          <p className="text-[10.5px] mt-0.5 truncate">{log.detail || '-'}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(log.createdAt).toLocaleTimeString('id-ID')}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Aksi Proktor Cepat */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setViolationScreenModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer hover:bg-slate-200"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResetLogin(violationScreenModal.pesertaUjianId, violationScreenModal.name);
                  setViolationScreenModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-md shadow-rose-600/20"
              >
                Reset Login Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {showJadwalModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Buat Jadwal Ujian Baru</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tentukan bank soal, waktu mulai, durasi pengerjaan, dan distribusikan ke rombel kelas target.
                </p>
              </div>
              <button
                onClick={() => setShowJadwalModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJadwal} className="space-y-3.5">
              {/* 1. Pilih Bank Soal & Tipe Ujian */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Pilih Sumber Bank Soal:
                  </label>
                  <select
                    required
                    value={jadwalForm.bankSoalId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const bs = bankSoalList.find((b) => b.id === selectedId);
                      const currentTipe = jadwalForm.tipeUjian || 'PAS';
                      setJadwalForm({
                        ...jadwalForm,
                        bankSoalId: selectedId,
                        kodeUjian: bs ? `${currentTipe}-${bs.kodeBank}-${new Date().getFullYear()}` : jadwalForm.kodeUjian,
                        judul: bs ? `${currentTipe} ${bs.nama}` : jadwalForm.judul,
                        durasiMenit: bs?.durasiMenit || 90,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Pilih Bank Soal --</option>
                    {bankSoalList.map((bs) => {
                      const pengampu = bs.mataPelajaran?.gurus?.[0]?.guru?.name || (bs.pembuat?.role === 'GURU' ? bs.pembuat?.name : 'Guru Pengampu');
                      return (
                        <option key={bs.id} value={bs.id}>
                          [{bs.kodeBank}] {bs.nama} ({bs.mataPelajaran?.nama} • Tingkat {bs.tingkat} • Pengampu: {pengampu})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Tipe Ujian:
                  </label>
                  <select
                    value={jadwalForm.tipeUjian || 'PAS'}
                    onChange={(e) => {
                      const newTipe = e.target.value;
                      const bs = bankSoalList.find((b) => b.id === jadwalForm.bankSoalId);
                      setJadwalForm({
                        ...jadwalForm,
                        tipeUjian: newTipe,
                        kodeUjian: bs ? `${newTipe}-${bs.kodeBank}-${new Date().getFullYear()}` : `${newTipe}-${new Date().getFullYear()}`,
                        judul: bs ? `${newTipe} ${bs.nama}` : jadwalForm.judul,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-bold"
                  >
                    {DAFTAR_TIPE_UJIAN.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Kode & Judul Ujian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Kode Ujian</label>
                  <input
                    type="text"
                    required
                    value={jadwalForm.kodeUjian}
                    onChange={(e) => setJadwalForm({ ...jadwalForm, kodeUjian: e.target.value })}
                    placeholder="Contoh: PAS-MTK-10-2026"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Judul Ujian</label>
                  <input
                    type="text"
                    required
                    value={jadwalForm.judul}
                    onChange={(e) => setJadwalForm({ ...jadwalForm, judul: e.target.value })}
                    placeholder="Contoh: Penilaian Akhir Semester Matematika"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* 3. Waktu Mulai & Durasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Tanggal & Jam Mulai Ujian:
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={jadwalForm.waktuMulai}
                    onChange={(e) => setJadwalForm({ ...jadwalForm, waktuMulai: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={360}
                    value={jadwalForm.durasiMenit}
                    onChange={(e) => setJadwalForm({ ...jadwalForm, durasiMenit: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Info Sinkronisasi Real-Time */}
              <div className="p-3 rounded-2xl bg-cyan-50/80 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 text-[11px] text-cyan-800 dark:text-cyan-300 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <b className="font-bold">Sinkronisasi Waktu Real-Time:</b>
                  <p className="mt-0.5 text-[10.5px] text-cyan-700 dark:text-cyan-300/90">
                    Siswa yang mulai di atas jam mulai otomatis sisa durasinya terpotong proporsional mengikuti jam server real-time.
                  </p>
                </div>
              </div>

              {/* 4. Pilihan Rombel Kelas Target */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                    Pilih Kelas Peserta Ujian (Centang Kelas):
                  </label>
                  {kelasList.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() =>
                          setJadwalForm({
                            ...jadwalForm,
                            kelasIds: kelasList.map((k) => k.id),
                          })
                        }
                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                      >
                        Pilih Semua ({kelasList.length})
                      </button>
                      <span className="text-slate-400">•</span>
                      <button
                        type="button"
                        onClick={() =>
                          setJadwalForm({
                            ...jadwalForm,
                            kelasIds: [],
                          })
                        }
                        className="text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </div>
                  )}
                </div>
                {kelasList.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400">
                    <p className="font-semibold">Belum ada data kelas.</p>
                    <p className="text-[10px] mt-0.5">Silakan lakukan Sinkronisasi SIMASMUH terlebih dahulu.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10">
                    {kelasList.map((k) => {
                      const isChecked = jadwalForm.kelasIds.includes(k.id);
                      return (
                        <label
                          key={k.id}
                          className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                            isChecked
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-800 dark:text-blue-200 font-bold'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setJadwalForm({
                                  ...jadwalForm,
                                  kelasIds: [...jadwalForm.kelasIds, k.id],
                                });
                              } else {
                                setJadwalForm({
                                  ...jadwalForm,
                                  kelasIds: jadwalForm.kelasIds.filter((id) => id !== k.id),
                                });
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="truncate">Kelas {k.nama}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {jadwalForm.kelasIds.length > 0 && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
                    ✓ {jadwalForm.kelasIds.length} rombel kelas dipilih
                  </p>
                )}
              </div>

              {/* 5. Fitur Keamanan & Anti-Cheat */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <label className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={jadwalForm.acakSoal}
                    onChange={(e) => setJadwalForm({ ...jadwalForm, acakSoal: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Acak Soal</span>
                </label>
                <label className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={jadwalForm.acakOpsi}
                    onChange={(e) => setJadwalForm({ ...jadwalForm, acakOpsi: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Acak Opsi</span>
                </label>
                <label className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={jadwalForm.lockBrowser}
                    onChange={(e) => setJadwalForm({ ...jadwalForm, lockBrowser: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Lock Browser</span>
                </label>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowJadwalModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer shadow-md shadow-blue-600/30"
                >
                  Buat & Distribusikan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <option value={10}>Kelas 10</option>
                    <option value={11}>Kelas 11</option>
                    <option value={12}>Kelas 12</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Jurusan / Program</label>
                  <select
                    value={newBankForm.jurusan || 'UMUM'}
                    onChange={(e) => setNewBankForm({ ...newBankForm, jurusan: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                  >
                    {DAFTAR_JURUSAN_MUHIPO.map((j) => (
                      <option key={j.value} value={j.value}>
                        {j.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Mata Pelajaran</label>
                  <select
                    value={newBankForm.mataPelajaranId}
                    onChange={(e) => setNewBankForm({ ...newBankForm, mataPelajaranId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    {mapelList.map((m) => {
                      const pengampuName = m.gurus?.[0]?.guru?.name;
                      return (
                        <option key={m.id} value={m.id}>
                          {m.nama} ({m.kode}){pengampuName ? ` • Pengampu: ${pengampuName}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Jam Mulai Standar</label>
                  <input
                    type="time"
                    value={newBankForm.jamMulai || '09:00'}
                    onChange={(e) => setNewBankForm({ ...newBankForm, jamMulai: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Durasi (Menit)</label>
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

              {/* Info Sinkronisasi Real-Time */}
              <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <b className="font-bold">Sinkronisasi Waktu Real-Time:</b>
                  <p className="mt-0.5 text-[10.5px] text-blue-700 dark:text-blue-300/90">
                    Jika ujian dimulai pukul <b>{newBankForm.jamMulai || '09:00'}</b> dengan durasi <b>{newBankForm.durasiMenit} menit</b>, siswa yang mulai mengerjakan di atas jam mulai otomatis durasinya terpotong mengikuti jam server real-time.
                  </p>
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
                    <option value={10}>Kelas 10</option>
                    <option value={11}>Kelas 11</option>
                    <option value={12}>Kelas 12</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Jurusan / Program</label>
                  <select
                    value={editBankModal.jurusan || 'UMUM'}
                    onChange={(e) => setEditBankModal({ ...editBankModal, jurusan: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                  >
                    {DAFTAR_JURUSAN_MUHIPO.map((j) => (
                      <option key={j.value} value={j.value}>
                        {j.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Mata Pelajaran</label>
                  <select
                    value={editBankModal.mataPelajaranId}
                    onChange={(e) => setEditBankModal({ ...editBankModal, mataPelajaranId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    {mapelList.map((m) => {
                      const pengampuName = m.gurus?.[0]?.guru?.name;
                      return (
                        <option key={m.id} value={m.id}>
                          {m.nama} ({m.kode}){pengampuName ? ` • Pengampu: ${pengampuName}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Jam Mulai Standar</label>
                  <input
                    type="time"
                    value={editBankModal.jamMulai || '09:00'}
                    onChange={(e) => setEditBankModal({ ...editBankModal, jamMulai: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
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

              {/* Info Sinkronisasi Real-Time */}
              <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <b className="font-bold">Sinkronisasi Waktu Real-Time:</b>
                  <p className="mt-0.5 text-[10.5px] text-blue-700 dark:text-blue-300/90">
                    Siswa yang mulai di atas jam <b>{editBankModal.jamMulai || '09:00'}</b> akan mendapatkan durasi yang otomatis berkurang sesuai jam server.
                  </p>
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
                    {bankSoalList.map((bs) => {
                      const pengampu = bs.mataPelajaran?.gurus?.[0]?.guru?.name || (bs.pembuat?.role === 'GURU' ? bs.pembuat?.name : 'Guru Pengampu');
                      return (
                        <option key={bs.id} value={bs.id}>
                          [{bs.kodeBank}] {bs.nama} - {bs.mataPelajaran?.nama} (Pengampu: {pengampu})
                        </option>
                      );
                    })}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tipe Ujian</label>
                  <select
                    value={distributeForm.tipeUjian || 'PAS'}
                    onChange={(e) => {
                      const newTipe = e.target.value;
                      setDistributeForm({
                        ...distributeForm,
                        tipeUjian: newTipe,
                        kodeUjian: `${newTipe}-${distributeModal.kodeBank}-${new Date().getFullYear()}`,
                        judul: `${newTipe} ${distributeModal.nama}`,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-bold"
                  >
                    {DAFTAR_TIPE_UJIAN.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
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
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Judul Ujian</label>
                  <input
                    type="text"
                    required
                    value={distributeForm.judul}
                    onChange={(e) => setDistributeForm({ ...distributeForm, judul: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Tanggal & Jam Mulai Ujian:
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={distributeForm.waktuMulai}
                    onChange={(e) => setDistributeForm({ ...distributeForm, waktuMulai: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={360}
                    value={distributeForm.durasiMenit}
                    onChange={(e) => setDistributeForm({ ...distributeForm, durasiMenit: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Info Sinkronisasi Real-Time */}
              <div className="p-3 rounded-2xl bg-cyan-50/80 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 text-[11px] text-cyan-800 dark:text-cyan-300 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <b className="font-bold">Sinkronisasi Waktu Real-Time:</b>
                  <p className="mt-0.5 text-[10.5px] text-cyan-700 dark:text-cyan-300/90">
                    Siswa yang mulai mengerjakan terlambat (di atas jam mulai) otomatis mendapatkan sisa durasi yang terpotong secara proporsional sesuai jam server real-time.
                  </p>
                </div>
              </div>

              {/* Pilihan Rombel Kelas Target */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                    Pilih Kelas Tujuan Ujian (Centang Kelas):
                  </label>
                  {kelasList.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() =>
                          setDistributeForm({
                            ...distributeForm,
                            kelasIds: kelasList.map((k) => k.id),
                          })
                        }
                        className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline cursor-pointer"
                      >
                        Pilih Semua ({kelasList.length})
                      </button>
                      <span className="text-slate-400">•</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDistributeForm({
                            ...distributeForm,
                            kelasIds: [],
                          })
                        }
                        className="text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </div>
                  )}
                </div>
                {kelasList.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400">
                    <p className="font-semibold">Belum ada data kelas.</p>
                    <p className="text-[10px] mt-0.5">Silakan lakukan Sinkronisasi SIMASMUH terlebih dahulu.</p>
                  </div>
                ) : (
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
                          <span className="truncate">Kelas {k.nama}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
                {distributeForm.kelasIds.length > 0 && (
                  <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold mt-1">
                    ✓ {distributeForm.kelasIds.length} rombel kelas dipilih
                  </p>
                )}
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

      {/* MODAL PANDUAN LENGKAP OPERASIONAL & SOP PROKTOR / ADMIN */}
      {showAdminGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 backdrop-blur-md flex items-center justify-center font-bold text-blue-400">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">SOP & Panduan Operasional Administrator / Proktor CBT</h3>
                  <p className="text-xs text-slate-300">Standar Prosedur Operasional Ujian, Monitoring Live, & Penanganan Masalah</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminGuideModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {/* SOP Tahapan Ujian */}
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span>1. SOP Tahapan Pelaksanaan Ujian (Pra, Sedang, & Pasca Ujian)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 space-y-1.5">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 inline-block">Fase 1: Pra-Ujian</span>
                    <p className="text-xs leading-relaxed">
                      1. Pastikan sinkronisasi data siswa/guru dari SIMASMUH telah terbaru.<br/>
                      2. Pastikan jadwal ujian telah terdistribusi ke kelas rombel.<br/>
                      3. Rilis Token Ujian melalui menu <b>Monitoring Proktor</b> sebelum sesi ujian dimulai.<br/>
                      4. Cetak <b>Kartu Peserta</b> & <b>Daftar Hadir</b> di menu <i>Cetak Dokumen</i>.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 space-y-1.5">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 inline-block">Fase 2: Saat Ujian Berlangsung</span>
                    <p className="text-xs leading-relaxed">
                      1. Pantau status realtime pengerjaan di tab <b>Proktor Live (2s refresh)</b>.<br/>
                      2. Cek indikator warna status siswa (Kuning: Mengerjakan, Hijau: Selesai, Abu-abu: Belum Mulai).<br/>
                      3. Pantau log audit trail untuk melihat peringatan siswa yang mencoba membuka tab lain atau keluar layar penuh.
                    </p>
                  </div>
                </div>
              </div>

              {/* Troubleshooting Matriks */}
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                  <span>2. Panduan Troubleshooting & Aksi Darurat Proktor</span>
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="text-xs space-y-0.5">
                      <b className="text-slate-900 dark:text-white">Siswa Ganti HP / Browser Tertutup / Baterai Drop:</b>
                      <p className="text-slate-600 dark:text-slate-300">
                        Cukup klik tombol <b>"Reset Login"</b> pada baris siswa di tab Monitoring Proktor. Siswa dapat login kembali dari perangkat lain tanpa kehilangan jawaban sebelumnya.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="text-xs space-y-0.5">
                      <b className="text-slate-900 dark:text-white">Siswa Mengalami Kendala Teknis & Butuh Waktu Tambahan:</b>
                      <p className="text-slate-600 dark:text-slate-300">
                        Klik tombol <b>"Tambah Waktu"</b> (+15 / +30 menit) pada siswa bersangkutan. Waktu siswa akan langsung bertambah di lembar ujiannya secara otomatis.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="text-xs space-y-0.5">
                      <b className="text-slate-900 dark:text-white">Siswa Melakukan Pelanggaran Berulang (Curang):</b>
                      <p className="text-slate-600 dark:text-slate-300">
                        Klik tombol <b>"Kunci Ujian"</b> untuk membekukan lembar soal siswa, atau <b>"Selesaikan Paksa"</b> bila pengawas memutuskan menghentikan ujian siswa.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      4
                    </div>
                    <div className="text-xs space-y-0.5">
                      <b className="text-slate-900 dark:text-white">Gangguan Server / Jaringan Serentak Satu Ruangan:</b>
                      <p className="text-slate-600 dark:text-slate-300">
                        Gunakan tombol <b>"Reset Login Massal"</b> di bagian atas Proktor Live untuk mengizinkan seluruh peserta login ulang secara bersamaan.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seksi 3: Fitur Keunggulan dibanding ZYACBT */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/20 to-indigo-900/30 border border-blue-500/30 space-y-2">
                <b className="text-blue-600 dark:text-blue-300 text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Keunggulan Fitur CBT MUHIPO Next-Gen:</span>
                </b>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Real-time WebSocket / Polling 2s tanpa lag.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Live Screen Monitoring & Snapshot Layar Ujian.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Sinkronisasi instan dengan database SIMASMUH.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Cetak Dokumen Berita Acara & Daftar Hadir Otomatis.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowAdminGuideModal(false)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Tutup Panduan Proktor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global In-App Notification & Confirmation Dialog Modal */}
      <NotificationModal
        isOpen={notifModal.isOpen}
        type={notifModal.type}
        title={notifModal.title}
        message={notifModal.message}
        confirmText={notifModal.confirmText}
        cancelText={notifModal.cancelText}
        onConfirm={notifModal.onConfirm}
        onCancel={notifModal.onCancel}
      />
    </div>
  )
}
