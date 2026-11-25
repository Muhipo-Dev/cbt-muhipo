/**
 * CBT Security & Cross-Platform Anti-Cheat Engine
 * Dukungan Lintas Platform & Browser:
 * - Desktop: Chrome, Firefox (Mozilla), Brave, Edge, Safari (macOS)
 * - Mobile & Tablet: Android (Chrome, Brave, Firefox, Exambro WebView), iOS/iPadOS (Safari, Chrome for iOS, SEB)
 */

export interface DeviceSecurityInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isSafari: boolean;
  isFirefox: boolean;
  isBrave: boolean;
  isExambroOrSEB: boolean;
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
      isExambroOrSEB: false,
      hasDisplayMedia: false,
      hasFullscreen: false,
      deviceName: 'Server Environment',
    };
  }

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPadOS;
  const isAndroid = /Android/i.test(ua);
  const isTablet = /Tablet|iPad/i.test(ua) || isIPadOS || (isAndroid && !/Mobile/i.test(ua));
  const isMobile = (/Mobi|Android/i.test(ua) || isIOS) && !isTablet;

  const isFirefox = /Firefox|FxiOS/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Brave/i.test(ua);
  const isBrave = Boolean((navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function');

  const w: any = window;
  const isExambroOrSEB = Boolean(
    /SEB|SafeExamBrowser|Exambro|ExamBrowser|CBTExambro|Examora|FlyExam|CandyExambro|MuhipoExambro/i.test(ua) ||
      w.Exambro ||
      w.Android ||
      w.cbtBridge ||
      w.SafeExamBrowser
  );

  const hasDisplayMedia = Boolean(
    navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function'
  );

  // Deteksi Fullscreen API:
  // Di iPhone (iOS Safari / Chrome iOS), Apple tidak menyediakan requestFullscreen pada elemen HTML biasa.
  // Di iPadOS Safari modern, Android Chrome, dan Desktop, kita cek dukungan nyata pada documentElement.
  const doc: any = typeof document !== 'undefined' ? document : {};
  const docEl: any = doc.documentElement || {};
  const canElementRequestFs = Boolean(
    docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.msRequestFullscreen
  );
  const hasNativeFullscreen = Boolean(
    canElementRequestFs &&
      (doc.fullscreenEnabled ||
        doc.webkitFullscreenEnabled ||
        doc.mozFullScreenEnabled ||
        doc.msFullscreenEnabled)
  );

  // Pada iPhone (isIOS && !isTablet) serta aplikasi Exambro/SEB yang sudah berjalan dalam native Kiosk Mode penuh,
  // jangan memaksa HTML Fullscreen overlay yang dapat terputus ketika keyboard virtual on-screen muncul.
  const isIPhone = isIOS && !isTablet;
  const hasFullscreen = Boolean(hasNativeFullscreen && !isIPhone && !isExambroOrSEB);

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
    isExambroOrSEB,
    hasDisplayMedia,
    hasFullscreen,
    deviceName,
  };
}

/**
 * Screen Wake Lock Manager (Mencegah layar smartphone mati otomatis / terkunci saat membaca soal panjang)
 * Didukung di Chrome Android, Safari iOS 16.4+, Chrome/Edge Desktop.
 */
class CBTWakeLockManager {
  private sentinel: any = null;

  public async requestWakeLock(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return false;
    try {
      if (this.sentinel && !this.sentinel.released) return true;
      this.sentinel = await (navigator as any).wakeLock.request('screen');
      return true;
    } catch {
      return false;
    }
  }

  public async releaseWakeLock(): Promise<void> {
    try {
      if (this.sentinel) {
        await this.sentinel.release();
        this.sentinel = null;
      }
    } catch {
      this.sentinel = null;
    }
  }
}

export const cbtWakeLock = new CBTWakeLockManager();

class CBTSecurityAudio {
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;

