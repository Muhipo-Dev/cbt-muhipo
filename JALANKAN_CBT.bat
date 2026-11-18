@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ============================================================
::   CBT Launcher - Muhipo Dev (C) 2026
::   Portal CBT v2 SMA Muhipo (Versi 2)
::   Smart Environment Analyzer & Dual-Engine Launcher (PowerShell / Native CMD)
:: ============================================================
title CBT v2 SMA Muhipo - Portal Ujian SMA Muhammadiyah 1 Ponorogo
chcp 65001 >nul 2>&1

:: Pindah ke direktori script berada
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"

:: Inisialisasi PATH komprehensif untuk server Windows (Node.js, NVM, Program Files, PostgreSQL)
:: Inisialisasi Port DB Default (5432 atau dari .env)
set "DB_PORT=5432"
if exist ".env" (
    for /f "usebackq tokens=*" %%L in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$c = Get-Content '.env' -Raw; if ($c -match 'DATABASE_URL=\x22?postgresql:\/\/[^:]+:?[^@]*@[^:\/]+:?(\d*)\/') { if ($Matches[1]) { Write-Output $Matches[1] } else { Write-Output '5432' } }" 2^>nul`) do (
        if not "%%L"=="" set "DB_PORT=%%L"
    )
)

:: ============================================================
::   TAHAP 1: SISTEM DETEKSI POWERSHELL & LAUNCHER PS1
:: ============================================================
set "PS_EXEC="

where pwsh.exe >nul 2>&1
if not errorlevel 1 (
    set "PS_EXEC=pwsh.exe"
)

if not defined PS_EXEC (
    where powershell.exe >nul 2>&1
    if not errorlevel 1 (
        set "PS_EXEC=powershell.exe"
    )
)

if defined PS_EXEC (
    if exist "%ROOT_DIR%cbt.ps1" (
        if "%~1"=="" (
            "%PS_EXEC%" -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%cbt.ps1"
        ) else (
            "%PS_EXEC%" -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%cbt.ps1" -Mode "%~1"
        )
        if not errorlevel 1 (
            exit /b 0
        )
        echo.
        echo [INFO] Eksekusi PowerShell dialihkan ke Native Terminal CMD...
    )
)

:: ============================================================
::   TAHAP 2: NATIVE TERMINAL CMD ENGINE (AUTOMATIC FALLBACK)
:: ============================================================
:CMD_MAIN_MENU
cls
echo.
echo  +==================================================+
echo  |         CBT v2 SMA Muhipo - Muhipo Dev 2026      |
echo  |    Sistem CBT SMA Muhammadiyah 1 Ponorogo (v2)   |
echo  |    [Mode: Native Terminal Windows CMD Engine]    |
echo  +==================================================+
echo.
echo  Status Layanan Port:
call :CHECK_PORT_STATUS 4020  "CBT Web App      "
call :CHECK_PORT_STATUS 5560  "Prisma Studio    "
call :CHECK_PORT_STATUS %DB_PORT% "PostgreSQL (DB)  "
echo.
echo  +=========================================+
echo  |               MENU UTAMA                |
echo  +=========================================+
echo  |  [1] Jalankan Semua Layanan (App+Studio)|
echo  |  [2] Hentikan Semua Layanan             |
echo  |  [3] Jalankan CBT Web App Saja (:4020)  |
echo  |  [4] Jalankan Prisma Studio GUI (:5560) |
echo  |  [5] Restart CBT Web App (:4020)        |
echo  |  [6] Restart Database PostgreSQL        |
echo  |  [7] Restart Semua Layanan (Full)       |
echo  |  [8] Rebuild ^& Restart CBT (Compile)   |
echo  |  [9] Inisialisasi Database (Push+Seed)  |
echo  |  [10] Buka Browser CBT (:4020)          |
echo  |  [0] Keluar dari Launcher               |
echo  +=========================================+
echo.
set /p "CHOICE=  Pilih menu [0-10]: "

