import { prisma } from '@/lib/prisma';

/**
 * Mengambil waktu server terkalibrasi (Date.now() + timeSyncOffsetMs dari PengaturanSistem)
 * agar seluruh logika pembukaan ujian, penutupan ujian, dan hitung mundur waktu tes
 * selalu 100% sinkron dengan waktu server yang disetel oleh Administrator.
 */
export async function getCalibratedServerNow(): Promise<Date> {
  try {
    const settings = await (prisma as any).pengaturanSistem.findUnique({
      where: { id: 'default-settings' },
      select: { timeSyncOffsetMs: true },
    });
    const offsetMs = Number(settings?.timeSyncOffsetMs) || 0;
    return new Date(Date.now() + offsetMs);
  } catch {
    return new Date();
  }
}

/**
 * Menghitung sisa waktu ujian (dalam detik) secara akurat dan tahan manipulasi:
 * Memperhitungkan:
 * 1. Durasi ujian (durasiMenit * 60) dikurangi waktu berjalan sejak peserta mulai (waktuMulai peserta)
 * 2. Tambahan waktu ekstra (ADD_TIME) dari Pengawas/Proktor jika melebihi sisa durasi normal
 * 3. Batas akhir jadwal ujian keseluruhan (ujian.waktuSelesai) kecuali proktor memberi perpanjangan khusus
 */
export function computeAccurateExamRemainingSeconds(params: {
  now: Date;
  durasiMenit: number;
  jadwalSelesai?: Date | string | null;
  pesertaWaktuMulai?: Date | string | null;
  pesertaSisaDetikTersimpan?: number | null;
  pesertaUpdatedAt?: Date | string | null;
  pesertaStatus?: string | null;
}): number {
  const {
    now,
    durasiMenit,
    jadwalSelesai,
    pesertaWaktuMulai,
    pesertaSisaDetikTersimpan,
    pesertaUpdatedAt,
    pesertaStatus,
  } = params;

  const totalMaxDetik = Math.max(60, (Number(durasiMenit) || 90) * 60);

  // Hitung batas maksimal dari jadwal tutup ujian (jika ada)
  let sisaDariJadwal = Infinity;
  if (jadwalSelesai) {
    const endDt = new Date(jadwalSelesai);
    if (!isNaN(endDt.getTime())) {
      sisaDariJadwal = Math.floor((endDt.getTime() - now.getTime()) / 1000);
    }
  }

  // Jika peserta belum mulai atau baru di-reset login belum pernah mulai
  if (!pesertaWaktuMulai || pesertaStatus === 'BELUM_MULAI') {
    if (sisaDariJadwal !== Infinity) {
      return Math.max(0, Math.min(totalMaxDetik, sisaDariJadwal));
    }
    return totalMaxDetik;
  }

  if (pesertaStatus === 'SELESAI') {
    return 0;
  }

  const startMs = new Date(pesertaWaktuMulai).getTime();
  const elapsedSinceStart = Math.max(0, Math.floor((now.getTime() - startMs) / 1000));
  const standardRemaining = totalMaxDetik - elapsedSinceStart;

  // Cek apakah Proktor pernah menambahkan waktu ekstra (ADD_TIME):
  // Bila pada saat pesertaUpdatedAt nilai pesertaSisaDetikTersimpan lebih besar (> 15 detik) daripada
  // sisa standar pada momen pesertaUpdatedAt tersebut, berarti ada ekstra waktu dari Proktor!
  let effectiveRemaining = standardRemaining;
  if (
    typeof pesertaSisaDetikTersimpan === 'number' &&
    pesertaUpdatedAt
  ) {
    const updatedMs = new Date(pesertaUpdatedAt).getTime();
    const elapsedAtUpdate = Math.max(0, Math.floor((updatedMs - startMs) / 1000));
    const expectedAtUpdate = totalMaxDetik - elapsedAtUpdate;
    const bonusSeconds = pesertaSisaDetikTersimpan - expectedAtUpdate;

    if (bonusSeconds > 15) {
      const elapsedSinceUpdate = Math.max(0, Math.floor((now.getTime() - updatedMs) / 1000));
      effectiveRemaining = pesertaSisaDetikTersimpan - elapsedSinceUpdate;
      // Jika proktor memberi extra time, izinkan melampaui jadwalSelesai sebatas bonus yang diberikan
      return Math.max(0, effectiveRemaining);
    }
  }

  if (sisaDariJadwal !== Infinity) {
    effectiveRemaining = Math.min(effectiveRemaining, sisaDariJadwal);
  }

  return Math.max(0, effectiveRemaining);
}

