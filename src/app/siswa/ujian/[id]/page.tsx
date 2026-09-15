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
} from 'lucide-react';
import confetti from 'canvas-confetti';

import {
  cbtSecurityAudio,
  setupExamKeyboardLockdown,
  requestUniversalFullscreen,
  exitUniversalFullscreen,
  isCurrentlyFullscreen,
  detectDeviceSecurityInfo,
} from '@/lib/cbt-security';
import { SecurityLockModal } from '@/components/SecurityLockModal';

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

  // Security Lock & Screen Sharing State
  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // UI state
  const [showNavGrid, setShowNavGrid] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSubmittedRef = useRef<boolean>(false);
  const securityUnlockedAtRef = useRef<number | null>(null);
  const lastViolationTimeRef = useRef<number>(0);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const latestScreenFrameRef = useRef<string | null>(null);

  // Setup persistent off-screen video element untuk Google Chrome Screen Share Stream
  useEffect(() => {
    if (!screenStream) {
      if (hiddenVideoRef.current) {
        if (hiddenVideoRef.current.parentNode) {
          hiddenVideoRef.current.parentNode.removeChild(hiddenVideoRef.current);
        }
        hiddenVideoRef.current = null;
      }
      return;
    }

    try {
      const video = document.createElement('video');
      video.srcObject = screenStream;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.style.position = 'fixed';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      video.style.zIndex = '-9999';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.left = '-9999px';
      video.style.top = '-9999px';
      document.body.appendChild(video);
      hiddenVideoRef.current = video;

      const handleLoadedMetadata = () => {
        video.play().catch(() => {});
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      video.play().catch(() => {});

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
        hiddenVideoRef.current = null;
      };
    } catch (e) {
      console.warn('Gagal setup video stream:', e);
    }
  }, [screenStream]);

  // Helper untuk mengekstrak frame gambar aktual dari sharing layar Chrome
  const getScreenSharingFrame = (): string | null => {
    try {
      const video = hiddenVideoRef.current;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        const canvas = document.createElement('canvas');
        const maxW = 960;
        const maxH = 540;
        let w = video.videoWidth;
        let h = video.videoHeight;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
          latestScreenFrameRef.current = dataUrl;
          return dataUrl;
        }
      }
    } catch (err) {
      console.warn('Gagal grab screen share frame:', err);
    }
    return latestScreenFrameRef.current;
  };

  // 1. Fetch Soal & Status Ujian
  useEffect(() => {
    fetchUjianData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
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
      setPesertaUjianId(data.data.pesertaUjianId);
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

  // Aktivasi Protokol Keamanan & Entire Screen Sharing Universal (Safari/Chrome/Firefox/Brave/iOS/Android)
  // Urutan: 1. Masuk Fullscreen & Unlock Audio -> 2. Screen Share Wajib Google Chrome -> 3. Buka Ujian & Cooldown 30 Detik
  const handleActivateSecurity = async (): Promise<boolean> => {
    try {
      // 0. Unlock Web Audio & Speech synthesis (Krusial untuk iOS Safari / Mobile browser)
      cbtSecurityAudio.unlockAudio();

      // 1. Masuk ke mode fullscreen universal secara langsung atas gesture klik user
      await requestUniversalFullscreen();
      setIsFullscreen(isCurrentlyFullscreen());

      const devInfo = detectDeviceSecurityInfo();

      // 2. Minta Perekaman / Screen Share Seluruh Layar (Wajib diizinkan pada browser yang mendukung getDisplayMedia)
      const nav = typeof navigator !== 'undefined' ? navigator : null;
      const mediaDev = nav?.mediaDevices || (nav as any)?.webkitMediaDevices;

      if (mediaDev && typeof mediaDev.getDisplayMedia === 'function') {
        try {
          const stream = await mediaDev.getDisplayMedia({
            video: {
              displaySurface: 'monitor', // Paksa monitor / entire screen
            } as any,
            audio: false,
          });

          // Listener jika siswa mematikan screen sharing di tengah ujian
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              // Ambil frame terakhir sebelum stream berakhir
              getScreenSharingFrame();
              if (securityUnlockedAtRef.current && Date.now() - securityUnlockedAtRef.current < 5000) {
                // Diabaikan selama masa 5 detik pertama
                return;
              }
              triggerCheatLog(
                'SCREEN_SHARE_STOPPED',
                'Siswa mematikan perekaman / sharing layar'
              );
              cbtSecurityAudio.triggerFullWarning(
                'Peringatan! Berbagi layar telah dihentikan. Segera aktifkan kembali!'
              );
              setCheatWarning(
                'Peringatan: Berbagi layar dihentikan! Pengawas mencatat aktivitas ini.'
              );
            };
          }

          setScreenStream(stream);
        } catch (mediaErr: any) {
          // Pengguna membatalkan atau menolak izin di dialog Google Chrome
          console.warn('Izin screen share ditolak atau dibatalkan:', mediaErr);
          throw new Error('Anda wajib mengizinkan "Berbagi Seluruh Layar (Entire Screen)" pada Google Chrome untuk dapat memulai ujian.');
        }
      }

      // 3. Pastikan fullscreen aktif kembali setelah dialog perizinan browser ditutup
      await requestUniversalFullscreen();
      const fullscreenActive = isCurrentlyFullscreen();
      setIsFullscreen(fullscreenActive);

      // Pada PC/Laptop, jika fullscreen tidak aktif
      if (devInfo.hasFullscreen && !fullscreenActive && !devInfo.isMobile && !devInfo.isTablet) {
        throw new Error('Anda wajib mengizinkan Mode Layar Penuh (Fullscreen) untuk dapat memulai ujian.');
      }

      // 4. Buka lembar ujian dan aktifkan grace period 5 detik bebas pelanggaran
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
      console.error('Gagal aktivasi keamanan:', e);
      throw e;
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

  // 2b. Realtime Live Screen Streaming ke Proktor (Dual Engine: Chrome Desktop Stream & Mobile Active Canvas)
  useEffect(() => {
    if (!isSecurityUnlocked || !pesertaUjianId || isSubmittedRef.current) return;

    let isSending = false;
    const sendLiveFrame = async () => {
      if (isSending || isSubmittedRef.current) return;
      isSending = true;

      try {
        const devInfo = detectDeviceSecurityInfo();
        let frameBase64: string | null = getScreenSharingFrame();
        let isStreamNative = Boolean(frameBase64);

        // 2. Fallback Canvas Active State Realtime untuk Mobile Android & iOS (jika tanpa share screen)
        if (!frameBase64) {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Background Dashboard Gelap Elegan
            const grad = ctx.createLinearGradient(0, 0, 640, 360);
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(1, '#020617');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 640, 360);

            // Header Bar
            ctx.fillStyle = '#059669';
            ctx.fillRect(0, 0, 640, 40);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`CBT LIVE PROKTOR: ${ujianInfo?.judul || 'Ujian Aktif'}`, 15, 25);

            // Indikator Live
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(615, 20, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('LIVE', 575, 24);

            // Kotak Status Pengerjaan Realtime
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(15, 52, 610, 160);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.strokeRect(15, 52, 610, 160);

            // Info Siswa & Status
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px sans-serif';
            ctx.fillText('Nama Siswa:', 28, 80);
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(`${ujianInfo?.namaSiswa || 'Siswa'} (${ujianInfo?.nomorPeserta || '-'})`, 125, 80);

            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Sedang Buka:', 28, 110);
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`Soal No. ${currentIndex + 1} dari ${soalList.length}`, 125, 110);

            const currJawaban = jawabanMap[soalList[currentIndex]?.id];
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px sans-serif';
            ctx.fillText('Status Jawaban:', 28, 140);
            ctx.fillStyle = currJawaban?.jawabanDipilih ? '#34d399' : '#f87171';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(
              currJawaban?.jawabanDipilih
                ? `Sudah Dijawab ${currJawaban.raguRagu ? '(Ragu-Ragu)' : ''}`
                : 'Belum Dijawab (Sedang Membaca)',
              125,
              140
            );

            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Sisa Waktu:', 28, 170);
            ctx.fillStyle = sisaDetik < 300 ? '#f87171' : '#f8fafc';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(formatTime(sisaDetik), 125, 170);

            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Perangkat:', 28, 195);
            ctx.fillStyle = '#a7f3d0';
            ctx.font = '11px monospace';
            ctx.fillText(devInfo.deviceName, 125, 195);

            // Mini Progress Tracker Bar
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(15, 225, 610, 30);
            const answeredCount = Object.values(jawabanMap).filter((j) => Boolean(j.jawabanDipilih)).length;
            const progressRatio = soalList.length > 0 ? answeredCount / soalList.length : 0;
            ctx.fillStyle = '#10b981';
            ctx.fillRect(15, 225, Math.floor(610 * progressRatio), 30);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`Progres: ${answeredCount} / ${soalList.length} Soal Dijawab (${Math.round(progressRatio * 100)}%)`, 25, 245);

            // Watermark Security Status
            ctx.fillStyle = '#64748b';
            ctx.font = '10px monospace';
            ctx.fillText(`Sync Aktif: ${new Date().toLocaleTimeString('id-ID')} | Security Guard Anti-Cheat Muhipo`, 15, 345);

            frameBase64 = canvas.toDataURL('image/jpeg', 0.5);
            isStreamNative = false;
          }
        }

        if (frameBase64) {
          const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
          await fetch('/api/proktor/screen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pesertaUjianId,
              screenImage: frameBase64,
              browser: navigator.userAgent.includes('Chrome') ? 'Google Chrome' : 'Safari / WebKit',
              device: devInfo.deviceName,
              soalAktifNomor: currentIndex + 1,
              totalSoal: soalList.length,
              sisaDetik,
              isStreamNative,
              orientation: isLandscape ? 'landscape' : 'portrait',
            }),
          });
        }
      } catch (err) {
        // Silent
      } finally {
        isSending = false;
      }
    };

    // Broadcast frame pertama setelah 1.5 detik, lalu ulangi tiap 2.5 detik
    const initialTimer = setTimeout(sendLiveFrame, 1500);
    const streamInterval = setInterval(sendLiveFrame, 2500);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(streamInterval);
    };
  }, [isSecurityUnlocked, pesertaUjianId, screenStream, currentIndex, jawabanMap, sisaDetik, soalList.length, ujianInfo]);

  // 3. Anti-Cheat Engine Lintas Platform (Tab switch, Window blur, Keyboard Lockdown, Audio alarms)
  useEffect(() => {
    if (!isSecurityUnlocked) return;

    // Keyboard lockdown (Command di macOS & Ctrl di Windows/Linux)
    const cleanupKeyboard = setupExamKeyboardLockdown((reason) => {
      if (securityUnlockedAtRef.current && Date.now() - securityUnlockedAtRef.current < 5000) {
        return;
      }
      triggerCheatLog('KEYBOARD_SHORTCUT_VIOLATION', reason);
      cbtSecurityAudio.playWarningBuzzer();
      setCheatWarning(`Peringatan: ${reason}!`);
    });

    const handleVisibilityChange = () => {
      if (isSubmittedRef.current) return;
      // Jangan hitung pelanggaran selama masa penyesuaian 5 detik pertama
      if (securityUnlockedAtRef.current && Date.now() - securityUnlockedAtRef.current < 5000) {
        return;
      }
      if (document.hidden) {
        triggerCheatLog('TAB_SWITCH_ALERT', 'Siswa berpindah tab / aplikasi browser');
        cbtSecurityAudio.triggerFullWarning(
          'Peringatan! Anda terdeteksi meninggalkan halaman ujian!'
        );
        setCheatWarning(
          'Peringatan: Anda terdeteksi meninggalkan halaman ujian! Aktivitas ini dicatat oleh pengawas.'
        );
      }
    };

    const handleWindowBlur = () => {
      if (isSubmittedRef.current) return;
      if (securityUnlockedAtRef.current && Date.now() - securityUnlockedAtRef.current < 5000) {
        return;
      }
      // Jika dokumen tersembunyi (ganti tab), visibilitychange akan menangani TAB_SWITCH_ALERT
      // Jika dokumen masih terlihat tapi kehilangan fokus, ini adalah perpindahan aplikasi (Alt+Tab, membuka program lain)
      const activityType = document.hidden ? 'TAB_SWITCH_ALERT' : 'APP_SWITCH_ALERT';
      const detailMsg = document.hidden
        ? 'Siswa berpindah tab browser'
        : 'Siswa berpindah aplikasi / membuka program lain (Jendela Tidak Fokus / Alt+Tab)';

      triggerCheatLog(activityType, detailMsg);
      cbtSecurityAudio.triggerFullWarning(
        'Peringatan! Dilarang membuka aplikasi lain atau berpindah jendela selama ujian!'
      );
      setCheatWarning(
        'Peringatan: Anda terdeteksi membuka aplikasi lain! Aktivitas ini dicatat oleh pengawas.'
      );
    };

    const handlePageHide = () => {
      if (isSubmittedRef.current) return;
      if (securityUnlockedAtRef.current && Date.now() - securityUnlockedAtRef.current < 5000) {
        return;
      }
      triggerCheatLog('TAB_SWITCH_ALERT', 'Siswa menutup atau menyembunyikan halaman ujian');
    };

    const handleFullscreenChange = () => {
      const inFullscreen = isCurrentlyFullscreen();
      setIsFullscreen(inFullscreen);
      if (isSubmittedRef.current) return;
      if (securityUnlockedAtRef.current && Date.now() - securityUnlockedAtRef.current < 5000) {
        return;
      }
      const devInfo = detectDeviceSecurityInfo();
      // Pada iPhone Safari fullscreen API tidak didukung native sehingga tidak memicu false-positive
      if (!inFullscreen && devInfo.hasFullscreen) {
        triggerCheatLog('FULLSCREEN_EXIT', 'Siswa keluar dari mode layar penuh (Lock Browser)');
        cbtSecurityAudio.triggerFullWarning(
          'Peringatan! Anda keluar dari mode layar penuh. Klik Fullscreen untuk melanjutkan!'
        );
        setCheatWarning('Peringatan: Harap tetap berada di mode layar penuh selama ujian!');
      }
    };

    // Mencegah Klik Kanan / Long-press Context Menu di Mobile & Desktop
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      cbtSecurityAudio.playWarningBuzzer();
    };

    // Mencegah Copy Soal
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);

    return () => {
      cleanupKeyboard();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
    };
  }, [isSecurityUnlocked, pesertaUjianId, screenStream, ujianInfo]);

  // Helper untuk mengambil screenshot frame saat terjadi pelanggaran (Dual-Mode: Stream & Canvas Fallback)
  const captureScreenSnapshot = async (aktivitasText?: string, detailText?: string): Promise<string | null> => {
    try {
      // 1. Ambil frame aktual dari Google Chrome screen share (live atau frame snapshot terakhir)
      let frame = getScreenSharingFrame();
      if (!frame && latestScreenFrameRef.current) {
        frame = latestScreenFrameRef.current;
      }
      if (frame) {
        return frame;
      }

      // 2. Fallback Universal untuk Android & iOS: Render Bukti Visual Snapshot Pelanggaran
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Background Gelap Exam Card
        const grad = ctx.createLinearGradient(0, 0, 640, 360);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 360);

        // Header Merah Peringatan
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(0, 0, 640, 45);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('BUKTI TANGKAPAN SISTEM CBT: DETEKSI PELANGGARAN', 20, 28);

        // Border Frame
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, 632, 352);

        // Informasi Peserta
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText('Nama Peserta:', 25, 80);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`${ujianInfo?.namaSiswa || 'Peserta Ujian'} (${ujianInfo?.nomorPeserta || '-'})`, 150, 80);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText('Mata Pelajaran:', 25, 110);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`${ujianInfo?.judul || 'Ujian CBT'} - ${ujianInfo?.mataPelajaran || ''}`, 150, 110);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText('Jenis Aktivitas:', 25, 140);
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`${aktivitasText || 'PELANGGARAN_KEAMANAN'}`, 150, 140);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText('Keterangan Log:', 25, 170);
        ctx.fillStyle = '#fca5a5';
        ctx.font = '13px sans-serif';
        ctx.fillText(`${detailText || 'Siswa meninggalkan layar ujian atau berpindah aplikasi'}`, 150, 170);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText('Waktu Kejadian:', 25, 200);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`${new Date().toLocaleString('id-ID')} WIB`, 150, 200);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText('Perangkat Klien:', 25, 230);
        ctx.fillStyle = '#a7f3d0';
        ctx.font = '13px monospace';
        ctx.fillText(`${navigator.userAgent.substring(0, 50)}...`, 150, 230);

        // Watermark Box
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(25, 260, 590, 70);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.strokeRect(25, 260, 590, 70);

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('STATUS: TERDETEKSI KELUAR DARI HALAMAN UJIAN (SCREEN / TAB SWITCH / BLUR)', 40, 290);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px sans-serif';
        ctx.fillText('Terekam otomatis oleh Anti-Cheat Engine CBT SMA Muhammadiyah 1 Ponorogo.', 40, 312);

        return canvas.toDataURL('image/jpeg', 0.6);
      }
    } catch (err) {
      console.warn('Gagal capture screen frame:', err);
    }
    return null;
  };

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
      const fotoBukti = await captureScreenSnapshot(aktivitas, detail);
      const res = await fetch('/api/siswa/ujian/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pesertaUjianId, aktivitas, detail, fotoBukti }),
      });
      const resJson = await res.json();
      const currentViolation = resJson.data?.totalPelanggaran ?? 0;
      setViolationCount(currentViolation);

      if (resJson.data?.isLocked) {
        alert(
          `AKUN UJIAN ANDA TERKUNCI!\n\nAnda telah mencapai batas maksimal 5 kali pelanggaran keamanan (keluar halaman ujian / berpindah aplikasi / berpindah tab). Silakan hubungi Pengawas / Proktor Ruang untuk membuka kunci ujian Anda.`
        );
        router.push('/siswa');
      } else if (currentViolation > 0) {
        setCheatWarning(
          `Peringatan Pelanggaran (${currentViolation}/5): Dilarang keluar dari halaman ujian atau berpindah aplikasi! Akun akan terkunci otomatis pada pelanggaran ke-5.`
        );
      }
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

  // Pilih Pasangan Pencocokan / Menjodohkan
  const handleSelectMatching = (soalId: string, leftText: string, rightText: string) => {
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

    saveJawaban(soalId, JSON.stringify(mapping), curr.raguRagu);
  };

  // Submit / Selesai Ujian
  const handleSelesaiUjian = async (isAuto = false) => {
    setSubmitting(true);
    isSubmittedRef.current = true; // Tandai ujian sudah diselesaikan agar tidak trigger false-positive anti cheat
    try {
      const res = await fetch(`/api/siswa/ujian/${ujianId}/selesai`, {
        method: 'POST',
      });
      const data = await res.json();

      // Hentikan screen stream jika aktif
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }

      // Keluar dari layar penuh secara otomatis
      await exitUniversalFullscreen();
      setIsFullscreen(false);

      // Mainkan suara ucapan selesai ujian yang ramah
      cbtSecurityAudio.speakSuccess('Ujian selesai, terimakasih telah mengerjakan');

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      alert(isAuto ? 'Waktu habis! Jawaban Anda telah otomatis dikumpulkan.' : 'Ujian berhasil diselesaikan!');
      router.push('/siswa');
    } catch (e) {
      isSubmittedRef.current = false;
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-800 dark:text-slate-100">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4 shadow-sm" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Menyiapkan Lembar Ujian CBT Muhipo...</p>
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
    <div className="min-h-screen bg-slate-100/80 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white select-none font-sans touch-manipulation overscroll-none pb-20 sm:pb-4">
      {/* Modal Aktivasi Keamanan & Screen Recording */}
      {ujianInfo?.lockBrowser && (
        <SecurityLockModal
          isOpen={!isSecurityUnlocked}
          onActivateSecurity={handleActivateSecurity}
          requireScreenShare={true}
        />
      )}

      {/* Sticky Header CBT (Light & Dark Modern Style) */}
      <header className="sticky top-0 z-30 px-3 sm:px-8 py-2.5 sm:py-3 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/90 dark:border-white/10 backdrop-blur-md flex items-center justify-between shadow-xs">
        {/* Left: Info Ujian & Nomor Soal */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 font-extrabold text-white text-sm sm:text-base shadow-sm shadow-emerald-600/30 shrink-0">
            {currentIndex + 1}
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
              {ujianInfo?.judul || 'Lembar Ujian CBT'}
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 sm:px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800 font-mono shrink-0">
                Soal {currentIndex + 1} / {soalList.length}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate hidden xs:inline">
                • {currentSoal?.tipeSoal ? currentSoal.tipeSoal.replace('_', ' ') : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Realtime Countdown Timer */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl shadow-2xs shrink-0">
          <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${sisaDetik < 300 ? 'text-rose-600 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'}`} />
          <span
            className={`font-mono text-xs sm:text-base font-extrabold tracking-wider ${
              sisaDetik < 300 ? 'text-rose-600 font-black' : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {formatTime(sisaDetik)}
          </span>
        </div>

        {/* Right: Quick Tools (ThemeToggle, Font size, Grid Modal, Fullscreen) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold transition shadow-2xs cursor-pointer"
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-sm dark:shadow-xl space-y-6">
          {/* Question Audio Player (Jika tipe listening) */}
          {currentSoal.mediaAudio && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Volume2 className="w-5 h-5" />
              </div>
              <audio ref={audioRef} controls src={currentSoal.mediaAudio} className="w-full h-8" />
            </div>
          )}

          {/* Question Media Gambar (Jika ada) */}
          {currentSoal.mediaGambar && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-2 max-w-lg mx-auto">
              <img
                src={currentSoal.mediaGambar}
                alt="Gambar Soal"
                className="w-full h-auto object-contain rounded-xl"
              />
            </div>
          )}

          {/* Question Text with KaTeX Math Rendering */}
          <div
            className={`text-slate-900 dark:text-slate-100 ${
              fontSize === 'large'
                ? 'text-lg leading-loose'
                : fontSize === 'xlarge'
                ? 'text-xl leading-loose'
                : 'text-base sm:text-[17px] leading-relaxed'
            }`}
          >
            <MathRenderer content={currentSoal.pertanyaan} />
          </div>

          {/* Opsi Jawaban: Pilihan Ganda & Benar Salah */}
          {(currentSoal.tipeSoal === 'PG' || currentSoal.tipeSoal === 'BENAR_SALAH') && (
            <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-white/10">
              {currentSoal.opsiJawaban.map((opsi) => {
                const isSelected = currentJawaban.jawabanDipilih === opsi.id;

                return (
                  <button
                    key={opsi.id}
                    type="button"
                    onClick={() => handleSelectOpsi(currentSoal.id, opsi.id)}
                    className={`w-full text-left p-4 sm:p-4.5 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-400 text-emerald-950 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-400/50'
                        : 'bg-white dark:bg-slate-950/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-xl font-extrabold flex items-center justify-center text-xs transition ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opsi.label}
                    </div>
                    <div className={`flex-1 pt-0.5 ${isSelected ? 'font-medium text-emerald-950 dark:text-emerald-100' : 'text-slate-800 dark:text-slate-200'}`}>
                      <MathRenderer content={opsi.konten} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Opsi Jawaban: Pilihan Ganda Kompleks (Multiple Select) */}
          {currentSoal.tipeSoal === 'PG_KOMPLEKS' && (
            <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-white/10">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
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
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/90 dark:bg-teal-950/50 border-teal-500 dark:border-teal-400 text-teal-950 dark:text-teal-200 shadow-sm ring-1 ring-teal-400/50'
                        : 'bg-white dark:bg-slate-950/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg font-bold flex items-center justify-center text-xs transition ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isSelected ? '✓' : opsi.label}
                    </div>
                    <div className={`flex-1 pt-0.5 ${isSelected ? 'font-medium text-teal-950 dark:text-teal-100' : 'text-slate-800 dark:text-slate-200'}`}>
                      <MathRenderer content={opsi.konten} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Opsi Jawaban: Mencocokkan / Menjodohkan (4-7 Kotak Kiri & Kanan) */}
          {currentSoal.tipeSoal === 'MENJODOHKAN' && (
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-white/10">
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-300 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <span>🔄</span>
                <span>
                  Soal Mencocokkan: Pasangkan setiap kotak di kolom kiri dengan pilihan pasangan yang paling tepat di kolom kanan.
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
                  <div className="space-y-3">
                    {matchingPairs.map((pair, pIdx) => {
                      const selectedRight = currentMatches[pair.left] || '';
                      const isMatched = Boolean(selectedRight);

                      return (
                        <div
                          key={pIdx}
                          className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isMatched
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500/60 shadow-2xs'
                              : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {/* Kotak Kiri */}
                          <div className="flex items-center gap-3 flex-1">
                            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-xs">
                              {pIdx + 1}
                            </span>
                            <div className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                              <MathRenderer content={pair.left} />
                            </div>
                          </div>

                          {/* Arrow Indikator */}
                          <div className="hidden sm:flex text-slate-400 font-bold px-2">
                            ➔
                          </div>

                          {/* Kotak Kanan / Dropdown Pilihan */}
                          <div className="flex-1 sm:max-w-xs">
                            <select
                              value={selectedRight}
                              onChange={(e) => handleSelectMatching(currentSoal.id, pair.left, e.target.value)}
                              className={`w-full p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm font-semibold border cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
            <div className="pt-6 border-t border-slate-100 dark:border-white/10 space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Ketik Jawaban Singkat Anda:
              </label>
              <input
                type="text"
                value={currentJawaban.jawabanDipilih || ''}
                onChange={(e) => handleInputTeks(currentSoal.id, e.target.value)}
                placeholder="Ketikkan jawaban di sini..."
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-base focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
          )}

          {/* Input Jawaban: Esai / Uraian */}
          {currentSoal.tipeSoal === 'ESAI' && (
            <div className="pt-6 border-t border-slate-100 dark:border-white/10 space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Tuliskan Uraian Lengkap Jawaban Anda:
              </label>
              <textarea
                rows={6}
                value={currentJawaban.jawabanDipilih || ''}
                onChange={(e) => handleInputTeks(currentSoal.id, e.target.value)}
                placeholder="Tuliskan langkah pengerjaan atau uraian jawaban secara jelas dan terstruktur..."
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Bottom Navigation Toolbar (Sticky di Mobile agar sangat responsif & nyaman) */}
        <div className="fixed sm:static bottom-0 left-0 right-0 z-20 sm:mt-6 flex items-center justify-between gap-2 sm:gap-3 bg-white/95 dark:bg-slate-900/95 sm:bg-white sm:dark:bg-slate-900 border-t sm:border border-slate-200/90 dark:border-white/10 p-3 sm:p-4 sm:rounded-3xl shadow-lg sm:shadow-xs dark:shadow-xl backdrop-blur-md">
          {/* Tombol Sebelumnya */}
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer border border-slate-200 dark:border-white/10 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Sebelumnya</span>
          </button>

          {/* Tombol Ragu-Ragu */}
          <button
            type="button"
            onClick={handleToggleRagu}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer border active:scale-95 ${
              currentJawaban.raguRagu
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20'
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
              className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Selesai</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(soalList.length - 1, prev + 1))}
              className="flex items-center gap-1 sm:gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition cursor-pointer active:scale-95"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>

      {/* Grid Nomor Soal Drawer / Modal */}
      {showNavGrid && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
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
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto p-1 custom-scrollbar">
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

            {totalRagu > 0 && (
              <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 text-left font-medium">
                ⚠️ Anda masih memiliki <b>{totalRagu}</b> soal berstatus Ragu-ragu.
              </p>
            )}

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
                disabled={submitting}
                onClick={() => handleSelesaiUjian(false)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
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
