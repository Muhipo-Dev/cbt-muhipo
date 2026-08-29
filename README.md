# 🏛️ CBT MUHIPO — SMA Muhammadiyah 1 Ponorogo
> Platform Computer Based Test (CBT) Modern, Tangguh, dan Terintegrasi untuk SMA Muhammadiyah 1 Ponorogo.

Dikembangkan dengan inspirasi alur kerja **ZyaCBT** & **Candy CBT / Indolat**, didukung oleh teknologi modern **Next.js (App Router)**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, dan **Tailwind CSS**.

---

## ⚡ Cara Menjalankan Aplikasi (1-Klik ala SIMASMUH)

Anda dapat mengelola, menjalankan, memantau status, dan me-maintain aplikasi dengan sangat mudah menggunakan **Launcher Interaktif**:

### 1. Menggunakan File `.bat` (Direkomendasikan di Windows)
Cukup **klik dua kali** file:
```
JALANKAN_CBT.bat
```
Atau via terminal:
```cmd
.\JALANKAN_CBT.bat
```

### 2. Menggunakan PowerShell Langsung
```powershell
.\cbt.ps1
```
Atau dengan parameter langsung (*Direct CLI*):
- Menjalankan mode dev: `.\cbt.ps1 -Mode dev`
- Menjalankan mode prod: `.\cbt.ps1 -Mode prod`
- Hentikan server: `.\cbt.ps1 -Mode stop`
- Restart server: `.\cbt.ps1 -Mode restart`
- Buka database explorer: `.\cbt.ps1 -Mode studio`
- Migrasi database: `.\cbt.ps1 -Mode push`
- Isi data awal: `.\cbt.ps1 -Mode seed`

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

## 👥 Akun Akses Default untuk Simulasi

| Role | Username / NISN | Password | URL Akses |
| :--- | :--- | :--- | :--- |
| **Siswa 1** | `siswa01` / `0061234567` | `123456` | `/siswa` |
| **Siswa 2** | `siswa02` / `0067654321` | `123456` | `/siswa` |
| **Proktor** | `proktor1` | `123456` | `/proktor` |
| **Guru** | `guru_mtk` | `123456` | `/guru` |
| **Admin** | `admin` | `admin123` | `/admin` |

*Token Ujian Default Simulasi: `MUHIPO`*

---

## 🛠️ Fitur Utama CBT
1. **Lembar Ujian Siswa Anti-Curang**: Deteksi tab-switch, blokir inspect element, timer countdown server-sync, grid navigasi warna status, dan auto-save realtime.
2. **Dukungan Rumus KaTeX / LaTeX**: Rendering matematika kompleks (limit, matriks, turunan, integral) & audio listening.
3. **Ruang Proktor**: Live monitor peserta, rilis token ujian, reset login siswa, dan tambah waktu.
4. **Portal Guru**: Bank Soal multi-tipe (PG, PG Kompleks, Benar/Salah, Isian, Esai), koreksi essay, dan ekspor rekap nilai Excel.
5. **Admin Master**: Manajemen Kelas, Siswa, Jadwal, dan cetak kartu ujian / berita acara.

© 2026 Muhipo Dev — SMA Muhammadiyah 1 Ponorogo.
