@echo off
setlocal EnableExtensions EnableDelayedExpansion

chcp 65001 >nul 2>&1
cd /d "%~dp0"
title CBT MUHIPO Server Controller - SMA Muhammadiyah 1 Ponorogo
color 0B

set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;C:\xampp\mysql\bin;D:\xampp\mysql\bin;E:\xampp\mysql\bin;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;C:\Program Files (x86)\nodejs;%PATH%"
set "NODE_ENV=production"
set "HTTPS_PORT=8443"
set "HTTP_PORT=8080"

cls
echo ==============================================================================
echo       SERVER CBT MUHIPO STANDALONE MYSQL - SMA MUHAMMADIYAH 1 PONOROGO
echo       Muhipo Dev (C) 2026 - Multi-User High Performance Server
echo ==============================================================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 goto ERR_NODE
goto OK_NODE

:ERR_NODE
color 0C
echo [ERROR] Node.js tidak ditemukan di sistem ini.
echo Silakan instal Node.js LTS dari https://nodejs.org/
echo.
pause
exit /b 1

:OK_NODE
if not exist ".env" (
    echo [INFO] File .env belum ada, membuat konfigurasi standar otomatis...
    echo # KONFIGURASI BASIS DATA CBT MUHIPO > ".env"
    echo DATABASE_URL="mysql://root:@127.0.0.1:3306/cbt_muhipo" >> ".env"
    echo JWT_SECRET="cbt-muhipo-super-secret-key-2026-production-ready" >> ".env"
    echo HTTPS_PORT=8443 >> ".env"
    echo HTTP_PORT=8080 >> ".env"
    echo NEXT_PUBLIC_APP_URL="https://localhost:8443" >> ".env"
    echo NEXT_PUBLIC_APP_NAME="CBT SMA Muhammadiyah 1 Ponorogo" >> ".env"
    echo NEXT_PUBLIC_SCHOOL_NAME="SMA Muhammadiyah 1 Ponorogo" >> ".env"
    echo NEXT_PUBLIC_SCHOOL_ADDRESS="Jl. Batoro Katong No. 6 Ponorogo, Jawa Timur" >> ".env"
)

set "MYSQL_PID="
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /R /C:":3306 " ^| findstr "LISTENING"') do set "MYSQL_PID=%%a"

if not defined MYSQL_PID (
    echo [INFO] MySQL Server Port 3306 belum aktif. Menyalakan MySQL XAMPP di latar belakang...
    if exist "C:\xampp\mysql_start.bat" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c C:\xampp\mysql_start.bat' -WindowStyle Hidden" >nul 2>&1
    ) else if exist "D:\xampp\mysql_start.bat" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c D:\xampp\mysql_start.bat' -WindowStyle Hidden" >nul 2>&1
    ) else if exist "C:\xampp\mysql\bin\mysqld.exe" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'C:\xampp\mysql\bin\mysqld.exe' -ArgumentList '--defaults-file=C:\xampp\mysql\bin\my.ini --standalone' -WindowStyle Hidden" >nul 2>&1
    )
    ping 127.0.0.1 -n 4 >nul
)

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

set "INIT_PID="
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /R /C:":8443 " ^| findstr "LISTENING"') do set "INIT_PID=%%a"
if not defined INIT_PID call :SUB_START_SERVER

:MENU_LOOP
cls
set "SERVER_PID="
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /R /C:":8443 " ^| findstr "LISTENING"') do set "SERVER_PID=%%a"

set "DB_PID="
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /R /C:":3306 " ^| findstr "LISTENING"') do set "DB_PID=%%a"

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
    set "DB_TXT=[ TERPUTUS / MATI - CEK XAMPP PORT 3306 ]"
)

echo ==============================================================================
echo            CBT MUHIPO - SECURE HTTPS SERVER CONTROLLER
echo            Muhipo Dev (C) 2026 - SMA Muhammadiyah 1 Ponorogo
echo ==============================================================================
echo.
echo  STATUS SERVER : !SRV_TXT!
echo  DATABASE MYSQL: !DB_TXT!
echo  PORT UTAMA    : 8443 (HTTPS Secure) dan 8080 (HTTP Auto-Redirect)
echo  AKSES PROKTOR : https://localhost:8443
echo.
echo  ALAMAT IP JARINGAN (UNTUK AKSES PESERTA / SISWA DI RUANGAN / LAB):
set "LAST_IP="
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set "raw_ip=%%i"
    set "clean_ip=!raw_ip: =!"
    set "LAST_IP=!clean_ip!"
    echo    -^> https://!clean_ip!:8443
)
echo.
echo  [Info Akses]: Siswa membuka https://[IP_KOMPUTER]:8443 atau http://[IP_KOMPUTER]:8080
echo  Browser siswa: Jika muncul peringatan SSL mandiri, klik Lanjutan lalu Lanjutkan.
echo.
echo ==============================================================================
echo  PILIHAN KONTROL SERVER CBT:
echo ==============================================================================
echo    [1] RESTART SERVER      - Mulai ulang server HTTPS
echo    [2] MATIKAN SERVER      - Hentikan server CBT
echo    [3] NYALAKAN SERVER     - Jalankan server CBT
echo    [4] REBUILD SISTEM      - Build ulang source code + Restart server
echo    [5] BUKA DI BROWSER     - Buka https://localhost:8443 di browser
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
echo [2/2] Menyalakan server CBT Mode Secure HTTPS di Port 8443 dan 8080...
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
echo [4/4] Menyalakan ulang server CBT Secure HTTPS di Port 8443...
call :SUB_START_SERVER
echo.
echo [SUKSES] Sistem CBT berhasil di-rebuild dan dijalankan ulang di HTTPS Port 8443!
ping 127.0.0.1 -n 3 >nul
goto MENU_LOOP


:DO_BROWSER
start https://localhost:8443
goto MENU_LOOP


:DO_LOGS
cls
color 0F
echo ==============================================================================
echo                       LOG AKTIVITAS SERVER CBT
echo ==============================================================================
echo.
if exist "cbt-app.log" (
    powershell.exe -NoProfile -Command "Get-Content -Path 'cbt-app.log' -Tail 30"
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
echo [..] Menjalankan server CBT di Port 8443 dan 8080...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c node server.js > cbt-app.log 2>&1' -WorkingDirectory '%~dp0.' -WindowStyle Hidden" >nul 2>&1
ping 127.0.0.1 -n 3 >nul
goto :eof

:SUB_STOP_SERVER
echo [..] Menghentikan service pada Port 8443 dan 8080...
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr /R /C:":8443 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr /R /C:":8080 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
)
ping 127.0.0.1 -n 2 >nul
goto :eof
