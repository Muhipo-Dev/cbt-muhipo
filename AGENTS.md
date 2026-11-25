<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ATURAN MUTLAK UI/UX, TOUCHSCREEN, SCROLLING & ZOOMING (CBT MUHIPO)

Setiap pengembang maupun AI Agent yang melakukan perubahan kode, penambahan fitur, atau perbaikan bug **WAJIB** mematuhi dan mempertahankan aturan mutlak berikut:

---

### 1. Responsifitas Multi-Perangkat (Fluid & Adaptive UI)
- **Cakupan Perangkat**: Aplikasi harus tampil sempurna tanpa teks terpotong, elemen bertumpuk (*overlap*), atau *layout break* pada:
  - Layar Ponsel Cilik / Handheld (320px - 480px)
  - Layar Smartphone Modern (Android & iOS, 360px - 768px)
  - Layar Tablet (iPad, Android Tablet, 768px - 1024px) baik mode *Portrait* maupun *Landscape*
  - Layar Laptop / Desktop (1024px - 1920px+)
- **Anti Horizontal Overflow**: `overflow-x: hidden` harus selalu terjaga pada `html, body` agar tidak terjadi pergeseran layar ke samping yang tidak disengaja.

---

### 2. Kemampuan Touchscreen & Ergonomi Sentuh (Touch Target Accessibility)
- **Ukuran Sentuh Minimal**: Semua tombol, kartu pilihan jawaban, menu navigasi, dan elemen interaktif harus memiliki ukuran target sentuh minimal **44px × 44px** (sesuai standar Apple Human Interface Guidelines & Google Material Design 48dp).
- **CSS Touch Action**: Gunakan `touch-action: manipulation` pada seluruh tombol atau elemen yang bisa diklik untuk menghilangkan *300ms click delay* di peramban *mobile*.
- **Touch Feedback**: Wajib memberikan efek visual saat disentuh (`:active` scale / highlight halus) sehingga pengguna touchscreen mendapatkan *tactile feedback* seketika.
- **Font Input Aman**: Elemen `input`, `select`, dan `textarea` di perangkat mobile wajib memiliki `font-size: 16px` minimal guna mencegah browser iOS Safari dan Android WebView melakukan *auto-zoom* paksa yang merusak tata letak formulir.

---

### 3. Kemampuan Scrolling Lancar & Alami (Momentum Scrolling)
- **Momentum Touch Scroll**: Setiap container yang dapat digulir (*scrollable container*, seperti daftar soal, opsi jawaban, popup modal, tabel evaluasi) wajib menyertakan `-webkit-overflow-scrolling: touch` dan `overscroll-behavior: contain`.
- **Scrollbar Ergonomis**: Scrollbar harus tipis (*thin*) dan tidak menghalangi konten atau tombol aksi utama.
- **Scroll Behavior**: Selalu gunakan `scroll-behavior: smooth` saat berpindah nomor soal atau navigasi butir soal.

---

### 4. Kemampuan Zooming Gambar & Teks (Visual Accessibility)
- **Viewport Zoom**: Jangan pernah menonaktifkan fitur zoom secara kaku (`maximumScale: 5` dan `userScalable: true` diizinkan pada viewport `layout.tsx`).
- **Pinch-To-Zoom pada Media**: Gambar soal, diagram, peta, tabel, dan rumus matematika wajib mendukung gesture *pinch-to-zoom* (`touch-action: pan-y pinch-zoom`).
- **Interactive Lightbox Zoom**: Setiap gambar di dalam soal dan opsi jawaban harus dapat diketuk/diklik untuk membuka *Modal Zoom / Lightbox* (`ImageZoomModal`) yang memungkinkan pembesaran detail (zoom in, zoom out, reset, dan pan) tanpa merusak tampilan layout ujian.
- **Skala Ukuran Teks (Font Size)**: Pertahankan fitur pengatur ukuran font (Kecil, Sedang, Besar, Ekstra Besar) agar siswa dengan keterbatasan visual dapat memperbesar soal dengan nyaman.

---

### 5. Kompresi & Performa Media Maksimal 300 MB
- Semua media gambar yang diunggah ke sistem harus dikompresi otomatis tanpa memotong resolusi (*width/height* asli terjaga), dengan batas maksimal file **300 MB**.
- Hindari penyimpanan gambar format base64 panjang di dalam database — selalu ubah menjadi tautan file di `/uploads/` yang sudah terkompresi.

---

### 6. Standar Wajib SAST & Linting (Code Integrity & Security)
- **Zero Syntax & Lint Errors**: Setiap kali menyelesaikan tugas, perbaikan bug, atau penambahan fitur, **WAJIB** menjalankan pengecekan integritas linting (
pm run lint) dan build (
pm run build) tanpa error sintaksis.
- **Static Application Security Testing (SAST)**:
  - Wajib memperhatikan aspek keamanan kode dari serangan umum OWASP: sanitasi input formulir/SQL query, validasi hak akses role (ADMIN, GURU, SISWA), pencegahan prototype pollution, dan sanitasi payload upload file.
  - Dependencies harus secara berkala diperiksa via 
pm audit untuk memastikan tidak ada celah keamanan kritis/high pada pustaka produksi.
  - Setiap API Route di /api/ wajib memverifikasi otentikasi sesi melalui getSessionUser() sebelum memproses manipulasi database.