if "%CHOICE%"=="1" goto CMD_START_ALL
if "%CHOICE%"=="2" goto CMD_STOP_ALL
if "%CHOICE%"=="3" goto CMD_START_APP
if "%CHOICE%"=="4" goto CMD_START_STUDIO
if "%CHOICE%"=="5" goto CMD_RESTART_APP
if "%CHOICE%"=="6" goto CMD_RESTART_DB
if "%CHOICE%"=="7" goto CMD_RESTART_ALL
if "%CHOICE%"=="8" goto CMD_REBUILD
if "%CHOICE%"=="9" goto CMD_DB_INIT
if "%CHOICE%"=="10" goto CMD_OPEN_BROWSER
if "%CHOICE%"=="0" exit /b 0

echo [ERROR] Pilihan tidak valid!
pause
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: SUB-ROUTINE: CHECK PORT STATUS
:: ------------------------------------------------------------
:CHECK_PORT_STATUS
set "P_NUM=%~1"
set "P_NAME=%~2"
set "IS_OPEN="
for /f "tokens=5" %%p in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":%P_NUM% " ^| findstr "LISTENING"') do (
    set "IS_OPEN=%%p"
)
if defined IS_OPEN (
    echo   - %P_NAME% : AKTIF     [Port :%P_NUM%] (PID: %IS_OPEN%)
) else (
    echo   - %P_NAME% : MATI/OFF  [Port :%P_NUM%]
)
goto :eof

:: ------------------------------------------------------------
:: ACTIONS
:: ------------------------------------------------------------
:CMD_START_ALL
cls
echo [INFO] Menyalakan Database PostgreSQL...
call :SUB_ENSURE_DB
echo [INFO] Menyalakan CBT Web App (:4020)...
call :SUB_START_APP
echo [INFO] Menyalakan Prisma Studio (:5560)...
call :SUB_START_STUDIO
echo.
echo [OK] Semua layanan berhasil dimulai.
echo [INFO] Membuka browser CBT Web App (http://localhost:4020)...
start http://localhost:4020
pause
goto CMD_MAIN_MENU

:CMD_STOP_ALL
cls
echo [INFO] Menghentikan CBT Web App...
call :SUB_STOP_APP
echo [INFO] Menghentikan Prisma Studio...
call :SUB_STOP_STUDIO
echo.
echo [OK] Semua layanan CBT dihentikan.
pause
goto CMD_MAIN_MENU

:CMD_START_APP
cls
call :SUB_ENSURE_DB
call :SUB_START_APP
pause
goto CMD_MAIN_MENU

:CMD_START_STUDIO
cls
call :SUB_ENSURE_DB
call :SUB_START_STUDIO
pause
goto CMD_MAIN_MENU

:CMD_RESTART_APP
cls
echo [INFO] Merestart CBT Web App...
call :SUB_STOP_APP
timeout /t 1 >nul
call :SUB_START_APP
echo [OK] CBT Web App berhasil direstart.
pause
goto CMD_MAIN_MENU

:CMD_RESTART_DB
cls
echo [INFO] Merestart Database PostgreSQL...
call :SUB_RESTART_DB
pause
goto CMD_MAIN_MENU

:CMD_RESTART_ALL
cls
echo [INFO] Merestart semua layanan (Aplikasi, Database, Prisma Studio)...
call :SUB_STOP_APP
call :SUB_STOP_STUDIO
call :SUB_RESTART_DB
call :SUB_START_APP
call :SUB_START_STUDIO
echo [OK] Semua layanan berhasil direstart.
pause
goto CMD_MAIN_MENU

:CMD_REBUILD
cls
echo ============================================================
echo   REBUILD & RESTART CBT MUHIPO (COMPILE ULANG)
echo ============================================================
call :SUB_STOP_APP
call :SUB_STOP_STUDIO
timeout /t 1 >nul
echo [1/3] Menghasilkan Prisma Client...
call npx prisma generate
echo.
echo [2/3] Mengompilasi Next.js Production Build...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build gagal! Periksa error di atas.
    pause
    goto CMD_MAIN_MENU
)
echo.
echo [3/3] Menyalakan kembali CBT Web App (:4020) & Prisma Studio (:5560)...
call :SUB_START_APP
call :SUB_START_STUDIO
echo [OK] Rebuild dan restart berhasil dilakukan!
pause
goto CMD_MAIN_MENU

