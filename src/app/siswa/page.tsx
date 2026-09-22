'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { AppFooter } from '@/components/layout/AppFooter';
import {
  Clock,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Play,
  CalendarX,
  FileQuestion,
  CalendarDays,
  Award,
  Archive,
  CalendarCheck,
  Lock,
  Search,
  X,
  Layers,
  Hourglass,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

export default function SiswaPortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [siswa, setSiswa] = useState<any>(null);
  
  // Master lists dari API
  const [semuaList, setSemuaList] = useState<any[]>([]);
  const [availableModuls, setAvailableModuls] = useState<string[]>([]);
  const [stats, setStats] = useState<any>({
    totalSemua: 0,
    totalSiap: 0,
    totalSedangMengerjakan: 0,
    totalHariIni: 0,
    totalMendatang: 0,
    totalSelesai: 0,
    totalArsip: 0,
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'SEMUA' | 'SIAP' | 'TODAY' | 'MENDATANG' | 'ARSIP'>('SEMUA');
  const [selectedModul, setSelectedModul] = useState<string>('SEMUA');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(999);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // App settings & actions
  const [pengaturan, setPengaturan] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchSiswaData();
  }, []);

  const fetchSiswaData = async () => {
    try {
      setLoading(true);
      const [userRes, ujianRes, settingRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/siswa/ujian'),
        fetch('/api/pengaturan'),
      ]);

      const [userJson, ujianJson, settingJson] = await Promise.all([
        userRes.json(),
        ujianRes.json(),
        settingRes.json(),
      ]);

      if (!userJson.success || userJson.user.role !== 'SISWA') {
        router.push('/login');
        return;
      }
      setSiswa(userJson.user);

      if (settingJson.success && settingJson.data) {
        setPengaturan(settingJson.data);
      }

      if (ujianJson.success && ujianJson.data) {
        const rawList = Array.isArray(ujianJson.data.semuaList)
          ? ujianJson.data.semuaList
          : Array.isArray(ujianJson.data.ujianList)
          ? ujianJson.data.ujianList
          : [];

        setSemuaList(rawList);
        setAvailableModuls(ujianJson.data.availableModuls || []);
        if (ujianJson.data.stats) {
          setStats(ujianJson.data.stats);
        }

        if (ujianJson.data.siswa) {
          setSiswa((prev: any) => ({ ...prev, ...ujianJson.data.siswa }));
        }
      } else {
        setSemuaList([]);
      }
    } catch (e) {
      console.error('Gagal memuat portal siswa:', e);
      setSemuaList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'POST' });
    router.push('/login');
  };

  const handleStartExam = async (ujianId: string) => {
    setActionError('');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/siswa/ujian/${ujianId}/mulai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/siswa/ujian/${ujianId}`);
      } else {
        setActionError(json.message || 'Gagal memulai ujian.');
      }
    } catch (e) {
      setActionError('Terjadi gangguan koneksi server.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, selectedModul, entriesPerPage]);

  // Client-Side High Performance Filtering & Searching
  const filteredList = useMemo(() => {
    return semuaList.filter((item) => {
      // 1. Filter Tab
      let matchTab = true;
      if (activeTab === 'SIAP') {
        matchTab = item.isReady || item.isWorking;
      } else if (activeTab === 'TODAY') {
        matchTab = item.isToday && !item.isArsip;
      } else if (activeTab === 'MENDATANG') {
        matchTab = item.isFuture && !item.isArsip && item.statusPeserta !== 'SELESAI';
      } else if (activeTab === 'ARSIP') {
        matchTab = item.isArsip || item.isFinished;
      }

      // 2. Filter Modul
      let matchModul = true;
      if (selectedModul !== 'SEMUA') {
        matchModul = (item.modulNama || '').toLowerCase() === selectedModul.toLowerCase();
      }

      // 3. Filter Search Query
      let matchSearch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        matchSearch =
          (item.judul || '').toLowerCase().includes(q) ||
          (item.kodeUjian || '').toLowerCase().includes(q) ||
          (item.mataPelajaran || '').toLowerCase().includes(q) ||
          (item.modulNama || '').toLowerCase().includes(q) ||
          (item.guruPengampu || '').toLowerCase().includes(q);
      }

      return matchTab && matchModul && matchSearch;
    });
  }, [semuaList, activeTab, selectedModul, searchQuery]);

  // Pagination calculation
  const totalItems = filteredList.length;
  const effectivePerPage = entriesPerPage === 999 ? (totalItems > 0 ? totalItems : 1) : entriesPerPage;
  const totalPages = Math.ceil(totalItems / effectivePerPage) || 1;
  const paginatedList = useMemo(() => {
    if (entriesPerPage === 999) return filteredList;
    const startIndex = (currentPage - 1) * entriesPerPage;
    return filteredList.slice(startIndex, startIndex + entriesPerPage);
  }, [filteredList, currentPage, entriesPerPage]);

  // Counts for tab badges
  const counts = useMemo(() => {
    const list = semuaList;
    return {
      semua: list.length,
      siap: list.filter((i) => i.isReady || i.isWorking).length,
      today: list.filter((i) => i.isToday && !i.isArsip).length,
      mendatang: list.filter((i) => i.isFuture && !i.isArsip && i.statusPeserta !== 'SELESAI').length,
      arsip: list.filter((i) => i.isArsip || i.isFinished).length,
    };
  }, [semuaList]);

  const activeBg = pengaturan?.backgroundUrl || '/muhipo-log.jpg';
  const academicYear = pengaturan?.academicYear || '2026/2027';
  const semester = pengaturan?.semester || 'Ganjil';

  const todayDateString = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen relative flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-300 overflow-x-hidden">
      {/* 1. Background Wallpaper */}
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

      {/* 2. Glassmorphism Backdrop */}
      <div className="fixed inset-0 bg-slate-100/80 dark:bg-slate-950/65 dark:bg-gradient-to-b dark:from-slate-950/75 dark:via-slate-900/60 dark:to-slate-950/80 backdrop-blur-[2px] -z-20 pointer-events-none transition-colors duration-300" />

      {/* 3. Navbar */}
      <AppNavbar
        appTitle={pengaturan?.appTitle ? pengaturan.appTitle : 'CBT'}
        subtitle="Sistem Ujian SMA Muhammadiyah 1 Ponorogo"
        logoUrl={pengaturan?.logoUrl}
        userProfile={{
          name: siswa?.name || 'Siswa CBT',
          role: siswa?.kelas?.nama ? `KELAS ${siswa.kelas.nama}` : siswa?.kelas ? `KELAS ${siswa.kelas}` : 'SISWA',
          username: siswa?.username,
        }}
        actions={
          <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-700 dark:text-blue-200 font-bold text-xs shrink-0 backdrop-blur-md shadow-2xs">
            <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300 shrink-0" />
            <span>T.A {academicYear} ({semester})</span>
          </div>
        }
        onLogout={handleLogout}
      />

      {/* 4. Main Content */}
      <main className="p-3.5 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-5 flex-1 relative z-10">
        
        {/* Banner Identitas Peserta */}
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs backdrop-blur-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
              {siswa?.name || 'Memuat Data Siswa...'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>No. Peserta: <b className="text-blue-600 dark:text-blue-400 font-mono font-bold">{siswa?.nomorPeserta || siswa?.username || '-'}</b></span>
              <span>•</span>
              <span>Kelas: <b className="text-slate-800 dark:text-slate-200 font-semibold">{siswa?.kelas?.nama || siswa?.kelas || '-'}</b></span>
              {siswa?.ruangUjian && (
                <>
                  <span>•</span>
                  <span>Ruang: <b className="text-slate-800 dark:text-slate-200 font-semibold">{siswa.ruangUjian}</b></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Notifikasi / Error Alert jika ada */}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 shadow-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-medium">{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError('')}
              className="ml-auto text-rose-400 hover:text-rose-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Peringatan Pengawasan CBT Ringkas & Elegan */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-3 sm:py-3 sm:px-4.5 shadow-xs backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 min-w-0 leading-relaxed">
              <span className="font-bold text-amber-900 dark:text-amber-200 mr-1.5">
                Peringatan!!
              </span>
              <span>
                Dilarang keluar dari aplikasi ujian. Akun akan <b>otomatis langsung terkunci</b> jika terjadi <b>1 kali pelanggaran</b> (berpindah aplikasi / keluar fullscreen).
              </span>
            </div>
          </div>
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-[11px] font-semibold text-amber-800 dark:text-amber-300 shrink-0">
            Anti-Curang Aktif
          </span>
        </div>

        {/* Section: Search Bar Mandiri */}
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs backdrop-blur-xl">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tes (contoh: MTK, Penilaian Akhir, Nama Topik, Modul, Guru)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-0.5"
                title="Hapus Pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Kotak Area Soal / Jadwal Ujian (Scrollable Box) */}
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs backdrop-blur-xl flex flex-col space-y-3.5">
          {/* Header Info Kotak Soal */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="font-medium">
              Menampilkan <b className="text-slate-900 dark:text-white font-bold">{filteredList.length}</b> jadwal tes
              {searchQuery && (
                <span> untuk pencarian &quot;<b className="text-blue-600 dark:text-blue-400">{searchQuery}</b>&quot;</span>
              )}
            </div>
          </div>

          {/* Isi Kotak yang Dapat Di-Scroll */}
          <div className="max-h-[520px] overflow-y-auto pr-1 sm:pr-1.5 space-y-4">
            {loading ? (
              <div className="text-center py-16 text-slate-400 text-xs animate-pulse space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                <div>Memuat daftar jadwal tes untuk Anda...</div>
              </div>
            ) : filteredList.length === 0 ? (
              /* Empty State */
              <div className="text-center py-14 p-6 sm:p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-400 flex items-center justify-center mx-auto">
                  <CalendarX className="w-6 h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                  {searchQuery
                    ? 'Tidak Ditemukan Jadwal Tes yang Cocok'
                    : 'Belum Ada Jadwal Ujian Aktif'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  {searchQuery
                    ? `Tidak ada jadwal tes dengan kata kunci "${searchQuery}". Silakan periksa ejaan atau hapus kata kunci pencarian.`
                    : 'Saat ini belum ada jadwal ujian yang ditugaskan untuk akun Anda.'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600 dark:text-blue-300 text-xs font-bold transition cursor-pointer mt-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Hapus Pencarian</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pb-1">
                {paginatedList.map((ujian) => {
                  const isFinished = ujian.statusPeserta === 'SELESAI';
                  const isWorking = ujian.statusPeserta === 'SEDANG_MENGERJAKAN';
                  const scheduledStart = ujian.waktuMulai ? new Date(ujian.waktuMulai) : null;
                  const scheduledEnd = ujian.waktuSelesai ? new Date(ujian.waktuSelesai) : null;
                  const now = new Date();
                  const isNotStartedYet = scheduledStart ? now < scheduledStart : false;
                  const isExpired = scheduledEnd ? now > scheduledEnd : false;

                  // Format date & time
                  const dateStartStr = scheduledStart
                    ? scheduledStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '-';
                  const timeStartStr = scheduledStart
                    ? scheduledStart.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    : '';
                  const timeEndStr = scheduledEnd
                    ? scheduledEnd.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div
                      key={ujian.ujianId || ujian.pesertaUjianId}
                      className={`bg-slate-50/80 dark:bg-slate-950/60 border rounded-2xl p-4 shadow-2xs hover:shadow-sm hover:border-blue-500/50 transition-all flex flex-col justify-between group ${
                        isFinished
                          ? 'border-emerald-500/30 dark:border-emerald-500/20'
                          : isWorking
                          ? 'border-amber-500/40 dark:border-amber-500/30 ring-1 ring-amber-500/20'
                          : ujian.isReady
                          ? 'border-blue-500/40 dark:border-blue-500/30 ring-1 ring-blue-500/20'
                          : 'border-slate-200/90 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Header Card: Modul & Status Badge */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {ujian.modulNama && ujian.modulNama !== 'Default' ? (
                              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-600/15 border border-blue-200 dark:border-blue-400/20 truncate max-w-[150px]">
                                {ujian.modulNama}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                Ujian CBT
                              </span>
                            )}
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                              isFinished
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                                : isWorking
                                ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 animate-pulse'
                                : isNotStartedYet
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                : isExpired
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                                : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                            }`}
                          >
                            {isFinished
                              ? '✓ SELESAI'
                              : isWorking
                              ? 'SEDANG DIKERJAKAN'
                              : isNotStartedYet
                              ? 'BELUM DIBUKA'
                              : isExpired
                              ? 'WAKTU HABIS'
                              : 'SIAP DIKERJAKAN'}
                          </span>
                        </div>

                        {/* Judul Ujian */}
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {ujian.judul}
                        </h3>

                        {/* Metadata Detail */}
                        <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 pt-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="truncate font-semibold">{ujian.mataPelajaran || 'Mata Pelajaran'}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>{ujian.durasiMenit} Menit</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {ujian.jumlahSoal !== undefined && (
                                <div className="flex items-center gap-1">
                                  <FileQuestion className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                  <span>{ujian.jumlahSoal} Soal</span>
                                </div>
                              )}
                              {ujian.minJawaban && (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.2 rounded">
                                  Min: {ujian.minJawaban} Jwb
                                </span>
                              )}
                            </div>
                          </div>

                          {ujian.waktuMulai && (
                            <div className="flex items-center gap-1 text-[10.5px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-100 dark:border-white/5">
                              <CalendarDays className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate">
                                {dateStartStr} ({timeStartStr} {timeEndStr ? `- ${timeEndStr}` : ''})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bagian Bawah: Skor / Tombol Aksi */}
                      <div className="pt-3 border-t border-slate-200/80 dark:border-white/5 mt-3 space-y-2">
                        {isFinished ? (
                          <>
                            {ujian.tampilkanHasil ? (
                              ujian.isHanyaPG || ujian.isKoreksiSelesai ? (
                                <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-500/30 flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                                      <Award className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 truncate">
                                      <div className="text-[10.5px] font-semibold text-emerald-800 dark:text-emerald-300 truncate">
                                        {ujian.isHanyaPG ? 'Nilai PG Otomatis' : 'Nilai Akhir Ujian'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                                      {ujian.nilaiTotal ?? ujian.nilaiPG ?? 0}
                                    </span>
                                    <span className="text-[9px] font-medium text-slate-400 ml-0.5">/100</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-500/30 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                                      <Award className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="text-[10px] font-semibold text-blue-800 dark:text-blue-300">
                                        Skor PG: <b className="font-mono">{ujian.nilaiPG ?? 0}</b>
                                      </div>
                                      <div className="text-[9px] text-amber-600 dark:text-amber-400">
                                        Koreksi esai berjalan
                                      </div>
                                    </div>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[9px] font-bold">
                                    Proses
                                  </span>
                                </div>
                              )
                            ) : (
                              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px]">
                                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  Ujian Telah Selesai
                                </span>
                                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                  Tuntas
                                </span>
                              </div>
                            )}
                          </>
                        ) : isNotStartedYet ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Dibuka {timeStartStr} WIB</span>
                          </button>
                        ) : isExpired ? (
                          <div className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Jadwal Ujian Telah Berakhir
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartExam(ujian.ujianId || ujian.id)}
                            disabled={actionLoading}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer transition disabled:opacity-50 active:scale-[0.99]"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>{isWorking ? 'Lanjutkan Ujian' : 'Kerjakan Ujian'}</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Controls di dalam Kotak */}
          {totalPages > 1 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Halaman <b className="text-slate-900 dark:text-white font-bold">{currentPage}</b> dari{' '}
                <b className="text-slate-900 dark:text-white font-bold">{totalPages}</b>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Number Buttons */}
                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                  .map((pageNum, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && pageNum - prev > 1;

                    return (
                      <React.Fragment key={pageNum}>
                        {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {pageNum}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 5. AppFooter */}
      <AppFooter />
    </div>
  );
}
