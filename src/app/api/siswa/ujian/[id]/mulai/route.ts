import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
              include: { opsiJawaban: true },
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
        select: { kelasId: true },
      });

      const isEligibleClass = studentUser?.kelasId && targetClasses.some((tc) => tc.kelasId === studentUser.kelasId);
      if (!isEligibleClass) {
        return NextResponse.json({
          success: false,
          message: 'Ujian ini tidak diperuntukkan bagi kelas Anda.',
        }, { status: 403 });
      }
    }

    // 3. Verifikasi Status Pendaftaran Peserta Siswa
    let peserta = await prisma.pesertaUjian.findUnique({
      where: {
        ujianId_siswaId: {
          ujianId,
          siswaId: user.userId,
        },
      },
    });

    const now = new Date();
    const totalMaxDetik = ujian.durasiMenit * 60;
    let computedSisaDetik = totalMaxDetik;

    if (ujian.waktuMulai) {
      const scheduledStart = new Date(ujian.waktuMulai);

      if (now < scheduledStart) {
        const formattedStart = scheduledStart.toLocaleString('id-ID', {
          dateStyle: 'full',
          timeStyle: 'short',
        });
        return NextResponse.json({
          success: false,
          message: `Ujian belum dibuka. Jadwal mulai: ${formattedStart} WIB.`,
        }, { status: 400 });
      }

      const scheduledEndFromDuration = new Date(scheduledStart.getTime() + totalMaxDetik * 1000);
      let absoluteEnd = scheduledEndFromDuration;
      if (ujian.waktuSelesai) {
        const strictEnd = new Date(ujian.waktuSelesai);
        if (strictEnd < absoluteEnd) {
          absoluteEnd = strictEnd;
        }
      }

      const diffMs = absoluteEnd.getTime() - now.getTime();
      const sisaDariJadwal = Math.floor(diffMs / 1000);

      if (sisaDariJadwal <= 0) {
        return NextResponse.json({
          success: false,
          message: 'Waktu pelaksanaan ujian ini telah berakhir.',
        }, { status: 400 });
      }

      computedSisaDetik = Math.min(totalMaxDetik, sisaDariJadwal);
    }

    if (!peserta) {
      peserta = await prisma.pesertaUjian.create({
        data: {
          ujianId,
          siswaId: user.userId,
          status: 'SEDANG_MENGERJAKAN',
          waktuMulai: now,
          sisaDetik: computedSisaDetik,
        },
      });
    }

    if (peserta.status === 'SELESAI') {
      return NextResponse.json({
        success: false,
        message: 'Anda sudah menyelesaikan ujian ini.',
      }, { status: 400 });
    }

    if (peserta.status === 'TERKUNCI') {
      return NextResponse.json({
        success: false,
        message: 'Akun ujian Anda terkunci oleh pengawas. Silakan hubungi proktor ruang.',
      }, { status: 403 });
    }

    let currentSisaDetik = computedSisaDetik;
    if (peserta.waktuMulai && peserta.status === 'SEDANG_MENGERJAKAN') {
      const elapsedSinceStudentStart = Math.floor((now.getTime() - new Date(peserta.waktuMulai).getTime()) / 1000);
      const studentRemaining = totalMaxDetik - elapsedSinceStudentStart;
      currentSisaDetik = Math.max(0, Math.min(computedSisaDetik, studentRemaining));
    }

    if (peserta.status === 'BELUM_MULAI' || peserta.status === 'RESET_LOGIN') {
      let soalIds = (ujian.mataPelajaran.soalList as any[]).map((s: any) => s.id);
      if (ujian.acakSoal) {
        soalIds = soalIds.sort(() => Math.random() - 0.5);
      }

      peserta = await prisma.pesertaUjian.update({
        where: { id: peserta.id },
        data: {
          status: 'SEDANG_MENGERJAKAN',
          waktuMulai: now,
          sisaDetik: currentSisaDetik,
          urutanSoalIds: JSON.stringify(soalIds),
        },
      });

      await prisma.logAktivitasUjian.create({
        data: {
          userId: user.userId,
          pesertaUjianId: peserta.id,
          aktivitas: 'MULAI_UJIAN',
          detail: `Siswa ${user.name} (${user.username}) memulai pengerjaan ujian. Sisa waktu: ${Math.floor(currentSisaDetik / 60)} menit.`,
        },
      });
    } else {
      await prisma.pesertaUjian.update({
        where: { id: peserta.id },
        data: {
          sisaDetik: currentSisaDetik,
        },
      });
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
      } catch (e) {
        // use default order
      }
    }

    const jawabanTersimpan = await prisma.jawabanPeserta.findMany({
      where: { pesertaUjianId: peserta.id },
      select: {
        soalId: true,
        jawabanDipilih: true,
        raguRagu: true,
      },
    });

    const formattedSoalList = (rawSoalList as any[]).map((s: any, idx: number) => ({
      id: s.id,
      nomorUrutTampil: idx + 1,
      tipeSoal: s.tipeSoal,
      pertanyaan: s.pertanyaan,
      mediaAudio: s.mediaAudio || undefined,
      mediaGambar: s.mediaGambar || undefined,
      bobot: s.bobot,
      matchingData: s.matchingData || undefined,
      opsiJawaban: (s.opsiJawaban || []).map((o: any) => ({
        id: o.id,
        label: o.label,
        konten: o.konten,
        gambar: o.gambar || undefined,
      })),
    }));

    const guruPengampuNama =
      ujian.mataPelajaran.gurus?.[0]?.guru?.name ||
      (ujian.mataPelajaran.pembuat?.role === 'GURU' ? ujian.mataPelajaran.pembuat?.name : 'Guru Pengampu');

    return NextResponse.json({
      success: true,
      message: 'Ujian berhasil dimuat.',
      data: {
        pesertaUjianId: peserta.id,
        ujian: {
          id: ujian.id,
          judul: ujian.judul,
          kodeUjian: ujian.kodeUjian,
          durasiMenit: ujian.durasiMenit,
          sisaWaktuDetik: currentSisaDetik,
          lockBrowser: ujian.lockBrowser,
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
