'use client';

import React, { useEffect, useState, useRef, use } from 'react';
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
  HelpCircle,
  Sparkles,
  Database,
  HardDriveDownload,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import {
  cbtSecurityAudio,
  setupExamKeyboardLockdown,
  setupBrowserNavigationLock,
  setupAntiScreenshotAndRecording,
  requestUniversalFullscreen,
  exitUniversalFullscreen,
  isCurrentlyFullscreen,
  detectDeviceSecurityInfo,
  enableChromeKeyboardLock,
  unlockChromeKeyboardLock,
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

  // UI state
  const [showNavGrid, setShowNavGrid] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'offline_saved' | 'error'>('saved');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPrivacyObscured, setIsPrivacyObscured] = useState(false);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);
  const [isExambro, setIsExambro] = useState(false);
  const [isSEB, setIsSEB] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});
  const isSubmittedRef = useRef<boolean>(false);
  const securityUnlockedAtRef = useRef<number | null>(null);
  const lastViolationTimeRef = useRef<number>(0);

  // 1. Inisialisasi Android Exambro Native Bridge & Fetch Soal dengan Dukungan Fallback IndexedDB
  useEffect(() => {
    // Deteksi apakah sedang berjalan di aplikasi Android CBT Exambro atau Safe Exam Browser (SEB)
    const exambroInfo = detectExambroApp();
    setIsExambro(exambroInfo.isExambro);
    setIsSEB(exambroInfo.isSEB);

    // Daftarkan Global JavaScript Hooks (window.cbtExambro*) agar aplikasi Android dapat berkomunikasi dua arah
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
    };
  }, [ujianId]);

  // Background Auto-Sync: Mengirim jawaban tertunda dari IndexedDB ke Server CBT saat koneksi pulih
  useEffect(() => {
    if (!ujianId) return;

    const attemptAutoSync = async () => {
      if (isSubmittedRef.current) return;
      try {
        const res = await syncPendingAnswersToServer(ujianId, sisaDetik);
        if (res.success && res.syncedCount > 0) {
          setSyncStatus('saved');
        }
      } catch (e) {
        // silent sync retry
      }
    };

    const syncInterval = setInterval(attemptAutoSync, 6000);
    window.addEventListener('online', attemptAutoSync);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('online', attemptAutoSync);
    };
  }, [ujianId, sisaDetik]);

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
        // Coba fallback ke cadangan sesi ujian IndexedDB jika server down
        const cachedSession = await getExamSessionFromIndexedDB(ujianId);
        if (cachedSession && cachedSession.soalList?.length) {
          setUjianInfo(cachedSession.ujianInfo);
          setPesertaUjianId(cachedSession.pesertaUjianId || null);
          setSoalList(cachedSession.soalList);
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

      setUjianInfo(data.data.ujian);
      setPesertaUjianId(data.data.pesertaUjianId);
      setSoalList(data.data.soalList);
      setSisaDetik(data.data.ujian.sisaWaktuDetik || 0);

      // Fitur Anti-Cheat & Lockdown Sistem:
      // Selalu WAJIB aktif (lockBrowser !== false). Hanya ujian tanpa proteksi eksplisit (lockBrowser === false) yang di-bypass.
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

      // 2. Ambil cache jawaban offline lokal dari IndexedDB & Native Android Exambro
      const localCachedAnswers = await getAllCachedAnswersFromIndexedDB(ujianId);
      const nativeExambroAnswers = await fetchAnswersFromAndroidExambro(ujianId);

      // Inisialisasi jawaban tersimpan & merge dengan cache IndexedDB + Exambro
      const map: Record<string, JawabanState> = {};
      data.data.soalList.forEach((s: SoalItem) => {
        map[s.id] = { jawabanDipilih: '', raguRagu: false };
      });

      // Isi dari data server
      data.data.jawabanTersimpan?.forEach((j: any) => {
        map[j.soalId] = {
          jawabanDipilih: j.jawabanDipilih || '',
          raguRagu: Boolean(j.raguRagu),
        };
        // Simpan jawaban server ke IndexedDB sebagai data ter-sync
        saveAnswerToIndexedDB({
          ujianId,
          soalId: j.soalId,
          jawabanDipilih: j.jawabanDipilih || '',
          raguRagu: Boolean(j.raguRagu),
          syncedToServer: true,
        });
      });

      // Merge dengan cache IndexedDB lokal
      Object.keys(localCachedAnswers).forEach((soalId) => {
        const local = localCachedAnswers[soalId];
        if (local && !local.syncedToServer && local.jawabanDipilih) {
          map[soalId] = {
            jawabanDipilih: local.jawabanDipilih,
            raguRagu: local.raguRagu,
          };
        }
      });

      // Merge dengan cache Native Android Exambro jika ada
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

      // Coba sinkronisasi jika ada sisa jawaban pending di IndexedDB
      syncPendingAnswersToServer(ujianId, data.data.ujian.sisaWaktuDetik);
    } catch (err) {
      console.error('Koneksi server terganggu, mencoba pulihkan dari IndexedDB:', err);
      // Fallback ke cache IndexedDB
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

  // Aktivasi Protokol Keamanan Ringan (Fullscreen + Audio Alarms Tanpa Screen Capture)
  const handleActivateSecurity = async (): Promise<boolean> => {
    try {
      // 0. Unlock Web Audio & Speech synthesis untuk Safari macOS & iOS
      cbtSecurityAudio.unlockAudio();

      const devInfo = detectDeviceSecurityInfo();

      // 1. Eksekusi Fullscreen:
      // Di Mac (Safari/Chrome), iPad, dan Windows/Android -> minta Fullscreen
      // Di iPhone Safari (di mana Apple sengaja membatasi requestFullscreen pada HTML body) -> lewati tanpa melempar error
      if (devInfo.hasFullscreen) {
        try {
          await requestUniversalFullscreen();
          const fullscreenActive = isCurrentlyFullscreen();
          setIsFullscreen(fullscreenActive);
        } catch (fsErr) {
          console.warn('Fullscreen request non-fatal:', fsErr);
          setIsFullscreen(true);
        }
      } else {
        // iPhone / iOS Safari: Diizinkan langsung berjalan lancar dalam mode viewport mobile
        setIsFullscreen(true);
      }

      // LAYER 2: Enforce Kiosk mode dan FLAG_SECURE pada Android Exambro native bridge
      enforceExambroKioskSecurity();

      // 2. Buka lembar ujian dan aktifkan grace period 5 detik bebas pelanggaran
      securityUnlockedAtRef.current = Date.now();
      setIsSecurityUnlocked(true);
      setCooldownRemaining(5);

      // Jalankan hitung mundur 5 detik masa bebas pelanggaran
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
      // Tetap izinkan siswa masuk agar tidak terblokir
      setIsSecurityUnlocked(true);
      setIsFullscreen(true);
      return true;
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

  // 3. Anti-Cheat Engine Lintas Platform & Pengawasan Area Terkoordinasi (Anti-Collision State Machine)
  // Hanya aktif jika fitur lockBrowser dinyalakan oleh guru/admin pada paket ujian terkait.
  // Di luar fitur Anti-Cheat Lockdown (ujian biasa / latihan), peserta bebas melakukan scroll, sentuh, dan klik secara normal.
  useEffect(() => {
    if (!isSecurityUnlocked || ujianInfo?.lockBrowser === false) return;

    // Mutex & Debounce Ref untuk mencegah tabrakan event serentak
    let isHandlingViolation = false;
    let pendingViolationTimer: NodeJS.Timeout | null = null;

    // Dispatcher Terpadu Pengawasan Area (Mencegah multi-firing antara visibilitychange, blur, pagehide, dan fullscreenchange)
    const dispatchAreaViolation = (
      primaryType: 'TAB_SWITCH_ALERT' | 'APP_SWITCH_ALERT' | 'FULLSCREEN_EXIT' | 'KEYBOARD_SHORTCUT_VIOLATION' | 'MOUSE_LEAVE_ALERT',
      detailMsg: string,
      voiceWarning: string
    ) => {
      if (isSubmittedRef.current) return;
      if (securityUnlockedAtRef.current && Date.now() - securityUnlockedAtRef.current < 5000) {
        return;
      }

      // Jika sedang menangani event dalam jeda 800ms, jangan dobelkan peringatan
      if (isHandlingViolation) return;
      isHandlingViolation = true;

      // Jalankan trigger log dan suara terkoordinasi sekali saja
      triggerCheatLog(primaryType, detailMsg);
      cbtSecurityAudio.triggerFullWarning(voiceWarning);
      setCheatWarning(`Peringatan: ${detailMsg}`);

      // Buka kembali mutex setelah 1.2 detik
      if (pendingViolationTimer) clearTimeout(pendingViolationTimer);
      pendingViolationTimer = setTimeout(() => {
        isHandlingViolation = false;
      }, 1200);
    };

    // Browser History Trap (Cegah Tombol Back / Gesture Back HP)
    const cleanupHistoryLock = setupBrowserNavigationLock(() => {
      if (isSubmittedRef.current) return;
      dispatchAreaViolation(
        'KEYBOARD_SHORTCUT_VIOLATION',
        'Tombol kembali / navigasi dicegah! Harap tetap di lembar ujian.',
        'Dilarang menekan tombol kembali selama ujian!'
      );
    });

    // Anti-Screenshot & Anti-Screen-Record Protection
    const cleanupAntiScreenshot = setupAntiScreenshotAndRecording((detail) => {
      if (isSubmittedRef.current) return;
      // Langsung tutupi konten dengan privacy shield
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

    // Enforce Kiosk mode dan FLAG_SECURE pada Android Exambro native bridge
    enforceExambroKioskSecurity();

    // Mencegah Siswa Menutup Tab atau Refresh (BeforeUnload Trap)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmittedRef.current) return;
      const warningText = 'Peringatan: Ujian sedang berlangsung! Jika Anda keluar atau memuat ulang, progres ujian dan status Anda akan dicatat pelanggaran.';
      e.preventDefault();
      e.returnValue = warningText;
      return warningText;
    };

    // Keyboard lockdown (Command di macOS, Ctrl di Windows/Linux, Alt, DevTools, Close tab)
    const cleanupKeyboard = setupExamKeyboardLockdown((reason) => {
      dispatchAreaViolation(
        'KEYBOARD_SHORTCUT_VIOLATION',
        reason,
        'Peringatan! Tombol kombinasi keyboard dilarang selama ujian!'
      );
    });

    // 1. Visibility Change Listener (Tab Switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPrivacyObscured(true);
        dispatchAreaViolation(
          'TAB_SWITCH_ALERT',
          'Siswa berpindah tab browser atau meminimalkan browser',
          'Peringatan! Anda terdeteksi meninggalkan halaman ujian!'
        );
      } else {
        // Pulihkan perlindungan privasi setelah tab kembali fokus
        setTimeout(() => {
          setIsPrivacyObscured(false);
        }, 500);
      }
    };

    // 2. Window Blur Listener (App Switch / Alt+Tab) - dengan debounce halus agar tidak false positive
    let blurTimeout: NodeJS.Timeout | null = null;
    const handleWindowBlur = () => {
      // Jika dokumen sudah hidden, event sudah ditangani oleh visibilitychange
      if (document.hidden) return;

      // Di smartphone mobile (Android / iOS), window blur sering terpicu secara false-positive
      // ketika memunculkan keyboard virtual on-screen, dropdown/select, atau address bar autohide.
      const devInfo = detectDeviceSecurityInfo();
      if (devInfo.isMobile) return;

      if (blurTimeout) clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        if (!document.hasFocus() && !document.hidden && !isSubmittedRef.current) {
          setIsPrivacyObscured(true);
          dispatchAreaViolation(
            'APP_SWITCH_ALERT',
            'Siswa berpindah aplikasi lain (Jendela Tidak Fokus)',
            'Peringatan! Dilarang membuka aplikasi lain selama ujian!'
          );
        }
      }, 350);
    };

    const handleWindowFocus = () => {
      if (blurTimeout) clearTimeout(blurTimeout);
      setIsPrivacyObscured(false);
    };

    // 3. Page Hide Listener
    const handlePageHide = () => {
      dispatchAreaViolation(
        'TAB_SWITCH_ALERT',
        'Siswa menutup atau menyembunyikan halaman ujian',
        'Peringatan! Dilarang menutup halaman ujian!'
      );
    };

    // 4. Deteksi Kursor Mouse Keluar Viewport (Hanya peringatan buzzer lokal tanpa mencatat ke server)
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

    // 5. Fullscreen Change Listener
    const handleFullscreenChange = () => {
      const inFullscreen = isCurrentlyFullscreen();
      setIsFullscreen(inFullscreen);
      if (isSubmittedRef.current) return;

      const devInfo = detectDeviceSecurityInfo();
      if (!inFullscreen && devInfo.hasFullscreen) {
        dispatchAreaViolation(
          'FULLSCREEN_EXIT',
          'Siswa keluar dari mode layar penuh',
          'Peringatan! Layar terkunci! Harap segera kembali ke mode layar penuh!'
        );

        // Otomatis kembalikan ke layar penuh jika diizinkan browser
        const rootElem = document.getElementById('cbt-exam-root') || document.documentElement;
        requestUniversalFullscreen(rootElem as HTMLElement).then((success) => {
          if (success) {
            enableChromeKeyboardLock();
            setIsFullscreen(true);
          }
        }).catch(() => {});
      }
    };

    // 6. Click-to-reenter Fullscreen
    const handleDocumentClickToFullscreen = () => {
      if (isSubmittedRef.current) return;
      if (!isCurrentlyFullscreen()) {
        const devInfo = detectDeviceSecurityInfo();
        if (devInfo.hasFullscreen && !devInfo.isMobile && !devInfo.isTablet) {
          const rootElem = document.getElementById('cbt-exam-root') || document.documentElement;
          requestUniversalFullscreen(rootElem as HTMLElement).then((success) => {
            if (success) {
              enableChromeKeyboardLock();
              setIsFullscreen(true);
            }
          }).catch(() => {});
        }
      }
    };

    // 7. Context Menu, Copy, Cut, Paste, Drag & Selection Prevention (Semua Perangkat Termasuk Mobile & WebView)
    const handleContextMenu = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      cbtSecurityAudio.playWarningBuzzer();
      setCheatWarning('Peringatan: Menu klik kanan / menu konteks dinonaktifkan!');
    };

    const handleCopyCutPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      cbtSecurityAudio.playWarningBuzzer();
      const actionName =
        e.type === 'copy' ? 'Menyalin (Copy)' : e.type === 'cut' ? 'Memotong (Cut)' : 'Menempel (Paste)';
      setCheatWarning(`Peringatan: Fitur ${actionName} dilarang selama ujian!`);
    };

    const handleSelectStart = (e: Event) => {
      // Izinkan pemilihan teks jika target berada dalam input atau textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // 8. Mobile App Lifecycle & Split-Screen / App-Switch Detection
    // Menangkap perpindahan aplikasi saat notification shade ditarik atau multi-window diaktifkan
    const handleWindowFocusChange = () => {
      if (document.hidden) {
        dispatchAreaViolation(
          'TAB_SWITCH_ALERT',
          'Siswa berpindah tab / aplikasi browser mobile',
          'Peringatan! Dilarang meninggalkan layar ujian!'
        );
      }
    };

    // Mencegah pull-down refresh gesture di Android Chrome / Safari yang bisa memicu reload
    const handleTouchMove = (e: TouchEvent) => {
      // Jika scroll berada di paling atas dan mencoba menarik ke bawah
      if (window.scrollY === 0 && e.touches[0].clientY > 0) {
        // biarkan browser menangani scroll biasa kecuali pull-to-refresh
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('click', handleDocumentClickToFullscreen, { capture: true });
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

    return () => {
      if (pendingViolationTimer) clearTimeout(pendingViolationTimer);
      cleanupHistoryLock();
      cleanupKeyboard();
      cleanupAntiScreenshot();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('click', handleDocumentClickToFullscreen, { capture: true });
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
    };
  }, [isSecurityUnlocked, pesertaUjianId, ujianInfo]);

  const triggerCheatLog = async (aktivitas: string, detail: string) => {
    // 1. Masa penyesuaian 5 detik pertama: bypass semua pelanggaran
    if (securityUnlockedAtRef.current && Date.now() - securityUnlockedAtRef.current < 5000) {
      console.log(`[CBT Security] Pelanggaran '${aktivitas}' di-bypass selama masa adaptasi 5 detik.`);
      return;
    }

    // 2. Debounce anti-spam: minimal jeda 4 detik antar laporan pelanggaran
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
          `Peringatan Pelanggaran (${currentViolation}/10): Dilarang keluar dari halaman ujian atau berpindah aplikasi! Sisa toleransi: ${sisaPelanggaran} kali lagi sebelum akun terkunci otomatis.`
        );
      }
    } catch (e) {
      // silent
    }
  };

  // 4. Autosave Jawaban ke IndexedDB Client Caching & Server Realtime
  const saveJawaban = async (soalId: string, value: string, ragu: boolean, immediate = true) => {
    // 1. Update React Local State
    setJawabanMap((prev) => ({
      ...prev,
      [soalId]: {
        jawabanDipilih: value,
        raguRagu: ragu,
      },
    }));

    // 2. Simpan seketika ke IndexedDB Client Caching & Native Android Exambro
    saveAnswerToIndexedDB({
      ujianId,
      soalId,
      jawabanDipilih: value,
      raguRagu: ragu,
      sisaDetik,
      syncedToServer: false,
    });
    saveAnswerToAndroidExambro({
      ujianId,
      soalId,
      jawabanDipilih: value,
      raguRagu: ragu,
      sisaDetik,
    });

    // 3. Fungsi kirim payload ke server CBT
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
            sisaDetik,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          // Tandai di IndexedDB bahwa data butir ini sudah terkirim ke server
          await markAnswersAsSynced(ujianId, [soalId]);
          setSyncStatus('saved');
        } else {
          // Tetap aman di IndexedDB
          setSyncStatus('offline_saved');
        }
      } catch (e) {
        console.warn('[CBT Offline Sync] Server tidak dapat dijangkau. Jawaban aman tersimpan di IndexedDB browser.');
        setSyncStatus('offline_saved');
      }
    };

    if (immediate) {
      // Untuk Pilihan Ganda / Kompleks / Menjodohkan / Ragu-ragu: Kirim seketika
      if (textDebounceRef.current[soalId]) {
        clearTimeout(textDebounceRef.current[soalId]);
      }
      sendPayload();
    } else {
      // Untuk Ketik Teks Isian/Esai: Debounce 400ms agar hemat request tapi tetap realtime saat selesai mengetik
      if (textDebounceRef.current[soalId]) {
        clearTimeout(textDebounceRef.current[soalId]);
      }
      textDebounceRef.current[soalId] = setTimeout(() => {
        sendPayload();
      }, 400);
    }
  };

  // Toggle Pilihan Ganda Biasa / Benar-Salah
  const handleSelectOpsi = (soalId: string, opsiId: string) => {
    if (submitting || isSubmittedRef.current) return;
    const curr = jawabanMap[soalId] || { jawabanDipilih: '', raguRagu: false };
    const nextVal = curr.jawabanDipilih === opsiId ? '' : opsiId;
    saveJawaban(soalId, nextVal, curr.raguRagu, true);
  };

  // Toggle Pilihan Ganda Kompleks (Bisa pilih multiple)
  const handleSelectOpsiKompleks = (soalId: string, opsiId: string) => {
    if (submitting || isSubmittedRef.current) return;
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

    saveJawaban(soalId, JSON.stringify(currentIds), curr.raguRagu, true);
  };

  // Toggle Ragu-Ragu
  const handleToggleRagu = () => {
    if (submitting || isSubmittedRef.current) return;
    const currentSoal = soalList[currentIndex];
    if (!currentSoal) return;
    const curr = jawabanMap[currentSoal.id] || { jawabanDipilih: '', raguRagu: false };
    saveJawaban(currentSoal.id, curr.jawabanDipilih, !curr.raguRagu, true);
  };

  // Input Teks untuk Isian / Esai
  const handleInputTeks = (soalId: string, text: string) => {
    if (submitting || isSubmittedRef.current) return;
    const curr = jawabanMap[soalId] || { jawabanDipilih: '', raguRagu: false };
    saveJawaban(soalId, text, curr.raguRagu, false);
  };

  // Pilih Pasangan Pencocokan / Menjodohkan
  const handleSelectMatching = (soalId: string, leftText: string, rightText: string) => {
    if (submitting || isSubmittedRef.current) return;
    const curr = jawabanMap[soalId] || { jawabanDipilih: '', raguRagu: false };
    let mapping: Record<string, string> = {};
    try {
      if (curr.jawabanDipilih) {
        mapping = JSON.parse(curr.jawabanDipilih);
      }
    } catch (e) {
      mapping = {};
    }

    if (rightText === '') {
      delete mapping[leftText];
    } else {
      mapping[leftText] = rightText;
    }

    saveJawaban(soalId, JSON.stringify(mapping), curr.raguRagu, true);
  };

  // Unduh Cadangan Jawaban Darurat (Emergency Export)
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
    } catch (e) {
      alert('Gagal mengunduh cadangan jawaban.');
    }
  };

  // Submit / Selesai Ujian
  const handleSelesaiUjian = async (isAuto = false) => {
    // 0. Segera bersihkan dan flush semua timer debounce teks jika ada soal isian/esai yang baru saja diketik
    Object.keys(textDebounceRef.current).forEach((sid) => {
      if (textDebounceRef.current[sid]) {
        clearTimeout(textDebounceRef.current[sid]);
        delete textDebounceRef.current[sid];
      }
    });

    // Validasi Minimal Jawaban
    const minJawaban = ujianInfo?.minJawaban ? Number(ujianInfo.minJawaban) : null;
    if (!isAuto && minJawaban && minJawaban > 0) {
      if (totalTerjawab < minJawaban) {
        alert(
          `Gagal Mengumpulkan Ujian!\n\nSyarat minimal jawaban belum terpenuhi. Anda baru menjawab ${totalTerjawab} butir soal, sedangkan tes ini mewajibkan minimal ${minJawaban} butir soal terjawab.`
        );
        setShowSubmitModal(false);
        return;
      }
    }

    setSubmitting(true);
    isSubmittedRef.current = true; // Tandai ujian sudah diselesaikan agar tidak trigger false-positive anti cheat
    try {
      // Pastikan semua jawaban saat ini juga tersimpan di IndexedDB sebelum final submit
      for (const [sid, jState] of Object.entries(jawabanMap)) {
        if (jState.jawabanDipilih) {
          saveAnswerToIndexedDB({
            ujianId,
            soalId: sid,
            jawabanDipilih: jState.jawabanDipilih,
            raguRagu: jState.raguRagu,
            sisaDetik,
            syncedToServer: false,
          });
        }
      }

      // Sinkronisasi sisa jawaban tertunda di IndexedDB sebelum final submit
      await syncPendingAnswersToServer(ujianId, sisaDetik);

      const res = await fetch(`/api/siswa/ujian/${ujianId}/selesai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAuto, jawabanMap }),
      });
      const data = await res.json();

      if (!data.success) {
        isSubmittedRef.current = false;
        alert(data.message || 'Gagal menyelesaikan ujian.');
        setSubmitting(false);
        return;
      }

      // Keluar dari layar penuh secara otomatis dan lepaskan seluruh kunci keamanan (Layer 1 & Layer 2)
      setIsSecurityUnlocked(false);
      await exitUniversalFullscreen();
      setIsFullscreen(false);
      releaseExambroKioskSecurity();

      // Mainkan suara ucapan selesai ujian yang ramah
      cbtSecurityAudio.speakSuccess('Ujian selesai, terimakasih telah mengerjakan');

      // Efek confetti ringan jika bukan perangkat low-end WebView
      try {
        const isLowEnd = typeof document !== 'undefined' && document.documentElement.classList.contains('low-end-webview');
        if (!isLowEnd && typeof confetti === 'function') {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
        }
      } catch (cErr) {
        // silent
      }

      const tampilkanHasil = data?.data?.tampilkanHasil !== false;
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
    } catch (e) {
      isSubmittedRef.current = false;
      alert(
        'Terjadi kendala koneksi ke server saat pengumpulan. Seluruh jawaban Anda tetap AMAN tersimpan di komputer ini (IndexedDB). Silakan laporkan ke proktor ruang atau klik tombol Cadangan Jawaban.'
      );
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
  const toggleFullscreen = async () => {
    try {
      if (!isCurrentlyFullscreen()) {
        await requestUniversalFullscreen();
        setIsFullscreen(isCurrentlyFullscreen());
      } else {
        await exitUniversalFullscreen();
        setIsFullscreen(isCurrentlyFullscreen());
      }
    } catch (_) {
      setIsFullscreen(isCurrentlyFullscreen());
    }
  };

  if (loading || !soalList.length) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-800 dark:text-slate-100">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4 shadow-sm" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Menyiapkan Lembar Ujian CBT...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Memuat soal dan preferensi ujian</p>
      </div>
    );
  }

  const currentSoal = soalList[currentIndex];
  const currentJawaban = jawabanMap[currentSoal?.id] || { jawabanDipilih: '', raguRagu: false };

  // Hitung jumlah soal sudah dijawab
  const totalTerjawab = Object.values(jawabanMap).filter((j) => Boolean(j.jawabanDipilih)).length;
  const totalRagu = Object.values(jawabanMap).filter((j) => j.raguRagu).length;

  return (
    <div
      id="cbt-exam-root"

      className={`min-h-screen bg-slate-100/80 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between font-sans pb-16 sm:pb-3 ${
        ujianInfo?.lockBrowser !== false ? 'cbt-exam-lockdown select-none' : 'selection:bg-emerald-500 selection:text-white'
      } ${isPrivacyObscured && ujianInfo?.lockBrowser !== false ? 'cbt-privacy-shield-active' : ''}`}
      style={{ touchAction: 'pan-y pinch-zoom' }}
    >
      {/* Privacy Shield Blindfold Overlay (Aktif saat tangkapan layar, PrintScreen, Alt+Tab, atau background screenshot) */}
      {isPrivacyObscured && ujianInfo?.lockBrowser !== false && !isSubmittedRef.current && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center mb-4 text-rose-500 animate-pulse">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-wide">
            Layar Soal Disamarkan (Privacy Guard)
          </h3>
          <p className="text-sm text-slate-400 mt-2 max-w-sm">
            Tangkapan layar, rekam layar, dan perpindahan jendela diblokir demi keamanan ujian.
          </p>
        </div>
      )}

      {/* Modal Aktivasi Keamanan & Screen Recording */}
      {ujianInfo?.lockBrowser !== false && (
        <SecurityLockModal
          isOpen={!isSecurityUnlocked}
          onActivateSecurity={handleActivateSecurity}
          requireScreenShare={true}
        />
      )}

      {/* Force Fullscreen Lockdown Overlay: Mencegah interaksi & mengunci layar jika keluar dari Fullscreen selama ujian aktif (hanya pada perangkat yang mendukung Fullscreen API) */}
      {isSecurityUnlocked && !isFullscreen && ujianInfo?.lockBrowser !== false && cooldownRemaining === 0 && !isSubmittedRef.current && (typeof window !== 'undefined' && detectDeviceSecurityInfo().hasFullscreen) && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl shadow-rose-900/40 space-y-5 animate-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-600 flex items-center justify-center mx-auto shadow-md">
              <ShieldAlert className="w-10 h-10 animate-bounce" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-100 dark:bg-rose-950/80 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800 inline-block">
                Layar Ujian Terkunci
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                Kembali ke Mode Layar Penuh!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Anda terdeteksi keluar dari mode layar penuh atau beralih jendela. Lembar soal terkunci demi menjaga integritas ujian.
              </p>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-left text-xs text-rose-800 dark:text-rose-300">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                Peringatan Sistem:
              </p>
              <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">
                Setiap upaya meninggalkan layar ujian otomatis dicatat dan dapat mengakibatkan ujian terkunci permanen oleh proktor.
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                cbtSecurityAudio.unlockAudio();
                await requestUniversalFullscreen();
                setIsFullscreen(isCurrentlyFullscreen());
              }}
              className="w-full py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Buka Kunci & Masuk Layar Penuh</span>
            </button>
          </div>
        </div>
      )}

      {/* Sticky Header CBT Compact (Light & Dark Modern Style) */}
      <header className="sticky top-0 z-40 px-2 sm:px-6 lg:px-8 py-1.5 sm:py-2.5 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/90 dark:border-white/10 backdrop-blur-md flex items-center justify-between gap-1.5 sm:gap-4 shadow-xs">
        {/* Left: Info Ujian & Nomor Soal */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-600 font-extrabold text-white text-xs sm:text-sm shadow-xs shadow-emerald-600/30 shrink-0">
            {currentIndex + 1}
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm lg:text-base font-extrabold text-slate-900 dark:text-white truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
              {ujianInfo?.judul || 'Lembar Ujian CBT'}
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
              <span className="text-[9px] sm:text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200/60 dark:border-emerald-800 font-mono shrink-0">
                Soal {currentIndex + 1} / {soalList.length}
              </span>
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate hidden xs:inline">
                • {currentSoal?.tipeSoal ? currentSoal.tipeSoal.replace('_', ' ') : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Realtime Countdown Timer */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-2 sm:px-3 py-1 rounded-xl shadow-2xs">
            <Clock className={`w-3.5 h-3.5 ${sisaDetik < 300 ? 'text-rose-600 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span
              className={`font-mono text-xs sm:text-sm font-extrabold tracking-wider ${
                sisaDetik < 300 ? 'text-rose-600 font-black' : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {formatTime(sisaDetik)}
            </span>
          </div>

          {/* Autosave Server Sync & IndexedDB Offline Status Indicator */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${
              syncStatus === 'saving'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 animate-pulse'
                : syncStatus === 'offline_saved' || syncStatus === 'error'
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/80'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
            }`}
            title={
              syncStatus === 'saving'
                ? 'Menyimpan jawaban ke server...'
                : syncStatus === 'offline_saved' || syncStatus === 'error'
                ? 'Server terputus/mati. Jawaban 100% AMAN tersimpan di IndexedDB browser siswa dan akan otomatis tersinkronisasi saat server aktif kembali.'
                : 'Semua jawaban tersimpan aman di server dan dicadangkan ke IndexedDB'
            }
          >
            {syncStatus === 'offline_saved' || syncStatus === 'error' ? (
              <Database className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
            ) : (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  syncStatus === 'saving'
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-emerald-500'
                }`}
              />
            )}
            <span>
              {syncStatus === 'saving'
                ? 'Menyimpan...'
                : syncStatus === 'offline_saved' || syncStatus === 'error'
                ? 'Cadangan Offline (IndexedDB)'
                : 'Tersimpan Online'}
            </span>
          </div>

          {/* Badge Indikator Android CBT Exambro App / Safe Exam Browser */}
          {isSEB ? (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 text-[10px] font-bold shadow-2xs"
              title="Aplikasi Safe Exam Browser (SEB) iOS / Android Aktif Terkunci Aman"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Safe Exam Browser (SEB)</span>
            </div>
          ) : isExambro ? (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 text-[10px] font-bold shadow-2xs"
              title="Aplikasi Android CBT Exambro Kiosk aktif dengan sinkronisasi native bridge storage ganda"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span>Exambro Kiosk</span>
            </div>
          ) : null}
        </div>

        {/* Right: Quick Tools (ThemeToggle, Font size, Grid Modal, Fullscreen) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Tombol Switch Tema Terpadu */}
          <ThemeToggle size="sm" />

          {/* Font Resizer (Khusus Layar Sedang/Besar) */}
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-950 rounded-xl p-1 border border-slate-200 dark:border-white/10 text-xs">
            <button
              onClick={() => setFontSize('normal')}
              className={`px-2.5 py-1 rounded-lg transition font-bold ${
                fontSize === 'normal'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2.5 py-1 rounded-lg transition font-bold text-sm ${
                fontSize === 'large'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              A+
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              className={`px-2.5 py-1 rounded-lg transition font-bold text-base ${
                fontSize === 'xlarge'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              A++
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs hidden sm:flex items-center gap-1 transition cursor-pointer"
            title="Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Grid Nomor Soal Button */}
          <button
            onClick={() => setShowNavGrid(!showNavGrid)}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
          >
            <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Daftar Soal ({totalTerjawab}/{soalList.length})</span>
            <span className="sm:hidden font-mono text-[11px]">{totalTerjawab}/{soalList.length}</span>
          </button>
        </div>
      </header>

      {/* Banner & Floating Countdown 5 Detik Sebelum Pelanggaran Dimulai */}
      {cooldownRemaining > 0 && (
        <div className="bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-600 text-white border-b border-emerald-700 px-3 sm:px-8 py-2.5 text-xs font-semibold flex items-center justify-between gap-3 z-30 shadow-md animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/25 backdrop-blur-md text-white font-black text-base animate-pulse border border-white/30 shrink-0">
              {cooldownRemaining}s
            </div>
            <div className="min-w-0">
              <span className="font-black text-xs sm:text-sm block tracking-wide">
                ⏱️ Pengawasan Pelanggaran Dimulai Dalam: {cooldownRemaining} Detik
              </span>
              <span className="text-[11px] text-emerald-100 hidden sm:block">
                Masa adaptasi layar & perizinan Google Chrome (Bebas dari sanksi pelanggaran).
              </span>
            </div>
          </div>
          {!isFullscreen && (
            <button
              onClick={() => {
                requestUniversalFullscreen();
                setIsFullscreen(isCurrentlyFullscreen());
              }}
              className="px-3 py-1.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-[11px] font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Maximize2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Masuk Fullscreen</span>
            </button>
          )}
        </div>
      )}

      {/* Warning Alert Anti-Cheat */}
      {cheatWarning && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-8 py-2.5 text-rose-800 text-xs font-medium flex items-center justify-between gap-3 z-20 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-bounce shrink-0" />
            <span>{cheatWarning}</span>
          </div>
          <button
            onClick={() => setCheatWarning(null)}
            className="text-[11px] bg-rose-600 hover:bg-rose-700 px-2.5 py-1 rounded-lg text-white font-bold transition shrink-0 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Content Area: Diberikan margin-bottom aman (pb-28 di mobile) agar soal & opsi terbawah tidak terpotong atau tertutup bottom navigation bar */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-2.5 sm:p-5 lg:p-6 pb-28 sm:pb-8 flex flex-col justify-between">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs dark:shadow-xl space-y-4 sm:space-y-6">
          {/* Question Audio Player (Jika tipe listening) */}
          {currentSoal.mediaAudio && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <audio ref={audioRef} controls src={currentSoal.mediaAudio} className="w-full h-7" />
            </div>
          )}

          {/* Question Media Gambar (Jika ada) */}
          {currentSoal.mediaGambar && (
            <div className="overflow-hidden bg-transparent p-1 max-w-lg mx-auto">
              <img
                src={currentSoal.mediaGambar}
                alt="Gambar Soal"
                className="w-full h-auto object-contain max-h-64 sm:max-h-80"
              />
            </div>
          )}

          {/* Question Text with KaTeX Math Rendering */}
          <div
            className={`text-slate-900 dark:text-slate-100 break-words leading-relaxed pb-1 select-text ${
              fontSize === 'large'
                ? 'text-base sm:text-lg'
                : fontSize === 'xlarge'
                ? 'text-lg sm:text-xl'
                : 'text-sm sm:text-base'
            }`}
          >
            <MathRenderer content={currentSoal.pertanyaan} />
          </div>

          {/* Opsi Jawaban: Pilihan Ganda & Benar Salah */}
          {(currentSoal.tipeSoal === 'PG' || currentSoal.tipeSoal === 'BENAR_SALAH') && (
            <div className="space-y-2.5 sm:space-y-3 pt-4 border-t border-slate-100 dark:border-white/10">
              {currentSoal.opsiJawaban.map((opsi) => {
                const isSelected = currentJawaban.jawabanDipilih === opsi.id;

                return (
                  <button
                    key={opsi.id}
                    type="button"
                    onClick={() => handleSelectOpsi(currentSoal.id, opsi.id)}
                    className={`w-full text-left p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all flex items-start gap-3 sm:gap-3.5 cursor-pointer touch-manipulation ${
                      isSelected
                        ? 'bg-emerald-50/95 dark:bg-emerald-950/60 border-2 border-emerald-500 dark:border-emerald-400 text-emerald-950 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/30'
                        : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-xl font-extrabold flex items-center justify-center text-xs sm:text-sm transition ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opsi.label}
                    </div>
                    <div className={`flex-1 pt-1 text-xs sm:text-sm break-words select-text border-0 ring-0 outline-none ${isSelected ? 'font-semibold text-emerald-950 dark:text-emerald-100' : 'text-slate-800 dark:text-slate-200'}`}>
                      <MathRenderer content={opsi.konten} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Opsi Jawaban: Pilihan Ganda Kompleks (Multiple Select) */}
          {currentSoal.tipeSoal === 'PG_KOMPLEKS' && (
            <div className="space-y-2.5 sm:space-y-3 pt-4 border-t border-slate-100 dark:border-white/10">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-2">
                <span>💡</span>
                <span>Pilihan Ganda Kompleks: Anda dapat memilih lebih dari satu jawaban yang benar.</span>
              </div>
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
                    className={`w-full text-left p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all flex items-start gap-3 sm:gap-3.5 cursor-pointer touch-manipulation ${
                      isSelected
                        ? 'bg-teal-50/95 dark:bg-teal-950/60 border-2 border-teal-500 dark:border-teal-400 text-teal-950 dark:text-teal-100 shadow-sm ring-2 ring-teal-500/30'
                        : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-xl font-extrabold flex items-center justify-center text-xs sm:text-sm transition ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isSelected ? '✓' : opsi.label}
                    </div>
                    <div className={`flex-1 pt-1 text-xs sm:text-sm break-words select-text border-0 ring-0 outline-none ${isSelected ? 'font-semibold text-teal-950 dark:text-teal-100' : 'text-slate-800 dark:text-slate-200'}`}>
                      <MathRenderer content={opsi.konten} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Opsi Jawaban: Mencocokkan / Menjodohkan (4-7 Kotak Kiri & Kanan) */}
          {currentSoal.tipeSoal === 'MENJODOHKAN' && (
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/10">
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-300 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
                <span>🔄</span>
                <span>
                  Soal Mencocokkan: Pasangkan setiap kotak di kolom kiri dengan pilihan pasangan yang tepat di kolom kanan.
                </span>
              </div>

              {(() => {
                let matchingPairs: { left: string; right: string }[] = [];
                try {
                  if (currentSoal.matchingData) {
                    matchingPairs = JSON.parse(currentSoal.matchingData);
                  }
                } catch (e) {
                  matchingPairs = [];
                }

                if (matchingPairs.length === 0) {
                  return (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Data kotak pencocokan belum diatur oleh pembuat soal.
                    </div>
                  );
                }

                // Kumpulkan semua opsi kanan yang unik untuk dipilih
                const rightOptions = Array.from(new Set(matchingPairs.map((p) => p.right.trim()))).sort();

                let currentMatches: Record<string, string> = {};
                try {
                  if (currentJawaban.jawabanDipilih) {
                    currentMatches = JSON.parse(currentJawaban.jawabanDipilih);
                  }
                } catch (e) {
                  currentMatches = {};
                }

                return (
                  <div className="space-y-2">
                    {matchingPairs.map((pair, pIdx) => {
                      const selectedRight = currentMatches[pair.left] || '';
                      const isMatched = Boolean(selectedRight);

                      return (
                        <div
                          key={pIdx}
                          className={`p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            isMatched
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500/60 shadow-2xs'
                              : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {/* Kotak Kiri */}
                          <div className="flex items-center gap-2.5 flex-1">
                            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-xs">
                              {pIdx + 1}
                            </span>
                            <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                              <MathRenderer content={pair.left} />
                            </div>
                          </div>

                          {/* Arrow Indikator */}
                          <div className="hidden sm:flex text-slate-400 font-bold px-1 text-xs">
                            ➔
                          </div>

                          {/* Kotak Kanan / Dropdown Pilihan */}
                          <div className="flex-1 sm:max-w-xs">
                            <select
                              value={selectedRight}
                              onChange={(e) => handleSelectMatching(currentSoal.id, pair.left, e.target.value)}
                              className={`w-full p-2 rounded-lg text-xs font-semibold border cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isMatched
                                  ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <option value="" className="bg-white dark:bg-slate-900 text-slate-500">
                                -- Pilih Pasangan Kotak --
                              </option>
                              {rightOptions.map((opt, oIdx) => (
                                <option
                                  key={oIdx}
                                  value={opt}
                                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                >
                                  {opt}
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

          {/* Input Jawaban: Isian Singkat */}
          {currentSoal.tipeSoal === 'ISIAN' && (
            <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Ketik Jawaban Singkat Anda:
              </label>
              <input
                type="text"
                value={currentJawaban.jawabanDipilih || ''}
                onChange={(e) => handleInputTeks(currentSoal.id, e.target.value)}
                placeholder="Ketikkan jawaban di sini..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
          )}

          {/* Input Jawaban: Esai / Uraian */}
          {currentSoal.tipeSoal === 'ESAI' && (
            <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Tuliskan Uraian Lengkap Jawaban Anda:
              </label>
              <textarea
                rows={5}
                value={currentJawaban.jawabanDipilih || ''}
                onChange={(e) => handleInputTeks(currentSoal.id, e.target.value)}
                placeholder="Tuliskan langkah pengerjaan atau uraian jawaban secara jelas dan terstruktur..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-xs sm:text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Bottom Navigation Toolbar (Compact & Ergonomis di Android, iOS Safari & Desktop) */}
        <div className="fixed sm:static bottom-0 left-0 right-0 z-30 sm:mt-4 flex items-center justify-between gap-1.5 xs:gap-2 bg-white/95 dark:bg-slate-900/95 sm:bg-white sm:dark:bg-slate-900 border-t sm:border border-slate-200/90 dark:border-white/10 px-2.5 xs:px-3 py-2 sm:p-3 sm:rounded-2xl shadow-lg sm:shadow-xs dark:shadow-xl backdrop-blur-md pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          {/* Tombol Sebelumnya */}
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="min-h-[40px] xs:min-h-[44px] flex items-center justify-center gap-1 xs:gap-1.5 px-2.5 xs:px-3.5 sm:px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer border border-slate-200 dark:border-white/10 active:scale-95 touch-manipulation shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Sebelumnya</span>
            <span className="xs:hidden">Sebelum</span>
          </button>

          {/* Tombol Ragu-Ragu */}
          <button
            type="button"
            onClick={handleToggleRagu}
            className={`min-h-[40px] xs:min-h-[44px] flex items-center justify-center gap-1 xs:gap-1.5 px-2.5 xs:px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer border active:scale-95 touch-manipulation shrink-0 ${
              currentJawaban.raguRagu
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs shadow-amber-500/20'
                : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>{currentJawaban.raguRagu ? 'Ragu: Ya' : 'Ragu'}</span>
          </button>

          {/* Tombol Selanjutnya / Selesai */}
          {currentIndex === soalList.length - 1 ? (
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="min-h-[40px] xs:min-h-[44px] flex items-center justify-center gap-1 xs:gap-1.5 px-3 xs:px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xs font-extrabold text-white shadow-sm shadow-emerald-600/20 transition cursor-pointer active:scale-95 touch-manipulation shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Selesai</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(soalList.length - 1, prev + 1))}
              className="min-h-[40px] xs:min-h-[44px] flex items-center justify-center gap-1 xs:gap-1.5 px-3 xs:px-4 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs shadow-emerald-600/20 transition cursor-pointer active:scale-95 touch-manipulation shrink-0"
            >
              <span className="hidden xs:inline">Selanjutnya</span>
              <span className="xs:hidden">Lanjut</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>

      {/* Grid Nomor Soal Drawer / Modal */}
      {showNavGrid && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 sm:zoom-in duration-200 max-h-[85vh] flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Navigasi Nomor Soal Ujian
              </h3>
              <button
                onClick={() => setShowNavGrid(false)}
                className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold cursor-pointer transition"
              >
                Tutup [X]
              </button>
            </div>

            {/* Grid Soal */}
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-2.5 overflow-y-auto p-1 custom-scrollbar flex-1">
              {soalList.map((s, idx) => {
                const j = jawabanMap[s.id];
                const isAnswered = Boolean(j?.jawabanDipilih);
                const isRagu = Boolean(j?.raguRagu);
                const isCurrent = idx === currentIndex;

                let btnBg = 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800'; // Belum dijawab
                if (isRagu) {
                  btnBg = 'bg-amber-500 text-white font-black border-amber-600 shadow-2xs';
                } else if (isAnswered) {
                  btnBg = 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-2xs';
                }

                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowNavGrid(false);
                    }}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center border text-xs transition cursor-pointer font-bold ${btnBg} ${
                      isCurrent ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isRagu && <span className="text-[9px] font-normal">Ragu</span>}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-emerald-600" />
                <span className="font-medium">Sudah Dijawab</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-amber-500" />
                <span className="font-medium">Ragu-Ragu</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10" />
                <span className="font-medium">Belum Dijawab</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Konfirmasi Pengumpulan Ujian</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin mengakhiri dan mengumpulkan lembar jawaban ujian ini?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs">
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

            {/* Informasi & Peringatan Minimal Jawaban */}
            {ujianInfo?.minJawaban && Number(ujianInfo.minJawaban) > 0 && (
              <div
                className={`p-3 rounded-2xl border text-left text-xs ${
                  totalTerjawab < Number(ujianInfo.minJawaban)
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {totalTerjawab < Number(ujianInfo.minJawaban) ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>Syarat Minimal Jawaban: {ujianInfo.minJawaban} Soal</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">
                  {totalTerjawab < Number(ujianInfo.minJawaban)
                    ? `⚠️ Anda belum dapat mengumpulkan ujian karena baru menjawab ${totalTerjawab} butir soal (Kurang ${Number(ujianInfo.minJawaban) - totalTerjawab} soal lagi).`
                    : `✓ Syarat minimal jawaban telah terpenuhi (${totalTerjawab}/${ujianInfo.minJawaban} soal).`}
                </p>
              </div>
            )}

            {totalRagu > 0 && (
              <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 text-left font-medium">
                ⚠️ Anda masih memiliki <b>{totalRagu}</b> soal berstatus Ragu-ragu.
              </p>
            )}

            {/* Tombol Cadangan Darurat IndexedDB */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleDownloadEmergencyBackup}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Cadangan jawaban yang tersimpan di IndexedDB komputer ini"
              >
                <HardDriveDownload className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Unduh Cadangan Jawaban Offline (.json)</span>
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Kembali Periksa
              </button>
              <button
                type="button"
                disabled={
                  submitting ||
                  (ujianInfo?.minJawaban && Number(ujianInfo.minJawaban) > 0 && totalTerjawab < Number(ujianInfo.minJawaban))
                }
                onClick={() => handleSelesaiUjian(false)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
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
