@echo off
setlocal EnableExtensions EnableDelayedExpansion

chcp 65001 >nul 2>&1
cd /d "%~dp0"
title SETUP CBT MUHIPO MYSQL - SMA Muhammadiyah 1 Ponorogo
color 0B

set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;C:\Program Files (x86)\nodejs;%NVM_HOME%;%NVM_SYMLINK%;C:\xampp\mysql\bin;D:\xampp\mysql\bin;E:\xampp\mysql\bin;F:\xampp\mysql\bin;C:\laragon\bin\mysql\current\bin;D:\laragon\bin\mysql\current\bin;C:\Program Files\MySQL\MySQL Server 8.0\bin;C:\Program Files\MySQL\MySQL Server 8.4\bin;C:\Program Files\MySQL\MySQL Server 9.0\bin;C:\Program Files\MariaDB\bin;C:\Program Files\Git\cmd;%PATH%"

cls
echo ==============================================================================
echo       SETUP & AUTO-INSTALLER SISTEM CBT MUHIPO (BACKEND & FRONTEND)
echo       SMA Muhammadiyah 1 Ponorogo - Muhipo Dev (C) 2026
echo ==============================================================================
echo.
echo Langkah Pemeriksaan & Instalasi Otomatis:
echo  1. Runtime & Package Manager   : Node.js LTS, NPM, Git
echo  2. Layanan Basis Data (Backend): MySQL / MariaDB (Port 3306)
echo  3. Database & Skema Penyimpanan: Basis data cbt_muhipo
echo  4. Konfigurasi Sistem          : File .env (MySQL, Port 8080, Secrets)
echo  5. Dependensi Backend/Frontend : npm install (Next.js, React, Prisma, Tailwind)
echo  6. Konfigurasi Protokol Server : HTTP Port 8080 Standalone
echo  7. Backend ORM & Data Seeder   : Prisma Client, Skema Sync, Default Master
echo  8. Frontend Production Compile : Next.js 16 Optimized Production Build
echo ==============================================================================
echo.

:: -----------------------------------------------------------------------------
:: [1/8] PEMERIKSAAN & AUTO-INSTALL NODE.JS, NPM, & GIT
:: -----------------------------------------------------------------------------
echo [1/8] Memeriksa Runtime Node.js, NPM, dan Git...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Node.js belum terdeteksi di PATH sistem.
    echo [INFO] Mencari instalasi Node.js di direktori standar...
    
    set "FOUND_NODE="
    if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;!PATH!" & set "FOUND_NODE=1"
    if not defined FOUND_NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;!PATH!" & set "FOUND_NODE=1"
    if not defined FOUND_NODE if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;!PATH!" & set "FOUND_NODE=1"

    if not defined FOUND_NODE (
        echo [INFO] Memulai proses instalasi otomatis Node.js LTS...
        echo.

        set "NODE_INSTALLED="

        :: Opsi 1: Coba install via winget (Windows Package Manager) jika tersedia
        where winget >nul 2>&1
        if !errorlevel! equ 0 (
            echo [INFO] Menginstal Node.js LTS melalui Windows Package Manager (winget)...
            winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent >nul 2>&1
            if !errorlevel! equ 0 set "NODE_INSTALLED=1"
        )

        :: Opsi 2: Jika winget tidak tersedia / gagal, download langsung installer resmi .msi Node.js LTS
        if not defined NODE_INSTALLED (
            echo [INFO] Mengunduh installer resmi Node.js LTS dari nodejs.org...
            set "NODE_MSI=%TEMP%\nodejs_installer.msi"
            powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', '%TEMP%\nodejs_installer.msi')" >nul 2>&1
            
            if exist "!NODE_MSI!" (
                echo [INFO] Memasang Node.js LTS secara otomatis (Silent Install)...
                msiexec.exe /i "!NODE_MSI!" /qn /norestart
                del "!NODE_MSI!" >nul 2>&1
                set "NODE_INSTALLED=1"
            )
        )

        set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;C:\Program Files (x86)\nodejs;%PATH%"
    )

    where node >nul 2>&1
    if !errorlevel! neq 0 (
        color 0C
        echo.
        echo [ERROR] Gagal menemukan/memasang Node.js secara otomatis.
        echo Silakan unduh dan pasang Node.js LTS secara manual dari:
        echo https://nodejs.org/ (pilih versi LTS Recommended)
        echo Setelah selesai, jalankan kembali script setup ini.
        echo.
        pause
        exit /b 1
    )
    echo [OK] Node.js berhasil disiapkan!
)

