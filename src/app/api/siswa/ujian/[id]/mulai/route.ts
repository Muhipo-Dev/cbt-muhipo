import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCalibratedServerNow, computeAccurateExamRemainingSeconds } from '@/lib/exam-time';

// Fungsi deterministik untuk mengacak opsi jawaban per peserta & per soal (jika ujian.acakOpsi === true)
// Menggunakan seed dari pesertaId + soalId agar urutan opsi konsisten meskipun halaman di-refresh!
function seededShuffleOptions<T extends { label: string }>(options: T[], seedStr: string): T[] {
  if (options.length <= 1) return options;
  const arr = [...options];
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const nextRand = () => {
    hash += hash << 13;
    hash ^= hash >>> 7;
    hash += hash << 3;
    hash ^= hash >>> 17;
    hash += hash << 5;
    return (hash >>> 0) / 4294967296;
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  // Tetapkan ulang label tampilan A, B, C, D, E secara berurutan agar rapi di layar peserta
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return arr.map((item, idx) => ({
    ...item,
    label: letters[idx] || item.label,
  }));
}

// POST: Memulai Ujian (Membaca Butir Soal Langsung dari Topik / Mata Pelajaran)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'SISWA') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: ujianId } = await params;

    // 1. Ambil data Ujian dan Topik / Mata Pelajaran
    const ujian = await prisma.ujian.findUnique({
      where: { id: ujianId },
      include: {
        mataPelajaran: {
          include: {
            soalList: {
              include: {
                opsiJawaban: {
                  orderBy: { label: 'asc' },
                },
              },
              orderBy: [{ nomorUrut: 'asc' }, { id: 'asc' }],
            },
            gurus: {
              include: {
                guru: { select: { id: true, name: true } },
              },
            },
            pembuat: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!ujian || ujian.mataPelajaran?.status === 'TERHAPUS') {
      return NextResponse.json({ success: false, message: 'Jadwal ujian tidak ditemukan atau telah dihapus.' }, { status: 404 });
    }

    if (ujian.status === 'NONAKTIF' || ujian.status === 'DRAFT') {
      return NextResponse.json({
        success: false,
        message: 'Jadwal ujian ini sedang dinonaktifkan atau belum diterbitkan oleh pengawas.',
      }, { status: 403 });
    }

    // 2. Verifikasi Kesiapan Butir Soal di Topik / Mata Pelajaran
    if (!ujian.mataPelajaran?.soalList || ujian.mataPelajaran.soalList.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Soal belum siap diujikan. Hubungi Pengawas / Guru Pengampu.',
      }, { status: 400 });
    }

    // 2b. Verifikasi Batasan Kelas Ujian
    const targetClasses = await prisma.ujianKelas.findMany({
      where: { ujianId },
      include: { kelas: true },
    });

    if (targetClasses.length > 0) {
      const studentUser = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { kelas: true },
      });

      const isEligibleClass =
        (studentUser?.kelasId && targetClasses.some((tc) => tc.kelasId === studentUser.kelasId)) ||
        (studentUser?.kelas?.nama && targetClasses.some((tc) => tc.kelas.nama === studentUser.kelas?.nama));

      if (!isEligibleClass) {
        return NextResponse.json({
          success: false,
          message: 'Ujian ini tidak diperuntukkan bagi kelas Anda.',
        }, { status: 403 });
      }
    }

    // 3. Verifikasi Status Pendaftaran Peserta Siswa & Waktu Server Terkalibrasi
    let peserta = await prisma.pesertaUjian.findUnique({
      where: {
        ujianId_siswaId: {
          ujianId,
          siswaId: user.userId,
        },
      },
    });

    const now = await getCalibratedServerNow();
    const totalMaxDetik = Math.max(60, (Number(ujian.durasiMenit) || 90) * 60);

    // Validasi jadwal waktuMulai
    if (ujian.waktuMulai) {
      const scheduledStart = new Date(ujian.waktuMulai);
      if (now < scheduledStart) {
        const formattedStart = scheduledStart.toLocaleString('id-ID', {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: 'Asia/Jakarta',
        });
        return NextResponse.json({
          success: false,
          message: `Ujian belum dibuka. Jadwal mulai: ${formattedStart} WIB.`,
        }, { status: 400 });
      }
    }

    if (peserta?.status === 'SELESAI') {
      return NextResponse.json({
        success: false,
        message: 'Anda sudah menyelesaikan ujian ini.',
      }, { status: 400 });
    }

    if (peserta?.status === 'TERKUNCI') {
      return NextResponse.json({
        success: false,
        message: 'Akun ujian Anda terkunci karena melebihi batas pelanggaran atau dikunci pengawas. Silakan hubungi proktor ruang.',
      }, { status: 403 });
    }

    // Helper pembentuk urutan soal per siswa (Fisher-Yates Shuffle)
    const generateStudentSoalOrder = () => {
      const soalIds = (ujian.mataPelajaran.soalList as any[]).map((s: any) => s.id);
      const totalTersedia = soalIds.length;
      let targetCount = totalTersedia;
      let minLimit = (ujian as any).minSoal && (ujian as any).minSoal > 0 ? Number((ujian as any).minSoal) : null;
      let maxLimit = (ujian as any).maxSoal && (ujian as any).maxSoal > 0 ? Number((ujian as any).maxSoal) : null;

      if (minLimit && maxLimit && minLimit > maxLimit) {
        const temp = minLimit;
        minLimit = maxLimit;
        maxLimit = temp;
      }

      if (maxLimit) {
        if (minLimit && minLimit < maxLimit) {
          targetCount = Math.floor(Math.random() * (maxLimit - minLimit + 1)) + minLimit;
        } else {
          targetCount = maxLimit;
        }
        targetCount = Math.min(targetCount, totalTersedia);
      } else if (minLimit) {
        targetCount = Math.min(minLimit, totalTersedia);
      }

      if (ujian.acakSoal || maxLimit || minLimit) {
        for (let i = soalIds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [soalIds[i], soalIds[j]] = [soalIds[j], soalIds[i]];
        }
      }

      return JSON.stringify(soalIds.slice(0, targetCount));
    };

    const ipAddr =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const uaHeader = request.headers.get('user-agent') || null;

    let currentSisaDetik = totalMaxDetik;

    if (!peserta) {
      // Peserta baru pertama kali klik mulai ujian (on-demand)
      currentSisaDetik = computeAccurateExamRemainingSeconds({
        now,
        durasiMenit: ujian.durasiMenit,
        jadwalSelesai: ujian.waktuSelesai,
        pesertaWaktuMulai: null,
        pesertaStatus: 'BELUM_MULAI',
      });

      if (currentSisaDetik <= 0) {
        return NextResponse.json({
          success: false,
          message: 'Waktu pelaksanaan ujian ini telah berakhir.',
        }, { status: 400 });
      }

      const initialOrder = generateStudentSoalOrder();
      peserta = await prisma.pesertaUjian.create({
        data: {
          ujianId,
          siswaId: user.userId,
          status: 'SEDANG_MENGERJAKAN',
          waktuMulai: now,
          sisaDetik: currentSisaDetik,
          urutanSoalIds: initialOrder,
          ipAddress: ipAddr,
          userAgent: uaHeader,
        },
      });

      await prisma.logAktivitasUjian.create({
        data: {
          userId: user.userId,
          pesertaUjianId: peserta.id,
          aktivitas: 'MULAI_UJIAN',
          detail: `Siswa ${user.name} (${user.username}) memulai pengerjaan ujian. Alokasi waktu: ${Math.ceil(currentSisaDetik / 60)} menit.`,
        },
      });
    } else if (peserta.status === 'BELUM_MULAI') {
      // Peserta sudah didaftarkan saat pembuatan tes, baru mulai sekarang
      currentSisaDetik = computeAccurateExamRemainingSeconds({
        now,
        durasiMenit: ujian.durasiMenit,
        jadwalSelesai: ujian.waktuSelesai,
        pesertaWaktuMulai: null,
        pesertaStatus: 'BELUM_MULAI',
      });

      if (currentSisaDetik <= 0) {
        return NextResponse.json({
          success: false,
          message: 'Waktu pelaksanaan ujian ini telah berakhir.',
        }, { status: 400 });
      }

      const initialOrder = peserta.urutanSoalIds || generateStudentSoalOrder();
      peserta = await prisma.pesertaUjian.update({
        where: { id: peserta.id },
        data: {
          status: 'SEDANG_MENGERJAKAN',
          waktuMulai: now,
          sisaDetik: currentSisaDetik,
          urutanSoalIds: initialOrder,
          ipAddress: ipAddr || peserta.ipAddress,
          userAgent: uaHeader || peserta.userAgent,
        },
      });

      await prisma.logAktivitasUjian.create({
        data: {
          userId: user.userId,
          pesertaUjianId: peserta.id,
          aktivitas: 'MULAI_UJIAN',
          detail: `Siswa ${user.name} (${user.username}) memulai pengerjaan ujian. Alokasi waktu: ${Math.ceil(currentSisaDetik / 60)} menit.`,
        },
      });
    } else if (peserta.status === 'RESET_LOGIN') {
      // PENTING: Ketika Proktor melakukan RESET_LOGIN (karena pindah HP/browser macet),
      // JANGAN me-reset waktuMulai ke 'now' dan JANGAN mengacak ulang urutanSoalIds jika siswa sudah pernah mulai!
      // Pertahankan waktuMulai asli, sisa waktu akurat (termasuk extra time proktor), serta urutan soal & jawaban siswa!
      const effectiveStart = peserta.waktuMulai || now;
      const wasAlreadyStarted = Boolean(peserta.waktuMulai);

      currentSisaDetik = computeAccurateExamRemainingSeconds({
        now,
        durasiMenit: ujian.durasiMenit,
        jadwalSelesai: ujian.waktuSelesai,
        pesertaWaktuMulai: wasAlreadyStarted ? peserta.waktuMulai : null,
        pesertaSisaDetikTersimpan: peserta.sisaDetik,
        pesertaUpdatedAt: peserta.updatedAt,
        pesertaStatus: wasAlreadyStarted ? 'SEDANG_MENGERJAKAN' : 'BELUM_MULAI',
      });

      if (currentSisaDetik <= 0) {
        return NextResponse.json({
          success: false,
          message: 'Waktu pengerjaan ujian Anda telah habis.',
        }, { status: 400 });
      }

      const preservedOrder = peserta.urutanSoalIds || generateStudentSoalOrder();
      peserta = await prisma.pesertaUjian.update({
        where: { id: peserta.id },
        data: {
          status: 'SEDANG_MENGERJAKAN',
          waktuMulai: effectiveStart,
          sisaDetik: currentSisaDetik,
          urutanSoalIds: preservedOrder,
          ipAddress: ipAddr || peserta.ipAddress,
          userAgent: uaHeader || peserta.userAgent,
        },
      });

      await prisma.logAktivitasUjian.create({
        data: {
          userId: user.userId,
          pesertaUjianId: peserta.id,
          aktivitas: 'RESUME_UJIAN',
          detail: `Siswa ${user.name} melanjutkan ujian setelah Reset Login. Sisa waktu: ${Math.ceil(currentSisaDetik / 60)} menit.`,
        },
      });
    } else {
      // Status SEDANG_MENGERJAKAN (melanjutkan / refresh halaman)
      currentSisaDetik = computeAccurateExamRemainingSeconds({
        now,
        durasiMenit: ujian.durasiMenit,
        jadwalSelesai: ujian.waktuSelesai,
        pesertaWaktuMulai: peserta.waktuMulai,
        pesertaSisaDetikTersimpan: peserta.sisaDetik,
        pesertaUpdatedAt: peserta.updatedAt,
        pesertaStatus: 'SEDANG_MENGERJAKAN',
      });

      // Pastikan urutanSoalIds selalu ada bahkan untuk peserta on-demand lama
      const ensuredOrder = peserta.urutanSoalIds || generateStudentSoalOrder();
      if (!peserta.urutanSoalIds || ipAddr !== peserta.ipAddress) {
        peserta = await prisma.pesertaUjian.update({
          where: { id: peserta.id },
          data: {
            urutanSoalIds: ensuredOrder,
            ipAddress: ipAddr || peserta.ipAddress,
            userAgent: uaHeader || peserta.userAgent,
          },
        });
      }
    }

    let rawSoalList = ujian.mataPelajaran.soalList;
    if (peserta.urutanSoalIds) {
      try {
        const orderIds = JSON.parse(peserta.urutanSoalIds);
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          const mapSoal = new Map((rawSoalList as any[]).map((s: any) => [s.id, s]));
          const ordered: typeof rawSoalList = [];
          orderIds.forEach((sid) => {
            const item = mapSoal.get(sid);
            if (item) ordered.push(item);
          });
          if (ordered.length > 0) rawSoalList = ordered;
        }
      } catch {
        // use default order
      }
    }

    // Hitung jumlah pelanggaran saat ini agar indikator pelanggaran pada client sinkron saat halaman di-refresh
    const totalPelanggaran = await prisma.logAktivitasUjian.count({
      where: {
        pesertaUjianId: peserta.id,
        aktivitas: {
          in: [
            'TAB_SWITCH_ALERT',
            'APP_SWITCH_ALERT',
            'WINDOW_BLUR',
            'FULLSCREEN_EXIT',
            'SCREEN_SHARE_STOPPED',
            'KEYBOARD_SHORTCUT_VIOLATION',
            'SECURITY_ALERT',
          ],
        },
      },
    });

    if (totalPelanggaran >= 5) {
      await prisma.pesertaUjian.update({
        where: { id: peserta.id },
        data: { status: 'TERKUNCI' },
      });
      return NextResponse.json(
        {
          success: false,
          isLocked: true,
          message:
            'Akun ujian Anda terkunci karena mencapai batas maksimal 5 kali pelanggaran. Nilai dari jawaban yang telah masuk sudah tersimpan.',
        },
        { status: 403 }
      );
    }

    const jawabanTersimpan = await prisma.jawabanPeserta.findMany({
      where: { pesertaUjianId: peserta.id },
      select: {
        soalId: true,
        jawabanDipilih: true,
        raguRagu: true,
      },
    });

    const formattedSoalList = (rawSoalList as any[]).map((s: any, idx: number) => {
      const baseOpsi = (s.opsiJawaban || []).map((o: any) => ({
        id: o.id,
        label: o.label,
        konten: o.konten,
        gambar: o.gambar || undefined,
      }));

      // Acak urutan opsi pilihan secara konsisten per peserta untuk PG & PG_KOMPLEKS bila fitur acakOpsi diaktifkan
      const shouldShuffleOpsi =
        ujian.acakOpsi && (s.tipeSoal === 'PG' || s.tipeSoal === 'PG_KOMPLEKS');
      const finalOpsi = shouldShuffleOpsi
        ? seededShuffleOptions(baseOpsi, `${peserta!.id}_${s.id}`)
        : baseOpsi;

      return {
        id: s.id,
        nomorUrutTampil: idx + 1,
        tipeSoal: s.tipeSoal,
        pertanyaan: s.pertanyaan,
        mediaAudio: s.mediaAudio || undefined,
        mediaGambar: s.mediaGambar || undefined,
        bobot: s.bobot,
        matchingData: s.matchingData || undefined,
        opsiJawaban: finalOpsi,
      };
    });

    const guruPengampuNama =
      ujian.mataPelajaran.gurus?.[0]?.guru?.name ||
      (ujian.mataPelajaran.pembuat?.role === 'GURU' ? ujian.mataPelajaran.pembuat?.name : 'Guru Pengampu');

    // Hitung timestamp absolut berakhirnya waktu peserta (berbasis server) untuk timer anti-drift di smartphone
    const serverNowMs = now.getTime();
    const targetEndTimestampMs = serverNowMs + currentSisaDetik * 1000;

    return NextResponse.json({
      success: true,
      message: 'Ujian berhasil dimuat.',
      data: {
        pesertaUjianId: peserta.id,
        totalPelanggaran,
        serverTimestampMs: serverNowMs,
        targetEndTimestampMs,
        ujian: {
          id: ujian.id,
          judul: ujian.judul,
          kodeUjian: ujian.kodeUjian,
          durasiMenit: ujian.durasiMenit,
          waktuMulai: ujian.waktuMulai,
          waktuSelesai: ujian.waktuSelesai,
          minJawaban: (ujian as any).minJawaban ?? null,
          sisaWaktuDetik: currentSisaDetik,
          lockBrowser: ujian.lockBrowser !== false,
          mapel: ujian.mataPelajaran.nama,
          guruPengampu: guruPengampuNama,
        },
        soalList: formattedSoalList,
        jawabanTersimpan,
      },
    });
  } catch (error: any) {
    console.error('Mulai ujian error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
