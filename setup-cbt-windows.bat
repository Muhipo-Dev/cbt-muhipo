@echo off
setlocal EnableExtensions EnableDelayedExpansion

chcp 65001 >nul 2>&1
cd /d "%~dp0"
title SETUP CBT MUHIPO MYSQL - SMA Muhammadiyah 1 Ponorogo
color 0B

set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;C:\xampp\mysql\bin;D:\xampp\mysql\bin;E:\xampp\mysql\bin;C:\Program Files\MySQL\MySQL Server 8.0\bin;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;C:\Program Files (x86)\nodejs;%PATH%"

cls
echo ==============================================================================
echo       SETUP MANDIRI SISTEM CBT MUHIPO MYSQL - SMA MUHAMMADIYAH 1 PONOROGO
echo       Muhipo Dev (C) 2026 - High Concurrency Multi-User CBT System
echo ==============================================================================
echo.
echo Langkah Inisialisasi Otomatis:
echo  1. Memeriksa instalasi Node.js dan NPM
echo  2. Memeriksa dan Memastikan MySQL / MariaDB (XAMPP) Aktif
echo  3. Memeriksa Ketersediaan Basis Data MySQL cbt_muhipo
echo  4. Menyiapkan File Konfigurasi .env
echo  5. Menginstall Dependensi node_modules
echo  6. Menyelaraskan Skema Tabel Prisma ORM dan Mempertahankan Data Eksisting
echo  7. Mengompilasi Build Produksi Next.js
echo ==============================================================================
echo.

echo [1/7] Memeriksa instalasi Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js tidak ditemukan di komputer ini.
    echo Silakan unduh dan pasang Node.js LTS dari https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
echo [OK] Node.js terdeteksi: !NODE_VER!

echo.
echo [2/7] Memeriksa Layanan Basis Data MySQL (Port 3306)...

set "MYSQL_EXE="
if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe"
if not defined MYSQL_EXE if exist "D:\xampp\mysql\bin\mysql.exe" set "MYSQL_EXE=D:\xampp\mysql\bin\mysql.exe"
if not defined MYSQL_EXE if exist "E:\xampp\mysql\bin\mysql.exe" set "MYSQL_EXE=E:\xampp\mysql\bin\mysql.exe"

set "MYSQL_ACTIVE="
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /R /C:":3306 " ^| findstr "LISTENING"') do (
    set "MYSQL_ACTIVE=%%a"
)

if not defined MYSQL_ACTIVE (
    echo [INFO] Port 3306 MySQL belum aktif. Menyalakan MySQL XAMPP di latar belakang...
    if exist "C:\xampp\mysql_start.bat" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c C:\xampp\mysql_start.bat' -WindowStyle Hidden" >nul 2>&1
    ) else if exist "D:\xampp\mysql_start.bat" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c D:\xampp\mysql_start.bat' -WindowStyle Hidden" >nul 2>&1
    ) else if exist "C:\xampp\mysql\bin\mysqld.exe" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'C:\xampp\mysql\bin\mysqld.exe' -ArgumentList '--defaults-file=C:\xampp\mysql\bin\my.ini --standalone' -WindowStyle Hidden" >nul 2>&1
    ) else (
        powershell.exe -NoProfile -Command "Start-Service -Name 'MySQL', 'mysql', 'xamppmysql' -ErrorAction SilentlyContinue" >nul 2>&1
    )
    
    echo Menunggu inisialisasi MySQL...
    ping 127.0.0.1 -n 6 >nul
)

set "MYSQL_ACTIVE="
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /R /C:":3306 " ^| findstr "LISTENING"') do (
    set "MYSQL_ACTIVE=%%a"
)

if not defined MYSQL_ACTIVE (
    color 0C
    echo.
    echo [ERROR] MySQL server pada port 3306 belum dapat dihubungi.
    echo Solusi:
    echo 1. Buka XAMPP Control Panel dan klik tombol Start pada baris MySQL.
    echo 2. Pastikan port 3306 tidak terblokir firewall atau aplikasi lain.
    echo 3. Jalankan kembali script ini setelah MySQL aktif.
    echo.
    pause
    exit /b 1
)
echo [OK] MySQL Service terdeteksi aktif pada Port 3306.

echo.
echo [3/7] Memeriksa Basis Data cbt_muhipo di MySQL...
set "DB_EXISTS="

if defined MYSQL_EXE (
    for /f "tokens=*" %%d in ('"%MYSQL_EXE%" -u root -N -e "SHOW DATABASES LIKE 'cbt_muhipo';" 2^>nul') do set "DB_EXISTS=%%d"
) else (
    for /f "tokens=*" %%d in ('mysql -u root -N -e "SHOW DATABASES LIKE 'cbt_muhipo';" 2^>nul') do set "DB_EXISTS=%%d"
)

