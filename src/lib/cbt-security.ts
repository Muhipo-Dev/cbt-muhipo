/**
 * CBT Security & Cross-Platform Anti-Cheat Engine
 * Dukungan Lintas Platform & Browser:
 * - Desktop: Chrome, Firefox (Mozilla), Brave, Edge, Safari (macOS)
 * - Mobile & Tablet: Android (Chrome, Brave, Firefox), iOS/iPadOS (Safari, Chrome for iOS)
 */

export interface DeviceSecurityInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isSafari: boolean;
  isFirefox: boolean;
  isBrave: boolean;
  hasDisplayMedia: boolean;
  hasFullscreen: boolean;
  deviceName: string;
}

export function detectDeviceSecurityInfo(): DeviceSecurityInfo {
  if (typeof window === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isTablet: false,
      isSafari: false,
      isFirefox: false,
      isBrave: false,
      hasDisplayMedia: false,
      hasFullscreen: false,
      deviceName: 'Server Environment',
    };
  }

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS 13+
  const isAndroid = /Android/i.test(ua);
  const isMobile = /Mobi|Android/i.test(ua) || (isIOS && !/iPad/.test(ua));
  const isTablet =
    /Tablet|iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isFirefox = /Firefox|FxiOS/i.test(ua);
  const isSafari =
    /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Brave/i.test(ua);
  const isBrave = Boolean((navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function');

  const hasDisplayMedia = Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function');
  
  // Deteksi Fullscreen API:
  // Catatan: Pada desktop PC/laptop dan tablet (iPadOS/Android Tablet) serta Android Chrome modern,
  // Fullscreen API didukung. Kita cek ketersediaan native API.
  const doc: any = typeof document !== 'undefined' ? document : {};
  const hasNativeFullscreen = Boolean(
    doc.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    doc.mozFullScreenEnabled ||
    doc.msFullscreenEnabled
  );
  // Di iPhone (iOS Safari), Apple tidak menyediakan requestFullscreen pada HTML body/document element.
  // Di Android dan Desktop, Fullscreen API berfungsi penuh.
  const hasFullscreen = Boolean(hasNativeFullscreen && !isIOS);

  let deviceName = 'Desktop PC / Laptop';
  if (isIOS) {
    deviceName = isTablet ? 'Apple iPad (iPadOS)' : 'Apple iPhone (iOS)';
  } else if (isAndroid) {
    deviceName = isTablet ? 'Android Tablet' : 'Android Smartphone';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceName = 'Apple Mac / MacBook (macOS)';
  }

  return {
    isIOS,
    isAndroid,
    isMobile,
    isTablet,
    isSafari,
    isFirefox,
    isBrave,
    hasDisplayMedia,
    hasFullscreen,
    deviceName,
  };
}

class CBTSecurityAudio {
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;

  /**
   * Unlock AudioContext untuk iOS Safari & Mobile Auto-play Policy
   */
  public unlockAudio() {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as any).webkitAudioContext;

      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // Mainkan silent oscillator sekejap agar policy iOS/Safari ter-unlock
      if (this.audioCtx && !this.isUnlocked) {
        const buffer = this.audioCtx.createBuffer(1, 1, 22050);
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioCtx.destination);
        source.start(0);
        this.isUnlocked = true;
      }

      // Inisialisasi Web Speech API voices
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
      }
    } catch (e) {
      console.warn('Audio unlock error:', e);
    }
  }

  /**
   * Mainkan Suara Alarm Peringatan Berulang (Buzzer Alert Synth Cross-Platform)
   */
  public playWarningBuzzer() {
    try {
      this.unlockAudio();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Double Beep Frequency Warning Tone (Kompatibel Web Audio di Semua Browser)
      [0, 0.22].forEach((offset) => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now + offset); // A5
        osc.frequency.exponentialRampToValueAtTime(440, now + offset + 0.16);

        gain.gain.setValueAtTime(0.35, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);

        osc.connect(gain);
        gain.connect(this.audioCtx!.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.18);
      });
    } catch (e) {
      console.warn('Audio buzzer warning error:', e);
    }
  }

  /**
   * Suara Peringatan Bahasa Indonesia via Web Speech API
   * Didukung di Safari macOS, iOS, Android Chrome, Firefox, Brave
   */
  public speakWarning(text = 'Peringatan! Anda terdeteksi meninggalkan halaman ujian!') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // batalkan ucapan lama
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('id') ||
          v.name.toLowerCase().includes('indonesia') ||
          v.name.toLowerCase().includes('damayanti')
      );
      if (idVoice) {
        utterance.voice = idVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech warning error:', e);
    }
  }

  /**
   * Suara Notifikasi Sukses / Selesai Ujian Bahasa Indonesia via Web Speech API
   */
  public speakSuccess(text = 'Ujian selesai, terimakasih telah mengerjakan!') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // batalkan ucapan lama
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.pitch = 1.1;

      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('id') ||
          v.name.toLowerCase().includes('indonesia') ||
          v.name.toLowerCase().includes('damayanti')
      );
      if (idVoice) {
        utterance.voice = idVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech success error:', e);
    }
  }

  /**
   * Peringatan Lengkap (Buzzer + Voice)
   */
  public triggerFullWarning(pesanVoice?: string) {
    this.playWarningBuzzer();
    setTimeout(() => {
      this.speakWarning(pesanVoice);
    }, 380);
  }
}

