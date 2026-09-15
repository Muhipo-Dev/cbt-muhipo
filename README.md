# CBT MUHIPO — Platform Computer Based Test (CBT) Mandiri SMA Muhammadiyah 1 Ponorogo

> Platform Computer Based Test (CBT) Mandiri, Cepat, dan Tangguh SMA Muhammadiyah 1 Ponorogo.

Dikembangkan dengan alur kerja modern berbasis **Next.js (App Router)**, **TypeScript**, **SQLite**, **Prisma ORM**, dan **Tailwind CSS**. Sistem beroperasi 100% mandiri (*standalone*) dengan database file lokal tanpa perlu menginstall server database terpisah.

---

## 🚀 Fitur Utama Sistem CBT Mandiri MUHIPO

### 1. 📖 Data Modul
- **Topik / Bank Soal**: Buat, edit, dan kelola topik bank soal per mata pelajaran & tingkat kelas (X, XI, XII).
- **Input Soal**: Form butir soal fleksibel (Pilihan Ganda A-E, Essay/Uraian) dilengkapi pratinjau LaTeX/KaTeX dan media (gambar/audio).
- **Import Soal Excel**: Impor ratusan butir soal secara massal dengan file template Excel standar.
- **Daftar Soal**: Kelola, filter, cari, pratinjau, dan hapus butir soal pada setiap topik bank soal.
- **File Manager**: Upload dan kelola gambar/audio untuk soal dengan tombol instan salin tautan file.

### 2. 👥 Data Peserta
- **Daftar Group**: Manajemen rombongan belajar (Rombel / Kelas) seperti X-1, XI MIPA 1, XII IPS 2, dll.
- **Daftar Peserta**: Manajemen akun siswa (NIS, NISN, Username, Password, Sesi Ujian, Ruang Ujian).
- **Import Data Peserta**: Impor data peserta massal dari file Excel dengan pembuatan akun instan.

### 3. 📝 Data Tes
- **Tambah Tes**: Form pembuatan tes baru (Nama Tes, Bank Soal, Waktu Mulai, Waktu Selesai, Durasi Menit, Token, dan Alokasi Kelas Peserta).
- **Daftar Tes**: Manajemen status tes (Aktif, Selesai, Arsip) dan aktivasi ujian.
- **Evaluasi Tes**: Penilaian dan koreksi jawaban uraian / essay siswa secara terperinci.
- **Hasil Tes**: Pantau nilai real-time siswa (Nilai PG, Nilai Essay, Total Nilai, dan Ketuntasan KKM).
- **Rekap Hasil Tes**: Ekspor rekapitulasi nilai seluruh peserta ke format Microsoft Excel (.xlsx) per kelas atau keseluruhan.
- **Token Ujian**: Generator token acak 6 digit dan pembaruan token instan untuk peserta ujian.

### 4. 📡 Pengawasan Live (Proktor) & Cetak Dokumen
- **Live Monitoring**: Pantau status pengerjaan, waktu tersisa, dan log pelanggaran tab/layar siswa secara real-time.
- **Reset Login**: Buka kunci peserta yang mengalami kendala browser/perangkat agar dapat melanjutkan ujian.
- **Tambah Waktu**: Berikan waktu tambahan pengerjaan secara langsung kepada peserta tertentu.
- **Cetak Dokumen**: Cetak Kartu Peserta Ujian, Daftar Hadir, Berita Acara Pelaksanaan, dan Rekapitulasi Nilai.

---

## ⚡ Cara Menjalankan Aplikasi di Server Windows 10 (Zero Config / Tanpa Install DB Server)

### 1. Persyaratan Sistem:
- **Node.js**: v18.x / v20.x atau lebih baru (Download installer Windows `.msi` dari nodejs.org)
- **Database**: SQLite bawaan (File `dev.db` otomatis dibuat dan siap pakai tanpa install software database server tambahan).

### 2. Langkah Setup Instan (1-Klik):
```bash
# Cukup klik dua kali berkas 'setup-cbt-windows.bat' atau jalankan via terminal:
setup-cbt-windows.bat
```
Skrip ini akan otomatis:
1. Membangun file dan skema database (`npx prisma db push`).
2. Menanamkan akun Super Admin, Proktor, Guru, dan Siswa demo (`npx tsx prisma/seed.ts`).

