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
} from 'lucide-react';

export default function SiswaPortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [siswa, setSiswa] = useState<any>(null);
  const [ujianList, setUjianList] = useState<any[]>([]);
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

        if (ujianJson.data.siswa) {
          setSiswa((prev: any) => ({ ...prev, ...ujianJson.data.siswa }));
        }
      } else {
        setUjianList([]);
      }
    } catch (e) {
      console.error(e);
      setUjianList([]);
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

      {/* 3. AppNavbar Terpadu: Menampilkan Tahun Ajaran & Semester dari Pengaturan Admin CBT */}
      <AppNavbar
        appTitle={pengaturan?.appTitle || 'CBT MUHIPO'}
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

      {/* 4. Main Content Dashboard Siswa */}
      <main className="p-3.5 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6 flex-1 relative z-10">
        {/* Banner Identitas Peserta Ujian Modern */}
        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-400/30 text-blue-600 dark:text-blue-300 flex items-center justify-center font-black text-lg sm:text-xl shadow-inner shrink-0">
              <UserCheck className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
                Peserta Ujian Terverifikasi
              </span>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                {siswa?.name || 'Memuat Data Siswa...'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-mono mt-0.5">
                Nomor Induk Siswa (NIS): <b className="text-blue-600 dark:text-blue-400 font-bold">{siswa?.username || siswa?.nisn}</b>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-200 backdrop-blur-sm">
              Kelas: {siswa?.kelas?.nama || siswa?.kelas || '-'}
            </span>
          </div>
        </div>

        {/* Notifikasi / Error Alert jika ada */}
        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3 shadow-xs backdrop-blur-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Section: Daftar Jadwal Ujian Hari Ini */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Daftar Ujian Hari Ini
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih mata pelajaran yang dijadwalkan dan klik tombol kerjakan untuk memulai ujian.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-14 bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl text-slate-400 text-xs animate-pulse backdrop-blur-xl">
              Memeriksa jadwal ujian Anda...
            </div>
          ) : ujianList.length === 0 ? (
            /* Tampilan jika Belum Ada Ujian Hari Ini */
            <div className="text-center py-16 bg-white/85 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-sm dark:shadow-xl space-y-3 backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto shadow-inner">
                <CalendarX className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Belum Ada Jadwal Ujian Hari Ini
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Saat ini belum ada sesi ujian yang dijadwalkan atau diaktifkan untuk kelas Anda. Silakan menunggu arahan dari Proktor / Pengawas Ruang atau Guru mata pelajaran.
              </p>
            </div>
          ) : (
            /* Tampilan Kartu Jadwal Ujian Aktif Modern */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {ujianList.map((ujian) => {
                const isFinished = ujian.statusPeserta === 'SELESAI';
                const isWorking = ujian.statusPeserta === 'SEDANG_MENGERJAKAN';

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
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                          }`}
                        >
                          {isFinished ? '✓ SELESAI' : isWorking ? 'SEDANG MENGERJAKAN' : 'SIAP DIKERJAKAN'}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {ujian.judul}
                      </h3>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="truncate">{ujian.mataPelajaran || 'Mata Pelajaran'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>{ujian.durasiMenit} Menit</span>
                        </div>
                        {ujian.jumlahSoal !== undefined && (
                          <div className="flex items-center gap-1.5 col-span-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <FileQuestion className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span>Total Butir Soal: <b>{ujian.jumlahSoal} Butir</b></span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                      {isFinished ? (
                        <div className="w-full py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-white/5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Ujian Telah Selesai Dikerjakan</span>
                        </div>
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
          )}
        </div>
      </main>

      {/* 5. AppFooter Persis SIMASMUH */}
      <AppFooter />
    </div>
  );
}