export const cbtSecurityAudio = new CBTSecurityAudio();

/**
 * Helper Universal Request Fullscreen Cross-Browser (Safari webkit, Firefox moz, Chrome/Edge)
 * Menggunakan element atau document.documentElement
 */
export async function requestUniversalFullscreen(element?: HTMLElement): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const target: any = element || document.documentElement;

  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen({ navigationUI: 'hide' } as any).catch(async () => {
        await target.requestFullscreen();
      });
      // Aktifkan juga Chrome Keyboard Lock API jika tersedia
      enableChromeKeyboardLock();
      return true;
    } else if (target.webkitRequestFullscreen) {
      await target.webkitRequestFullscreen();
      return true;
    } else if (target.mozRequestFullScreen) {
      await target.mozRequestFullScreen();
      return true;
    } else if (target.msRequestFullscreen) {
      await target.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Fullscreen request bypassed or denied:', err);
  }
  return false;
}

/**
 * Mengunci tombol-tombol sistem (Escape, Fullscreen exit, dll) menggunakan Chrome Keyboard Lock API
 * Sangat efektif di Google Chrome & Edge untuk mencegah siswa keluar dari fullscreen via tombol Escape.
 */
export async function enableChromeKeyboardLock(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const nav: any = navigator;
    if (nav.keyboard && typeof nav.keyboard.lock === 'function') {
      // Kunci tombol Escape dan kombinasi navigasi
      await nav.keyboard.lock(['Escape', 'F11', 'Tab', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);
      return true;
    }
  } catch (e) {
    console.warn('Keyboard lock API not permitted or unsupported:', e);
  }
  return false;
}

/**
 * Melepaskan Chrome Keyboard Lock
 */
export function unlockChromeKeyboardLock(): void {
  if (typeof window === 'undefined') return;
  try {
    const nav: any = navigator;
    if (nav.keyboard && typeof nav.keyboard.unlock === 'function') {
      nav.keyboard.unlock();
    }
  } catch (e) {
    // silent
  }
}

/**
 * Helper Universal Exit Fullscreen
 */
export async function exitUniversalFullscreen(): Promise<void> {
  unlockChromeKeyboardLock();
  if (typeof document === 'undefined') return;
  const doc: any = document;

  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    }
  } catch (err) {
    // silent
  }
}

/**
 * Periksa apakah saat ini dalam mode fullscreen
 */
export function isCurrentlyFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc: any = document;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.webkitCurrentFullScreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

/**
 * Mencegah tombol kombinasi keyboard berbahaya selama ujian (Windows & macOS Command key)
 */