:CMD_DB_INIT
cls
echo [INFO] Inisialisasi Skema Database (Prisma db push & seed)...
call :SUB_ENSURE_DB
call npx prisma db push
call npx tsx prisma/seed.ts
echo [OK] Skema database berhasil diperbarui.
pause
goto CMD_MAIN_MENU

:CMD_OPEN_BROWSER
start http://localhost:4020
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: SUB-HELPERS
:: ------------------------------------------------------------
:SUB_ENSURE_DB
set "DB_PID="
for /f "tokens=5" %%p in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":%DB_PORT% " ^| findstr "LISTENING"') do set "DB_PID=%%p"
if not defined DB_PID (
    :: Coba start service Windows
    sc start postgresql-x64-18 >nul 2>&1
    sc start postgresql-x64-17 >nul 2>&1
    sc start postgresql-x64-16 >nul 2>&1
    timeout /t 2 >nul
    for /f "tokens=5" %%p in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":%DB_PORT% " ^| findstr "LISTENING"') do set "DB_PID=%%p"
)
if not defined DB_PID (
    if exist "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" (
        if exist "D:\simasmuh\database\data" (
            start /b "" "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "D:\simasmuh\database\data" -o "-p %DB_PORT%" start >nul 2>&1
            timeout /t 2 >nul
        )
    )
)
goto :eof

:SUB_RESTART_DB
sc stop postgresql-x64-18 >nul 2>&1
sc stop postgresql-x64-17 >nul 2>&1
if exist "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" (
    if exist "D:\simasmuh\database\data" (
        "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "D:\simasmuh\database\data" stop -m fast >nul 2>&1
        timeout /t 1 >nul
    )
)
for /f "tokens=5" %%p in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":%DB_PORT% " ^| findstr "LISTENING"') do (
    taskkill /PID %%p /T /F >nul 2>&1
)
timeout /t 1 >nul
call :SUB_ENSURE_DB
echo [OK] Database PostgreSQL berhasil direstart pada port %DB_PORT%.
goto :eof

:SUB_START_APP
call :SUB_STOP_APP
echo Memulai CBT Web App HTTP di port 4020...
start /b "" cmd.exe /c "set PORT=4020& set HTTP_PORT=4020& set NODE_ENV=production& node server.js > cbt-app.log 2>&1"
timeout /t 3 >nul
for /f "tokens=5" %%p in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":4020 " ^| findstr "LISTENING"') do (
    echo %%p > .cbt-app.pid
    echo [OK] CBT Web App aktif pada port 4020 (PID: %%p).
)
goto :eof

:SUB_STOP_APP
for /f "tokens=5" %%p in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":4020 " ^| findstr "LISTENING"') do (
    taskkill /PID %%p /T /F >nul 2>&1
)
if exist ".cbt-app.pid" del ".cbt-app.pid" >nul 2>&1
echo [OK] CBT Web App dihentikan.
goto :eof

:SUB_START_STUDIO
call :SUB_STOP_STUDIO
echo Memulai Prisma Studio di port 5560 (Latar Belakang)...
start /b "" cmd.exe /c "npx prisma studio --port 5560 --browser none > prisma-studio.log 2>&1"
timeout /t 2 >nul
for /f "tokens=5" %%p in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":5560 " ^| findstr "LISTENING"') do (
    echo %%p > .prisma-studio.pid
    echo [OK] Prisma Studio aktif pada port 5560 (PID: %%p).
)
goto :eof

:SUB_STOP_STUDIO
for /f "tokens=5" %%p in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":5560 " ^| findstr "LISTENING"') do (
    taskkill /PID %%p /T /F >nul 2>&1
)
if exist ".prisma-studio.pid" del ".prisma-studio.pid" >nul 2>&1
echo [OK] Prisma Studio dihentikan.
goto :eof
