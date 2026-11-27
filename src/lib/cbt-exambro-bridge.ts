/**
 * CBT MUHIPO - Android CBT Exambro Native Bridge & Cache Sync
 * Menghubungkan sistem web CBT dengan aplikasi Android CBT Exambro (Kiosk / Safe Exam Browser).
 * Mendukung penyimpanan ganda (IndexedDB + Native Android Storage / SQLite / SharedPreferences)
 * serta menyediakan API JavaScript Bridge untuk inspeksi dan pemulihan data ujian dari sisi aplikasi Android.
 */

import {
  saveAnswerToIndexedDB,
  getAllCachedAnswersFromIndexedDB,
  getExamSessionFromIndexedDB,
  syncPendingAnswersToServer,
  exportExamAnswersBackupJSON,
} from './cbt-indexeddb';

export interface ExambroDetectionInfo {
  isExambro: boolean;
  isSEB: boolean;
  isAndroidWebView: boolean;
  isStandalonePWA: boolean;
  bridgeName: string | null;
  userAgent: string;
}

/**
 * Deteksi apakah halaman dibuka di dalam aplikasi Android CBT Exambro, Safe Exam Browser (SEB), atau Android WebView
 */
export function detectExambroApp(): ExambroDetectionInfo {
  if (typeof window === 'undefined') {
    return { isExambro: false, isSEB: false, isAndroidWebView: false, isStandalonePWA: false, bridgeName: null, userAgent: '' };
  }

  const ua = navigator.userAgent || '';
  // Deteksi Safe Exam Browser (SEB) resmi di iOS, Android, macOS & Windows
  const isSEBUA = /SEB|SafeExamBrowser|SafeExamBrowserMobile/i.test(ua);
  const isExambroUA = isSEBUA || /Exambro|ExamBrowser|CBTExambro|Examora|FlyExam|CandyExambro|MuhipoExambro|SafeExam/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isAndroidWebView = isAndroid && (/wv|\.0\.0\.0|Version\/[0-9.]+/i.test(ua) || !/Chrome\/[.0-9]+ Mobile/i.test(ua));
  const isStandalonePWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  const w = window as any;
  let bridgeName: string | null = null;

  if (isSEBUA) {
    bridgeName = 'SafeExamBrowser';
  } else if (w.Android && typeof w.Android === 'object') {
    bridgeName = 'Android';
  } else if (w.Exambro && typeof w.Exambro === 'object') {
    bridgeName = 'Exambro';
  } else if (w.cbtBridge && typeof w.cbtBridge === 'object') {
    bridgeName = 'cbtBridge';
  } else if (w.AndroidInterface && typeof w.AndroidInterface === 'object') {
    bridgeName = 'AndroidInterface';
  } else if (w.ExambroClient && typeof w.ExambroClient === 'object') {
    bridgeName = 'ExambroClient';
  }

  const isExambro = Boolean(isExambroUA || bridgeName);

  return {
    isExambro,
    isSEB: Boolean(isSEBUA),
    isAndroidWebView,
    isStandalonePWA,
    bridgeName,
    userAgent: ua,
  };
}

/**
 * Menyimpan data jawaban ke Native Storage Android Exambro (SharedPreferences / Native SQLite)
 * jika aplikasi Android Exambro menyediakan JavascriptInterface.
 */
export async function saveAnswerToAndroidExambro(data: {
  ujianId: string;
  soalId: string;
  jawabanDipilih: string;
  raguRagu: boolean;
  sisaDetik?: number;
}): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const w = window as any;
  const payloadString = JSON.stringify(data);

  try {
    // 1. Coba interface window.Android
    if (w.Android) {
      if (typeof w.Android.saveAnswer === 'function') {
        w.Android.saveAnswer(data.ujianId, data.soalId, data.jawabanDipilih, Boolean(data.raguRagu));
        return true;
      }
      if (typeof w.Android.storeCache === 'function') {
        w.Android.storeCache(`${data.ujianId}_${data.soalId}`, payloadString);
        return true;
      }
      if (typeof w.Android.saveExamData === 'function') {
        w.Android.saveExamData(payloadString);
        return true;
      }
    }

    // 2. Coba interface window.Exambro
    if (w.Exambro) {
      if (typeof w.Exambro.saveAnswer === 'function') {
        w.Exambro.saveAnswer(data.ujianId, data.soalId, data.jawabanDipilih, Boolean(data.raguRagu));
        return true;
      }
      if (typeof w.Exambro.saveExamData === 'function') {
        w.Exambro.saveExamData(payloadString);
        return true;
      }
    }

    // 3. Coba interface window.cbtBridge
    if (w.cbtBridge) {
      if (typeof w.cbtBridge.saveAnswer === 'function') {
        w.cbtBridge.saveAnswer(data.ujianId, data.soalId, data.jawabanDipilih, Boolean(data.raguRagu));
        return true;
      }
      if (typeof w.cbtBridge.saveCache === 'function') {
        w.cbtBridge.saveCache(`${data.ujianId}_${data.soalId}`, payloadString);
        return true;
      }
    }

    // 4. Coba interface window.AndroidInterface
    if (w.AndroidInterface && typeof w.AndroidInterface.saveAnswer === 'function') {
      w.AndroidInterface.saveAnswer(data.ujianId, data.soalId, data.jawabanDipilih, Boolean(data.raguRagu));
      return true;
    }

    // 5. Coba postMessage WebMessageListener untuk WebView Android modern
    if (w.AndroidBridge && typeof w.AndroidBridge.postMessage === 'function') {
      w.AndroidBridge.postMessage(
        JSON.stringify({
          action: 'SAVE_ANSWER',
          data,
        })
      );
      return true;
    }
  } catch (err) {
    console.warn('[Exambro Bridge] Gagal simpan ke storage native Android:', err);
  }

  return false;
}

