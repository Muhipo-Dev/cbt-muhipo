@echo off
title Setup Server CBT MUHIPO - Windows 10
color 0B

echo ==============================================================================
echo       SETUP BASIS DATA & SISTEM CBT MUHIPO STANDALONE (WINDOWS 10)
echo ==============================================================================
echo.
echo Sedang menyiapkan skema database SQLite dan akun default...
echo.

REM 1. Generate Prisma Client
echo [1/3] Generating Prisma ORM Client...
call npx prisma generate
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Gagal generate prisma client!
    pause
    exit /b %ERRORLEVEL%
)

REM 2. Push Schema ke Database SQLite
echo.
echo [2/3] Mendorong struktur tabel ke Database SQLite (dev.db)...
call npx prisma db push
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Gagal inisialisasi file database SQLite.
    pause
    exit /b %ERRORLEVEL%
)

REM 3. Inisialisasi Data Default (Super Admin, Mapel, Siswa Demo)
echo.
echo [3/3] Menanamkan akun default (Seed database)...
call npx tsx prisma/seed.ts

echo.
echo ==============================================================================
echo    SETUP BERHASIL! Database SQLite siap digunakan untuk ujian CBT Mandiri.
echo    Jalankan 'start-cbt-server.bat' untuk menyalakan server.
echo ==============================================================================
echo.
pause
