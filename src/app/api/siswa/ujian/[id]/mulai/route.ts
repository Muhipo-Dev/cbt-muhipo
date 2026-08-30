import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST: Memulai Ujian (Tanpa Token - Berbasis Verifikasi Sinkronisasi NIS, Kelas, dan Kesiapan Soal)
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

    // 1. Ambil data Ujian dan Bank Soal
    const ujian = await prisma.ujian.findUnique({
      where: { id: ujianId },
      include: {
        bankSoal: {
          include: {
            soalList: {
              include: { opsiJawaban: true },
            },
            mataPelajaran: {
              include: {
                gurus: {
                  include: {
                    guru: { select: { id: true, name: true } },
                  },
                },
              },
            },
            pembuat: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!ujian) {
      return NextResponse.json({ success: false, message: 'Jadwal ujian tidak ditemukan.' }, { status: 404 });
    }

    // 2. Verifikasi Kesiapan Butir Soal di Bank Soal
    if (!ujian.bankSoal?.soalList || ujian.bankSoal.soalList.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Soal belum siap diujikan. Hubungi Pengawas / Guru Pengampu.',
      }, { status: 400 });
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

    // Hitung Sisa Waktu Riil berdasarkan Jadwal Mulai & Durasi Ujian
    const now = new Date();
    const totalMaxDetik = ujian.durasiMenit * 60;
    let computedSisaDetik = totalMaxDetik;

    // Jika jadwal ujian memiliki waktuMulai, hitung waktu kedaluwarsa jadwal
    if (ujian.waktuMulai) {
      const scheduledStart = new Date(ujian.waktuMulai);
      const scheduledEndFromDuration = new Date(scheduledStart.getTime() + totalMaxDetik * 1000);
      
      // Jika ada waktuSelesai yang lebih ketat, gunakan yang terkecil
      let absoluteEnd = scheduledEndFromDuration;
      if (ujian.waktuSelesai) {
        const strictEnd = new Date(ujian.waktuSelesai);
        if (strictEnd < absoluteEnd) {
          absoluteEnd = strictEnd;
        }
      }

      const diffMs = absoluteEnd.getTime() - now.getTime();
      const sisaDariJadwal = Math.floor(diffMs / 1000);

      // Jika siswa mulai setelah jadwal mulai, sisa waktu otomatis terpangkas
      if (sisaDariJadwal <= 0) {
        return NextResponse.json({
          success: false,
          message: 'Waktu pelaksanaan ujian ini telah berakhir.',
        }, { status: 400 });
      }

      computedSisaDetik = Math.min(totalMaxDetik, sisaDariJadwal);
    }

    if (!peserta) {
      // Daftarkan siswa secara otomatis jika kelas siswa sinkron dengan jadwal ujian
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

    // Jika siswa sudah pernah mulai sebelumnya (resume/refresh), pastikan sisa waktu juga dipangkas sesuai waktu yang berjalan
    let currentSisaDetik = computedSisaDetik;
    if (peserta.waktuMulai && peserta.status === 'SEDANG_MENGERJAKAN') {
      const elapsedSinceStudentStart = Math.floor((now.getTime() - new Date(peserta.waktuMulai).getTime()) / 1000);
      const studentRemaining = totalMaxDetik - elapsedSinceStudentStart;
      currentSisaDetik = Math.max(0, Math.min(computedSisaDetik, studentRemaining));
    }

    // Update status jika baru mulai atau update sisa detik terkini
    if (peserta.status === 'BELUM_MULAI' || peserta.status === 'RESET_LOGIN') {
      // Acak urutan soal jika opsi acak aktif
      let soalIds = ujian.bankSoal.soalList.map((s) => s.id);
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

      // Catat log mulai ujian
      await prisma.logAktivitasUjian.create({
        data: {
          userId: user.userId,
          pesertaUjianId: peserta.id,
          aktivitas: 'MULAI_UJIAN',
          detail: `Siswa ${user.name} (${user.username}) memulai pengerjaan ujian. Sisa waktu: ${Math.floor(currentSisaDetik / 60)} menit.`,
        },
      });
    } else {
      // Perbarui sisa detik aktual di database
      await prisma.pesertaUjian.update({
        where: { id: peserta.id },
        data: {
          sisaDetik: currentSisaDetik,
        },
      });
    }

    // Persiapkan data soal terformat
    let rawSoalList = ujian.bankSoal.soalList;
    if (peserta.urutanSoalIds) {
      try {
        const orderIds = JSON.parse(peserta.urutanSoalIds);
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          const mapSoal = new Map(rawSoalList.map((s) => [s.id, s]));
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

    // Ambil jawaban yang pernah disimpan peserta
    const jawabanTersimpan = await prisma.jawabanPeserta.findMany({
      where: { pesertaUjianId: peserta.id },
      select: {
        soalId: true,
        jawabanDipilih: true,
        raguRagu: true,
      },
    });

    const formattedSoalList = rawSoalList.map((s, idx) => ({
      id: s.id,
      nomorUrutTampil: idx + 1,
      tipeSoal: s.tipeSoal,
      pertanyaan: s.pertanyaan,
      mediaAudio: s.mediaAudio || undefined,
      mediaGambar: s.mediaGambar || undefined,
      bobot: s.bobot,
      opsiJawaban: (s.opsiJawaban || []).map((o) => ({
        id: o.id,
        label: o.label,
        konten: o.konten,
        gambar: o.gambar || undefined,
      })),
    }));

    const guruPengampuNama =
      ujian.bankSoal.mataPelajaran?.gurus?.[0]?.guru?.name ||
      (ujian.bankSoal.pembuat?.role === 'GURU' ? ujian.bankSoal.pembuat?.name : 'Guru Pengampu');

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
          mapel: ujian.bankSoal.mataPelajaran.nama,
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
