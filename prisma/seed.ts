import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

type RoleType = 'SUPERADMIN' | 'ADMIN' | 'GURU' | 'PROKTOR' | 'SISWA';
type TipeSoalType = 'PG' | 'PG_KOMPLEKS' | 'BENAR_SALAH' | 'MENJODOHKAN' | 'ISIAN' | 'ESAI';
type StatusUjianType = 'DIJADWALKAN' | 'SEDANG_BERJALAN' | 'SELESAI' | 'NONAKTIF';
type StatusPesertaType = 'BELUM_MULAI' | 'SEDANG_MENGERJAKAN' | 'SELESAI' | 'TERKUNCI' | 'RESET_LOGIN';

const Role: Record<string, RoleType> = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  GURU: 'GURU',
  PROKTOR: 'PROKTOR',
  SISWA: 'SISWA',
};

const TipeSoal: Record<string, TipeSoalType> = {
  PG: 'PG',
  PG_KOMPLEKS: 'PG_KOMPLEKS',
  BENAR_SALAH: 'BENAR_SALAH',
  MENJODOHKAN: 'MENJODOHKAN',
  ISIAN: 'ISIAN',
  ESAI: 'ESAI',
};

const StatusUjian: Record<string, StatusUjianType> = {
  DIJADWALKAN: 'DIJADWALKAN',
  SEDANG_BERJALAN: 'SEDANG_BERJALAN',
  SELESAI: 'SELESAI',
  NONAKTIF: 'NONAKTIF',
};