### 3. Menjalankan Server CBT:
```bash
# Klik dua kali berkas 'start-cbt-server.bat' atau jalankan:
start-cbt-server.bat
```
Server akan aktif di port utama `http://localhost` (dan dapat diakses seluruh komputer klien/lab via `http://[IP_SERVER]` tanpa perlu mengetikkan nomor port).

---

## 🔑 Hak Akses Default (Role)

| Role | Username Default | Password Default | Halaman | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| **Administrasi (Super Admin)** | `nailar` | `nailar` | `/admin` | Manajemen penuh Data Modul, Data Peserta, Data Tes, Token, Proktor & Pengaturan |
| **Proktor (Pengawas Lab)** | `niam` | `niam` | `/proktor` | Pengawasan Ujian, Reset Login Peserta, Tambah Waktu & Monitoring |

---

## 🛡️ Keamanan & Integritas Ujian
- **Anti-Cheat Engine Komprehensif**:
  - Deteksi perpindahan tab browser (*Tab Switch Violation*).
  - Deteksi perpindahan aplikasi / jendela tidak fokus / `Alt+Tab` (*App Switch Violation*).
  - Deteksi keluar dari mode layar penuh (*Fullscreen Exit*).
  - Proteksi tombol pintas keyboard (F12, Inspect Element, DevTools, Ctrl+U, Print, dll.).
  - Batas toleransi maksimal **5x pelanggaran** dengan penguncian akun otomatis (*Auto-Lock*).
  - Alarm suara Bahasa Indonesia via Web Speech API & Web Audio Synthesizer buzzer.
- **Dual-Engine Live Screen Monitoring (Proktor)**:
  - Streaming layar native Google Chrome via `getDisplayMedia` pada Desktop PC/Laptop.
  - Active Canvas Fallback State Real-time untuk perangkat mobile (Android & iOS).
  - Snapshot tangkapan layar otomatis saat terjadi pelanggaran sebagai bukti audit pengawas.
- **Secure Context HTTPS Enforced**:
  - Server otomatis berjalan di **Port 443 (HTTPS)** dengan sertifikat SSL/TLS mandiri.
  - Port 80 secara otomatis mengalihkan (*auto-redirect*) ke HTTPS.
- Auto-save jawaban ke database setiap kali memilih opsi atau berpindah nomor.
- Timer sinkron dengan waktu server untuk mencegah manipulasi jam lokal pada perangkat peserta.

---

## 📋 Changelog / Riwayat Pembaruan

### Versi 2.4.0 (Terbaru)
- **Anti-Cheat Engine**:
  - Penambahan deteksi pergantian aplikasi / `Alt+Tab` / jendela blur (`APP_SWITCH_ALERT`).
  - Penyesuaian batas maksimal pelanggaran menjadi **5 kali pelanggaran** sebelum akun ujian terkunci otomatis.
  - Pengambilan foto bukti snapshot layar otomatis saat pelanggaran terjadi.
- **Secure HTTPS Server**:
  - Penambahan `server.js` standalone dengan dukungan HTTPS Port 443 dan HTTP Port 80 Auto-Redirect.
  - Generator sertifikat SSL/TLS mandiri otomatis mencakup `localhost`, `127.0.0.1`, dan semua alamat IP jaringan lokal.
  - Pengaktifan Secure Context agar fitur *Share Screen* (`getDisplayMedia`) Google Chrome client berjalan lancar tanpa terblokir.
- **Dashboard & Monitoring Proktor**:
  - Pembaruan `ProktorLiveView` CCTV grid multi-layar dengan filter kelas, pencarian siswa, dan visualisasi bukti audit pelanggaran.
  - Sinkronisasi realtime status ujian dan aksi reset login / reset pelanggaran.
- **Manajemen Data & Backup**:
  - Fitur Backup & Restore Database SQLite dan berkas unggahan media.
  - Peningkatan sistem alokasi bank soal dan modul tingkat kelas (X, XI, XII).
  - Skrip pengontrol server `start-cbt-server.bat` dan `cbt.ps1` yang diperbarui.

