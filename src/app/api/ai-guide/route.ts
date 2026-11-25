import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/ai-guide
 * Endpoint manifest & konteks real-time khusus bagi AI Automation Agent
 * (ChatGPT Task / Operator, Gemini Task / Computer Use) yang sedang beroperasi
 * menggunakan sesi terotentikasi Admin / Guru / Proktor.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unauthorized. Silakan login terlebih dahulu sebagai Admin/Guru/Proktor melalui /login?portal=admin. Baca panduan struktur publik di /llms.txt.',
          publicGuideUrl: '/llms.txt',
        },
        { status: 401 }
      );
    }

    const mapelWhere =
      user.role === 'GURU'
        ? {
            status: { not: 'TERHAPUS' },
            OR: [{ pembuatId: user.userId }, { gurus: { some: { guruId: user.userId } } }],
          }
        : { status: { not: 'TERHAPUS' } };

    const [modulList, topikList, kelasList, activeUjianList] = await Promise.all([
      prisma.modul.findMany({
        select: { id: true, nama: true, deskripsi: true },
        orderBy: { nama: 'asc' },
      }),
      prisma.mataPelajaran.findMany({
        where: mapelWhere,
        select: {
          id: true,
          kode: true,
          nama: true,
          tingkat: true,
          jurusan: true,
          durasiMenit: true,
          kkm: true,
          status: true,
          modul: { select: { id: true, nama: true } },
          _count: { select: { soalList: true } },
        },
        orderBy: { nama: 'asc' },
      }),
      prisma.kelas.findMany({
        select: {
          id: true,
          nama: true,
          tingkat: true,
          jurusan: true,
          _count: { select: { users: true } },
        },
        orderBy: { nama: 'asc' },
      }),
      prisma.ujian.findMany({
        take: 25,
        orderBy: { waktuMulai: 'desc' },
        select: {
          id: true,
          kodeUjian: true,
          judul: true,
          mataPelajaranId: true,
          durasiMenit: true,
          waktuMulai: true,
          waktuSelesai: true,
          status: true,
          lockBrowser: true,
          acakSoal: true,
          acakOpsi: true,
          _count: { select: { pesertaUjian: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      system: 'CBT v2 SMA Muhipo — AI Admin Automation Protocol',
      guideUrl: '/llms.txt',
      authenticatedAs: {
        userId: user.userId,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      navigation: {
        dashboard: '/admin?tab=dashboard',
        kelolaTopik: '/admin?tab=modul_topik',
        inputSoalDanAI: '/admin?tab=modul_soal',
        importExcel: '/admin?tab=modul_import',
        daftarSoal: '/admin?tab=modul_daftar',
        kelolaKelas: '/admin?tab=peserta_group',
        kelolaPeserta: '/admin?tab=peserta_daftar',
        tambahTesUjian: '/admin?tab=tes_tambah',
        daftarTesUjian: '/admin?tab=tes_daftar',
        pengawasanLive: '/admin?tab=proktor_live',
      },
      domSelectors: {
        selectTopikSoal: '#select-topik-soal',
        selectTipeSoal: '#select-tipe-soal',
        questionVisualEditor: '#soal-pertanyaan-editor',
        toggleSourceMode: '#btn-source-mode',
        questionSourceTextarea: '#soal-pertanyaan-source',
        inlineOptionInputs: '#inline-opsi-A .. #inline-opsi-E',
        inlineAnswerKeyControls: '#inline-kunci-A .. #inline-kunci-E',
        saveSingleQuestionButton: '#btn-simpan-soal',
        openAIQuickImportButton: '#btn-toggle-ai-quick-import',
        aiQuickImportTextarea: '#ai-quick-import-textarea',
        aiQuickImportSubmitButton: '#ai-quick-import-submit',
      },
      mathConventions: {
        supportedDelimiters: ['$...$', '$$...$$', '\\(...\\)', '\\[...\\]'],
        squareRootWithCoefficient: '2\\sqrt{3} atau 2√3 -> 2 dikali akar 3 ($2\\sqrt{3}$)',
        nthRoot: '\\sqrt[3]{8}, √[3]{8}, ³√8, atau ∛8 -> akar pangkat 3 dari 8 ($\\sqrt[3]{8}$)',
        fractionWithRoot: '\\frac{1}{4}\\sqrt{14} atau 1/4 √14',
        decimalRoot: '\\sqrt{2,25} atau √2,25',
      },
      supportedQuestionTypes: [
        'PG (Pilihan Ganda 1 jawaban benar)',
        'PG_KOMPLEKS (Pilihan Ganda Kompleks >1 jawaban benar)',
        'BENAR_SALAH (Pernyataan Benar / Salah)',
        'ISIAN (Isian Singkat auto-grading)',
        'ESAI (Uraian / Essay)',
        'MENJODOHKAN (Pasangan kiri => kanan)',
      ],
      apiContracts: {
        createTopik: {
          endpoint: 'POST /api/guru/soal',
          body: {
            action: 'CREATE_TOPIK',
            kode: 'MTK-X-1',
            nama: 'Matematika Wajib Kelas X',
            tingkat: 10,
            durasiMenit: 90,
            kkm: 75,
          },
        },
        importSoalJsonOrMarkdown: {
          endpoint: 'POST /api/guru/soal',
          bodyExampleJson: {
            action: 'IMPORT_SOAL',
            mataPelajaranId: '<pilih_id_dari_catalog.topikList>',
            kodeTopik: '<opsional_jika_tanpa_mataPelajaranId>',
            namaTopik: '<opsional_jika_autoCreateTopik_true>',
            autoCreateTopik: true,
            soalItems: [
              {
                tipeSoal: 'PG',
                pertanyaan: 'Nilai dari $2\\sqrt{3} + \\sqrt{12}$ adalah...',
                opsi: { A: '$3\\sqrt{3}$', B: '$4\\sqrt{3}$', C: '$5\\sqrt{3}$', D: '$6\\sqrt{3}$', E: '$7\\sqrt{3}$' },
                kunci: 'B',
                bobot: 1,
              },
            ],
          },
          bodyExampleRawText: {
            action: 'IMPORT_SOAL',
            mataPelajaranId: '<pilih_id_dari_catalog.topikList>',
            rawText: '1. Nilai dari 2√3 + √12 adalah...\nA. 3√3\nB. 4√3\nC. 5√3\nD. 6√3\nE. 7√3\nKunci: B',
          },
        },
        createJadwalUjian: {
          endpoint: 'POST /api/admin',
          rule: 'Selisih waktuSelesai - waktuMulai wajib >= durasiMenit (dalam menit)',
          body: {
            action: 'CREATE_UJIAN',
            mataPelajaranId: '<id_topik>',
            judul: 'Penilaian Harian Matematika Kelas X',
            durasiMenit: 90,
            waktuMulai: '2026-11-26T07:30',
            waktuSelesai: '2026-11-26T10:30',
            kelasIds: ['<id_kelas_1>'],
            lockBrowser: true,
            acakSoal: true,
            acakOpsi: true,
            tampilkanHasil: false,
          },
        },
        proktorActions: {
          endpoint: 'POST /api/proktor',
          supportedActions: [
            'RESET_PELANGGARAN (pesertaUjianId)',
            'RESET_ALL_PELANGGARAN (ujianId)',
            'RESET_LOGIN (pesertaUjianId)',
            'RESET_ALL_LOGINS (ujianId)',
            'LOCK_EXAM (pesertaUjianId)',
            'UNLOCK_EXAM (pesertaUjianId)',
            'ADD_EXTRA_TIME (pesertaUjianId, extraMinutes)',
            'FORCE_FINISH (pesertaUjianId)',
          ],
        },
      },
      catalog: {
        modulList,
        topikList: topikList.map((t) => ({
          id: t.id,
          kode: t.kode,
          nama: t.nama,
          modul: t.modul?.nama || 'Default',
          tingkat: t.tingkat,
          jurusan: t.jurusan,
          durasiMenit: t.durasiMenit,
          kkm: t.kkm,
          status: t.status,
          jumlahSoal: t._count.soalList,
        })),
        kelasList: kelasList.map((k) => ({
          id: k.id,
          nama: k.nama,
          tingkat: k.tingkat,
          jurusan: k.jurusan,
          jumlahSiswa: k._count.users,
        })),
        recentUjianList: activeUjianList.map((u) => ({
          id: u.id,
          kodeUjian: u.kodeUjian,
          judul: u.judul,
          mataPelajaranId: u.mataPelajaranId,
          durasiMenit: u.durasiMenit,
          waktuMulai: u.waktuMulai,
          waktuSelesai: u.waktuSelesai,
          status: u.status,
          lockBrowser: u.lockBrowser,
          jumlahPeserta: u._count.pesertaUjian,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