const StatusPeserta: Record<string, StatusPesertaType> = {
  BELUM_MULAI: 'BELUM_MULAI',
  SEDANG_MENGERJAKAN: 'SEDANG_MENGERJAKAN',
  SELESAI: 'SELESAI',
};

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database CBT SMA Muhammadiyah 1 Ponorogo...');

  // 1. Bersihkan data lama jika ada
  await prisma.jawabanPeserta.deleteMany();
  await prisma.logAktivitasUjian.deleteMany();
  await prisma.pesertaUjian.deleteMany();
  await prisma.opsiJawaban.deleteMany();
  await prisma.soal.deleteMany();
  await prisma.ujianKelas.deleteMany();
  await prisma.ujian.deleteMany();
  await prisma.guruMataPelajaran.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.user.deleteMany();
  await prisma.kelas.deleteMany();

  // 2. Hash Password Default
  const nailarPassword = await bcrypt.hash('nailar', 10);
  const niamPassword = await bcrypt.hash('niam', 10);

  // 3. Buat Kelas
  const kelas10A = await prisma.kelas.create({
    data: { nama: 'X-MIPA 1', tingkat: 10, jurusan: 'MIPA' },
  });
  const kelas11A = await prisma.kelas.create({
    data: { nama: 'XI-MIPA 1', tingkat: 11, jurusan: 'MIPA' },
  });
  const kelas12A = await prisma.kelas.create({
    data: { nama: 'XII-F1 (MIPA)', tingkat: 12, jurusan: 'MIPA' },
  });

  // 4. Buat Akun Administrasi & Proktor
  await prisma.user.create({
    data: {
      username: 'nailar',
      password: nailarPassword,
      name: 'Nailar (Administrator CBT)',
      role: Role.SUPERADMIN,
      nip: '199001012015011001',
    },
  });

  await prisma.user.create({
    data: {
      username: 'niam',
      password: niamPassword,
      name: 'Niam (Proktor CBT)',
      role: Role.PROKTOR,
      ruangUjian: 'Lab Komputer 1',
    },
  });

  // 5. Buat Topik / Mata Pelajaran Demo
  const mapelMtk = await prisma.mataPelajaran.create({
    data: {
      kode: 'MTK-XII',
      nama: 'Matematika Peminatan XII',
      tingkat: 12,
      jurusan: 'MIPA',
      durasiMenit: 90,
      kkm: 75.0,
    },
  });

  await prisma.mataPelajaran.create({
    data: { kode: 'BING-XII', nama: 'Bahasa Inggris XII', tingkat: 12, jurusan: 'UMUM' },
  });
  await prisma.mataPelajaran.create({
    data: { kode: 'AIK-XII', nama: 'Al-Islam & Kemuhammadiyahan XII', tingkat: 12, jurusan: 'UMUM' },
  });

  // 7. Buat Soal-soal Demo Beragam Tipe Langsung di dalam Topik / Mata Pelajaran
  // Soal 1: PG KaTeX Matematika
  await prisma.soal.create({
    data: {
      mataPelajaranId: mapelMtk.id,
      nomorUrut: 1,
      tipeSoal: TipeSoal.PG,
      pertanyaan: 'Nilai dari limit trigonometri berikut adalah:<br/><br/>$$\\lim_{x \\to 0} \\frac{\\sin(6x)}{2x} = \\dots$$',
      bobot: 2.0,
      opsiJawaban: {
        create: [
          { label: 'A', konten: '1', isBenar: false },
          { label: 'B', konten: '2', isBenar: false },
          { label: 'C', konten: '3', isBenar: true },
          { label: 'D', konten: '6', isBenar: false },
          { label: 'E', konten: '12', isBenar: false },
        ],
      },
    },
  });

  // Soal 2: PG KaTeX Turunan
  await prisma.soal.create({
    data: {
      mataPelajaranId: mapelMtk.id,
      nomorUrut: 2,
      tipeSoal: TipeSoal.PG,
      pertanyaan: 'Jika $f(x) = 3x^3 - 4x^2 + 5x - 7$, maka turunan pertama $f\'(x)$ pada saat $x = 2$ adalah...',
      bobot: 2.0,
      opsiJawaban: {
        create: [
          { label: 'A', konten: '21', isBenar: false },
          { label: 'B', konten: '25', isBenar: true },
          { label: 'C', konten: '27', isBenar: false },
          { label: 'D', konten: '31', isBenar: false },
          { label: 'E', konten: '35', isBenar: false },
        ],
      },
    },
  });

  // Soal 3: PG Konsep Sekolah & Kemuhammadiyahan / Transformasi
  await prisma.soal.create({
    data: {
      mataPelajaranId: mapelMtk.id,
      nomorUrut: 3,
      tipeSoal: TipeSoal.PG,
      pertanyaan: 'SMA Muhammadiyah 1 Ponorogo memiliki visi utama dalam mewujudkan generasi yang berakhlak mulia, unggul dalam prestasi, dan berkemajuan. Matriks transformasi pendidikan yang mencerminkan sifat refleksi terhadap sumbu-$y$ memiliki matriks operasi...',
      bobot: 2.0,
      opsiJawaban: {
        create: [
          { label: 'A', konten: '$$\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}$$', isBenar: false },
          { label: 'B', konten: '$$\\begin{pmatrix} -1 & 0 \\\\ 0 & 1 \\end{pmatrix}$$', isBenar: true },
          { label: 'C', konten: '$$\\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix}$$', isBenar: false },
          { label: 'D', konten: '$$\\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix}$$', isBenar: false },
          { label: 'E', konten: '$$\\begin{pmatrix} -1 & 0 \\\\ 0 & -1 \\end{pmatrix}$$', isBenar: false },
        ],
      },
    },
  });

  // Soal 4: PG Kompleks
  await prisma.soal.create({
    data: {
      mataPelajaranId: mapelMtk.id,
      nomorUrut: 4,
      tipeSoal: TipeSoal.PG_KOMPLEKS,
      pertanyaan: 'Pilihlah seluruh pernyataan yang <b>BENAR</b> terkait sifat-sifat integral tentu $\\int_{a}^{b} f(x)\\,dx$ berikut ini! *(Pilihan ganda kompleks: dapat memilih lebih dari satu)*',
      bobot: 2.0,
      opsiJawaban: {
        create: [
          { label: 'A', konten: '$$\\int_{a}^{a} f(x)\\,dx = 0$$', isBenar: true },
          { label: 'B', konten: '$$\\int_{a}^{b} f(x)\\,dx = -\\int_{b}^{a} f(x)\\,dx$$', isBenar: true },
          { label: 'C', konten: '$$\\int_{a}^{b} k\\cdot f(x)\\,dx = k \\int_{a}^{b} f(x)\\,dx$$ untuk konstanta $k$', isBenar: true },
          { label: 'D', konten: '$$\\int_{a}^{b} [f(x) \\cdot g(x)]\\,dx = \\int_{a}^{b} f(x)\\,dx \\cdot \\int_{a}^{b} g(x)\\,dx$$', isBenar: false },
        ],
      },
    },
  });

  // Soal 5: Benar / Salah
  await prisma.soal.create({
    data: {
      mataPelajaranId: mapelMtk.id,
      nomorUrut: 5,
      tipeSoal: TipeSoal.BENAR_SALAH,
      pertanyaan: 'Pernyataan: "Nilai dari $\\sin(90^\\circ) + \\cos(0^\\circ) = 2$". Apakah pernyataan ini Benar atau Salah?',
      bobot: 1.0,
      opsiJawaban: {
        create: [
          { label: 'A', konten: 'BENAR', isBenar: true },
          { label: 'B', konten: 'SALAH', isBenar: false },
        ],
      },
    },
  });

  // Soal 6: Isian Singkat
  await prisma.soal.create({
    data: {
      mataPelajaranId: mapelMtk.id,
      nomorUrut: 6,
      tipeSoal: TipeSoal.ISIAN,
      pertanyaan: 'Diketahui suku ke-3 barisan aritmatika adalah 11 dan suku ke-8 adalah 31. Tentukan beda ($b$) dari barisan tersebut! <i>(Ketikkan angka saja)</i>',
      kunciJawabanTeks: '4',
      bobot: 2.0,
    },
  });

  // Soal 7: Soal Essay / Uraian
  await prisma.soal.create({
    data: {
      mataPelajaranId: mapelMtk.id,
      nomorUrut: 7,
      tipeSoal: TipeSoal.ESAI,
      pertanyaan: 'Sebuah taman sekolah di SMA Muhammadiyah 1 Ponorogo berbentuk persegi panjang dengan keliling $80\\text{ meter}$. Tentukan ukuran panjang dan lebar taman tersebut agar menghasilkan luas taman yang maksimum! Tuliskan langkah-langkah perhitungannya secara lengkap.',
      kunciJawabanTeks: 'Panjang = 20 meter, Lebar = 20 meter, Luas Maksimum = 400 m2. Langkah: Keliling 2(p+l) = 80 => p+l = 40 => l = 40-p. Luas L(p) = p(40-p) = 40p - p^2. Turunan L\'(p) = 40 - 2p = 0 => p = 20 m.',
      bobot: 5.0,
    },
  });

  // 8. Buat Jadwal Ujian Aktif Langsung dari Topik / Mata Pelajaran
  const ujianMtk = await prisma.ujian.create({
    data: {
      kodeUjian: 'PAS-2026-MTK-12',
      judul: 'Penilaian Akhir Semester Ganjil 2026/2027 - Matematika XII',
      deskripsi: 'Ujian Matematika Wajib Kelas XII MIPA/IPS.',
      mataPelajaranId: mapelMtk.id,
      durasiMenit: 90,
      waktuMulai: new Date(),
      waktuSelesai: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acakSoal: true,
      acakOpsi: true,
      tampilkanHasil: false,
      lockBrowser: true,
      status: StatusUjian.SEDANG_BERJALAN,
    },
  });

  console.log('✅ Seeding berhasil selesai!');
  console.log('--- AKUN DEFAULT CBT MUHIPO ---');
  console.log('Administrasi : username=nailar, password=nailar (Hak Akses Penuh Super Admin)');
  console.log('Proktor      : username=niam, password=niam (Pengawasan Ujian & Reset Siswa)');
}

main()
  .catch((e) => {
    console.error('Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
