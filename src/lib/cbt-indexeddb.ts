/**
 * CBT MUHIPO - IndexedDB Client Caching Engine
 * Cadangan penyimpanan jawaban dan sesi ujian offline di browser client.
 * Menjamin integritas jawaban siswa tetap 100% aman tersimpan di komputer/perangkat siswa
 * meskipun server CBT tiba-tiba mati, listrik padam di ruang server, atau jaringan LAN terputus.
 */

const DB_NAME = 'CBT_MUHIPO_OFFLINE_DB';
const DB_VERSION = 1;

export interface CachedAnswerRecord {
  key: string; // Format: `${ujianId}_${soalId}`
  ujianId: string;
  soalId: string;
  jawabanDipilih: string;
  raguRagu: boolean;
  sisaDetik?: number;
  updatedAt: number; // Unix timestamp
  syncedToServer: boolean;
}

export interface CachedExamSession {
  ujianId: string;
  pesertaUjianId?: string;
  ujianInfo: any;
  soalList: any[];
  savedAt: number;
}

// Inisialisasi Database IndexedDB
export function openCBTDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB tidak didukung pada browser ini.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Object Store untuk Jawaban Peserta
      if (!db.objectStoreNames.contains('answers')) {
        const answerStore = db.createObjectStore('answers', { keyPath: 'key' });
        answerStore.createIndex('ujianId', 'ujianId', { unique: false });
        answerStore.createIndex('syncedToServer', 'syncedToServer', { unique: false });
      }

      // 2. Object Store untuk Metadata & Paket Soal Ujian
      if (!db.objectStoreNames.contains('exam_sessions')) {
        db.createObjectStore('exam_sessions', { keyPath: 'ujianId' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[IndexedDB] Gagal membuka database:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Menyimpan jawaban butir soal ke IndexedDB lokal secara instan
 */
export async function saveAnswerToIndexedDB(data: {
  ujianId: string;
  soalId: string;
  jawabanDipilih: string;
  raguRagu: boolean;
  sisaDetik?: number;
  syncedToServer?: boolean;
}): Promise<void> {
  try {
    const db = await openCBTDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('answers', 'readwrite');
      const store = tx.objectStore('answers');

      const record: CachedAnswerRecord = {
        key: `${data.ujianId}_${data.soalId}`,
        ujianId: data.ujianId,
        soalId: data.soalId,
        jawabanDipilih: data.jawabanDipilih ?? '',
        raguRagu: Boolean(data.raguRagu),
        sisaDetik: data.sisaDetik,
        updatedAt: Date.now(),
        syncedToServer: data.syncedToServer ?? false,
      };

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Gagal simpan jawaban lokal:', err);
  }
}

/**
 * Menandai daftar soal sebagai berhasil tersinkronisasi ke server
 */
export async function markAnswersAsSynced(ujianId: string, soalIds: string[]): Promise<void> {
  try {
    const db = await openCBTDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('answers', 'readwrite');
      const store = tx.objectStore('answers');

      soalIds.forEach((soalId) => {
        const key = `${ujianId}_${soalId}`;
        const getReq = store.get(key);
        getReq.onsuccess = () => {
          const item = getReq.result as CachedAnswerRecord | undefined;
          if (item) {
            item.syncedToServer = true;
            store.put(item);
          }
        };
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Gagal update sync status:', err);
  }
}

/**
 * Mengambil seluruh cache jawaban untuk suatu ujian dari IndexedDB
 */
export async function getAllCachedAnswersFromIndexedDB(
  ujianId: string
): Promise<Record<string, { jawabanDipilih: string; raguRagu: boolean; updatedAt: number; syncedToServer: boolean }>> {
  try {
    const db = await openCBTDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('answers', 'readonly');
      const store = tx.objectStore('answers');
      const index = store.index('ujianId');
      const req = index.getAll(ujianId);

      req.onsuccess = () => {
        const results = req.result as CachedAnswerRecord[];
        const map: Record<
          string,
          { jawabanDipilih: string; raguRagu: boolean; updatedAt: number; syncedToServer: boolean }
        > = {};
        if (Array.isArray(results)) {
          results.forEach((r) => {
            map[r.soalId] = {
              jawabanDipilih: r.jawabanDipilih,
              raguRagu: r.raguRagu,
              updatedAt: r.updatedAt,
              syncedToServer: r.syncedToServer,
            };
          });
        }
        resolve(map);
      };

      req.onerror = () => {
        resolve({});
      };
    });
  } catch (err) {
    return {};
  }
}

/**
 * Mengambil daftar jawaban yang belum berhasil terkirim ke server (pending sync)
 */
export async function getUnsyncedAnswersFromIndexedDB(
  ujianId: string
): Promise<Array<{ soalId: string; jawabanDipilih: string; raguRagu: boolean; sisaDetik?: number; updatedAt: number }>> {
  try {
    const db = await openCBTDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('answers', 'readonly');
      const store = tx.objectStore('answers');
      const index = store.index('ujianId');
      const req = index.getAll(ujianId);

      req.onsuccess = () => {
        const results = req.result as CachedAnswerRecord[];
        const unsynced = (results || []).filter((r) => !r.syncedToServer);
        resolve(
          unsynced.map((u) => ({
            soalId: u.soalId,
            jawabanDipilih: u.jawabanDipilih,
            raguRagu: u.raguRagu,
            sisaDetik: u.sisaDetik,
            updatedAt: u.updatedAt,
          }))
        );
      };

      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

/**
 * Menyimpan metadata dan paket soal ujian ke IndexedDB
 */
export async function saveExamSessionToIndexedDB(
  ujianId: string,
  data: { pesertaUjianId?: string; ujianInfo: any; soalList: any[] }
): Promise<void> {
  try {
    const db = await openCBTDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exam_sessions', 'readwrite');
      const store = tx.objectStore('exam_sessions');

      const sessionRecord: CachedExamSession = {
        ujianId,
        pesertaUjianId: data.pesertaUjianId,
        ujianInfo: data.ujianInfo,
        soalList: data.soalList,
        savedAt: Date.now(),
      };

      const req = store.put(sessionRecord);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Gagal simpan sesi ujian lokal:', err);
  }
}

/**
 * Mengambil metadata dan paket soal ujian dari IndexedDB (Fallback jika server down)
 */
export async function getExamSessionFromIndexedDB(ujianId: string): Promise<CachedExamSession | null> {
  try {
    const db = await openCBTDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('exam_sessions', 'readonly');
      const store = tx.objectStore('exam_sessions');
      const req = store.get(ujianId);

      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Melakukan sinkronisasi otomatis seluruh jawaban yang tertunda di IndexedDB ke Server CBT
 */
export async function syncPendingAnswersToServer(
  ujianId: string,
  currentSisaDetik?: number
): Promise<{ success: boolean; syncedCount: number }> {
  try {
    const pendingList = await getUnsyncedAnswersFromIndexedDB(ujianId);
    if (pendingList.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    const payload = {
      batchJawaban: pendingList.map((p) => ({
        soalId: p.soalId,
        jawabanDipilih: p.jawabanDipilih,
        raguRagu: p.raguRagu,
      })),
      sisaDetik: currentSisaDetik ?? pendingList[0]?.sisaDetik,
    };

    const res = await fetch(`/api/siswa/ujian/${ujianId}/jawaban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        const syncedSoalIds = pendingList.map((p) => p.soalId);
        await markAnswersAsSynced(ujianId, syncedSoalIds);
        return { success: true, syncedCount: syncedSoalIds.length };
      }
    }

    return { success: false, syncedCount: 0 };
  } catch (e) {
    return { success: false, syncedCount: 0 };
  }
}

/**
 * Mengekspor seluruh cadangan jawaban ujian dalam format JSON string
 * Berguna sebagai penyelamat darurat jika server rusak permanen saat ujian berlangsung.
 */
export async function exportExamAnswersBackupJSON(ujianId: string): Promise<string> {
  const cachedAnswers = await getAllCachedAnswersFromIndexedDB(ujianId);
  const session = await getExamSessionFromIndexedDB(ujianId);
  
  const backupObject = {
    exportedAt: new Date().toISOString(),
    ujianId,
    pesertaUjianId: session?.pesertaUjianId,
    judulUjian: session?.ujianInfo?.judul,
    kodeUjian: session?.ujianInfo?.kodeUjian,
    totalJawabanTersimpan: Object.keys(cachedAnswers).length,
    jawabanList: cachedAnswers,
  };

  return JSON.stringify(backupObject, null, 2);
}
