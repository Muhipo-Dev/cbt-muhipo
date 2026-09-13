import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

// In-Memory Live Screen Cache (Transient / High Performance)
// Tidak disimpan ke DB untuk mencegah bloat, frame langsung di-stream ke pengawas
interface LiveScreenFeed {
  pesertaUjianId: string;
  siswaId: string;
  nama: string;
  nis: string;
  browser: string;
  device: string;
  screenImage: string; // Base64 JPEG frame
  timestamp: number;
  soalAktifNomor?: number;
  totalSoal?: number;
  sisaDetik?: number;
  isStreamNative: boolean; // true = native display stream (Chrome Desktop), false = active mobile canvas
  orientation?: 'portrait' | 'landscape';
}

// Global variable across hot reloads in Node process
declare global {
  // eslint-disable-next-line no-var
  var __cbtLiveScreenStore: Map<string, LiveScreenFeed> | undefined;
}

const liveScreenStore: Map<string, LiveScreenFeed> =
  global.__cbtLiveScreenStore || (global.__cbtLiveScreenStore = new Map());

// Auto-cleanup feed yang offline lebih dari 20 detik
function cleanupStaleFeeds() {
  const now = Date.now();
  for (const [key, val] of liveScreenStore.entries()) {
    if (now - val.timestamp > 20000) {
      liveScreenStore.delete(key);
    }
  }
}

// POST: Siswa mengirim snapshot frame layar terkini (setiap 2-3 detik)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      pesertaUjianId,
      screenImage,
      browser,
      device,
      soalAktifNomor,
      totalSoal,
      sisaDetik,
      isStreamNative,
      orientation,
    } = body;

    if (!pesertaUjianId || !screenImage) {
      return NextResponse.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
    }

    liveScreenStore.set(pesertaUjianId, {
      pesertaUjianId,
      siswaId: user.userId,
      nama: user.name,
      nis: user.username,
      browser: browser || 'Unknown',
      device: device || 'Mobile/Desktop',
      screenImage,
      timestamp: Date.now(),
      soalAktifNomor,
      totalSoal,
      sisaDetik,
      isStreamNative: Boolean(isStreamNative),
      orientation: orientation || 'portrait',
    });

    // Jalankan pembersihan berkala ringan
    if (Math.random() < 0.1) {
      cleanupStaleFeeds();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET: Proktor / Guru / Admin mengambil frame layar realtime siswa tertentu
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['ADMIN', 'PROKTOR', 'GURU'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pesertaUjianId = searchParams.get('pesertaUjianId');

    if (!pesertaUjianId) {
      // Kembalikan ringkasan daftar peserta yang layarnya aktif
      cleanupStaleFeeds();
      const activeList = Array.from(liveScreenStore.values()).map((feed) => ({
        pesertaUjianId: feed.pesertaUjianId,
        nama: feed.nama,
        browser: feed.browser,
        device: feed.device,
        timestamp: feed.timestamp,
        ageMs: Date.now() - feed.timestamp,
        isStreamNative: feed.isStreamNative,
        soalAktifNomor: feed.soalAktifNomor,
      }));
      return NextResponse.json({ success: true, data: activeList });
    }

    const feed = liveScreenStore.get(pesertaUjianId);
    if (!feed) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Layar belum aktif atau peserta belum terhubung',
      });
    }

    const ageMs = Date.now() - feed.timestamp;
    const isOnline = ageMs < 10000; // Jika frame dikirim kurang dari 10 detik lalu

    return NextResponse.json({
      success: true,
      data: {
        ...feed,
        isOnline,
        ageMs,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
