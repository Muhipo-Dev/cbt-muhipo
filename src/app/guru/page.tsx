'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { AppSidebar, NavTabItem } from '@/components/layout/AppSidebar';
import { AppFooter } from '@/components/layout/AppFooter';
import { MathRenderer } from '@/components/MathRenderer';
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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DAFTAR_JURUSAN_MUHIPO, DAFTAR_TIPE_UJIAN } from '@/lib/constants';
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
    appTitle: 'CBT MUHIPO',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    logoUrl: '/pic_logo.png',
    backgroundUrl: '/muhipo-front.jpg',
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
  });

  // Koreksi Essay State
  const [koreksiUjianList, setKoreksiUjianList] = useState<any[]>([]);
  const [selectedKoreksiUjianId, setSelectedKoreksiUjianId] = useState('');
  const [koreksiData, setKoreksiData] = useState<any>(null);

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
            backgroundUrl: pJson.data.backgroundUrl || '/muhipo-front.jpg',
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
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_BANK_SOAL',
          ...newBankForm,
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

  const handleDeleteBankSoal = async (bankSoalId: string, nama: string) => {
    showConfirm(
      'Hapus Bank Soal',
      `Hapus Bank Soal "${nama}" beserta seluruh butir soal di dalamnya?`,
      async () => {
        try {
          const res = await fetch('/api/guru/soal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE_BANK_SOAL', bankSoalId }),
          });
          const json = await res.json();
          if (json.success) {
            showNotification('Bank Soal Dihapus', json.message, 'success');
            if (selectedBankSoal?.id === bankSoalId) setSelectedBankSoal(null);
            fetchBankSoalData();
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus bank soal', 'error');
          }
        } catch (e) {
          showNotification('Error', 'Gagal menghapus bank soal', 'error');
        }
      },
      'error',
      'Ya, Hapus Bank Soal'
    );
  };

  const handleDownloadTemplateSoal = () => {
    const sampleRows = [
      {
        Nomor: 1,
        'Tipe Soal': 'PG',
        'Pertanyaan / Soal': 'Berapakah hasil dari 25 + 15? (Mendukung KaTeX: $\\sqrt{16} = 4$)',
        Bobot: 2,
        'Pilihan A': '30',
        'Pilihan B': '35',
        'Pilihan C': '40',
        'Pilihan D': '45',
        'Pilihan E': '50',
        'Kunci Jawaban (A/B/C/D/E)': 'C',
        'Kunci Teks/Rubrik Essay': '',
      },
      {
        Nomor: 2,
        'Tipe Soal': 'PG_KOMPLEKS',
        'Pertanyaan / Soal': 'Manakah di antara bilangan berikut yang merupakan bilangan prima? (Pilih semua yang benar)',
        Bobot: 3,
        'Pilihan A': '2',
        'Pilihan B': '3',
        'Pilihan C': '4',
        'Pilihan D': '5',
        'Pilihan E': '9',
        'Kunci Jawaban (A/B/C/D/E)': 'A,B,D',
        'Kunci Teks/Rubrik Essay': '',
      },
      {
        Nomor: 3,
        'Tipe Soal': 'BENAR_SALAH',
        'Pertanyaan / Soal': 'Matahari terbit dari sebelah timur dan terbenam di sebelah barat.',
        Bobot: 2,
        'Pilihan A': 'Benar',
        'Pilihan B': 'Salah',
        'Pilihan C': '',
        'Pilihan D': '',
        'Pilihan E': '',
        'Kunci Jawaban (A/B/C/D/E)': 'A',
        'Kunci Teks/Rubrik Essay': '',
      },
      {
        Nomor: 4,
        'Tipe Soal': 'ISIAN',
        'Pertanyaan / Soal': 'Ibu kota negara Indonesia yang baru di Kalimantan Timur adalah...',
        Bobot: 3,
        'Pilihan A': '',
        'Pilihan B': '',
        'Pilihan C': '',
        'Pilihan D': '',
        'Pilihan E': '',
        'Kunci Jawaban (A/B/C/D/E)': '',
        'Kunci Teks/Rubrik Essay': 'Nusantara',
      },
      {
        Nomor: 5,
        'Tipe Soal': 'ESAI',
        'Pertanyaan / Soal': 'Jelaskan tujuan didirikannya organisasi Muhammadiyah oleh K.H. Ahmad Dahlan pada tahun 1912!',
        Bobot: 10,
        'Pilihan A': '',
        'Pilihan B': '',
        'Pilihan C': '',
        'Pilihan D': '',
        'Pilihan E': '',
        'Kunci Jawaban (A/B/C/D/E)': '',
        'Kunci Teks/Rubrik Essay': 'Memurnikan ajaran Islam sesuai Al-Quran & Sunnah serta memajukan pendidikan dan kesejahteraan umat.',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Format_Import_Soal');
    XLSX.writeFile(workbook, 'Template_Import_Soal_Guru_MUHIPO.xlsx');
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
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          showNotification('Peringatan Format', 'File Excel kosong atau format tidak sesuai.', 'warning');
          return;
        }

        const parsedItems = data
          .map((row: any) => {
            const tipe = (row['Tipe Soal'] || 'PG').toUpperCase();
            const pertanyaan = row['Pertanyaan / Soal'] || row['Pertanyaan'] || row['Soal'] || '';
            const bobot = Number(row['Bobot']) || 2.0;
            const kunci = String(row['Kunci Jawaban (A/B/C/D/E)'] || row['Kunci'] || '').trim().toUpperCase();
            const kunciTeks = row['Kunci Teks/Rubrik Essay'] || row['Kunci Essay'] || '';

            const opsi = ['A', 'B', 'C', 'D', 'E']
              .map((lbl) => {
                const konten = row[`Pilihan ${lbl}`] || row[`Opsi ${lbl}`] || row[lbl] || '';
                return {
                  label: lbl,
                  konten: String(konten || '').trim(),
                  isBenar: kunci.includes(lbl),
                };
              })
              .filter((o) => o.konten !== '');

            return {
              tipeSoal: tipe,
              pertanyaan,
              bobot,
              opsi,
              kunciJawabanTeks: kunciTeks || undefined,
            };
          })
          .filter((item) => item.pertanyaan.trim() !== '');

        if (parsedItems.length === 0) {
          showNotification('Peringatan Data', 'Tidak ditemukan baris pertanyaan soal yang valid.', 'warning');
          return;
        }

        setImportFileText(JSON.stringify(parsedItems));
        showNotification('File Terbaca', `Berhasil membaca ${parsedItems.length} butir soal dari file Excel. Klik "Proses Import Soal".`, 'success');
      } catch (err) {
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
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SOAL',
          bankSoalId: selectedBankSoal.id,
          ...soalForm,
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

  // Ekspor Nilai ke Excel
  const handleExportExcel = () => {
    if (!koreksiData?.hasilList?.length) {
      showNotification('Informasi', 'Belum ada data nilai untuk diekspor.', 'info');
      return;
    }

    const rows = koreksiData.hasilList.map((p: any, idx: number) => ({
      No: idx + 1,
      NIS: p.siswa.nis || p.siswa.username,
      NISN: p.siswa.nisn || '-',
      'Nama Siswa': p.siswa.name,
      Kelas: p.siswa.kelas?.nama || '-',
      'Nilai PG/Pilihan': p.nilaiPG,
      'Nilai Isian/Essay': p.nilaiEsai,
      'Total Nilai': p.nilaiTotal,
      Status: p.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Nilai_CBT');
    XLSX.writeFile(workbook, `Rekap_Nilai_${koreksiData?.activeUjian?.kodeUjian || 'Ujian'}.xlsx`);
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

  const activeBg = settingsForm.backgroundUrl || '/muhipo-front.jpg';

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

      {/* 2. Glassmorphism Backdrop Overlay Dinamis */}
      <div className="fixed inset-0 bg-slate-100/85 dark:bg-slate-950/85 backdrop-blur-[2px] -z-20 pointer-events-none transition-colors duration-300" />

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
          appTitle={settingsForm.appTitle || 'CBT MUHIPO'}
          subtitle="Portal Guru Pengampu & Pembuat Soal"
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
                            <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                              {bs.kodeBank}
                            </span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                              {bs._count?.soalList || 0} Soal
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{bs.nama}</h4>
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
                    placeholder="Cari nama bank soal / kode..."
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
                            <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                              {bs.kodeBank}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">{bs.nama}</h4>
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
                              setDistributeModal(bs);
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
                            setDistributeModal(selectedBankSoal);
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
                                              ? `${next[idx].konten} <img src="${base64}" class="inline-block max-h-24 rounded border my-1" />`
                                              : `<img src="${base64}" class="inline-block max-h-24 rounded border my-1" />`;
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

          {/* TAB 3: KOREKSI ESSAY & REKAP NILAI */}
          {activeTab === 'koreksi_nilai' && (
            <div className="space-y-6">
              {/* Header & Export Excel */}
              <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
                    Rekapitulasi Nilai & Koreksi
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {koreksiData?.activeUjian?.judul || 'Pilih Jadwal Ujian'}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={selectedKoreksiUjianId}
                    onChange={(e) => {
                      setSelectedKoreksiUjianId(e.target.value);
                      fetchKoreksiData(e.target.value);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {koreksiUjianList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.kodeUjian} - {u.judul}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Ekspor Excel</span>
                  </button>
                </div>
              </div>

              {/* List Siswa & Koreksi */}
              <div className="space-y-4">
                {koreksiData?.hasilList?.map((peserta: any) => {
                  const tulisanAnswers = peserta.jawabanPeserta?.filter((j: any) => j.soal?.tipeSoal === 'ESAI' || j.soal?.tipeSoal === 'ISIAN') || [];

                  return (
                    <div
                      key={peserta.id}
                      className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-3">
                        <div>
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            NIS: {peserta.siswa?.nis || peserta.siswa?.username} • {peserta.siswa?.kelas?.nama}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">{peserta.siswa?.name}</h4>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Nilai PG/Pilihan:</span>{' '}
                            <b className="text-emerald-600 dark:text-emerald-400">{peserta.nilaiPG}</b>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Nilai Tulisan/Isian:</span>{' '}
                            <b className="text-amber-500 dark:text-amber-400">{peserta.nilaiEsai}</b>
                          </div>
                          <div className="px-3 py-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10">
                            <span className="text-slate-500 dark:text-slate-400">Total:</span>{' '}
                            <b className="text-slate-900 dark:text-white text-sm">{peserta.nilaiTotal}</b>
                          </div>
                        </div>
                      </div>

                      {/* Tulisan & Isian List */}
                      {tulisanAnswers.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">
                          Tidak ada butir soal isian atau essay pada ujian ini (Seluruh butir soal berbentuk pilihan ganda / objektif otomatis).
                        </p>
                      ) : (
                        <div className="space-y-3 pt-2">
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
                                      const input = document.getElementById(`score-${j.id}`) as HTMLInputElement;
                                      handleSimpanNilaiEssay(j.id, Number(input.value), peserta.id);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition shadow-sm"
                                  >
                                    Simpan Nilai
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById(`score-${j.id}`) as HTMLInputElement;
                                      if (input) input.value = String(j.soal?.bobot || 0);
                                      handleSimpanNilaiEssay(j.id, Number(j.soal?.bobot || 0), peserta.id);
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
                })}
              </div>
            </div>
          )}
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
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Kode Bank Soal</label>
                <input
                  type="text"
                  required
                  value={newBankForm.kodeBank}
                  onChange={(e) => setNewBankForm({ ...newBankForm, kodeBank: e.target.value.toUpperCase() })}
                  placeholder="Contoh: BS-MTK-XII-2026"
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
                  Bank Soal: <b>{distributeModal.nama}</b> ({distributeModal.kodeBank})
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

              {/* Opsi Anti-Cheat & Acak */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributeForm.lockBrowser}
                    onChange={(e) => setDistributeForm({ ...distributeForm, lockBrowser: e.target.checked })}
                  />
                  <span>Anti-Cheat</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributeForm.acakSoal}
                    onChange={(e) => setDistributeForm({ ...distributeForm, acakSoal: e.target.checked })}
                  />
                  <span>Acak Soal</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 cursor-pointer">
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
