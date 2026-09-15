@echo off
:: ============================================================
::   CBT Launcher - Muhipo Dev (C) 2026
::   Portal CBT Ujian Berbasis Komputer Modern (Muhipo Dev)
::   Klik dua kali file ini untuk membuka menu launcher CBT
:: ============================================================
title CBT MUHIPO - Portal Ujian SMA Muhammadiyah 1 Ponorogo
chcp 65001 >nul 2>&1

:: Pindah ke direktori script berada
cd /d "%~dp0"

:: Cek apakah PowerShell tersedia
where powershell.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PowerShell tidak ditemukan!
    pause
    exit /b 1
)

:: Cek apakah npm / Node.js tersedia
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm tidak ditemukan. Pastikan Node.js sudah terinstal.
    echo Unduh dari: https://nodejs.org/
    pause
    exit /b 1
)

:: Jalankan script PowerShell dengan mengoperkan parameter mode jika ada
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0cbt.ps1" -Mode "%~1"

if errorlevel 1 (
    echo.
    echo [INFO] Terjadi error atau script selesai dijalankan.
    pause
)
