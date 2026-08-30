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

  // In-App Notification / Dialog Modal State
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
      } else if (activeTab === 'cetak') {
        const [sRes, jRes, kRes] = await Promise.all([
          fetch('/api/admin?tab=siswa'),
          fetch('/api/admin?tab=jadwal'),
          fetch('/api/admin?tab=kelas'),
        ]);
        const [sJson, jJson, kJson] = await Promise.all([
          sRes.json(),
          jRes.json(),
          kRes.json(),
        ]);
        if (sJson.success) setSiswaData(sJson.data)
        if (jJson.success) {
          setJadwalData(jJson.data)
          if (jJson.data?.jadwalList?.length > 0 && !cetakJadwalId) {
            setCetakJadwalId(jJson.data.jadwalList[0].id)
          }
        }
        if (kJson.success) setKelasList(kJson.data)
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
      const compressed = await compressImageFile(file, { maxWidth: 600, maxHeight: 600, quality: 0.85 })
      const newSettings = { ...settingsForm, logoUrl: compressed.dataUrl }
      setSettingsForm(newSettings)

      // Auto-save langsung ke server & database agar tidak hilang jika refresh
      const res = await fetch('/api/pengaturan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      const json = await res.json()
      if (json.success && json.data?.logoUrl) {
        setSettingsForm((prev) => ({ ...prev, logoUrl: json.data.logoUrl }))
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
      const compressed = await compressImageFile(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.85 })
      const newSettings = { ...settingsForm, backgroundUrl: compressed.dataUrl }
      setSettingsForm(newSettings)

      // Auto-save langsung ke server & database agar tidak hilang jika refresh
      const res = await fetch('/api/pengaturan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      const json = await res.json()
      if (json.success && json.data?.backgroundUrl) {
        setSettingsForm((prev) => ({ ...prev, backgroundUrl: json.data.backgroundUrl }))
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

  const handleDeleteJadwal = async (ujianId: string, judul: string) => {
    showConfirm(
      'Hapus Jadwal Ujian',
      `Hapus Jadwal Ujian "${judul}" beserta seluruh data pengerjaan peserta terkait?`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE_UJIAN', ujianId }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Jadwal Dihapus', 'Jadwal Ujian berhasil dihapus!', 'success')
            fetchSessionAndAdminData()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus jadwal ujian', 'error')
          }
        } catch (e) {
          showNotification('Error', 'Gagal menghapus jadwal ujian', 'error')
        }
      },
      'error',
      'Ya, Hapus Jadwal'
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
          showNotification('Peringatan Format', 'File Excel kosong atau format tidak sesuai.', 'warning')
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



  const handleExportExcel = () => {
    if (!koreksiData?.hasilList?.length) {
      showNotification('Informasi', 'Belum ada data nilai untuk diekspor.', 'info')
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>Jadwal Ujian Aktif</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Atur jadwal, jam mulai, durasi pengerjaan, dan distribusi ujian ke rombel kelas</p>
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

              <div className="space-y-3">
                {(!jadwalData?.jadwalList || jadwalData.jadwalList.length === 0) ? (
                  <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-white/5 rounded-2xl text-xs text-slate-400">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">Belum ada Jadwal Ujian yang dibuat.</p>
                    <p className="mt-1">Klik tombol <b>+ Buat Jadwal Ujian Baru</b> di atas atau masuk ke menu <b>Bank Soal</b> dan klik <b>Kirim ke Kelas</b>.</p>
                  </div>
                ) : (
                  jadwalData.jadwalList.map((u: any) => (
                    <div key={u.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs backdrop-blur-sm shadow-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">
                            {u.kodeUjian}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {u.status}
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
                        <button
                          onClick={() => handleDeleteJadwal(u.id, u.judul)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Jadwal</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
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
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer active:scale-95 transition"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Sekarang (Print / PDF)</span>
                    </button>
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
                      onChange={(e) => setCetakJadwalId(e.target.value)}
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
                                      <span className="text-[9px] text-slate-500 block">Nama Lengkap:</span>
                                      <b className="font-bold text-slate-900 block truncate">{st.name}</b>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                                      <div>
                                        <span className="text-[8px] text-slate-500 block">NIS / Login:</span>
                                        <b className="font-mono">{st.username}</b>
                                      </div>
                                      <div>
                                        <span className="text-[8px] text-slate-500 block">NISN:</span>
                                        <b className="font-mono">{st.nisn || '-'}</b>
                                      </div>
                                    </div>
                                    <div className="text-[10px]">
                                      <span className="text-[8px] text-slate-500 block">Kelas:</span>
                                      <b>{st.kelas?.nama || '-'}</b>
                                    </div>
                                  </div>
                                </div>

                                {/* Footer Kartu & Password */}
                                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] bg-slate-50 p-1.5 rounded">
                                  <div>
                                    <span className="text-slate-500 block text-[8px]">Kata Sandi Ujian:</span>
                                    <b className="font-mono text-[10px] text-blue-700 font-bold">{st.username}</b>
                                  </div>
                                  <div className="text-right text-[8px] text-slate-500">
                                    <span>Ponorogo, {new Date().toLocaleDateString('id-ID')}</span>
                                    <span className="block font-bold text-slate-700">Panitia CBT MUHIPO</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. DOKUMEN: DAFTAR HADIR PESERTA UJIAN */}
                    {cetakDocType === 'daftar_hadir' && (
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

                        <table className="w-full text-xs border-collapse border border-black">
                          <thead>
                            <tr className="bg-slate-100 text-center font-bold">
                              <th className="border border-black p-2 w-10">No</th>
                              <th className="border border-black p-2 w-28">NIS / No. Peserta</th>
                              <th className="border border-black p-2 text-left">Nama Lengkap Siswa</th>
                              <th className="border border-black p-2 w-24">Kelas</th>
                              <th className="border border-black p-2 w-24">Nilai PG</th>
                              <th className="border border-black p-2 w-24">Nilai Essay</th>
                              <th className="border border-black p-2 w-24">Total Nilai</th>
                              <th className="border border-black p-2 w-24">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rawStudents.map((st: any, idx: number) => (
                              <tr key={st.id} className="border-b border-black text-center">
                                <td className="border border-black p-2 font-mono">{idx + 1}</td>
                                <td className="border border-black p-2 font-mono">{st.username}</td>
                                <td className="border border-black p-2 text-left font-semibold uppercase">{st.name}</td>
                                <td className="border border-black p-2">{st.kelas?.nama || '-'}</td>
                                <td className="border border-black p-2 font-mono">100.0</td>
                                <td className="border border-black p-2 font-mono">0.0</td>
                                <td className="border border-black p-2 font-mono font-bold text-blue-700 print:text-black">
                                  100.0
                                </td>
                                <td className="border border-black p-2 font-bold text-emerald-600 print:text-black">
                                  TUNTAS
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
                      <label className="block text-slate-900 dark:text-slate-200 font-semibold text-xs">
                        Logo Sekolah & Sistem (Terkompres Otomatis)
                      </label>
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
                    {bankSoalList.map((bs) => (
                      <option key={bs.id} value={bs.id}>
                        [{bs.kodeBank}] {bs.nama} ({bs.mataPelajaran?.nama} • Tingkat {bs.tingkat})
                      </option>
                    ))}
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
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                  Pilih Kelas Peserta Ujian (Centang Kelas):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10">
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
                    {mapelList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama} ({m.kode})
                      </option>
                    ))}
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
                    {mapelList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama} ({m.kode})
                      </option>
                    ))}
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
