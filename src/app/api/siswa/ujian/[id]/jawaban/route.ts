import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatusPeserta } from '@/lib/enums';
import { getCalibratedServerNow, computeAccurateExamRemainingSeconds } from '@/lib/exam-time';

// API Autosave Jawaban Siswa & Sinkronisasi Sisa Waktu Server
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'SISWA') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: ujianId } = await context.params;
    const body = await request.json();
    const { soalId, jawabanDipilih, raguRagu, batchJawaban } = body;

    const pesertaUjian = await prisma.pesertaUjian.findUnique({
      where: {
        ujianId_siswaId: {
          ujianId,
          siswaId: user.userId,
        },
      },
      include: {
        ujian: true,
      },
    });

    if (!pesertaUjian) {
      return NextResponse.json(
        { success: false, message: 'Data sesi peserta tidak ditemukan' },
        { status: 404 }
      );
    }

    if (pesertaUjian.status === StatusPeserta.TERKUNCI) {
      return NextResponse.json(
        { success: false, isLocked: true, message: 'Ujian Anda telah dikunci oleh Pengawas/Proktor.' },
        { status: 403 }
      );
    }

    if (pesertaUjian.status === StatusPeserta.RESET_LOGIN) {
      return NextResponse.json(
        { success: false, isResetLogin: true, message: 'Sesi login Anda telah direset oleh Pengawas. Silakan login kembali di perangkat aktif.' },
        { status: 409 }
      );
    }

    if (pesertaUjian.status === StatusPeserta.SELESAI) {
      return NextResponse.json(
        { success: false, isFinished: true, message: 'Ujian ini sudah diselesaikan.' },
        { status: 400 }
      );
    }

    // Hitung sisa waktu otoritatif dari server (mencegah client menimpa extra time yang baru ditambahkan Proktor!)
    const now = await getCalibratedServerNow();
    const serverRemainingSeconds = computeAccurateExamRemainingSeconds({
      now,
      durasiMenit: pesertaUjian.ujian.durasiMenit,
      jadwalSelesai: pesertaUjian.ujian.waktuSelesai,
      pesertaWaktuMulai: pesertaUjian.waktuMulai,
      pesertaSisaDetikTersimpan: pesertaUjian.sisaDetik,
      pesertaUpdatedAt: pesertaUjian.updatedAt,
      pesertaStatus: pesertaUjian.status,
    });

    // 1. Batch sync dari IndexedDB Client Caching
    if (Array.isArray(batchJawaban) && batchJawaban.length > 0) {
      for (const item of batchJawaban) {
        if (!item.soalId) continue;
        await prisma.jawabanPeserta.upsert({
          where: {
            pesertaUjianId_soalId: {
              pesertaUjianId: pesertaUjian.id,
              soalId: item.soalId,
            },
          },
          update: {
            jawabanDipilih: item.jawabanDipilih !== undefined ? String(item.jawabanDipilih) : undefined,
            raguRagu: item.raguRagu !== undefined ? Boolean(item.raguRagu) : undefined,
          },
          create: {
            pesertaUjianId: pesertaUjian.id,
            soalId: item.soalId,
            jawabanDipilih: item.jawabanDipilih !== undefined ? String(item.jawabanDipilih) : '',
            raguRagu: item.raguRagu !== undefined ? Boolean(item.raguRagu) : false,
          },
        });
      }

      await prisma.pesertaUjian.update({
        where: { id: pesertaUjian.id },
        data: { sisaDetik: serverRemainingSeconds },
      });

      return NextResponse.json({
        success: true,
        sisaDetik: serverRemainingSeconds,
        serverTimestampMs: now.getTime(),
        message: `${batchJawaban.length} jawaban berhasil disinkronisasi dari IndexedDB ke Server`,
      });
    }

    // 2. Single item autosave (atau heartbeat sinkronisasi waktu jika tanpa soalId)
    if (soalId) {
      await prisma.jawabanPeserta.upsert({
        where: {
          pesertaUjianId_soalId: {
            pesertaUjianId: pesertaUjian.id,
            soalId,
          },
        },
        update: {
          jawabanDipilih: jawabanDipilih !== undefined ? String(jawabanDipilih) : undefined,
          raguRagu: raguRagu !== undefined ? Boolean(raguRagu) : undefined,
        },
        create: {
          pesertaUjianId: pesertaUjian.id,
          soalId,
          jawabanDipilih: jawabanDipilih !== undefined ? String(jawabanDipilih) : '',
          raguRagu: raguRagu !== undefined ? Boolean(raguRagu) : false,
        },
      });
    }

    await prisma.pesertaUjian.update({
      where: { id: pesertaUjian.id },
      data: { sisaDetik: serverRemainingSeconds },
    });

    return NextResponse.json({
      success: true,
      sisaDetik: serverRemainingSeconds,
      serverTimestampMs: now.getTime(),
      message: 'Jawaban tersimpan',
    });
  } catch (error: any) {
    console.error('Save jawaban error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
