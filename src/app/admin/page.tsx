'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import NextImage from 'next/image'
import { AppNavbar } from '@/components/layout/AppNavbar'
import { AppSidebar, NavTabItem } from '@/components/layout/AppSidebar'
import { AppFooter } from '@/components/layout/AppFooter'
import { NotificationModal, NotificationType } from '@/components/NotificationModal'

// Lucide Icons
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Database,
  Radio,
  Printer,
  Settings,
  CalendarDays,
  Sparkles,
  Clock,
  RotateCcw,
  Crown,
} from 'lucide-react'

// Modular Dashboard Views
import { ModulTopikView } from './components/ModulTopikView'
import { ModulSoalView } from './components/ModulSoalView'
import { ModulImportView } from './components/ModulImportView'
import { ModulDaftarView } from './components/ModulDaftarView'
import { ModulFileManagerView } from './components/ModulFileManagerView'

import { PesertaGroupView } from './components/PesertaGroupView'
import { PesertaDaftarView } from './components/PesertaDaftarView'
import { PesertaImportView } from './components/PesertaImportView'

import { TesTambahView } from './components/TesTambahView'
import { TesDaftarView } from './components/TesDaftarView'
import { TesEvaluasiView } from './components/TesEvaluasiView'
import { TesHasilView } from './components/TesHasilView'
import { TesRekapView } from './components/TesRekapView'

import { DashboardOverview } from './components/DashboardOverview'
import { ProktorLiveView } from './components/ProktorLiveView'
import { CetakDokumenView } from './components/CetakDokumenView'
import { PengaturanView } from './components/PengaturanView'
import { PenggunaAksesView } from './components/PenggunaAksesView'
import { BackupDataView } from './components/BackupDataView'

