import { PrismaClient, Role, TipeSoal, StatusUjian, StatusPeserta } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database CBT SMA Muhammadiyah 1 Ponorogo...');

  // 1. Bersihkan data lama jika ada
  await prisma.jawabanPeserta.deleteMany();
  await prisma.logAktivitasUjian.deleteMany();
  await prisma.pesertaUjian.deleteMany();
  await prisma.opsiJawaban.deleteMany();
  await prisma.soal.deleteMany();
  await prisma.ujian.deleteMany();
  await prisma.bankSoal.deleteMany();
  await prisma.guruMataPelajaran.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.user.deleteMany();
  await prisma.kelas.deleteMany();

  // 2. Hash Password Default
  const hashedPassword = await bcrypt.hash('123456', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

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

  // 4. Buat Akun Admin & Proktor
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: adminPassword,
      name: 'Administrator CBT Muhipo',
      role: Role.ADMIN,
      nip: '198501012010011001',
    },
  });

  const proktor = await prisma.user.create({
    data: {
      username: 'proktor1',
      password: hashedPassword,
      name: 'Proktor Lab Komputer 1',
      role: Role.PROKTOR,
      ruangUjian: 'Lab Komputer 1',
    },
  });

  // 5. Buat Akun Guru & Mapel
  const mapelMtk = await prisma.mataPelajaran.create({
    data: { kode: 'MTK-XII', nama: 'Matematika Peminatan XII' },
  });
  const mapelBing = await prisma.mataPelajaran.create({
    data: { kode: 'BING-XII', nama: 'Bahasa Inggris XII' },
  });
  const mapelAi = await prisma.mataPelajaran.create({
    data: { kode: 'AIK-XII', nama: 'Al-Islam & Kemuhammadiyahan XII' },
  });

  const guruMtk = await prisma.user.create({
    data: {
      username: 'guru_mtk',
      password: hashedPassword,
      name: 'Drs. H. Ahmad Dahlan, M.Pd',
      role: Role.GURU,
      nip: '197505122000031002',
      mataPelajaran: {
        create: { mataPelajaranId: mapelMtk.id },
      },
    },
  });

  // 6. Buat Akun Siswa Demo
  const siswa1 = await prisma.user.create({
    data: {
      username: 'siswa01',
      password: hashedPassword,
      name: 'Muhammad Farhan Ramadhan',
      role: Role.SISWA,
      nisn: '0061234567',
      nomorPeserta: 'MHP-2026-001',
      jenisKelamin: 'L',
      kelasId: kelas12A.id,
      ruangUjian: 'Lab Komputer 1',
      sesiUjian: 1,
    },
  });

  const siswa2 = await prisma.user.create({
    data: {
      username: 'siswa02',
      password: hashedPassword,
      name: 'Aisyah Putri Azzahra',
      role: Role.SISWA,
      nisn: '0067654321',
      nomorPeserta: 'MHP-2026-002',
      jenisKelamin: 'P',
      kelasId: kelas12A.id,
      ruangUjian: 'Lab Komputer 1',
      sesiUjian: 1,
    },
  });

  // 7. Buat Bank Soal Matematika
  const bankSoalMtk = await prisma.bankSoal.create({
    data: {
      kodeBank: 'BS-MTK-XII-PAS-2026',
      nama: 'Bank Soal PAS Matematika Kelas XII',
      tingkat: 12,
      jurusan: 'MIPA',
      mataPelajaranId: mapelMtk.id,
      pembuatId: guruMtk.id,
    },
  });

  // 8. Buat Soal-soal Demo Beragam Tipe (PG, PG Kompleks, KaTeX Math, Esai, dsb)
  // Soal 1: PG KaTeX Matematika
  await prisma.soal.create({
    data: {
      bankSoalId: bankSoalMtk.id,
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
      bankSoalId: bankSoalMtk.id,
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

  // Soal 3: PG Konsep Sekolah & Kemuhammadiyahan / Umum
  await prisma.soal.create({
    data: {
      bankSoalId: bankSoalMtk.id,
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

  // Soal 4: PG Kompleks (Centang lebih dari 1)
  await prisma.soal.create({
    data: {
      bankSoalId: bankSoalMtk.id,
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
      bankSoalId: bankSoalMtk.id,
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
      bankSoalId: bankSoalMtk.id,
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
      bankSoalId: bankSoalMtk.id,
      nomorUrut: 7,
      tipeSoal: TipeSoal.ESAI,
      pertanyaan: 'Sebuah taman sekolah di SMA Muhammadiyah 1 Ponorogo berbentuk persegi panjang dengan keliling $80\\text{ meter}$. Tentukan ukuran panjang dan lebar taman tersebut agar menghasilkan luas taman yang maksimum! Tuliskan langkah-langkah perhitungannya secara lengkap.',
      kunciJawabanTeks: 'Panjang = 20 meter, Lebar = 20 meter, Luas Maksimum = 400 m2. Langkah: Keliling 2(p+l) = 80 => p+l = 40 => l = 40-p. Luas L(p) = p(40-p) = 40p - p^2. Turunan L\'(p) = 40 - 2p = 0 => p = 20 m.',
      bobot: 5.0,
    },
  });

  // 9. Buat Jadwal Ujian Aktif
  const ujianMtk = await prisma.ujian.create({
    data: {
      kodeUjian: 'PAS-2026-MTK-12',
      judul: 'Penilaian Akhir Semester Ganjil 2026/2027 - Matematika XII',
      deskripsi: 'Ujian Matematika Wajib Kelas XII MIPA/IPS.',
      bankSoalId: bankSoalMtk.id,
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

  // 10. Daftarkan Peserta Ujian
  await prisma.pesertaUjian.create({
    data: {
      ujianId: ujianMtk.id,
      siswaId: siswa1.id,
      status: StatusPeserta.BELUM_MULAI,
    },
  });

  await prisma.pesertaUjian.create({
    data: {
      ujianId: ujianMtk.id,
      siswaId: siswa2.id,
      status: StatusPeserta.BELUM_MULAI,
    },
  });

  console.log('✅ Seeding berhasil selesai!');
  console.log('--- AKUN DEFAULT UNTUK TESTING ---');
  console.log('Admin   : username=admin, password=admin123');
  console.log('Proktor : username=proktor1, password=123456');
  console.log('Guru    : username=guru_mtk, password=123456');
  console.log('Siswa 1 : username=siswa01 (NISN: 0061234567, No: MHP-2026-001), password=123456');
  console.log('Siswa 2 : username=siswa02 (NISN: 0067654321, No: MHP-2026-002), password=123456');
  console.log('Token Ujian: MUHIPO');
}

main()
  .catch((e) => {
    console.error('Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