export function setupExamKeyboardLockdown(onViolation?: (keyCombo: string) => void) {
  if (typeof window === 'undefined') return () => {};

  const handleKeyDown = (e: KeyboardEvent) => {
    const isCmd = e.metaKey; // Command di macOS Safari/Chrome
    const isCtrl = e.ctrlKey;
    const isAlt = e.altKey;

    // 1. F12 (Inspect Element), F11 (Fullscreen override), F5 (Reload), Escape
    if (
      e.key === 'F12' ||
      e.key === 'F11' ||
      e.key === 'F5' ||
      e.key === 'Escape' ||
      e.code === 'Escape' ||
      ((isCtrl || isCmd) && e.key.toLowerCase() === 'r')
    ) {
      e.preventDefault();
      e.stopPropagation();
      onViolation?.(`Tombol ${e.key} dicegah (Layar Penuh Terkunci)`);
      return false;
    }

    // 2. Tab Navigation & Close Tab Shortcuts (Ctrl+W, Ctrl+T, Ctrl+N, Ctrl+Q, Cmd+W, Cmd+Q, Cmd+T, Cmd+N)
    if (
      (isCtrl || isCmd) &&
      ['w', 'W', 't', 'T', 'n', 'N', 'q', 'Q', 'h', 'H'].includes(e.key)
    ) {
      e.preventDefault();
      e.stopPropagation();
      onViolation?.(`Pencegahan keluar tab (${isCmd ? 'Cmd' : 'Ctrl'}+${e.key.toUpperCase()})`);
      return false;
    }

    // 3. Alt+Tab / Alt+F4 / Alt+Left / Alt+Right (Navigasi kembali / tutup window)
    if (isAlt && ['ArrowLeft', 'ArrowRight', 'F4', 'Home'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      onViolation?.(`Kombinasi Alt+${e.key} dicegah`);
      return false;
    }

    // 4. DevTools Shortcuts (Chrome/Firefox/Safari: Cmd+Option+I / Cmd+Option+C / Cmd+Option+J / Ctrl+Shift+I)
    if (
      ((isCtrl || isCmd) && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
      (isCmd && e.altKey && ['i', 'j', 'c', 'I', 'J', 'C'].includes(e.key))
    ) {
      e.preventDefault();
      e.stopPropagation();
      onViolation?.('Kombinasi Inspect Element / DevTools dicegah');
      return false;
    }

    // 5. View Source / Print / Save (Cmd+Option+U, Ctrl+U, Cmd+P, Ctrl+P, Ctrl+S, Cmd+S)
    if (
      ((isCtrl || isCmd) && ['u', 'U', 'p', 'P', 's', 'S'].includes(e.key)) ||
      (isCmd && e.altKey && ['u', 'U'].includes(e.key))
    ) {
      e.preventDefault();
      e.stopPropagation();
      onViolation?.(`Shortcut ${isCmd ? 'Cmd' : 'Ctrl'}+${e.key.toUpperCase()} dicegah`);
      return false;
    }

    // 5b. Anti-Screenshot Shortcuts (PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5)
    if (
      e.key === 'PrintScreen' ||
      e.code === 'PrintScreen' ||
      e.keyCode === 44 ||
      ((isCmd || isCtrl) && e.shiftKey && ['3', '4', '5', 's', 'S'].includes(e.key)) ||
      (isCmd && isCtrl && e.shiftKey && ['3', '4', '5'].includes(e.key))
    ) {
      e.preventDefault();
      e.stopPropagation();
      // Segera bersihkan clipboard agar screenshot buffer OS tidak berisi data soal
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        try {
          navigator.clipboard.writeText('');
        } catch (_) {}
      }
      onViolation?.('Tangkapan Layar (Screenshot) / Rekam Layar dilarang keras selama ujian!');
      return false;
    }

    // 6. Clipboard & Selection Protection (Blokir Cut, Copy, Paste, Select All)
    if ((isCtrl || isCmd) && ['c', 'v', 'a', 'x', 'C', 'V', 'A', 'X'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const actionName =
        e.key.toLowerCase() === 'a'
          ? 'Pilih Semua (Select All)'
          : e.key.toLowerCase() === 'c'
          ? 'Salin (Copy)'
          : e.key.toLowerCase() === 'x'
          ? 'Potong (Cut)'
          : 'Tempel (Paste)';
      onViolation?.(`Fitur ${actionName} dilarang selama ujian!`);
      return false;
    }

    // 7. Cmd+Tab / Windows Key
    if (e.key === 'Meta' || e.key === 'OS') {
      onViolation?.('Tombol Menu Sistem ditekan');
    }
  };

  window.addEventListener('keydown', handleKeyDown, { capture: true });

  return () => {
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
  };
}

/**
 * Mengunci History Browser (History Trap) agar tombol Back / Gesture Swipe Back dicegah total
 */
export function setupBrowserNavigationLock(onBackAttempt?: () => void) {
  if (typeof window === 'undefined') return () => {};

  // Dorong entri history awal
  window.history.pushState({ cbtLocked: true }, '', window.location.href);

  const handlePopState = (e: PopStateEvent) => {
    // Paksa dorong kembali history state agar tetap berada di halaman ujian
    window.history.pushState({ cbtLocked: true }, '', window.location.href);
    onBackAttempt?.();
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}

/**
 * Anti-Screenshot & Screen-Recording Protection Engine
 * 1. Memblokir Web API Screen Capture (navigator.mediaDevices.getDisplayMedia)
 * 2. Membersihkan clipboard saat tombol PrintScreen ditekan / dilepas
 * 3. Menghalangi perekaman layar dari extension pihak ketiga
 */
export function setupAntiScreenshotAndRecording(onViolation?: (detail: string) => void) {
  if (typeof window === 'undefined') return () => {};

  // 1. Monkey patch getDisplayMedia untuk menolak Screen Share / Recording dari Web API
  let originalGetDisplayMedia: any = null;
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
    originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = async () => {
      onViolation?.('Upaya Perekaman Layar / Screen Share terdeteksi dan diblokir!');
      throw new DOMException('Screen recording and screen capture are strictly forbidden during exam.', 'NotAllowedError');
    };
  }

  // 2. Intercept PrintScreen keyup/keydown dan bersihkan clipboard buffer seketika
  const handlePrintScreen = (e: KeyboardEvent) => {
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
      e.preventDefault();
      e.stopPropagation();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          navigator.clipboard.writeText('');
        } catch (_) {}
      }
      onViolation?.('Tangkapan Layar (PrintScreen / Screenshot) diblokir!');
    }
  };

  window.addEventListener('keydown', handlePrintScreen, { capture: true });
  window.addEventListener('keyup', handlePrintScreen, { capture: true });

  return () => {
    if (originalGetDisplayMedia && navigator.mediaDevices) {
      navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
    }
    window.removeEventListener('keydown', handlePrintScreen, { capture: true });
    window.removeEventListener('keyup', handlePrintScreen, { capture: true });
  };
}
