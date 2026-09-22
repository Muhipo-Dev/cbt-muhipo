'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { AppSidebar, NavTabItem } from '@/components/layout/AppSidebar';
import { AppFooter } from '@/components/layout/AppFooter';
import { MathRenderer } from '@/components/MathRenderer';
import { convertEquationToKatex } from '@/lib/katexConverter';
import {
  LayoutDashboard,
  BookOpen,
  FileSpreadsheet,
  Plus,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  Send,
  Edit,
  Edit3,
  Trash2,
  Save,
  CalendarDays,
  Sparkles,
  Layers,
  ArrowLeft,
  ChevronLeft,
  Image as ImageIcon,
  Video,
  Music,
  Radio,
  RefreshCw,
  ShieldAlert,
  Monitor,
  Users,
  Eye,
  RotateCcw,
  Lock,
  Unlock,
  GraduationCap,
  HelpCircle,
  Check,
  Compass,
  ArrowRight,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { DAFTAR_JURUSAN_MUHIPO, DAFTAR_TIPE_UJIAN, getRecommendedKelasList, getRomawiTingkat } from '@/lib/constants';
import { NotificationModal, NotificationType } from '@/components/NotificationModal';

const formatLocalDatetime = (date: Date = new Date()) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function GuruDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Settings State (Logo & Wallpaper)
  const [settingsForm, setSettingsForm] = useState({
    schoolName: 'SMA Muhammadiyah 1 Ponorogo',
    appTitle: 'CBT',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    logoUrl: '/pic_logo.png',
    backgroundUrl: '/muhipo-log.jpg',
  });

  // Bank Soal State
  const [bankSoalList, setBankSoalList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [selectedBankSoal, setSelectedBankSoal] = useState<any>(null);

  // Modal Create Bank Soal
  const [showCreateBankModal, setShowCreateBankModal] = useState(false);
  const [newBankForm, setNewBankForm] = useState({
    kodeBank: '',
    nama: '',
    tingkat: 10,
    jurusan: 'SAINS',
    mataPelajaranId: '',
    jamMulai: '07:30',
    durasiMenit: 90,
    kkm: 75,
    nilaiMinimal: 0,
    nilaiMaksimal: 100,
  });

  // Soal Form State
  const [soalForm, setSoalForm] = useState<any>({
    soalId: '',
    tipeSoal: 'PG',
    pertanyaan: '',
    bobot: 2.0,
    kunciJawabanTeks: '',
    matchingPairs: [
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
    ],
    opsiJawaban: [
      { label: 'A', konten: '', isBenar: true },
      { label: 'B', konten: '', isBenar: false },
      { label: 'C', konten: '', isBenar: false },
      { label: 'D', konten: '', isBenar: false },
      { label: 'E', konten: '', isBenar: false },
    ],
  });

  // Modals & Tools Tambahan Guru
  const [editBankModal, setEditBankModal] = useState<any>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingBankId, setImportingBankId] = useState('');
  const [importDurasiMenit, setImportDurasiMenit] = useState<number>(90);
  const [importFileText, setImportFileText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [distributeModal, setDistributeModal] = useState<any>(null);
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
    tampilkanHasil: false,
  });

  // Monitoring Pengerjaan Peserta / Pengawas Live State (Auto-Refresh 3 Detik)
  const [proktorData, setProktorData] = useState<any>(null);
  const [selectedProktorUjianId, setSelectedProktorUjianId] = useState('');
  const [selectedProktorKelas, setSelectedProktorKelas] = useState('ALL');
  const [proktorFilterHari, setProktorFilterHari] = useState<'HARI_INI' | 'SEMUA'>('HARI_INI');
  const [extraTimeModal, setExtraTimeModal] = useState<any>(null);
  const [extraMinutes, setExtraMinutes] = useState(15);
  const [violationScreenModal, setViolationScreenModal] = useState<any>(null);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [lastLiveUpdated, setLastLiveUpdated] = useState<Date>(new Date());

  // Koreksi Essay State
  const [koreksiUjianList, setKoreksiUjianList] = useState<any[]>([]);
  const [selectedKoreksiUjianId, setSelectedKoreksiUjianId] = useState('');
  const [selectedKoreksiKelas, setSelectedKoreksiKelas] = useState('ALL');
  const [koreksiSubTab, setKoreksiSubTab] = useState<'rekap' | 'koreksi_esai'>('rekap');
  const [koreksiData, setKoreksiData] = useState<any>(null);

  // Panduan Guru Interaktif Modal State
  const [showGuideModal, setShowGuideModal] = useState(false);

  // In-App Notification / Dialog Modal State
  const [notifModal, setNotifModal] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

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
        setNotifModal((prev) => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setNotifModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

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
        setNotifModal((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => {
        setNotifModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const sidebarNavItems: NavTabItem[] = [
    { id: 'dashboard', name: 'Dashboard Guru', icon: LayoutDashboard },
    { id: 'proktor_live', name: 'Status & Pengawas Ujian', icon: Radio },
    { id: 'bank_soal', name: 'Bank Soal & KaTeX', icon: BookOpen },
    { id: 'koreksi_nilai', name: 'Koreksi & Rekap Nilai', icon: FileSpreadsheet },
  ];

  useEffect(() => {
    fetchInitialData();
  }, [selectedKoreksiUjianId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // 1. Session User
      const meRes = await fetch('/api/auth/me');
      const meJson = await meRes.json();
      if (meJson.success) {
        setCurrentUser(meJson.user);
      }

      // 2. Pengaturan Sistem (Logo & Background)
      try {
        const pRes = await fetch('/api/pengaturan');
        const pJson = await pRes.json();
        if (pJson.success && pJson.data) {
          setSettingsForm({
            schoolName: pJson.data.schoolName || 'SMA Muhammadiyah 1 Ponorogo',
            appTitle: pJson.data.appTitle || 'CBT MUHIPO',
            academicYear: pJson.data.academicYear || '2026/2027',
            semester: pJson.data.semester || 'Ganjil',
            logoUrl: pJson.data.logoUrl || '/pic_logo.png',
            backgroundUrl: pJson.data.backgroundUrl || '/muhipo-log.jpg',
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }

      // 3. Bank Soal & Mapel Guru
      const soalRes = await fetch('/api/guru/soal');
      const soalJson = await soalRes.json();
      if (soalJson.success) {
        setBankSoalList(soalJson.data.bankSoalList || []);
        setMapelList(soalJson.data.mapelList || []);
        if (soalJson.data.kelasList) {
          setKelasList(soalJson.data.kelasList);
        }
        if (soalJson.data.mapelList?.length > 0) {
          setNewBankForm((prev) => ({ ...prev, mataPelajaranId: soalJson.data.mapelList[0].id }));
        }
      }

      // 4. Koreksi & Rekap Nilai Ujian Guru
      const urlKoreksi = selectedKoreksiUjianId
        ? `/api/guru/koreksi?ujianId=${selectedKoreksiUjianId}`
        : '/api/guru/koreksi';
      const korRes = await fetch(urlKoreksi);
      const korJson = await korRes.json();
      if (korJson.success) {
        setKoreksiUjianList(korJson.data.ujianList || []);
        setKoreksiData(korJson.data);
        if (!selectedKoreksiUjianId && korJson.data.activeUjian?.id) {
          setSelectedKoreksiUjianId(korJson.data.activeUjian.id);
        }
      }
    } catch (e) {
      console.error('Error fetching guru dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankSoalData = async () => {
    try {
      const res = await fetch('/api/guru/soal');
      const json = await res.json();
      if (json.success) {
        setBankSoalList(json.data.bankSoalList || []);
        setMapelList(json.data.mapelList || []);
        if (json.data.kelasList) {
          setKelasList(json.data.kelasList);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchKoreksiData = async (ujianId?: string) => {
    try {
      const url = ujianId ? `/api/guru/koreksi?ujianId=${ujianId}` : '/api/guru/koreksi';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setKoreksiUjianList(json.data.ujianList || []);
        setKoreksiData(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectBankSoal = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/guru/soal?bankSoalId=${id}`);
      const json = await res.json();
      if (json.success) {
        setSelectedBankSoal(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBankSoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalKodeBank = newBankForm.kodeBank || `BS-${Date.now().toString().slice(-6)}`;
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_BANK_SOAL',
          ...newBankForm,
          kodeBank: finalKodeBank,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification('Bank Soal Dibuat', 'Bank Soal berhasil dibuat!', 'success');
        setShowCreateBankModal(false);
        fetchBankSoalData();
      } else {
        showNotification('Gagal', json.message || 'Gagal membuat bank soal', 'error');
      }
    } catch (e) {
      showNotification('Error', 'Gagal membuat bank soal', 'error');
    }
  };

  const handleUpdateBankSoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBankModal) return;
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
          durasiMenit: editBankModal.durasiMenit,
          kkm: editBankModal.kkm,
          nilaiMinimal: editBankModal.nilaiMinimal,
          nilaiMaksimal: editBankModal.nilaiMaksimal,
          mataPelajaranId: editBankModal.mataPelajaranId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification('Bank Soal Diperbarui', 'Bank Soal berhasil diperbarui!', 'success');
        setEditBankModal(null);
        fetchBankSoalData();
        if (selectedBankSoal?.id === editBankModal.id) {
          handleSelectBankSoal(editBankModal.id);
        }
      } else {
        showNotification('Gagal', json.message || 'Gagal update bank soal', 'error');
      }
    } catch (e) {
      showNotification('Error', 'Gagal update bank soal', 'error');
    }
  };

  const handleArchiveBankSoal = async (bankSoalId: string, nama: string, isCurrentlyArchived?: boolean) => {
    const action = isCurrentlyArchived ? 'UNARCHIVE_BANK_SOAL' : 'ARCHIVE_BANK_SOAL';
    const title = isCurrentlyArchived ? 'Aktifkan Kembali Bank Soal' : 'Arsipkan Bank Soal';
    const message = isCurrentlyArchived
      ? `Aktifkan kembali bank soal "${nama}"?`
      : `Arsipkan bank soal "${nama}"? Bank soal yang diarsipkan tidak akan muncul saat membuat tes baru, namun seluruh butir soal tetap aman dan tidak hilang.`;

    showConfirm(
      title,
      message,
      async () => {
        try {
          const res = await fetch('/api/guru/soal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, bankSoalId }),
          });
          const json = await res.json();
          if (json.success) {
            showNotification('Berhasil', json.message || 'Status bank soal diperbarui', 'success');
            fetchBankSoalData();
          } else {
            showNotification('Gagal', json.message || 'Gagal mengubah status bank soal', 'error');
          }
        } catch (e) {
          showNotification('Error', 'Gagal memproses arsip bank soal', 'error');
        }
      },
      'info',
      isCurrentlyArchived ? 'Ya, Aktifkan' : 'Ya, Arsipkan'
    );
  };

  const handleDownloadTemplateSoal = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('Format_Import_Soal', {
        views: [{ showGridLines: true }]
      });

      // Definisikan Lebar Kolom (5 Kolom Tanpa Kesulitan)
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

      // Data Baris Soal & Jawaban beserta Styling Warna (Format Menurun)
      const rowsData = [
        // No 1: PG (Contoh Matematika / Formula KaTeX)
        { row: [1, 'Soal Pilihan Ganda (Matematika)', 'Q', 'Tentukan himpunan penyelesaian dari persamaan kuadrat x² - 5x + 6 = 0 !', ''], bg: 'FFE0E7FF', isBold: true },
        { row: ['', 'Jawaban Benar', 'A', '$x = 2$ atau $x = 3$', 1], bg: 'FFDCFCE7', isBold: false }, // Hijau muda (benar)
        { row: ['', '', 'A', '$x = -2$ atau $x = -3$', 0], bg: 'FFFFFFFF', isBold: false },
        { row: ['', '', 'A', '$x = 1$ atau $x = 6$', 0], bg: 'FFFFFFFF', isBold: false },
        { row: ['', '', 'A', '$x = -1$ atau $x = -6$', 0], bg: 'FFFFFFFF', isBold: false },
        // No 2: Esai (Fisika / KaTeX)
        { row: [2, 'Soal Esai (Fisika/Rumus)', 'Q2', 'Tuliskan rumus energi kinetik $E_k = \\frac{1}{2} m v^2$ dan jelaskan setiap variabelnya!', ''], bg: 'FFE0F2FE', isBold: true }, // Sky Blue
        // No 3: Jawaban Singkat (Kimia / KaTeX)
        { row: [3, 'Jawaban Singkat (Kimia)', 'Q3', 'Tuliskan rumus kimia untuk asam sulfat (H₂SO₄)!', 'H2SO4'], bg: 'FFFEF3C7', isBold: true }, // Amber / Kuning
        // No 4: PG Kompleks
        { row: [4, 'Soal PG Kompleks', 'Q4', 'Manakah pernyataan yang benar mengenai segitiga siku-siku dengan sisi a, b, dan c (hipotenusa)?', ''], bg: 'FFFCE7F3', isBold: true }, // Pink
        { row: ['', 'Jawaban Benar', 'A', '$a^2 + b^2 = c^2$', 1], bg: 'FFDCFCE7', isBold: false },
        { row: ['', '', 'A', '$a + b > c$', 1], bg: 'FFDCFCE7', isBold: false },
        { row: ['', '', 'A', '$c = \\sqrt{a^2 - b^2}$', 0], bg: 'FFFFFFFF', isBold: false },
        // No 5: Benar/Salah
        { row: [5, 'Soal Benar/Salah', 'Q5', 'Nilai dari $\\sqrt{144} + 2^3 = 20$', ''], bg: 'FFFFE4E6', isBold: true }, // Rose muda
        { row: ['', 'Pernyataan BENAR', 'A', 'Benar', 1], bg: 'FFDCFCE7', isBold: false },
        // No 6: Menjodohkan
        { row: [6, 'Soal Menjodohkan', 'Q6', 'Pasangkan operasi matematika berikut dengan hasil yang tepat!', ''], bg: 'FFF3E8FF', isBold: true }, // Purple muda
        { row: ['', 'Premis -> Respons', 'A', '$\\sqrt{64} \\times 2$', '16'], bg: 'FFFFFFFF', isBold: false },
        { row: ['', 'Premis -> Respons', 'A', '$\\frac{3}{4} + \\frac{1}{4}$', '1'], bg: 'FFFFFFFF', isBold: false },
        { row: ['', 'Premis -> Respons', 'A', '$2^4$', '16'], bg: 'FFFFFFFF', isBold: false },
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
      anchor.download = 'Template_Import_Soal_Guru_MUHIPO.xlsx';
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download template error:', err);
      showNotification('Error', 'Gagal membuat file template Excel', 'error');
    }
  };

  const handleFileUploadSoal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];

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
            const rawContent = convertEquationToKatex(String(row['Isi Soal / Jawaban'] || row['Isi Soal'] || row['Pertanyaan / Soal'] || row['Soal'] || row['Konten'] || '').trim());
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
              };

              // Jika ada kunci/rubrik langsung di baris Q
              if (rawStatus && String(rawStatus).trim()) {
                currentSoal.kunciJawabanTeks = convertEquationToKatex(String(rawStatus).trim());
              }
            } else if (rawTipe === 'A' && currentSoal) {
              // Deteksi baris Jawaban / Opsi untuk soal yang sedang aktif
              if (currentSoal.tipeSoal === 'MENJODOHKAN') {
                const left = rawContent;
                const right = convertEquationToKatex(String(rawStatus || '').trim());
                if (left && right) {
                  currentSoal.rawMatchingPairs.push({ left, right });
                }
              } else if (currentSoal.tipeSoal === 'BENAR_SALAH') {
                // Untuk Benar/Salah jika baris A tertulis 'Benar' dan status '1' -> kuncinya Benar
                const isBenar = String(rawStatus).trim() === '1' || String(rawStatus).toLowerCase() === 'benar' || String(rawStatus).toLowerCase() === 'true';
                const label = letters[currentSoal.opsi.length] || `Opsi ${currentSoal.opsi.length + 1}`;
                if (rawContent) {
                  currentSoal.opsi.push({
                    label,
                    konten: rawContent,
                    isBenar,
                  });
                }
              } else if (currentSoal.tipeSoal === 'ISIAN' || currentSoal.tipeSoal === 'ESAI') {
                // Jika isian/esai menuliskan kunci di baris A
                if (rawContent && !currentSoal.kunciJawabanTeks) {
                  currentSoal.kunciJawabanTeks = rawContent;
                }
              } else {
                // PG & PG_KOMPLEKS
                const isBenar = String(rawStatus).trim() === '1' || String(rawStatus).toLowerCase() === 'true';
                const label = letters[currentSoal.opsi.length] || `Opsi ${currentSoal.opsi.length + 1}`;
                if (rawContent) {
                  currentSoal.opsi.push({
                    label,
                    konten: rawContent,
                    isBenar,
                  });
                }
              }
            }
          }

          // Masukkan soal terakhir
          if (currentSoal && currentSoal.pertanyaan) {
            parsedItems.push(currentSoal);
          }

          // Post-processing untuk setiap soal
          for (const item of parsedItems) {
            if (item.tipeSoal === 'MENJODOHKAN' && item.rawMatchingPairs && item.rawMatchingPairs.length > 0) {
              item.matchingData = JSON.stringify(item.rawMatchingPairs);
            }
            delete item.rawMatchingPairs;
          }
        } else {
          // ================= KOMPATIBILITAS FORMAT HORIZONTAL LAMA =================
          for (const row of rawRows) {
            const tipe = (row['Tipe Soal'] || 'PG').toUpperCase();
            const pertanyaan = convertEquationToKatex(String(row['Pertanyaan / Soal'] || row['Pertanyaan'] || row['Soal'] || '').trim());
            const bobot = Number(row['Bobot'] || row['Kesulitan']) || 2.0;
            const kunci = String(row['Kunci Jawaban (A/B/C/D/E)'] || row['Kunci'] || '').trim().toUpperCase();
            const kunciTeks = convertEquationToKatex(String(row['Kunci Teks/Rubrik Essay'] || row['Kunci Essay'] || '').trim());

            let matchingData: string | undefined = undefined;
            if (tipe === 'MENJODOHKAN') {
              const pairs: { left: string; right: string }[] = [];
              ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((lbl) => {
                const val = String(row[`Pilihan ${lbl}`] || row[`Opsi ${lbl}`] || row[lbl] || '').trim();
                if (val && val.includes('=')) {
                  const [left, ...rest] = val.split('=');
                  const right = rest.join('=').trim();
                  if (left.trim() && right) {
                    pairs.push({
                      left: convertEquationToKatex(left.trim()),
                      right: convertEquationToKatex(right),
                    });
                  }
                }
              });
              if (pairs.length > 0) {
                matchingData = JSON.stringify(pairs);
              }
            }

            const opsi = ['A', 'B', 'C', 'D', 'E']
              .map((lbl) => {
                const konten = row[`Pilihan ${lbl}`] || row[`Opsi ${lbl}`] || row[lbl] || '';
                return {
                  label: lbl,
                  konten: convertEquationToKatex(String(konten || '').trim()),
                  isBenar: kunci.includes(lbl),
                };
              })
              .filter((o) => o.konten !== '');

            if (pertanyaan.trim() !== '') {
              parsedItems.push({
                tipeSoal: tipe,
                pertanyaan,
                bobot,
                opsi,
                matchingData,
                kunciJawabanTeks: kunciTeks || undefined,
              });
            }
          }
        }

        if (parsedItems.length === 0) {
          showNotification('Peringatan Data', 'Tidak ditemukan butir soal yang valid dalam file Excel.', 'warning');
          return;
        }

        setImportFileText(JSON.stringify(parsedItems));
        showNotification('File Terbaca', `Berhasil membaca ${parsedItems.length} butir soal dari file Excel. Klik "Proses Import Soal".`, 'success');
      } catch (err) {
        console.error('File parse error:', err);
        showNotification('Gagal Membaca File', 'Gagal membaca file Excel. Pastikan menggunakan format template resmi.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteImportSoal = async () => {
    if (!importingBankId) {
      showNotification('Peringatan', 'Pilih Bank Soal tujuan import.', 'warning');
      return;
    }
    if (!importFileText) {
      showNotification('Peringatan', 'Silakan pilih file Excel terlebih dahulu.', 'warning');
      return;
    }

    try {
      setImportLoading(true);
      const soalItems = JSON.parse(importFileText);
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'IMPORT_SOAL',
          bankSoalId: importingBankId,
          durasiMenit: importDurasiMenit,
          soalItems,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification('Import Berhasil', json.message, 'success');
        setShowImportModal(false);
        setImportFileText('');
        handleSelectBankSoal(importingBankId);
        fetchBankSoalData();
      } else {
        showNotification('Gagal Import', json.message || 'Gagal import butir soal', 'error');
      }
    } catch (e) {
      showNotification('Error', 'Terjadi kesalahan saat mengimport soal.', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const handleExecuteKirimKeKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributeModal) return;
    if (!distributeForm.kelasIds.length) {
      showNotification('Peringatan', 'Pilih minimal 1 kelas tujuan.', 'warning');
      return;
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
      });
      const json = await res.json();
      if (json.success) {
        showNotification('Distribusi Sukses', json.message, 'success');
        setDistributeModal(null);
        fetchKoreksiData();
      } else {
        showNotification('Gagal', json.message || 'Gagal mendistribusikan ujian ke kelas', 'error');
      }
    } catch (e) {
      showNotification('Error', 'Gagal mendistribusikan ujian ke kelas', 'error');
    }
  };

  const handleSaveSoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankSoal) return;

    try {
      let finalMatchingData: string | undefined = undefined;
      if (soalForm.tipeSoal === 'MENJODOHKAN') {
        const validPairs = (soalForm.matchingPairs || []).filter(
          (p: any) => p.left && p.left.trim() && p.right && p.right.trim()
        );
        if (validPairs.length < 2) {
          showNotification('Peringatan Soal', 'Soal mencocokkan memerlukan minimal 2 pasangan kotak (disarankan 4-7 kotak).', 'warning');
          return;
        }
        finalMatchingData = JSON.stringify(validPairs);
      }

      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SOAL',
          bankSoalId: selectedBankSoal.id,
          ...soalForm,
          matchingData: finalMatchingData,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification('Soal Disimpan', 'Soal berhasil disimpan!', 'success');
        handleSelectBankSoal(selectedBankSoal.id);
        fetchBankSoalData();
        // Reset form
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
        });
      } else {
        showNotification('Gagal Simpan', json.message || 'Gagal menyimpan soal', 'error');
      }
    } catch (e) {
      showNotification('Error', 'Gagal menyimpan soal', 'error');
    }
  };

  const handleDeleteSoal = async (soalId: string) => {
    showConfirm(
      'Hapus Soal',
      'Hapus butir soal ini dari bank soal?',
      async () => {
        try {
          const res = await fetch('/api/guru/soal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'DELETE_SOAL',
              soalId,
              bankSoalId: selectedBankSoal?.id,
            }),
          });
          const json = await res.json();
          if (json.success) {
            showNotification('Soal Dihapus', 'Soal berhasil dihapus.', 'success');
            handleSelectBankSoal(selectedBankSoal.id);
            fetchBankSoalData();
          } else {
            showNotification('Gagal', json.message || 'Gagal hapus soal', 'error');
          }
        } catch (e) {
          showNotification('Error', 'Gagal hapus soal', 'error');
        }
      },
      'error',
      'Ya, Hapus Soal'
    );
  };

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
      });
      const json = await res.json();
      if (json.success) {
        showNotification('Nilai Disimpan', 'Nilai isian/essay berhasil disimpan dan total skor otomatis terakumulasi!', 'success');
        fetchKoreksiData(selectedKoreksiUjianId);
      } else {
        showNotification('Gagal', json.message || 'Gagal menyimpan nilai', 'error');
      }
    } catch (e) {
      showNotification('Error', 'Gagal menyimpan nilai', 'error');
    }
  };

  // 5. Monitoring Live Pengerjaan Peserta (Pengawas Ujian Kelas & Jadwal Hari Yang Sama)
  const fetchProktorData = async (ujianId?: string, filterHariParam?: string) => {
    try {
      const mode = filterHariParam || proktorFilterHari;
      const q = new URLSearchParams();
      if (ujianId) q.set('ujianId', ujianId);
      if (mode) q.set('filterHari', mode);

      const url = `/api/proktor?${q.toString()}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setProktorData(json.data);
        setLastLiveUpdated(new Date());
        if (!selectedProktorUjianId && json.data.activeUjian?.id) {
          setSelectedProktorUjianId(json.data.activeUjian.id);
        }
      }
    } catch (e) {
      console.error('Error fetching proktor data for guru:', e);
    }
  };

  // Live Auto-Refresh Polling Setiap 2 Detik saat Guru membuka Tab Pengawas / Live Monitoring
  useEffect(() => {
    if (!isLiveActive || activeTab !== 'proktor_live') return;

    const interval = setInterval(async () => {
      try {
        const q = new URLSearchParams();
        if (selectedProktorUjianId) q.set('ujianId', selectedProktorUjianId);
        if (proktorFilterHari) q.set('filterHari', proktorFilterHari);

        const url = `/api/proktor?${q.toString()}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          setProktorData(json.data);
          setLastLiveUpdated(new Date());
        }
      } catch (err) {
        // Silent error on polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeTab, selectedProktorUjianId, proktorFilterHari, isLiveActive]);

  // Muat data proktor saat tab proktor_live dibuka atau filter berubah
  useEffect(() => {
    if (activeTab === 'proktor_live') {
      fetchProktorData(selectedProktorUjianId, proktorFilterHari);
    }
  }, [activeTab, selectedProktorUjianId, proktorFilterHari]);

  // Aksi Pengawas: Reset Login Peserta
  const handleResetLogin = async (pesertaUjianId: string, namaSiswa: string) => {
    showConfirm(
      'Reset Login Peserta',
      `Reset status ujian siswa "${namaSiswa}" agar dapat login dan melanjutkan ujian kembali di perangkatnya?`,
      async () => {
        try {
          const res = await fetch('/api/proktor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'RESET_LOGIN', pesertaUjianId }),
          });
          const json = await res.json();
          if (json.success) {
            showNotification('Reset Berhasil', json.message, 'success');
            fetchProktorData(selectedProktorUjianId);
          } else {
            showNotification('Gagal', json.message || 'Gagal reset status ujian', 'error');
          }
        } catch (e) {
          showNotification('Error', 'Gagal reset status ujian', 'error');
        }
      }
    );
  };

  // Aksi Pengawas: Reset Peringatan / Pelanggaran Peserta
  const handleResetPelanggaran = async (pesertaUjianId: string, namaSiswa: string) => {
    showConfirm(
      'Reset Peringatan Siswa',
      `Bersihkan catatan dan kembalikan counter pelanggaran siswa "${namaSiswa}" menjadi 0?`,
      async () => {
        try {
          const res = await fetch('/api/proktor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'RESET_PELANGGARAN', pesertaUjianId }),
          });
          const json = await res.json();
          if (json.success) {
            showNotification('Reset Peringatan', json.message, 'success');
            fetchProktorData(selectedProktorUjianId);
          } else {
            showNotification('Gagal', json.message || 'Gagal reset peringatan siswa', 'error');
          }
        } catch (e) {
          showNotification('Error', 'Gagal reset peringatan siswa', 'error');
        }
      }
    );
  };

  // Aksi Pengawas: Tambah Waktu Ujian
  const handleAddExtraTime = async () => {
    if (!extraTimeModal) return;
    try {
      const res = await fetch('/api/proktor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_TIME',
          pesertaUjianId: extraTimeModal.pesertaUjianId,
          extraMinutes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification('Waktu Tambahan', json.message, 'success');
        setExtraTimeModal(null);
        fetchProktorData(selectedProktorUjianId);
      } else {
        showNotification('Gagal', json.message || 'Gagal tambah waktu', 'error');
      }
    } catch (e) {
      showNotification('Error', 'Gagal tambah waktu', 'error');
    }
  };

  // List Kelas Unik untuk Monitoring Proktor Live Guru
  const proktorKelasOptions = useMemo(() => {
    if (!proktorData?.pesertaList) return [];
    const unique = new Set<string>();
    proktorData.pesertaList.forEach((p: any) => {
      if (p.kelas && p.kelas !== '-') unique.add(p.kelas);
    });
    return Array.from(unique).sort();
  }, [proktorData]);

  // Filtered Peserta Proktor Live Guru berdasarkan Jadwal Terpilih & Kelas
  const filteredProktorPeserta = useMemo(() => {
    if (!proktorData?.pesertaList) return [];
    return proktorData.pesertaList.filter((p: any) => {
      const matchKelas = selectedProktorKelas === 'ALL' || p.kelas === selectedProktorKelas;
      const matchSearch =
        !searchQuery.trim() ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nomorPeserta?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.kelas?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchKelas && matchSearch;
    });
  }, [proktorData, selectedProktorKelas, searchQuery]);

  // List Kelas Unik untuk Filter Rekap & Koreksi Nilai Guru
  const koreksiKelasOptions = useMemo(() => {
    if (!koreksiData?.hasilList) return [];
    const unique = new Set<string>();
    koreksiData.hasilList.forEach((p: any) => {
      const kelasNama = p.siswa?.kelas?.nama;
      if (kelasNama) unique.add(kelasNama);
    });
    return Array.from(unique).sort();
  }, [koreksiData]);

  // Filtered Peserta Koreksi & Rekap Nilai Guru
  const filteredKoreksiPeserta = useMemo(() => {
    if (!koreksiData?.hasilList) return [];
    return koreksiData.hasilList.filter((p: any) => {
      const kelasNama = p.siswa?.kelas?.nama;
      const matchKelas = selectedKoreksiKelas === 'ALL' || kelasNama === selectedKoreksiKelas;
      const matchSearch =
        !searchQuery.trim() ||
        p.siswa?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.siswa?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.siswa?.nomorPeserta?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kelasNama?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchKelas && matchSearch;
    });
  }, [koreksiData, selectedKoreksiKelas, searchQuery]);

  // Ekspor Nilai ke Excel
  const handleExportExcel = () => {
    const listToExport = filteredKoreksiPeserta.length > 0 ? filteredKoreksiPeserta : koreksiData?.hasilList;
    if (!listToExport?.length) {
      showNotification('Informasi', 'Belum ada data nilai untuk diekspor.', 'info');
      return;
    }

    const currentKkm = Number(koreksiData?.activeUjian?.bankSoal?.kkm ?? 75);
    const rows = listToExport.map((p: any, idx: number) => {
      const isTuntas = Number(p.nilaiTotal ?? 0) >= currentKkm;
      const nilaiPGFormatted = p.nilaiPG != null ? Number(Number(p.nilaiPG).toFixed(2)) : 0;
      const nilaiEsaiFormatted = p.nilaiEsai != null ? Number(Number(p.nilaiEsai).toFixed(2)) : 0;
      const nilaiTotalFormatted = p.nilaiTotal != null ? Number(Number(p.nilaiTotal).toFixed(2)) : 0;

      return {
        No: idx + 1,
        Username: p.siswa.username,
        'Nomor Peserta': p.siswa.nomorPeserta || p.siswa.username,
        'Nama Siswa': p.siswa.name,
        Kelas: p.siswa.kelas?.nama || '-',
        'Nilai PG/Pilihan': nilaiPGFormatted,
        'Nilai Isian/Essay': nilaiEsaiFormatted,
        'Total Nilai': nilaiTotalFormatted,
        'KKM Mapel': currentKkm,
        'Ketuntasan': isTuntas ? 'TUNTAS' : 'REMIDIAL',
        'Status Ujian': p.status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Nilai_CBT');
    const namaKelasSuffix = selectedKoreksiKelas !== 'ALL' ? `_${selectedKoreksiKelas}` : '';
    XLSX.writeFile(workbook, `Rekap_Nilai_${koreksiData?.activeUjian?.kodeUjian || 'Ujian'}${namaKelasSuffix}.xlsx`);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'POST' });
    router.push('/login');
  };

  // Filtered bank soal berdasarkan search
  const filteredBankSoal = useMemo(() => {
    if (!searchQuery.trim()) return bankSoalList;
    const q = searchQuery.toLowerCase();
    return bankSoalList.filter(
      (b) =>
        b.nama?.toLowerCase().includes(q) ||
        b.kodeBank?.toLowerCase().includes(q) ||
        b.mataPelajaran?.nama?.toLowerCase().includes(q)
    );
  }, [bankSoalList, searchQuery]);

  const activeBg = settingsForm.backgroundUrl || '/muhipo-log.jpg';

  // Quick stats summary
  const totalBankSoal = bankSoalList.length;
  const totalSoal = bankSoalList.reduce((acc, bs) => acc + (bs._count?.soalList || 0), 0);
  const totalUjian = koreksiUjianList.length;
  const totalSiswaTerkoreksi = koreksiData?.hasilList?.length || 0;

  return (
    <div className="min-h-screen relative flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-300 overflow-x-hidden">
      {/* 1. Latar Belakang Wallpaper Sekolah Terpadu (Persis Admin / SIMASMUH) */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
        {activeBg.startsWith('http') || activeBg.startsWith('data:') ? (
          <img
            src={activeBg}
            alt="Latar Belakang SMA MUHIPO"
            className="object-cover object-center w-full h-full scale-105 brightness-100 dark:brightness-[0.88] dark:contrast-[1.10] transition-all duration-300"
          />
        ) : (
          <NextImage
            src={activeBg}
            alt="Latar Belakang SMA MUHIPO"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center w-full h-full scale-105 brightness-100 dark:brightness-[0.88] dark:contrast-[1.10] transition-all duration-300"
          />
        )}
      </div>

      {/* 2. Glassmorphism Backdrop Overlay Dinamis */}
      <div className="fixed inset-0 bg-slate-100/80 dark:bg-slate-950/65 dark:bg-gradient-to-b dark:from-slate-950/75 dark:via-slate-900/60 dark:to-slate-950/80 backdrop-blur-[2px] -z-20 pointer-events-none transition-colors duration-300" />

      {/* 3. Kerangka Sidebar Induk Terpadu (Hanya muncul ketika masuk di menu Bank Soal atau Koreksi Rekap) */}
      {activeTab !== 'dashboard' && (
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          items={sidebarNavItems}
          activeId={activeTab}
          onSelect={(id) => {
            setActiveTab(id);
            setSearchQuery('');
          }}
        />
      )}

      {/* 4. Area Konten Utama (Bergeser ke Kanan pada Desktop lg:ml-72 hanya jika sidebar aktif) */}
      <div
        className={`flex-1 flex flex-col justify-between min-w-0 transition-all duration-300 relative z-10 ${
          activeTab !== 'dashboard' ? 'lg:ml-72' : 'w-full'
        }`}
      >
        {/* Navbar Induk Terpadu */}
        <AppNavbar
          appTitle={settingsForm.appTitle ? settingsForm.appTitle : 'CBT'}
          subtitle="Manajemen Ujian Guru SMA Muhammadiyah 1 Ponorogo"
          logoUrl={settingsForm.logoUrl}
          onToggleSidebar={activeTab !== 'dashboard' ? () => setSidebarOpen(true) : undefined}
          userProfile={{
            name: currentUser?.name || 'Bapak/Ibu Guru',
            role: currentUser?.role || 'GURU',
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
            <div className="flex items-center gap-3">
              {activeTab !== 'dashboard' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-white/10 cursor-pointer transition flex items-center gap-1.5 text-xs font-bold shrink-0"
                  title="Kembali ke Dashboard Guru"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              )}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                  Panel Guru & Penyusun Soal
                </span>
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white capitalize">
                  {sidebarNavItems.find((i) => i.id === activeTab)?.name || 'Dashboard'}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl font-medium backdrop-blur-sm">
                T.A {settingsForm.academicYear} • Semester {settingsForm.semester}
              </span>
            </div>
          </div>

          {/* TAB 1: DASHBOARD UTAMA GURU */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Welcome Card */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-700 text-white shadow-xl">
                <div className="relative z-10 space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold backdrop-blur-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Selamat Datang, {currentUser?.name || 'Bapak/Ibu Guru'}</span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black tracking-tight">
                    Portal CBT Guru SMA Muhammadiyah 1 Ponorogo
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
                    Kelola bank soal ujian, susun formula matematika KaTeX, import soal Excel, jadwalkan ujian langsung ke rombel kelas, serta lakukan koreksi essay peserta secara real-time.
                  </p>
                </div>
              </div>

              {/* Ringkasan Statistik Guru */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-lg backdrop-blur-md">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Bank Soal Saya</span>
                  <span className="text-xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">{totalBankSoal}</span>
                </div>
                <div className="p-4 sm:p-5 rounded-2xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-lg backdrop-blur-md">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Total Butir Soal</span>
                  <span className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{totalSoal}</span>
                </div>
                <div className="p-4 sm:p-5 rounded-2xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-lg backdrop-blur-md">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Ujian Terdistribusi</span>
                  <span className="text-xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400">{totalUjian}</span>
                </div>
                <div className="p-4 sm:p-5 rounded-2xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-lg backdrop-blur-md">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Peserta Ujian</span>
                  <span className="text-xl sm:text-3xl font-black text-amber-500 dark:text-amber-300">{totalSiswaTerkoreksi}</span>
                </div>
              </div>

              {/* CARD PANDUAN ALUR KERJA CEPAT GURU (USER-FRIENDLY & LENGKAP) */}
              <div className="bg-white/90 dark:bg-slate-900/90 border border-blue-500/30 dark:border-blue-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Petunjuk Alur Kerja Guru CBT</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 text-[10px] font-bold border border-blue-500/20">
                          5 Langkah Praktis
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Ikuti alur kerja berikut untuk mengelola ujian kelas dari awal hingga rekap nilai selesai.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer self-start sm:self-auto"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Buku Panduan & Tips CBT</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* Step 1 */}
                  <div
                    onClick={() => {
                      setActiveTab('bank_soal');
                      setShowCreateBankModal(true);
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 hover:border-blue-500/50 hover:shadow-md transition cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center">1</span>
                      <BookOpen className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">Buat Bank Soal</h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">Tentukan nama mapel, tingkat, jurusan, & KKM kelulusan.</p>
                  </div>

                  {/* Step 2 */}
                  <div
                    onClick={() => {
                      setActiveTab('bank_soal');
                      if (bankSoalList.length > 0) handleSelectBankSoal(bankSoalList[0].id);
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 hover:border-emerald-500/50 hover:shadow-md transition cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center">2</span>
                      <Upload className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">Input / Import Soal</h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">Ketik soal manual atau upload format Excel (KaTeX & Gambar).</p>
                  </div>

                  {/* Step 3 */}
                  <div
                    onClick={() => {
                      setActiveTab('bank_soal');
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 hover:border-cyan-500/50 hover:shadow-md transition cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-black text-xs flex items-center justify-center">3</span>
                      <Send className="w-3.5 h-3.5 text-cyan-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">Distribusi Ujian</h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">Pilih rombel kelas, atur durasi menit, waktu mulai & selesai.</p>
                  </div>

                  {/* Step 4 */}
                  <div
                    onClick={() => setActiveTab('proktor_live')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 hover:border-amber-500/50 hover:shadow-md transition cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center">4</span>
                      <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">Pantau Pengawas Live</h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">Live 2s status siswa, tangkapan layar ujian & reset login.</p>
                  </div>

                  {/* Step 5 */}
                  <div
                    onClick={() => setActiveTab('koreksi_nilai')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 hover:border-purple-500/50 hover:shadow-md transition cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 font-black text-xs flex items-center justify-center">5</span>
                      <FileSpreadsheet className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors">Koreksi & Rekap</h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">Koreksi jawaban esai siswa dan unduh rekap nilai Excel resmi.</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Banks */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-white/10">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      Bank Soal Terbaru Milik Anda
                    </h3>
                    <button
                      onClick={() => setActiveTab('bank_soal')}
                      className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                    >
                      Lihat Semua →
                    </button>
                  </div>

                  {bankSoalList.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      Belum ada bank soal. Klik tombol "Buat Bank Soal" untuk memulai.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {bankSoalList.slice(0, 4).map((bs) => (
                        <div
                          key={bs.id}
                          onClick={() => {
                            setActiveTab('bank_soal');
                            handleSelectBankSoal(bs.id);
                          }}
                          className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5 hover:border-blue-500/50 transition cursor-pointer space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate flex-1 mr-2">{bs.nama}</h4>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono shrink-0">
                              {bs._count?.soalList || 0} Soal
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {bs.mataPelajaran?.nama} • Tingkat {bs.tingkat} ({bs.jurusan || 'UMUM'})
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-500" />
                    Aksi Cepat
                  </h3>
                  <div className="space-y-2.5">
                    <button
                      onClick={() => {
                        setActiveTab('bank_soal');
                        setShowCreateBankModal(true);
                      }}
                      className="w-full p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Buat Bank Soal Baru</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('proktor_live')}
                      className="w-full p-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Radio className="w-4 h-4 animate-pulse" />
                      <span>Live Status & Pengawas Kelas</span>
                    </button>
                    <button
                      onClick={handleDownloadTemplateSoal}
                      className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Download className="w-4 h-4 text-emerald-500" />
                      <span>Unduh Format Excel Soal</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('koreksi_nilai')}
                      className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                      <span>Koreksi & Rekap Nilai</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MONITORING & PENGAWAS UJIAN KELAS (ROLE GURU / PENGAWAS RUANG) */}
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
                        <span>Monitoring & Pengawas Ruangan Ujian</span>
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

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Toggle Mode Hari Ini vs Semua Jadwal */}
                    <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setProktorFilterHari('HARI_INI');
                          fetchProktorData(selectedProktorUjianId, 'HARI_INI');
                        }}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                          proktorFilterHari === 'HARI_INI'
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>Jadwal Hari Ini</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProktorFilterHari('SEMUA');
                          fetchProktorData(selectedProktorUjianId, 'SEMUA');
                        }}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                          proktorFilterHari === 'SEMUA'
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>Semua Jadwal</span>
                      </button>
                    </div>

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

                    {/* Selector Jadwal Ujian Hari Ini / Terpilih */}
                    <select
                      value={selectedProktorUjianId}
                      onChange={(e) => {
                        setSelectedProktorUjianId(e.target.value);
                        setSelectedProktorKelas('ALL');
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white backdrop-blur-sm focus:outline-none focus:border-cyan-500 font-bold"
                    >
                      {(!proktorData?.ujianList || proktorData.ujianList.length === 0) ? (
                        <option value="">Belum ada jadwal ujian aktif</option>
                      ) : (
                        proktorData.ujianList.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.judul} {u.bankSoal?.mataPelajaran?.nama ? `(${u.bankSoal.mataPelajaran.nama})` : ''}
                          </option>
                        ))
                      )}
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
                        <th className="py-3 px-4">Username / ID</th>
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4">Kelas</th>
                        <th className="py-3 px-4">Status & Keamanan</th>
                        <th className="py-3 px-4 text-center">Jawaban</th>
                        <th className="py-3 px-4 text-right">Aksi Pengawas / Proktor</th>
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
                            <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{p.username}</td>
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
                                {/* Tombol Lihat Log & Peringatan Siswa */}
                                <button
                                  type="button"
                                  onClick={() => setViolationScreenModal(p)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs ${
                                    p.jumlahPelanggaran > 0 || p.status === 'TERKUNCI'
                                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                  title="Lihat Riwayat Log & Peringatan Siswa"
                                >
                                  {p.jumlahPelanggaran > 0 ? (
                                    <ShieldAlert className="w-3.5 h-3.5 text-white" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                  <span>{p.jumlahPelanggaran > 0 ? `${p.jumlahPelanggaran}x Peringatan` : 'Lihat Log'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleResetLogin(p.pesertaUjianId, p.name)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-[11px] font-bold cursor-pointer hover:bg-rose-100"
                                >
                                  Reset Login
                                </button>

                                {p.status === 'SEDANG_MENGERJAKAN' && (
                                  <button
                                    type="button"
                                    onClick={() => setExtraTimeModal(p)}
                                    className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/40 text-blue-600 dark:text-blue-300 text-[11px] font-bold cursor-pointer hover:bg-blue-100"
                                  >
                                    +Waktu
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BANK SOAL & EDITOR KATEX */}
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

                {/* Search Bar Bank Soal */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari bank soal atau mata pelajaran..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {filteredBankSoal.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      Belum ada Bank Soal. Klik tombol "Tambah Bank" di atas.
                    </div>
                  ) : (
                    filteredBankSoal.map((bs) => (
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
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{bs.nama}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {bs.mataPelajaran?.nama} • Pengampu: <b className="text-slate-800 dark:text-slate-200">{bs.mataPelajaran?.gurus?.[0]?.guru?.name || (bs.pembuat?.role === 'GURU' ? bs.pembuat?.name : 'Guru Pengampu Mapel')}</b> • {bs.durasiMenit || 90} Mnt
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10.5px]">
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold border border-blue-500/20">
                                KKM: <b>{bs.kkm ?? 75}</b>
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                                Rentang: {bs.nilaiMinimal ?? 0} - {bs.nilaiMaksimal ?? 100}
                              </span>
                              {bs._count?.soalList > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold border border-emerald-500/20">
                                  ~{((bs.nilaiMaksimal ?? 100) / bs._count.soalList).toFixed(2)} Poin/Soal
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 font-mono">
                            {bs._count?.soalList || 0} Soal
                          </span>
                        </div>

                        {/* Quick Action Buttons for each Bank Soal */}
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-200/60 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setImportingBankId(bs.id);
                              setShowImportModal(true);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Import Soal</span>
                          </button>
                          <button
                            onClick={() => {
                              const defaultTipe = 'PAS';
                              const recommended = getRecommendedKelasList(kelasList, bs.tingkat);
                              const autoKelasIds = recommended.length > 0 ? recommended.map((k) => k.id) : [];
                              setDistributeModal(bs);
                              setDistributeForm({
                                tipeUjian: defaultTipe,
                                kodeUjian: `${defaultTipe}-${bs.kodeBank}-${new Date().getFullYear()}`,
                                judul: `${defaultTipe} ${bs.nama}`,
                                durasiMenit: bs.durasiMenit || 90,
                                kelasIds: autoKelasIds,
                                waktuMulai: formatLocalDatetime(),
                                waktuSelesai: formatLocalDatetime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                                lockBrowser: true,
                                acakSoal: true,
                                acakOpsi: true,
                                tampilkanHasil: false,
                              });
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
                            onClick={() => handleArchiveBankSoal(bs.id, bs.nama, bs.status === 'NONAKTIF')}
                            className={`p-1.5 rounded-xl cursor-pointer transition ${
                              bs.status === 'NONAKTIF'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
                            }`}
                            title={bs.status === 'NONAKTIF' ? 'Aktifkan Kembali Bank Soal' : 'Arsipkan Bank Soal'}
                          >
                            {bs.status === 'NONAKTIF' ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
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
                    <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 shadow-sm dark:shadow-xl backdrop-blur-xl flex flex-col sm:row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {selectedBankSoal.mataPelajaran?.nama} • Pengampu: <b>{selectedBankSoal.mataPelajaran?.gurus?.[0]?.guru?.name || (selectedBankSoal.pembuat?.role === 'GURU' ? selectedBankSoal.pembuat?.name : 'Guru Pengampu Mapel')}</b> • Durasi: <b>{selectedBankSoal.durasiMenit || 90} Menit</b>
                          </span>
                        </div>
                        <h3 className="font-black text-lg text-slate-900 dark:text-white mt-1">
                          {selectedBankSoal.nama}
                        </h3>
                        {selectedBankSoal.soalList?.length > 0 && (
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 mt-2">
                            <span>Kalkulasi Otomatis Poin:</span>
                            <b className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                              {(Number(selectedBankSoal.nilaiMaksimal ?? 100) / selectedBankSoal.soalList.length).toFixed(2)} Poin / Soal
                            </b>
                            <span className="text-slate-500">
                              (Total {selectedBankSoal.soalList.length} Soal = {selectedBankSoal.nilaiMaksimal ?? 100} Poin Penuh)
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setImportingBankId(selectedBankSoal.id);
                            setShowImportModal(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Import Soal Excel</span>
                        </button>
                        <button
                          onClick={() => {
                            const defaultTipe = 'PAS';
                            const recommended = getRecommendedKelasList(kelasList, selectedBankSoal.tingkat);
                            const autoKelasIds = recommended.length > 0 ? recommended.map((k) => k.id) : [];
                            setDistributeModal(selectedBankSoal);
                            setDistributeForm({
                              tipeUjian: defaultTipe,
                              kodeUjian: `${defaultTipe}-${selectedBankSoal.kodeBank}-${new Date().getFullYear()}`,
                              judul: `${defaultTipe} ${selectedBankSoal.nama}`,
                              durasiMenit: selectedBankSoal.durasiMenit || 90,
                              kelasIds: autoKelasIds,
                              waktuMulai: formatLocalDatetime(),
                              waktuSelesai: formatLocalDatetime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                              lockBrowser: true,
                              acakSoal: true,
                              acakOpsi: true,
                              tampilkanHasil: false,
                            });
                          }}
                          className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim ke Kelas</span>
                        </button>
                      </div>
                    </div>

                    {/* Form Tambah/Edit Soal */}
                    <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-blue-500" />
                          {soalForm.soalId ? 'Edit Butir Soal' : 'Tambah Butir Soal Baru'}
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
                              <option value="MENJODOHKAN">Mencocokkan / Menjodohkan (4-7 Kotak)</option>
                              <option value="BENAR_SALAH">Benar / Salah</option>
                              <option value="ISIAN">Isian Singkat</option>
                              <option value="ESAI">Uraian / Essay</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Bobot Nilai</label>
                            <input
                              type="number"
                              step="0.01"
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
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        const base64 = reader.result as string;
                                        setSoalForm((prev: any) => ({
                                          ...prev,
                                          pertanyaan: prev.pertanyaan
                                            ? `${prev.pertanyaan}\n<img src="${base64}" alt="Ilustrasi Soal" class="my-2 rounded-xl max-h-60 mx-auto border" />`
                                            : `<img src="${base64}" alt="Ilustrasi Soal" class="my-2 rounded-xl max-h-60 mx-auto border" />`,
                                        }));
                                      };
                                      reader.readAsDataURL(file);
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
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        const base64 = reader.result as string;
                                        setSoalForm((prev: any) => ({
                                          ...prev,
                                          pertanyaan: prev.pertanyaan
                                            ? `${prev.pertanyaan}\n<audio controls src="${base64}" class="my-2 w-full"></audio>`
                                            : `<audio controls src="${base64}" class="my-2 w-full"></audio>`,
                                        }));
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>

                              {/* Sisipkan Video / YouTube */}
                              <button
                                type="button"
                                onClick={() => {
                                  const url = prompt('Masukkan URL Video / Link YouTube (Contoh: https://www.youtube.com/watch?v=...):');
                                  if (url) {
                                    setSoalForm((prev: any) => ({
                                      ...prev,
                                      pertanyaan: prev.pertanyaan
                                        ? `${prev.pertanyaan}\n${url}`
                                        : url,
                                    }));
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
                                      }));
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

                        {/* Opsi Jawaban untuk PG & PG Kompleks */}
                        {(soalForm.tipeSoal === 'PG' || soalForm.tipeSoal === 'PG_KOMPLEKS') && (
                          <div className="space-y-2 pt-1">
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold">Pilihan Jawaban & Sisip Media:</label>
                            {soalForm.opsiJawaban.map((op: any, idx: number) => (
                              <div key={op.label} className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 shrink-0 text-xs">
                                    {op.label}
                                  </span>
                                  <input
                                    type="text"
                                    value={op.konten}
                                    onChange={(e) => {
                                      const next = [...soalForm.opsiJawaban];
                                      next[idx].konten = e.target.value;
                                      setSoalForm({ ...soalForm, opsiJawaban: next });
                                    }}
                                    placeholder={`Teks pilihan ${op.label}...`}
                                    className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs"
                                  />

                                  {/* Tombol Sisip KaTeX Opsi */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const formula = prompt(`Masukkan rumus KaTeX untuk Pilihan ${op.label} (contoh: \\frac{1}{2} atau \\sqrt{x}):`);
                                      if (formula) {
                                        const next = [...soalForm.opsiJawaban];
                                        next[idx].konten = next[idx].konten ? `${next[idx].konten} $${formula.trim()}$` : `$${formula.trim()}$`;
                                        setSoalForm({ ...soalForm, opsiJawaban: next });
                                      }
                                    }}
                                    className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center justify-center cursor-pointer transition shrink-0"
                                    title={`Sisipkan Rumus KaTeX pada Pilihan ${op.label}`}
                                  >
                                    <span className="font-serif italic font-bold text-xs">∑</span>
                                  </button>

                                  {/* Tombol Sisip Gambar Opsi */}
                                  <label
                                    className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center justify-center cursor-pointer transition shrink-0"
                                    title={`Sisipkan Gambar pada Pilihan ${op.label}`}
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onload = () => {
                                            const base64 = reader.result as string;
                                            const next = [...soalForm.opsiJawaban];
                                            next[idx].konten = next[idx].konten
                                              ? `${next[idx].konten} ![${file.name}](${base64})`
                                              : `![${file.name}](${base64})`;
                                            setSoalForm({ ...soalForm, opsiJawaban: next });
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>

                                  {/* Tombol Sisip Audio Opsi */}
                                  <label
                                    className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center justify-center cursor-pointer transition shrink-0"
                                    title={`Sisipkan Suara pada Pilihan ${op.label}`}
                                  >
                                    <Music className="w-3.5 h-3.5" />
                                    <input
                                      type="file"
                                      accept="audio/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onload = () => {
                                            const base64 = reader.result as string;
                                            const next = [...soalForm.opsiJawaban];
                                            next[idx].konten = next[idx].konten
                                              ? `${next[idx].konten} <audio controls src="${base64}" class="inline-block w-48 h-8 align-middle"></audio>`
                                              : `<audio controls src="${base64}" class="inline-block w-48 h-8 align-middle"></audio>`;
                                            setSoalForm({ ...soalForm, opsiJawaban: next });
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>

                                  {/* Tombol Sisip Video Opsi */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = prompt(`Masukkan URL Video / YouTube untuk Pilihan ${op.label}:`);
                                      if (url) {
                                        const next = [...soalForm.opsiJawaban];
                                        next[idx].konten = next[idx].konten ? `${next[idx].konten} ${url}` : url;
                                        setSoalForm({ ...soalForm, opsiJawaban: next });
                                      }
                                    }}
                                    className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center justify-center cursor-pointer transition shrink-0"
                                    title={`Sisipkan Link Video untuk Pilihan ${op.label}`}
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...soalForm.opsiJawaban];
                                      if (soalForm.tipeSoal === 'PG') {
                                        next.forEach((o, i) => (o.isBenar = i === idx));
                                      } else {
                                        next[idx].isBenar = !next[idx].isBenar;
                                      }
                                      setSoalForm({ ...soalForm, opsiJawaban: next });
                                    }}
                                    className={`px-3 py-2 rounded-xl font-bold text-xs cursor-pointer transition ${
                                      op.isBenar
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    {op.isBenar ? '✓ Kunci' : 'Kunci'}
                                  </button>
                                </div>

                                {/* Quick KaTeX Snippets */}
                                <div className="flex flex-wrap items-center gap-1 pl-8">
                                  <span className="text-[10px] text-slate-400">KaTeX:</span>
                                  {[
                                    { label: '½', snippet: '$\\frac{a}{b}$' },
                                    { label: '√x', snippet: '$\\sqrt{x}$' },
                                    { label: 'x²', snippet: '$x^{2}$' },
                                    { label: '×', snippet: '$\\times$' },
                                    { label: '±', snippet: '$\\pm$' },
                                  ].map((chip, cIdx) => (
                                    <button
                                      key={cIdx}
                                      type="button"
                                      onClick={() => {
                                        const next = [...soalForm.opsiJawaban];
                                        next[idx].konten = next[idx].konten ? `${next[idx].konten} ${chip.snippet}` : chip.snippet;
                                        setSoalForm({ ...soalForm, opsiJawaban: next });
                                      }}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-indigo-50"
                                    >
                                      {chip.label}
                                    </button>
                                  ))}
                                </div>

                                {op.konten && (
                                  <div className="pl-8 text-[11px] text-slate-600 dark:text-slate-300">
                                    <MathRenderer content={op.konten} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Opsi Benar / Salah */}
                        {soalForm.tipeSoal === 'BENAR_SALAH' && (
                          <div className="space-y-2 pt-1">
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold">Tentukan Kunci Kebenaran:</label>
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSoalForm({
                                    ...soalForm,
                                    opsiJawaban: [
                                      { label: 'A', konten: 'Benar', isBenar: true },
                                      { label: 'B', konten: 'Salah', isBenar: false },
                                    ],
                                  });
                                }}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs border ${
                                  soalForm.opsiJawaban[0]?.isBenar
                                    ? 'bg-emerald-600 text-white border-emerald-500'
                                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                Pernyataan BENAR
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSoalForm({
                                    ...soalForm,
                                    opsiJawaban: [
                                      { label: 'A', konten: 'Benar', isBenar: false },
                                      { label: 'B', konten: 'Salah', isBenar: true },
                                    ],
                                  });
                                }}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs border ${
                                  soalForm.opsiJawaban[1]?.isBenar
                                    ? 'bg-rose-600 text-white border-rose-500'
                                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                Pernyataan SALAH
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Editor Soal Mencocokkan / Menjodohkan (4-7 Pasangan Kotak Kiri & Kanan) */}
                        {soalForm.tipeSoal === 'MENJODOHKAN' && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="block text-slate-800 dark:text-slate-200 font-bold text-xs">
                                  Pasangan Kotak Pencocokan (Kiri & Kanan):
                                </label>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Isi premis di kotak kiri dan pasangannya di kotak kanan (mendukung KaTeX $...$ dan Gambar).
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={(soalForm.matchingPairs || []).length >= 10}
                                  onClick={() => {
                                    const current = soalForm.matchingPairs || [];
                                    if (current.length < 10) {
                                      setSoalForm({
                                        ...soalForm,
                                        matchingPairs: [...current, { left: '', right: '' }],
                                      });
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-[11px] hover:bg-blue-100 disabled:opacity-40 cursor-pointer"
                                >
                                  + Tambah Baris ({((soalForm.matchingPairs || []).length)}/10)
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {(soalForm.matchingPairs || []).map((pair: any, pIdx: number) => (
                                <div key={pIdx} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                                      #{pIdx + 1}
                                    </span>
                                    {(soalForm.matchingPairs || []).length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = (soalForm.matchingPairs || []).filter((_: any, i: number) => i !== pIdx);
                                          setSoalForm({ ...soalForm, matchingPairs: next });
                                        }}
                                        className="text-xs text-rose-500 hover:text-rose-700 cursor-pointer"
                                        title="Hapus baris pasangan ini"
                                      >
                                        ✕ Hapus
                                      </button>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {/* Kotak Kiri */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500">Kotak Kiri #{pIdx + 1}:</span>
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const formula = prompt(`Rumus KaTeX Kotak Kiri #${pIdx + 1}:`);
                                              if (formula) {
                                                const next = [...(soalForm.matchingPairs || [])];
                                                next[pIdx].left = next[pIdx].left ? `${next[pIdx].left} $${formula.trim()}$` : `$${formula.trim()}$`;
                                                setSoalForm({ ...soalForm, matchingPairs: next });
                                              }
                                            }}
                                            className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold"
                                          >
                                            KaTeX
                                          </button>
                                          <label className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold cursor-pointer">
                                            Gambar
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  const reader = new FileReader();
                                                  reader.onload = () => {
                                                    const base64 = reader.result as string;
                                                    const next = [...(soalForm.matchingPairs || [])];
                                                    next[pIdx].left = next[pIdx].left ? `${next[pIdx].left} ![${file.name}](${base64})` : `![${file.name}](${base64})`;
                                                    setSoalForm({ ...soalForm, matchingPairs: next });
                                                  };
                                                  reader.readAsDataURL(file);
                                                }
                                              }}
                                            />
                                          </label>
                                        </div>
                                      </div>
                                      <input
                                        type="text"
                                        value={pair.left || ''}
                                        onChange={(e) => {
                                          const next = [...(soalForm.matchingPairs || [])];
                                          next[pIdx].left = e.target.value;
                                          setSoalForm({ ...soalForm, matchingPairs: next });
                                        }}
                                        placeholder={`Premis/Istilah kiri...`}
                                        className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs"
                                      />
                                      {pair.left && (
                                        <div className="p-1 text-[10px] text-slate-600 dark:text-slate-300">
                                          <MathRenderer content={pair.left} />
                                        </div>
                                      )}
                                    </div>

                                    {/* Kotak Kanan */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500">Kotak Kanan #{pIdx + 1}:</span>
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const formula = prompt(`Rumus KaTeX Kotak Kanan #${pIdx + 1}:`);
                                              if (formula) {
                                                const next = [...(soalForm.matchingPairs || [])];
                                                next[pIdx].right = next[pIdx].right ? `${next[pIdx].right} $${formula.trim()}$` : `$${formula.trim()}$`;
                                                setSoalForm({ ...soalForm, matchingPairs: next });
                                              }
                                            }}
                                            className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold"
                                          >
                                            KaTeX
                                          </button>
                                          <label className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold cursor-pointer">
                                            Gambar
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  const reader = new FileReader();
                                                  reader.onload = () => {
                                                    const base64 = reader.result as string;
                                                    const next = [...(soalForm.matchingPairs || [])];
                                                    next[pIdx].right = next[pIdx].right ? `${next[pIdx].right} ![${file.name}](${base64})` : `![${file.name}](${base64})`;
                                                    setSoalForm({ ...soalForm, matchingPairs: next });
                                                  };
                                                  reader.readAsDataURL(file);
                                                }
                                              }}
                                            />
                                          </label>
                                        </div>
                                      </div>
                                      <input
                                        type="text"
                                        value={pair.right || ''}
                                        onChange={(e) => {
                                          const next = [...(soalForm.matchingPairs || [])];
                                          next[pIdx].right = e.target.value;
                                          setSoalForm({ ...soalForm, matchingPairs: next });
                                        }}
                                        placeholder={`Jawaban pasangan kanan...`}
                                        className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs"
                                      />
                                      {pair.right && (
                                        <div className="p-1 text-[10px] text-slate-600 dark:text-slate-300">
                                          <MathRenderer content={pair.right} />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Kunci Isian / Rubrik Essay */}
                        {(soalForm.tipeSoal === 'ISIAN' || soalForm.tipeSoal === 'ESAI') && (
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                              {soalForm.tipeSoal === 'ISIAN' ? 'Kunci Jawaban Singkat' : 'Rubrik / Pedoman Nilai Essay'}
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
                                    Tipe: {s.tipeSoal} • Bobot: {s.bobot} Poin
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      let parsedMatching = [
                                        { left: '', right: '' },
                                        { left: '', right: '' },
                                        { left: '', right: '' },
                                        { left: '', right: '' },
                                      ];
                                      if (s.matchingData) {
                                        try {
                                          const parsed = JSON.parse(s.matchingData);
                                          if (Array.isArray(parsed) && parsed.length > 0) parsedMatching = parsed;
                                        } catch (e) {}
                                      }

                                      setSoalForm({
                                        soalId: s.id,
                                        tipeSoal: s.tipeSoal,
                                        pertanyaan: s.pertanyaan,
                                        bobot: s.bobot,
                                        kunciJawabanTeks: s.kunciJawabanTeks || '',
                                        matchingPairs: parsedMatching,
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
                                      });
                                      window.scrollTo({ top: 400, behavior: 'smooth' });
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSoal(s.id)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </div>

                              <div className="text-slate-900 dark:text-white font-medium pl-8">
                                <MathRenderer content={s.pertanyaan} />
                              </div>

                              {/* Preview Pasangan Menjodohkan */}
                              {s.tipeSoal === 'MENJODOHKAN' && s.matchingData && (
                                <div className="pl-8 pt-2 space-y-1.5">
                                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase block">
                                    Kunci Pasangan Pencocokan:
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {(() => {
                                      try {
                                        const pairs = JSON.parse(s.matchingData);
                                        return pairs.map((p: any, i: number) => (
                                          <div key={i} className="p-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between text-xs">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{p.left}</span>
                                            <span className="text-blue-500 font-bold">➔</span>
                                            <span className="font-bold text-blue-700 dark:text-blue-300">{p.right}</span>
                                          </div>
                                        ));
                                      } catch (e) {
                                        return null;
                                      }
                                    })()}
                                  </div>
                                </div>
                              )}

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
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-sm backdrop-blur-xl">
                    <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Pilih salah satu Bank Soal di sebelah kiri untuk melihat & mengedit butir soal.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: KOREKSI ESSAY & REKAP NILAI GURU */}
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
                        setSelectedKoreksiUjianId(e.target.value);
                        setSelectedKoreksiKelas('ALL');
                        fetchKoreksiData(e.target.value);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {koreksiUjianList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.judul}
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
                              <th className="py-3 px-4">Username / ID</th>
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
                                      {p.siswa?.username}
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

                {/* VIEW 2: AREA KOREKSI ISIAN / ESAI (TABEL PER SISWA) */}
                {koreksiSubTab === 'koreksi_esai' && (
                  <div className="space-y-6">
                    {filteredKoreksiPeserta.length === 0 ? (
                      <div className="text-center py-12 bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl text-slate-500 text-xs font-semibold">
                        Tidak ada data peserta ujian untuk filter kelas ini.
                      </div>
                    ) : (
                      filteredKoreksiPeserta.map((peserta: any, pIdx: number) => {
                        const tulisanAnswers = peserta.jawabanPeserta?.filter((j: any) => j.soal?.tipeSoal === 'ESAI' || j.soal?.tipeSoal === 'ISIAN') || [];
                        const isTuntas = Number(peserta.nilaiTotal ?? 0) >= currentKkm;
                        const displayPG = peserta.nilaiPG != null ? Number(Number(peserta.nilaiPG).toFixed(2)) : 0;
                        const displayEsai = peserta.nilaiEsai != null ? Number(Number(peserta.nilaiEsai).toFixed(2)) : 0;
                        const displayTotal = peserta.nilaiTotal != null ? Number(Number(peserta.nilaiTotal).toFixed(2)) : 0;

                        return (
                          <div
                            key={peserta.id}
                            className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-sm dark:shadow-xl backdrop-blur-xl overflow-hidden"
                          >
                            {/* Header Siswa */}
                            <div className="p-4 sm:p-5 bg-slate-50/90 dark:bg-slate-950/90 border-b border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold flex items-center justify-center text-xs shrink-0 font-mono">
                                  #{pIdx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                                      {peserta.siswa?.name}
                                    </h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                      isTuntas
                                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                    }`}>
                                      {isTuntas ? '✓ Tuntas KKM' : '✗ Remidial'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                    User: <b className="text-slate-700 dark:text-slate-200">{peserta.siswa?.username}</b> • Kelas: <b className="text-blue-600 dark:text-blue-400">{peserta.siswa?.kelas?.nama || '-'}</b>
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-mono">
                                <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
                                  <span className="text-slate-500 dark:text-slate-400 text-[10.5px]">PG: </span>
                                  <b className="text-emerald-600 dark:text-emerald-400">{displayPG}</b>
                                </div>
                                <div className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                                  <span className="text-slate-500 dark:text-slate-400 text-[10.5px]">Esai/Isian: </span>
                                  <b className="text-amber-600 dark:text-amber-400">{displayEsai}</b>
                                </div>
                                <div className="px-3 py-1 rounded-xl bg-blue-600 text-white shadow-sm flex items-center gap-1.5">
                                  <span className="text-[10px] uppercase font-bold opacity-90">Total:</span>
                                  <b className="text-sm font-black">{displayTotal}</b>
                                </div>
                              </div>
                            </div>

                            {/* Tabel Butir Soal Esai & Isian Siswa Ini */}
                            {tulisanAnswers.length === 0 ? (
                              <div className="p-6 text-center text-xs text-slate-400 italic">
                                Siswa ini tidak memiliki jawaban soal esai / isian singkat untuk dikoreksi.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-100/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-white/10 text-[11px]">
                                      <th className="py-2.5 px-3 w-12 text-center">No</th>
                                      <th className="py-2.5 px-3 w-28">Tipe Soal</th>
                                      <th className="py-2.5 px-4 w-5/12">Pertanyaan & Rubrik Kunci</th>
                                      <th className="py-2.5 px-4 w-4/12">Jawaban Siswa</th>
                                      <th className="py-2.5 px-3 w-24 text-center">Maks Poin</th>
                                      <th className="py-2.5 px-4 w-56 text-center">Penilaian Guru</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                                    {tulisanAnswers.map((j: any, qIdx: number) => {
                                      const isIsian = j.soal?.tipeSoal === 'ISIAN';
                                      const badgeTipe = isIsian ? 'Isian Singkat' : 'Uraian / Esai';
                                      const maxBobot = Number(j.soal?.bobot) || 1.0;

                                      return (
                                        <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition align-top">
                                          {/* No */}
                                          <td className="py-3.5 px-3 text-center font-mono text-slate-400 font-bold">
                                            {qIdx + 1}
                                          </td>

                                          {/* Tipe Soal */}
                                          <td className="py-3.5 px-3">
                                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                              isIsian
                                                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                            }`}>
                                              {badgeTipe}
                                            </span>
                                            <span className="block text-[10px] text-slate-400 font-mono mt-1">
                                              No. Urut {j.soal?.nomorUrut || qIdx + 1}
                                            </span>
                                          </td>

                                          {/* Pertanyaan & Rubrik */}
                                          <td className="py-3.5 px-4 space-y-2">
                                            <div className="text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                                              <MathRenderer content={j.soal?.pertanyaan} />
                                            </div>
                                            {j.soal?.kunciJawabanTeks && (
                                              <div className="p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-[11px] leading-relaxed">
                                                <b className="font-bold">Rubrik / Kunci Guru:</b> {j.soal.kunciJawabanTeks}
                                              </div>
                                            )}
                                          </td>

                                          {/* Jawaban Siswa */}
                                          <td className="py-3.5 px-4">
                                            <div className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs whitespace-pre-wrap leading-relaxed min-h-[50px]">
                                              {j.jawabanDipilih || (
                                                <span className="italic text-slate-400 font-sans text-xs">
                                                  (Siswa tidak mengisi jawaban)
                                                </span>
                                              )}
                                            </div>
                                          </td>

                                          {/* Maks Bobot */}
                                          <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                                            {maxBobot}
                                          </td>

                                          {/* Aksi & Input Skor */}
                                          <td className="py-3.5 px-4">
                                            <div className="flex flex-col gap-2">
                                              <div className="flex items-center gap-1.5">
                                                <input
                                                  type="number"
                                                  min={0}
                                                  max={maxBobot}
                                                  step="0.5"
                                                  defaultValue={j.skor}
                                                  id={`score-${j.id}`}
                                                  className="w-16 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-center font-black text-xs"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const input = document.getElementById(`score-${j.id}`) as HTMLInputElement;
                                                    handleSimpanNilaiEssay(j.id, Number(input.value), peserta.id);
                                                  }}
                                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] cursor-pointer transition shadow-sm whitespace-nowrap"
                                                >
                                                  Simpan
                                                </button>
                                                <button
                                                  type="button"
                                                  title={`Beri nilai maksimal ${maxBobot}`}
                                                  onClick={() => {
                                                    const input = document.getElementById(`score-${j.id}`) as HTMLInputElement;
                                                    if (input) input.value = String(maxBobot);
                                                    handleSimpanNilaiEssay(j.id, maxBobot, peserta.id);
                                                  }}
                                                  className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer transition shadow-sm whitespace-nowrap"
                                                >
                                                  Max ({maxBobot})
                                                </button>
                                              </div>
                                              <span className="text-[10px] font-mono text-slate-400">
                                                Skor Tersimpan:{' '}
                                                <b className={j.skor > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                                                  {j.skor}
                                                </b>{' '}
                                                / {maxBobot}
                                              </span>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
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
        </main>

        {/* Footer Terpadu */}
        <AppFooter />
      </div>

      {/* MODALS */}

      {/* Modal Buat Bank Soal Baru */}
      {showCreateBankModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Buat Bank Soal Baru</h3>
            <form onSubmit={handleCreateBankSoal} className="space-y-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Bank Soal *</label>
                <input
                  type="text"
                  required
                  value={newBankForm.nama}
                  onChange={(e) => setNewBankForm({ ...newBankForm, nama: e.target.value })}
                  placeholder="Contoh: Bank Soal PAS Matematika XII"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tingkat Kelas</label>
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
                        {m.nama}
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

              {/* Standar Rentang Nilai & KKM */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 rounded-2xl">
                <div>
                  <label className="block text-blue-600 dark:text-blue-400 font-semibold mb-1">Nilai KKM</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={newBankForm.kkm}
                    onChange={(e) => setNewBankForm({ ...newBankForm, kkm: Number(e.target.value) })}
                    placeholder="75"
                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nilai Minimal</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newBankForm.nilaiMinimal}
                    onChange={(e) => setNewBankForm({ ...newBankForm, nilaiMinimal: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-emerald-600 dark:text-emerald-400 font-semibold mb-1">Nilai Maksimal</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newBankForm.nilaiMaksimal}
                    onChange={(e) => setNewBankForm({ ...newBankForm, nilaiMaksimal: Number(e.target.value) })}
                    placeholder="100"
                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-center font-bold"
                  />
                </div>
              </div>

              {/* Info Sinkronisasi Real-Time */}
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <b className="font-bold">Sinkronisasi Poin Otomatis:</b>
                  <p className="mt-0.5 text-[10.5px] text-blue-600/90 dark:text-blue-200/90">
                    Poin setiap butir soal akan otomatis dihitung oleh sistem berdasarkan <b>Nilai Maksimal ({newBankForm.nilaiMaksimal || 100})</b> dibagi total jumlah butir soal.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateBankModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md cursor-pointer"
                >
                  Buat Bank Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Bank Soal */}
      {editBankModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Informasi Bank Soal</h3>
              <button
                onClick={() => setEditBankModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateBankSoal} className="space-y-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Bank Soal *</label>
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
                        {m.nama}
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

              {/* Standar Rentang Nilai & KKM Edit */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 rounded-2xl">
                <div>
                  <label className="block text-blue-600 dark:text-blue-400 font-semibold mb-1">Nilai KKM</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={editBankModal.kkm ?? 75}
                    onChange={(e) => setEditBankModal({ ...editBankModal, kkm: Number(e.target.value) })}
                    placeholder="75"
                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nilai Minimal</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editBankModal.nilaiMinimal ?? 0}
                    onChange={(e) => setEditBankModal({ ...editBankModal, nilaiMinimal: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-emerald-600 dark:text-emerald-400 font-semibold mb-1">Nilai Maksimal</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editBankModal.nilaiMaksimal ?? 100}
                    onChange={(e) => setEditBankModal({ ...editBankModal, nilaiMaksimal: Number(e.target.value) })}
                    placeholder="100"
                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-center font-bold"
                  />
                </div>
              </div>

              {/* Info Sinkronisasi Real-Time */}
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <b className="font-bold">Sinkronisasi Poin Otomatis:</b>
                  <p className="mt-0.5 text-[10.5px] text-blue-600/90 dark:text-blue-200/90">
                    Mengubah Nilai Maksimal akan otomatis mengkalkulasi ulang bobot poin per butir soal untuk Bank Soal ini.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditBankModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer shadow-md"
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-300">Format Template Excel Resmi</h4>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Gunakan template standar agar proses import otomatis dan cepat.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplateSoal}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Format</span>
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
                        {bs.nama} - {bs.mataPelajaran?.nama}
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
                  className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600/15 file:text-emerald-700 dark:file:text-emerald-300 hover:file:bg-emerald-600/25 file:cursor-pointer border border-slate-300 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-slate-950 p-1.5"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-cyan-500" />
                  <span>Kirim / Jadwalkan Ujian ke Kelas</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bank Soal: <b>{distributeModal.nama}</b>
                </p>
              </div>
              <button
                onClick={() => setDistributeModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteKirimKeKelas} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tipe / Kategori Ujian</label>
                  <select
                    value={distributeForm.tipeUjian}
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
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Judul Ujian *</label>
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
                    step="60"
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
              <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 text-[11px] text-cyan-800 dark:text-cyan-300 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <b className="font-bold">Sinkronisasi Waktu Real-Time:</b>
                  <p className="mt-0.5 text-[10.5px] text-cyan-700 dark:text-cyan-200/90">
                    Siswa yang mulai di atas jam mulai otomatis sisa durasinya terpotong mengikuti jam server real-time.
                  </p>
                </div>
              </div>

              {/* Pilihan Rombel Kelas Target */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs">
                    Pilih Kelas Tujuan Ujian (Centang Kelas):
                  </label>
                  {kelasList.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      {distributeModal && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const recommended = getRecommendedKelasList(kelasList, distributeModal.tingkat);
                              setDistributeForm({
                                ...distributeForm,
                                kelasIds: recommended.map((k) => k.id),
                              });
                            }}
                            className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer bg-amber-500/10 px-2 py-0.5 rounded-md"
                            title={`Pilih semua kelas ${getRomawiTingkat(distributeModal.tingkat)}`}
                          >
                            ⚡ Rekomendasi Kelas {getRomawiTingkat(distributeModal.tingkat)}
                          </button>
                          <span className="text-slate-400">•</span>
                        </>
                      )}
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
                  <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                    <p className="font-semibold">Belum ada data kelas.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                    {kelasList.map((k) => {
                      const isChecked = distributeForm.kelasIds.includes(k.id);
                      return (
                        <label
                          key={k.id}
                          className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                            isChecked
                              ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-700 dark:text-cyan-200 font-bold'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDistributeForm({ ...distributeForm, kelasIds: [...distributeForm.kelasIds, k.id] });
                              } else {
                                setDistributeForm({
                                  ...distributeForm,
                                  kelasIds: distributeForm.kelasIds.filter((id) => id !== k.id),
                                });
                              }
                            }}
                            className="rounded text-cyan-600"
                          />
                          <span className="truncate">Kelas {k.nama}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {distributeForm.kelasIds.length > 0 && (
                  <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold mt-1">
                    ✓ {distributeForm.kelasIds.length} rombel kelas dipilih
                  </p>
                )}
              </div>

              {/* Opsi Pengerjaan & Keamanan Anti-Cheat */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Opsi Pengerjaan & Keamanan Anti-Cheat:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={distributeForm.acakSoal}
                      onChange={(e) => setDistributeForm({ ...distributeForm, acakSoal: e.target.checked })}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                    />
                    <span>Acak Butir Soal</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={distributeForm.acakOpsi}
                      onChange={(e) => setDistributeForm({ ...distributeForm, acakOpsi: e.target.checked })}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                    />
                    <span>Acak Opsi Pilihan</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={distributeForm.lockBrowser}
                      onChange={(e) => setDistributeForm({ ...distributeForm, lockBrowser: e.target.checked })}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                    />
                    <span>Lockdown Browser</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={distributeForm.tampilkanHasil}
                      onChange={(e) => setDistributeForm({ ...distributeForm, tampilkanHasil: e.target.checked })}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                    />
                    <span>Tampilkan Nilai ke Siswa</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setDistributeModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer shadow-md"
                >
                  Kirim & Jadwalkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Waktu Ujian (Pengawas Kelas) */}
      {extraTimeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Tambah Waktu Ujian Peserta</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Berikan tambahan waktu untuk peserta: <b>{extraTimeModal.name}</b> (Kelas: {extraTimeModal.kelas})
            </p>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jumlah Menit Tambahan:
              </label>
              <input
                type="number"
                min={1}
                max={180}
                value={extraMinutes}
                onChange={(e) => setExtraMinutes(Number(e.target.value))}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-base focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExtraTimeModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddExtraTime}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-md shadow-blue-600/30 cursor-pointer"
              >
                + Tambah {extraMinutes} Menit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Log & Peringatan Siswa */}
      {violationScreenModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Log Aktivitas & Peringatan: {violationScreenModal.name}</span>
                    {violationScreenModal.jumlahPelanggaran > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                        {violationScreenModal.jumlahPelanggaran} Pelanggaran
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Tertib (0 Pelanggaran)
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    User: <b>{violationScreenModal.username}</b> • Kelas: <b>{violationScreenModal.kelas}</b> • Status: <b>{violationScreenModal.status}</b>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViolationScreenModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Riwayat Log Pelanggaran Siswa */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Daftar Rekam Jejak Aktivitas:
                </span>
                <span className="text-[11px] text-slate-400">
                  Total Log: {violationScreenModal.logsTerakhir?.length || 0}
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                {(!violationScreenModal.logsTerakhir || violationScreenModal.logsTerakhir.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 space-y-1">
                    <p className="font-semibold">Tidak ada catatan aktivitas mencurigakan.</p>
                    <p className="text-[10.5px]">Siswa tertib mengerjakan ujian di dalam aplikasi.</p>
                  </div>
                ) : (
                  violationScreenModal.logsTerakhir.map((log: any, idx: number) => {
                    const isViolation = [
                      'TAB_SWITCH_ALERT',
                      'APP_SWITCH_ALERT',
                      'WINDOW_BLUR',
                      'FULLSCREEN_EXIT',
                      'KEYBOARD_SHORTCUT_VIOLATION',
                      'SECURITY_ALERT',
                    ].includes(log.aktivitas);

                    return (
                      <div
                        key={log.id || idx}
                        className={`p-2.5 rounded-xl text-[11px] flex justify-between items-start gap-2 ${
                          isViolation
                            ? 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
                            : 'bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isViolation ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500 text-white uppercase tracking-wider">
                                Pelanggaran
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                Info
                              </span>
                            )}
                            <span className="font-bold font-mono text-[10.5px]">
                              {log.aktivitas}
                            </span>
                          </div>
                          <p className="text-[10.5px] mt-1 text-slate-600 dark:text-slate-300">
                            {log.detail || '-'}
                          </p>
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
              {violationScreenModal.jumlahPelanggaran > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    handleResetPelanggaran(violationScreenModal.pesertaUjianId, violationScreenModal.name);
                    setViolationScreenModal(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer shadow-md shadow-amber-600/20"
                >
                  Reset Peringatan Siswa
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handleResetLogin(violationScreenModal.pesertaUjianId, violationScreenModal.name);
                  setViolationScreenModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-md shadow-rose-600/20"
              >
                Reset Sesi / Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PANDUAN PENGGUNAAN & FAQ GURU CBT */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold">
                  <Compass className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Buku Panduan & Petunjuk Penggunaan Guru CBT</h3>
                  <p className="text-xs text-blue-100">SOP Pembuatan Soal, Distribusi Ujian, Pengawasan Proktor, & Rekap Nilai</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {/* Seksi 1: Alur Kerja Sistematis */}
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span>1. Alur Lengkap Mengelola Ujian CBT</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 space-y-1">
                    <b className="text-blue-600 dark:text-blue-400 font-bold block">Langkah 1: Buat Bank Soal</b>
                    <p className="text-xs leading-relaxed">
                      Buka tab <b>Bank Soal</b> lalu klik tombol <b>+ Buat Bank Soal</b>. Masukkan nama bank soal, mata pelajaran, tingkat kelas (X/XI/XII), jurusan, dan KKM kelulusan.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 space-y-1">
                    <b className="text-emerald-600 dark:text-emerald-400 font-bold block">Langkah 2: Susun Butir Soal</b>
                    <p className="text-xs leading-relaxed">
                      Pilih bank soal yang telah dibuat. Anda dapat menambah soal manual atau klik <b>Unduh Template Excel</b> untuk import ratusan butir soal sekaligus termasuk gambar dan rumus KaTeX.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 space-y-1">
                    <b className="text-cyan-600 dark:text-cyan-400 font-bold block">Langkah 3: Jadwalkan / Distribusi Ujian</b>
                    <p className="text-xs leading-relaxed">
                      Di halaman rincian bank soal, klik tombol <b>Distribusi / Jadwalkan Ujian</b>. Pilih kelas/rombel yang akan mengikuti ujian, atur durasi pengerjaan, dan rentang waktu aktif.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 space-y-1">
                    <b className="text-amber-600 dark:text-amber-400 font-bold block">Langkah 4: Pantau Pengawas Real-Time</b>
                    <p className="text-xs leading-relaxed">
                      Saat ujian berjalan, buka tab <b>Monitoring & Pengawas</b>. Anda dapat memantau progres siswa, mendeteksi siswa yang keluar aplikasi (Anti-Cheat), dan mereset status login siswa jika HP bermasalah.
                    </p>
                  </div>
                </div>
              </div>

              {/* Seksi 2: Panduan Rumus Matematika KaTeX */}
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>2. Penulisan Rumus Matematika / KaTeX / LaTeX</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  CBT MUHIPO mendukung render rumus matematika KaTeX otomatis. Gunakan tanda dollar <code>$...$</code> di dalam teks pertanyaan maupun opsi jawaban:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                    <span className="text-slate-500 block font-sans text-[11px] mb-1">Pecahan / Frac:</span>
                    <code>$\frac{'{a}'}{'{b}'}$</code> &rarr; a/b
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                    <span className="text-slate-500 block font-sans text-[11px] mb-1">Pangkat & Akar:</span>
                    <code>$x^2 + \sqrt{'{y}'} = 10$</code>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                    <span className="text-slate-500 block font-sans text-[11px] mb-1">Simbol Kimia & Reaksi:</span>
                    <code>$H_2O + CO_2 \rightarrow H_2CO_3$</code>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                    <span className="text-slate-500 block font-sans text-[11px] mb-1">Matriks & Integral:</span>
                    <code>$\int_0^\infty x dx$</code>
                  </div>
                </div>
              </div>

              {/* Seksi 3: Tipe Soal yang Didukung */}
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>3. Ragam Tipe Soal Lengkap</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-500/20">
                    <b className="text-blue-700 dark:text-blue-300 block mb-1">Pilihan Ganda (PG)</b>
                    <span>1 jawaban benar otomatis dinilai sistem (A/B/C/D/E).</span>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-500/20">
                    <b className="text-indigo-700 dark:text-indigo-300 block mb-1">PG Kompleks (Multi-Jawaban)</b>
                    <span>Siswa dapat memilih lebih dari 1 pilihan yang benar.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-200/60 dark:border-cyan-500/20">
                    <b className="text-cyan-700 dark:text-cyan-300 block mb-1">Benar / Salah (B-S)</b>
                    <span>Pernyataan dengan pilihan Benar atau Salah.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-500/20">
                    <b className="text-amber-700 dark:text-amber-300 block mb-1">Menjodohkan (Matching)</b>
                    <span>Mencocokkan pasangan premis di sisi kiri dan respon di sisi kanan.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-500/20">
                    <b className="text-purple-700 dark:text-purple-300 block mb-1">Isian Singkat</b>
                    <span>Jawaban teks singkat dengan auto-grading kata kunci.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-500/20">
                    <b className="text-rose-700 dark:text-rose-300 block mb-1">Uraian / Esai</b>
                    <span>Jawaban penjelasan mendalam yang dikoreksi di menu Koreksi Guru.</span>
                  </div>
                </div>
              </div>

              {/* Seksi 4: Troubleshooting Cepat Guru */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <b className="text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Tips Mengatasi Kendala Siswa Saat Ujian:</span>
                </b>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  <li><b>Siswa terlempar / ganti perangkat:</b> Buka menu <i>Monitoring Live</i> &rarr; klik tombol <i>Reset Login</i> pada nama siswa terkait. Jawaban yang telah diisi sebelumnya tetap tersimpan aman di server.</li>
                  <li><b>Siswa kehabisan waktu karena kendala jaringan:</b> Klik tombol <i>Tambah Waktu</i> (+15 / +30 menit) khusus untuk siswa tersebut.</li>
                  <li><b>Import Excel gagal:</b> Pastikan kolom header tidak diubah dan gunakan format .xlsx resmi dari tombol unduh template.</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Saya Mengerti, Tutup Panduan
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
  );
}
