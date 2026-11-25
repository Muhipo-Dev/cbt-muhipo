'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { AppFooter } from '@/components/layout/AppFooter';
import { useRealtimeServerClock } from '@/lib/time-sync';
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
  Smartphone,
  Download,
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
  const serverClock = useRealtimeServerClock(30000);

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
    <div className="min-h-screen relative flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* Navbar Sejajar max-w-6xl */}
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
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs shrink-0">
            <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>T.A {academicYear} ({semester})</span>
          </div>
        }
        onLogout={handleLogout}
      />

      {/* Main Content (Sejajar Presisi Kiri-Kanan dengan Navbar, Tanpa Scroll-di-dalam-Scroll yang Miring/Offset) */}
      <main className="px-3 sm:px-5 lg:px-6 py-4 sm:py-6 max-w-6xl w-full mx-auto space-y-4 flex-1">
        {/* Panel Terpadu: Identitas Peserta + Filter Status + Pencarian */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {siswa?.name || 'Memuat Data Peserta...'}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>
                    No. Peserta:{' '}
                    <b className="text-slate-900 dark:text-slate-100 font-mono">
                      {siswa?.nomorPeserta || siswa?.username || '-'}
                    </b>
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span>
                    Kelas:{' '}
                    <b className="text-slate-900 dark:text-slate-100">
                      {siswa?.kelas?.nama || siswa?.kelas || '-'}
                    </b>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchSiswaData}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition touch-manipulation"
                title="Muat Ulang Jadwal Ujian"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                <span>Segarkan</span>
              </button>
              <a
                href="/api/seb/config"
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition touch-manipulation"
                title="Unduh file konfigurasi Safe Exam Browser (.seb)"
              >
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Config SEB</span>
              </a>
            </div>
          </div>

          {/* Filter Tab & Search Input Sejajar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 md:pb-0">
              {(
                [
                  { id: 'SEMUA', label: 'Semua', count: counts.semua },
                  { id: 'SIAP', label: 'Siap Ujian', count: counts.siap },
                  { id: 'TODAY', label: 'Hari Ini', count: counts.today },
                  { id: 'ARSIP', label: 'Selesai', count: counts.arsip },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition cursor-pointer touch-manipulation ${
                      isActive
                        ? 'bg-slate-900 dark:bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-72 lg:w-80 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari mata pelajaran atau judul tes..."
                className="w-full h-10 pl-9 pr-9 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-base sm:text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Hapus pencarian"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Peringatan Tata Tertib Ujian Ringkas (Garis Aksen Kiri Tegas, Tanpa Gradien Berlebihan) */}
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/60 border-l-4 border-l-amber-500 rounded-lg px-3.5 py-2.5 flex items-start sm:items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          <p className="leading-relaxed">
            <b className="text-slate-900 dark:text-white">Tata Tertib Kiosk CBT:</b> Selama ujian berlangsung layar dikunci penuh. Dilarang keluar layar penuh atau berpindah aplikasi (batas maksimal <b>10x pelanggaran</b> sebelum akun terkunci otomatis).
          </p>
        </div>

        {/* Notifikasi / Error Alert jika ada */}
        {actionError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium flex-1">{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError('')}
              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Daftar Jadwal Ujian (Simetris Penuh Tanpa Offset Scrollbar Dalam) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-0.5">
            <span>
              Menampilkan <b className="text-slate-900 dark:text-white">{filteredList.length}</b> jadwal ujian
              {searchQuery && (
                <span>
                  {' '}untuk kata kunci &quot;<b className="text-blue-600 dark:text-blue-400">{searchQuery}</b>&quot;
                </span>
              )}
            </span>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-16 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600" />
              <div>Memuat jadwal ujian...</div>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-14 px-6 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 flex items-center justify-center mx-auto">
                <CalendarX className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {searchQuery ? 'Jadwal Ujian Tidak Ditemukan' : 'Belum Ada Jadwal Ujian'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? `Tidak ditemukan ujian dengan kata kunci "${searchQuery}".`
                  : 'Saat ini belum ada jadwal ujian aktif untuk kelas Anda.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer mt-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset Pencarian</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {paginatedList.map((ujian) => {
                const isFinished = ujian.statusPeserta === 'SELESAI';
                const isWorking =
                  ujian.statusPeserta === 'SEDANG_MENGERJAKAN' &&
                  (ujian.sisaDetik === undefined || ujian.sisaDetik > 0);
                const scheduledStart = ujian.waktuMulai ? new Date(ujian.waktuMulai) : null;
                const scheduledEnd = ujian.waktuSelesai ? new Date(ujian.waktuSelesai) : null;
                const now = serverClock.date;
                const isNotStartedYet = scheduledStart ? now < scheduledStart : false;
                const isExpired = !isWorking && (scheduledEnd ? now > scheduledEnd : false);

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
                    className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between ${
                      isWorking
                        ? 'border-amber-400 dark:border-amber-600/70'
                        : ujian.isReady
                        ? 'border-blue-300 dark:border-blue-800'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header Card: Modul & Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 truncate max-w-[150px]">
                          {ujian.modulNama && ujian.modulNama !== 'Default' ? ujian.modulNama : 'Ujian CBT'}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0 border ${
                            isFinished
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : isWorking
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                              : isNotStartedYet
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              : isExpired
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          {isFinished
                            ? 'Selesai'
                            : isWorking
                            ? 'Berlangsung'
                            : isNotStartedYet
                            ? 'Belum Dibuka'
                            : isExpired
                            ? 'Berakhir'
                            : 'Siap Ujian'}
                        </span>
                      </div>

                      {/* Judul Ujian & Mapel */}
                      <div>
                        <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                          {ujian.judul}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{ujian.mataPelajaran || 'Mata Pelajaran'}</span>
                        </p>
                      </div>

                      {/* Tabel Info Ringkas Terstruktur */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{ujian.durasiMenit} Menit</span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          <FileQuestion className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{ujian.jumlahSoal ?? '-'} Soal</span>
                        </div>
                        {ujian.waktuMulai && (
                          <div className="col-span-2 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {dateStartStr} • {timeStartStr}{timeEndStr ? `–${timeEndStr}` : ''} WIB
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bagian Bawah: Skor / Tombol Aksi */}
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                      {isFinished ? (
                        ujian.tampilkanHasil ? (
                          ujian.isHanyaPG || ujian.isKoreksiSelesai ? (
                            <div className="px-3 py-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Nilai Akhir</span>
                              </span>
                              <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                                {ujian.nilaiTotal ?? ujian.nilaiPG ?? 0}
                                <span className="text-[10px] font-normal text-slate-500">/100</span>
                              </span>
                            </div>
                          ) : (
                            <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                              <span className="text-slate-600 dark:text-slate-300">
                                Skor PG: <b className="font-mono">{ujian.nilaiPG ?? 0}</b>
                              </span>
                              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                Menunggu Koreksi Esai
                              </span>
                            </div>
                          )
                        ) : (
                          <div className="min-h-[40px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Jawaban Terkumpul</span>
                            </span>
                            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                              Tuntas
                            </span>
                          </div>
                        )
                      ) : isNotStartedYet ? (
                        <button
                          type="button"
                          disabled
                          className="min-h-[42px] w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Dibuka Pukul {timeStartStr} WIB</span>
                        </button>
                      ) : isExpired ? (
                        <div className="min-h-[42px] w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-medium text-slate-500 dark:text-slate-400">
                          Jadwal Berakhir
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartExam(ujian.ujianId || ujian.id)}
                          disabled={actionLoading}
                          className={`min-h-[44px] w-full py-2.5 px-4 rounded-lg text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 active:scale-[0.99] touch-manipulation ${
                            isWorking
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>{isWorking ? 'Lanjutkan Ujian' : 'Mulai Kerjakan'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Halaman <b className="text-slate-900 dark:text-white">{currentPage}</b> dari{' '}
                <b className="text-slate-900 dark:text-white">{totalPages}</b>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

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
                          className={`min-w-[36px] min-h-[36px] rounded-lg text-xs font-bold transition cursor-pointer border ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
