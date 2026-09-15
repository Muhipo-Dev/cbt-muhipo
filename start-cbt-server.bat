@echo off
setlocal enabledelayedexpansion

REM Tambahkan direktori sistem standar dan Node.js ke PATH
set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;%PATH%"

cd /d "%~dp0"
title CBT MUHIPO Server (Production) - SMA Muhammadiyah 1 Ponorogo
color 0B

cls
echo ==============================================================================
echo       SERVER CBT MUHIPO STANDALONE - SMA MUHAMMADIYAH 1 PONOROGO
echo ==============================================================================
echo.

REM 1. Cek ketersediaan Node.js / npm
where npm >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js / npm tidak terdeteksi di PATH sistem.
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
    ping 127.0.0.1 -n 2 >nul
)

REM 3. Jalankan server pertama kali dalam mode production
call :SUB_STOP_SERVER
call :SUB_START_SERVER

:MENU_LOOP
cls
color 0A
echo ==============================================================================
echo            CBT MUHIPO - SECURE HTTPS SERVER CONTROLLER
echo            SMA Muhammadiyah 1 Ponorogo (C) 2026
echo ==============================================================================
echo.

REM Cek Status Port 443 & 80
set "STATUS_LABEL=NONAKTIF / MATI"
netstat -ano 2>nul | findstr ":443" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    set "STATUS_LABEL=AKTIF (SECURE HTTPS - PORT 443 & HTTP REDIRECT 80)"
)

echo  STATUS SERVER : [ !STATUS_LABEL! ]
echo  PORT SERVER   : 443 (HTTPS UTAMA AMAN) & 80 (HTTP AUTO-REDIRECT)
echo  AKSES LOKAL   : https://localhost
echo.
echo  ALAMAT IP JARINGAN (UNTUK AKSES PESERTA/SISWA):
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set "raw_ip=%%i"
    set "clean_ip=!raw_ip: =!"
    echo    -^> https://!clean_ip!
)
echo.
echo  [Catatan]: HTTP (http://!clean_ip!) akan otomatis dialihkan ke HTTPS (https://!clean_ip!).
echo             Pada browser siswa, klik "Lanjutan / Advanced" lalu "Lanjutkan ke situs".
echo.
echo ==============================================================================
echo  PILIHAN KONTROL SERVER CBT:
echo ==============================================================================
echo    [1] RESTART SERVER      - Mulai ulang server production HTTPS (Port 443 & 80)
echo    [2] NONAKTIFKAN SERVER  - Matikan server dan bebaskan port 443 & 80
echo    [3] REBUILD SISTEM      - Build ulang source code + Restart server
echo    [4] NYALAKAN SERVER     - Jalankan server (jika sedang mati)
echo    [5] BUKA DI BROWSER     - Buka https://localhost di browser
echo    [6] REFRESH TAMPILAN    - Segarkan status server
echo    [0] KELUAR              - Matikan server dan tutup jendela
echo ==============================================================================
echo.
set "CHOICE="
set /p "CHOICE=>> Masukkan pilihan Anda [1/2/3/4/5/6/0]: "

if "%CHOICE%"=="1" goto DO_RESTART
if "%CHOICE%"=="2" goto DO_STOP
if "%CHOICE%"=="3" goto DO_REBUILD
if "%CHOICE%"=="4" goto DO_START
if "%CHOICE%"=="5" goto DO_BROWSER
if "%CHOICE%"=="6" goto MENU_LOOP
if "%CHOICE%"=="0" goto DO_EXIT

echo.
echo [!] Pilihan tidak valid, silakan coba lagi.
ping 127.0.0.1 -n 2 >nul
goto MENU_LOOP


:DO_RESTART
echo.
echo ==============================================================================
echo [1/2] Menghentikan server CBT...
call :SUB_STOP_SERVER
echo [2/2] Menyalakan server CBT Mode Secure HTTPS di Port 443 & 80...
call :SUB_START_SERVER
echo.
echo [SUKSES] Server CBT berhasil direstart pada HTTPS Port 443!
ping 127.0.0.1 -n 3 >nul
goto MENU_LOOP


:DO_STOP
echo.
echo ==============================================================================
echo Menghentikan server CBT...
call :SUB_STOP_SERVER
echo [SUKSES] Server CBT berhasil dinonaktifkan. Port 443 dan 80 telah dibebaskan.
ping 127.0.0.1 -n 3 >nul
goto MENU_LOOP


:DO_START
echo.
echo ==============================================================================
echo Memeriksa dan menyalakan server CBT di Port 443 & 80...
call :SUB_STOP_SERVER
call :SUB_START_SERVER
echo [SUKSES] Server CBT aktif di mode HTTPS pada Port 443!
ping 127.0.0.1 -n 3 >nul
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
ping 127.0.0.1 -n 3 >nul
goto MENU_LOOP


:DO_BROWSER
start https://localhost
goto MENU_LOOP


:DO_EXIT
echo.
echo Menutup dan mematikan server CBT...
call :SUB_STOP_SERVER
echo Selesai. Sampai jumpa!
ping 127.0.0.1 -n 2 >nul
exit /b 0


REM ==============================================================================
REM SUBROUTINES
REM ==============================================================================

:SUB_START_SERVER
start "CBT_MUHIPO_PROD_SERVICE" /min cmd /c "npm run start > cbt-app.log 2>&1"
ping 127.0.0.1 -n 3 >nul
goto :eof

:SUB_STOP_SERVER
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":443\>" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":80\>" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
)
taskkill /FI "WINDOWTITLE eq CBT_MUHIPO_PROD_SERVICE*" /F /T >nul 2>&1
ping 127.0.0.1 -n 2 >nul
goto :eof
