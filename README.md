# 🎓 CBT MUHIPO — Platform Computer Based Test SMA Muhammadiyah 1 Ponorogo

[![Next.js](https://img.shields.io/badge/Next.js-16.3.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/SQLite-Zero--Config-003B57?style=for-the-badge&logo=sqlite)](https://www.sqlite.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

> **CBT MUHIPO** adalah sistem ujian berbasis komputer (*Computer Based Test*) yang cepat, aman, dan tangguh yang dirancang khusus untuk memenuhi kebutuhan asesmen digital di **SMA Muhammadiyah 1 Ponorogo**.

Platform ini beroperasi secara *standalone* menggunakan file database SQLite lokal tanpa ketergantungan pada server database eksternal, memudahkan instalasi dan operasional di jaringan LAN / Lab Komputer sekolah maupun jaringan terpusat.

---

## 📑 Daftar Isi
- [Fitur Utama Sistem](#-fitur-utama-sistem)
- [Teknologi & Arsitektur](#-teknologi--arsitektur)
- [Keamanan & Anti-Cheat Engine](#️-keamanan--anti-cheat-engine)
- [Panduan Instalasi & Menjalankan Server](#-panduan-instalasi--menjalankan-server)
- [Hak Akses & Kredensial Default](#-hak-akses--kredensial-default)
- [Struktur Direktori Proyek](#-struktur-direktori-proyek)
- [Changelog / Riwayat Pembaruan](#-changelog--riwayat-pembaruan)
- [Lisensi](#-lisensi)

---

## 🚀 Fitur Utama Sistem

### 1. 📖 Data Modul & Bank Soal
- **Manajemen Topik / Mata Pelajaran**: Pengelompokan bank soal terstruktur berdasarkan mata pelajaran dan jenjang kelas (Fase E / X, Fase F / XI & XII).
- **Editor Butir Soal Fleksibel**:
  - Pilihan Ganda (opsi A sampai E dengan penentuan kunci jawaban).
  - Soal Uraian / Essay dengan rubrik penskoran.
  - Dukungan penulisan rumus matematika dan sains menggunakan **LaTeX / KaTeX**.
  - Media interaktif (lampiran gambar dan audio listening).
- **Import & Export Massal**: Fitur import ratusan soal dari template Microsoft Excel (.xlsx) dengan validasi format otomatis.
- **File Manager Terintegrasi**: Unggah gambar dan audio pendukung soal dengan tombol salin tautan instan.

### 2. 👥 Data Peserta & Rombongan Belajar
- **Manajemen Kelas / Rombel**: Pengelompokan rombongan belajar terpadu.
- **Daftar Peserta Ujian**: Kelola data siswa, nomor peserta, ruang ujian, dan sesi ujian.
- **Import Peserta Excel**: Impor data massal siswa langsung menjadi akun ujian siap pakai.
- **Kartu Peserta**: Generator dan cetak kartu ujian siswa siap cetak (A4/F4).

### 3. 📝 Manajemen Tes & Ujian
- **Konfigurasi Tes Dinamis**: Pengaturan nama ujian, alokasi bank soal, jadwal mulai/selesai, durasi pengerjaan, token aktivasi, dan alokasi kelas peserta.
- **Generator Token Ujian**: Pembuatan token dinamis 6 karakter dan pembaruan token instan saat ujian berlangsung.
- **Evaluasi & Penilaian**:
  - Penilaian otomatis untuk soal pilihan ganda.
  - Antarmuka koreksi cepat untuk jawaban essay/uraian siswa.
  - Perhitungan nilai akhir dan status ketuntasan KKM.
- **Rekapitulasi Nilai Excel**: Ekspor rekap nilai per kelas atau seluruh peserta ke format Microsoft Excel (.xlsx).

### 4. 📡 Pengawasan Live (Proktor) & Cetak Dokumen
- **Live CCTV & Multi-Screen Monitoring**: Pantau aktivitas layar, waktu tersisa, dan indikator status siswa secara real-time.
- **Aksi Proktor Terpusat**:
  - *Reset Login*: Buka kunci akun siswa yang mengalami kendala perangkat/browser.
  - *Tambah Waktu*: Berikan waktu tambahan pengerjaan secara personal kepada siswa.
  - *Reset Pelanggaran*: Reset hitungan pelanggaran anti-cheat jika diizinkan pengawas.
- **Cetak Dokumen Resmi Ujian**:
  - Kartu Peserta Ujian.
  - Daftar Hadir Peserta per Ruang & Sesi.
  - Berita Acara Pelaksanaan Ujian.
  - Rekapitulasi Daftar Nilai.

---

## 🛠️ Teknologi & Arsitektur

| Komponen | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3 (App Router) | Server-side rendering dan Route Handlers yang cepat & modern |
| **Frontend** | React 19 + TypeScript | UI interaktif, type-safe, dan modular |
| **Styling** | Tailwind CSS v4 | Desain antarmuka responsif dan clean |
| **Database** | SQLite + Prisma ORM 5.22 | Penyimpanan database lokal bebas konfigurasi (*zero-config*) |
| **Keamanan Server** | Custom Node.js Server (`server.js`) | Dual-listener: Port 443 (HTTPS) & Port 80 (HTTP Auto-Redirect) |
| **Sertifikat SSL** | `selfsigned` | Otomatis men-generate sertifikat TLS untuk localhost dan seluruh IP lokal |
| **Matematika/Formula** | KaTeX | Render notasi matematika & sains instan di browser |
| **Spreadsheet** | ExcelJS & XLSX | Generator dan parser data Excel untuk soal, peserta, dan rekap nilai |

---

## 🛡️ Keamanan & Anti-Cheat Engine

CBT MUHIPO dilengkapi dengan sistem pengamanan berlapis untuk menjamin integritas ujian:

1. **Deteksi Perpindahan Tab (*Tab Switch Violation*)**: Mendeteksi saat peserta membuka tab baru atau beralih ke tab lain.
2. **Deteksi Perpindahan Aplikasi (*App Switch Violation*)**: Mendeteksi saat jendela browser kehilangan fokus (*blur*), penggunaan `Alt+Tab`, atau membuka aplikasi lain di luar browser.
3. **Deteksi Layar Penuh (*Fullscreen Exit Violation*)**: Memastikan siswa tetap berada di mode layar penuh selama ujian.
4. **Proteksi Keyboard & DevTools**: Memblokir tombol pintas berbahaya seperti `F12`, `Ctrl+Shift+I`, `Ctrl+U`, `Ctrl+P`, dan klik kanan (*context menu*).
5. **Batas Toleransi & Auto-Lock**: Toleransi maksimal **5 kali pelanggaran**. Jika terlampaui, akun ujian otomatis terkunci dan hanya dapat dibuka oleh Proktor.
6. **Alarm Suara & Buzzer**: Peringatan suara otomatis dalam Bahasa Indonesia menggunakan Web Speech API dan peringatan nada buzzer.
7. **Bukti Audit Snapshot Layar**: Pengambilan tangkapan layar otomatis saat pelanggaran terjadi sebagai bukti bagi pengawas/proktor.
8. **Secure Context HTTPS Enforced**: Mengaktifkan protokol HTTPS secara mandiri agar API browser modern seperti *Screen Sharing* (`getDisplayMedia`) di Google Chrome berfungsi tanpa kendala perizinan.

---

## ⚡ Panduan Instalasi & Menjalankan Server

### 1. Persyaratan Sistem
- **Sistem Operasi**: Windows 10 / Windows 11 / Windows Server (atau Linux/macOS)
- **Node.js**: v18.x, v20.x, atau versi LTS terbaru ([Download Node.js](https://nodejs.org/))
- **Web Browser**: Google Chrome (Sangat direkomendasikan), Microsoft Edge, atau Mozilla Firefox

### 2. Instalasi & Setup Database (1-Klik di Windows)
Cukup jalankan berkas batch yang telah disediakan:
```cmd
setup-cbt-windows.bat
```
*Skrip ini akan otomatis melakukan instalasi dependensi, migrasi skema SQLite (`dev.db`), dan menanamkan data awal (seeding).*

### 3. Menjalankan Server CBT
Jalankan berkas peluncur server:
```cmd
start-cbt-server.bat
```
Atau melalui PowerShell:
```powershell
.\cbt.ps1
```

Server akan aktif pada:
- **HTTPS (Port 443)**: `https://localhost` atau `https://[IP_SERVER]` *(Utama)*
- **HTTP (Port 80)**: `http://localhost` *(Otomatis dialihkan ke HTTPS)*

> 💡 **Akses Komputer Klien (Siswa & Proktor):**
> Komputer siswa cukup membuka browser dan mengakses alamat IP Server: `https://[IP_SERVER]` (contoh: `https://192.168.1.100`).

---

## 🔑 Hak Akses & Kredensial Default

| Role | Username Default | Password Default | URL Halaman | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `nailar` | `nailar` | `/admin` | Akses penuh ke seluruh modul, bank soal, peserta, tes, cetak dokumen, dan pengaturan |
| **Proktor (Pengawas)** | `niam` | `niam` | `/proktor` | Akses pengawasan langsung, CCTV layar siswa, reset login, dan penambahan waktu |

---

## 📂 Struktur Direktori Proyek

```plaintext
cbt-muhipo/
├── prisma/
│   ├── schema.prisma         # Definisi skema database Prisma (SQLite)
│   ├── seed.ts               # Data awal (Admin, Proktor, Mata Pelajaran)
│   └── dev.db                # File basis data SQLite lokal
├── public/
│   ├── uploads/              # Direktori penyimpanan media (gambar/audio)
│   └── ...                   # Aset statis & logo
├── src/
│   ├── app/
│   │   ├── admin/            # Panel Administrasi (Modul, Peserta, Tes, Cetak)
│   │   ├── proktor/          # Panel Pengawasan Proktor & CCTV Live View
│   │   ├── ujian/            # Halaman pengerjaan ujian siswa & Anti-Cheat
│   │   ├── api/              # Route Handlers / API Backend
│   │   └── page.tsx          # Halaman login siswa & otentikasi
│   ├── components/           # Komponen UI bersama
│   └── lib/                  # Utilitas, Prisma client, dan helper keamanan
├── server.js                 # Standalone HTTPS & HTTP Redirect Server
├── start-cbt-server.bat      # Script batch peluncuran server
├── setup-cbt-windows.bat     # Script batch instalasi & setup
├── cbt.ps1                   # Script launcher PowerShell
├── package.json              # Daftar dependensi & npm scripts
└── README.md                 # Dokumentasi proyek
```

---

## 📋 Changelog / Riwayat Pembaruan

### 📌 Versi 2.4.0
- **Fitur Keamanan Anti-Cheat**:
  - Penambahan deteksi pergantian aplikasi / `Alt+Tab` / kehilangan fokus jendela browser (`APP_SWITCH_ALERT`).
  - Penyesuaian batas maksimal pelanggaran menjadi **5 kali pelanggaran** sebelum akun ujian terkunci otomatis (*Auto-Lock*).
  - Snapshot tangkapan layar otomatis dikirim ke server saat terjadi pelanggaran sebagai bukti audit.
- **Server Mandiri Berbasis HTTPS (Port 443)**:
  - Pembuatan `server.js` standalone dengan dukungan port 443 (HTTPS) dan auto-redirect dari port 80 (HTTP).
  - Otomatis membuat sertifikat SSL/TLS mandiri (*self-signed certificate*) mencakup `localhost`, `127.0.0.1`, dan seluruh IP adapter jaringan lokal.
  - Memastikan *Secure Context* aktif sehingga fitur *Screen Sharing* Google Chrome (`getDisplayMedia`) tidak terblokir di komputer siswa.
- **Dashboard & CCTV Proktor**:
  - Antarmuka CCTV grid multi-layar dengan filter kelas, pencarian siswa, status pengerjaan, dan visualisasi log pelanggaran.
  - Aksi reset login dan reset pelanggaran instan.
- **Manajemen & Skrip Sistem**:
  - Peningkatan skrip peluncur server `start-cbt-server.bat` dan `cbt.ps1`.
  - Pembaruan akun default Administrator (`nailar`) dan Proktor (`niam`).

### 📌 Versi 2.3.0
- **Integrasi Bank Soal & Formula**:
  - Implementasi rendering rumus matematika/sains dengan KaTeX.
  - Dukungan media audio untuk soal listening bahasa dan media gambar beresolusi tinggi.
  - Template import & export soal berbasis Microsoft Excel dengan validasi tipe soal.
- **Cetak Dokumen Ujian**:
  - Fitur cetak Kartu Peserta Ujian, Daftar Hadir Peserta, Berita Acara, dan Rekap Nilai Ujian format siap cetak.

### 📌 Versi 2.2.0
- **Migrasi Database SQLite Standalone**:
  - Pengalihan penyimpanan ke SQLite lokal (`dev.db`) dengan Prisma ORM untuk memastikan operasi *zero-configuration* tanpa instalasi server database eksternal.
  - Dukungan pencadangan (*backup*) dan pemulihan (*restore*) data database & file media secara mandiri.

### 📌 Versi 2.1.0
- **Manajemen Tes & Penilaian**:
  - Penambahan timer tersinkronisasi server untuk mencegah manipulasi waktu lokal.
  - Fitur penilaian otomatis soal pilihan ganda dan antarmuka evaluasi soal essay/uraian.
  - Ekspor rekapitulasi nilai lengkap ke format Excel (.xlsx).

### 📌 Versi 2.0.0
- **Inisialisasi Arsitektur Next.js (App Router)**:
  - Rekonstruksi arsitektur aplikasi menggunakan Next.js App Router, React 19, TypeScript, dan Tailwind CSS.
  - Pemisahan hak akses berbasis peran (Admin, Proktor, Siswa).

---

## 📄 Lisensi & Hak Cipta

Copyright &copy; 2026 **MUHIPO DEV**. Hak Cipta dilindungi undang-undang (*All rights reserved*). Dilindungi di bawah lisensi [MIT License](LICENSE).
