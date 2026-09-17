@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ============================================================
::   CBT Launcher - Muhipo Dev (C) 2026
::   Portal CBT Ujian Berbasis Komputer Modern (Muhipo Dev)
::   Klik dua kali file ini untuk membuka menu launcher CBT
:: ============================================================
title CBT MUHIPO - Portal Ujian SMA Muhammadiyah 1 Ponorogo
chcp 65001 >nul 2>&1

:: Pindah ke direktori script berada
cd /d "%~dp0"

:: Inisialisasi PATH komprehensif untuk server Windows (Node.js, NVM, Program Files)
set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;C:\Program Files (x86)\nodejs;%NVM_HOME%;%NVM_SYMLINK%;%PATH%"

:: Cek apakah PowerShell tersedia
where powershell.exe >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PowerShell tidak ditemukan pada sistem ini!
    pause
    exit /b 1
)

:: Cek apakah Node.js tersedia
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js belum terpasang atau belum ada di PATH.
    echo Silakan jalankan setup-cbt-windows.bat terlebih dahulu untuk instalasi otomatis.
    echo.
    pause
    exit /b 1
)

:: Jalankan script PowerShell dengan mengoperkan parameter mode jika ada
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0cbt.ps1" -Mode "%~1"

if %errorlevel% neq 0 (
    echo.
    echo [INFO] Script selesai atau jendela ditutup.
    pause
)