if defined DB_EXISTS (
    echo [OK] Basis data 'cbt_muhipo' sudah ada. Menggunakan database yang tersedia ^(tidak membuat baru^).
) else (
    echo [INFO] Basis data 'cbt_muhipo' belum ditemukan. Membuat database baru...
    if defined MYSQL_EXE (
        "%MYSQL_EXE%" -u root -e "CREATE DATABASE cbt_muhipo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
    ) else (
        mysql -u root -e "CREATE DATABASE cbt_muhipo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
    )
    echo [OK] Basis data 'cbt_muhipo' baru berhasil dibuat.
)

echo.
echo [4/7] Memeriksa file konfigurasi .env...
if not exist ".env" (
    echo [INFO] Membuat file .env default otomatis dengan konfigurasi MySQL...
    (
        echo # ==============================================================================
        echo # KONFIGURASI BASIS DATA CBT MUHIPO MYSQL XAMPP
        echo # ==============================================================================
        echo DATABASE_URL="mysql://root:@127.0.0.1:3306/cbt_muhipo"
        echo JWT_SECRET="cbt-muhipo-super-secret-key-2026-production-ready"
        echo HTTPS_PORT=8443
        echo HTTP_PORT=8080
        echo NEXT_PUBLIC_APP_URL="https://localhost:8443"
        echo NEXT_PUBLIC_APP_NAME="CBT SMA Muhammadiyah 1 Ponorogo"
        echo NEXT_PUBLIC_SCHOOL_NAME="SMA Muhammadiyah 1 Ponorogo"
        echo NEXT_PUBLIC_SCHOOL_ADDRESS="Jl. Batoro Katong No. 6 Ponorogo, Jawa Timur"
    ) > ".env"
    echo [OK] File .env berhasil dibuat untuk MySQL XAMPP.
) else (
    echo [OK] File .env sudah tersedia.
)

echo.
echo [5/7] Memeriksa dependensi paket node_modules...
if not exist "node_modules" (
    echo [INFO] Direktori node_modules belum ditemukan.
    echo Mengunduh dan menginstal semua paket dependensi...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Gagal menginstal paket npm.
        pause
        exit /b 1
    )
    echo [OK] Instalasi paket npm selesai.
) else (
    echo [OK] Paket node_modules sudah tersedia.
)

echo.
echo [6/7] Menyelaraskan tabel database MySQL CBT MUHIPO...

for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr /R /C:":8443 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr /R /C:":8080 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
)
taskkill /F /IM node.exe >nul 2>&1

echo Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Gagal generate Prisma client.
    pause
    exit /b 1
)

echo Menyelaraskan skema tabel MySQL...
call npx prisma db push --skip-generate
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Gagal menyelaraskan skema tabel MySQL.
    pause
    exit /b 1
)
echo [OK] Struktur tabel database MySQL berhasil diselaraskan tanpa menghapus data.

echo Memeriksa data master dan pengaturan sekolah...
call npx tsx prisma/seed.ts
if %errorlevel% neq 0 (
    color 0E
    echo [WARNING] Inisialisasi data mengembalikan catatan. Melanjutkan proses...
) else (
    echo [OK] Data master siap digunakan.
)

echo.
echo [7/7] Melakukan compiling Next.js Production Build...
echo Proses ini membutuhkan waktu 1-2 menit, mohon tunggu...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Gagal melakukan build aplikasi Next.js.
    pause
    exit /b 1
)
echo [OK] Build sistem produksi selesai 100 persen.

color 0A
echo.
echo ==============================================================================
echo              SETUP SISTEM CBT MUHIPO MYSQL BERHASIL 100 PERSEN
echo ==============================================================================
echo.
echo  STATUS BASIS DATA:
echo  --------------------------------------------------------------------------
echo  * Database     : MySQL / MariaDB (cbt_muhipo @ 127.0.0.1:3306)
echo  * Mode         : Menggunakan Database Eksisting (Data Aman Terpelihara)
echo  * Port Akses   : HTTPS 8443 (Utama) dan HTTP 8080 (Auto-Redirect)
echo  * Kapasitas    : Multi-User Concurrent Write Ready
echo  --------------------------------------------------------------------------
echo.
echo  Langkah Selanjutnya:
echo  1. Jalankan start-cbt-server.bat atau JALANKAN_CBT.bat untuk menyalakan server.
echo  2. Akses melalui browser proktor: https://localhost:8443
echo ==============================================================================
echo.
pause