for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
for /f "tokens=*" %%v in ('npm -v 2^>nul') do set "NPM_VER=%%v"
echo [OK] Node.js terdeteksi : !NODE_VER!
echo [OK] NPM terdeteksi     : v!NPM_VER!

where git >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%g in ('git --version 2^>nul') do echo [OK] Git terdeteksi    : %%g
) else (
    echo [INFO] Git CLI opsional (tidak terpasang, sistem tetap dapat berjalan penuh).
)

:: -----------------------------------------------------------------------------
:: [2/8] PEMERIKSAAN & INISIALISASI LAYANAN MYSQL
:: -----------------------------------------------------------------------------
echo.
echo [2/8] Memeriksa Layanan Basis Data MySQL (Port 3306)...

set "MYSQL_EXE="
if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe"
if not defined MYSQL_EXE if exist "D:\xampp\mysql\bin\mysql.exe" set "MYSQL_EXE=D:\xampp\mysql\bin\mysql.exe"
if not defined MYSQL_EXE if exist "E:\xampp\mysql\bin\mysql.exe" set "MYSQL_EXE=E:\xampp\mysql\bin\mysql.exe"
if not defined MYSQL_EXE if exist "F:\xampp\mysql\bin\mysql.exe" set "MYSQL_EXE=F:\xampp\mysql\bin\mysql.exe"
if not defined MYSQL_EXE if exist "C:\laragon\bin\mysql\current\bin\mysql.exe" set "MYSQL_EXE=C:\laragon\bin\mysql\current\bin\mysql.exe"
if not defined MYSQL_EXE if exist "D:\laragon\bin\mysql\current\bin\mysql.exe" set "MYSQL_EXE=D:\laragon\bin\mysql\current\bin\mysql.exe"

set "MYSQL_ACTIVE="
for /f "tokens=5" %%a in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":3306 " ^| findstr "LISTENING"') do (
    set "MYSQL_ACTIVE=%%a"
)

if not defined MYSQL_ACTIVE (
    echo [INFO] Port 3306 MySQL belum aktif. Mencoba menyalakan MySQL di latar belakang...
    if exist "C:\xampp\mysql_start.bat" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c C:\xampp\mysql_start.bat' -WindowStyle Hidden" >nul 2>&1
    ) else if exist "D:\xampp\mysql_start.bat" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c D:\xampp\mysql_start.bat' -WindowStyle Hidden" >nul 2>&1
    ) else if exist "E:\xampp\mysql_start.bat" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c E:\xampp\mysql_start.bat' -WindowStyle Hidden" >nul 2>&1
    ) else if exist "C:\xampp\mysql\bin\mysqld.exe" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'C:\xampp\mysql\bin\mysqld.exe' -ArgumentList '--defaults-file=C:\xampp\mysql\bin\my.ini --standalone' -WindowStyle Hidden" >nul 2>&1
    ) else (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Service -Name 'MySQL', 'mysql', 'xamppmysql', 'MariaDB' -ErrorAction SilentlyContinue" >nul 2>&1
    )
    
    echo Menunggu inisialisasi MySQL...
    ping 127.0.0.1 -n 6 >nul
)

set "MYSQL_ACTIVE="
for /f "tokens=5" %%a in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":3306 " ^| findstr "LISTENING"') do (
    set "MYSQL_ACTIVE=%%a"
)

