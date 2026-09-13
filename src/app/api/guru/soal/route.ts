import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TipeSoal } from '@prisma/client';

// Engine Perhitungan Bobot CBT MUHIPO

// Helper untuk kalkulasi otomatis poin butir soal secara seimbang dan proporsional:
// ATURAN: Isian Singkat > Pilihan Ganda, dan Esai > Isian Singkat.
// Rasio bobot standar (Weighted Ratio):
// - PG / PG_KOMPLEKS / BENAR_SALAH = 1.0x (Dasar)
// - ISIAN (Isian Singkat)           = 2.0x (Lebih tinggi dari PG)
// - ESAI (Uraian / Esai)            = 4.0x (Lebih tinggi dari Isian Singkat)
async function recalculateBankSoalPoints(bankSoalId: string) {
  try {
    const bank: any = await prisma.bankSoal.findUnique({
      where: { id: bankSoalId },
      include: {
        soalList: {
          select: { id: true, nomorUrut: true, tipeSoal: true },
          orderBy: { nomorUrut: 'asc' },
        },
      },
    });

    if (!bank || !bank.soalList || bank.soalList.length === 0) return;

    const soalList = bank.soalList;
    const maxScore = Number(bank?.nilaiMaksimal) || 100.0;

    // Tentukan pengali rasio bobot per tipe soal:
    // ATURAN:
    // - Esai = 4.0x (Paling tinggi)
    // - Isian Singkat = 2.0x (Lebih tinggi dari PG)
    // - PG Kompleks (Multiple Choice) = 1.5x (Di atas PG tunggal)
    // - Pencocokan (MENJODOHKAN) = 1.0x (Bobot sama dengan Pilihan Ganda)
    // - Pilihan Ganda (PG Tunggal / Benar-Salah) = 1.0x (Dasar)
    const getRatio = (tipe: string): number => {
      switch (tipe) {
        case 'ESAI':
          return 4.0; // Esai tertinggi
        case 'ISIAN':
          return 2.0; // Isian lebih tinggi dari PG
        case 'PG_KOMPLEKS':
          return 1.5; // Multiple Choice di atas PG tunggal
        case 'MENJODOHKAN':
          return 1.0; // Bobot soal pencocokan sama dengan pilihan ganda
        case 'PG':
        case 'BENAR_SALAH':
        default:
          return 1.0; // Pilihan ganda dasar
      }
    };

    // Hitung total unit bobot
    let totalWeightUnits = 0;
    for (const s of soalList) {
      totalWeightUnits += getRatio(s.tipeSoal);
    }

    if (totalWeightUnits === 0) totalWeightUnits = soalList.length;

    // Nilai per unit bobot
    const unitValue = maxScore / totalWeightUnits;

    // Kalkulasi bobot individual dan selaraskan pembulatan agar total poin pas = maxScore
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
        // Soal terakhir menyerap selisih desimal agar total persis sama dengan nilaiMaksimal
        const remainingPoint = Number((maxScore - accumulatedScore).toFixed(2));
        const finalPoint = remainingPoint > 0 ? remainingPoint : Number((getRatio(s.tipeSoal) * unitValue).toFixed(2));
        updates.push({ id: s.id, bobot: finalPoint });
      }
    }

    // Update setiap butir soal secara paralel
    await Promise.all(
      updates.map((item) =>
        prisma.soal.update({
          where: { id: item.id },
          data: { bobot: item.bobot },
        })
      )
    );
  } catch (err) {
    console.error('Recalculate bank soal points error:', err);
  }
}

