# PANDUAN DEPLOYMENT & INSTALASI CBT v2 SMA MUHIPO
## Lingkungan Target: Windows Server 2025 / Windows Server 2022 Desktop / Windows 11

Dokumen ini memandu langkah demi langkah menyiapkan dan menjalankan CBT v2 SMA Muhipo dari kondisi server baru (Fresh Install OS) hingga siap melayani ratusan peserta ujian secara stabil dan aman.

---

### 🌐 Gambaran Arsitektur Port
- **CBT Web App & API**: Port **4020** (HTTP Standalone Server Node.js)
  - URL Proktor / Siswa / Admin: `http://[IP_SERVER]:4020`
  - URL Server Lokal: `http://localhost:4020`
- **Prisma Studio (GUI Database)**: Port **5560** (`http://localhost:5560`)
- **PostgreSQL Database**: Port **5432** (Standard) atau port kustom (misal: 54322)
- *(Catatan)*: Sistem CBT v1 (ZyaCBT) tetap dapat beroperasi paralel pada port **4010** tanpa bentrok sama sekali.

---

### 🚀 Cara Cepat (Automated 1-Click Installer)

1. Salin atau clone folder `cbt-muhipo` ke server (misal ke `D:\cbt-muhipo` atau `C:\cbt-muhipo`).
2. Klik kanan file:
   **`INSTALL_WINDOWS_SERVER.bat`** -> Pilih **"Run as Administrator"**.
3. Wizard otomatis akan melakukan:
   - ✅ Pemeriksaan & instalasi otomatis **Node.js LTS** & NPM.
   - ✅ Pemeriksaan layanan **PostgreSQL** (port 5432 / 54322) & pembuatan database `cbt_muhipo`.
   - ✅ Pembuatan konfigurasi `.env` otomatis.
   - ✅ Eksekusi `npm install` (dependensi backend & frontend).
   - ✅ Sinkronisasi skema database via Prisma (`prisma db push & seed` akun superadmin).
   - ✅ Kompilasi Next.js 16 Production Build (`npm run build`).
   - ✅ Pembukaan otomatis Port **4020** & **5560** pada Windows Defender Firewall.
4. Selesai! Server CBT siap digunakan.

---

### 🖥️ Menjalankan & Mengelola Server Sehari-hari

Cukup klik ganda:
**`JALANKAN_CBT.bat`**
*(Atau buka terminal PowerShell: `.\cbt.ps1`)*

Menu interaktif menyediakan:
- `[1]` Jalankan Semua Layanan (CBT Web App di Port 4020 + Prisma Studio di Port 5560)
- `[2]` Hentikan Semua Layanan
- `[3]` Jalankan CBT Web App Saja (:4020)
- `[4]` Jalankan Prisma Studio GUI (:5560)
- `[5]` Restart CBT Web App (:4020)
- `[6]` Restart Database PostgreSQL
- `[7]` Restart Semua Layanan (Full)
- `[8]` Rebuild & Restart CBT (Kompilasi Ulang)
- `[9]` Inisialisasi Database (Push + Seed)
- `[10]` Buka Browser CBT Web App (`http://localhost:4020`)

---

### 🔑 Kredensial Default Awal
- **URL Admin**: `http://localhost:4020/admin` atau `http://[IP_SERVER]:4020/admin`
- **Username**: `nailar`
- **Password**: `nailar`

---

### 🛡️ Catatan Tambahan Khusus Windows Server 2025:
1. **Firewall**: Jika siswa tidak bisa mengakses alamat IP server dari jaringan LAN Lab, pastikan aturan Inbound Rule TCP Port `4020` berstatus Allow (sudah ditangani otomatis oleh `INSTALL_WINDOWS_SERVER.bat`).
2. **IP Statis Server**: Sangat disarankan mengatur kartu jaringan (NIC) Windows Server ke IP Statis (misal `192.168.1.200` atau `10.0.0.10`) agar URL CBT siswa selalu tetap.
3. **Backup Database**: Cadangan data otomatis dapat diekspor melalui menu Admin `/admin` -> Pengaturan -> Backup Data (format JSON atau SQL Dump).
