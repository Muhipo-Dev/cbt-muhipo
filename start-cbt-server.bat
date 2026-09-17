@echo off
setlocal EnableExtensions EnableDelayedExpansion

chcp 65001 >nul 2>&1
cd /d "%~dp0"
title CBT MUHIPO Server Controller - SMA Muhammadiyah 1 Ponorogo
color 0B

:: Inisialisasi PATH komprehensif untuk server Windows (XAMPP, Laragon, Node.js, MySQL Server, NVM)
set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;C:\Program Files (x86)\nodejs;%NVM_HOME%;%NVM_SYMLINK%;C:\xampp\mysql\bin;D:\xampp\mysql\bin;E:\xampp\mysql\bin;F:\xampp\mysql\bin;C:\laragon\bin\mysql\current\bin;D:\laragon\bin\mysql\current\bin;C:\Program Files\MySQL\MySQL Server 8.0\bin;C:\Program Files\MySQL\MySQL Server 8.4\bin;C:\Program Files\MySQL\MySQL Server 9.0\bin;C:\Program Files\MariaDB\bin;%PATH%"
set "NODE_ENV=production"

:: Baca Port dari .env jika ada, default ke 8080
set "CBT_PORT=8080"
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "KEY=%%A"
        set "VAL=%%B"
        if /i "!KEY!"=="PORT" set "CBT_PORT=!VAL!"
        if /i "!KEY!"=="HTTP_PORT" if not defined PORT set "CBT_PORT=!VAL!"
    )
)
set "PORT=%CBT_PORT%"
set "HTTP_PORT=%CBT_PORT%"

cls
echo ==============================================================================
echo       SERVER CBT MUHIPO STANDALONE MYSQL - SMA MUHAMMADIYAH 1 PONOROGO
echo       Muhipo Dev (C) 2026 - Multi-User High Performance Server
echo ==============================================================================
echo.

:: Pemeriksaan Runtime Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Node.js belum terdeteksi di PATH sistem.
    echo [INFO] Mencari instalasi Node.js di direktori standar...
    
    set "FOUND_NODE="
    if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;!PATH!" & set "FOUND_NODE=1"
    if not defined FOUND_NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;!PATH!" & set "FOUND_NODE=1"
    if not defined FOUND_NODE if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;!PATH!" & set "FOUND_NODE=1"

    if not defined FOUND_NODE (
        echo [INFO] Memulai instalasi otomatis Node.js LTS...
        set "NODE_INSTALLED="
        where winget >nul 2>&1
        if !errorlevel! equ 0 (
            echo [INFO] Menginstal Node.js LTS via winget...
            winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent >nul 2>&1
            if !errorlevel! equ 0 set "NODE_INSTALLED=1"
        )

        if not defined NODE_INSTALLED (
            echo [INFO] Mengunduh installer resmi Node.js LTS...
            set "NODE_MSI=%TEMP%\nodejs_installer.msi"
            powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', '%TEMP%\nodejs_installer.msi')" >nul 2>&1
            
            if exist "!NODE_MSI!" (
                echo [INFO] Memasang Node.js LTS secara otomatis (Silent Install)...
                msiexec.exe /i "!NODE_MSI!" /qn /norestart
                del "!NODE_MSI!" >nul 2>&1
            )
        )

        set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;C:\Program Files (x86)\nodejs;%PATH%"
    )

    where node >nul 2>&1
    if !errorlevel! neq 0 (
        color 0C
        echo [ERROR] Node.js tidak ditemukan di sistem ini.
        echo Silakan unduh dan instal Node.js LTS dari https://nodejs.org/
        echo.
        pause
        exit /b 1
    )
    echo [OK] Node.js berhasil disiapkan!
)

:: Pastikan file .env ada
if not exist ".env" (
    echo [INFO] File .env belum ada, membuat konfigurasi standar otomatis...
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
)

:: Pemeriksaan Layanan MySQL
set "MYSQL_PID="
for /f "tokens=5" %%a in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":3306 " ^| findstr "LISTENING"') do set "MYSQL_PID=%%a"

if not defined MYSQL_PID (
    echo [INFO] MySQL Server Port 3306 belum aktif. Mencoba menyalakan MySQL XAMPP/Laragon...
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
    ping 127.0.0.1 -n 4 >nul
)

