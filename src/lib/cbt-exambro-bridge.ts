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
  bridgeName: string | null;
  userAgent: string;
}

/**
 * Deteksi apakah halaman dibuka di dalam aplikasi Android CBT Exambro
 */
export function detectExambroApp(): ExambroDetectionInfo {
  if (typeof window === 'undefined') {
    return { isExambro: false, bridgeName: null, userAgent: '' };
  }

  const ua = navigator.userAgent || '';
  const isExambroUA = /Exambro|ExamBrowser|CBTExambro|Examora|FlyExam|CandyExambro|MuhipoExambro|SafeExam/i.test(ua);

  const w = window as any;
  let bridgeName: string | null = null;

  if (w.Android && typeof w.Android === 'object') {
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
