# 🏛️ CBT MUHIPO — SMA Muhammadiyah 1 Ponorogo
> Platform Computer Based Test (CBT) Modern, Tangguh, dan Terintegrasi Penuh dengan **SIMASMUH** (Sistem Informasi Manajemen Sekolah SMA Muhammadiyah 1 Ponorogo).

Dikembangkan dengan inspirasi alur kerja **ZyaCBT** & **Candy CBT / Indolat**, didukung oleh teknologi modern **Next.js (App Router)**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, **Tailwind CSS**, dan engine sinkronisasi data langsung dengan ekosistem **SIMASMUH**.

---

## 🚀 Fitur Integrasi SIMASMUH & Ekosistem CBT (Update 2026)

CBT MUHIPO terhubung secara real-time / batch langsung dengan database induk **SIMASMUH**:

1. **Sinkronisasi Otomatis 1-Klik (`clean-sync-simasmuh.ts` & Panel Admin)**:
   - **Data Siswa**: Mengimpor seluruh siswa aktif resmi dari SIMASMUH ke CBT.
   - **Autentikasi Berbasis NIS**: Akun login siswa secara otomatis menggunakan **Username = NIS** dan **Password = NIS** (atau PIN kustom).
   - **Rombel & Tingkat Kelas**: Memetakan kelas (MIPA/IPS, Kelas X, XI, XII) sesuai struktur SIMASMUH.
   - **Guru & Pengampu Mapel**: Mengimpor NIP, akun guru, dan mata pelajaran resmi.
   - **Pembersihan Data Otomatis**: Menghapus otomatis data dummy/sampel agar database CBT 100% konsisten dengan data sekolah.
2. **Arsitektur Multi-Layanan Terisolasi**:
   - Database **SIMASMUH**: Port `54322` (PostgreSQL / Supabase Docker)
   - Database **CBT MUHIPO**: Port `54332` (PostgreSQL / Supabase Docker)
   - Web App **CBT MUHIPO**: Port `3010` (Next.js Standalone / Dev)
   - **Prisma Studio (CBT)**: Port `5560`
   - **Supabase Studio (CBT)**: Port `54333`

---

## ⚡ Cara Menjalankan Aplikasi (1-Klik ala SIMASMUH)

Kelola, jalankan, pantau status, dan lakukan sinkronisasi dengan mudah menggunakan **Launcher Interaktif**:

### 1. Menggunakan File `.bat` (Windows Quick Launch)
Cukup **klik dua kali** file:
```cmd
JALANKAN_CBT.bat
```
Atau via Command Prompt / Terminal:
```cmd
.\JALANKAN_CBT.bat
```

### 2. Menggunakan PowerShell Launcher
```powershell
.\cbt.ps1
```

Opsi Direct CLI Parameter:
- Menjalankan mode dev: `.\cbt.ps1 -Mode dev`
- Menjalankan mode prod: `.\cbt.ps1 -Mode prod`
- Hentikan server: `.\cbt.ps1 -Mode stop`
- Restart server: `.\cbt.ps1 -Mode restart`
- Buka database explorer (Prisma Studio): `.\cbt.ps1 -Mode studio`
- Migrasi database: `.\cbt.ps1 -Mode push`
- Isi data awal / seed: `.\cbt.ps1 -Mode seed`

---

## 📋 Struktur Menu Manajemen (`cbt.ps1`)

```text
  +--------------------+--------------------------+
  |   STATUS LAYANAN CBT MUHIPO (DOCKER)         |
  +--------------------+--------------------------+
  | CBT Web App (Next) | AKTIF :3010              |
  | Supabase DB Docker | AKTIF :54332             |
  | Supabase Studio    | AKTIF :54333             |
  | Prisma Studio (ERD)| STANDBY :5560            |
  | Database Status    | TERHUBUNG                |
  +--------------------+--------------------------+

  [1] Mulai CBT (Mode Development)
  [2] Mulai CBT (Mode Production)
  [3] Restart Server CBT
  [4] Rebuild & Restart CBT (Full)
  [5] Hentikan Server CBT (Stop)
  [6] Jalankan Supabase Docker (:54332)
  [7] Stop Supabase Docker
  [8] Buka Supabase Studio (:54333) GUI
  [9] Buka Prisma Studio (:5560) ERD
  [10] Push Skema Database (db:push)
  [11] Seed Data Uji Coba (db:seed)
  [12] Build Aplikasi Saja (next build)
  [13] Buka Portal CBT di Browser (localhost:3010)
  [14] Lihat Log Server
  [0] Keluar
```

