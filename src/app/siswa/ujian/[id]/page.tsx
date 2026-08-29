'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { MathRenderer } from '@/components/MathRenderer';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  BookmarkCheck,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Maximize2,
  Minimize2,
  Grid,
  ShieldAlert,
  Send,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OpsiJawaban {
  id: string;
  label: string;
  konten: string;
  gambar?: string;
}

interface SoalItem {
  id: string;
  nomorUrutTampil: number;
  tipeSoal: 'PG' | 'PG_KOMPLEKS' | 'BENAR_SALAH' | 'MENJODOHKAN' | 'ISIAN' | 'ESAI';
  pertanyaan: string;
  mediaAudio?: string;
  mediaGambar?: string;
  bobot: number;
  opsiJawaban: OpsiJawaban[];
  matchingData?: string;
}

interface JawabanState {
  jawabanDipilih: string; // ID Opsi / Array ID JSON / Teks
  raguRagu: boolean;
}

export default function LembarUjianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const ujianId = resolvedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ujianInfo, setUjianInfo] = useState<any>(null);
  const [soalList, setSoalList] = useState<SoalItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jawabanMap, setJawabanMap] = useState<Record<string, JawabanState>>({});
  const [sisaDetik, setSisaDetik] = useState(0);

  // UI state
  const [showNavGrid, setShowNavGrid] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Fetch Soal & Status Ujian
  useEffect(() => {
    fetchUjianData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ujianId]);

  const fetchUjianData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/siswa/ujian/${ujianId}/mulai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Gagal memuat ujian');
        router.push('/siswa');
        return;
      }

      setUjianInfo(data.data.ujian);
      setSoalList(data.data.soalList);
      setSisaDetik(data.data.ujian.sisaWaktuDetik || 0);

      // Inisialisasi jawaban tersimpan
      const map: Record<string, JawabanState> = {};
      data.data.soalList.forEach((s: SoalItem) => {
        map[s.id] = { jawabanDipilih: '', raguRagu: false };
      });
      data.data.jawabanTersimpan?.forEach((j: any) => {
        map[j.soalId] = {
          jawabanDipilih: j.jawabanDipilih || '',
          raguRagu: Boolean(j.raguRagu),
        };
      });
      setJawabanMap(map);
    } catch (err) {
      console.error(err);
      router.push('/siswa');
    } finally {
      setLoading(false);
    }
  };

  // 2. Countdown Timer Real-time
  useEffect(() => {
    if (sisaDetik <= 0 && !loading && ujianInfo) {
      // Auto submit jika waktu habis
      handleSelesaiUjian(true);
      return;
    }

    timerRef.current = setInterval(() => {
      setSisaDetik((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSelesaiUjian(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sisaDetik, loading]);

  // 3. Anti-Cheat Engine (Tab switch & Window blur detection)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerCheatLog('TAB_SWITCH_ALERT', 'Siswa berpindah tab / aplikasi browser');
        setCheatWarning('Peringatan: Anda terdeteksi meninggalkan halaman ujian! Aktivitas ini dicatat oleh sistem.');
      }
    };

    const handleWindowBlur = () => {
      triggerCheatLog('WINDOW_BLUR', 'Fokus layar ujian hilang');
    };

    // Mencegah Klik Kanan (Inspect element)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Mencegah Copy / Paste Soal
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
    };
  }, []);

  const triggerCheatLog = async (aktivitas: string, detail: string) => {
    try {
      await fetch('/api/siswa/ujian/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aktivitas, detail }),
      });
    } catch (e) {
      // silent
    }
  };

  // 4. Autosave Jawaban ke Server & Local Backup
  const saveJawaban = async (soalId: string, value: string, ragu: boolean) => {
    const nextState = {
      ...jawabanMap,
      [soalId]: {
        jawabanDipilih: value,
        raguRagu: ragu,
      },
    };
    setJawabanMap(nextState);

    // Kirim ke API Background
    try {
      await fetch(`/api/siswa/ujian/${ujianId}/jawaban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soalId,
          jawabanDipilih: value,
          raguRagu: ragu,
          sisaDetik,
        }),
      });
    } catch (e) {
      console.warn('Gagal sync jawaban ke server, tersimpan lokal.');
    }
  };

  // Toggle Pilihan Ganda Biasa / Benar-Salah
  const handleSelectOpsi = (soalId: string, opsiId: string) => {
    const curr = jawabanMap[soalId] || { jawabanDipilih: '', raguRagu: false };
    const nextVal = curr.jawabanDipilih === opsiId ? '' : opsiId;
    saveJawaban(soalId, nextVal, curr.raguRagu);
  };

  // Toggle Pilihan Ganda Kompleks (Bisa pilih multiple)
  const handleSelectOpsiKompleks = (soalId: string, opsiId: string) => {
    const curr = jawabanMap[soalId] || { jawabanDipilih: '', raguRagu: false };
    let currentIds: string[] = [];
    try {
      if (curr.jawabanDipilih) currentIds = JSON.parse(curr.jawabanDipilih);
    } catch (e) {
      currentIds = [];
    }

    if (currentIds.includes(opsiId)) {
      currentIds = currentIds.filter((id) => id !== opsiId);
    } else {
      currentIds.push(opsiId);
    }

    saveJawaban(soalId, JSON.stringify(currentIds), curr.raguRagu);
  };

  // Toggle Ragu-Ragu
  const handleToggleRagu = () => {
    const currentSoal = soalList[currentIndex];
    if (!currentSoal) return;
    const curr = jawabanMap[currentSoal.id] || { jawabanDipilih: '', raguRagu: false };
    saveJawaban(currentSoal.id, curr.jawabanDipilih, !curr.raguRagu);
  };

  // Input Teks untuk Isian / Esai
  const handleInputTeks = (soalId: string, text: string) => {
    const curr = jawabanMap[soalId] || { jawabanDipilih: '', raguRagu: false };
    saveJawaban(soalId, text, curr.raguRagu);
  };

  // Submit / Selesai Ujian
  const handleSelesaiUjian = async (isAuto = false) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/siswa/ujian/${ujianId}/selesai`, {
        method: 'POST',
      });
      const data = await res.json();

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      alert(isAuto ? 'Waktu habis! Jawaban Anda telah otomatis dikumpulkan.' : 'Ujian berhasil diselesaikan!');
      router.push('/siswa');
    } catch (e) {
      alert('Terjadi kesalahan saat mengumpulkan ujian.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format Timer HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Toggle Fullscreen Browser
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (loading || !soalList.length) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Menyiapkan Lembar Ujian CBT Muhipo...</p>
      </div>
    );
  }

  const currentSoal = soalList[currentIndex];
  const currentJawaban = jawabanMap[currentSoal?.id] || { jawabanDipilih: '', raguRagu: false };

  // Hitung jumlah soal sudah dijawab
  const totalTerjawab = Object.values(jawabanMap).filter((j) => Boolean(j.jawabanDipilih)).length;
  const totalRagu = Object.values(jawabanMap).filter((j) => j.raguRagu).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white select-none">
      {/* Sticky Header CBT (ZyaCBT / Candy CBT Modern Style) */}
      <header className="sticky top-0 z-30 px-4 sm:px-6 py-3 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md flex items-center justify-between shadow-lg">
        {/* Left: Info Ujian & Nomor Soal */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 font-black text-white text-sm shadow-md shadow-emerald-700/30">
            {currentIndex + 1}
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-extrabold text-white line-clamp-1">
              {ujianInfo?.judul}
            </h1>
            <span className="text-[11px] text-emerald-400 font-mono">
              Soal {currentIndex + 1} dari {soalList.length} • ({currentSoal.tipeSoal.replace('_', ' ')})
            </span>
          </div>
        </div>

        {/* Center: Sticky Realtime Countdown Timer */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3.5 py-1.5 rounded-2xl shadow-inner">
          <Clock className={`w-4 h-4 ${sisaDetik < 300 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`} />
          <span
            className={`font-mono text-sm sm:text-base font-extrabold tracking-wider ${
              sisaDetik < 300 ? 'text-rose-400' : 'text-emerald-300'
            }`}
          >
            {formatTime(sisaDetik)}
          </span>
        </div>

        {/* Right: Quick Tools (Font size, Grid Modal, Fullscreen) */}
        <div className="flex items-center gap-2">
          {/* Font Resizer */}
          <div className="hidden md:flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
            <button
              onClick={() => setFontSize('normal')}
              className={`px-2 py-1 rounded-lg ${fontSize === 'normal' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-1 rounded-lg text-sm ${fontSize === 'large' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}
            >
              A+
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              className={`px-2 py-1 rounded-lg text-base ${fontSize === 'xlarge' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}
            >
              A++
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs hidden sm:flex items-center gap-1 cursor-pointer"
            title="Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Grid Nomor Soal Button */}
          <button
            onClick={() => setShowNavGrid(!showNavGrid)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition cursor-pointer"
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">Daftar Soal ({totalTerjawab}/{soalList.length})</span>
          </button>
        </div>
      </header>

      {/* Warning Alert Anti-Cheat */}
      {cheatWarning && (
        <div className="bg-rose-950/80 border-b border-rose-800 px-4 py-2 text-rose-200 text-xs flex items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
            <span>{cheatWarning}</span>
          </div>
          <button
            onClick={() => setCheatWarning(null)}
            className="text-[10px] bg-rose-900 px-2 py-0.5 rounded text-white font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Question Audio Player (Jika tipe listening) */}
          {currentSoal.mediaAudio && (
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Volume2 className="w-5 h-5" />
              </div>
              <audio ref={audioRef} controls src={currentSoal.mediaAudio} className="w-full h-8" />
            </div>
          )}

          {/* Question Text with KaTeX Math Rendering */}
          <div
            className={`${
              fontSize === 'large' ? 'text-lg leading-loose' : fontSize === 'xlarge' ? 'text-xl leading-loose' : 'text-base leading-relaxed'
            }`}
          >
            <MathRenderer content={currentSoal.pertanyaan} />
          </div>

          {/* Opsi Jawaban: Pilihan Ganda & Benar Salah */}
          {(currentSoal.tipeSoal === 'PG' || currentSoal.tipeSoal === 'BENAR_SALAH') && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              {currentSoal.opsiJawaban.map((opsi) => {
                const isSelected = currentJawaban.jawabanDipilih === opsi.id;

                return (
                  <button
                    key={opsi.id}
                    type="button"
                    onClick={() => handleSelectOpsi(currentSoal.id, opsi.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-lg shadow-emerald-950'
                        : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs transition ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-800 border border-slate-700 text-slate-300'
                      }`}
                    >
                      {opsi.label}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <MathRenderer content={opsi.konten} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Opsi Jawaban: Pilihan Ganda Kompleks (Multiple Select) */}
          {currentSoal.tipeSoal === 'PG_KOMPLEKS' && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <span className="text-xs text-amber-400 font-semibold block mb-1">
                * Pilihan Ganda Kompleks (Bisa mencentang lebih dari 1 pilihan jawaban yang benar):
              </span>
              {currentSoal.opsiJawaban.map((opsi) => {
                let chosenIds: string[] = [];
                try {
                  if (currentJawaban.jawabanDipilih) chosenIds = JSON.parse(currentJawaban.jawabanDipilih);
                } catch (e) {
                  chosenIds = [];
                }
                const isSelected = chosenIds.includes(opsi.id);

                return (
                  <button
                    key={opsi.id}
                    type="button"
                    onClick={() => handleSelectOpsiKompleks(currentSoal.id, opsi.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-lg shadow-cyan-950'
                        : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg font-bold flex items-center justify-center text-xs transition ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 font-black'
                          : 'bg-slate-800 border border-slate-700 text-slate-300'
                      }`}
                    >
                      {isSelected ? '✓' : opsi.label}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <MathRenderer content={opsi.konten} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Input Jawaban: Isian Singkat */}
          {currentSoal.tipeSoal === 'ISIAN' && (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Ketik Jawaban Singkat Anda:
              </label>
              <input
                type="text"
                value={currentJawaban.jawabanDipilih || ''}
                onChange={(e) => handleInputTeks(currentSoal.id, e.target.value)}
                placeholder="Ketikkan jawaban di sini..."
                className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Input Jawaban: Esai / Uraian */}
          {currentSoal.tipeSoal === 'ESAI' && (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Tuliskan Uraian Lengkap Jawaban Anda:
              </label>
              <textarea
                rows={6}
                value={currentJawaban.jawabanDipilih || ''}
                onChange={(e) => handleInputTeks(currentSoal.id, e.target.value)}
                placeholder="Tuliskan langkah pengerjaan atau uraian jawaban secara jelas dan terstruktur..."
                className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Bottom Navigation Toolbar (ZyaCBT / Candy CBT Layout) */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl backdrop-blur-xl">
          {/* Tombol Sebelumnya */}
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-bold text-slate-200 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Sebelumnya</span>
          </button>

          {/* Tombol Ragu-Ragu */}
          <button
            type="button"
            onClick={handleToggleRagu}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
              currentJawaban.raguRagu
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-600/30'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>{currentJawaban.raguRagu ? '✓ Ragu-Ragu Aktif' : 'Ragu-Ragu'}</span>
          </button>

          {/* Tombol Selanjutnya / Selesai */}
          {currentIndex === soalList.length - 1 ? (
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-extrabold text-white shadow-lg shadow-emerald-700/30 transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Selesai Ujian</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(soalList.length - 1, prev + 1))}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition cursor-pointer"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>

      {/* Grid Nomor Soal Drawer / Modal */}
      {showNavGrid && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-emerald-400" />
                Navigasi Nomor Soal Ujian
              </h3>
              <button
                onClick={() => setShowNavGrid(false)}
                className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white"
              >
                Tutup [X]
              </button>
            </div>

            {/* Grid Soal */}
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto p-1">
              {soalList.map((s, idx) => {
                const j = jawabanMap[s.id];
                const isAnswered = Boolean(j?.jawabanDipilih);
                const isRagu = Boolean(j?.raguRagu);
                const isCurrent = idx === currentIndex;

                let btnBg = 'bg-slate-800 text-slate-400 border-slate-700'; // Belum dijawab
                if (isRagu) {
                  btnBg = 'bg-amber-500 text-slate-950 font-black border-amber-400';
                } else if (isAnswered) {
                  btnBg = 'bg-emerald-600 text-white font-bold border-emerald-500';
                }

                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowNavGrid(false);
                    }}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center border text-xs transition cursor-pointer ${btnBg} ${
                      isCurrent ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isRagu && <span className="text-[9px]">Ragu</span>}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-600" />
                <span>Sudah Dijawab</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>Ragu-Ragu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
                <span>Belum Dijawab</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Konfirmasi Pengumpulan Ujian</h3>
              <p className="text-xs text-slate-400 mt-1">
                Apakah Anda yakin ingin mengakhiri dan mengumpulkan lembar jawaban ujian ini?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <div className="text-left">
                <span className="text-slate-500 block">Sudah Dijawab:</span>
                <span className="text-base font-extrabold text-emerald-400">
                  {totalTerjawab} / {soalList.length} Soal
                </span>
              </div>
              <div className="text-left">
                <span className="text-slate-500 block">Masih Ragu-Ragu:</span>
                <span className="text-base font-extrabold text-amber-400">
                  {totalRagu} Soal
                </span>
              </div>
            </div>

            {totalRagu > 0 && (
              <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30">
                ⚠️ Anda masih memiliki <b>{totalRagu}</b> soal berstatus Ragu-ragu.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
              >
                Kembali Periksa
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSelesaiUjian(false)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-700/30 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? 'Mengumpulkan...' : 'Ya, Kumpulkan Jawaban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
