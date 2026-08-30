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
  const hasFullscreen = Boolean(
    document.fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled ||
    (document as any).mozFullScreenEnabled ||
    (document as any).msFullscreenEnabled
  );

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
 */
export async function requestUniversalFullscreen(element?: HTMLElement): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const target: any = element || document.documentElement;

  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen();
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
 * Helper Universal Exit Fullscreen
 */
export async function exitUniversalFullscreen(): Promise<void> {
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

    // 1. F12 (Inspect Element), F11 (Fullscreen override), F5 (Reload)
    if (
      e.key === 'F12' ||
      e.key === 'F11' ||
      e.key === 'F5' ||
      ((isCtrl || isCmd) && e.key.toLowerCase() === 'r')
    ) {
      e.preventDefault();
      e.stopPropagation();
      onViolation?.(`Tombol ${e.key} dicegah`);
      return false;
    }

    // 2. DevTools Shortcuts (Chrome/Firefox/Safari: Cmd+Option+I / Cmd+Option+C / Cmd+Option+J / Ctrl+Shift+I)
    if (
      ((isCtrl || isCmd) && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
      (isCmd && e.altKey && ['i', 'j', 'c', 'I', 'J', 'C'].includes(e.key))
    ) {
      e.preventDefault();
      e.stopPropagation();
      onViolation?.('Kombinasi Inspect Element / DevTools dicegah');
      return false;
    }

    // 3. View Source / Print (Cmd+Option+U di Safari, Ctrl+U, Cmd+P, Ctrl+P)
    if (
      ((isCtrl || isCmd) && ['u', 'U', 'p', 'P'].includes(e.key)) ||
      (isCmd && e.altKey && ['u', 'U'].includes(e.key))
    ) {
      e.preventDefault();
      e.stopPropagation();
      onViolation?.(`Shortcut ${isCmd ? 'Cmd' : 'Ctrl'}+${e.key.toUpperCase()} dicegah`);
      return false;
    }

    // 4. Clipboard Protection (kecuali di input/textarea jawaban esai)
    if ((isCtrl || isCmd) && ['c', 'v', 'a', 'x', 'C', 'V', 'A', 'X'].includes(e.key)) {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return true;
      }
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // 5. Cmd+Tab / Windows Key
    if (e.key === 'Meta' || e.key === 'OS') {
      onViolation?.('Tombol Menu Sistem ditekan');
    }
  };

  window.addEventListener('keydown', handleKeyDown, { capture: true });

  return () => {
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
  };
}