// GET: Ambil Bank Soal & Soal-soal
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['GURU', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bankSoalId = searchParams.get('bankSoalId');

    if (bankSoalId) {
      // Filter kepemilikan jika role adalah GURU:
      // ATURAN: Guru HANYA berhak mengakses jika ia adalah pembuat/pengimpor langsung bank soal tersebut
      const whereClause: any = { id: bankSoalId };
      if (user.role === 'GURU') {
        whereClause.pembuatId = user.userId;
      }

      const bankSoal = await prisma.bankSoal.findFirst({
        where: whereClause,
        include: {
          mataPelajaran: {
            include: {
              gurus: {
                include: {
                  guru: { select: { id: true, name: true, username: true } },
                },
              },
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

      if (!bankSoal) {
        return NextResponse.json({
          success: false,
          message: 'Bank Soal tidak ditemukan atau Anda tidak memiliki hak akses.',
        }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: bankSoal });
    }

    // Filter list bank soal:
    // ATURAN: Guru HANYA melihat bank buatannya/diimpornya sendiri (pembuatId: user.userId). Admin melihat semua.
    const bankWhereClause =
      user.role === 'GURU'
        ? {
            pembuatId: user.userId,
          }
        : {};

    const list = await prisma.bankSoal.findMany({
      where: bankWhereClause,
      include: {
        mataPelajaran: {
          include: {
            gurus: {
              include: {
                guru: { select: { id: true, name: true, username: true } },
              },
            },
          },
        },
        pembuat: { select: { id: true, name: true, username: true, role: true } },
        _count: {
          select: { soalList: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter mata pelajaran:
    // ATURAN: Guru HANYA melihat mata pelajaran yang diampunya
    let mapelList: any[] = [];
    if (user.role === 'GURU') {
      const guruMapelAssigned = await prisma.guruMataPelajaran.findMany({
        where: { guruId: user.userId },
        include: { mataPelajaran: true },
      });

      mapelList = guruMapelAssigned.map((gm) => gm.mataPelajaran);
    } else {
      mapelList = await prisma.mataPelajaran.findMany({
        include: {
          gurus: {
            include: {
              guru: { select: { id: true, name: true, username: true } },
            },
          },
        },
        orderBy: { nama: 'asc' },
      });
    }

    // Filter rombel kelas:
    // ATURAN: Guru HANYA melihat kelas yang diampunya (dari tabel GuruKelas yang tersinkron dari SIMASMUH)
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
        // Fallback jika belum ada jadwal spesifik, tampilkan kelas dari database agar tidak blank
        kelasList = await prisma.kelas.findMany({ orderBy: { nama: 'asc' } });
      }
    } else {
      kelasList = await prisma.kelas.findMany({ orderBy: { nama: 'asc' } });
    }

    return NextResponse.json({
      success: true,
      data: {
        bankSoalList: list,
        mapelList,
        kelasList,
      },
    });
  } catch (error: any) {
    console.error('Guru bank soal get error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Buat Bank Soal Baru / Tambah Soal Baru
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['GURU', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // 1. Buat Bank Soal Baru
    if (action === 'CREATE_BANK_SOAL') {
      const { kodeBank, nama, tingkat, jurusan, mataPelajaranId, durasiMenit, kkm, nilaiMinimal, nilaiMaksimal, guruPengampuId } = body;
      
      let finalPembuatId = user.userId;

      // Cari guru pengampu dari relasi GuruMataPelajaran (Tersinkron SIMASMUH)
      let mapelPengampuGuruId: string | null = null;
      if (mataPelajaranId) {
        const firstPengampu = await prisma.guruMataPelajaran.findFirst({
          where: { mataPelajaranId },
          include: { guru: true },
        });
        if (firstPengampu?.guruId) {
          mapelPengampuGuruId = firstPengampu.guruId;
        }
      }

      // Jika yang membuat adalah ADMIN / GURU:
      // Prioritaskan guruPengampuId spesifik, atau otomatis guru pengampu mapel SIMASMUH
      if (guruPengampuId) {
        finalPembuatId = guruPengampuId;
      } else if (mapelPengampuGuruId) {
        finalPembuatId = mapelPengampuGuruId;
      }

      const bankSoal = await prisma.bankSoal.create({
        data: {
          kodeBank,
          nama,
          tingkat: Number(tingkat),
          jurusan: jurusan || 'UMUM',
          durasiMenit: Number(durasiMenit) || 90,
          kkm: kkm !== undefined ? Number(kkm) : 75.0,
          nilaiMinimal: nilaiMinimal !== undefined ? Number(nilaiMinimal) : 0.0,
          nilaiMaksimal: nilaiMaksimal !== undefined ? Number(nilaiMaksimal) : 100.0,
          mataPelajaranId,
          pembuatId: finalPembuatId,
        } as any,
      });

      return NextResponse.json({ success: true, data: bankSoal, message: 'Bank Soal berhasil dibuat' });
    }

    // 1b. Update Bank Soal
    if (action === 'UPDATE_BANK_SOAL') {
      const { bankSoalId, kodeBank, nama, tingkat, jurusan, mataPelajaranId, durasiMenit, kkm, nilaiMinimal, nilaiMaksimal, guruPengampuId } = body;
      
      const existingBank = await prisma.bankSoal.findUnique({
        where: { id: bankSoalId },
        include: { mataPelajaran: { include: { gurus: true } } },
      });
      if (!existingBank) {
        return NextResponse.json({ success: false, message: 'Bank Soal tidak ditemukan' }, { status: 404 });
      }

      const isTeacherOfMapel = existingBank.mataPelajaran?.gurus?.some((g) => g.guruId === user.userId);
      if (user.role === 'GURU' && existingBank.pembuatId !== user.userId && !isTeacherOfMapel) {
        return NextResponse.json({ success: false, message: 'Akses ditolak. Anda bukan guru pengampu / pemilik bank soal ini.' }, { status: 403 });
      }

      // Tentukan pembuatId jika diubah / mapel berganti / admin mengedit bank soal
      let targetPembuatId: string | undefined = undefined;
      const targetMapelId = mataPelajaranId || existingBank.mataPelajaranId;

      if (guruPengampuId) {
        targetPembuatId = guruPengampuId;
      } else if (targetMapelId) {
        const mapelPengampu = await prisma.guruMataPelajaran.findFirst({
          where: { mataPelajaranId: targetMapelId },
        });
        if (mapelPengampu?.guruId) {
          targetPembuatId = mapelPengampu.guruId;
        }
      }

      const bankSoal = await prisma.bankSoal.update({
        where: { id: bankSoalId },
        data: {
          kodeBank,
          nama,
          tingkat: Number(tingkat),
          jurusan: jurusan || 'UMUM',
          durasiMenit: durasiMenit ? Number(durasiMenit) : undefined,
          kkm: kkm !== undefined ? Number(kkm) : undefined,
          nilaiMinimal: nilaiMinimal !== undefined ? Number(nilaiMinimal) : undefined,
          nilaiMaksimal: nilaiMaksimal !== undefined ? Number(nilaiMaksimal) : undefined,
          mataPelajaranId,
          pembuatId: targetPembuatId,
        } as any,
      });

      // Jika nilai maksimal berubah, kalkulasi ulang bobot tiap soal
      await recalculateBankSoalPoints(bankSoalId);

      return NextResponse.json({ success: true, data: bankSoal, message: 'Bank Soal berhasil diperbarui' });
    }

    // 1c. Hapus Bank Soal
    if (action === 'DELETE_BANK_SOAL') {
      const { bankSoalId } = body;

      const existingBank = await prisma.bankSoal.findUnique({
        where: { id: bankSoalId },
        include: { mataPelajaran: { include: { gurus: true } } },
      });
      if (!existingBank) {
        return NextResponse.json({ success: false, message: 'Bank Soal tidak ditemukan' }, { status: 404 });
      }

      const isTeacherOfMapel = existingBank.mataPelajaran?.gurus?.some((g) => g.guruId === user.userId);
      if (user.role === 'GURU' && existingBank.pembuatId !== user.userId && !isTeacherOfMapel) {
        return NextResponse.json({ success: false, message: 'Akses ditolak. Anda bukan guru pengampu / pemilik bank soal ini.' }, { status: 403 });
      }
      
      // 1. Hapus semua jawaban peserta dan log dari ujian yang terhubung ke bank soal ini
      const relatedUjian = await prisma.ujian.findMany({ where: { bankSoalId } });
      for (const u of relatedUjian) {
        const peserta = await prisma.pesertaUjian.findMany({ where: { ujianId: u.id }, select: { id: true } });
        const pesertaIds = peserta.map((p) => p.id);
        
        if (pesertaIds.length > 0) {
          await prisma.jawabanPeserta.deleteMany({ where: { pesertaUjianId: { in: pesertaIds } } });
          await prisma.logAktivitasUjian.deleteMany({ where: { pesertaUjianId: { in: pesertaIds } } });
        }
        await prisma.pesertaUjian.deleteMany({ where: { ujianId: u.id } });
        await prisma.ujian.delete({ where: { id: u.id } });
      }

      // 2. Hapus opsi & butir soal terkait
      const soalList = await prisma.soal.findMany({ where: { bankSoalId }, select: { id: true } });
      const soalIds = soalList.map((s) => s.id);
      if (soalIds.length > 0) {
        await prisma.jawabanPeserta.deleteMany({ where: { soalId: { in: soalIds } } });
        await prisma.opsiJawaban.deleteMany({ where: { soalId: { in: soalIds } } });
        await prisma.soal.deleteMany({ where: { bankSoalId } });
      }

      // 3. Hapus Bank Soal
      await prisma.bankSoal.delete({
        where: { id: bankSoalId },
      });

      return NextResponse.json({ success: true, message: 'Bank Soal & seluruh butir soal terkait berhasil dihapus' });
    }

    // 1d. Import Soal Massal (dari Excel/JSON Array)
    if (action === 'IMPORT_SOAL') {
      const { bankSoalId, soalItems, durasiMenit } = body;
      if (!bankSoalId || !Array.isArray(soalItems) || soalItems.length === 0) {
        return NextResponse.json({ success: false, message: 'Data soal import tidak valid atau kosong' }, { status: 400 });
      }

      // Update durasi bank soal bila dikirimkan saat import
      if (durasiMenit && Number(durasiMenit) > 0) {
        await prisma.bankSoal.update({
          where: { id: bankSoalId },
          data: { durasiMenit: Number(durasiMenit) },
        });
      }

      let startOrder = (await prisma.soal.count({ where: { bankSoalId } })) + 1;
      let importedCount = 0;

      for (const item of soalItems) {
        const tipe = (item.tipeSoal || 'PG').toUpperCase();
        const pertanyaan = String(item.pertanyaan || '').trim();
        if (!pertanyaan) continue;

        const bobot = Number(item.bobot) || 1.0;
        const kunciTeks = item.kunciJawabanTeks || null;

        const opsiList: { label: string; konten: string; isBenar: boolean }[] = [];
        if (tipe === 'PG' || tipe === 'PG_KOMPLEKS') {
          const rawOpsi = item.opsi || [];
          if (Array.isArray(rawOpsi)) {
            for (const o of rawOpsi) {
              if (o.konten && String(o.konten).trim()) {
                opsiList.push({
                  label: String(o.label || '').toUpperCase(),
                  konten: String(o.konten).trim(),
                  isBenar: Boolean(o.isBenar),
                });
              }
            }
          }
        }

        const rawMatching = item.matchingData
          ? typeof item.matchingData === 'string'
            ? item.matchingData
            : JSON.stringify(item.matchingData)
          : null;

        await prisma.soal.create({
          data: {
            bankSoalId,
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

      // Auto recalculate poin setiap soal dalam bank soal
      await recalculateBankSoalPoints(bankSoalId);

      return NextResponse.json({
        success: true,
        message: `Berhasil mengimport ${importedCount} butir soal ke dalam Bank Soal! Poin per soal otomatis dikalkulasi.`,
        importedCount,
      });
    }

    // 1e. Kirim / Jadwalkan Soal Langsung ke Kelas Tertentu
    if (action === 'KIRIM_KE_KELAS') {
      const {
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
      } = body;

      if (!bankSoalId || !kelasIds || !Array.isArray(kelasIds) || kelasIds.length === 0) {
        return NextResponse.json({ success: false, message: 'Pilih minimal 1 kelas target tujuan' }, { status: 400 });
      }

      const bankSoal = await prisma.bankSoal.findUnique({ where: { id: bankSoalId } });
      if (!bankSoal) {
        return NextResponse.json({ success: false, message: 'Bank Soal tidak ditemukan' }, { status: 404 });
      }

      // ATURAN: Guru HANYA dapat menjadwalkan bank soal yang dia buat / impor sendiri
      if (user.role === 'GURU' && bankSoal.pembuatId !== user.userId) {
        return NextResponse.json({ success: false, message: 'Akses ditolak. Anda hanya dapat menjadwalkan bank soal milik Anda sendiri.' }, { status: 403 });
      }

      const generatedKode = kodeUjian || `UJIAN-${bankSoal.kodeBank}-${Date.now().toString().slice(-4)}`;
      const examTitle = judul || `Ujian: ${bankSoal.nama}`;
      const duration = Number(durasiMenit) || bankSoal.durasiMenit || 90;

      // Buat Jadwal Ujian
      const newUjian = await prisma.ujian.create({
        data: {
          kodeUjian: generatedKode,
          judul: examTitle,
          bankSoalId,
          durasiMenit: duration,
          waktuMulai: waktuMulai ? new Date(waktuMulai) : new Date(),
          waktuSelesai: waktuSelesai ? new Date(waktuSelesai) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lockBrowser: lockBrowser !== false,
          acakSoal: acakSoal !== false,
          acakOpsi: acakOpsi !== false,
          status: 'DIJADWALKAN',
          ujianKelas: {
            create: kelasIds.map((kId: string) => ({ kelasId: kId })),
          },
        },
      });

      // Ambil siswa pada kelas-kelas terpilih
      const targetSiswa = await prisma.user.findMany({
        where: {
          role: 'SISWA',
          kelasId: { in: kelasIds },
        },
      });

      if (targetSiswa.length > 0) {
        await prisma.pesertaUjian.createMany({
          data: targetSiswa.map((s) => ({
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
        message: `Ujian berhasil dibuat dan didistribusikan ke ${targetSiswa.length} siswa pada ${kelasIds.length} rombel kelas terpilih!`,
        data: { ujian: newUjian, totalPeserta: targetSiswa.length },
      });
    }

    // 2. Tambah / Simpan Soal
    if (action === 'SAVE_SOAL') {
      const { bankSoalId, soalId, nomorUrut, tipeSoal, pertanyaan, bobot, opsiJawaban, kunciJawabanTeks, matchingData } = body;

      const rawMatchingString = matchingData
        ? typeof matchingData === 'string'
          ? matchingData
          : JSON.stringify(matchingData)
        : null;

      if (soalId) {
        // Update Soal
        await prisma.soal.update({
          where: { id: soalId },
          data: {
            nomorUrut: Number(nomorUrut) || 1,
            tipeSoal: tipeSoal as TipeSoal,
            pertanyaan,
            bobot: bobot !== undefined && Number(bobot) > 0 ? Number(bobot) : 1.0,
            kunciJawabanTeks,
            matchingData: rawMatchingString,
          },
        });

        // Hapus & recreate opsi jawaban jika tipe soal adalah PG / PG_KOMPLEKS / BENAR_SALAH
        await prisma.opsiJawaban.deleteMany({ where: { soalId } });
        if (['PG', 'PG_KOMPLEKS', 'BENAR_SALAH'].includes(tipeSoal) && opsiJawaban && Array.isArray(opsiJawaban)) {
          for (const o of opsiJawaban) {
            await prisma.opsiJawaban.create({
              data: {
                soalId,
                label: o.label,
                konten: o.konten,
                isBenar: Boolean(o.isBenar),
              },
            });
          }
        }

        // Auto recalculate poin setiap butir soal
        if (bankSoalId) {
          await recalculateBankSoalPoints(bankSoalId);
        }

        return NextResponse.json({ success: true, message: 'Soal berhasil diupdate' });
      } else {
        // Create Soal Baru
        const isChoiceType = ['PG', 'PG_KOMPLEKS', 'BENAR_SALAH'].includes(tipeSoal);
        const count = await prisma.soal.count({ where: { bankSoalId } });
        const newSoal = await prisma.soal.create({
          data: {
            bankSoalId,
            nomorUrut: count + 1,
            tipeSoal: tipeSoal as TipeSoal,
            pertanyaan,
            bobot: bobot !== undefined && Number(bobot) > 0 ? Number(bobot) : 1.0,
            kunciJawabanTeks,
            matchingData: rawMatchingString,
            opsiJawaban: isChoiceType
              ? {
                  create: (opsiJawaban || []).map((o: any) => ({
                    label: o.label,
                    konten: o.konten,
                    isBenar: Boolean(o.isBenar),
                  })),
                }
              : undefined,
          },
        });

        // Auto recalculate poin setiap butir soal
        await recalculateBankSoalPoints(bankSoalId);

        return NextResponse.json({ success: true, data: newSoal });
      }
    }

    // 3. Delete Soal
    if (action === 'DELETE_SOAL') {
      const { soalId, bankSoalId } = body;
      
      let targetBankId = bankSoalId;
      if (!targetBankId && soalId) {
        const foundSoal = await prisma.soal.findUnique({ where: { id: soalId }, select: { bankSoalId: true } });
        targetBankId = foundSoal?.bankSoalId;
      }

      await prisma.jawabanPeserta.deleteMany({ where: { soalId } });
      await prisma.opsiJawaban.deleteMany({ where: { soalId } });
      await prisma.soal.delete({ where: { id: soalId } });

      if (targetBankId) {
        await recalculateBankSoalPoints(targetBankId);
      }

      return NextResponse.json({ success: true, message: 'Soal berhasil dihapus' });
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
        message: 'Jadwal ujian berhasil diarsipkan! Histori nilai siswa dan pengerjaan tetap tersimpan aman.',
        data: updated,
      });
    }

    // 5. Pulihkan / Aktifkan Kembali Jadwal Ujian dari Arsip
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
    console.error('Guru bank soal post error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
