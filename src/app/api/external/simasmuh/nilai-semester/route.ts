import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// API Khusus untuk Integrasi & Sinkronisasi Eksternal (SIMASMUH)
// Endpoint: GET /api/external/simasmuh/nilai-semester?nis={nis}&kelas={kelas}&mapel={mapel}
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nis = searchParams.get('nis');
    const nisn = searchParams.get('nisn');
    const kelasNama = searchParams.get('kelas');
    const mapelKode = searchParams.get('mapel');
    const secretKey = request.headers.get('x-api-key') || searchParams.get('key');

    // Validasi API Key keamanan jika diatur di env (opsional tapi aman)
    const expectedSecret = process.env.SIMASMUH_SYNC_SECRET || 'muhipo-simasmuh-sync-secret-2026';
    if (secretKey && secretKey !== expectedSecret) {
      return NextResponse.json({ success: false, message: 'Invalid API Key / Secret Token' }, { status: 403 });
    }

    // Filter query pencarian nilai
    const whereCondition: any = {
      status: 'SELESAI', // Hanya ujian yang sudah selesai
    };

    if (nis || nisn) {
      whereCondition.siswa = {
        OR: [
          ...(nis ? [{ nis: nis.trim() }, { username: nis.trim() }] : []),
          ...(nisn ? [{ nisn: nisn.trim() }] : []),
        ],
      };
    }

    if (kelasNama) {
      whereCondition.siswa = {
        ...whereCondition.siswa,
        kelas: {
          nama: {
            contains: kelasNama.trim(),
            mode: 'insensitive',
          },
        },
      };
    }

    if (mapelKode) {
      whereCondition.ujian = {
        bankSoal: {
          mataPelajaran: {
            kode: {
              equals: mapelKode.trim(),
              mode: 'insensitive',
            },
          },
        },
      };
    }

    // Query data peserta ujian beserta relasi lengkap (Siswa, Kelas, Ujian, BankSoal, Mapel, Guru)
    const dataNilai = await prisma.pesertaUjian.findMany({
      where: whereCondition,
      include: {
        siswa: {
          select: {
            id: true,
            name: true,
            nis: true,
            nisn: true,
            username: true,
            jenisKelamin: true,
            kelas: {
              select: {
                id: true,
                nama: true,
                tingkat: true,
                jurusan: true,
              },
            },
          },
        },
        ujian: {
          select: {
            id: true,
            kodeUjian: true,
            judul: true,
            durasiMenit: true,
            waktuMulai: true,
            waktuSelesai: true,
            bankSoal: {
              select: {
                id: true,
                kodeBank: true,
                nama: true,
                tingkat: true,
                jurusan: true,
                kkm: true,
                mataPelajaran: {
                  select: {
                    id: true,
                    kode: true,
                    nama: true,
                    gurus: {
                      select: {
                        guru: {
                          select: {
                            id: true,
                            name: true,
                            nip: true,
                            username: true,
                          },
                        },
                      },
                    },
                  },
                },
                pembuat: {
                  select: {
                    id: true,
                    name: true,
                    nip: true,
                    username: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        waktuSelesai: 'desc',
      },
    });

    // Format output data yang bersih, komprehensif, dan siap langsung dikonsumsi Dashboard SIMASMUH
    const formattedData = dataNilai.map((item) => {
      const guruPengampu =
        item.ujian.bankSoal.mataPelajaran.gurus?.[0]?.guru ||
        item.ujian.bankSoal.pembuat;

      // Deteksi Tipe Ujian / Asesmen
      const kodeUpper = item.ujian.kodeUjian.toUpperCase();
      let jenisPenilaian = 'PAS';
      if (kodeUpper.includes('PTS') || kodeUpper.includes('STS') || kodeUpper.includes('UTS') || kodeUpper.includes('TENGAH')) {
        jenisPenilaian = 'PTS';
      } else if (kodeUpper.includes('PAS') || kodeUpper.includes('SAS') || kodeUpper.includes('AKHIR')) {
        jenisPenilaian = 'PAS';
      } else if (kodeUpper.includes('UH') || kodeUpper.includes('HARIAN')) {
        jenisPenilaian = 'UH';
      } else if (kodeUpper.includes('TRYOUT') || kodeUpper.includes('TO')) {
        jenisPenilaian = 'TRYOUT';
      }

      const kkm = item.ujian.bankSoal.kkm || 75;
      const nilaiAkhir = Number(item.nilaiTotal) || 0;
      const isTuntas = nilaiAkhir >= kkm;

      return {
        idPesertaUjian: item.id,
        nis: item.siswa.nis || item.siswa.username,
        nisn: item.siswa.nisn || null,
        namaSiswa: item.siswa.name,
        jenisKelamin: item.siswa.jenisKelamin,
        kelas: item.siswa.kelas ? item.siswa.kelas.nama : '-',
        tingkat: item.siswa.kelas ? item.siswa.kelas.tingkat : item.ujian.bankSoal.tingkat,
        jurusan: item.siswa.kelas ? item.siswa.kelas.jurusan : item.ujian.bankSoal.jurusan,
        
        // Informasi Ujian & Mata Pelajaran
        kodeUjian: item.ujian.kodeUjian,
        judulUjian: item.ujian.judul,
        jenisPenilaian,
        kodeMapel: item.ujian.bankSoal.mataPelajaran.kode,
        namaMapel: item.ujian.bankSoal.mataPelajaran.nama,
        
        // Informasi Guru Pengampu
        guruPengampu: guruPengampu?.name || 'Guru Pengampu CBT',
        nipGuru: guruPengampu?.nip || '-',
        
        // Nilai dan Status Kelulusan
        kkm,
        nilaiPG: item.nilaiPG,
        nilaiEsai: item.nilaiEsai,
        nilaiTotal: nilaiAkhir,
        isKoreksiSelesai: item.isKoreksiSelesai,
        statusKetuntasan: isTuntas ? 'TUNTAS' : 'BELUM_TUNTAS',
        
        // Waktu Pengerjaan
        waktuMulai: item.waktuMulai,
        waktuSelesai: item.waktuSelesai,
      };
    });

    return NextResponse.json({
      success: true,
      total: formattedData.length,
      filter: {
        nis: nis || 'ALL',
        nisn: nisn || 'ALL',
        kelas: kelasNama || 'ALL',
        mapel: mapelKode || 'ALL',
      },
      data: formattedData,
    });
  } catch (error: any) {
    console.error('Error fetching SIMASMUH external grade sync API:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Gagal mengambil data sinkronisasi nilai CBT untuk SIMASMUH',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
