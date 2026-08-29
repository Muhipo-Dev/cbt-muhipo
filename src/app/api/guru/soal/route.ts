import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TipeSoal } from '@prisma/client';

// Helper untuk kalkulasi otomatis poin butir soal agar total poin sama dengan nilaiMaksimal
async function recalculateBankSoalPoints(bankSoalId: string) {
  try {
    const bank: any = await prisma.bankSoal.findUnique({
      where: { id: bankSoalId },
      include: {
        soalList: {
          select: { id: true, nomorUrut: true },
          orderBy: { nomorUrut: 'asc' },
        },
      },
    });

    if (!bank || !bank.soalList || bank.soalList.length === 0) return;

    const totalSoal = bank.soalList.length;
    const maxScore = Number(bank?.nilaiMaksimal) || 100.0;
    const pointPerSoal = Number((maxScore / totalSoal).toFixed(2));

    // Update semua bobot / poin soal
    await prisma.soal.updateMany({
      where: { bankSoalId },
      data: {
        bobot: pointPerSoal,
      },
    });
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
      // Filter kepemilikan jika role adalah GURU
      const whereClause: any = { id: bankSoalId };
      if (user.role === 'GURU') {
        whereClause.pembuatId = user.userId;
      }

      const bankSoal = await prisma.bankSoal.findFirst({
        where: whereClause,
        include: {
          mataPelajaran: true,
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

    // Filter list bank soal: Guru hanya melihat bank buatannya, Admin melihat semua
    const bankWhereClause = user.role === 'GURU' ? { pembuatId: user.userId } : {};

    const list = await prisma.bankSoal.findMany({
      where: bankWhereClause,
      include: {
        mataPelajaran: true,
        pembuat: { select: { id: true, name: true, username: true } },
        _count: {
          select: { soalList: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter mata pelajaran:
    // Jika Guru, utamakan mata pelajaran yang diampu oleh guru tersebut di database
    let mapelList: any[] = [];
    if (user.role === 'GURU') {
      const guruMapelAssigned = await prisma.guruMataPelajaran.findMany({
        where: { guruId: user.userId },
        include: { mataPelajaran: true },
      });

      if (guruMapelAssigned.length > 0) {
        mapelList = guruMapelAssigned.map((gm) => gm.mataPelajaran);
      } else {
        // Fallback jika belum di-assign spesifik oleh admin
        mapelList = await prisma.mataPelajaran.findMany({ orderBy: { nama: 'asc' } });
      }
    } else {
      mapelList = await prisma.mataPelajaran.findMany({ orderBy: { nama: 'asc' } });
    }

    const kelasList = await prisma.kelas.findMany({ orderBy: { nama: 'asc' } });

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
      const { kodeBank, nama, tingkat, jurusan, mataPelajaranId, durasiMenit, kkm, nilaiMinimal, nilaiMaksimal } = body;
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
          pembuatId: user.userId,
        } as any,
      });

      return NextResponse.json({ success: true, data: bankSoal, message: 'Bank Soal berhasil dibuat' });
    }

    // 1b. Update Bank Soal
    if (action === 'UPDATE_BANK_SOAL') {
      const { bankSoalId, kodeBank, nama, tingkat, jurusan, mataPelajaranId, durasiMenit, kkm, nilaiMinimal, nilaiMaksimal } = body;
      
      const existingBank = await prisma.bankSoal.findUnique({ where: { id: bankSoalId } });
      if (!existingBank) {
        return NextResponse.json({ success: false, message: 'Bank Soal tidak ditemukan' }, { status: 404 });
      }
      if (user.role === 'GURU' && existingBank.pembuatId !== user.userId) {
        return NextResponse.json({ success: false, message: 'Akses ditolak. Anda bukan pemilik bank soal ini.' }, { status: 403 });
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
        } as any,
      });

      // Jika nilai maksimal berubah, kalkulasi ulang bobot tiap soal
      await recalculateBankSoalPoints(bankSoalId);

      return NextResponse.json({ success: true, data: bankSoal, message: 'Bank Soal berhasil diperbarui' });
    }

    // 1c. Hapus Bank Soal
    if (action === 'DELETE_BANK_SOAL') {
      const { bankSoalId } = body;

      const existingBank = await prisma.bankSoal.findUnique({ where: { id: bankSoalId } });
      if (!existingBank) {
        return NextResponse.json({ success: false, message: 'Bank Soal tidak ditemukan' }, { status: 404 });
      }
      if (user.role === 'GURU' && existingBank.pembuatId !== user.userId) {
        return NextResponse.json({ success: false, message: 'Akses ditolak. Anda bukan pemilik bank soal ini.' }, { status: 403 });
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

        await prisma.soal.create({
          data: {
            bankSoalId,
            nomorUrut: startOrder++,
            tipeSoal: tipe as TipeSoal,
            pertanyaan,
            bobot,
            kunciJawabanTeks: kunciTeks,
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
      const { bankSoalId, soalId, nomorUrut, tipeSoal, pertanyaan, bobot, opsiJawaban, kunciJawabanTeks } = body;

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
          },
        });

        // Hapus & recreate opsi jawaban jika ada
        if (opsiJawaban && Array.isArray(opsiJawaban)) {
          await prisma.opsiJawaban.deleteMany({ where: { soalId } });
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
        const count = await prisma.soal.count({ where: { bankSoalId } });
        const newSoal = await prisma.soal.create({
          data: {
            bankSoalId,
            nomorUrut: count + 1,
            tipeSoal: tipeSoal as TipeSoal,
            pertanyaan,
            bobot: bobot !== undefined && Number(bobot) > 0 ? Number(bobot) : 1.0,
            kunciJawabanTeks,
            opsiJawaban: {
              create: (opsiJawaban || []).map((o: any) => ({
                label: o.label,
                konten: o.konten,
                isBenar: Boolean(o.isBenar),
              })),
            },
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

    return NextResponse.json({ success: false, message: 'Aksi tidak dikenali' }, { status: 400 });
  } catch (error: any) {
    console.error('Guru bank soal post error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