export default function ComprehensiveAdminDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Master Data State
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [proktorData, setProktorData] = useState<any>(null)
  const [modulList, setModulList] = useState<any[]>([])
  const [bankSoalList, setBankSoalList] = useState<any[]>([])
  const [mapelList, setMapelList] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [siswaList, setSiswaList] = useState<any[]>([])
  const [ujianList, setUjianList] = useState<any[]>([])
  const [selectedMapelId, setSelectedMapelId] = useState<string>('')

  // Modal Extra Time State
  const [extraTimeModal, setExtraTimeModal] = useState<any>(null)
  const [extraMinutes, setExtraMinutes] = useState(15)

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    schoolName: 'SMA Muhammadiyah 1 Ponorogo',
    appTitle: 'CBT SMA MUHIPO',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    timezone: 'Asia/Jakarta',
    serverLocation: 'Ponorogo, Jawa Timur',
    logoUrl: '/pic_logo.png',
    backgroundUrl: '/muhipo-front.jpg',
    timeSyncOffsetMs: 0,
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // Notification Modal State
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

  // Fetch All Admin & Standalone CBT Data
  const fetchAllData = async () => {
    try {
      // 1. Session check
      const authRes = await fetch('/api/auth/me')
      const authData = await authRes.json()
      if (!authData.user || !['SUPERADMIN', 'ADMIN', 'PROKTOR'].includes(authData.user.role)) {
        router.push('/login')
        return
      }
      setCurrentUser(authData.user)
      if (authData.user.role === 'PROKTOR' && activeTab === 'dashboard') {
        setActiveTab('modul_soal')
      }

      // 2. Admin & Master Data
      const adminRes = await fetch('/api/admin')
      const adminJson = await adminRes.json()
      if (adminJson.success && adminJson.data) {
        setDashboardData(adminJson.data.dashboard)
        setModulList(adminJson.data.modulList || adminJson.data.modul || [])
        setBankSoalList(adminJson.data.bankSoal || [])
        setMapelList(adminJson.data.mapel || [])
        setKelasList(adminJson.data.kelas || [])
        setSiswaList(adminJson.data.siswa?.siswaList || [])
        setUjianList(adminJson.data.jadwal?.ujianList || [])
      }

      // 3. Proktor Live Data
      const proktorRes = await fetch('/api/proktor')
      const proktorJson = await proktorRes.json()
      if (proktorJson.success) {
        setProktorData(proktorJson.data)
      }

      // 4. Settings Data
      const settRes = await fetch('/api/pengaturan')
      const settJson = await settRes.json()
      if (settJson.success && settJson.data) {
        setSettingsForm({
          schoolName: settJson.data.schoolName || 'SMA Muhammadiyah 1 Ponorogo',
          appTitle: settJson.data.appTitle || 'CBT MUHIPO',
          academicYear: settJson.data.academicYear || '2026/2027',
          semester: settJson.data.semester || 'Ganjil',
          timezone: settJson.data.timezone || 'Asia/Jakarta',
          serverLocation: settJson.data.serverLocation || 'Ponorogo, Jawa Timur',
          logoUrl: settJson.data.logoUrl || '/pic_logo.png',
          backgroundUrl: settJson.data.backgroundUrl || '/muhipo-front.jpg',
          timeSyncOffsetMs: settJson.data.timeSyncOffsetMs ?? 0,
        })
      }
    } catch (err) {
      console.error('Error fetching admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()

    // Polling Proktor Live every 5 seconds if on proktor tab
    const timer = setInterval(() => {
      if (activeTab === 'proktor_live' || activeTab === 'dashboard') {
        fetch('/api/proktor')
          .then((r) => r.json())
          .then((j) => {
            if (j.success) setProktorData(j.data)
          })
          .catch(() => {})
      }
    }, 5000)

    return () => clearInterval(timer)
  }, [activeTab])

  // Logout Handler
  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'POST' })
    router.push('/login')
  }

  // Save Settings Handler
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
        showNotification('Pengaturan Disimpan', 'Pengaturan sistem CBT mandiri berhasil disimpan!', 'success')
        fetchAllData()
      } else {
        showNotification('Gagal Simpan', json.message || 'Gagal menyimpan pengaturan.', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Terjadi kesalahan saat menyimpan pengaturan.', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  // Reset Login Handler (Proktor)
  const handleResetLogin = async (pesertaUjianId: string, namaSiswa: string) => {
    showConfirm(
      'Reset Login Ujian',
      `Yakin ingin mereset login ${namaSiswa}? Siswa dapat login kembali untuk melanjutkan ujian.`,
      async () => {
        try {
          const res = await fetch('/api/proktor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'RESET_LOGIN', pesertaUjianId }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Login siswa berhasil direset!', 'success')
            fetchAllData()
          } else {
            showNotification('Gagal', json.message || 'Gagal mereset login', 'error')
          }
        } catch (e) {
          showNotification('Error', 'Terjadi kesalahan saat mereset login', 'error')
        }
      }
    )
  }

  // Buka Modal Tambah Waktu Ujian
  const handleOpenAddExtraTime = (pesertaUjianId: string, namaSiswa: string) => {
    setExtraTimeModal({ pesertaUjianId, namaSiswa })
    setExtraMinutes(15)
  }

  // Eksekusi Tambah Waktu Ujian dari Modal
  const handleExecuteAddExtraTime = async () => {
    if (!extraTimeModal) return
    try {
      const res = await fetch('/api/proktor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_EXTRA_TIME',
          pesertaUjianId: extraTimeModal.pesertaUjianId,
          extraMinutes,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Berhasil', json.message || `Berhasil menambah ${extraMinutes} menit!`, 'success')
        setExtraTimeModal(null)
        fetchAllData()
      } else {
        showNotification('Gagal', json.message || 'Gagal tambah waktu', 'error')
      }
    } catch (e) {
      showNotification('Error', 'Gagal tambah waktu', 'error')
    }
  }

  // Reset Pelanggaran Siswa Individual
  const handleResetPelanggaran = async (pesertaUjianId: string, namaSiswa: string) => {
    showConfirm(
      'Reset Pelanggaran Siswa',
      `Yakin ingin mereset seluruh catatan pelanggaran untuk ${namaSiswa}? Log pelanggaran akan dibersihkan, total pelanggaran kembali ke 0, dan ujian yang terkunci akan otomatis dibuka kembali.`,
      async () => {
        try {
          const res = await fetch('/api/proktor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'RESET_PELANGGARAN',
              pesertaUjianId,
            }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Pelanggaran siswa berhasil direset ke 0!', 'success')
            fetchAllData()
          } else {
            showNotification('Gagal', json.message || 'Gagal mereset pelanggaran', 'error')
          }
        } catch (e) {
          showNotification('Error', 'Terjadi kesalahan saat mereset pelanggaran', 'error')
        }
      },
      'warning',
      'Ya, Reset Pelanggaran'
    )
  }

  // Reset Pelanggaran Semua Siswa pada Sesi Ujian Aktif
  const handleResetAllPelanggaran = async (ujianId: string) => {
    if (!ujianId) {
      showNotification('Peringatan', 'Silakan pilih jadwal ujian terlebih dahulu.', 'warning')
      return
    }
    showConfirm(
      'Reset Semua Pelanggaran',
      'Yakin ingin mereset catatan pelanggaran untuk SEMUA peserta di sesi ujian ini? Semua peserta yang terkunci karena pelanggaran akan dibuka kembali.',
      async () => {
        try {
          const res = await fetch('/api/proktor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'RESET_ALL_PELANGGARAN',
              ujianId,
            }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', json.message || 'Seluruh pelanggaran berhasil direset!', 'success')
            fetchAllData()
          } else {
            showNotification('Gagal', json.message || 'Gagal mereset semua pelanggaran', 'error')
          }
        } catch (e) {
          showNotification('Error', 'Terjadi kesalahan saat mereset semua pelanggaran', 'error')
        }
      },
      'warning',
      'Ya, Reset Semua'
    )
  }

  // Navigation Items (Disesuaikan dengan Role: Administrator Full Akses, Proktor Input Soal, Kelola Tes & Pengawasan)
  const sidebarNavItems: NavTabItem[] = useMemo(() => {
    if (currentUser?.role === 'PROKTOR') {
      return [
        {
          id: 'data_modul',
          name: 'Data Modul (Soal)',
          icon: BookOpen,
          subItems: [
            { id: 'modul_topik', name: 'Topik' },
            { id: 'modul_daftar', name: 'Daftar Soal' },
            { id: 'modul_soal', name: 'Input Soal' },
            { id: 'modul_import', name: 'Import Soal Excel' },
            { id: 'modul_filemanager', name: 'File Manager' },
          ],
        },
        {
          id: 'data_tes',
          name: 'Data Tes (Ujian)',
          icon: Database,
          subItems: [
            { id: 'tes_tambah', name: 'Tambah Tes' },
            { id: 'tes_daftar', name: 'Daftar Tes' },
            { id: 'tes_evaluasi', name: 'Evaluasi Tes' },
            { id: 'tes_hasil', name: 'Hasil Tes' },
            { id: 'tes_rekap', name: 'Rekap Hasil Tes' },
          ],
        },
        {
          id: 'proktor_live',
          name: 'Pengawasan Live',
          icon: Radio,
        },
      ]
    }

    return [
      {
        id: 'dashboard',
        name: 'Dashboard',
        icon: LayoutDashboard,
      },
      {
        id: 'data_modul',
        name: 'Data Modul',
        icon: BookOpen,
        subItems: [
          { id: 'modul_topik', name: 'Topik' },
          { id: 'modul_daftar', name: 'Daftar Soal' },
          { id: 'modul_soal', name: 'Input Soal' },
          { id: 'modul_import', name: 'Import Soal Excel' },
          { id: 'modul_filemanager', name: 'File Manager' },
        ],
      },
      {
        id: 'data_peserta',
        name: 'Data Peserta',
        icon: Users,
        subItems: [
          { id: 'peserta_group', name: 'Daftar Group' },
          { id: 'peserta_daftar', name: 'Daftar Peserta' },
          { id: 'peserta_import', name: 'Import Data Peserta' },
        ],
      },
      {
        id: 'data_tes',
        name: 'Data Tes',
        icon: Database,
        subItems: [
          { id: 'tes_tambah', name: 'Tambah Tes' },
          { id: 'tes_daftar', name: 'Daftar Tes' },
          { id: 'tes_evaluasi', name: 'Evaluasi Tes' },
          { id: 'tes_hasil', name: 'Hasil Tes' },
          { id: 'tes_rekap', name: 'Rekap Hasil Tes' },
        ],
      },
      {
        id: 'proktor_live',
        name: 'Pengawasan Live',
        icon: Radio,
      },
      {
        id: 'cetak',
        name: 'Cetak Dokumen',
        icon: Printer,
      },
      {
        id: 'pengguna_akses',
        name: 'Hak Akses Pengguna',
        icon: Crown,
      },
      {
        id: 'pengaturan',
        name: 'Pengaturan',
        icon: Settings,
      },
      {
        id: 'backup_data',
        name: 'Backup & Pemeliharaan',
        icon: Database,
      },
    ]
  }, [currentUser])

  // Find active tab title
  const getTabTitle = (tabId: string) => {
    for (const item of sidebarNavItems) {
      if (item.id === tabId) return item.name
      if (item.subItems) {
        const sub = item.subItems.find((s) => s.id === tabId)
        if (sub) return `${item.name} > ${sub.name}`
      }
    }
    return 'Dashboard'
  }

  const activeBg = settingsForm.backgroundUrl || '/muhipo-front.jpg'

  return (
    <div className="min-h-screen relative flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-300 overflow-x-hidden print:overflow-visible print:bg-white print:text-black">
      {/* Background Wallpaper */}
      <div className="print:hidden fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
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

      {/* Glassmorphism Backdrop Overlay */}
      <div className="print:hidden fixed inset-0 bg-slate-100/85 dark:bg-slate-950/85 backdrop-blur-[2px] -z-20 pointer-events-none transition-colors duration-300" />

      {/* Sidebar Navigation */}
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={sidebarNavItems}
        activeId={activeTab}
        onSelect={(id) => {
          setActiveTab(id)
          setSidebarOpen(false)
        }}
      />

      {/* Main Layout Area */}
      <div className="flex-1 lg:ml-72 print:ml-0 print:m-0 print:p-0 flex flex-col justify-between min-w-0 transition-all duration-300 relative z-10">
        {/* Navbar */}
        <AppNavbar
          appTitle={settingsForm.appTitle && settingsForm.appTitle !== 'CBT' && settingsForm.appTitle !== 'CBT MUHIPO' ? settingsForm.appTitle : 'CBT SMA MUHIPO'}
          subtitle="Manajemen Ujian SMA Muhammadiyah 1 Ponorogo"
          logoUrl={settingsForm.logoUrl}
          onToggleSidebar={() => setSidebarOpen(true)}
          userProfile={{
            name: currentUser?.name || 'Super Administrator',
            role: currentUser?.role || 'SUPER ADMIN',
            username: currentUser?.username,
          }}
          actions={
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-700 dark:text-blue-200 font-bold text-xs shrink-0 backdrop-blur-md">
              <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300 shrink-0" />
              <span>TA: {settingsForm.academicYear} ({settingsForm.semester})</span>
            </div>
          }
          onLogout={handleLogout}
        />

        {/* Page Content */}
        <main className="p-3.5 sm:p-6 lg:p-8 print:p-0 print:m-0 print:max-w-none space-y-6 max-w-7xl w-full mx-auto flex-1">
          {/* Header Title Bar */}
          <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/75 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-xl">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                CBT SMA Muhipo
              </span>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white capitalize">
                {getTabTitle(activeTab)}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl font-medium backdrop-blur-sm">
                T.A {settingsForm.academicYear} • Semester {settingsForm.semester}
              </span>
            </div>
          </div>

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <DashboardOverview
              currentUser={currentUser}
              dashboardData={dashboardData}
              settings={settingsForm}
              onNavigate={(tab) => setActiveTab(tab)}
              onRefresh={fetchAllData}
            />
          )}

          {/* TAB 2: DATA MODUL */}
          {activeTab === 'modul_topik' && (
            <ModulTopikView
              mapelList={mapelList}
              modulList={modulList}
              onRefresh={fetchAllData}
              onNavigateToDaftarSoal={(id) => {
                if (id) setSelectedMapelId(id)
                setActiveTab('modul_daftar')
              }}
              onNavigateToEditor={(id) => {
                if (id) setSelectedMapelId(id)
                setActiveTab('modul_soal')
              }}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'modul_soal' && (
            <ModulSoalView
              mapelList={mapelList}
              bankSoalList={bankSoalList}
              modulList={modulList}
              selectedMapelId={selectedMapelId}
              onSelectMapel={(id) => setSelectedMapelId(id)}
              onNavigateToTopik={() => setActiveTab('modul_topik')}
              onNavigateToDaftarSoal={(id) => {
                if (id) setSelectedMapelId(id)
                setActiveTab('modul_daftar')
              }}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'modul_import' && (
            <ModulImportView
              bankSoalList={bankSoalList}
              mapelList={mapelList}
              onRefresh={fetchAllData}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'modul_daftar' && (
            <ModulDaftarView
              mapelList={mapelList}
              bankSoalList={mapelList}
              modulList={modulList}
              selectedMapelId={selectedMapelId}
              onSelectMapel={(id) => setSelectedMapelId(id)}
              onNavigateToTopik={() => setActiveTab('modul_topik')}
              onNavigateToEditor={(id) => {
                if (id) setSelectedMapelId(id)
                setActiveTab('modul_soal')
              }}
              onNavigateToImport={() => setActiveTab('modul_import')}
              onRefresh={fetchAllData}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'modul_filemanager' && (
            <ModulFileManagerView
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {/* TAB 3: DATA PESERTA */}
          {activeTab === 'peserta_group' && (
            <PesertaGroupView
              kelasList={kelasList}
              onRefresh={fetchAllData}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'peserta_daftar' && (
            <PesertaDaftarView
              siswaList={siswaList}
              kelasList={kelasList}
              onRefresh={fetchAllData}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'peserta_import' && (
            <PesertaImportView
              onRefresh={fetchAllData}
              showNotification={showNotification}
            />
          )}

          {/* TAB 4: DATA TES */}
          {activeTab === 'tes_tambah' && (
            <TesTambahView
              mapelList={mapelList}
              bankSoalList={bankSoalList}
              kelasList={kelasList}
              onSuccess={() => {
                setActiveTab('tes_daftar')
                fetchAllData()
              }}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'tes_daftar' && (
            <TesDaftarView
              jadwalList={ujianList}
              mapelList={mapelList}
              bankSoalList={bankSoalList}
              kelasList={kelasList}
              onNavigateToTambah={() => setActiveTab('tes_tambah')}
              onRefresh={fetchAllData}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'tes_evaluasi' && (
            <TesEvaluasiView
              ujianList={ujianList}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'tes_hasil' && (
            <TesHasilView
              ujianList={ujianList}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'tes_rekap' && (
            <TesRekapView
              ujianList={ujianList}
              showNotification={showNotification}
            />
          )}

          {/* TAB 5: PENGATURAN & EXTRAS */}
          {activeTab === 'proktor_live' && (
            <ProktorLiveView
              proktorData={proktorData}
              onResetLogin={handleResetLogin}
              onAddExtraTime={handleOpenAddExtraTime}
              onResetPelanggaran={handleResetPelanggaran}
              onResetAllPelanggaran={handleResetAllPelanggaran}
              onRefresh={fetchAllData}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'cetak' && (
            <CetakDokumenView
              kelasList={kelasList}
              jadwalList={ujianList}
              siswaList={siswaList}
              modulList={modulList}
              settings={settingsForm}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'pengaturan' && (
            <PengaturanView
              settingsForm={settingsForm}
              setSettingsForm={setSettingsForm}
              onSaveSettings={handleSaveSettings}
              savingSettings={savingSettings}
              onNavigateToBackup={() => setActiveTab('backup_data')}
              onRefresh={fetchAllData}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'pengguna_akses' && (
            <PenggunaAksesView
              currentUser={currentUser}
              kelasList={kelasList}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'backup_data' && (
            <BackupDataView
              stats={dashboardData?.stats}
              onRefresh={fetchAllData}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}
        </main>

        <AppFooter />
      </div>

      {/* Modal Tambah Waktu Ujian */}
      {extraTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Tambah Waktu Ujian</h3>
                <p className="text-xs text-slate-500">{extraTimeModal.namaSiswa}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Durasi Tambahan (Menit)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={extraMinutes}
                onChange={(e) => setExtraMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExtraTimeModal(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteAddExtraTime}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Tambahkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Notification Modal */}
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