:: Pemeriksaan Dependensi node_modules
if not exist "node_modules" (
    echo [INFO] node_modules belum ada, menginstall paket dependensi...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Gagal menginstall dependensi. Jalankan setup-cbt-windows.bat terlebih dahulu.
        pause
        exit /b 1
    )
)

:: Pemeriksaan Build Produksi
if not exist ".next" (
    echo [INFO] Build produksi belum ditemukan.
    echo Melakukan compiling build pertama kali...
    echo.
    call npx prisma generate
    call npm run build
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERROR] Gagal melakukan build sistem.
        echo.
        pause
        exit /b 1
    )
    echo [OK] Build sistem berhasil.
)

:: Jalankan server jika belum aktif
set "INIT_PID="
for /f "tokens=5" %%a in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":%CBT_PORT% " ^| findstr "LISTENING"') do set "INIT_PID=%%a"
if not defined INIT_PID call :SUB_START_SERVER

:MENU_LOOP
cls
set "SERVER_PID="
for /f "tokens=5" %%a in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":%CBT_PORT% " ^| findstr "LISTENING"') do set "SERVER_PID=%%a"

set "DB_PID="
for /f "tokens=5" %%a in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":3306 " ^| findstr "LISTENING"') do set "DB_PID=%%a"

if defined SERVER_PID (
    color 0A
    set "SRV_TXT=[ AKTIF / ONLINE - SIAP DIGUNAKAN (PID: !SERVER_PID!) ]"
) else (
    color 0C
    set "SRV_TXT=[ NONAKTIF / OFFLINE (SERVER MATI) ]"
)

if defined DB_PID (
    set "DB_TXT=[ TERHUBUNG - PORT 3306 ONLINE (PID: !DB_PID!) ]"
) else (
    set "DB_TXT=[ TERPUTUS / MATI - CEK XAMPP/MYSQL PORT 3306 ]"
)

echo ==============================================================================
echo            CBT MUHIPO - HTTP SERVER CONTROLLER (PORT %CBT_PORT%)
echo            Muhipo Dev (C) 2026 - SMA Muhammadiyah 1 Ponorogo
echo ==============================================================================
echo.
echo  STATUS SERVER : !SRV_TXT!
echo  DATABASE MYSQL: !DB_TXT!
echo  PORT UTAMA    : %CBT_PORT% (HTTP Server)
echo  AKSES PROKTOR : http://localhost:%CBT_PORT%
echo.
echo  ALAMAT IP JARINGAN (UNTUK AKSES PESERTA / SISWA DI RUANGAN / LAB):
set "LAST_IP="
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set "raw_ip=%%i"
    set "clean_ip=!raw_ip: =!"
    set "LAST_IP=!clean_ip!"
    echo    -^> http://!clean_ip!:%CBT_PORT%
)
echo.
echo  [Info Akses]: Siswa membuka browser dan ketik http://[IP_KOMPUTER]:%CBT_PORT%
echo.
echo ==============================================================================
echo  PILIHAN KONTROL SERVER CBT:
echo ==============================================================================
echo    [1] RESTART SERVER      - Mulai ulang server CBT di Port %CBT_PORT%
echo    [2] MATIKAN SERVER      - Hentikan server CBT
echo    [3] NYALAKAN SERVER     - Jalankan server CBT di Port %CBT_PORT%
echo    [4] REBUILD SISTEM      - Build ulang source code + Restart server
echo    [5] BUKA DI BROWSER     - Buka http://localhost:%CBT_PORT% di browser
echo    [6] LIHAT LOG AKTIF     - Tampilkan 30 baris terakhir log aktivitas server
echo    [7] REFRESH STATUS      - Segarkan status koneksi dan IP jaringan
echo    [8] BACKUP DAN RESTORE  - Buka Menu Cadangan dan Pemulihan Basis Data
echo    [0] KELUAR              - Matikan server dan tutup jendela controller
echo ==============================================================================
echo.

set "CHOICE="
set /p "CHOICE=>> Masukkan pilihan Anda [1/2/3/4/5/6/7/8/0]: "
set "CHOICE=%CHOICE: =%"

