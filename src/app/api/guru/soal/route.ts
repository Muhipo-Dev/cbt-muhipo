import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TipeSoal } from '@/lib/enums';
import { convertEquationToKatex } from '@/lib/katexConverter';

// Helper untuk kalkulasi otomatis poin butir soal secara seimbang dan proporsional dalam sebuah Topik / Mata Pelajaran
async function recalculateTopikPoints(mataPelajaranId: string) {
  try {
    const mapel = await prisma.mataPelajaran.findUnique({
      where: { id: mataPelajaranId },
      include: {
        soalList: {
          select: { id: true, nomorUrut: true, tipeSoal: true },
          orderBy: { nomorUrut: 'asc' },
        },
      },
    });

    if (!mapel || !mapel.soalList || mapel.soalList.length === 0) return;

    const soalList = mapel.soalList;
    const maxScore = Number(mapel?.nilaiMaksimal) || 100.0;

    const getRatio = (tipe: string): number => {
      switch (tipe) {
        case 'ESAI':
          return 4.0;
        case 'ISIAN':
          return 2.0;
        case 'PG_KOMPLEKS':
          return 1.5;
        case 'MENJODOHKAN':
          return 1.0;
        case 'PG':
        case 'BENAR_SALAH':
        default:
          return 1.0;
      }
    };

    let totalWeightUnits = 0;
    for (const s of soalList) {
      totalWeightUnits += getRatio(s.tipeSoal);
    }

    if (totalWeightUnits === 0) totalWeightUnits = soalList.length;

    const unitValue = maxScore / totalWeightUnits;
    let accumulatedScore = 0;
    const updates: { id: string; bobot: number }[] = [];

    for (let i = 0; i < soalList.length; i++) {
      const s = soalList[i];
      const isLast = i === soalList.length - 1;

      if (!isLast) {
        const rawPoint = getRatio(s.tipeSoal) * unitValue;
        const roundedPoint = Math.max(0.1, Number(rawPoint.toFixed(2)));
        accumulatedScore += roundedPoint;
        updates.push({ id: s.id, bobot: roundedPoint });
      } else {
        const remainingPoint = Number((maxScore - accumulatedScore).toFixed(2));
        const finalPoint = remainingPoint > 0 ? remainingPoint : Number((getRatio(s.tipeSoal) * unitValue).toFixed(2));
        updates.push({ id: s.id, bobot: finalPoint });
      }
    }

    await Promise.all(
      updates.map((item) =>
        prisma.soal.update({
          where: { id: item.id },
          data: { bobot: item.bobot },
        })
      )
    );
  } catch (err) {
    console.error('Recalculate topik points error:', err);
  }
}

