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
echo            CBT MUHIPO - PRODUCTION SERVER CONTROLLER
echo            SMA Muhammadiyah 1 Ponorogo (C) 2026
echo ==============================================================================
echo.

REM Cek Status Port 3010
set "STATUS_LABEL=NONAKTIF / MATI"
netstat -ano 2>nul | findstr ":3010" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    set "STATUS_LABEL=AKTIF (MODE PRODUCTION - RINGAN DAN CEPAT)"
)

echo  STATUS SERVER : [ !STATUS_LABEL! ]
echo  PORT SERVER   : 3010
echo  AKSES LOKAL   : http://localhost:3010
echo.
echo  ALAMAT IP JARINGAN (UNTUK AKSES PESERTA/SISWA):
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set "raw_ip=%%i"
    set "clean_ip=!raw_ip: =!"
    echo    -^> http://!clean_ip!:3010
)
echo.
echo ==============================================================================
echo  PILIHAN KONTROL SERVER CBT:
echo ==============================================================================
echo    [1] RESTART SERVER      - Mulai ulang server production
echo    [2] NONAKTIFKAN SERVER  - Matikan server dan bebaskan port 3010
echo    [3] REBUILD SISTEM      - Build ulang source code + Restart server
echo    [4] NYALAKAN SERVER     - Jalankan server (jika sedang mati)
echo    [5] BUKA DI BROWSER     - Buka http://localhost:3010 di browser
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
echo [2/2] Menyalakan server CBT Mode Production...
call :SUB_START_SERVER
echo.
echo [SUKSES] Server CBT berhasil direstart!
ping 127.0.0.1 -n 3 >nul
goto MENU_LOOP


:DO_STOP
echo.
echo ==============================================================================
echo Menghentikan server CBT...
call :SUB_STOP_SERVER
echo [SUKSES] Server CBT berhasil dinonaktifkan. Port 3010 telah dibebaskan.
ping 127.0.0.1 -n 3 >nul
goto MENU_LOOP


:DO_START
echo.
echo ==============================================================================
echo Memeriksa dan menyalakan server CBT...
call :SUB_STOP_SERVER
call :SUB_START_SERVER
echo [SUKSES] Server CBT aktif di mode production!
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
echo [4/4] Menyalakan ulang server CBT Production...
call :SUB_START_SERVER
echo.
echo [SUKSES] Sistem CBT berhasil di-rebuild dan dijalankan ulang!
ping 127.0.0.1 -n 3 >nul
goto MENU_LOOP


:DO_BROWSER
start http://localhost:3010
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
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3010" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
)
taskkill /FI "WINDOWTITLE eq CBT_MUHIPO_PROD_SERVICE*" /F /T >nul 2>&1
ping 127.0.0.1 -n 2 >nul
goto :eof
