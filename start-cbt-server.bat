@echo off
setlocal enabledelayedexpansion

REM Atur PATH sistem agar semua utility sistem selalu dapat dipanggil
set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;%PATH%"
set "NODE_ENV=production"
set "HTTPS_PORT=8443"
set "HTTP_PORT=8080"

cd /d "%~dp0"
title CBT MUHIPO Server Controller - SMA Muhammadiyah 1 Ponorogo
color 0B

cls
echo ==============================================================================
echo       SERVER CBT MUHIPO STANDALONE - SMA MUHAMMADIYAH 1 PONOROGO
echo ==============================================================================
echo.

REM 1. Cek ketersediaan Node.js
where node >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js tidak ditemukan di sistem.
    echo Silakan install Node.js dari: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM 2. Cek apakah build Next.js sudah ada
if not exist ".next" (
    echo [INFO] Build sistem production belum ditemukan.
    echo Melakukan compiling build pertama kali ^(membutuhkan waktu sebentar^)...
    echo.
    call npm run build
    if errorlevel 1 (
        color 0C
        echo.
        echo [ERROR] Gagal melakukan build sistem. Silakan periksa pesan error.
        echo.
        pause
        exit /b 1
    )
    echo [OK] Build sistem berhasil.
)

REM 3. Jalankan server pertama kali jika belum aktif
set "INIT_PID="
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /R /C:":8443 " ^| findstr "LISTENING"') do (
    set "INIT_PID=%%a"
)
if not defined INIT_PID (
    call :SUB_START_SERVER
)

:MENU_LOOP
cls
set "SERVER_PID="
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /R /C:":8443 " ^| findstr "LISTENING"') do (
    set "SERVER_PID=%%a"
)

if defined SERVER_PID (
    color 0A
) else (
    color 0C
)

echo ==============================================================================
echo            CBT MUHIPO - SECURE HTTPS SERVER CONTROLLER
echo            Muhipo Dev (C) 2026
echo ==============================================================================
echo.

if defined SERVER_PID (
    echo  STATUS SERVER : [ AKTIF / ONLINE - SIAP DIGUNAKAN ^(PID: !SERVER_PID!^) ]
) else (
    echo  STATUS SERVER : [ NONAKTIF / OFFLINE ^(SERVER MATI^) ]
)

echo  PORT UTAMA    : 8443 (HTTPS Secure) ^& 8080 (HTTP Auto-Redirect)
echo  AKSES LOKAL   : https://localhost:8443
echo.
echo  ALAMAT IP JARINGAN (UNTUK AKSES PESERTA / SISWA):
set "LAST_IP="
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set "raw_ip=%%i"
    set "clean_ip=!raw_ip: =!"
    set "LAST_IP=!clean_ip!"
    echo    -^> https://!clean_ip!:8443
)
echo.
if defined LAST_IP (
    echo  [Catatan]: HTTP ^(http://!LAST_IP!:8080^) otomatis dialihkan ke HTTPS ^(https://!LAST_IP!:8443^).
) else (
    echo  [Catatan]: HTTP ^(port 8080^) otomatis dialihkan ke HTTPS ^(port 8443^).
)
echo             Pada browser siswa, klik "Lanjutan / Advanced" lalu "Lanjutkan ke situs".
echo.
echo ==============================================================================
echo  PILIHAN KONTROL SERVER CBT:
echo ==============================================================================
echo    [1] RESTART SERVER      - Mulai ulang server HTTPS (Port 8443 ^& 8080)
echo    [2] MATIKAN SERVER      - Hentikan server CBT (POWER OFF)
echo    [3] NYALAKAN SERVER     - Jalankan server CBT (POWER ON)
echo    [4] REBUILD SISTEM      - Build ulang source code + Restart server
echo    [5] BUKA DI BROWSER     - Buka https://localhost:8443 di browser
echo    [6] LIHAT LOG AKTIF     - Tampilkan catatan log aktivitas server
echo    [7] REFRESH STATUS      - Segarkan tampilan dan status koneksi
echo    [0] KELUAR              - Matikan server dan tutup jendela controller
echo ==============================================================================
echo.
set "CHOICE="
set /p "CHOICE=>> Masukkan nomor pilihan Anda [1/2/3/4/5/6/7/0]: "

if "%CHOICE%"=="1" goto DO_RESTART
if "%CHOICE%"=="2" goto DO_STOP
if "%CHOICE%"=="3" goto DO_START
if "%CHOICE%"=="4" goto DO_REBUILD
if "%CHOICE%"=="5" goto DO_BROWSER
if "%CHOICE%"=="6" goto DO_LOGS
if "%CHOICE%"=="7" goto MENU_LOOP
if "%CHOICE%"=="0" goto DO_EXIT

echo.
echo [!] Pilihan tidak valid, silakan masukkan nomor 0 sampai 7.
ping 127.0.0.1 -n 2 >nul
goto MENU_LOOP


:DO_RESTART
echo.
echo ==============================================================================
echo [1/2] Menghentikan server CBT...
call :SUB_STOP_SERVER
echo [2/2] Menyalakan server CBT Mode Secure HTTPS di Port 8443 ^& 8080...
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
echo [SUKSES] Server CBT berhasil dinonaktifkan (Port 8443 dan 8080 telah dibebaskan).
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
echo [..] Menjalankan server CBT di Port 8443 ^& 8080...
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
