@echo off
setlocal enabledelayedexpansion

REM Tambahkan direktori sistem standar dan Node.js ke PATH
set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;%PATH%"

cd /d "%~dp0"
title Setup Server CBT MUHIPO - Windows 10
color 0B

echo ==============================================================================
echo       SETUP BASIS DATA DAN SISTEM CBT MUHIPO STANDALONE (WINDOWS 10)
echo ==============================================================================
echo.
echo Sedang menyiapkan skema database SQLite dan akun default...
echo.

REM 1. Generate Prisma Client
echo [1/3] Generating Prisma ORM Client...
call npx prisma generate
if errorlevel 1 (
    color 0C
    echo [ERROR] Gagal generate prisma client!
    pause
    exit /b 1
)

REM 2. Push Schema ke Database SQLite
echo.
echo [2/3] Mendorong struktur tabel ke Database SQLite (dev.db)...
call npx prisma db push
if errorlevel 1 (
    color 0C
    echo [ERROR] Gagal inisialisasi file database SQLite.
    pause
    exit /b 1
)

REM 3. Inisialisasi Data Default
echo.
echo [3/3] Menanamkan akun default (Seed database)...
call npx tsx prisma/seed.ts
if errorlevel 1 (
    color 0C
    echo [ERROR] Gagal melakukan seeding akun default.
    pause
    exit /b 1
)

echo.
echo ==============================================================================
echo    SETUP BERHASIL! Database SQLite siap digunakan untuk ujian CBT Mandiri.
echo ==============================================================================
echo.
echo  AKUN DEFAULT PENGGUNA CBT:
echo  --------------------------------------------------------------------------
echo  - ADMINISTRASI (Super Admin) : username = nailar   ^| password = nailar
echo  - PROKTOR (Pengawas Lab)     : username = niam     ^| password = niam
echo  --------------------------------------------------------------------------
echo.
echo  Jalankan 'start-cbt-server.bat' untuk menyalakan server produksi.
echo ==============================================================================
echo.
pause