/**
 * Mengambil cache jawaban dari Native Storage Android Exambro jika tersedia
 */
export async function fetchAnswersFromAndroidExambro(
  ujianId: string
): Promise<Record<string, { jawabanDipilih: string; raguRagu: boolean }> | null> {
  if (typeof window === 'undefined') return null;

  const w = window as any;

  try {
    let rawResult: any = null;

    // 1. Cek window.Android
    if (w.Android) {
      if (typeof w.Android.getAnswers === 'function') {
        rawResult = w.Android.getAnswers(ujianId);
      } else if (typeof w.Android.getAllAnswers === 'function') {
        rawResult = w.Android.getAllAnswers(ujianId);
      } else if (typeof w.Android.getExamCache === 'function') {
        rawResult = w.Android.getExamCache(ujianId);
      }
    }

    // 2. Cek window.Exambro
    if (!rawResult && w.Exambro) {
      if (typeof w.Exambro.getAnswers === 'function') {
        rawResult = w.Exambro.getAnswers(ujianId);
      } else if (typeof w.Exambro.getAllAnswers === 'function') {
        rawResult = w.Exambro.getAllAnswers(ujianId);
      }
    }

    // 3. Cek window.cbtBridge
    if (!rawResult && w.cbtBridge) {
      if (typeof w.cbtBridge.getAnswers === 'function') {
        rawResult = w.cbtBridge.getAnswers(ujianId);
      }
    }

    // 4. Parse hasil jika didapat dari native
    if (rawResult) {
      if (typeof rawResult === 'string') {
        try {
          const parsed = JSON.parse(rawResult);
          return parsed;
        } catch (e) {
          // ignore
        }
      } else if (typeof rawResult === 'object') {
        return rawResult;
      }
    }
  } catch (err) {
    console.warn('[Exambro Bridge] Gagal baca dari native Android storage:', err);
  }

  return null;
}

/**
 * Mendaftarkan Global JavaScript Hooks pada objek `window` agar aplikasi Android Exambro
 * dapat memanggil `evaluateJavascript()` secara langsung dari native Java/Kotlin untuk:
 * 1. Mengambil seluruh cache jawaban (Export/Backup)
 * 2. Memulihkan / menginjeksi cache jawaban (Restore)
 * 3. Memeriksa status kesehatan koneksi dan sinkronisasi
 */