// GET: Ambil Data Topik / Mata Pelajaran & Soal-soal di dalamnya
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mataPelajaranId = searchParams.get('mataPelajaranId') || searchParams.get('topikId') || searchParams.get('bankSoalId');

    if (mataPelajaranId) {
      const mapel = await prisma.mataPelajaran.findFirst({
        where: { id: mataPelajaranId },
        include: {
          gurus: {
            include: {
              guru: { select: { id: true, name: true, username: true } },
            },
          },
          pembuat: { select: { id: true, name: true, username: true } },
          soalList: {
            include: {
              opsiJawaban: true,
            },
            orderBy: { nomorUrut: 'asc' },
          },
        },
      });

      if (!mapel) {
        return NextResponse.json({
          success: false,
          message: 'Topik / Mata Pelajaran tidak ditemukan atau Anda tidak memiliki hak akses.',
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          ...mapel,
          bankSoalList: [mapel],
        },
      });
    }

    const mapelWhereClause =
      user.role === 'GURU'
        ? {
            OR: [
              { pembuatId: user.userId },
              { gurus: { some: { guruId: user.userId } } },
            ],
          }
        : {};

    const list = await prisma.mataPelajaran.findMany({
      where: {
        ...mapelWhereClause,
        status: { not: 'TERHAPUS' },
      },
      include: {
        gurus: {
          include: {
            guru: { select: { id: true, name: true, username: true } },
          },
        },
        pembuat: { select: { id: true, name: true, username: true, role: true } },
        _count: {
          select: { soalList: true, gurus: true },
        },
      },
      orderBy: { nama: 'asc' },
    });

    let kelasList: any[] = [];
    if (user.role === 'GURU') {
      const guruKelasAssigned = await prisma.guruKelas.findMany({
        where: { guruId: user.userId },
        include: { kelas: true },
      });

      if (guruKelasAssigned.length > 0) {
        kelasList = guruKelasAssigned
          .map((gk: { kelas: any }) => gk.kelas)
          .sort((a: { nama: string }, b: { nama: string }) => a.nama.localeCompare(b.nama));
      } else {
        kelasList = await prisma.kelas.findMany({ orderBy: { nama: 'asc' } });
      }
    } else {
      kelasList = await prisma.kelas.findMany({ orderBy: { nama: 'asc' } });
    }

    return NextResponse.json({
      success: true,
      data: {
        mapelList: list,
        topikList: list,
        bankSoalList: list, // Alias kompatibilitas
        kelasList,
      },
    });
  } catch (error: any) {
    console.error('Guru topik & soal get error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Buat Topik / Simpan Butir Soal / Import Soal
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // 1. Buat Topik / Mata Pelajaran Baru
    if (action === 'CREATE_MAPEL' || action === 'CREATE_TOPIK' || action === 'CREATE_BANK_SOAL') {
      const { kode, kodeBank, nama, tingkat, jurusan, durasiMenit, kkm, nilaiMinimal, nilaiMaksimal, guruPengampuId, status } = body;
      const cleanKode = (kode || kodeBank || '').trim().toUpperCase();
      if (!cleanKode || !nama?.trim()) {
        return NextResponse.json({ success: false, message: 'Kode dan Nama Topik / Mata Pelajaran wajib diisi' }, { status: 400 });
      }

      const existing = await prisma.mataPelajaran.findUnique({ where: { kode: cleanKode } });
      if (existing) {
        return NextResponse.json({ success: false, message: `Kode '${cleanKode}' sudah digunakan` }, { status: 400 });
      }

      const finalPembuatId = guruPengampuId || user.userId;

      const mapel = await prisma.mataPelajaran.create({
        data: {
          kode: cleanKode,
          nama: nama.trim(),
          tingkat: tingkat !== undefined ? Number(tingkat) : 10,
          jurusan: jurusan || 'UMUM',
          durasiMenit: Number(durasiMenit) || 90,
          status: status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
          kkm: kkm !== undefined ? Number(kkm) : 75.0,
          nilaiMinimal: nilaiMinimal !== undefined ? Number(nilaiMinimal) : 0.0,
          nilaiMaksimal: nilaiMaksimal !== undefined ? Number(nilaiMaksimal) : 100.0,
          pembuatId: finalPembuatId,
          ...(user.role === 'GURU'
            ? {
                gurus: {
                  create: { guruId: user.userId },
                },
              }
            : {}),
        },
      });

      return NextResponse.json({ success: true, data: mapel, message: 'Topik / Mata Pelajaran berhasil dibuat' });
    }

    // 1b. Update Topik / Mata Pelajaran
    if (action === 'UPDATE_MAPEL' || action === 'UPDATE_TOPIK' || action === 'UPDATE_BANK_SOAL') {
      const { id, mataPelajaranId, bankSoalId, kode, kodeBank, nama, tingkat, jurusan, durasiMenit, kkm, nilaiMinimal, nilaiMaksimal, status } = body;
      const targetId = id || mataPelajaranId || bankSoalId;

      const existing = await prisma.mataPelajaran.findUnique({
        where: { id: targetId },
        include: { gurus: true },
      });
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Topik / Mata Pelajaran tidak ditemukan' }, { status: 404 });
      }

      const isTeacherOfMapel = existing.gurus?.some((g) => g.guruId === user.userId);
      if (user.role === 'GURU' && existing.pembuatId !== user.userId && !isTeacherOfMapel) {
        return NextResponse.json({ success: false, message: 'Akses ditolak. Anda bukan guru pengampu topik ini.' }, { status: 403 });
      }

      const cleanKode = (kode || kodeBank) ? (kode || kodeBank).trim().toUpperCase() : undefined;

      const mapel = await prisma.mataPelajaran.update({
        where: { id: targetId },
        data: {
          kode: cleanKode,
          nama: nama ? nama.trim() : undefined,
          tingkat: tingkat !== undefined ? Number(tingkat) : undefined,
          jurusan: jurusan || undefined,
          durasiMenit: durasiMenit ? Number(durasiMenit) : undefined,
          status: status ? (status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF') : undefined,
          kkm: kkm !== undefined ? Number(kkm) : undefined,
          nilaiMinimal: nilaiMinimal !== undefined ? Number(nilaiMinimal) : undefined,
          nilaiMaksimal: nilaiMaksimal !== undefined ? Number(nilaiMaksimal) : undefined,
        },
      });

      await recalculateTopikPoints(targetId);

      return NextResponse.json({ success: true, data: mapel, message: 'Topik / Mata Pelajaran berhasil diperbarui' });
    }

    // 1b.2 Arsipkan Topik
    if (action === 'ARCHIVE_MAPEL' || action === 'ARCHIVE_TOPIK' || action === 'ARCHIVE_BANK_SOAL') {
      const { id, mataPelajaranId, bankSoalId, status = 'NONAKTIF' } = body;
      const targetId = id || mataPelajaranId || bankSoalId;

      const existing = await prisma.mataPelajaran.findUnique({
        where: { id: targetId },
        include: { gurus: true },
      });
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Topik tidak ditemukan' }, { status: 404 });
      }

      const isTeacherOfMapel = existing.gurus?.some((g) => g.guruId === user.userId);
      if (user.role === 'GURU' && existing.pembuatId !== user.userId && !isTeacherOfMapel) {
        return NextResponse.json({ success: false, message: 'Akses ditolak.' }, { status: 403 });
      }

      const updated = await prisma.mataPelajaran.update({
        where: { id: targetId },
        data: { status: status as any },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Topik "${updated.nama}" berhasil diarsipkan. Seluruh butir soal tetap aman.`,
      });
    }

    // 1b.3 Pulihkan / Aktifkan Kembali Topik
    if (action === 'UNARCHIVE_MAPEL' || action === 'UNARCHIVE_TOPIK' || action === 'UNARCHIVE_BANK_SOAL') {
      const { id, mataPelajaranId, bankSoalId } = body;
      const targetId = id || mataPelajaranId || bankSoalId;

      const existing = await prisma.mataPelajaran.findUnique({
        where: { id: targetId },
        include: { gurus: true },
      });
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Topik tidak ditemukan' }, { status: 404 });
      }

      const isTeacherOfMapel = existing.gurus?.some((g) => g.guruId === user.userId);
      if (user.role === 'GURU' && existing.pembuatId !== user.userId && !isTeacherOfMapel) {
        return NextResponse.json({ success: false, message: 'Akses ditolak.' }, { status: 403 });
      }

      const updated = await prisma.mataPelajaran.update({
        where: { id: targetId },
        data: { status: 'AKTIF' },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Topik "${updated.nama}" berhasil diaktifkan kembali.`,
      });
    }

    // 1c. Hapus Topik / Mata Pelajaran (Khusus Admin / Proktor)
    if (action === 'DELETE_MAPEL' || action === 'DELETE_TOPIK' || action === 'DELETE_BANK_SOAL') {
      const { id, mataPelajaranId, bankSoalId } = body;
      const targetId = id || mataPelajaranId || bankSoalId;

      if (user.role === 'GURU') {
        return NextResponse.json(
          {
            success: false,
            message: 'Penghapusan Topik / Bank Soal dibatasi hanya untuk Administrator & Proktor. Silakan gunakan fitur Arsipkan jika bank soal sudah tidak digunakan.',
          },
          { status: 403 }
        );
      }

      const existing = await prisma.mataPelajaran.findUnique({
        where: { id: targetId },
      });
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Topik / Mata Pelajaran tidak ditemukan' }, { status: 404 });
      }

      // Soft delete ke Recycle Bin
      await prisma.mataPelajaran.update({
        where: { id: targetId },
        data: { status: 'TERHAPUS' },
      });

      return NextResponse.json({
        success: true,
        message: 'Topik berhasil dipindahkan ke Recycle Bin.',
      });
    }

    // 1d. Import Soal Massal Langsung ke Topik / Mata Pelajaran
    if (action === 'IMPORT_SOAL') {
      const { mataPelajaranId, topikId, bankSoalId, soalItems, durasiMenit } = body;
      const targetMapelId = mataPelajaranId || topikId || bankSoalId;

      if (!targetMapelId || !Array.isArray(soalItems) || soalItems.length === 0) {
        return NextResponse.json({ success: false, message: 'Pilih Topik tujuan dan data soal import yang valid' }, { status: 400 });
      }

      if (durasiMenit && Number(durasiMenit) > 0) {
        await prisma.mataPelajaran.update({
          where: { id: targetMapelId },
          data: { durasiMenit: Number(durasiMenit) },
        });
      }

      let startOrder = (await prisma.soal.count({ where: { mataPelajaranId: targetMapelId } })) + 1;
      let importedCount = 0;

      for (const item of soalItems) {
        const tipe = (item.tipeSoal || 'PG').toUpperCase();
        const pertanyaan = convertEquationToKatex(String(item.pertanyaan || '').trim());
        if (!pertanyaan) continue;

        const bobot = Number(item.bobot) || 1.0;
        const kunciTeks = item.kunciJawabanTeks ? convertEquationToKatex(String(item.kunciJawabanTeks)) : null;

        const opsiList: { label: string; konten: string; isBenar: boolean }[] = [];
        if (tipe === 'PG' || tipe === 'PG_KOMPLEKS' || tipe === 'BENAR_SALAH') {
          const rawOpsi = item.opsi || [];
          if (Array.isArray(rawOpsi)) {
            for (const o of rawOpsi) {
              if (o.konten && String(o.konten).trim()) {
                opsiList.push({
                  label: String(o.label || '').toUpperCase(),
                  konten: convertEquationToKatex(String(o.konten).trim()),
                  isBenar: Boolean(o.isBenar),
                });
              }
            }
          }
        }

        let rawMatching: string | null = null;
        if (item.matchingData) {
          try {
            const parsed = typeof item.matchingData === 'string' ? JSON.parse(item.matchingData) : item.matchingData;
            if (Array.isArray(parsed)) {
              const convertedPairs = parsed.map((p: any) => ({
                left: convertEquationToKatex(String(p.left || '')),
                right: convertEquationToKatex(String(p.right || '')),
              }));
              rawMatching = JSON.stringify(convertedPairs);
            } else {
              rawMatching = typeof item.matchingData === 'string' ? item.matchingData : JSON.stringify(item.matchingData);
            }
          } catch {
            rawMatching = typeof item.matchingData === 'string' ? item.matchingData : JSON.stringify(item.matchingData);
          }
        }

        await prisma.soal.create({
          data: {
            mataPelajaranId: targetMapelId,
            nomorUrut: startOrder++,
            tipeSoal: tipe as TipeSoal,
            pertanyaan,
            bobot,
            kunciJawabanTeks: kunciTeks,
            matchingData: rawMatching,
            opsiJawaban: {
              create: opsiList,
            },
          },
        });
        importedCount++;
      }

      await recalculateTopikPoints(targetMapelId);

      return NextResponse.json({
        success: true,
        message: `Berhasil mengimport ${importedCount} butir soal ke dalam Topik / Mata Pelajaran!`,
        importedCount,
      });
    }

    // 1e. Kirim / Jadwalkan Ujian Langsung dari Topik / Mata Pelajaran
    if (action === 'KIRIM_KE_KELAS') {
      const {
        mataPelajaranId,
        topikId,
        bankSoalId,
        kelasIds,
        judul,
        kodeUjian,
        durasiMenit,
        waktuMulai,
        waktuSelesai,
        lockBrowser,
        acakSoal,
        acakOpsi,
        tampilkanHasil,
      } = body;

      const targetMapelId = mataPelajaranId || topikId || bankSoalId;

      if (!targetMapelId || !kelasIds || !Array.isArray(kelasIds) || kelasIds.length === 0) {
        return NextResponse.json({ success: false, message: 'Pilih Topik dan minimal 1 group / kelas target tujuan' }, { status: 400 });
      }

      const mapel = await prisma.mataPelajaran.findUnique({ where: { id: targetMapelId } });
      if (!mapel) {
        return NextResponse.json({ success: false, message: 'Topik / Mata Pelajaran tidak ditemukan' }, { status: 404 });
      }

      const generatedKode = kodeUjian || `UJIAN-${mapel.kode}-${Date.now().toString().slice(-4)}`;
      const examTitle = judul || `Ujian: ${mapel.nama}`;
      const duration = Number(durasiMenit) || mapel.durasiMenit || 90;

      const newUjian = await prisma.ujian.create({
        data: {
          kodeUjian: generatedKode,
          judul: examTitle,
          mataPelajaranId: targetMapelId,
          durasiMenit: duration,
          waktuMulai: waktuMulai ? new Date(waktuMulai) : new Date(),
          waktuSelesai: waktuSelesai ? new Date(waktuSelesai) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lockBrowser: lockBrowser !== false,
          acakSoal: acakSoal !== false,
          acakOpsi: acakOpsi !== false,
          tampilkanHasil: tampilkanHasil === true,
          status: 'DIJADWALKAN',
          ujianKelas: {
            create: kelasIds.map((kId: string) => ({ kelasId: kId })),
          },
        },
      });

      const uniqueKelasIds = Array.from(new Set(kelasIds.filter(Boolean)));
      const targetSiswa = await prisma.user.findMany({
        where: {
          role: 'SISWA',
          kelasId: { in: uniqueKelasIds },
        },
      });

      if (targetSiswa.length > 0) {
        const uniqueSiswaMap = new Map();
        targetSiswa.forEach((s) => uniqueSiswaMap.set(s.id, s));
        const uniqueSiswa = Array.from(uniqueSiswaMap.values());

        await prisma.pesertaUjian.createMany({
          data: uniqueSiswa.map((s) => ({
            ujianId: newUjian.id,
            siswaId: s.id,
            status: 'BELUM_MULAI',
            sisaDetik: duration * 60,
          })),
          skipDuplicates: true,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Ujian berhasil dibuat dan didistribusikan ke ${targetSiswa.length} peserta pada ${kelasIds.length} rombel kelas!`,
        data: { ujian: newUjian, totalPeserta: targetSiswa.length },
      });
    }

    // 2. Tambah / Simpan Butir Soal
    if (action === 'SAVE_SOAL') {
      const { mataPelajaranId, topikId, bankSoalId, soalId, nomorUrut, tipeSoal, pertanyaan, bobot, opsiJawaban, kunciJawabanTeks, matchingData, mediaGambar, mediaAudio } = body;
      const targetMapelId = mataPelajaranId || topikId || bankSoalId;

      const cleanPertanyaan = convertEquationToKatex(String(pertanyaan || '').trim());
      const cleanKunciTeks = kunciJawabanTeks ? convertEquationToKatex(String(kunciJawabanTeks)) : null;

      let rawMatchingString: string | null = null;
      if (matchingData) {
        try {
          const parsed = typeof matchingData === 'string' ? JSON.parse(matchingData) : matchingData;
          if (Array.isArray(parsed)) {
            const convertedPairs = parsed.map((p: any) => ({
              left: convertEquationToKatex(String(p.left || '')),
              right: convertEquationToKatex(String(p.right || '')),
            }));
            rawMatchingString = JSON.stringify(convertedPairs);
          } else {
            rawMatchingString = typeof matchingData === 'string' ? matchingData : JSON.stringify(matchingData);
          }
        } catch {
          rawMatchingString = typeof matchingData === 'string' ? matchingData : JSON.stringify(matchingData);
        }
      }

      if (soalId) {
        await prisma.soal.update({
          where: { id: soalId },
          data: {
            nomorUrut: Number(nomorUrut) || 1,
            tipeSoal: tipeSoal as TipeSoal,
            pertanyaan: cleanPertanyaan,
            bobot: bobot !== undefined && Number(bobot) > 0 ? Number(bobot) : 1.0,
            mediaGambar: mediaGambar || null,
            mediaAudio: mediaAudio || null,
            kunciJawabanTeks: cleanKunciTeks,
            matchingData: rawMatchingString,
          },
        });

        await prisma.opsiJawaban.deleteMany({ where: { soalId } });
        if (['PG', 'PG_KOMPLEKS', 'BENAR_SALAH'].includes(tipeSoal) && opsiJawaban && Array.isArray(opsiJawaban)) {
          for (const o of opsiJawaban) {
            await prisma.opsiJawaban.create({
              data: {
                soalId,
                label: o.label,
                konten: convertEquationToKatex(String(o.konten || '').trim()),
                isBenar: Boolean(o.isBenar),
              },
            });
          }
        }

        if (targetMapelId) {
          await recalculateTopikPoints(targetMapelId);
        }

        return NextResponse.json({ success: true, message: 'Butir soal berhasil diperbarui' });
      } else {
        if (!targetMapelId) {
          return NextResponse.json({ success: false, message: 'Pilih Topik / Mata Pelajaran terlebih dahulu' }, { status: 400 });
        }

        const isChoiceType = ['PG', 'PG_KOMPLEKS', 'BENAR_SALAH'].includes(tipeSoal);
        const count = await prisma.soal.count({ where: { mataPelajaranId: targetMapelId } });
        const newSoal = await prisma.soal.create({
          data: {
            mataPelajaranId: targetMapelId,
            nomorUrut: count + 1,
            tipeSoal: tipeSoal as TipeSoal,
            pertanyaan: cleanPertanyaan,
            bobot: bobot !== undefined && Number(bobot) > 0 ? Number(bobot) : 1.0,
            mediaGambar: mediaGambar || null,
            mediaAudio: mediaAudio || null,
            kunciJawabanTeks: cleanKunciTeks,
            matchingData: rawMatchingString,
            opsiJawaban: isChoiceType
              ? {
                  create: (opsiJawaban || []).map((o: any) => ({
                    label: o.label,
                    konten: convertEquationToKatex(String(o.konten || '').trim()),
                    isBenar: Boolean(o.isBenar),
                  })),
                }
              : undefined,
          },
        });

        await recalculateTopikPoints(targetMapelId);

        return NextResponse.json({ success: true, data: newSoal, message: 'Butir soal baru berhasil disimpan' });
      }
    }

    // 3. Delete Soal
    if (action === 'DELETE_SOAL') {
      const { soalId, mataPelajaranId, topikId, bankSoalId } = body;
      
      let targetMapelId = mataPelajaranId || topikId || bankSoalId;
      if (!targetMapelId && soalId) {
        const foundSoal = await prisma.soal.findUnique({ where: { id: soalId }, select: { mataPelajaranId: true } });
        targetMapelId = foundSoal?.mataPelajaranId;
      }

      await prisma.jawabanPeserta.deleteMany({ where: { soalId } });
      await prisma.opsiJawaban.deleteMany({ where: { soalId } });
      await prisma.soal.delete({ where: { id: soalId } });

      if (targetMapelId) {
        await recalculateTopikPoints(targetMapelId);
      }

      return NextResponse.json({ success: true, message: 'Butir soal berhasil dihapus' });
    }

    // 4. Arsipkan Jadwal Ujian
    if (action === 'ARCHIVE_UJIAN') {
      const { ujianId, status = 'NONAKTIF' } = body;
      const updated = await prisma.ujian.update({
        where: { id: ujianId },
        data: { status: status as any },
      });
      return NextResponse.json({
        success: true,
        message: 'Jadwal ujian berhasil diarsipkan',
        data: updated,
      });
    }

    // 5. Pulihkan / Aktifkan Kembali Jadwal Ujian
    if (action === 'UNARCHIVE_UJIAN') {
      const { ujianId } = body;
      const updated = await prisma.ujian.update({
        where: { id: ujianId },
        data: { status: 'DIJADWALKAN' },
      });
      return NextResponse.json({
        success: true,
        message: 'Jadwal ujian berhasil diaktifkan kembali dari arsip.',
        data: updated,
      });
    }

    return NextResponse.json({ success: false, message: 'Aksi tidak dikenali' }, { status: 400 });
  } catch (error: any) {
    console.error('Guru topik & soal post error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