---

## 👥 Hak Akses & Kredensial Pengguna

### 1. Siswa (Data Resmi SIMASMUH)
- **Username**: NIS (Nomor Induk Siswa)
- **Password**: NIS
- **URL Akses**: `/login` atau `/siswa`

### 2. Akun Administratif & Pengajar
| Role | Username | Password | URL Akses | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Master** | `admin` | `admin123` | `/admin` | Manajemen penuh, Sinkronisasi SIMASMUH, Jadwal & Pengaturan |
| **Proktor** | `proktor1` | `123456` | `/proktor` | Rilis Token, Monitoring Live Peserta, Tambah Waktu, Reset Login |
| **Guru Pengampu** | *Sesuai akun SIMASMUH* / `guru_mtk` | `123456` | `/guru` | Bank Soal multi-tipe, Koreksi Essay, Ekspor Nilai Excel |

> 🔑 *Token Ujian Default Simulasi: `MUHIPO`*

---

## 🛠️ Fitur Utama Platform CBT MUHIPO

1. **Lembar Ujian Siswa Anti-Curang (Security Lockout)**:
   - Deteksi otomatis tab-switching & window blur (dengan limit pelanggaran & lockout otomatis).
   - Pencegahan Inspect Element, Klik Kanan, dan Shortcut DevTools.
   - Timer countdown terkalibrasi dengan server-time sync untuk mencegah manipulasi jam lokal.
   - Autosave jawaban realtime dengan indikator status sinkronisasi.
2. **Formula Matematika & Media Kaya**:
   - Dukungan rendering rumus **KaTeX / LaTeX** (pecahan, akar, limit, matriks, integral).
   - Dukungan audio listening interaktif & gambar soal terkompresi otomatis.
3. **Pusat Kendali Proktor**:
   - Live monitoring status peserta (Sedang Mengerjakan, Selesai, Terkunci, Reset).
   - Kontrol rilis Token dinamis berkala (tiap 15 menit / manual).
   - Fasilitas Reset Login & perpanjangan waktu per siswa.
4. **Portal Guru & Evaluasi Nilai**:
   - Multi-tipe soal: Pilihan Ganda (PG), PG Kompleks, Benar/Salah, Isian Singkat, dan Esai.
   - Rubrik penilaian esai & koreksi jawaban digital.
   - Ekspor rekapitulasi nilai dan analisis butir soal ke Excel (`.xlsx`).
5. **Panel Admin & Integrasi**:
   - Sinkronisasi instan dengan pangkalan data SIMASMUH.
   - Cetak Kartu Peserta Ujian, Denah Ruang, Daftar Hadir, dan Berita Acara Pelaksanaan Ujian (BAP).

---

## 📦 Skrip Sinkronisasi Mandiri

Untuk menjalankan sinkronisasi data SIMASMUH ke CBT secara manual via command line:
```bash
# Menggunakan tsx
npx tsx clean-sync-simasmuh.ts
```

---

## 📝 Changelog & Riwayat Pembaruan

### [v1.2.0] — 29 Agustus 2026
- **Sinkronisasi SIMASMUH Granular**:
  - Penambahan tombol **Tarik Data SIMASMUH** langsung pada area Data Guru, Daftar Kelas (Rombel), dan Daftar Mata Pelajaran di Admin Dashboard.
  - Penambahan backend endpoint `/api/sinkronisasi` untuk target selektif (`GURU`, `KELAS`, `MAPEL`, `SISWA`, `ALL`).
- **In-App Notification & Modal System**:
  - Migrasi menyeluruh dari popup bawaan browser (`alert()` / `confirm()`) ke **`NotificationModal`** kustom bergaya glassmorphism Tailwind & Lucide icons di Admin, Guru, dan Proktor.
- **Pembersihan Data Dummy & Real-Time Sync**:
  - Pembersihan total data dummy mata pelajaran; CBT kini secara nyata dan konsisten merefleksikan data aktual di database SIMASMUH.
- **Perbaikan Skema & Tipe Data**:
  - Penyesuaian konfigurasi Nilai Standar Bank Soal (KKM, Nilai Minimal, Nilai Maksimal) dan integrasi kalkulasi otomatis bobot butir soal.

---

© 2026 Muhipo Dev — SMA Muhammadiyah 1 Ponorogo. All rights reserved.