export function registerGlobalExambroBridge(callbacks?: {
  onRestoreAnswers?: (answers: Record<string, { jawabanDipilih: string; raguRagu: boolean }>) => void;
}) {
  if (typeof window === 'undefined') return;

  const w = window as any;

  // 1. Hook Ping / Info Sistem CBT
  w.cbtExambroPing = () => {
    const info = detectExambroApp();
    return JSON.stringify({
      app: 'CBT MUHIPO',
      version: '1.0.0',
      status: 'READY',
      isExambroDetected: info.isExambro,
      bridgeFound: info.bridgeName,
      timestamp: Date.now(),
    });
  };

  // 2. Hook Mengambil Cache Jawaban Siswa dari IndexedDB (Untuk diambil oleh Java/Kotlin Android)
  w.cbtExambroGetAnswers = async (ujianId: string) => {
    try {
      const answers = await getAllCachedAnswersFromIndexedDB(ujianId);
      return JSON.stringify({
        success: true,
        ujianId,
        total: Object.keys(answers).length,
        answers,
      });
    } catch (e: any) {
      return JSON.stringify({ success: false, error: e?.message || 'Gagal membaca cache' });
    }
  };

  // 3. Hook Mengambil Full Backup JSON dari Ujian Ini
  w.cbtExambroGetFullBackup = async (ujianId: string) => {
    try {
      const json = await exportExamAnswersBackupJSON(ujianId);
      return json;
    } catch (e: any) {
      return JSON.stringify({ success: false, error: e?.message });
    }
  };

  // 4. Hook Memulihkan / Menginjeksi Cache dari Aplikasi Android ke IndexedDB & UI
  w.cbtExambroRestoreAnswers = async (ujianId: string, payloadJSON: string) => {
    try {
      const parsed = typeof payloadJSON === 'string' ? JSON.parse(payloadJSON) : payloadJSON;
      const answersToRestore = parsed.answers || parsed.jawabanList || parsed;

      if (typeof answersToRestore !== 'object') {
        return JSON.stringify({ success: false, message: 'Format data tidak valid' });
      }

      // Tulis ke IndexedDB
      const promises: Promise<void>[] = [];
      Object.keys(answersToRestore).forEach((soalId) => {
        const item = answersToRestore[soalId];
        promises.push(
          saveAnswerToIndexedDB({
            ujianId,
            soalId,
            jawabanDipilih: item.jawabanDipilih ?? item.jawaban ?? '',
            raguRagu: Boolean(item.raguRagu),
            syncedToServer: false,
          })
        );
      });

      await Promise.all(promises);

      // Trigger callback ke React state jika terdaftar
      if (callbacks?.onRestoreAnswers) {
        callbacks.onRestoreAnswers(answersToRestore);
      }

      // Coba sinkronkan ke server
      syncPendingAnswersToServer(ujianId);

      return JSON.stringify({
        success: true,
        message: `Berhasil memulihkan ${Object.keys(answersToRestore).length} butir jawaban ke IndexedDB`,
      });
    } catch (e: any) {
      return JSON.stringify({ success: false, error: e?.message });
    }
  };

  // 5. Hook Trigger Manual Sync dari Android Native
  w.cbtExambroTriggerSync = async (ujianId: string) => {
    try {
      const res = await syncPendingAnswersToServer(ujianId);
      return JSON.stringify(res);
    } catch (e: any) {
      return JSON.stringify({ success: false, error: e?.message });
    }
  };

  console.log('[Exambro Bridge] Global JavaScript Hooks (window.cbtExambro*) berhasil diaktifkan.');
}

/**
 * Mengaktifkan Kiosk Mode & FLAG_SECURE pada Aplikasi Android CBT Exambro
 * Memerintahkan native app untuk:
 * 1. WindowManager.LayoutParams.FLAG_SECURE -> memblokir hardware screenshot & screen recording di Android OS level
 * 2. Mengaktifkan lock-task mode / kiosk mode (menonaktifkan tombol recent apps, split screen, dan home button jika didukung)
 */
export function enforceExambroKioskSecurity(): { isKioskLocked: boolean; method: string } {
  if (typeof window === 'undefined') return { isKioskLocked: false, method: 'none' };

  const w = window as any;
  let method = 'web';

  try {
    // 1. Coba interface window.Exambro (Exambro Native Bridge standar)
    if (w.Exambro) {
      if (typeof w.Exambro.setSecureMode === 'function') {
        w.Exambro.setSecureMode(true);
        method = 'Exambro.setSecureMode';
      }
      if (typeof w.Exambro.setFlagSecure === 'function') {
        w.Exambro.setFlagSecure(true);
        method = 'Exambro.setFlagSecure';
      }
      if (typeof w.Exambro.setKioskMode === 'function') {
        w.Exambro.setKioskMode(true);
      }
      if (typeof w.Exambro.blockScreenshot === 'function') {
        w.Exambro.blockScreenshot(true);
      }
      if (typeof w.Exambro.lockNavigation === 'function') {
        w.Exambro.lockNavigation(true);
      }
      if (typeof w.Exambro.startLockTask === 'function') w.Exambro.startLockTask();
      if (typeof w.Exambro.pinApp === 'function') w.Exambro.pinApp(true);
      if (typeof w.Exambro.setExamActive === 'function') w.Exambro.setExamActive(true);
    }

    // 2. Coba interface window.Android
    if (w.Android) {
      if (typeof w.Android.setFlagSecure === 'function') {
        w.Android.setFlagSecure(true);
        method = 'Android.setFlagSecure';
      }
      if (typeof w.Android.enableKioskMode === 'function') {
        w.Android.enableKioskMode(true);
      }
      if (typeof w.Android.blockScreenshot === 'function') {
        w.Android.blockScreenshot(true);
      }
      if (typeof w.Android.startLockTask === 'function') w.Android.startLockTask();
      if (typeof w.Android.pinApp === 'function') w.Android.pinApp(true);
      if (typeof w.Android.setExamActive === 'function') w.Android.setExamActive(true);
    }

    // 3. Coba interface window.cbtBridge
    if (w.cbtBridge) {
      if (typeof w.cbtBridge.setSecureMode === 'function') {
        w.cbtBridge.setSecureMode(true);
        method = 'cbtBridge.setSecureMode';
      }
      if (typeof w.cbtBridge.setKioskMode === 'function') {
        w.cbtBridge.setKioskMode(true);
      }
      if (typeof w.cbtBridge.startLockTask === 'function') w.cbtBridge.startLockTask();
      if (typeof w.cbtBridge.pinApp === 'function') w.cbtBridge.pinApp(true);
      if (typeof w.cbtBridge.setExamActive === 'function') w.cbtBridge.setExamActive(true);
    }

    // 4. Safe Exam Browser (SEB) JavaScript API
    if (w.SafeExamBrowser) {
      method = 'SafeExamBrowser';
    }

    // 5. Broadcast event ke WebView / APK Kiosk listener
    window.dispatchEvent(new CustomEvent('cbt-kiosk-lock', { detail: { locked: true, method } }));

    console.log(`[Exambro Kiosk] Enforce kiosk security executed: method=${method}`);
    return { isKioskLocked: method !== 'web', method };
  } catch (e) {
    console.warn('[Exambro Kiosk] Gagal mengaktifkan native kiosk secure mode:', e);
    return { isKioskLocked: false, method: 'error' };
  }
}

