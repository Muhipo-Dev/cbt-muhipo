'use client';

import React, { useEffect, useState, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { MathRenderer } from '@/components/MathRenderer';
import { ThemeToggle } from '@/components/ThemeToggle';
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
  Database,
  HardDriveDownload,
  Type,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import {
  cbtSecurityAudio,
  cbtWakeLock,
  setupExamKeyboardLockdown,
  setupBrowserNavigationLock,
  setupAntiScreenshotAndRecording,
  requestUniversalFullscreen,
  exitUniversalFullscreen,
  isCurrentlyFullscreen,
  detectDeviceSecurityInfo,
  enableChromeKeyboardLock,
  isEditableExamInput,
  isMobileSplitScreenDetected,
} from '@/lib/cbt-security';
import { SecurityLockModal } from '@/components/SecurityLockModal';
import {
  saveAnswerToIndexedDB,
  markAnswersAsSynced,
  getAllCachedAnswersFromIndexedDB,
  saveExamSessionToIndexedDB,
  getExamSessionFromIndexedDB,
  syncPendingAnswersToServer,
  exportExamAnswersBackupJSON,
} from '@/lib/cbt-indexeddb';
import {
  detectExambroApp,
  saveAnswerToAndroidExambro,
  fetchAnswersFromAndroidExambro,
  registerGlobalExambroBridge,
  enforceExambroKioskSecurity,
  releaseExambroKioskSecurity,
} from '@/lib/cbt-exambro-bridge';

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

type FontScaleSize = 'small' | 'normal' | 'large' | 'xlarge';

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
  const [pesertaUjianId, setPesertaUjianId] = useState<string | null>(null);
  const [soalList, setSoalList] = useState<SoalItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jawabanMap, setJawabanMap] = useState<Record<string, JawabanState>>({});
  const [sisaDetik, setSisaDetik] = useState(0);

  // Security Lock & State
  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isSplitScreenBlocked, setIsSplitScreenBlocked] = useState(false);

  // UI state (termasuk 4 tingkat Font Size: Kecil, Sedang, Besar, Ekstra Besar untuk aksesibilitas smartphone)
  const [showNavGrid, setShowNavGrid] = useState(false);
  const [fontSize, setFontSize] = useState<FontScaleSize>('normal');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'offline_saved' | 'error'>('saved');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPrivacyObscured, setIsPrivacyObscured] = useState(false);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);
  const [isExambro, setIsExambro] = useState(false);
  const [isSEB, setIsSEB] = useState(false);
  const [isKeyboardTyping, setIsKeyboardTyping] = useState(false);
  const [wasExitedForKeyboard, setWasExitedForKeyboard] = useState(false);

  // Kiosk 2-Finger Pinch-to-Zoom ("Cubit Layar") State — memastikan cubit layar & zoom tetap berfungsi 100%
  // meskipun Chromium Fullscreen API mengunci visualViewport.scale bawaan browser di mode layar penuh!
  const [examZoomScale, setExamZoomScale] = useState<number>(1);
  const questionStageRef = useRef<HTMLDivElement | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);
  const isMultiTouchPinchingRef = useRef<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});
  const isSubmittedRef = useRef<boolean>(false);
  const securityUnlockedAtRef = useRef<number | null>(null);
  const lastViolationTimeRef = useRef<number>(0);

  // Drift-proof deadline timestamp (ms lokal client yang dikalibrasi terhadap sisa waktu server)
  const deadlineLocalMsRef = useRef<number | null>(null);
  const sisaDetikRef = useRef<number>(0);
  const jawabanMapRef = useRef<Record<string, JawabanState>>({});
  const ujianInfoRef = useRef<any>(null);

  useEffect(() => {
    sisaDetikRef.current = sisaDetik;
  }, [sisaDetik]);

  useEffect(() => {
    jawabanMapRef.current = jawabanMap;
  }, [jawabanMap]);

  useEffect(() => {
    ujianInfoRef.current = ujianInfo;
  }, [ujianInfo]);

  // Simpan & pulihkan preferensi ukuran font peserta di localStorage
  useEffect(() => {
    try {
      const savedFont = localStorage.getItem('cbt_exam_font_scale') as FontScaleSize | null;
      if (savedFont && ['small', 'normal', 'large', 'xlarge'].includes(savedFont)) {
        setFontSize(savedFont);
      }
    } catch {}
  }, []);

  const handleChangeFontSize = (nextSize: FontScaleSize) => {
    setFontSize(nextSize);
    try {
      localStorage.setItem('cbt_exam_font_scale', nextSize);
    } catch {}
  };

  const cycleMobileFontSize = () => {
    const order: FontScaleSize[] = ['small', 'normal', 'large', 'xlarge'];
    const nextIdx = (order.indexOf(fontSize) + 1) % order.length;
    handleChangeFontSize(order[nextIdx]);
  };

  const clampExamZoom = (val: number) => Math.min(3.0, Math.max(1.0, Math.round(val * 100) / 100));

  const adjustExamZoom = (delta: number) => {
    setExamZoomScale((prev) => clampExamZoom(prev + delta));
  };

  const resetExamZoom = () => {
    setExamZoomScale(1);
  };

  // Pulihkan Kiosk Fullscreen secara mulus pada sentuhan tombol berikutnya jika sempat keluar akibat keyboard virtual Android
  const ensureKioskFullscreenOnGesture = useCallback(() => {
    if (isSubmittedRef.current || ujianInfoRef.current?.lockBrowser === false) return;
    const dev = detectDeviceSecurityInfo();
    if (dev.hasFullscreen && !isCurrentlyFullscreen() && !isEditableExamInput(document.activeElement)) {
      requestUniversalFullscreen(document.documentElement)
        .then(() => {
          setIsFullscreen(isCurrentlyFullscreen());
          setWasExitedForKeyboard(false);
        })
        .catch(() => {});
    }
  }, []);

  // Navigasi ke nomor soal tertentu + Smooth Scroll ke atas kartu soal
  const navigateToQuestion = useCallback((targetIndex: number) => {
    ensureKioskFullscreenOnGesture();
    const bounded = Math.max(0, Math.min(soalList.length - 1, targetIndex));
    setCurrentIndex(bounded);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [soalList.length, ensureKioskFullscreenOnGesture]);

  // 1. Inisialisasi Android Exambro Native Bridge & Fetch Soal dengan Dukungan Fallback IndexedDB
  useEffect(() => {
    const exambroInfo = detectExambroApp();
    setIsExambro(exambroInfo.isExambro);
    setIsSEB(exambroInfo.isSEB);

    registerGlobalExambroBridge({
      onRestoreAnswers: (restoredAnswers) => {
        setJawabanMap((prev) => ({
          ...prev,
          ...restoredAnswers,
        }));
      },
    });

    fetchUjianData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      cbtWakeLock.releaseWakeLock();
    };
  }, [ujianId]);

  // Background Auto-Sync & Server Time Heartbeat:
  // 1. Mengirim jawaban tertunda dari IndexedDB ke Server CBT saat koneksi pulih (tiap 8 detik)
  // 2. Mengambil sisaDetik otoritatif dari server (tiap 30 detik) agar jika Proktor menambah waktu (ADD_TIME)
  //    atau mengunci ujian (LOCK_EXAM), smartphone peserta langsung sinkron secara otomatis!
  useEffect(() => {
    if (!ujianId || loading) return;

    const attemptAutoSync = async () => {
      if (isSubmittedRef.current) return;
      try {
        const res = await syncPendingAnswersToServer(ujianId, sisaDetikRef.current);
        if (res.success && res.syncedCount > 0) {
          setSyncStatus('saved');
        }
      } catch {
        // silent sync retry
      }
    };

    const syncServerClockAndStatus = async () => {
      if (isSubmittedRef.current) return;
      try {
        const res = await fetch(`/api/siswa/ujian/${ujianId}/jawaban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ heartbeatOnly: true }),
        });
        const json = await res.json();
        if (res.status === 403 && json.isLocked) {
          await exitUniversalFullscreen();
          releaseExambroKioskSecurity();
          alert(
            json.message ||
              'Akun ujian Anda telah dikunci oleh Pengawas/Proktor. Silakan hubungi pengawas ruang.'
          );
          router.push('/siswa');
          return;
        }
        if ((res.status === 400 && json.isFinished) || (res.status === 409 && json.isResetLogin)) {
          isSubmittedRef.current = true;
          await exitUniversalFullscreen();
          releaseExambroKioskSecurity();
          alert(json.message || 'Sesi ujian telah diperbarui oleh Pengawas.');
          router.push('/siswa');
          return;
        }
        if (res.ok && json.success && typeof json.sisaDetik === 'number') {
          deadlineLocalMsRef.current = Date.now() + json.sisaDetik * 1000;
          setSisaDetik(json.sisaDetik);
        }
      } catch {
        // offline - tetap mengandalkan deadlineLocalMsRef lokal tanpa gangguan
      }
    };

    const syncInterval = setInterval(attemptAutoSync, 8000);
    const heartbeatInterval = setInterval(syncServerClockAndStatus, 30000);
    window.addEventListener('online', attemptAutoSync);
    window.addEventListener('online', syncServerClockAndStatus);

    return () => {
      clearInterval(syncInterval);
      clearInterval(heartbeatInterval);
      window.removeEventListener('online', attemptAutoSync);
      window.removeEventListener('online', syncServerClockAndStatus);
    };
  }, [ujianId, loading, router]);

  const fetchUjianData = async () => {
    try {
      setLoading(true);
      const t0 = Date.now();
      const res = await fetch(`/api/siswa/ujian/${ujianId}/mulai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const t1 = Date.now();

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Jika ditolak karena belum mulai, waktu habis, selesai, atau terkunci (status 400/403), jangan buka dari cache offline!
        if (res.status === 400 || res.status === 403 || res.status === 401) {
          alert(data.message || 'Tidak dapat membuka lembar ujian.');
          router.push('/siswa');
          return;
        }

        // Hanya gunakan fallback IndexedDB apabila server benar-benar down (5xx / gangguan jaringan)
        const cachedSession = await getExamSessionFromIndexedDB(ujianId);
        if (cachedSession && cachedSession.soalList?.length) {
          setUjianInfo(cachedSession.ujianInfo);
          setPesertaUjianId(cachedSession.pesertaUjianId || null);
          setSoalList(cachedSession.soalList);
          const fallbackDetik = cachedSession.ujianInfo?.sisaWaktuDetik || 1800;
          deadlineLocalMsRef.current = Date.now() + fallbackDetik * 1000;
          setSisaDetik(fallbackDetik);

          const cachedAnswers = await getAllCachedAnswersFromIndexedDB(ujianId);
          const map: Record<string, JawabanState> = {};
          cachedSession.soalList.forEach((s: SoalItem) => {
            map[s.id] = {
              jawabanDipilih: cachedAnswers[s.id]?.jawabanDipilih || '',
              raguRagu: cachedAnswers[s.id]?.raguRagu || false,
            };
          });
          setJawabanMap(map);
          setSyncStatus('offline_saved');
          return;
        }

        alert(data.message || 'Gagal memuat ujian');
        router.push('/siswa');
        return;
      }

      const initialSisaDetik = Math.max(0, Number(data.data.ujian.sisaWaktuDetik) || 0);
      // Kompensasi setengah RTT jaringan agar hitung mundur presisi terhadap server
      const rttHalfMs = Math.min(2000, Math.floor((t1 - t0) / 2));
      deadlineLocalMsRef.current = Date.now() + Math.max(0, initialSisaDetik * 1000 - rttHalfMs);

      setUjianInfo(data.data.ujian);
      setPesertaUjianId(data.data.pesertaUjianId);
      setSoalList(data.data.soalList);
      setSisaDetik(initialSisaDetik);
      if (typeof data.data.totalPelanggaran === 'number') {
        setViolationCount(data.data.totalPelanggaran);
      }

      if (data.data.ujian.lockBrowser === false) {
        setIsSecurityUnlocked(true);
        setIsFullscreen(true);
      } else {
        setIsSecurityUnlocked(false);
      }

      await saveExamSessionToIndexedDB(ujianId, {
        pesertaUjianId: data.data.pesertaUjianId,
        ujianInfo: data.data.ujian,
        soalList: data.data.soalList,
      });

      const localCachedAnswers = await getAllCachedAnswersFromIndexedDB(ujianId);
      const nativeExambroAnswers = await fetchAnswersFromAndroidExambro(ujianId);

      const map: Record<string, JawabanState> = {};
      data.data.soalList.forEach((s: SoalItem) => {
        map[s.id] = { jawabanDipilih: '', raguRagu: false };
      });

      data.data.jawabanTersimpan?.forEach((j: any) => {
        map[j.soalId] = {
          jawabanDipilih: j.jawabanDipilih || '',
          raguRagu: Boolean(j.raguRagu),
        };
        saveAnswerToIndexedDB({
          ujianId,
          soalId: j.soalId,
          jawabanDipilih: j.jawabanDipilih || '',
          raguRagu: Boolean(j.raguRagu),
          syncedToServer: true,
        });
      });

      Object.keys(localCachedAnswers).forEach((soalId) => {
        const local = localCachedAnswers[soalId];
        if (local && !local.syncedToServer && local.jawabanDipilih) {
          map[soalId] = {
            jawabanDipilih: local.jawabanDipilih,
            raguRagu: local.raguRagu,
          };
        }
      });

      if (nativeExambroAnswers && typeof nativeExambroAnswers === 'object') {
        Object.keys(nativeExambroAnswers).forEach((soalId) => {
          const nativeItem = (nativeExambroAnswers as any)[soalId];
          if (nativeItem?.jawabanDipilih && !map[soalId]?.jawabanDipilih) {
            map[soalId] = {
              jawabanDipilih: nativeItem.jawabanDipilih,
              raguRagu: Boolean(nativeItem.raguRagu),
            };
          }
        });
      }

      setJawabanMap(map);
      syncPendingAnswersToServer(ujianId, initialSisaDetik);
    } catch (err) {
      console.error('Koneksi server terganggu, mencoba pulihkan dari IndexedDB:', err);
      const cachedSession = await getExamSessionFromIndexedDB(ujianId);
      if (cachedSession && cachedSession.soalList?.length) {
        setUjianInfo(cachedSession.ujianInfo);
        if (cachedSession.ujianInfo?.lockBrowser === false) {
          setIsSecurityUnlocked(true);
          setIsFullscreen(true);
        } else {
          setIsSecurityUnlocked(false);
        }
        setPesertaUjianId(cachedSession.pesertaUjianId || null);
        setSoalList(cachedSession.soalList);
        const fallbackDetik = cachedSession.ujianInfo?.sisaWaktuDetik || 1800;
        deadlineLocalMsRef.current = Date.now() + fallbackDetik * 1000;
        setSisaDetik(fallbackDetik);

        const cachedAnswers = await getAllCachedAnswersFromIndexedDB(ujianId);
        const map: Record<string, JawabanState> = {};
        cachedSession.soalList.forEach((s: SoalItem) => {
          map[s.id] = {
            jawabanDipilih: cachedAnswers[s.id]?.jawabanDipilih || '',
            raguRagu: cachedAnswers[s.id]?.raguRagu || false,
          };
        });
        setJawabanMap(map);
        setSyncStatus('offline_saved');
      } else {
        router.push('/siswa');
      }
    } finally {
      setLoading(false);
    }
  };

  // Aktivasi Protokol Keamanan Kiosk (Fullscreen + WakeLock + Audio Alarms)
  const handleActivateSecurity = async (): Promise<boolean> => {
    try {
      cbtSecurityAudio.unlockAudio();
      cbtWakeLock.requestWakeLock().catch(() => {});

      const devInfo = detectDeviceSecurityInfo();

      if (devInfo.hasFullscreen) {
        try {
          await requestUniversalFullscreen(document.documentElement);
          setIsFullscreen(isCurrentlyFullscreen());
        } catch (fsErr) {
          console.warn('Fullscreen request non-fatal:', fsErr);
          setIsFullscreen(true);
        }
      } else {
        // iPhone / iOS Safari / Exambro Native Kiosk: langsung berjalan dalam viewport penuh
        setIsFullscreen(true);
      }

      enforceExambroKioskSecurity();

      securityUnlockedAtRef.current = Date.now();
      setIsSecurityUnlocked(true);
      setCooldownRemaining(5);

      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return true;
    } catch (e: any) {
      console.warn('Aktivasi keamanan non-blocking:', e);
      setIsSecurityUnlocked(true);
      setIsFullscreen(true);
      return true;
    }
  };

  // Helper pengecekan apakah sebuah butir soal sudah terisi lengkap
  const isSoalAnswered = useCallback((soal: SoalItem | undefined, val?: string) => {
    if (!val) return false;
    const t = val.trim();
    if (!t || t === '[]' || t === '{}') return false;
    if (soal?.tipeSoal === 'MENJODOHKAN' && soal.matchingData) {
      try {
        const expectedPairs = JSON.parse(soal.matchingData);
        const answeredMap = JSON.parse(t);
        if (Array.isArray(expectedPairs) && expectedPairs.length > 0 && typeof answeredMap === 'object' && answeredMap !== null) {
          return Object.keys(answeredMap).filter((k) => Boolean(answeredMap[k])).length >= expectedPairs.length;
        }
      } catch {}
    }
    return true;
  }, []);

  // Submit / Selesai Ujian (Didefinisikan dengan useCallback stabil untuk dipanggil dari Timer maupun Tombol Submit)
  const handleSelesaiUjian = useCallback(async (isAuto = false) => {
    if (isSubmittedRef.current) return;

    Object.keys(textDebounceRef.current).forEach((sid) => {
      if (textDebounceRef.current[sid]) {
        clearTimeout(textDebounceRef.current[sid]);
        delete textDebounceRef.current[sid];
      }
    });

    const currentMap = jawabanMapRef.current;
    const currentUjian = ujianInfoRef.current;
    const answeredCount = soalList.filter((s) => isSoalAnswered(s, currentMap[s.id]?.jawabanDipilih)).length;
    const requiredCount =
      currentUjian?.minJawaban && Number(currentUjian.minJawaban) > 0
        ? Math.min(soalList.length, Number(currentUjian.minJawaban))
        : soalList.length;

    if (!isAuto && answeredCount < requiredCount) {
      const firstUnansweredIdx = soalList.findIndex((s) => !isSoalAnswered(s, currentMap[s.id]?.jawabanDipilih));
      const remainingUnanswered = requiredCount - answeredCount;
      setCheatWarning(
        `Harap isi seluruh soal terlebih dahulu! Masih ada ${remainingUnanswered} soal yang belum diisi.`
      );
      setShowSubmitModal(false);
      if (firstUnansweredIdx >= 0) {
        navigateToQuestion(firstUnansweredIdx);
      }
      return;
    }

    setSubmitting(true);
    isSubmittedRef.current = true;
    try {
      for (const [sid, jState] of Object.entries(currentMap)) {
        if (jState.jawabanDipilih) {
          saveAnswerToIndexedDB({
            ujianId,
            soalId: sid,
            jawabanDipilih: jState.jawabanDipilih,
            raguRagu: jState.raguRagu,
            sisaDetik: sisaDetikRef.current,
            syncedToServer: false,
          });
        }
      }

      await syncPendingAnswersToServer(ujianId, sisaDetikRef.current);

      const res = await fetch(`/api/siswa/ujian/${ujianId}/selesai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAuto, jawabanMap: currentMap }),
      });
      const data = await res.json();

      if (!data.success) {
        isSubmittedRef.current = false;
        alert(data.message || 'Gagal menyelesaikan ujian.');
        setSubmitting(false);
        return;
      }

      setIsSecurityUnlocked(false);
      await exitUniversalFullscreen();
      setIsFullscreen(false);
      releaseExambroKioskSecurity();

      cbtSecurityAudio.speakSuccess('Ujian selesai, terimakasih telah mengerjakan');

      try {
        const isLowEnd =
          typeof document !== 'undefined' && document.documentElement.classList.contains('low-end-webview');
        if (!isLowEnd && typeof confetti === 'function') {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
        }
      } catch {}

      const tampilkanHasil = data?.data?.tampilkanHasil === true;
      const nilaiTotal = data?.data?.nilaiTotal ?? data?.data?.nilaiPG;

      if (isAuto) {
        if (tampilkanHasil && nilaiTotal !== undefined) {
          alert(`Waktu habis! Jawaban Anda telah otomatis dikumpulkan.\n\nNilai Anda: ${nilaiTotal}/100`);
        } else {
          alert('Waktu habis! Jawaban Anda telah otomatis dikumpulkan.');
        }
      } else {
        if (tampilkanHasil && nilaiTotal !== undefined) {
          alert(`Ujian berhasil diselesaikan!\n\nNilai Perolehan: ${nilaiTotal}/100`);
        } else {
          alert('Ujian berhasil diselesaikan!\n\nJawaban Anda telah tersimpan aman.');
        }
      }
      router.push('/siswa');
    } catch {
      isSubmittedRef.current = false;
      alert(
        'Terjadi kendala koneksi ke server saat pengumpulan. Seluruh jawaban Anda tetap AMAN tersimpan di perangkat ini (IndexedDB). Silakan laporkan ke proktor ruang atau klik tombol Cadangan Jawaban.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [ujianId, router, soalList, isSoalAnswered, navigateToQuestion]);

  // 2. Drift-Proof Countdown Timer Real-time (Berbasis Timestamp Absolut — Kebal Throttling Tab/Layar Mati di Chrome Android & Safari iOS!)
  useEffect(() => {
    if (loading || !ujianInfo) return;

    const tick = () => {
      if (isSubmittedRef.current) return;
      if (deadlineLocalMsRef.current === null) return;

      const remainingSec = Math.max(
        0,
        Math.ceil((deadlineLocalMsRef.current - Date.now()) / 1000)
      );
      setSisaDetik(remainingSec);

      if (remainingSec <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleSelesaiUjian(true);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, ujianInfo, handleSelesaiUjian]);

  // Pantau fokus pada input jawaban (ISIAN / ESAI / SELECT) agar keyboard virtual HP tidak disalahartikan sebagai keluar Fullscreen
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (isEditableExamInput(e.target)) {
        setIsKeyboardTyping(true);
      }
    };
    const onFocusOut = () => {
      setTimeout(() => {
        if (typeof document !== 'undefined' && !isEditableExamInput(document.activeElement)) {
          setIsKeyboardTyping(false);
        }
      }, 250);
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Mesin Cubit Layar 2 Jari (Kiosk Pinch-to-Zoom) & Trackpad Pinch di Halaman Ujian:
  // Saat browser berada di Fullscreen API (Chrome Android / Tablet / Desktop), Chromium mematikan zoom bawaan visualViewport.
  // Listener ini memastikan gesture cubit 2 jari ("cubit layar") tetap memperbesar/memperkecil soal & opsi (100% - 300%)
  // tanpa mengganggu scroll 1 jari maupun ketukan tombol touchscreen!
  useEffect(() => {
    const stageEl = questionStageRef.current;
    if (!stageEl || loading) return;

    const getTouchDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        isMultiTouchPinchingRef.current = true;
        // Jika sedang Fullscreen API (di mana native visualViewport zoom dikunci oleh browser), aktifkan Kiosk Pinch-Zoom
        if (isCurrentlyFullscreen()) {
          pinchStartDistRef.current = getTouchDistance(e.touches[0], e.touches[1]);
          pinchStartScaleRef.current = examZoomScale;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && pinchStartDistRef.current && isCurrentlyFullscreen()) {
        // Cegah gesture browser lain hanya saat 2 jari sedang mencubit di mode Fullscreen API;
        // sentuhan 1 jari (scroll vertikal/horizontal & tap jawaban) tetap 100% native!
        if (e.cancelable) e.preventDefault();
        const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
        if (pinchStartDistRef.current > 10) {
          const ratio = currentDist / pinchStartDistRef.current;
          const nextScale = Math.min(3.0, Math.max(1.0, Math.round(pinchStartScaleRef.current * ratio * 100) / 100));
          setExamZoomScale(nextScale);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDistRef.current = null;
        setTimeout(() => {
          isMultiTouchPinchingRef.current = false;
        }, 250);
      }
    };

    const onWheelZoom = (e: WheelEvent) => {
      // Dukung cubit trackpad 2 jari / Ctrl + Scroll untuk memperbesar/memperkecil tampilan soal di dalam Kiosk Fullscreen
      if (e.ctrlKey || e.metaKey) {
        if (isCurrentlyFullscreen()) {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.12 : -0.12;
          setExamZoomScale((prev) => Math.min(3.0, Math.max(1.0, Math.round((prev + delta) * 100) / 100)));
        }
      }
    };

    stageEl.addEventListener('touchstart', onTouchStart, { passive: true });
    stageEl.addEventListener('touchmove', onTouchMove, { passive: false });
    stageEl.addEventListener('touchend', onTouchEnd, { passive: true });
    stageEl.addEventListener('touchcancel', onTouchEnd, { passive: true });
    stageEl.addEventListener('wheel', onWheelZoom, { passive: false });

    return () => {
      stageEl.removeEventListener('touchstart', onTouchStart);
      stageEl.removeEventListener('touchmove', onTouchMove);
      stageEl.removeEventListener('touchend', onTouchEnd);
      stageEl.removeEventListener('touchcancel', onTouchEnd);
      stageEl.removeEventListener('wheel', onWheelZoom);
    };
  }, [loading, examZoomScale]);

  // 3. Anti-Cheat Engine Lintas Platform & Pengawasan Area Terkoordinasi (Chrome Ponsel, Safari iOS, Exambro, Desktop)
  useEffect(() => {
    if (!isSecurityUnlocked || ujianInfo?.lockBrowser === false) return;

    let isHandlingViolation = false;
    let pendingViolationTimer: NodeJS.Timeout | null = null;

    const dispatchAreaViolation = (
      primaryType:
        | 'TAB_SWITCH_ALERT'
        | 'APP_SWITCH_ALERT'
        | 'FULLSCREEN_EXIT'
        | 'KEYBOARD_SHORTCUT_VIOLATION'
        | 'SECURITY_ALERT',
      detailMsg: string,
      voiceWarning: string
    ) => {
      if (isSubmittedRef.current) return;
      if (securityUnlockedAtRef.current && Date.now() - securityUnlockedAtRef.current < 5000) {
        return;
      }

      if (isHandlingViolation) return;
      isHandlingViolation = true;

      triggerCheatLog(primaryType, detailMsg);
      cbtSecurityAudio.triggerFullWarning(voiceWarning);
      setCheatWarning(`Peringatan: ${detailMsg}`);

      if (pendingViolationTimer) clearTimeout(pendingViolationTimer);
      pendingViolationTimer = setTimeout(() => {
        isHandlingViolation = false;
      }, 1500);
    };

    // Browser History Trap (Cegah Tombol Back / Gesture Swipe-Back HP Android & Safari iOS)
    const cleanupHistoryLock = setupBrowserNavigationLock(() => {
      if (isSubmittedRef.current) return;
      // Jika modal daftar soal atau modal zoom gambar sedang terbuka, tutup saja modalnya tanpa menghitung pelanggaran!
      if (document.getElementById('cbt-image-zoom-lightbox')) {
        return;
      }
      dispatchAreaViolation(
        'KEYBOARD_SHORTCUT_VIOLATION',
        'Tombol kembali / gesture swipe-back dicegah! Harap tetap di lembar ujian.',
        'Dilarang menekan tombol kembali selama ujian!'
      );
    });

    // Anti-Screenshot & Anti-Screen-Record Protection
    const cleanupAntiScreenshot = setupAntiScreenshotAndRecording((detail) => {
      if (isSubmittedRef.current) return;
      setIsPrivacyObscured(true);
      setTimeout(() => {
        setIsPrivacyObscured(false);
      }, 1500);
      dispatchAreaViolation(
        'KEYBOARD_SHORTCUT_VIOLATION',
        detail,
        'Peringatan! Tangkapan layar dan rekam layar dilarang keras selama ujian!'
      );
    });

    enforceExambroKioskSecurity();

    // BeforeUnload Trap
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmittedRef.current) return;
      const warningText =
        'Peringatan: Ujian sedang berlangsung! Jika Anda keluar atau memuat ulang, aktivitas akan dicatat pelanggaran.';
      e.preventDefault();
      e.returnValue = warningText;
      return warningText;
    };

    // Keyboard lockdown
    const cleanupKeyboard = setupExamKeyboardLockdown((reason) => {
      dispatchAreaViolation(
        'KEYBOARD_SHORTCUT_VIOLATION',
        reason,
        'Peringatan! Tombol pintasan dilarang selama ujian!'
      );
    });

    // 1. Visibility Change Listener (Tab Switch / Home Button / App Switcher di Chrome Android & Safari iOS)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPrivacyObscured(true);
        dispatchAreaViolation(
          'TAB_SWITCH_ALERT',
          'Peserta meninggalkan halaman ujian (pindah tab / meminimalkan browser ponsel)',
          'Peringatan! Anda terdeteksi meninggalkan halaman ujian!'
        );
      } else {
        // Saat kembali ke halaman ujian, nyalakan kembali WakeLock & hitung ulang timer seketika
        cbtWakeLock.requestWakeLock().catch(() => {});
        if (deadlineLocalMsRef.current !== null) {
          setSisaDetik(Math.max(0, Math.ceil((deadlineLocalMsRef.current - Date.now()) / 1000)));
        }
        setTimeout(() => {
          setIsPrivacyObscured(false);
        }, 450);
      }
    };

    // 2. Window Blur Listener (App Switcher / Control Center / Notification Shade / Picture-in-Picture)
    // Di Safari iOS & Chrome Android, menarik Control Center / Notification Center atau membuka Floating App
    // memicu window 'blur' tanpa selalu mengubah document.hidden menjadi true.
    // Kita beri debounce 650ms dan abaikan jika fokus sedang berada di kolom input/select internal halaman!
    let blurTimeout: NodeJS.Timeout | null = null;
    const handleWindowBlur = () => {
      if (document.hidden || isSubmittedRef.current) return;
      if (isEditableExamInput(document.activeElement)) return;

      if (blurTimeout) clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        if (isSubmittedRef.current || document.hidden) return;
        if (isEditableExamInput(document.activeElement)) return;

        if (!document.hasFocus()) {
          setIsPrivacyObscured(true);
          const devInfo = detectDeviceSecurityInfo();
          dispatchAreaViolation(
            'APP_SWITCH_ALERT',
            devInfo.isMobile || devInfo.isTablet
              ? 'Layar ujian kehilangan fokus (membuka jendela aplikasi lain / panel notifikasi)'
              : 'Peserta berpindah ke jendela aplikasi lain (Window Blur)',
            'Peringatan! Dilarang membuka aplikasi atau panel lain selama ujian!'
          );
        }
      }, 650);
    };

    const handleWindowFocus = () => {
      if (blurTimeout) clearTimeout(blurTimeout);
      setIsPrivacyObscured(false);
      cbtWakeLock.requestWakeLock().catch(() => {});
    };

    // 3. Page Hide Listener (Khusus Safari iOS ketika tab ditutup / digeser keluar)
    const handlePageHide = () => {
      if (isSubmittedRef.current) return;
      dispatchAreaViolation(
        'TAB_SWITCH_ALERT',
        'Peserta menutup atau meninggalkan tab ujian',
        'Peringatan! Dilarang menutup halaman ujian!'
      );
    };

    // 4. Deteksi Kursor Mouse Keluar Viewport (Desktop)
    const handleMouseLeave = (e: MouseEvent) => {
      if (isSubmittedRef.current) return;
      if (securityUnlockedAtRef.current && Date.now() - securityUnlockedAtRef.current < 5000) {
        return;
      }
      if (e.clientY <= 0) {
        cbtSecurityAudio.playWarningBuzzer();
        setCheatWarning('Peringatan: Kursor terdeteksi meninggalkan area ujian!');
      }
    };

    // 5. Fullscreen Change Listener (dengan pengecualian cerdas saat keyboard virtual HP muncul untuk soal Isian/Esai!)
    const handleFullscreenChange = () => {
      const inFullscreen = isCurrentlyFullscreen();
      setIsFullscreen(inFullscreen);
      if (inFullscreen) {
        setWasExitedForKeyboard(false);
      }
      if (isSubmittedRef.current) return;

      const devInfo = detectDeviceSecurityInfo();
      // Jika di ponsel Android peserta mengetuk kolom input ISIAN/ESAI, Chrome Android otomatis keluar fullscreen sementara
      // untuk menampilkan keyboard on-screen. Jangan hukum siswa atas perilaku bawaan OS Android ini!
      if (!inFullscreen && devInfo.hasFullscreen) {
        if ((devInfo.isMobile || devInfo.isTablet) && isEditableExamInput(document.activeElement)) {
          setWasExitedForKeyboard(true);
          return;
        }

        setWasExitedForKeyboard(false);
        dispatchAreaViolation(
          'FULLSCREEN_EXIT',
          'Peserta keluar dari mode layar penuh (Fullscreen Lockdown)',
          'Peringatan! Layar terkunci! Harap segera kembali ke mode layar penuh!'
        );
      }
    };

    // 6. Deteksi Split-Screen / Multi-Window / Pop-up View di Android Chrome & iPadOS Safari (Aman terhadap Pinch-Zoom!)
    let resizeCheckTimer: NodeJS.Timeout | null = null;
    const handleResizeSplitCheck = () => {
      if (isSubmittedRef.current || isMultiTouchPinchingRef.current) return;
      if (resizeCheckTimer) clearTimeout(resizeCheckTimer);
      resizeCheckTimer = setTimeout(() => {
        const splitDetected = isMobileSplitScreenDetected();
        setIsSplitScreenBlocked(splitDetected);
        if (splitDetected) {
          dispatchAreaViolation(
            'SECURITY_ALERT',
            'Terdeteksi mode Layar Belah (Split-Screen / Jendela Mengambang) pada perangkat mobile!',
            'Peringatan! Dilarang menggunakan fitur layar belah atau jendela mengambang selama ujian!'
          );
        }
      }, 400);
    };

    // 7. Context Menu, Copy, Cut, Paste, Drag & Selection Prevention (BLOKIR TOTAL Termasuk di Kolom Input, Tanpa Mengganggu Cubit Layar & Scroll!)
    const handleContextMenu = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Jika event berasal dari klik kanan mouse desktop, bunyikan peringatan;
      // jika berasal dari tahan-sentuh / cubit 2 jari touchscreen, cukup blokir menu konteks secara senyap agar scroll & zoom nyaman!
      const pType = (e as any).pointerType;
      const isTouchContext =
        isMultiTouchPinchingRef.current ||
        pType === 'touch' ||
        pType === 'pen' ||
        (pType === undefined && typeof window !== 'undefined' && 'ontouchstart' in window);
      if (!isTouchContext) {
        cbtSecurityAudio.playWarningBuzzer();
        setCheatWarning('Peringatan: Klik kanan diblokir selama ujian!');
      }
    };

    const handleCopyCutPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      cbtSecurityAudio.playWarningBuzzer();
      const actionName =
        e.type === 'copy' ? 'Menyalin (Copy)' : e.type === 'cut' ? 'Memotong (Cut)' : 'Menempel (Paste)';
      setCheatWarning(`Peringatan: Akses ${actionName} diblokir total selama ujian!`);
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('resize', handleResizeSplitCheck);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopyCutPaste);
    window.addEventListener('cut', handleCopyCutPaste);
    window.addEventListener('paste', handleCopyCutPaste);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('drop', handleDrop);

    // Cek awal apakah siswa membuka ujian dalam keadaan Split-Screen
    handleResizeSplitCheck();

    return () => {
      if (pendingViolationTimer) clearTimeout(pendingViolationTimer);
      if (blurTimeout) clearTimeout(blurTimeout);
      if (resizeCheckTimer) clearTimeout(resizeCheckTimer);
      cleanupHistoryLock();
      cleanupKeyboard();
      cleanupAntiScreenshot();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('resize', handleResizeSplitCheck);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopyCutPaste);
      window.removeEventListener('cut', handleCopyCutPaste);
      window.removeEventListener('paste', handleCopyCutPaste);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('drop', handleDrop);
    };
  }, [isSecurityUnlocked, pesertaUjianId, ujianInfo]);

  const triggerCheatLog = async (aktivitas: string, detail: string) => {
    if (securityUnlockedAtRef.current && Date.now() - securityUnlockedAtRef.current < 5000) {
      return;
    }

    const now = Date.now();
    if (now - lastViolationTimeRef.current < 4000) {
      return;
    }
    lastViolationTimeRef.current = now;

    try {
      const res = await fetch('/api/siswa/ujian/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pesertaUjianId, aktivitas, detail }),
      });
      const resJson = await res.json();
      const currentViolation = resJson.data?.totalPelanggaran ?? 0;
      setViolationCount(currentViolation);

      if (resJson.data?.isLocked) {
        alert(
          `AKUN UJIAN ANDA TERKUNCI!\n\nAnda telah mencapai batas maksimal 10 kali pelanggaran keamanan (keluar halaman ujian / berpindah aplikasi / berpindah tab). Sistem otomatis mengunci ujian Anda. Silakan hubungi Pengawas / Proktor untuk membuka kunci ujian Anda.`
        );
        router.push('/siswa');
      } else if (currentViolation > 0) {
        const sisaPelanggaran = Math.max(0, 10 - currentViolation);
        setCheatWarning(
          `Pelanggaran (${currentViolation}/10): ${detail} — Sisa toleransi ${sisaPelanggaran}x lagi sebelum terkunci otomatis.`
        );
      }
    } catch {
      // silent
    }
  };

  // 4. Autosave Jawaban ke IndexedDB Client Caching & Server Realtime
  const saveJawaban = async (soalId: string, value: string, ragu: boolean, immediate = true) => {
    setJawabanMap((prev) => ({
      ...prev,
      [soalId]: {
        jawabanDipilih: value,
        raguRagu: ragu,
      },
    }));

    saveAnswerToIndexedDB({
      ujianId,
      soalId,
      jawabanDipilih: value,
      raguRagu: ragu,
      sisaDetik: sisaDetikRef.current,
      syncedToServer: false,
    });
    saveAnswerToAndroidExambro({
      ujianId,
      soalId,
      jawabanDipilih: value,
      raguRagu: ragu,
      sisaDetik: sisaDetikRef.current,
    });

    const sendPayload = async () => {
      setSyncStatus('saving');
      try {
        const res = await fetch(`/api/siswa/ujian/${ujianId}/jawaban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            soalId,
            jawabanDipilih: value,
            raguRagu: ragu,
          }),
        });
        const data = await res.json();
        if (res.status === 403 && data.isLocked) {
          alert(data.message || 'Akun ujian Anda telah dikunci oleh Pengawas.');
          router.push('/siswa');
          return;
        }
        if (res.ok && data.success) {
          await markAnswersAsSynced(ujianId, [soalId]);
          setSyncStatus('saved');
          // Sinkronkan sisa waktu otoritatif dari server (misal jika proktor baru menambah waktu)
          if (typeof data.sisaDetik === 'number') {
            deadlineLocalMsRef.current = Date.now() + data.sisaDetik * 1000;
            setSisaDetik(data.sisaDetik);
          }
        } else {
          setSyncStatus('offline_saved');
        }
      } catch {
        setSyncStatus('offline_saved');
      }
    };

    if (immediate) {
      if (textDebounceRef.current[soalId]) {
        clearTimeout(textDebounceRef.current[soalId]);
      }
      sendPayload();
    } else {
      if (textDebounceRef.current[soalId]) {
        clearTimeout(textDebounceRef.current[soalId]);
      }
      textDebounceRef.current[soalId] = setTimeout(() => {
        sendPayload();
      }, 450);
    }
  };

  const handleSelectOpsi = (soalId: string, opsiId: string) => {
    if (submitting || isSubmittedRef.current || isMultiTouchPinchingRef.current) return;
    ensureKioskFullscreenOnGesture();
    const curr = jawabanMap[soalId] || { jawabanDipilih: '', raguRagu: false };
    const nextVal = curr.jawabanDipilih === opsiId ? '' : opsiId;
    saveJawaban(soalId, nextVal, curr.raguRagu, true);
  };

  const handleSelectOpsiKompleks = (soalId: string, opsiId: string) => {
    if (submitting || isSubmittedRef.current || isMultiTouchPinchingRef.current) return;
    ensureKioskFullscreenOnGesture();
    const curr = jawabanMap[soalId] || { jawabanDipilih: '', raguRagu: false };
    let currentIds: string[] = [];
    try {
      if (curr.jawabanDipilih) currentIds = JSON.parse(curr.jawabanDipilih);
    } catch {
      currentIds = [];
    }

    if (currentIds.includes(opsiId)) {
      currentIds = currentIds.filter((id) => id !== opsiId);
    } else {
      currentIds.push(opsiId);
    }

    saveJawaban(soalId, JSON.stringify(currentIds), curr.raguRagu, true);
  };

  const handleToggleRagu = () => {
    if (submitting || isSubmittedRef.current) return;
    ensureKioskFullscreenOnGesture();
    const currentSoal = soalList[currentIndex];
    if (!currentSoal) return;
    const curr = jawabanMap[currentSoal.id] || { jawabanDipilih: '', raguRagu: false };
    saveJawaban(currentSoal.id, curr.jawabanDipilih, !curr.raguRagu, true);
  };

  const handleInputTeks = (soalId: string, text: string) => {
    if (submitting || isSubmittedRef.current) return;
    const curr = jawabanMap[soalId] || { jawabanDipilih: '', raguRagu: false };
    saveJawaban(soalId, text, curr.raguRagu, false);
  };

  const handleSelectMatching = (soalId: string, leftText: string, rightText: string) => {
    if (submitting || isSubmittedRef.current) return;
    const curr = jawabanMap[soalId] || { jawabanDipilih: '', raguRagu: false };
    let mapping: Record<string, string> = {};
    try {
      if (curr.jawabanDipilih) {
        mapping = JSON.parse(curr.jawabanDipilih);
      }
    } catch {
      mapping = {};
    }

    if (rightText === '') {
      delete mapping[leftText];
    } else {
      mapping[leftText] = rightText;
    }

    saveJawaban(soalId, JSON.stringify(mapping), curr.raguRagu, true);
  };

  const handleDownloadEmergencyBackup = async () => {
    try {
      const jsonString = await exportExamAnswersBackupJSON(ujianId);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CADANGAN_JAWABAN_CBT_${ujianInfo?.kodeUjian || 'UJIAN'}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh cadangan jawaban.');
    }
  };

  const formatTime = (seconds: number) => {
    const safeSec = Math.max(0, Math.floor(seconds));
    const h = Math.floor(safeSec / 3600);
    const m = Math.floor((safeSec % 3600) / 60);
    const s = safeSec % 60;
    return `${h > 0 ? `${h}:` : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Toggle Fullscreen Browser: Selama ujian lockBrowser aktif, hanya izinkan MASUK fullscreen (cegah keluar tak sengaja!)
  const toggleFullscreen = async () => {
    try {
      if (!isCurrentlyFullscreen()) {
        await requestUniversalFullscreen(document.documentElement);
        setIsFullscreen(isCurrentlyFullscreen());
      } else if (ujianInfo?.lockBrowser === false) {
        await exitUniversalFullscreen();
        setIsFullscreen(isCurrentlyFullscreen());
      } else {
        setCheatWarning('Mode Layar Penuh dikunci selama ujian berlangsung.');
      }
    } catch {
      setIsFullscreen(isCurrentlyFullscreen());
    }
  };

  if (loading || !soalList.length) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-800 dark:text-slate-100 p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4 shadow-sm" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Menyiapkan Lembar Ujian CBT...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Sinkronisasi waktu server & memuat butir soal</p>
      </div>
    );
  }

  const currentSoal = soalList[currentIndex];
  const currentJawaban = jawabanMap[currentSoal?.id] || { jawabanDipilih: '', raguRagu: false };

  const totalTerjawab = soalList.filter((s) => isSoalAnswered(s, jawabanMap[s.id]?.jawabanDipilih)).length;
  const totalWajibDijawab =
    ujianInfo?.minJawaban && Number(ujianInfo.minJawaban) > 0
      ? Math.min(soalList.length, Number(ujianInfo.minJawaban))
      : soalList.length;
  const belumDijawabCount = Math.max(0, totalWajibDijawab - totalTerjawab);
  const isAllRequiredAnswered = totalTerjawab >= totalWajibDijawab;
  const totalRagu = Object.values(jawabanMap).filter((j) => j.raguRagu).length;

  const questionFontClass =
    fontSize === 'small'
      ? 'text-xs sm:text-sm'
      : fontSize === 'large'
      ? 'text-base sm:text-lg'
      : fontSize === 'xlarge'
      ? 'text-lg sm:text-xl'
      : 'text-sm sm:text-base';

  const optionFontClass =
    fontSize === 'small'
      ? 'text-xs'
      : fontSize === 'large'
      ? 'text-sm sm:text-base'
      : fontSize === 'xlarge'
      ? 'text-base sm:text-lg'
      : 'text-xs sm:text-sm';

  const fontLabelMap: Record<FontScaleSize, string> = {
    small: 'A-',
    normal: 'A',
    large: 'A+',
    xlarge: 'A++',
  };

  const deviceSec = typeof window !== 'undefined' ? detectDeviceSecurityInfo() : null;
  const shouldShowFullscreenLockOverlay = Boolean(
    isSecurityUnlocked &&
      !isFullscreen &&
      !isKeyboardTyping &&
      ujianInfo?.lockBrowser !== false &&
      cooldownRemaining === 0 &&
      !isSubmittedRef.current &&
      deviceSec?.hasFullscreen
  );

  return (
    <div
      id="cbt-exam-root"
      className={`min-h-screen min-h-[100dvh] bg-slate-100/80 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between font-sans overflow-x-hidden ${
        ujianInfo?.lockBrowser !== false ? 'cbt-exam-lockdown select-none' : 'selection:bg-emerald-500 selection:text-white'
      } ${isPrivacyObscured && ujianInfo?.lockBrowser !== false ? 'cbt-privacy-shield-active' : ''}`}
      style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
    >
      {/* Privacy Shield Blindfold Overlay */}
      {isPrivacyObscured && ujianInfo?.lockBrowser !== false && !isSubmittedRef.current && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center mb-4 text-rose-500 animate-pulse">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">
            Layar Soal Disamarkan (Privacy Guard)
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">
            Harap tetap fokus di layar ujian. Perpindahan aplikasi, panel sistem, dan tangkapan layar diblokir demi integritas ujian.
          </p>
        </div>
      )}

      {/* Split-Screen / Floating Window Blocker Overlay (Khusus Mobile & Tablet) */}
      {isSplitScreenBlocked && ujianInfo?.lockBrowser !== false && !isSubmittedRef.current && (
        <div className="fixed inset-0 z-[95] bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mb-4 text-amber-400 animate-bounce">
            <AlertTriangle className="w-9 h-9" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white">
            Mode Layar Belah (Split-Screen) Terdeteksi!
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md leading-relaxed">
            Tutup aplikasi kedua / jendela mengambang (Pop-Up View) dan kembalikan browser ke ukuran layar penuh untuk melanjutkan mengerjakan soal.
          </p>
        </div>
      )}

      {/* Modal Aktivasi Keamanan Kiosk */}
      {ujianInfo?.lockBrowser !== false && (
        <SecurityLockModal
          isOpen={!isSecurityUnlocked}
          onActivateSecurity={handleActivateSecurity}
        />
      )}

      {/* Force Fullscreen Lockdown Overlay */}
      {shouldShowFullscreenLockOverlay && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`bg-white dark:bg-slate-900 border-2 ${
              wasExitedForKeyboard ? 'border-emerald-500' : 'border-rose-500'
            } rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl space-y-5 animate-in zoom-in duration-200`}
          >
            <div
              className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto shadow-md ${
                wasExitedForKeyboard
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-600'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600'
              }`}
            >
              {wasExitedForKeyboard ? (
                <Maximize2 className="w-9 h-9" />
              ) : (
                <ShieldAlert className="w-10 h-10 animate-bounce" />
              )}
            </div>
            <div>
              <span
                className={`text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border inline-block ${
                  wasExitedForKeyboard
                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800'
                    : 'text-rose-600 bg-rose-100 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800'
                }`}
              >
                {wasExitedForKeyboard
                  ? 'Keyboard Ditutup • Tanpa Sanksi Pelanggaran'
                  : `Layar Ujian Terkunci (${violationCount}/10 Pelanggaran)`}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                Kembali ke Mode Layar Penuh!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {wasExitedForKeyboard
                  ? 'Ketuk tombol di bawah untuk mengunci kembali layar penuh dan melanjutkan pengerjaan soal dengan nyaman.'
                  : 'Anda keluar dari mode layar penuh. Ketuk tombol di bawah untuk mengembalikan layar penuh dan melanjutkan ujian.'}
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                cbtSecurityAudio.unlockAudio();
                cbtWakeLock.requestWakeLock().catch(() => {});
                await requestUniversalFullscreen(document.documentElement);
                setIsFullscreen(isCurrentlyFullscreen());
                setWasExitedForKeyboard(false);
              }}
              className={`min-h-[48px] w-full py-3.5 px-6 rounded-2xl active:scale-95 text-white font-extrabold text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation ${
                wasExitedForKeyboard
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
              }`}
            >
              <Maximize2 className="w-4 h-4" />
              <span>Buka Kunci &amp; Masuk Layar Penuh</span>
            </button>
          </div>
        </div>
      )}

      {/* Sticky Header CBT Ergonomis & Responsif untuk Smartphone (320px - Desktop) */}
      <header
        id="cbt-exam-header"
        className="sticky top-0 z-40 px-2.5 sm:px-6 lg:px-8 py-1.5 sm:py-2.5 bg-white/98 dark:bg-slate-900/98 border-b border-slate-200/90 dark:border-white/10 flex items-center justify-between gap-1.5 sm:gap-3 shadow-xs"
      >
        {/* Left: Nomor Soal Aktif & Judul */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center min-w-[34px] h-[34px] sm:w-9 sm:h-9 rounded-xl bg-emerald-600 font-extrabold text-white text-xs sm:text-sm shadow-xs shrink-0">
            {currentIndex + 1}
          </div>
          <div className="min-w-0">
            <h1 className="text-[11px] xs:text-xs sm:text-sm lg:text-base font-extrabold text-slate-900 dark:text-white truncate max-w-[96px] xs:max-w-[140px] sm:max-w-xs lg:max-w-md">
              {ujianInfo?.judul || 'Lembar Ujian CBT'}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300 font-mono shrink-0">
                {currentIndex + 1}/{soalList.length}
              </span>
              {/* Indikator Sinkronisasi Ringkas yang tampak juga di Mobile */}
              <span
                className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                  syncStatus === 'saving'
                    ? 'bg-amber-500 animate-ping'
                    : syncStatus === 'offline_saved' || syncStatus === 'error'
                    ? 'bg-sky-500'
                    : 'bg-emerald-500'
                }`}
                title={
                  syncStatus === 'saving'
                    ? 'Menyimpan jawaban...'
                    : syncStatus === 'offline_saved'
                    ? 'Tersimpan aman di memori perangkat (Offline)'
                    : 'Tersimpan di server'
                }
              />
              {violationCount > 0 && (
                <span className="text-[9px] sm:text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-800 shrink-0">
                  ⚠️ {violationCount}/10
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Realtime Countdown Timer (Tabular Nums Anti-Geser) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div
            className={`flex items-center gap-1 sm:gap-1.5 border px-2.5 sm:px-3 py-1.5 rounded-xl shadow-2xs transition-colors ${
              sisaDetik <= 300
                ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10'
            }`}
          >
            <Clock
              className={`w-3.5 h-3.5 shrink-0 ${
                sisaDetik <= 300 ? 'text-rose-600 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            />
            <span
              className={`font-mono swiss-tabular-nums text-xs sm:text-sm font-black tracking-wider ${
                sisaDetik <= 300 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {formatTime(sisaDetik)}
            </span>
          </div>

          {/* Desktop Sync Badge */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border ${
              syncStatus === 'saving'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80'
                : syncStatus === 'offline_saved' || syncStatus === 'error'
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/80'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
            }`}
          >
            {syncStatus === 'offline_saved' || syncStatus === 'error' ? (
              <Database className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
            ) : (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  syncStatus === 'saving' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
                }`}
              />
            )}
            <span>
              {syncStatus === 'saving'
                ? 'Menyimpan...'
                : syncStatus === 'offline_saved' || syncStatus === 'error'
                ? 'Offline Aman'
                : 'Tersimpan'}
            </span>
          </div>

          {isSEB ? (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>SEB Kiosk</span>
            </div>
          ) : isExambro ? (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>Exambro</span>
            </div>
          ) : null}
        </div>

        {/* Right: Quick Tools (Font Size Mobile & Desktop, ThemeToggle, Daftar Soal) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Tombol Ukuran Teks di Smartphone (44x44px Touch Target - Siklus Kecil/Sedang/Besar/Ekstra Besar) */}
          <button
            type="button"
            onClick={cycleMobileFontSize}
            className="md:hidden min-w-[42px] min-h-[42px] px-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold flex items-center justify-center gap-0.5 active:scale-95 touch-manipulation"
            title="Ubah Ukuran Teks Soal (Kecil / Sedang / Besar / Ekstra Besar)"
          >
            <Type className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{fontLabelMap[fontSize]}</span>
          </button>

          {/* Font Resizer Lengkap untuk Tablet & Desktop */}
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-950 rounded-xl p-0.5 border border-slate-200 dark:border-white/10 text-xs">
            {(['small', 'normal', 'large', 'xlarge'] as FontScaleSize[]).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => handleChangeFontSize(sz)}
                className={`min-h-[34px] px-2.5 py-1 rounded-lg transition font-bold cursor-pointer ${
                  fontSize === sz
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {fontLabelMap[sz]}
              </button>
            ))}
          </div>

          <ThemeToggle size="sm" />

          {/* Tombol Layar Penuh: Hanya tampil saat BELUM fullscreen (agar siswa tidak bisa menekan tombol keluar fullscreen selama ujian!) */}
          {deviceSec?.hasFullscreen && (!isFullscreen || ujianInfo?.lockBrowser === false) && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="min-w-[40px] min-h-[40px] p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs hidden sm:flex items-center justify-center transition cursor-pointer touch-manipulation"
              title="Masuk Mode Layar Penuh"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Grid Nomor Soal Button (44px Touch Target) */}
          <button
            type="button"
            onClick={() => setShowNavGrid(!showNavGrid)}
            className="min-h-[42px] flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold transition shadow-2xs cursor-pointer shrink-0 active:scale-95 touch-manipulation"
          >
            <Grid className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">Soal ({totalTerjawab}/{soalList.length})</span>
            <span className="sm:hidden font-mono text-[11px]">{totalTerjawab}/{soalList.length}</span>
          </button>
        </div>
      </header>

      {/* Masa Adaptasi 5 Detik Banner */}
      {cooldownRemaining > 0 && (
        <div className="bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-600 text-white border-b border-emerald-700 px-3 sm:px-8 py-2 text-xs font-semibold flex items-center justify-between gap-3 z-30 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/25 text-white font-black text-sm shrink-0">
              {cooldownRemaining}s
            </div>
            <span className="font-bold text-xs truncate">
              Masa adaptasi layar aktif ({cooldownRemaining} detik bebas sanksi pelanggaran)
            </span>
          </div>
        </div>
      )}

      {/* Warning Alert Anti-Cheat */}
      {cheatWarning && (
        <div className="bg-rose-50 dark:bg-rose-950/80 border-b border-rose-200 dark:border-rose-800 px-3 sm:px-8 py-2 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-center justify-between gap-2.5 z-20 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="leading-snug">{cheatWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setCheatWarning(null)}
            className="min-h-[34px] text-[11px] bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-lg text-white font-bold transition shrink-0 cursor-pointer touch-manipulation"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Content Area: Momentum Scroll Lancar, Cubit Layar (Pinch-Zoom), & Ruang Aman untuk Bottom Navigation di Ponsel */}
      <main
        ref={questionStageRef}
        id="cbt-question-zoom-stage"
        className="flex-1 max-w-5xl w-full mx-auto px-2.5 sm:px-5 lg:px-6 pt-3 sm:pt-5 pb-28 sm:pb-8 flex flex-col justify-between overscroll-contain"
        style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
      >
        <div className="w-full overflow-x-auto custom-scrollbar rounded-2xl sm:rounded-3xl">
          <div
            id="cbt-question-zoom-surface"
            style={examZoomScale > 1.01 ? ({ zoom: examZoomScale } as React.CSSProperties) : undefined}
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl sm:rounded-3xl p-3.5 xs:p-4 sm:p-7 shadow-xs dark:shadow-xl space-y-4 sm:space-y-6"
          >
          {/* Bar Info Tipe Soal, Kontrol Zoom Cepat & Indikator Cubit Layar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-lg border border-emerald-200/70 dark:border-emerald-800/60">
                Butir Soal #{currentIndex + 1} • {currentSoal.tipeSoal.replace('_', ' ')}
              </span>
              {currentJawaban.raguRagu && (
                <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-800">
                  Ditandai Ragu-Ragu
                </span>
              )}
            </div>

            {/* Kontrol Zoom Lembar Soal (Mendukung Cubit Layar 2 Jari + Tombol - / % / +) */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-1.5 py-0.5">
              <button
                type="button"
                aria-label="Perkecil tampilan soal"
                disabled={examZoomScale <= 1}
                onClick={() => adjustExamZoom(-0.25)}
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200 cursor-pointer touch-manipulation"
                title="Perkecil Tampilan Soal"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={resetExamZoom}
                className="min-h-[32px] px-1.5 font-mono font-extrabold text-[11px] text-emerald-700 dark:text-emerald-400 cursor-pointer touch-manipulation"
                title="Cubit layar 2 jari untuk zoom, ketuk angka ini untuk reset ke 100%"
              >
                {Math.round(examZoomScale * 100)}%
              </button>
              <button
                type="button"
                aria-label="Perbesar tampilan soal"
                disabled={examZoomScale >= 3}
                onClick={() => adjustExamZoom(0.25)}
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200 cursor-pointer touch-manipulation"
                title="Perbesar Tampilan Soal"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {examZoomScale > 1.01 && (
                <button
                  type="button"
                  aria-label="Reset zoom ke 100%"
                  onClick={resetExamZoom}
                  className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 cursor-pointer touch-manipulation"
                  title="Reset Zoom 100%"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Question Audio Player */}
          {currentSoal.mediaAudio && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <audio ref={audioRef} controls src={currentSoal.mediaAudio} className="w-full h-9" />
            </div>
          )}

          {/* Question Media Gambar (Mendukung Pinch-to-Zoom & Ketuk untuk Lightbox Zoom) */}
          {currentSoal.mediaGambar && (
            <div className="relative overflow-hidden bg-slate-50/60 dark:bg-slate-950/40 rounded-2xl p-2 max-w-lg mx-auto border border-slate-100 dark:border-white/5">
              <img
                src={currentSoal.mediaGambar}
                alt="Gambar Soal"
                className="cbt-zoomable-media w-full h-auto object-contain max-h-64 sm:max-h-80 mx-auto cursor-zoom-in"
              />
              <span className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 pointer-events-none">
                <ZoomIn className="w-3 h-3" />
                <span>Ketuk gambar untuk memperbesar detail</span>
              </span>
            </div>
          )}

          {/* Question Text with MathRenderer (Mendukung penuh Akar Kuadrat, Akar Pangkat-n, Pecahan, Arab, Jawa) */}
          <div className={`text-slate-900 dark:text-slate-100 break-words leading-relaxed overflow-x-auto custom-scrollbar pb-1 ${questionFontClass}`}>
            <MathRenderer content={currentSoal.pertanyaan} />
          </div>

          {/* Opsi Jawaban: Pilihan Ganda & Benar Salah (Target Sentuh >= 48px) */}
          {(currentSoal.tipeSoal === 'PG' || currentSoal.tipeSoal === 'BENAR_SALAH') && (
            <div className="space-y-2.5 sm:space-y-3 pt-3 sm:pt-4 border-t border-slate-100 dark:border-white/10">
              {currentSoal.opsiJawaban.map((opsi) => {
                const isSelected = currentJawaban.jawabanDipilih === opsi.id;

                return (
                  <button
                    key={opsi.id}
                    type="button"
                    onClick={() => handleSelectOpsi(currentSoal.id, opsi.id)}
                    className={`min-h-[52px] w-full text-left p-3 sm:p-4 rounded-2xl transition-all flex items-start gap-3 sm:gap-3.5 cursor-pointer touch-manipulation active:scale-[0.99] ${
                      isSelected
                        ? 'bg-emerald-50/95 dark:bg-emerald-950/60 border-2 border-emerald-500 dark:border-emerald-400 text-emerald-950 dark:text-emerald-100 shadow-xs ring-2 ring-emerald-500/25'
                        : 'bg-slate-50/40 dark:bg-slate-950/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-extrabold flex items-center justify-center text-xs sm:text-sm transition ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs scale-105'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opsi.label}
                    </div>
                    <div className={`flex-1 pt-1 break-words min-w-0 space-y-2 ${optionFontClass} ${isSelected ? 'font-semibold text-emerald-950 dark:text-emerald-100' : 'text-slate-800 dark:text-slate-200'}`}>
                      <MathRenderer content={opsi.konten} />
                      {opsi.gambar && (
                        <img
                          src={opsi.gambar}
                          alt={`Gambar Opsi ${opsi.label}`}
                          className="cbt-zoomable-media max-h-44 w-auto rounded-xl object-contain cursor-zoom-in"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Opsi Jawaban: Pilihan Ganda Kompleks */}
          {currentSoal.tipeSoal === 'PG_KOMPLEKS' && (
            <div className="space-y-2.5 sm:space-y-3 pt-3 sm:pt-4 border-t border-slate-100 dark:border-white/10">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-2">
                <span>💡</span>
                <span>Pilihan Ganda Kompleks: Anda dapat memilih lebih dari satu jawaban yang benar.</span>
              </div>
              {currentSoal.opsiJawaban.map((opsi) => {
                let chosenIds: string[] = [];
                try {
                  if (currentJawaban.jawabanDipilih) chosenIds = JSON.parse(currentJawaban.jawabanDipilih);
                } catch {
                  chosenIds = [];
                }
                const isSelected = chosenIds.includes(opsi.id);

                return (
                  <button
                    key={opsi.id}
                    type="button"
                    onClick={() => handleSelectOpsiKompleks(currentSoal.id, opsi.id)}
                    className={`min-h-[52px] w-full text-left p-3 sm:p-4 rounded-2xl transition-all flex items-start gap-3 sm:gap-3.5 cursor-pointer touch-manipulation active:scale-[0.99] ${
                      isSelected
                        ? 'bg-teal-50/95 dark:bg-teal-950/60 border-2 border-teal-500 dark:border-teal-400 text-teal-950 dark:text-teal-100 shadow-xs ring-2 ring-teal-500/25'
                        : 'bg-slate-50/40 dark:bg-slate-950/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-extrabold flex items-center justify-center text-xs sm:text-sm transition ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-xs scale-105'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isSelected ? '✓' : opsi.label}
                    </div>
                    <div className={`flex-1 pt-1 break-words min-w-0 space-y-2 ${optionFontClass} ${isSelected ? 'font-semibold text-teal-950 dark:text-teal-100' : 'text-slate-800 dark:text-slate-200'}`}>
                      <MathRenderer content={opsi.konten} />
                      {opsi.gambar && (
                        <img
                          src={opsi.gambar}
                          alt={`Gambar Opsi ${opsi.label}`}
                          className="cbt-zoomable-media max-h-44 w-auto rounded-xl object-contain cursor-zoom-in"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Opsi Jawaban: Mencocokkan / Menjodohkan */}
          {currentSoal.tipeSoal === 'MENJODOHKAN' && (
            <div className="space-y-3 pt-3 sm:pt-4 border-t border-slate-100 dark:border-white/10">
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-300 px-3 py-2 rounded-xl text-[11px] font-semibold flex items-center gap-1.5">
                <span>🔄</span>
                <span>Pasangkan setiap pernyataan di kiri dengan pilihan pasangan yang tepat.</span>
              </div>

              {(() => {
                let matchingPairs: { left: string; right: string }[] = [];
                try {
                  if (currentSoal.matchingData) {
                    matchingPairs = JSON.parse(currentSoal.matchingData);
                  }
                } catch {
                  matchingPairs = [];
                }

                if (matchingPairs.length === 0) {
                  return (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Data kotak pencocokan belum diatur oleh pembuat soal.
                    </div>
                  );
                }

                const rightOptions = Array.from(new Set(matchingPairs.map((p) => p.right.trim()))).sort();

                let currentMatches: Record<string, string> = {};
                try {
                  if (currentJawaban.jawabanDipilih) {
                    currentMatches = JSON.parse(currentJawaban.jawabanDipilih);
                  }
                } catch {
                  currentMatches = {};
                }

                return (
                  <div className="space-y-2.5">
                    {matchingPairs.map((pair, pIdx) => {
                      const selectedRight = currentMatches[pair.left] || '';
                      const isMatched = Boolean(selectedRight);

                      return (
                        <div
                          key={pIdx}
                          className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                            isMatched
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500/60 shadow-2xs'
                              : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-white/10'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-xs mt-0.5">
                              {pIdx + 1}
                            </span>
                            <div className={`font-semibold text-slate-900 dark:text-white min-w-0 ${optionFontClass}`}>
                              <MathRenderer content={pair.left} />
                            </div>
                          </div>

                          <div className="hidden sm:flex text-slate-400 font-bold px-1 text-xs">➔</div>

                          <div className="flex-1 sm:max-w-xs">
                            <select
                              value={selectedRight}
                              onChange={(e) => handleSelectMatching(currentSoal.id, pair.left, e.target.value)}
                              className={`min-h-[44px] w-full px-3 py-2 rounded-xl text-base sm:text-xs font-semibold border cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isMatched
                                  ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <option value="" className="bg-white dark:bg-slate-900 text-slate-500">
                                -- Pilih Pasangan --
                              </option>
                              {rightOptions.map((opt, oIdx) => (
                                <option
                                  key={oIdx}
                                  value={opt}
                                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                >
                                  {opt.replace(/\$/g, '')}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Input Jawaban: Isian Singkat (Font 16px di mobile anti auto-zoom Safari/Chrome) */}
          {currentSoal.tipeSoal === 'ISIAN' && (
            <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-white/10 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Ketik Jawaban Singkat Anda:
              </label>
              <input
                type="text"
                value={currentJawaban.jawabanDipilih || ''}
                onChange={(e) => handleInputTeks(currentSoal.id, e.target.value)}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                onSelect={(e) => {
                  const inp = e.currentTarget;
                  if (inp.selectionStart !== inp.selectionEnd) {
                    inp.setSelectionRange(inp.selectionEnd, inp.selectionEnd);
                  }
                }}
                placeholder="Ketikkan jawaban di sini..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="min-h-[48px] w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-base sm:text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
          )}

          {/* Input Jawaban: Esai / Uraian */}
          {currentSoal.tipeSoal === 'ESAI' && (
            <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-white/10 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Tuliskan Uraian Lengkap Jawaban Anda:
              </label>
              <textarea
                rows={5}
                value={currentJawaban.jawabanDipilih || ''}
                onChange={(e) => handleInputTeks(currentSoal.id, e.target.value)}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                onSelect={(e) => {
                  const ta = e.currentTarget;
                  if (ta.selectionStart !== ta.selectionEnd) {
                    ta.setSelectionRange(ta.selectionEnd, ta.selectionEnd);
                  }
                }}
                placeholder="Tuliskan langkah pengerjaan atau uraian jawaban secara jelas..."
                autoCorrect="off"
                spellCheck={false}
                className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-base sm:text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition leading-relaxed"
              />
            </div>
          )}
          </div>
        </div>

        {/* Bottom Navigation Toolbar (44px+ Touch Target Ergonomis di Smartphone Android & iOS Safari) */}
        <div className="fixed sm:static bottom-0 left-0 right-0 z-30 sm:mt-4 grid grid-cols-3 items-center gap-2 bg-white/98 dark:bg-slate-900/98 sm:bg-white sm:dark:bg-slate-900 border-t sm:border border-slate-200/90 dark:border-white/10 px-3 py-2 sm:p-3 sm:rounded-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:shadow-xs pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          {/* Tombol Sebelumnya */}
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => navigateToQuestion(currentIndex - 1)}
            className="min-h-[46px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer border border-slate-200 dark:border-white/10 active:scale-95 touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span className="truncate">Sebelumnya</span>
          </button>

          {/* Tombol Ragu-Ragu */}
          <button
            type="button"
            onClick={handleToggleRagu}
            className={`min-h-[46px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer border active:scale-95 touch-manipulation ${
              currentJawaban.raguRagu
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
            }`}
          >
            <BookmarkCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">{currentJawaban.raguRagu ? 'Ragu: Ya' : 'Ragu-Ragu'}</span>
          </button>

          {/* Tombol Selanjutnya / Selesai */}
          {currentIndex === soalList.length - 1 ? (
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="min-h-[46px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xs sm:text-sm font-extrabold text-white shadow-sm shadow-emerald-600/20 transition cursor-pointer active:scale-95 touch-manipulation"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Selesai</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigateToQuestion(currentIndex + 1)}
              className="min-h-[46px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm font-bold text-white shadow-xs shadow-emerald-600/20 transition cursor-pointer active:scale-95 touch-manipulation"
            >
              <span className="truncate">Selanjutnya</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          )}
        </div>
      </main>

      {/* Grid Nomor Soal Bottom-Sheet / Modal (Momentum Scroll & 44px+ Buttons) */}
      {showNavGrid && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 overscroll-contain"
          onClick={() => setShowNavGrid(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 sm:zoom-in duration-200 max-h-[85dvh] flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))] overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Daftar Nomor Soal ({totalTerjawab}/{soalList.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNavGrid(false)}
                className="min-h-[40px] text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-200 font-bold cursor-pointer transition touch-manipulation"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-2.5 overflow-y-auto overscroll-contain p-1 custom-scrollbar flex-1">
              {soalList.map((s, idx) => {
                const j = jawabanMap[s.id];
                const isAnswered = isSoalAnswered(s, j?.jawabanDipilih);
                const isRagu = Boolean(j?.raguRagu);
                const isCurrent = idx === currentIndex;

                let btnBg =
                  'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800';
                if (isRagu) {
                  btnBg = 'bg-amber-500 text-white font-black border-amber-600 shadow-2xs';
                } else if (isAnswered) {
                  btnBg = 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-2xs';
                }

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      navigateToQuestion(idx);
                      setShowNavGrid(false);
                    }}
                    className={`min-h-[46px] rounded-xl flex flex-col items-center justify-center border text-xs transition cursor-pointer font-bold active:scale-95 touch-manipulation ${btnBg} ${
                      isCurrent ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isRagu && <span className="text-[9px] font-normal leading-none">Ragu</span>}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-emerald-600 shrink-0" />
                <span className="font-medium truncate">Dijawab ({totalTerjawab})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-amber-500 shrink-0" />
                <span className="font-medium truncate">Ragu ({totalRagu})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 shrink-0" />
                <span className="font-medium truncate">Kosong ({soalList.length - totalTerjawab})</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowNavGrid(false);
                setShowSubmitModal(true);
              }}
              className="min-h-[46px] w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98 touch-manipulation shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kumpulkan / Selesaikan Ujian</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl space-y-4 sm:space-y-5 text-center animate-in fade-in zoom-in duration-200 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Konfirmasi Pengumpulan Ujian</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin mengakhiri dan mengumpulkan lembar jawaban ujian ini?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs">
              <div className="text-left">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Sudah Dijawab:</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {totalTerjawab} / {soalList.length} Soal
                </span>
              </div>
              <div className="text-left">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Masih Ragu-Ragu:</span>
                <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                  {totalRagu} Soal
                </span>
              </div>
            </div>

            <div
              className={`p-3 rounded-2xl border text-left text-xs ${
                !isAllRequiredAnswered
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {!isAllRequiredAnswered ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>
                  {!isAllRequiredAnswered
                    ? `Wajib Mengisi Seluruh Soal (${belumDijawabCount} Soal Belum Diisi)`
                    : 'Seluruh Soal Telah Terisi Lengkap'}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed">
                {!isAllRequiredAnswered
                  ? `⚠️ Anda belum dapat menyelesaikan ujian dan keluar dari layar penuh karena masih ada ${belumDijawabCount} butir soal yang kosong. Ketuk "Cek Soal Kosong" untuk melengkapinya.`
                  : '✓ Semua butir soal telah dijawab. Mode layar penuh akan otomatis keluar setelah Anda menekan tombol kumpulkan.'}
              </p>
            </div>

            {totalRagu > 0 && (
              <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 text-left font-medium">
                ⚠️ Anda masih memiliki <b>{totalRagu}</b> soal berstatus Ragu-ragu.
              </p>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={handleDownloadEmergencyBackup}
                className="min-h-[42px] w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation"
              >
                <HardDriveDownload className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Unduh Cadangan Jawaban Offline (.json)</span>
              </button>
            </div>

            <div className="flex gap-2.5 pt-2">
              {!isAllRequiredAnswered ? (
                <button
                  type="button"
                  onClick={() => {
                    const firstEmptyIdx = soalList.findIndex(
                      (s) => !isSoalAnswered(s, jawabanMap[s.id]?.jawabanDipilih)
                    );
                    setShowSubmitModal(false);
                    if (firstEmptyIdx >= 0) navigateToQuestion(firstEmptyIdx);
                  }}
                  className="min-h-[46px] flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-extrabold text-white transition cursor-pointer touch-manipulation"
                >
                  Cek Soal Kosong
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="min-h-[46px] flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer touch-manipulation"
                >
                  Kembali Periksa
                </button>
              )}
              <button
                type="button"
                disabled={submitting || !isAllRequiredAnswered}
                onClick={() => handleSelesaiUjian(false)}
                className="min-h-[46px] flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation"
              >
                {submitting ? 'Mengumpulkan...' : 'Ya, Selesai & Keluar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
