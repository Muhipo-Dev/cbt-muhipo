'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { AppFooter } from '@/components/layout/AppFooter';
import {
  Clock,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Check,
  AlertTriangle,
  UserCheck,
  Play,
  CalendarX,
  FileQuestion,
  CalendarDays,
  Sparkles,
  School,
  FileSpreadsheet,
  Award,
  ShieldAlert,
  HelpCircle,
  Smartphone,
  Archive,
  CalendarCheck,
  History,
  Lock,
} from 'lucide-react';

export default function SiswaPortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [siswa, setSiswa] = useState<any>(null);
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [arsipList, setArsipList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'arsip'>('today');
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
        const list = Array.isArray(ujianJson.data)
          ? ujianJson.data
          : Array.isArray(ujianJson.data.ujianList)
          ? ujianJson.data.ujianList
          : [];
        setUjianList(list);

        const arsip = Array.isArray(ujianJson.data?.arsipList)
          ? ujianJson.data.arsipList
          : [];
        setArsipList(arsip);

        if (ujianJson.data.siswa) {
          setSiswa((prev: any) => ({ ...prev, ...ujianJson.data.siswa }));
        }
      } else {
        setUjianList([]);
        setArsipList([]);
      }
    } catch (e) {
      console.error(e);
      setUjianList([]);
      setArsipList([]);
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

  const activeBg = pengaturan?.backgroundUrl || '/muhipo-front.jpg';
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
      {/* 1. Latar Belakang Wallpaper Sekolah Terpadu */}
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

      {/* 3. AppNavbar Terpadu */}
      <AppNavbar
        appTitle={pengaturan?.appTitle && pengaturan?.appTitle !== 'CBT' && pengaturan?.appTitle !== 'CBT MUHIPO' ? pengaturan.appTitle : 'CBT SMA MUHIPO'}
        subtitle="Sistem Ujian"
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

      {/* 4. Main Content Dashboard Siswa */}
      <main className="p-3.5 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6 flex-1 relative z-10">
        {/* Banner Identitas Peserta Ujian Compact & Bersih */}
        <div className="bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs dark:shadow-lg backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                {siswa?.name || 'Memuat Data Siswa...'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>ID: <b className="text-blue-600 dark:text-blue-400 font-mono font-bold">{siswa?.username || '-'}</b></span>
                {siswa?.nomorPeserta && (
                  <>
                    <span>•</span>
                    <span>No. Peserta: <b className="text-blue-600 dark:text-blue-400 font-mono font-bold">{siswa?.nomorPeserta}</b></span>
                  </>
                )}
                <span>•</span>
                <span>Kelas: <b className="text-slate-800 dark:text-slate-200 font-semibold">{siswa?.kelas?.nama || siswa?.kelas || '-'}</b></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs self-stretch sm:self-auto justify-end">
            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Peserta Terverifikasi
            </span>
          </div>
        </div>

        {/* Notifikasi / Error Alert jika ada */}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 shadow-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Informasi Pengawasan & Izin Aplikasi Chrome */}
        <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-3.5 sm:p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 mb-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 tracking-wide">
              Pemberitahuan Pengawasan Ujian
            </span>
            <span className="text-[11px] text-amber-800/80 dark:text-amber-300/70 hidden md:inline">
              — Mohon perhatikan dan ikuti instruksi pengawasan berikut:
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50/60 dark:bg-slate-950/50 border border-blue-100/80 dark:border-white/5">
              <span className="w-5 h-5 rounded-lg bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
              <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium leading-tight">Wajib gunakan Chrome</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/60 dark:bg-slate-950/50 border border-amber-100/80 dark:border-white/5">
              <span className="w-5 h-5 rounded-lg bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
              <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium leading-tight">Izinkan semua pesan chrome setelah klik kerjakan</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/60 dark:bg-slate-950/50 border border-emerald-100/80 dark:border-white/5">
              <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
              <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium leading-tight">Kerjakan langsung di layar penuh</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-50/60 dark:bg-slate-950/50 border border-purple-100/80 dark:border-white/5">
              <span className="w-5 h-5 rounded-lg bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">4</span>
              <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium leading-tight">Pelanggaran dicatat langsung oleh sistem</span>
            </div>
          </div>
        </div>

        {/* Section: Filter Tab & Daftar Jadwal Ujian */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/75 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-xl">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>{activeTab === 'today' ? 'Jadwal Ujian Hari Ini' : 'Arsip Ujian Selesai'}</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-700">
                  {todayDateString}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeTab === 'today'
                  ? 'Menampilkan jadwal mata pelajaran yang diuji pada hari ini sesuai setting tanggal ujian.'
                  : 'Daftar riwayat ujian yang telah selesai dilaksanakan pada hari-hari sebelumnya.'}
              </p>
            </div>

            {/* Tab Switcher: Ujian Hari Ini vs Arsip */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/5 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('today')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'today'
                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Hari Ini</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-800 text-[10px]">
                  {ujianList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('arsip')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'arsip'
                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Arsip Ujian</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
                  {arsipList.length}
                </span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-14 bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl text-slate-400 text-xs animate-pulse backdrop-blur-xl">
              Memeriksa jadwal ujian Anda...
            </div>
          ) : activeTab === 'today' ? (
            /* TAB HARI INI */
            ujianList.length === 0 ? (
              <div className="text-center py-16 bg-white/85 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-sm dark:shadow-xl space-y-3 backdrop-blur-xl">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto shadow-inner">
                  <CalendarX className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Belum Ada Jadwal Ujian Hari Ini
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Tidak ada sesi ujian yang dijadwalkan pada hari ini ({todayDateString}) untuk kelas Anda. Ujian yang telah lewat otomatis tersimpan di tab Arsip Ujian.
                </p>
                {arsipList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('arsip')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer mt-2"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Lihat Riwayat Arsip Ujian ({arsipList.length})</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {ujianList.map((ujian) => {
                  const isFinished = ujian.statusPeserta === 'SELESAI';
                  const isWorking = ujian.statusPeserta === 'SEDANG_MENGERJAKAN';
                  const scheduledStart = ujian.waktuMulai ? new Date(ujian.waktuMulai) : null;
                  const isNotStartedYet = scheduledStart ? new Date() < scheduledStart : false;

                  return (
                    <div
                      key={ujian.ujianId || ujian.id}
                      className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl space-y-4 hover:border-blue-500/50 transition-all flex flex-col justify-between backdrop-blur-xl group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-600/15 border border-blue-200 dark:border-blue-400/20">
                            {ujian.kodeUjian}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isFinished
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                                : isWorking
                                ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                                : isNotStartedYet
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                            }`}
                          >
                            {isFinished
                              ? '✓ SELESAI'
                              : isWorking
                              ? 'SEDANG MENGERJAKAN'
                              : isNotStartedYet
                              ? 'MENUNGGU WAKTU'
                              : 'SIAP DIKERJAKAN'}
                          </span>
                        </div>

                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {ujian.judul}
                        </h3>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="truncate font-semibold">{ujian.mataPelajaran || 'Mata Pelajaran'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>{ujian.durasiMenit} Menit</span>
                          </div>
                          {ujian.waktuMulai && (
                            <div className="flex items-center gap-1.5 col-span-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <CalendarDays className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>
                                Jadwal: <b>{new Date(ujian.waktuMulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</b>
                                {ujian.waktuSelesai && ` s.d. ${new Date(ujian.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`}
                              </span>
                            </div>
                          )}
                          {ujian.jumlahSoal !== undefined && (
                            <div className="flex items-center gap-1.5 col-span-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <FileQuestion className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                              <span>Total Butir Soal: <b>{ujian.jumlahSoal} Butir</b></span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2.5">
                        {isFinished ? (
                          <>
                            {ujian.isHanyaPG || ujian.isKoreksiSelesai ? (
                              <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-500/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                    <Award className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                                      {ujian.isHanyaPG ? 'Nilai Pilihan Ganda (Otomatis)' : 'Nilai Akhir Ujian (Terkoreksi)'}
                                    </div>
                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80">
                                      {ujian.isHanyaPG ? '100% Soal Objektif / PG' : 'Termasuk Hasil Koreksi Isian/Esai'}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                                    {ujian.nilaiTotal ?? ujian.nilaiPG ?? 0}
                                  </span>
                                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-0.5">/100</span>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-500/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                    <Award className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">
                                      Skor Pilihan Ganda: <b className="font-mono">{ujian.nilaiPG ?? 0}</b>
                                    </div>
                                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>Esai sedang dalam proses koreksi guru</span>
                                    </div>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                  Menunggu Esai
                                </span>
                              </div>
                            )}

                            <div className="w-full py-2 rounded-xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-white/5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>Ujian Telah Selesai Dikerjakan Hari Ini</span>
                            </div>
                          </>
                        ) : isNotStartedYet ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                          >
                            <Lock className="w-4 h-4" />
                            <span>
                              Dibuka Pukul {scheduledStart?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartExam(ujian.ujianId || ujian.id)}
                            disabled={actionLoading}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer transition disabled:opacity-50 active:scale-[0.99]"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            <span>{isWorking ? 'Lanjutkan Pengerjaan Ujian' : 'Kerjakan Ujian Sekarang'}</span>
                            <ChevronRight className="w-4 h-4 ml-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* TAB ARSIP UJIAN (UJIAN LAMPAU YANG SUDAH DILAKSANAKAN) */
            arsipList.length === 0 ? (
              <div className="text-center py-16 bg-white/85 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-sm dark:shadow-xl space-y-3 backdrop-blur-xl">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto shadow-inner">
                  <Archive className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Belum Ada Arsip Ujian
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Ujian yang telah selesai dilaksanakan pada hari sebelumnya akan otomatis tersimpan rapi di halaman ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {arsipList.map((ujian) => {
                  const isFinished = ujian.statusPeserta === 'SELESAI';
                  const dateStr = ujian.waktuMulai
                    ? new Date(ujian.waktuMulai).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Ujian Lampau';

                  return (
                    <div
                      key={ujian.pesertaUjianId || ujian.ujianId}
                      className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl space-y-4 flex flex-col justify-between backdrop-blur-xl opacity-90 hover:opacity-100 transition-opacity"
                    >
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {ujian.kodeUjian}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                            <Archive className="w-3 h-3" />
                            <span>Arsip ({dateStr})</span>
                          </span>
                        </div>

                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                          {ujian.judul}
                        </h3>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate font-semibold">{ujian.mataPelajaran || 'Mata Pelajaran'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{ujian.durasiMenit} Menit</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2.5">
                        {isFinished ? (
                          <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-500/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                <Award className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                                  Nilai Ujian
                                </div>
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80">
                                  {ujian.isHanyaPG ? 'Pilihan Ganda' : ujian.isKoreksiSelesai ? 'Terkoreksi Lengkap' : 'Nilai PG (Menunggu Esai)'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                                {ujian.nilaiTotal ?? ujian.nilaiPG ?? 0}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-0.5">/100</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                            Jadwal pelaksanaan ujian telah selesai
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </main>

      {/* 5. AppFooter Persis SIMASMUH */}
      <AppFooter />
    </div>
  );
}