  /**
   * Unlock AudioContext untuk iOS Safari & Mobile Auto-play Policy
   */
  public unlockAudio() {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

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
   * Mainkan Suara Alarm Peringatan Berulang (Buzzer Alert Synth Cross-Platform + Getar Haptic HP)
   */
  public playWarningBuzzer() {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([120, 60, 120]);
      }
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
   */
  public speakWarning(text = 'Peringatan! Anda terdeteksi meninggalkan halaman ujian!') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
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
      window.speechSynthesis.cancel();
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
 * PENTING: Gunakan document.documentElement secara default agar portal modal (seperti ImageZoomModal di body)
 * tetap terlihat saat mode layar penuh aktif!
 */
export async function requestUniversalFullscreen(element?: HTMLElement): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const target: any = element || document.documentElement;

  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen({ navigationUI: 'hide' } as any).catch(async () => {
        await target.requestFullscreen();
      });
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
 */
export async function enableChromeKeyboardLock(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const nav: any = navigator;
    if (nav.keyboard && typeof nav.keyboard.lock === 'function') {
      await nav.keyboard.lock(['Escape', 'F11', 'Tab', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);
      return true;
    }
  } catch {
    // silent on mobile browsers where Keyboard Lock API is unsupported
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
  } catch {
    // silent
  }
}

/**
 * Helper Universal Exit Fullscreen
 */
export async function exitUniversalFullscreen(): Promise<void> {
  unlockChromeKeyboardLock();
  cbtWakeLock.releaseWakeLock();
  if (typeof document === 'undefined') return;
  const doc: any = document;

  try {
    if (isCurrentlyFullscreen()) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    }
  } catch {
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
 * Periksa apakah elemen fokus aktif saat ini adalah kolom input jawaban (ISIAN / ESAI / SELECT)
 * Digunakan agar kemunculan keyboard virtual di HP Android/iOS tidak memicu false-positive keluar Fullscreen,
 * serta mengizinkan peserta mengedit teks jawabannya sendiri tanpa memicu sanksi pelanggaran.
 */
export function isEditableExamInput(el: EventTarget | Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/**
 * Mencegah tombol kombinasi keyboard berbahaya selama ujian (Windows & macOS Command key & Bluetooth Keyboard)
 */
export function setupExamKeyboardLockdown(onViolation?: (keyCombo: string) => void) {
  if (typeof window === 'undefined') return () => {};

  const handleKeyDown = (e: KeyboardEvent) => {
    const isCmd = e.metaKey;
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
      // Jika sedang membuka modal zoom gambar, Escape menutup modal zoom tanpa sanksi
      if ((e.key === 'Escape' || e.code === 'Escape') && document.getElementById('cbt-image-zoom-lightbox')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      onViolation?.(`Tombol ${e.key} dicegah (Layar Penuh Terkunci)`);
      return false;
    }

    // 2. Tab Navigation & Close Tab Shortcuts
    if (
      (isCtrl || isCmd) &&
      ['w', 'W', 't', 'T', 'n', 'N', 'q', 'Q', 'h', 'H', 'l', 'L'].includes(e.key)
    ) {
      e.preventDefault();
      e.stopPropagation();
      onViolation?.(`Pencegahan keluar tab (${isCmd ? 'Cmd' : 'Ctrl'}+${e.key.toUpperCase()})`);
      return false;
    }

    // 3. Alt+Tab / Alt+F4 / Alt+Left / Alt+Right
    if (isAlt && ['ArrowLeft', 'ArrowRight', 'F4', 'Home'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      onViolation?.(`Kombinasi Alt+${e.key} dicegah`);
      return false;
    }

    // 4. DevTools Shortcuts
    if (
      ((isCtrl || isCmd) && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
      (isCmd && e.altKey && ['i', 'j', 'c', 'I', 'J', 'C'].includes(e.key))
    ) {
      e.preventDefault();
      e.stopPropagation();
      onViolation?.('Kombinasi Inspect Element / DevTools dicegah');
      return false;
    }

    // 5. View Source / Print / Save / Find
    if (
      ((isCtrl || isCmd) && ['u', 'U', 'p', 'P', 's', 'S', 'f', 'F', 'g', 'G'].includes(e.key)) ||
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
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        try {
          navigator.clipboard.writeText('');
        } catch {}
      }
      onViolation?.('Tangkapan Layar (Screenshot) / Rekam Layar dilarang keras selama ujian!');
      return false;
    }

    // 6. Clipboard & Selection Protection (Blokir TOTAL Cut, Copy, Paste, Select All di seluruh halaman ujian!)
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
      onViolation?.(`Fitur ${actionName} diblokir total selama ujian!`);
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
 * Mengunci History Browser (History Trap) agar tombol Back / Gesture Swipe Back HP Android & iOS Safari dicegah total
 */
export function setupBrowserNavigationLock(onBackAttempt?: () => void) {
  if (typeof window === 'undefined') return () => {};

  // Dorong 2 lapis buffer history agar swipe-back cepat di Chrome Android / Safari iOS tidak langsung keluar halaman
  try {
    window.history.pushState({ cbtLocked: 1 }, '', window.location.href);
    window.history.pushState({ cbtLocked: 2 }, '', window.location.href);
  } catch {}

  const handlePopState = () => {
    try {
      window.history.pushState({ cbtLocked: 2 }, '', window.location.href);
    } catch {}
    onBackAttempt?.();
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}

/**
 * Deteksi Split-Screen / Multi-Window / Floating Pop-Up Window pada Smartphone & Tablet (Android Chrome & iPadOS Safari)
 * Membedakan perubahan ukuran layar akibat keyboard virtual on-screen vs pembagian layar curang (Split-Screen).
 */
export function isMobileSplitScreenDetected(): boolean {
  if (typeof window === 'undefined' || !window.screen) return false;
  const dev = detectDeviceSecurityInfo();
  if (!dev.isMobile && !dev.isTablet) return false;

  // Jangan anggap split-screen jika pengguna sedang mengetik di input/textarea (keyboard on-screen mengecilkan innerHeight)
  if (typeof document !== 'undefined' && isEditableExamInput(document.activeElement)) {
    return false;
  }

  const screenW = window.screen.availWidth || window.screen.width || 0;
  const screenH = window.screen.availHeight || window.screen.height || 0;
  if (!screenW || !screenH) return false;

  const winW = window.outerWidth || window.innerWidth;
  const winH = window.innerHeight;

  // Di ponsel portrait: jika lebar jendela menyusut drastis (< 72% lebar fisik layar) -> Floating Window / Pop-up View
  // Di ponsel portrait tanpa keyboard aktif: jika tinggi viewport menyusut drastis (< 52% tinggi layar) -> Split Screen atas-bawah
  const widthRatio = winW / screenW;
  const heightRatio = winH / screenH;

  if (widthRatio < 0.72) return true;
  if (dev.isMobile && heightRatio < 0.50) return true;

  return false;
}

/**
 * Anti-Screenshot & Screen-Recording Protection Engine
 */
export function setupAntiScreenshotAndRecording(onViolation?: (detail: string) => void) {
  if (typeof window === 'undefined') return () => {};

  let originalGetDisplayMedia: any = null;
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
    originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = async () => {
      onViolation?.('Upaya Perekaman Layar / Screen Share terdeteksi dan diblokir!');
      throw new DOMException('Screen recording and screen capture are strictly forbidden during exam.', 'NotAllowedError');
    };
  }

  const handlePrintScreen = (e: KeyboardEvent) => {
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
      e.preventDefault();
      e.stopPropagation();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          navigator.clipboard.writeText('');
        } catch {}
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
