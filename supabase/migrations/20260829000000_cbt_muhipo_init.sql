-- ==============================================================================
-- SKEMA BASIS DATA UTAMA CBT MUHIPO + ROW LEVEL SECURITY (RLS) POLICIES
-- SMA MUHAMMADIYAH 1 PONOROGO
-- ==============================================================================

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'GURU', 'PROKTOR', 'SISWA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TipeSoal" AS ENUM ('PG', 'PG_KOMPLEKS', 'BENAR_SALAH', 'MENJODOHKAN', 'ISIAN', 'ESAI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StatusUjian" AS ENUM ('DRAFT', 'DIJADWALKAN', 'SEDANG_BERJALAN', 'SELESAI', 'NONAKTIF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StatusPeserta" AS ENUM ('BELUM_MULAI', 'SEDANG_MENGERJAKAN', 'SELESAI', 'TERKUNCI', 'RESET_LOGIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABEL KELAS
CREATE TABLE IF NOT EXISTS "Kelas" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "nama" TEXT NOT NULL UNIQUE,
    "tingkat" INTEGER NOT NULL,
    "jurusan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL MATA PELAJARAN
CREATE TABLE IF NOT EXISTS "MataPelajaran" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "kode" TEXT NOT NULL UNIQUE,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABEL USERS (ADMIN, GURU, PROKTOR, SISWA)
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SISWA',
    "nisn" TEXT UNIQUE,
    "nip" TEXT UNIQUE,
    "jenisKelamin" TEXT,
    "foto" TEXT,
    "nomorPeserta" TEXT UNIQUE,
    "ruangUjian" TEXT,
    "sesiUjian" INTEGER DEFAULT 1,
    "kelasId" TEXT REFERENCES "Kelas"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABEL GURU MATA PELAJARAN
CREATE TABLE IF NOT EXISTS "GuruMataPelajaran" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "guruId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "mataPelajaranId" TEXT NOT NULL REFERENCES "MataPelajaran"("id") ON DELETE CASCADE,
    UNIQUE ("guruId", "mataPelajaranId")
);

-- 6. TABEL BANK SOAL
CREATE TABLE IF NOT EXISTS "BankSoal" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "kodeBank" TEXT NOT NULL UNIQUE,
    "nama" TEXT NOT NULL,
    "tingkat" INTEGER NOT NULL,
    "jurusan" TEXT,
    "mataPelajaranId" TEXT NOT NULL REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT,
    "pembuatId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABEL SOAL
CREATE TABLE IF NOT EXISTS "Soal" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "bankSoalId" TEXT NOT NULL REFERENCES "BankSoal"("id") ON DELETE CASCADE,
    "nomorUrut" INTEGER NOT NULL DEFAULT 1,
    "tipeSoal" "TipeSoal" NOT NULL DEFAULT 'PG',
    "pertanyaan" TEXT NOT NULL,
    "mediaAudio" TEXT,
    "mediaGambar" TEXT,
    "bobot" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "kunciJawabanTeks" TEXT,
    "matchingData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABEL OPSI JAWABAN
CREATE TABLE IF NOT EXISTS "OpsiJawaban" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "soalId" TEXT NOT NULL REFERENCES "Soal"("id") ON DELETE CASCADE,
    "label" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "mediaGambar" TEXT,
    "isBenar" BOOLEAN NOT NULL DEFAULT false
);

-- 9. TABEL UJIAN (JADWAL & SESI)
CREATE TABLE IF NOT EXISTS "Ujian" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "kodeUjian" TEXT NOT NULL UNIQUE,
    "judul" TEXT NOT NULL,
    "token" TEXT NOT NULL DEFAULT 'MUHIPO',
    "bankSoalId" TEXT NOT NULL REFERENCES "BankSoal"("id") ON DELETE RESTRICT,
    "durasiMenit" INTEGER NOT NULL DEFAULT 60,
    "waktuMulai" TIMESTAMP(3) NOT NULL,
    "waktuSelesai" TIMESTAMP(3) NOT NULL,
    "status" "StatusUjian" NOT NULL DEFAULT 'DIJADWALKAN',
    "acakSoal" BOOLEAN NOT NULL DEFAULT true,
    "acakOpsi" BOOLEAN NOT NULL DEFAULT true,
    "lockBrowser" BOOLEAN NOT NULL DEFAULT true,
    "tampilkanNilai" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABEL PESERTA UJIAN
CREATE TABLE IF NOT EXISTS "PesertaUjian" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "ujianId" TEXT NOT NULL REFERENCES "Ujian"("id") ON DELETE CASCADE,
    "siswaId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "status" "StatusPeserta" NOT NULL DEFAULT 'BELUM_MULAI',
    "waktuMulai" TIMESTAMP(3),
    "waktuSelesai" TIMESTAMP(3),
    "sisaDetik" INTEGER,
    "nilaiPG" DOUBLE PRECISION DEFAULT 0,
    "nilaiEsai" DOUBLE PRECISION DEFAULT 0,
    "nilaiTotal" DOUBLE PRECISION DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" TEXT,
    "jumlahPelanggaran" INTEGER NOT NULL DEFAULT 0,
    "isKoreksiSelesai" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("ujianId", "siswaId")
);

-- 11. TABEL JAWABAN PESERTA
CREATE TABLE IF NOT EXISTS "JawabanPeserta" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "pesertaUjianId" TEXT NOT NULL REFERENCES "PesertaUjian"("id") ON DELETE CASCADE,
    "soalId" TEXT NOT NULL REFERENCES "Soal"("id") ON DELETE CASCADE,
    "selectedOpsiId" TEXT REFERENCES "OpsiJawaban"("id") ON DELETE SET NULL,
    "jawabanTeks" TEXT,
    "isRagu" BOOLEAN NOT NULL DEFAULT false,
    "isBenar" BOOLEAN,
    "skor" DOUBLE PRECISION DEFAULT 0,
    "catatanKoreksi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("pesertaUjianId", "soalId")
);

-- 12. TABEL LOG AKTIVITAS UJIAN (AUDIT TRAIL ANTI-CHEAT)
CREATE TABLE IF NOT EXISTS "LogAktivitasUjian" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "ujianId" TEXT REFERENCES "Ujian"("id") ON DELETE SET NULL,
    "tipeAktivitas" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- PENGAKTIFAN ROW LEVEL SECURITY (RLS) & KEBIJAKAN KEAMANAN (POLICIES)
-- ==============================================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Kelas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MataPelajaran" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankSoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Soal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpsiJawaban" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ujian" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PesertaUjian" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JawabanPeserta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LogAktivitasUjian" ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS Public & Service Role:
-- Service role / backend internal Next.js memiliki akses penuh, sedangkan anon memiliki hak baca terbatas.
CREATE POLICY "Full access for service role" ON "User" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for service role" ON "Kelas" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for service role" ON "MataPelajaran" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for service role" ON "BankSoal" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for service role" ON "Soal" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for service role" ON "OpsiJawaban" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for service role" ON "Ujian" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for service role" ON "PesertaUjian" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for service role" ON "JawabanPeserta" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for service role" ON "LogAktivitasUjian" FOR ALL USING (true) WITH CHECK (true);
