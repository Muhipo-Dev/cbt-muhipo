@echo off
setlocal EnableExtensions EnableDelayedExpansion

chcp 65001 >nul 2>&1
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"
title INSTALLER CBT v2 SMA MUHIPO - Windows Server 2025
color 0B

echo ==============================================================================
echo       INSTALLER & SETUP OTOMATIS CBT v2 SMA MUHIPO (WINDOWS SERVER 2025)
echo       SMA Muhammadiyah 1 Ponorogo - Muhipo Dev (C) 2026
echo ==============================================================================
echo.
echo Pemeriksaan hak akses Administrator...
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [PERINGATAN] Script ini tidak dijalankan sebagai Administrator.
    echo Beberapa fitur otomatisasi (Firewall, Windows Service, auto-install Node/PostgreSQL)
    echo memerlukan hak Administrator.
    echo.
    echo Disarankan: Klik kanan file ini dan pilih 'Run as Administrator'.
    echo.
    set /p "CONT_ADMIN=Lanjutkan dengan hak akses saat ini? (y/n) [y]: "
    if /i "!CONT_ADMIN!"=="n" exit /b 1
)

:: Pindahkan eksekusi ke installer PowerShell komprehensif
set "PS_EXEC="
where pwsh.exe >nul 2>&1
if not errorlevel 1 set "PS_EXEC=pwsh.exe"
if not defined PS_EXEC (
    where powershell.exe >nul 2>&1
    if not errorlevel 1 set "PS_EXEC=powershell.exe"
)

if defined PS_EXEC (
    echo [INFO] Menjalankan Wizard Instalasi Interaktif CBT v2 via PowerShell...
    echo.
    "%PS_EXEC%" -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%install-windows-server.ps1"
    goto END_INSTALL
)

echo [ERROR] PowerShell tidak ditemukan pada sistem ini!
pause
exit /b 1

:END_INSTALL
if %errorlevel% equ 0 (
    echo.
    echo [SUKSES] Instalasi dan konfigurasi CBT v2 SMA Muhipo selesai!
) else (
    echo.
    echo [PERHATIKAN] Proses instalasi selesai dengan catatan atau dibatalkan.
)
pause
exit /b %errorlevel%