if "%CHOICE%"=="1" goto DO_RESTART
if "%CHOICE%"=="2" goto DO_STOP
if "%CHOICE%"=="3" goto DO_START
if "%CHOICE%"=="4" goto DO_REBUILD
if "%CHOICE%"=="5" goto DO_BROWSER
if "%CHOICE%"=="6" goto DO_LOGS
if "%CHOICE%"=="7" goto MENU_LOOP
if "%CHOICE%"=="8" goto DO_BACKUP_MENU
if "%CHOICE%"=="0" goto DO_EXIT
if "%CHOICE%"=="" goto MENU_LOOP

echo.
echo [!] Pilihan tidak valid, silakan masukkan nomor 0 sampai 8.
ping 127.0.0.1 -n 2 >nul
goto MENU_LOOP

:DO_BACKUP_MENU
call "%~dp0backup-restore-cbt.bat"
goto MENU_LOOP


:DO_RESTART
echo.
echo ==============================================================================
echo [1/2] Menghentikan server CBT...
call :SUB_STOP_SERVER
echo [2/2] Menyalakan server CBT Mode HTTP di Port %CBT_PORT%...
call :SUB_START_SERVER
echo.
echo [SUKSES] Server CBT berhasil direstart!
ping 127.0.0.1 -n 2 >nul
goto MENU_LOOP


:DO_STOP
echo.
echo ==============================================================================
echo Menghentikan server CBT (POWER OFF)...
call :SUB_STOP_SERVER
echo.
echo [SUKSES] Server CBT berhasil dinonaktifkan.
ping 127.0.0.1 -n 2 >nul
goto MENU_LOOP


:DO_START
echo.
echo ==============================================================================
echo Menyalakan server CBT (POWER ON)...
call :SUB_STOP_SERVER
call :SUB_START_SERVER
echo.
echo [SUKSES] Server CBT berhasil dinyalakan!
ping 127.0.0.1 -n 2 >nul
goto MENU_LOOP


:DO_REBUILD
echo.
echo ==============================================================================
echo                  PROSES REBUILD SISTEM CBT MUHIPO
echo ==============================================================================
echo [1/4] Menghentikan server...
call :SUB_STOP_SERVER
echo.
echo [2/4] Sinkronisasi skema Prisma ORM ke MySQL...
call npx prisma generate
echo.
echo [3/4] Melakukan compiling Next.js Production Build...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Rebuild gagal! Periksa error di atas.
    pause
    goto MENU_LOOP
)
echo.
echo [4/4] Menyalakan ulang server CBT di Port %CBT_PORT%...
call :SUB_START_SERVER
echo.
echo [SUKSES] Sistem CBT berhasil di-rebuild dan dijalankan ulang di Port %CBT_PORT%!
ping 127.0.0.1 -n 3 >nul
goto MENU_LOOP


:DO_BROWSER
start http://localhost:%CBT_PORT%
goto MENU_LOOP


:DO_LOGS
cls
color 0F
echo ==============================================================================
echo                       LOG AKTIVITAS SERVER CBT
echo ==============================================================================
echo.
if exist "cbt-app.log" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path 'cbt-app.log' -Tail 30"
) else (
    echo [INFO] File log cbt-app.log belum tersedia.
)
echo.
echo ==============================================================================
echo Tekan sembarang tombol untuk kembali ke menu utama...
pause >nul
goto MENU_LOOP


:DO_EXIT
echo.
echo ==============================================================================
echo Menghentikan server CBT dan menutup controller...
call :SUB_STOP_SERVER
echo Server dimatikan. Selesai.
ping 127.0.0.1 -n 2 >nul
exit /b 0


REM ==============================================================================
REM SUBROUTINES
REM ==============================================================================

:SUB_START_SERVER
echo [..] Menjalankan server CBT di Port %CBT_PORT%...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$dir = [System.IO.Path]::GetFullPath('%~dp0.'); Start-Process -FilePath 'cmd.exe' -ArgumentList '/c node server.js > cbt-app.log 2>&1' -WorkingDirectory $dir -WindowStyle Hidden" >nul 2>&1
ping 127.0.0.1 -n 3 >nul
goto :eof

:SUB_STOP_SERVER
echo [..] Menghentikan service pada Port %CBT_PORT%...
for /f "tokens=5" %%p in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":%CBT_PORT% " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
)
ping 127.0.0.1 -n 2 >nul
goto :eof

