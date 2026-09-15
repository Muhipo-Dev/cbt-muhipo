import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Download Full Database Snapshot JSON or Rekap Nilai
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'full';

    if (type === 'rekap_nilai_all') {
      // Rekap nilai seluruh ujian
      const allUjian = await prisma.ujian.findMany({
        include: {
          mataPelajaran: true,
          pesertaUjian: {
            include: {
              siswa: { include: { kelas: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const exportRows: any[] = [];
      for (const u of allUjian) {
        for (const p of u.pesertaUjian) {
          exportRows.push({
            'Kode Ujian': u.kodeUjian,
            'Judul Ujian': u.judul,
            'Topik / Mapel': u.mataPelajaran?.nama || '-',
            'Username Siswa': p.siswa?.username || '-',
            'Nomor Peserta': p.siswa?.nomorPeserta || '-',
            'Nama Siswa': p.siswa?.name || '-',
            'Kelas / Rombel': p.siswa?.kelas?.nama || '-',
            'Nilai PG': Number(Number(p.nilaiPG || 0).toFixed(2)),
            'Nilai Esai/Isian': Number(Number(p.nilaiEsai || 0).toFixed(2)),
            'Total Nilai CBT': Number(Number(p.nilaiTotal || 0).toFixed(2)),
            'KKM Mapel': u.mataPelajaran?.kkm || 75,
            'Status Kelulusan': Number(p.nilaiTotal || 0) >= (u.mataPelajaran?.kkm || 75) ? 'TUNTAS' : 'REMIDIAL',
            'Status Pengerjaan': p.status,
            'Waktu Mulai': p.waktuMulai ? new Date(p.waktuMulai).toLocaleString('id-ID') : '-',
            'Waktu Selesai': p.waktuSelesai ? new Date(p.waktuSelesai).toLocaleString('id-ID') : '-',
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: exportRows,
        total: exportRows.length,
      });
    }

    // FULL DATABASE BACKUP JSON
    const [
      pengaturanList,
      kelasList,
      usersList,
      mapelList,
      soalList,
      opsiJawabanList,
      ujianList,
      ujianKelasList,
      pesertaUjianList,
      jawabanPesertaList,
      logList,
    ] = await Promise.all([
      (prisma as any).pengaturanSistem.findMany(),
      prisma.kelas.findMany(),
      prisma.user.findMany(),
      prisma.mataPelajaran.findMany(),
      prisma.soal.findMany(),
      prisma.opsiJawaban.findMany(),
      prisma.ujian.findMany(),
      prisma.ujianKelas.findMany(),
      prisma.pesertaUjian.findMany(),
      prisma.jawabanPeserta.findMany(),
      prisma.logAktivitasUjian.findMany(),
    ]);

    const backupPayload = {
      meta: {
        appName: 'CBT MUHIPO Standalone Server',
        exportedAt: new Date().toISOString(),
        version: '2.0.0',
        exportedBy: {
          id: user.userId,
          name: user.name,
          username: user.username,
          role: user.role,
        },
        counts: {
          pengaturan: pengaturanList.length,
          kelas: kelasList.length,
          users: usersList.length,
          mataPelajaran: mapelList.length,
          soal: soalList.length,
          opsiJawaban: opsiJawabanList.length,
          ujian: ujianList.length,
          pesertaUjian: pesertaUjianList.length,
        },
      },
      data: {
        pengaturanSistem: pengaturanList,
        kelas: kelasList,
        users: usersList,
        mataPelajaran: mapelList,
        soal: soalList,
        opsiJawaban: opsiJawabanList,
        ujian: ujianList,
        ujianKelas: ujianKelasList,
        pesertaUjian: pesertaUjianList,
        jawabanPeserta: jawabanPesertaList,
        logAktivitasUjian: logList,
      },
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="CBT_MUHIPO_BACKUP_${dateStr}.json"`);

    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Backup GET error:', error);
    return NextResponse.json({ success: false, message: 'Gagal membuat backup: ' + error.message }, { status: 500 });
  }
}

// POST: Restore / Reset Data / Bulk Maintenance
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // 1. RESTORE FULL DATABASE FROM JSON BACKUP
    if (action === 'RESTORE_DATABASE_JSON') {
      const { backupData } = body;
      if (!backupData || !backupData.data) {
        return NextResponse.json({ success: false, message: 'Format data backup tidak valid' }, { status: 400 });
      }

      const {
        pengaturanSistem = [],
        kelas = [],
        users = [],
        mataPelajaran = [],
        soal = [],
        opsiJawaban = [],
        ujian = [],
        ujianKelas = [],
        pesertaUjian = [],
        jawabanPeserta = [],
      } = backupData.data;

      // 1.1 Restore Pengaturan
      for (const p of pengaturanSistem) {
        await (prisma as any).pengaturanSistem.upsert({
          where: { id: p.id || 'default-settings' },
          update: { ...p },
          create: { ...p },
        });
      }

      // 1.2 Restore Kelas
      for (const k of kelas) {
        await prisma.kelas.upsert({
          where: { id: k.id },
          update: { nama: k.nama, tingkat: k.tingkat, jurusan: k.jurusan },
          create: { id: k.id, nama: k.nama, tingkat: k.tingkat, jurusan: k.jurusan },
        });
      }

      // 1.3 Restore Users
      for (const u of users) {
        await prisma.user.upsert({
          where: { id: u.id },
          update: {
            username: u.username,
            password: u.password,
            plainPassword: u.plainPassword || null,
            name: u.name,
            role: u.role,
            nip: u.nip,
            nomorPeserta: u.nomorPeserta,
            ruangUjian: u.ruangUjian,
            sesiUjian: u.sesiUjian,
            jenisKelamin: u.jenisKelamin,
            kelasId: u.kelasId,
          },
          create: {
            id: u.id,
            username: u.username,
            password: u.password,
            plainPassword: u.plainPassword || null,
            name: u.name,
            role: u.role,
            nip: u.nip,
            nomorPeserta: u.nomorPeserta,
            ruangUjian: u.ruangUjian,
            sesiUjian: u.sesiUjian,
            jenisKelamin: u.jenisKelamin,
            kelasId: u.kelasId,
          },
        });
      }

      // 1.4 Restore Mata Pelajaran (Topik)
      for (const m of mataPelajaran) {
        await prisma.mataPelajaran.upsert({
          where: { id: m.id },
          update: {
            kode: m.kode,
            nama: m.nama,
            tingkat: m.tingkat,
            jurusan: m.jurusan,
            durasiMenit: m.durasiMenit,
            kkm: m.kkm,
            nilaiMinimal: m.nilaiMinimal,
            nilaiMaksimal: m.nilaiMaksimal,
            pembuatId: m.pembuatId,
          },
          create: {
            id: m.id,
            kode: m.kode,
            nama: m.nama,
            tingkat: m.tingkat,
            jurusan: m.jurusan,
            durasiMenit: m.durasiMenit,
            kkm: m.kkm,
            nilaiMinimal: m.nilaiMinimal,
            nilaiMaksimal: m.nilaiMaksimal,
            pembuatId: m.pembuatId,
          },
        });
      }

      // 1.5 Restore Soal
      for (const s of soal) {
        await prisma.soal.upsert({
          where: { id: s.id },
          update: {
            mataPelajaranId: s.mataPelajaranId,
            nomorUrut: s.nomorUrut,
            tipeSoal: s.tipeSoal,
            pertanyaan: s.pertanyaan,
            bobot: s.bobot,
            mediaAudio: s.mediaAudio,
            mediaGambar: s.mediaGambar,
            kunciJawabanTeks: s.kunciJawabanTeks,
            matchingData: s.matchingData,
          },
          create: {
            id: s.id,
            mataPelajaranId: s.mataPelajaranId,
            nomorUrut: s.nomorUrut,
            tipeSoal: s.tipeSoal,
            pertanyaan: s.pertanyaan,
            bobot: s.bobot,
            mediaAudio: s.mediaAudio,
            mediaGambar: s.mediaGambar,
            kunciJawabanTeks: s.kunciJawabanTeks,
            matchingData: s.matchingData,
          },
        });
      }

      // 1.6 Restore Opsi Jawaban
      for (const o of opsiJawaban) {
        await prisma.opsiJawaban.upsert({
          where: { id: o.id },
          update: {
            soalId: o.soalId,
            label: o.label,
            konten: o.konten,
            gambar: o.gambar,
            isBenar: o.isBenar,
          },
          create: {
            id: o.id,
            soalId: o.soalId,
            label: o.label,
            konten: o.konten,
            gambar: o.gambar,
            isBenar: o.isBenar,
          },
        });
      }

      // 1.7 Restore Ujian & Distribusi Kelas
      for (const u of ujian) {
        const startDt = u.waktuMulai ? new Date(u.waktuMulai) : new Date();
        const endDt = u.waktuSelesai ? new Date(u.waktuSelesai) : new Date(Date.now() + 86400000);
        await prisma.ujian.upsert({
          where: { id: u.id },
          update: {
            judul: u.judul,
            kodeUjian: u.kodeUjian,
            token: u.token,
            durasiMenit: u.durasiMenit || 90,
            waktuMulai: startDt,
            waktuSelesai: endDt,
            status: u.status,
            lockBrowser: Boolean(u.lockBrowser),
            acakSoal: Boolean(u.acakSoal),
            acakOpsi: Boolean(u.acakOpsi),
            tampilkanHasil: Boolean(u.tampilkanHasil),
            mataPelajaranId: u.mataPelajaranId,
          },
          create: {
            id: u.id,
            judul: u.judul,
            kodeUjian: u.kodeUjian,
            token: u.token,
            durasiMenit: u.durasiMenit || 90,
            waktuMulai: startDt,
            waktuSelesai: endDt,
            status: u.status,
            lockBrowser: Boolean(u.lockBrowser),
            acakSoal: Boolean(u.acakSoal),
            acakOpsi: Boolean(u.acakOpsi),
            tampilkanHasil: Boolean(u.tampilkanHasil),
            mataPelajaranId: u.mataPelajaranId,
          },
        });
      }

      for (const uk of ujianKelas) {
        await prisma.ujianKelas.upsert({
          where: { id: uk.id },
          update: { ujianId: uk.ujianId, kelasId: uk.kelasId },
          create: { id: uk.id, ujianId: uk.ujianId, kelasId: uk.kelasId },
        });
      }

      // 1.8 Restore Peserta Ujian & Jawaban
      for (const p of pesertaUjian) {
        await prisma.pesertaUjian.upsert({
          where: { id: p.id },
          update: {
            ujianId: p.ujianId,
            siswaId: p.siswaId,
            status: p.status,
            nilaiPG: p.nilaiPG || 0,
            nilaiEsai: p.nilaiEsai || 0,
            nilaiTotal: p.nilaiTotal || 0,
            isKoreksiSelesai: Boolean(p.isKoreksiSelesai),
            waktuMulai: p.waktuMulai ? new Date(p.waktuMulai) : null,
            waktuSelesai: p.waktuSelesai ? new Date(p.waktuSelesai) : null,
            sisaDetik: p.sisaDetik,
            ipAddress: p.ipAddress,
            userAgent: p.userAgent,
            urutanSoalIds: p.urutanSoalIds,
          },
          create: {
            id: p.id,
            ujianId: p.ujianId,
            siswaId: p.siswaId,
            status: p.status,
            nilaiPG: p.nilaiPG || 0,
            nilaiEsai: p.nilaiEsai || 0,
            nilaiTotal: p.nilaiTotal || 0,
            isKoreksiSelesai: Boolean(p.isKoreksiSelesai),
            waktuMulai: p.waktuMulai ? new Date(p.waktuMulai) : null,
            waktuSelesai: p.waktuSelesai ? new Date(p.waktuSelesai) : null,
            sisaDetik: p.sisaDetik,
            ipAddress: p.ipAddress,
            userAgent: p.userAgent,
            urutanSoalIds: p.urutanSoalIds,
          },
        });
      }

      for (const j of jawabanPeserta) {
        await prisma.jawabanPeserta.upsert({
          where: { id: j.id },
          update: {
            pesertaUjianId: j.pesertaUjianId,
            soalId: j.soalId,
            jawabanDipilih: j.jawabanDipilih,
            raguRagu: Boolean(j.raguRagu),
            isBenar: j.isBenar,
            skor: j.skor || 0,
            catatanKoreksi: j.catatanKoreksi,
          },
          create: {
            id: j.id,
            pesertaUjianId: j.pesertaUjianId,
            soalId: j.soalId,
            jawabanDipilih: j.jawabanDipilih,
            raguRagu: Boolean(j.raguRagu),
            isBenar: j.isBenar,
            skor: j.skor || 0,
            catatanKoreksi: j.catatanKoreksi,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Pemulihan data dari file backup JSON berhasil diselesaikan!',
      });
    }

    // 2. RESET DATA HASIL UJIAN (Pembersihan Lembar Pengerjaan & Nilai)
    if (action === 'RESET_HASIL_UJIAN') {
      await prisma.jawabanPeserta.deleteMany({});
      await prisma.logAktivitasUjian.deleteMany({});
      await prisma.pesertaUjian.deleteMany({});

      return NextResponse.json({
        success: true,
        message: 'Seluruh hasil pengerjaan, jawaban siswa, dan log aktivitas ujian berhasil dibersihkan.',
      });
    }

    // 3. RESET DATA SISWA (Hapus seluruh siswa dan data kelas)
    if (action === 'RESET_DATA_SISWA') {
      await prisma.jawabanPeserta.deleteMany({});
      await prisma.logAktivitasUjian.deleteMany({});
      await prisma.pesertaUjian.deleteMany({});
      await prisma.user.deleteMany({ where: { role: 'SISWA' } });
      await prisma.ujianKelas.deleteMany({});
      await prisma.guruKelas.deleteMany({});
      await prisma.kelas.deleteMany({});

      return NextResponse.json({
        success: true,
        message: 'Seluruh data peserta siswa dan kelas/group berhasil dihapus.',
      });
    }

    // 4. RESET BANK SOAL & TOPIK
    if (action === 'RESET_DATA_SOAL') {
      await prisma.jawabanPeserta.deleteMany({});
      await prisma.opsiJawaban.deleteMany({});
      await prisma.soal.deleteMany({});
      await prisma.ujianKelas.deleteMany({});
      await prisma.pesertaUjian.deleteMany({});
      await prisma.ujian.deleteMany({});
      await prisma.guruMataPelajaran.deleteMany({});
      await prisma.mataPelajaran.deleteMany({});

      return NextResponse.json({
        success: true,
        message: 'Seluruh topik, butir soal, dan jadwal ujian berhasil dibersihkan.',
      });
    }

    // 5. FACTORY RESET (Pembersihan Total Sistem CBT)
    if (action === 'FACTORY_RESET') {
      const { confirmText } = body;
      if (confirmText !== 'RESET CBT MUHIPO') {
        return NextResponse.json({
          success: false,
          message: 'Teks konfirmasi salah. Masukkan "RESET CBT MUHIPO" untuk melanjutkan.',
        }, { status: 400 });
      }

      // Hapus seluruh data relasional
      await prisma.jawabanPeserta.deleteMany({});
      await prisma.logAktivitasUjian.deleteMany({});
      await prisma.pesertaUjian.deleteMany({});
      await prisma.ujianKelas.deleteMany({});
      await prisma.ujian.deleteMany({});
      await prisma.opsiJawaban.deleteMany({});
      await prisma.soal.deleteMany({});
      await prisma.guruMataPelajaran.deleteMany({});
      await prisma.guruKelas.deleteMany({});
      await prisma.mataPelajaran.deleteMany({});
      await prisma.user.deleteMany({ where: { id: { not: user.userId }, role: { not: 'SUPERADMIN' } } });
      await prisma.kelas.deleteMany({});

      return NextResponse.json({
        success: true,
        message: 'Sistem CBT berhasil di-reset ke kondisi pabrik. Akun Superadmin aktif dipertahankan.',
      });
    }

    return NextResponse.json({ success: false, message: 'Aksi maintenance tidak dikenali' }, { status: 400 });
  } catch (error: any) {
    console.error('Backup POST error:', error);
    return NextResponse.json({ success: false, message: 'Gagal memproses pemeliharaan: ' + error.message }, { status: 500 });
  }
}
