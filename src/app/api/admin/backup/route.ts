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
    const format = searchParams.get('format') || 'attachment';
    const topikId = searchParams.get('topikId') || searchParams.get('id');
    const idsParam = searchParams.get('ids');
    const modulParam = searchParams.get('modul');
    const ujianIdParam = searchParams.get('ujianId');
    const dateStr = new Date().toISOString().slice(0, 10);

    // 1. BACKUP MASTER SOAL & TOPIK MODUL (JSON)
    if (type === 'soal_topik') {
      const whereClause: any = {
        status: { not: 'TERHAPUS' },
      };

      if (topikId) {
        whereClause.id = topikId;
      } else if (idsParam) {
        const ids = idsParam.split(',').filter(Boolean);
        if (ids.length > 0) {
          whereClause.id = { in: ids };
        }
      } else if (modulParam && modulParam !== 'SEMUA') {
        whereClause.namaModul = modulParam;
      }

      const mapelList = await prisma.mataPelajaran.findMany({
        where: whereClause,
        include: {
          soalList: {
            orderBy: { nomorUrut: 'asc' },
            include: {
              opsiJawaban: {
                orderBy: { label: 'asc' },
              },
            },
          },
        },
        orderBy: { nama: 'asc' },
      });

      const totalSoalCount = mapelList.reduce((acc, m) => acc + (m.soalList?.length || 0), 0);

      const backupPayload = {
        meta: {
          type: 'SOAL_TOPIK_BACKUP',
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
            totalTopik: mapelList.length,
            totalSoal: totalSoalCount,
          },
        },
        data: {
          mataPelajaran: mapelList,
        },
      };

      if (format === 'json_raw') {
        return NextResponse.json({
          success: true,
          ...backupPayload,
        });
      }

      const safeName = topikId && mapelList[0]?.nama
        ? mapelList[0].nama.replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'ALL';

      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', `attachment; filename="CBT_MUHIPO_SOAL_${safeName}_${dateStr}.json"`);

      return new NextResponse(JSON.stringify(backupPayload, null, 2), {
        status: 200,
        headers,
      });
    }

    // 2. BACKUP JADWAL TES & KONFIGURASI (JSON / RAW)
    if (type === 'jadwal_tes') {
      const ujianList = await prisma.ujian.findMany({
        include: {
          mataPelajaran: true,
          ujianKelas: {
            include: { kelas: true },
          },
          _count: {
            select: { pesertaUjian: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const exportRows = ujianList.map((u, idx) => ({
        No: idx + 1,
        'Kode Ujian': u.kodeUjian,
        'Judul Ujian': u.judul,
        'Topik / Mapel': u.mataPelajaran?.nama || '-',
        'Durasi (Menit)': u.durasiMenit,
        Token: u.token || '-',
        'Waktu Mulai': u.waktuMulai ? new Date(u.waktuMulai).toLocaleString('id-ID') : '-',
        'Waktu Selesai': u.waktuSelesai ? new Date(u.waktuSelesai).toLocaleString('id-ID') : '-',
        'Alokasi Kelas': u.ujianKelas.map((uk) => uk.kelas?.nama).filter(Boolean).join(', ') || 'Semua Kelas',
        'Acak Soal': u.acakSoal ? 'Ya' : 'Tidak',
        'Acak Opsi': u.acakOpsi ? 'Ya' : 'Tidak',
        'Lock Browser': u.lockBrowser ? 'Aktif' : 'Nonaktif',
        'Tampilkan Nilai': u.tampilkanHasil ? 'Ya' : 'Tidak',
        Status: u.status,
        'Jumlah Peserta': u._count?.pesertaUjian || 0,
      }));

      const backupPayload = {
        meta: {
          type: 'JADWAL_TES_BACKUP',
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
            totalUjian: ujianList.length,
          },
        },
        data: {
          ujian: ujianList,
        },
        exportRows,
      };

      if (format === 'json_raw') {
        return NextResponse.json({
          success: true,
          ...backupPayload,
        });
      }

      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', `attachment; filename="CBT_MUHIPO_JADWAL_TES_${dateStr}.json"`);

      return new NextResponse(JSON.stringify(backupPayload, null, 2), {
        status: 200,
        headers,
      });
    }

    // 3. BACKUP HASIL TES & LEMBAR JAWABAN (JSON / RAW)
    if (type === 'hasil_tes') {
      const whereClause: any = {};
      if (ujianIdParam) {
        whereClause.id = ujianIdParam;
      }

      const ujianResults = await prisma.ujian.findMany({
        where: whereClause,
        include: {
          mataPelajaran: true,
          pesertaUjian: {
            include: {
              siswa: { include: { kelas: true } },
              jawabanPeserta: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const totalPesertaCount = ujianResults.reduce((acc, u) => acc + u.pesertaUjian.length, 0);

      const backupPayload = {
        meta: {
          type: 'HASIL_TES_BACKUP',
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
            totalUjian: ujianResults.length,
            totalPeserta: totalPesertaCount,
          },
        },
        data: {
          ujian: ujianResults,
        },
      };

      if (format === 'json_raw') {
        return NextResponse.json({
          success: true,
          ...backupPayload,
        });
      }

      const safeKode = ujianIdParam && ujianResults[0]?.kodeUjian
        ? ujianResults[0].kodeUjian.replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'ALL';

      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', `attachment; filename="CBT_MUHIPO_HASIL_TES_${safeKode}_${dateStr}.json"`);

      return new NextResponse(JSON.stringify(backupPayload, null, 2), {
        status: 200,
        headers,
      });
    }

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
        modul = [],
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

      // ID remapping tables for safe merge across different database snapshots
      const modulIdMap = new Map<string, string>();
      const kelasIdMap = new Map<string, string>();
      const userIdMap = new Map<string, string>();
      const mapelIdMap = new Map<string, string>();
      const soalIdMap = new Map<string, string>();
      const ujianIdMap = new Map<string, string>();
      const pesertaUjianIdMap = new Map<string, string>();

      // 1.1 Restore Pengaturan
      for (const p of pengaturanSistem) {
        await (prisma as any).pengaturanSistem.upsert({
          where: { id: p.id || 'default-settings' },
          update: { ...p },
          create: { ...p },
        });
      }

      // 1.1b Restore / Merge Modul
      for (const mod of modul) {
        const existingMod = await prisma.modul.findFirst({
          where: { OR: [{ id: mod.id }, { nama: mod.nama }] },
        });
        if (existingMod) {
          const updatedMod = await prisma.modul.update({
            where: { id: existingMod.id },
            data: { nama: mod.nama, deskripsi: mod.deskripsi ?? existingMod.deskripsi },
          });
          if (mod.id) modulIdMap.set(mod.id, updatedMod.id);
        } else {
          const createdMod = await prisma.modul.create({
            data: { id: mod.id, nama: mod.nama, deskripsi: mod.deskripsi ?? null },
          });
          if (mod.id) modulIdMap.set(mod.id, createdMod.id);
        }
      }

      // 1.2 Restore / Merge Kelas
      for (const k of kelas) {
        const existingKelas = await prisma.kelas.findFirst({
          where: { OR: [{ id: k.id }, { nama: k.nama }] },
        });
        if (existingKelas) {
          const updatedKelas = await prisma.kelas.update({
            where: { id: existingKelas.id },
            data: { nama: k.nama, tingkat: k.tingkat, jurusan: k.jurusan },
          });
          if (k.id) kelasIdMap.set(k.id, updatedKelas.id);
        } else {
          const createdKelas = await prisma.kelas.create({
            data: { id: k.id, nama: k.nama, tingkat: k.tingkat, jurusan: k.jurusan },
          });
          if (k.id) kelasIdMap.set(k.id, createdKelas.id);
        }
      }

      // 1.3 Restore / Merge Users
      for (const u of users) {
        const resolvedKelasId = u.kelasId ? (kelasIdMap.get(u.kelasId) ?? u.kelasId) : null;
        const orConditions: any[] = [{ id: u.id }, { username: u.username }];
        if (u.nip) orConditions.push({ nip: u.nip });
        if (u.nomorPeserta) orConditions.push({ nomorPeserta: u.nomorPeserta });

        const existingUser = await prisma.user.findFirst({
          where: { OR: orConditions },
        });

        const userData = {
          username: u.username,
          password: u.password,
          plainPassword: u.plainPassword || null,
          name: u.name,
          role: u.role,
          nip: u.nip ?? null,
          nomorPeserta: u.nomorPeserta ?? null,
          ruangUjian: u.ruangUjian ?? null,
          sesiUjian: u.sesiUjian ?? 1,
          jenisKelamin: u.jenisKelamin ?? null,
          group: u.group ?? null,
          kelasId: resolvedKelasId,
        };

        if (existingUser) {
          const updatedUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: userData,
          });
          if (u.id) userIdMap.set(u.id, updatedUser.id);
        } else {
          const createdUser = await prisma.user.create({
            data: { id: u.id, ...userData },
          });
          if (u.id) userIdMap.set(u.id, createdUser.id);
        }
      }

      // 1.4 Restore / Merge Mata Pelajaran (Topik) & Nested Soal jika ada
      for (const m of mataPelajaran) {
        const resolvedModulId = m.modulId ? (modulIdMap.get(m.modulId) ?? m.modulId) : null;
        const resolvedPembuatId = m.pembuatId ? (userIdMap.get(m.pembuatId) ?? m.pembuatId) : null;
        const existingMapel = await prisma.mataPelajaran.findFirst({
          where: { OR: [{ id: m.id }, { kode: m.kode }] },
        });

        const mapelData = {
          kode: m.kode,
          nama: m.nama,
          modulId: resolvedModulId,
          namaModul: m.namaModul || 'Default',
          tingkat: m.tingkat,
          jurusan: m.jurusan,
          durasiMenit: m.durasiMenit,
          kkm: m.kkm,
          nilaiMinimal: m.nilaiMinimal,
          nilaiMaksimal: m.nilaiMaksimal,
          pembuatId: resolvedPembuatId,
          status: m.status || 'AKTIF',
        };

        let targetMapelId = m.id;
        if (existingMapel) {
          const updatedMapel = await prisma.mataPelajaran.update({
            where: { id: existingMapel.id },
            data: mapelData,
          });
          targetMapelId = updatedMapel.id;
        } else {
          const createdMapel = await prisma.mataPelajaran.create({
            data: { id: m.id, ...mapelData },
          });
          targetMapelId = createdMapel.id;
        }
        if (m.id) mapelIdMap.set(m.id, targetMapelId);

        // Jika soal tersarang di dalam mataPelajaran
        const nestedSoal = Array.isArray(m.soalList) ? m.soalList : (Array.isArray(m.soal) ? m.soal : null);
        if (nestedSoal) {
          for (const s of nestedSoal) {
            const upsertedSoal = await prisma.soal.upsert({
              where: { id: s.id },
              update: {
                mataPelajaranId: targetMapelId,
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
                mataPelajaranId: targetMapelId,
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
            if (s.id) soalIdMap.set(s.id, upsertedSoal.id);

            if (Array.isArray(s.opsiJawaban)) {
              for (const o of s.opsiJawaban) {
                await prisma.opsiJawaban.upsert({
                  where: { id: o.id },
                  update: {
                    soalId: upsertedSoal.id,
                    label: o.label,
                    konten: o.konten,
                    gambar: o.gambar,
                    isBenar: o.isBenar,
                  },
                  create: {
                    id: o.id,
                    soalId: upsertedSoal.id,
                    label: o.label,
                    konten: o.konten,
                    gambar: o.gambar,
                    isBenar: o.isBenar,
                  },
                });
              }
            }
          }
        }
      }

      // 1.5 Restore Soal (Flat list)
      for (const s of soal) {
        const resolvedMapelId = mapelIdMap.get(s.mataPelajaranId) ?? s.mataPelajaranId;
        const upsertedSoal = await prisma.soal.upsert({
          where: { id: s.id },
          update: {
            mataPelajaranId: resolvedMapelId,
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
            mataPelajaranId: resolvedMapelId,
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
        if (s.id) soalIdMap.set(s.id, upsertedSoal.id);
      }

      // 1.6 Restore Opsi Jawaban (Flat list)
      for (const o of opsiJawaban) {
        const resolvedSoalId = soalIdMap.get(o.soalId) ?? o.soalId;
        await prisma.opsiJawaban.upsert({
          where: { id: o.id },
          update: {
            soalId: resolvedSoalId,
            label: o.label,
            konten: o.konten,
            gambar: o.gambar,
            isBenar: o.isBenar,
          },
          create: {
            id: o.id,
            soalId: resolvedSoalId,
            label: o.label,
            konten: o.konten,
            gambar: o.gambar,
            isBenar: o.isBenar,
          },
        });
      }

      // 1.7 Restore / Merge Ujian & Distribusi Kelas
      for (const u of ujian) {
        const startDt = u.waktuMulai ? new Date(u.waktuMulai) : new Date();
        const endDt = u.waktuSelesai ? new Date(u.waktuSelesai) : new Date(Date.now() + 86400000);
        const resolvedMapelId = mapelIdMap.get(u.mataPelajaranId) ?? u.mataPelajaranId;

        const existingUjian = await prisma.ujian.findFirst({
          where: { OR: [{ id: u.id }, { kodeUjian: u.kodeUjian }] },
        });

        const ujianData = {
          judul: u.judul,
          kodeUjian: u.kodeUjian,
          token: u.token,
          durasiMenit: u.durasiMenit || 90,
          minSoal: u.minSoal ?? null,
          maxSoal: u.maxSoal ?? null,
          minJawaban: u.minJawaban ?? null,
          waktuMulai: startDt,
          waktuSelesai: endDt,
          status: u.status,
          lockBrowser: Boolean(u.lockBrowser),
          acakSoal: Boolean(u.acakSoal),
          acakOpsi: Boolean(u.acakOpsi),
          tampilkanHasil: Boolean(u.tampilkanHasil),
          mataPelajaranId: resolvedMapelId,
        };

        if (existingUjian) {
          const updatedUjian = await prisma.ujian.update({
            where: { id: existingUjian.id },
            data: ujianData,
          });
          if (u.id) ujianIdMap.set(u.id, updatedUjian.id);
        } else {
          const createdUjian = await prisma.ujian.create({
            data: { id: u.id, ...ujianData },
          });
          if (u.id) ujianIdMap.set(u.id, createdUjian.id);
        }
      }

      for (const uk of ujianKelas) {
        const resolvedUjianId = ujianIdMap.get(uk.ujianId) ?? uk.ujianId;
        const resolvedKelasId = kelasIdMap.get(uk.kelasId) ?? uk.kelasId;
        const existingUk = await prisma.ujianKelas.findFirst({
          where: {
            OR: [
              { id: uk.id },
              { ujianId: resolvedUjianId, kelasId: resolvedKelasId },
            ],
          },
        });
        if (!existingUk) {
          await prisma.ujianKelas.create({
            data: { id: uk.id, ujianId: resolvedUjianId, kelasId: resolvedKelasId },
          });
        }
      }

      // 1.8 Restore / Merge Peserta Ujian & Jawaban
      for (const p of pesertaUjian) {
        const resolvedUjianId = ujianIdMap.get(p.ujianId) ?? p.ujianId;
        const resolvedSiswaId = userIdMap.get(p.siswaId) ?? p.siswaId;
        const existingPu = await prisma.pesertaUjian.findFirst({
          where: {
            OR: [
              { id: p.id },
              { ujianId: resolvedUjianId, siswaId: resolvedSiswaId },
            ],
          },
        });

        const puData = {
          ujianId: resolvedUjianId,
          siswaId: resolvedSiswaId,
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
        };

        if (existingPu) {
          const updatedPu = await prisma.pesertaUjian.update({
            where: { id: existingPu.id },
            data: puData,
          });
          if (p.id) pesertaUjianIdMap.set(p.id, updatedPu.id);
        } else {
          const createdPu = await prisma.pesertaUjian.create({
            data: { id: p.id, ...puData },
          });
          if (p.id) pesertaUjianIdMap.set(p.id, createdPu.id);
        }
      }

      for (const j of jawabanPeserta) {
        const resolvedPuId = pesertaUjianIdMap.get(j.pesertaUjianId) ?? j.pesertaUjianId;
        const resolvedSoalId = soalIdMap.get(j.soalId) ?? j.soalId;
        const existingJwb = await prisma.jawabanPeserta.findFirst({
          where: {
            OR: [
              { id: j.id },
              { pesertaUjianId: resolvedPuId, soalId: resolvedSoalId },
            ],
          },
        });

        const jwbData = {
          pesertaUjianId: resolvedPuId,
          soalId: resolvedSoalId,
          jawabanDipilih: j.jawabanDipilih,
          raguRagu: Boolean(j.raguRagu),
          isBenar: j.isBenar,
          skor: j.skor || 0,
          catatanKoreksi: j.catatanKoreksi,
        };

        if (existingJwb) {
          await prisma.jawabanPeserta.update({
            where: { id: existingJwb.id },
            data: jwbData,
          });
        } else {
          await prisma.jawabanPeserta.create({
            data: { id: j.id, ...jwbData },
          });
        }
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
