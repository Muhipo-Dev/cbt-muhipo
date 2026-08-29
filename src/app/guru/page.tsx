'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SchoolBrandHeader } from '@/components/SchoolBrandHeader';
import { MathRenderer } from '@/components/MathRenderer';
import {
  BookOpen,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Edit3,
  Trash2,
  GraduationCap,
  Save,
  LogOut,
  Sparkles,
  Layers,
  ChevronRight,
  Download,
  Upload,
  Send,
  Edit,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function GuruDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'bank_soal' | 'koreksi' | 'buat_soal'>('bank_soal');
  const [loading, setLoading] = useState(true);

  // Bank Soal State
  const [bankSoalList, setBankSoalList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [selectedBankSoal, setSelectedBankSoal] = useState<any>(null);

  // Modal Create Bank Soal
  const [showCreateBankModal, setShowCreateBankModal] = useState(false);
  const [newBankForm, setNewBankForm] = useState({
    kodeBank: '',
    nama: '',
    tingkat: 12,
    jurusan: 'MIPA',
    durasiMenit: 90,
    mataPelajaranId: '',
  });

  // Soal Form State
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
  });

  // Modals & Tools Tambahan Guru
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [editBankModal, setEditBankModal] = useState<any>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingBankId, setImportingBankId] = useState('');
  const [importDurasiMenit, setImportDurasiMenit] = useState<number>(90);
  const [importFileText, setImportFileText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [distributeModal, setDistributeModal] = useState<any>(null);
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
  });

  // Koreksi Essay State
  const [koreksiUjianList, setKoreksiUjianList] = useState<any[]>([]);
  const [selectedKoreksiUjianId, setSelectedKoreksiUjianId] = useState('');
  const [koreksiData, setKoreksiData] = useState<any>(null);

  useEffect(() => {
    fetchBankSoalData();
    fetchKoreksiData();
  }, []);

  const fetchBankSoalData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/guru/soal');
      const json = await res.json();
      if (json.success) {
        setBankSoalList(json.data.bankSoalList);
        setMapelList(json.data.mapelList);
        if (json.data.kelasList) {
          setKelasList(json.data.kelasList);
        }
        if (json.data.mapelList.length > 0) {
          setNewBankForm((prev) => ({ ...prev, mataPelajaranId: json.data.mapelList[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchKoreksiData = async (ujianId?: string) => {
    try {
      const url = ujianId ? `/api/guru/koreksi?ujianId=${ujianId}` : '/api/guru/koreksi';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setKoreksiUjianList(json.data.ujianList);
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
        alert('Bank Soal berhasil dibuat!');
        setShowCreateBankModal(false);
        fetchBankSoalData();
      }
    } catch (e) {
      alert('Gagal membuat bank soal');
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
          mataPelajaranId: editBankModal.mataPelajaranId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert('Bank Soal berhasil diperbarui!');
        setEditBankModal(null);
        fetchBankSoalData();
        if (selectedBankSoal?.id === editBankModal.id) {
          handleSelectBankSoal(editBankModal.id);
        }
      }
    } catch (e) {
      alert('Gagal update bank soal');
    }
  };

  const handleDeleteBankSoal = async (bankSoalId: string, nama: string) => {
    if (!confirm(`Hapus Bank Soal "${nama}" beserta seluruh soal di dalamnya?`)) return;
    try {
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_BANK_SOAL', bankSoalId }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        if (selectedBankSoal?.id === bankSoalId) setSelectedBankSoal(null);
        fetchBankSoalData();
      }
    } catch (e) {
      alert('Gagal menghapus bank soal');
    }
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
          alert('File Excel kosong atau format tidak sesuai.');
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
          alert('Tidak ditemukan baris pertanyaan soal yang valid.');
          return;
        }

        setImportFileText(JSON.stringify(parsedItems));
        alert(`Berhasil membaca ${parsedItems.length} butir soal dari file Excel. Klik "Proses Import Soal".`);
      } catch (err) {
        alert('Gagal membaca file Excel. Pastikan menggunakan format template resmi.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteImportSoal = async () => {
    if (!importingBankId) {
      alert('Pilih Bank Soal tujuan import.');
      return;
    }
    if (!importFileText) {
      alert('Silakan pilih file Excel terlebih dahulu.');
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
        alert(json.message);
        setShowImportModal(false);
        setImportFileText('');
        handleSelectBankSoal(importingBankId);
        fetchBankSoalData();
      } else {
        alert(json.message || 'Gagal import butir soal');
      }
    } catch (e) {
      alert('Terjadi kesalahan saat mengimport soal.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleExecuteKirimKeKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributeModal) return;
    if (!distributeForm.kelasIds.length) {
      alert('Pilih minimal 1 kelas tujuan.');
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
        alert(json.message);
        setDistributeModal(null);
      } else {
        alert(json.message || 'Gagal mendistribusikan ujian ke kelas');
      }
    } catch (e) {
      alert('Gagal mendistribusikan ujian ke kelas');
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
        alert('Soal berhasil disimpan!');
        handleSelectBankSoal(selectedBankSoal.id);
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
      }
    } catch (e) {
      alert('Gagal menyimpan soal');
    }
  };

  const handleDeleteSoal = async (soalId: string) => {
    if (!confirm('Hapus soal ini dari bank soal?')) return;
    try {
      const res = await fetch('/api/guru/soal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_SOAL',
          soalId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        handleSelectBankSoal(selectedBankSoal.id);
      }
    } catch (e) {
      alert('Gagal hapus soal');
    }
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
        alert('Nilai essay berhasil disimpan!');
        fetchKoreksiData(selectedKoreksiUjianId);
      }
    } catch (e) {
      alert('Gagal menyimpan nilai');
    }
  };

  // Ekspor Nilai ke Excel
  const handleExportExcel = () => {
    if (!koreksiData?.hasilList?.length) {
      alert('Belum ada data nilai untuk diekspor.');
      return;
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-white">
      {/* Topbar */}
      <header className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <SchoolBrandHeader subtitle="Portal Guru & Pembuat Soal CBT Muhipo" />

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-800 text-xs font-semibold text-rose-300 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Tabs */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('bank_soal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'bank_soal'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-700/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📚 Bank Soal & Editor
          </button>
          <button
            onClick={() => setActiveTab('koreksi')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'koreksi'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-700/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📝 Koreksi Essay & Rekap Nilai
          </button>
        </div>

        {/* TAB 1: BANK SOAL & EDITOR SOAL */}
        {activeTab === 'bank_soal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Bank Soal List */}
            <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    Daftar Bank Soal
                  </h3>
                  <p className="text-[11px] text-slate-400">Kelola soal & jadwal ujian Anda</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadTemplateSoal}
                    title="Unduh Format Excel Template Soal"
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Format Excel</span>
                  </button>
                  <button
                    onClick={() => setShowCreateBankModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Bank</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {bankSoalList.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    Belum ada Bank Soal. Klik "Tambah Bank" untuk membuat.
                  </div>
                ) : (
                  bankSoalList.map((bs) => (
                    <div
                      key={bs.id}
                      onClick={() => handleSelectBankSoal(bs.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedBankSoal?.id === bs.id
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg'
                          : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded">
                            {bs.kodeBank}
                          </span>
                          <h4 className="text-sm font-bold mt-1 text-white truncate">{bs.nama}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {bs.mataPelajaran?.nama} • Tingkat {bs.tingkat} ({bs.jurusan || 'UMUM'}) • {bs.durasiMenit || 90} Mnt
                          </p>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0 font-mono">
                          {bs._count?.soalList || 0} Soal
                        </span>
                      </div>

                      {/* Action buttons inside each bank card */}
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-800/80" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setImportingBankId(bs.id);
                            setShowImportModal(true);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-900/60 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Import Soal</span>
                        </button>
                        <button
                          onClick={() => {
                            setDistributeModal(bs);
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
                            });
                          }}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-cyan-900/60 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim ke Kelas</span>
                        </button>
                        <button
                          onClick={() => setEditBankModal(bs)}
                          className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                          title="Edit Info Bank Soal"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBankSoal(bs.id, bs.nama)}
                          className="p-1.5 rounded-xl bg-rose-950/60 text-rose-400 hover:bg-rose-900/60 cursor-pointer"
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

            {/* Right: Soal List & Editor */}
            <div className="lg:col-span-7 space-y-6">
              {selectedBankSoal ? (
                <>
                  {/* Bank Soal Header */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-xs text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                        {selectedBankSoal.kodeBank}
                      </span>
                      <h2 className="text-xl font-black text-white mt-1">{selectedBankSoal.nama}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mata Pelajaran: <b>{selectedBankSoal.mataPelajaran?.nama}</b> • Guru: <b>{selectedBankSoal.pembuat?.name}</b>
                      </p>
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
                        <span>Import Excel</span>
                      </button>
                      <button
                        onClick={() => {
                          setDistributeModal(selectedBankSoal);
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
                          });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim ke Kelas</span>
                      </button>
                    </div>
                  </div>

                  {/* Form Tambah / Edit Soal */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-amber-400" />
                      Editor Soal CBT (Mendukung KaTeX Math & Rumus)
                    </h3>

                    <form onSubmit={handleSaveSoal} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">
                            Tipe Soal
                          </label>
                          <select
                            value={soalForm.tipeSoal}
                            onChange={(e) => setSoalForm({ ...soalForm, tipeSoal: e.target.value })}
                            className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                          >
                            <option value="PG">Pilihan Ganda (PG Tunggal)</option>
                            <option value="PG_KOMPLEKS">Pilihan Ganda Kompleks (Multi Jawaban)</option>
                            <option value="BENAR_SALAH">Benar / Salah</option>
                            <option value="ISIAN">Isian Singkat</option>
                            <option value="ESAI">Uraian / Essay</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">
                            Bobot Nilai
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={soalForm.bobot}
                            onChange={(e) => setSoalForm({ ...soalForm, bobot: Number(e.target.value) })}
                            className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">
                          Pertanyaan / Soal (Gunakan <code>$...$</code> untuk LaTeX inline, <code>$$...$$</code> untuk display formula):
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={soalForm.pertanyaan}
                          onChange={(e) => setSoalForm({ ...soalForm, pertanyaan: e.target.value })}
                          placeholder="Tulis pertanyaan soal di sini..."
                          className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-sans text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      {/* Live Math Preview */}
                      {soalForm.pertanyaan && (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-amber-400 font-bold uppercase block mb-1">
                            Live Preview Render:
                          </span>
                          <MathRenderer content={soalForm.pertanyaan} />
                        </div>
                      )}

                      {/* Opsi Jawaban untuk PG */}
                      {(soalForm.tipeSoal === 'PG' || soalForm.tipeSoal === 'PG_KOMPLEKS') && (
                        <div className="space-y-3 pt-2">
                          <label className="block text-slate-300 font-semibold">
                            Pilihan Jawaban & Kunci:
                          </label>
                          {soalForm.opsiJawaban.map((opsi, idx) => (
                            <div key={opsi.label} className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-slate-800 font-bold flex items-center justify-center text-slate-200">
                                {opsi.label}
                              </span>
                              <input
                                type="text"
                                value={opsi.konten}
                                onChange={(e) => {
                                  const updated = [...soalForm.opsiJawaban];
                                  updated[idx].konten = e.target.value;
                                  setSoalForm({ ...soalForm, opsiJawaban: updated });
                                }}
                                placeholder={`Konten pilihan ${opsi.label}...`}
                                className="flex-1 p-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...soalForm.opsiJawaban];
                                  if (soalForm.tipeSoal === 'PG') {
                                    // Hanya satu kunci benar
                                    updated.forEach((o, i) => (o.isBenar = i === idx));
                                  } else {
                                    // Multi kunci
                                    updated[idx].isBenar = !updated[idx].isBenar;
                                  }
                                  setSoalForm({ ...soalForm, opsiJawaban: updated });
                                }}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                  opsi.isBenar
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {opsi.isBenar ? '✓ Kunci Benar' : 'Jadikan Kunci'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Kunci untuk Isian / Rubrik Essay */}
                      {(soalForm.tipeSoal === 'ISIAN' || soalForm.tipeSoal === 'ESAI') && (
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">
                            {soalForm.tipeSoal === 'ISIAN' ? 'Kunci Jawaban Tepat (Teks/Angka):' : 'Rubrik / Pedoman Penskoran Guru:'}
                          </label>
                          <input
                            type="text"
                            value={soalForm.kunciJawabanTeks}
                            onChange={(e) => setSoalForm({ ...soalForm, kunciJawabanTeks: e.target.value })}
                            placeholder="Contoh kunci jawaban..."
                            className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-700/30 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Simpan Soal ke Bank Soal</span>
                      </button>
                    </form>
                  </div>

                  {/* List Soal yang Sudah Ada */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-white">
                      Daftar Soal Tersimpan ({selectedBankSoal.soalList.length} Butir Soal)
                    </h3>

                    {selectedBankSoal.soalList.map((s: any, index: number) => (
                      <div
                        key={s.id}
                        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-amber-400">
                            Soal No. {index + 1} ({s.tipeSoal}) • Bobot: {s.bobot}
                          </span>
                          <button
                            onClick={() => handleDeleteSoal(s.id)}
                            className="text-rose-400 hover:text-rose-300 p-1 transition cursor-pointer"
                            title="Hapus Soal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-sm">
                          <MathRenderer content={s.pertanyaan} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-3xl">
                  <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-400">
                    Pilih salah satu Bank Soal di sebelah kiri untuk melihat & mengedit butir soal.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: KOREKSI ESSAY & REKAP NILAI */}
        {activeTab === 'koreksi' && (
          <div className="space-y-6">
            {/* Header & Export Excel */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block">
                  Rekapitulasi Nilai & Koreksi
                </span>
                <h2 className="text-xl font-extrabold text-white">
                  {koreksiData?.activeUjian?.judul || 'Pilih Ujian'}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedKoreksiUjianId}
                  onChange={(e) => {
                    setSelectedKoreksiUjianId(e.target.value);
                    fetchKoreksiData(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white"
                >
                  {koreksiUjianList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.kodeUjian} - {u.judul}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-700/30 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Ekspor Excel</span>
                </button>
              </div>
            </div>

            {/* List Siswa & Koreksi */}
            <div className="space-y-4">
              {koreksiData?.hasilList?.map((peserta: any) => {
                const essayAnswers = peserta.jawabanPeserta.filter((j: any) => j.soal.tipeSoal === 'ESAI');

                return (
                  <div
                    key={peserta.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          NIS: {peserta.siswa.nis || peserta.siswa.username} • {peserta.siswa.kelas?.nama}
                        </span>
                        <h4 className="text-base font-bold text-white">{peserta.siswa.name}</h4>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="text-slate-400">Nilai PG:</span>{' '}
                          <b className="text-emerald-400">{peserta.nilaiPG}</b>
                        </div>
                        <div>
                          <span className="text-slate-400">Nilai Essay:</span>{' '}
                          <b className="text-amber-400">{peserta.nilaiEsai}</b>
                        </div>
                        <div className="px-3 py-1 bg-slate-950 rounded-xl border border-slate-700">
                          <span className="text-slate-400">Total:</span>{' '}
                          <b className="text-white text-sm">{peserta.nilaiTotal}</b>
                        </div>
                      </div>
                    </div>

                    {/* Essay List */}
                    {essayAnswers.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">
                        Tidak ada soal essay pada ujian ini (Nilai otomatis terkalkulasi).
                      </p>
                    ) : (
                      <div className="space-y-3 pt-2">
                        {essayAnswers.map((j: any, i: number) => (
                          <div key={j.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                            <div className="flex justify-between font-semibold text-slate-300">
                              <span>Soal Essay #{i + 1} (Bobot Maks: {j.soal.bobot})</span>
                            </div>
                            <div className="text-slate-400 bg-slate-900 p-2.5 rounded-xl">
                              <MathRenderer content={j.soal.pertanyaan} />
                            </div>
                            <div className="pt-1">
                              <span className="text-slate-400 block font-semibold mb-1">Jawaban Siswa:</span>
                              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-white font-mono whitespace-pre-wrap">
                                {j.jawabanDipilih || '<i>(Tidak dijawab oleh siswa)</i>'}
                              </div>
                            </div>

                            {/* Scoring Input */}
                            <div className="flex items-center gap-3 pt-2">
                              <label className="text-slate-300 font-semibold">Beri Nilai Essay:</label>
                              <input
                                type="number"
                                min={0}
                                max={j.soal.bobot}
                                defaultValue={j.skor}
                                id={`score-${j.id}`}
                                className="w-24 p-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-center font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById(`score-${j.id}`) as HTMLInputElement;
                                  handleSimpanNilaiEssay(j.id, Number(input.value), peserta.id);
                                }}
                                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
                              >
                                Simpan Nilai
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Modal Buat Bank Soal Baru */}
      {showCreateBankModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-white">Buat Bank Soal Baru</h3>
            <form onSubmit={handleCreateBankSoal} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Kode Bank Soal</label>
                <input
                  type="text"
                  required
                  value={newBankForm.kodeBank}
                  onChange={(e) => setNewBankForm({ ...newBankForm, kodeBank: e.target.value.toUpperCase() })}
                  placeholder="Contoh: BS-MTK-XII-2026"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Bank Soal</label>
                <input
                  type="text"
                  required
                  value={newBankForm.nama}
                  onChange={(e) => setNewBankForm({ ...newBankForm, nama: e.target.value })}
                  placeholder="Contoh: Bank Soal PAS Matematika XII"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tingkat Kelas</label>
                  <select
                    value={newBankForm.tingkat}
                    onChange={(e) => setNewBankForm({ ...newBankForm, tingkat: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value={10}>Kelas 10</option>
                    <option value={11}>Kelas 11</option>
                    <option value={12}>Kelas 12</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jurusan</label>
                  <select
                    value={newBankForm.jurusan || 'UMUM'}
                    onChange={(e) => setNewBankForm({ ...newBankForm, jurusan: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="MIPA">MIPA / IPA</option>
                    <option value="IPS">IPS</option>
                    <option value="UMUM">Umum (Semua Jurusan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mata Pelajaran</label>
                  <select
                    value={newBankForm.mataPelajaranId}
                    onChange={(e) => setNewBankForm({ ...newBankForm, mataPelajaranId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    {mapelList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Durasi Standar (Menit)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={360}
                    value={newBankForm.durasiMenit}
                    onChange={(e) => setNewBankForm({ ...newBankForm, durasiMenit: Number(e.target.value) })}
                    placeholder="90"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateBankModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-700/30"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Edit Informasi Bank Soal</h3>
              <button
                onClick={() => setEditBankModal(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateBankSoal} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Kode Bank</label>
                <input
                  type="text"
                  required
                  value={editBankModal.kodeBank}
                  onChange={(e) => setEditBankModal({ ...editBankModal, kodeBank: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Bank Soal</label>
                <input
                  type="text"
                  required
                  value={editBankModal.nama}
                  onChange={(e) => setEditBankModal({ ...editBankModal, nama: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tingkat</label>
                  <select
                    value={editBankModal.tingkat}
                    onChange={(e) => setEditBankModal({ ...editBankModal, tingkat: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value={10}>Kelas 10</option>
                    <option value={11}>Kelas 11</option>
                    <option value={12}>Kelas 12</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jurusan</label>
                  <select
                    value={editBankModal.jurusan || 'UMUM'}
                    onChange={(e) => setEditBankModal({ ...editBankModal, jurusan: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="MIPA">MIPA / IPA</option>
                    <option value="IPS">IPS</option>
                    <option value="UMUM">Umum (Semua Jurusan)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mata Pelajaran</label>
                  <select
                    value={editBankModal.mataPelajaranId}
                    onChange={(e) => setEditBankModal({ ...editBankModal, mataPelajaranId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    {mapelList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={editBankModal.durasiMenit || 90}
                    onChange={(e) => setEditBankModal({ ...editBankModal, durasiMenit: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditBankModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Import Butir Soal dari File Excel</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Upload file Excel berisi butir soal PG, PG Kompleks, KaTeX, & Essay
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-emerald-300">Format Template Excel Resmi</h4>
                  <p className="text-[11px] text-emerald-400 mt-0.5">
                    Gunakan template standar agar proses input otomatis dan cepat.
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
                  <label className="block text-slate-300 font-semibold mb-1">
                    Pilih Bank Soal Tujuan:
                  </label>
                  <select
                    value={importingBankId}
                    onChange={(e) => setImportingBankId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium"
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
                  <label className="block text-slate-300 font-semibold mb-1">
                    Durasi (Menit):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={importDurasiMenit}
                    onChange={(e) => setImportDurasiMenit(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Pilih File Excel (.xlsx / .xls):
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUploadSoal}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600/20 file:text-emerald-300 hover:file:bg-emerald-600/30 file:cursor-pointer border border-slate-700 rounded-xl bg-slate-950 p-1.5"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-cyan-400" />
                  <span>Kirim / Jadwalkan Ujian ke Kelas</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Bank Soal: <b>{distributeModal.nama}</b> ({distributeModal.kodeBank})
                </p>
              </div>
              <button
                onClick={() => setDistributeModal(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteKirimKeKelas} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Ujian</label>
                  <input
                    type="text"
                    required
                    value={distributeForm.kodeUjian}
                    onChange={(e) => setDistributeForm({ ...distributeForm, kodeUjian: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    required
                    value={distributeForm.durasiMenit}
                    onChange={(e) => setDistributeForm({ ...distributeForm, durasiMenit: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Judul Ujian</label>
                <input
                  type="text"
                  required
                  value={distributeForm.judul}
                  onChange={(e) => setDistributeForm({ ...distributeForm, judul: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              {/* Pilihan Rombel Kelas Target */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Pilih Kelas Tujuan Ujian (Centang Kelas):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-700">
                  {kelasList.map((k) => {
                    const isChecked = distributeForm.kelasIds.includes(k.id);
                    return (
                      <label
                        key={k.id}
                        className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                          isChecked
                            ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
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
                        <span className="truncate">{k.nama}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Opsi Anti-Cheat & Acak */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributeForm.lockBrowser}
                    onChange={(e) => setDistributeForm({ ...distributeForm, lockBrowser: e.target.checked })}
                  />
                  <span>Anti-Cheat</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributeForm.acakSoal}
                    onChange={(e) => setDistributeForm({ ...distributeForm, acakSoal: e.target.checked })}
                  />
                  <span>Acak Soal</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
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
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
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
    </div>
  );
}