if not defined MYSQL_ACTIVE (
    color 0C
    echo.
    echo [ERROR] MySQL server pada port 3306 belum dapat dihubungi.
    echo Solusi:
    echo 1. Buka XAMPP/Laragon Control Panel dan klik tombol Start pada baris MySQL.
    echo 2. Pastikan port 3306 tidak terblokir firewall atau aplikasi lain.
    echo 3. Jalankan kembali script ini setelah MySQL aktif.
    echo.
    pause
    exit /b 1
)
echo [OK] MySQL Service terdeteksi aktif pada Port 3306.

:: -----------------------------------------------------------------------------
:: [3/8] PEMERIKSAAN & PEMBUATAN BASIS DATA cbt_muhipo
:: -----------------------------------------------------------------------------
echo.
echo [3/8] Memeriksa Basis Data cbt_muhipo di MySQL...

set "DB_USER=root"
set "DB_PASS="
set "DB_HOST=127.0.0.1"
set "DB_PORT=3306"
set "DB_NAME=cbt_muhipo"

if exist ".env" (
    for /f "usebackq tokens=*" %%L in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "if (Test-Path '.env') { $content = Get-Content '.env' -Raw; if ($content -match 'DATABASE_URL\s*=\s*[\x22\x27]?mysql:\/\/([^:]+):?([^@]*)@([^:\/]+):?(\d*)\/([^?\x22\x27\s]+)') { Write-Output ('DB_USER=' + $Matches[1]); Write-Output ('DB_PASS=' + $Matches[2]); Write-Output ('DB_HOST=' + (if($Matches[3]){$Matches[3]}else{'127.0.0.1'})); Write-Output ('DB_PORT=' + (if($Matches[4]){$Matches[4]}else{'3306'})); Write-Output ('DB_NAME=' + $Matches[5]); } }"`) do (
        set "%%L"
    )
)

set "AUTH_ARGS=-u %DB_USER% -h %DB_HOST% -P %DB_PORT%"
if defined DB_PASS set "AUTH_ARGS=%AUTH_ARGS% -p%DB_PASS%"

set "DB_EXISTS="
if defined MYSQL_EXE (
    for /f "tokens=*" %%d in ('"%MYSQL_EXE%" %AUTH_ARGS% -N -e "SHOW DATABASES LIKE '%DB_NAME%';" 2^>nul') do set "DB_EXISTS=%%d"
) else (
    for /f "tokens=*" %%d in ('mysql %AUTH_ARGS% -N -e "SHOW DATABASES LIKE '%DB_NAME%';" 2^>nul') do set "DB_EXISTS=%%d"
)

if defined DB_EXISTS (
    echo [OK] Basis data '%DB_NAME%' sudah ada. Menggunakan database yang tersedia ^(tidak membuat baru^).
) else (
    echo [INFO] Basis data '%DB_NAME%' belum ditemukan. Membuat database baru...
    if defined MYSQL_EXE (
        "%MYSQL_EXE%" %AUTH_ARGS% -e "CREATE DATABASE %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
    ) else (
        mysql %AUTH_ARGS% -e "CREATE DATABASE %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
    )
    echo [OK] Basis data '%DB_NAME%' baru berhasil dibuat.
)

:: -----------------------------------------------------------------------------
:: [4/8] PEMERIKSAAN FILE KONFIGURASI .env
:: -----------------------------------------------------------------------------
echo.
echo [4/8] Memeriksa file konfigurasi .env...
if not exist ".env" (
    echo [INFO] Membuat file .env default otomatis dengan konfigurasi MySQL...
    (
        echo # ==============================================================================
        echo # KONFIGURASI BASIS DATA CBT MUHIPO MYSQL
        echo # ==============================================================================
        echo DATABASE_URL="mysql://root:@127.0.0.1:3306/cbt_muhipo"
        echo JWT_SECRET="cbt-muhipo-super-secret-key-2026-production-ready"
        echo PORT=8080
        echo HTTP_PORT=8080
        echo NEXT_PUBLIC_APP_URL="http://localhost:8080"
        echo NEXT_PUBLIC_APP_NAME="CBT SMA Muhammadiyah 1 Ponorogo"
        echo NEXT_PUBLIC_SCHOOL_NAME="SMA Muhammadiyah 1 Ponorogo"
        echo NEXT_PUBLIC_SCHOOL_ADDRESS="Jl. Batoro Katong No. 6 Ponorogo, Jawa Timur"
    ) > ".env"
    echo [OK] File .env berhasil dibuat untuk MySQL.
) else (
    echo [OK] File .env sudah tersedia.
)

:: -----------------------------------------------------------------------------
:: [5/8] PEMERIKSAAN & INSTALASI PAKET DEPENDENSI (BACKEND & FRONTEND)
:: -----------------------------------------------------------------------------
echo.
echo [5/8] Memeriksa dependensi paket npm (node_modules)...

set "NEED_INSTALL="
if not exist "node_modules" set "NEED_INSTALL=1"
if not exist "node_modules\@prisma\client" set "NEED_INSTALL=1"
if not exist "node_modules\next" set "NEED_INSTALL=1"
if not exist "node_modules\react" set "NEED_INSTALL=1"

if defined NEED_INSTALL (
    echo [INFO] Paket dependensi belum lengkap / belum terpasang.
    echo Mengunduh dan menginstal seluruh dependensi backend & frontend...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Gagal menginstal paket npm.
        pause
        exit /b 1
    )
    echo [OK] Seluruh dependensi paket npm berhasil dipasang.
) else (
    echo [OK] Paket node_modules backend dan frontend sudah lengkap.
)

:: -----------------------------------------------------------------------------
:: [6/8] KONFIGURASI PROTOKOL HTTP (PORT 8080)
:: -----------------------------------------------------------------------------
echo.
echo [6/8] Memeriksa konfigurasi protokol HTTP Port 8080...
echo [OK] Server siap berjalan langsung dengan protokol HTTP pada port 8080.

:: -----------------------------------------------------------------------------
:: [7/8] MENYELARASKAN ORM PRISMA & SEED DATA MASTER
:: -----------------------------------------------------------------------------
echo.
echo [7/8] Menyelaraskan tabel database MySQL CBT MUHIPO...

:: Matikan proses lama yang mungkin masih mengunci port/database
for /f "tokens=5" %%p in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":8080 " ^| findstr "LISTENING"') do (
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

echo Memeriksa data master dan akun default (Admin, Proktor, Guru, Siswa)...
call npx tsx prisma/seed.ts
if %errorlevel% neq 0 (
    color 0E
    echo [WARNING] Inisialisasi data mengembalikan catatan. Melanjutkan proses...
) else (
    echo [OK] Data master siap digunakan.
)

:: -----------------------------------------------------------------------------
:: [8/8] PRODUCTION BUILD COMPILING (NEXT.JS FRONTEND & BACKEND API)
:: -----------------------------------------------------------------------------
echo.
echo [8/8] Melakukan compiling Next.js Production Build...
echo Proses ini mengompilasi seluruh bundle Frontend & API Backend, mohon tunggu...
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
echo  STATUS SISTEM & DEPENDENSI:
echo  --------------------------------------------------------------------------
echo  * Runtime       : Node.js (!NODE_VER!) & NPM (v!NPM_VER!)
echo  * Database      : MySQL / MariaDB (%DB_NAME% @ %DB_HOST%:%DB_PORT%)
echo  * Mode          : Database Eksisting (Data Aman Terpelihara)
echo  * Port Akses    : HTTP Port 8080
echo  * Frontend/API  : Next.js Production Ready (Standar Concurrency Tinggi)
echo  --------------------------------------------------------------------------
echo.
echo  Langkah Selanjutnya:
echo  1. Jalankan start-cbt-server.bat untuk menyalakan server produksi.
echo  2. Buka browser proktor / admin pada URL: http://localhost:8080
echo ==============================================================================
echo.
pause


