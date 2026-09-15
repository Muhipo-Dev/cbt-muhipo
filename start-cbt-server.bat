@echo off
setlocal enabledelayedexpansion

REM Tambahkan direktori sistem standar dan Node.js ke PATH
set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;%PATH%"
set "NODE_ENV=production"

cd /d "%~dp0"
title CBT MUHIPO Server (Production) - SMA Muhammadiyah 1 Ponorogo
color 0B

cls
echo ==============================================================================
echo       SERVER CBT MUHIPO STANDALONE - SMA MUHAMMADIYAH 1 PONOROGO
echo ==============================================================================
echo.

REM 1. Cek ketersediaan Node.js / npm
where node >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js tidak terdeteksi di PATH sistem.
    echo Pastikan Node.js telah diinstall: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM 2. Cek apakah folder .next sudah ada
if not exist ".next" (
    echo [INFO] Build production belum ditemukan.
    echo Melakukan build sistem pertama kali - membutuhkan waktu sebentar...
    echo.
    call npm run build
    if errorlevel 1 (
        color 0C
        echo.
        echo [ERROR] Gagal melakukan build sistem. Silakan periksa pesan error di atas.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Build sistem berhasil.
    "%SystemRoot%\System32\ping.exe" 127.0.0.1 -n 2 >nul
)

REM 3. Jalankan server pertama kali jika belum aktif
set "ALREADY_ACTIVE=0"
for /f "tokens=5" %%a in ('"%SystemRoot%\System32\netstat.exe" -ano 2^>nul ^| "%SystemRoot%\System32\findstr.exe" ":443 " ^| "%SystemRoot%\System32\findstr.exe" "LISTENING"') do (
    set "ALREADY_ACTIVE=1"
)
if "!ALREADY_ACTIVE!"=="0" (
    call :SUB_START_SERVER
)

:MENU_LOOP
cls
color 0A

REM Cek Status Port 443 & 80
set "IS_ACTIVE=0"
set "SERVER_PID="
for /f "tokens=5" %%a in ('"%SystemRoot%\System32\netstat.exe" -ano 2^>nul ^| "%SystemRoot%\System32\findstr.exe" ":443 " ^| "%SystemRoot%\System32\findstr.exe" "LISTENING"') do (
    set "IS_ACTIVE=1"
    set "SERVER_PID=%%a"
)

echo ==============================================================================
echo            CBT MUHIPO - SECURE HTTPS SERVER CONTROLLER
echo            SMA Muhammadiyah 1 Ponorogo (C) 2026
echo ==============================================================================
echo.
if "!IS_ACTIVE!"=="1" (
    color 0A
    echo  STATUS SERVER : [ AKTIF - SIAP DIGUNAKAN (PID: !SERVER_PID!) ]
) else (
    color 0C
    echo  STATUS SERVER : [ NONAKTIF / MATI ]
)
echo  PORT SERVER   : 443 (HTTPS UTAMA AMAN) ^& 80 (HTTP AUTO-REDIRECT)
echo  AKSES LOKAL   : https://localhost
echo.
echo  ALAMAT IP JARINGAN (UNTUK AKSES PESERTA/SISWA):
set "LAST_IP="
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| "%SystemRoot%\System32\findstr.exe" /i "IPv4"') do (
    set "raw_ip=%%i"
    set "clean_ip=!raw_ip: =!"
    set "LAST_IP=!clean_ip!"
    echo    -^> https://!clean_ip!
)
echo.
if defined LAST_IP (
    echo  [Catatan]: HTTP (http://!LAST_IP!) otomatis dialihkan ke HTTPS (https://!LAST_IP!).
) else (
    echo  [Catatan]: HTTP (port 80) otomatis dialihkan ke HTTPS (port 443).
)
echo             Pada browser siswa, klik "Lanjutan / Advanced" lalu "Lanjutkan ke situs".
echo.
echo ==============================================================================
echo  PILIHAN KONTROL SERVER CBT:
echo ==============================================================================
echo    [1] RESTART SERVER      - Mulai ulang server HTTPS (Port 443 ^& 80)
echo    [2] MATIKAN SERVER      - Matikan server CBT (POWER OFF)
echo    [3] NYALAKAN SERVER     - Jalankan server CBT (POWER ON)
echo    [4] REBUILD SISTEM      - Build ulang source code + Restart server
echo    [5] BUKA DI BROWSER     - Buka https://localhost di browser
echo    [6] LIHAT LOG SERVER    - Tampilkan pesan log aktivitas server
echo    [7] REFRESH STATUS      - Segarkan tampilan status
echo    [0] KELUAR              - Tutup controller (server tetap/opsi matikan)
echo ==============================================================================
echo.
set "CHOICE="
set /p "CHOICE=>> Masukkan nomor pilihan Anda [1-7/0]: "

if "%CHOICE%"=="1" goto DO_RESTART
if "%CHOICE%"=="2" goto DO_STOP
if "%CHOICE%"=="3" goto DO_START
if "%CHOICE%"=="4" goto DO_REBUILD
if "%CHOICE%"=="5" goto DO_BROWSER
if "%CHOICE%"=="6" goto DO_LOGS
if "%CHOICE%"=="7" goto MENU_LOOP
if "%CHOICE%"=="0" goto DO_EXIT

echo.
echo [!] Pilihan tidak valid, silakan coba lagi.
"%SystemRoot%\System32\ping.exe" 127.0.0.1 -n 2 >nul
goto MENU_LOOP


:DO_RESTART
echo.
echo ==============================================================================
echo [1/2] Menghentikan server CBT yang berjalan...
call :SUB_STOP_SERVER
echo [2/2] Menyalakan server CBT Mode Secure HTTPS di Port 443 ^& 80...
call :SUB_START_SERVER
echo.
echo [SUKSES] Server CBT berhasil direstart!
"%SystemRoot%\System32\ping.exe" 127.0.0.1 -n 3 >nul
goto MENU_LOOP


:DO_STOP
echo.
echo ==============================================================================
echo Menghentikan server CBT...
call :SUB_STOP_SERVER
echo.
echo [SUKSES] Server CBT berhasil dinonaktifkan. Port 443 dan 80 telah dibebaskan.
"%SystemRoot%\System32\ping.exe" 127.0.0.1 -n 3 >nul
goto MENU_LOOP


:DO_START
echo.
echo ==============================================================================
echo Memeriksa dan menyalakan server CBT di Port 443 ^& 80...
call :SUB_STOP_SERVER
call :SUB_START_SERVER
echo.
echo [SUKSES] Server CBT berhasil dijalankan!
"%SystemRoot%\System32\ping.exe" 127.0.0.1 -n 3 >nul
goto MENU_LOOP


:DO_REBUILD
echo.
echo ==============================================================================
echo                  PROSES REBUILD SISTEM CBT MUHIPO
echo ==============================================================================
echo [1/4] Menghentikan server...
call :SUB_STOP_SERVER
echo.
echo [2/4] Sinkronisasi skema Prisma ORM...
call npx prisma generate
echo.
echo [3/4] Melakukan compiling Next.js Production Build...
call npm run build
if errorlevel 1 (
    color 0C
    echo.
    echo [ERROR] Rebuild gagal! Periksa error di atas.
    pause
    goto MENU_LOOP
)
echo.
echo [4/4] Menyalakan ulang server CBT Secure HTTPS di Port 443...
call :SUB_START_SERVER
echo.
echo [SUKSES] Sistem CBT berhasil di-rebuild dan dijalankan ulang di HTTPS Port 443!
"%SystemRoot%\System32\ping.exe" 127.0.0.1 -n 3 >nul
goto MENU_LOOP


:DO_BROWSER
start https://localhost
goto MENU_LOOP


:DO_LOGS
cls
color 0F
echo ==============================================================================
echo                       LOG AKTIVITAS SERVER CBT (TERAKHIR)
echo ==============================================================================
echo.
if exist "cbt-app.log" (
    powershell.exe -NoProfile -Command "Get-Content -Path 'cbt-app.log' -Tail 30"
) else (
    echo [INFO] Belum ada file log cbt-app.log.
)
echo.
echo ==============================================================================
echo Tekan sembarang tombol untuk kembali ke menu utama...
pause >nul
goto MENU_LOOP


:DO_EXIT
echo.
echo ==============================================================================
echo Pilihan keluar:
echo   [1] Matikan server CBT dan tutup jendela
echo   [2] Biarkan server CBT tetap berjalan di latar belakang dan tutup jendela
echo ==============================================================================
set "EXIT_OPT="
set /p "EXIT_OPT=>> Masukkan pilihan [1/2]: "
if "%EXIT_OPT%"=="1" (
    echo Menghentikan server CBT...
    call :SUB_STOP_SERVER
    echo Server dimatikan.
)
echo Sampai jumpa!
"%SystemRoot%\System32\ping.exe" 127.0.0.1 -n 2 >nul
exit /b 0


REM ==============================================================================
REM SUBROUTINES
REM ==============================================================================

:SUB_START_SERVER
echo [..] Menyalakan CBT HTTPS Server di latar belakang...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'node.exe' -ArgumentList 'server.js' -WorkingDirectory '%~dp0.' -WindowStyle Hidden -RedirectStandardOutput '%~dp0cbt-app.log' -RedirectStandardError '%~dp0cbt-app.log'" >nul 2>&1
"%SystemRoot%\System32\ping.exe" 127.0.0.1 -n 3 >nul
goto :eof

:SUB_STOP_SERVER
echo [..] Menghentikan proses pada Port 443 dan 80...
for /f "tokens=5" %%p in ('"%SystemRoot%\System32\netstat.exe" -ano 2^>nul ^| "%SystemRoot%\System32\findstr.exe" ":443 " ^| "%SystemRoot%\System32\findstr.exe" "LISTENING"') do (
    "%SystemRoot%\System32\taskkill.exe" /F /PID %%p >nul 2>&1
)
for /f "tokens=5" %%p in ('"%SystemRoot%\System32\netstat.exe" -ano 2^>nul ^| "%SystemRoot%\System32\findstr.exe" ":80 " ^| "%SystemRoot%\System32\findstr.exe" "LISTENING"') do (
    "%SystemRoot%\System32\taskkill.exe" /F /PID %%p >nul 2>&1
)
"%SystemRoot%\System32\ping.exe" 127.0.0.1 -n 2 >nul
goto :eof