/**
 * Melepaskan Kiosk Mode & FLAG_SECURE pada Aplikasi Android CBT Exambro saat ujian selesai
 */
export function releaseExambroKioskSecurity(): void {
  if (typeof window === 'undefined') return;

  const w = window as any;
  try {
    if (w.Exambro) {
      if (typeof w.Exambro.setSecureMode === 'function') w.Exambro.setSecureMode(false);
      if (typeof w.Exambro.setFlagSecure === 'function') w.Exambro.setFlagSecure(false);
      if (typeof w.Exambro.setKioskMode === 'function') w.Exambro.setKioskMode(false);
      if (typeof w.Exambro.blockScreenshot === 'function') w.Exambro.blockScreenshot(false);
      if (typeof w.Exambro.lockNavigation === 'function') w.Exambro.lockNavigation(false);
      if (typeof w.Exambro.stopLockTask === 'function') w.Exambro.stopLockTask();
      if (typeof w.Exambro.pinApp === 'function') w.Exambro.pinApp(false);
      if (typeof w.Exambro.setExamActive === 'function') w.Exambro.setExamActive(false);
    }
    if (w.Android) {
      if (typeof w.Android.setFlagSecure === 'function') w.Android.setFlagSecure(false);
      if (typeof w.Android.enableKioskMode === 'function') w.Android.enableKioskMode(false);
      if (typeof w.Android.blockScreenshot === 'function') w.Android.blockScreenshot(false);
      if (typeof w.Android.stopLockTask === 'function') w.Android.stopLockTask();
      if (typeof w.Android.pinApp === 'function') w.Android.pinApp(false);
      if (typeof w.Android.setExamActive === 'function') w.Android.setExamActive(false);
    }
    if (w.cbtBridge) {
      if (typeof w.cbtBridge.setSecureMode === 'function') w.cbtBridge.setSecureMode(false);
      if (typeof w.cbtBridge.setKioskMode === 'function') w.cbtBridge.setKioskMode(false);
      if (typeof w.cbtBridge.stopLockTask === 'function') w.cbtBridge.stopLockTask();
      if (typeof w.cbtBridge.pinApp === 'function') w.cbtBridge.pinApp(false);
      if (typeof w.cbtBridge.setExamActive === 'function') w.cbtBridge.setExamActive(false);
    }
    window.dispatchEvent(new CustomEvent('cbt-kiosk-unlock', { detail: { locked: false } }));
    console.log('[Exambro Kiosk] Kiosk security released.');
  } catch (e) {
    console.warn('[Exambro Kiosk] Gagal melepaskan kiosk mode:', e);
  }
}

/**
 * Mendaftarkan callback global untuk APK Android Kiosk agar dapat mengirim
 * sinyal percobaan keluar aplikasi (Back/Home/Unpin) ke sistem Anti-Cheat CBT.
 */
export function registerKioskExitAlertHandler(onExitAttempt: (reason?: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const w = window as any;

  const handleEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ reason?: string }>;
    onExitAttempt(customEvent?.detail?.reason || 'Percobaan keluar dari aplikasi Kiosk');
  };

  w.onKioskExitAttempt = (reason?: string) => {
    onExitAttempt(reason || 'Percobaan keluar dari aplikasi Kiosk');
  };

  window.addEventListener('cbt-kiosk-exit-attempt', handleEvent);
  return () => {
    window.removeEventListener('cbt-kiosk-exit-attempt', handleEvent);
    if (w.onKioskExitAttempt) delete w.onKioskExitAttempt;
  };
}
