@echo off
setlocal EnableExtensions EnableDelayedExpansion

chcp 65001 >nul 2>&1
cd /d "%~dp0"
title CBT MUHIPO - Database Backup and Restore Manager
color 0B

set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;C:\Program Files (x86)\nodejs;%NVM_HOME%;%NVM_SYMLINK%;C:\xampp\mysql\bin;D:\xampp\mysql\bin;E:\xampp\mysql\bin;F:\xampp\mysql\bin;C:\laragon\bin\mysql\current\bin;D:\laragon\bin\mysql\current\bin;C:\Program Files\MySQL\MySQL Server 8.0\bin;C:\Program Files\MySQL\MySQL Server 8.4\bin;C:\Program Files\MySQL\MySQL Server 9.0\bin;C:\Program Files\MariaDB\bin;%PATH%"

set "BACKUP_DIR=%~dp0backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Deteksi parameter koneksi dari .env
set "DB_USER=root"
set "DB_PASS="
set "DB_HOST=127.0.0.1"
set "DB_PORT=3306"
set "DB_NAME=cbt_muhipo"

if exist ".env" call :SUB_PARSE_ENV

:MENU_BACKUP
cls
echo ==============================================================================
echo        CBT MUHIPO - DATABASE BACKUP DAN RESTORE MANAGER MYSQL
echo        SMA Muhammadiyah 1 Ponorogo - Muhipo Dev (C) 2026
echo ==============================================================================
echo.
echo  DIREKTORI BACKUP : %BACKUP_DIR%
echo  TARGET DATABASE  : %DB_NAME% @ %DB_HOST%:%DB_PORT% (User: %DB_USER%)
echo.

set "MYSQLDUMP_EXE="
set "MYSQL_EXE="

if exist "C:\xampp\mysql\bin\mysqldump.exe" (
    set "MYSQLDUMP_EXE=C:\xampp\mysql\bin\mysqldump.exe"
    set "MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe"
) else if exist "D:\xampp\mysql\bin\mysqldump.exe" (
    set "MYSQLDUMP_EXE=D:\xampp\mysql\bin\mysqldump.exe"
    set "MYSQL_EXE=D:\xampp\mysql\bin\mysql.exe"
) else if exist "E:\xampp\mysql\bin\mysqldump.exe" (
    set "MYSQLDUMP_EXE=E:\xampp\mysql\bin\mysqldump.exe"
    set "MYSQL_EXE=E:\xampp\mysql\bin\mysql.exe"
) else if exist "F:\xampp\mysql\bin\mysqldump.exe" (
    set "MYSQLDUMP_EXE=F:\xampp\mysql\bin\mysqldump.exe"
    set "MYSQL_EXE=F:\xampp\mysql\bin\mysql.exe"
) else (
    where mysqldump.exe >nul 2>&1
    if !errorlevel! equ 0 set "MYSQLDUMP_EXE=mysqldump"
    where mysql.exe >nul 2>&1
    if !errorlevel! equ 0 set "MYSQL_EXE=mysql"
)

set "MYSQL_ACTIVE="
for /f "tokens=5" %%a in ('netstat -ano -p tcp 2^>nul ^| findstr /R /C:":%DB_PORT% " ^| findstr "LISTENING"') do set "MYSQL_ACTIVE=%%a"

if defined MYSQL_ACTIVE (
    echo  STATUS DATABASE  : [ TERHUBUNG - MYSQL PORT %DB_PORT% AKTIF ]
) else (
    echo  STATUS DATABASE  : [ PERINGATAN - MYSQL PORT %DB_PORT% MATI / TIDAK AKTIF ]
)
echo ==============================================================================
echo.
echo  PILIHAN OPERASI BASIS DATA:
echo  --------------------------------------------------------------------------
echo    [1] BACKUP DATABASE SEKARANG  - Simpan snapshot penuh SQL ke folder backups
echo    [2] RESTORE DATABASE          - Pulihkan basis data dari file backup (.sql)
echo    [3] LIHAT DAFTAR FILE BACKUP  - Tampilkan seluruh riwayat backup yang ada
echo    [4] BUKA FOLDER BACKUP        - Buka direktori backups di File Explorer
echo    [0] KEMBALI / KELUAR          - Tutup menu backup
echo  --------------------------------------------------------------------------
echo.

set "CHOICE="
set /p "CHOICE=>> Masukkan pilihan Anda [1/2/3/4/0]: "
set "CHOICE=%CHOICE: =%"

if "%CHOICE%"=="1" goto DO_BACKUP
if "%CHOICE%"=="2" goto DO_RESTORE
if "%CHOICE%"=="3" goto DO_LIST
if "%CHOICE%"=="4" goto DO_OPEN_FOLDER
if "%CHOICE%"=="0" exit /b 0
if "%CHOICE%"=="" exit /b 0

echo.
echo [!] Pilihan tidak valid.
ping 127.0.0.1 -n 2 >nul
goto MENU_BACKUP


:DO_BACKUP
cls
echo ==============================================================================
echo                      PROSES BACKUP BASIS DATA CBT
echo ==============================================================================
echo.

if not defined MYSQLDUMP_EXE (
    color 0C
    echo [ERROR] mysqldump.exe tidak ditemukan di direktori XAMPP/MySQL atau PATH sistem.
    echo Silakan pastikan MySQL/XAMPP terpasang dengan benar.
    echo.
    pause
    color 0B
    goto MENU_BACKUP
)

if not defined MYSQL_ACTIVE (
    color 0C
    echo [ERROR] Layanan MySQL Port %DB_PORT% sedang mati. Mencoba menyalakan MySQL...
    if exist "C:\xampp\mysql_start.bat" powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c C:\xampp\mysql_start.bat' -WindowStyle Hidden" >nul 2>&1
    ping 127.0.0.1 -n 4 >nul
)

for /f "tokens=*" %%T in ('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"') do set "TIMESTAMP=%%T"
if not defined TIMESTAMP set "TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"

set "BACKUP_FILE=%BACKUP_DIR%\cbt_muhipo_backup_%TIMESTAMP%.sql"

echo [..] Mengekspor basis data '%DB_NAME%' ke:
echo      %BACKUP_FILE%
echo.

set "AUTH_ARGS=-u %DB_USER% -h %DB_HOST% -P %DB_PORT%"
if defined DB_PASS set "AUTH_ARGS=%AUTH_ARGS% -p%DB_PASS%"

if defined MYSQLDUMP_EXE (
    "%MYSQLDUMP_EXE%" %AUTH_ARGS% --routines --triggers --single-transaction "%DB_NAME%" > "%BACKUP_FILE%" 2>nul
) else (
    mysqldump %AUTH_ARGS% --routines --triggers --single-transaction "%DB_NAME%" > "%BACKUP_FILE%" 2>nul
)

if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Gagal membuat file backup SQL.
    echo Periksa apakah database '%DB_NAME%' sudah dibuat dan kredensial MySQL sesuai.
    echo.
) else (
    color 0A
    echo ==============================================================================
    echo [SUKSES] Backup basis data berhasil disimpan 100 persen.
    echo File: cbt_muhipo_backup_%TIMESTAMP%.sql
    echo ==============================================================================
    echo.
)

pause
color 0B
goto MENU_BACKUP


:DO_RESTORE
cls
echo ==============================================================================
echo                     PROSES RESTORE BASIS DATA CBT
echo ==============================================================================
echo.
echo  DAFTAR FILE BACKUP TERSEDIA DI FOLDER BACKUPS:
echo  --------------------------------------------------------------------------
set "COUNT=0"
for %%F in ("%BACKUP_DIR%\*.sql") do (
    set /a COUNT+=1
    echo    [!COUNT!] %%~nxF
    set "FILE_!COUNT!=%%~fF"
)

if %COUNT% equ 0 (
    echo    [!] Tidak ada file backup .sql ditemukan di direktori backups
    echo.
    echo Silakan lakukan Backup terlebih dahulu atau masukkan file .sql ke folder backups
    echo.
    pause
    goto MENU_BACKUP
)

echo  --------------------------------------------------------------------------
echo.
echo  PILIHAN:
echo  - Masukkan nomor file di atas 1 s/d %COUNT%
echo  - ATAU drag-and-drop file .sql langsung ke jendela ini
echo  - Ketik 0 untuk membatalkan
echo.
set "RESTORE_CHOICE="
set /p "RESTORE_CHOICE=>> Masukkan nomor atau path file: "
set "RESTORE_CHOICE=%RESTORE_CHOICE: =%"

if "%RESTORE_CHOICE%"=="0" goto MENU_BACKUP
if "%RESTORE_CHOICE%"=="" goto MENU_BACKUP

set "TARGET_FILE="

if defined FILE_%RESTORE_CHOICE% (
    for %%v in (!RESTORE_CHOICE!) do set "TARGET_FILE=!FILE_%%v!"
) else (
    set "CLEAN_PATH=%RESTORE_CHOICE:"=%"
    if exist "!CLEAN_PATH!" set "TARGET_FILE=!CLEAN_PATH!"
)

if not defined TARGET_FILE (
    color 0C
    echo.
    echo [ERROR] File backup yang dipilih tidak valid atau tidak ditemukan.
    ping 127.0.0.1 -n 3 >nul
    color 0B
    goto MENU_BACKUP
)

echo.
echo ==============================================================================
echo  PERINGATAN:
echo  Memulihkan database akan menimpa seluruh data CBT saat ini dengan isi file:
echo  %TARGET_FILE%
echo ==============================================================================
echo.
set "CONFIRM="
set /p "CONFIRM=>> Ketik Y untuk melanjutkan proses restore (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo [INFO] Operasi restore dibatalkan.
    ping 127.0.0.1 -n 2 >nul
    goto MENU_BACKUP
)

set "AUTH_ARGS=-u %DB_USER% -h %DB_HOST% -P %DB_PORT%"
if defined DB_PASS set "AUTH_ARGS=%AUTH_ARGS% -p%DB_PASS%"

echo.
echo [1/3] Memastikan database '%DB_NAME%' siap...
if defined MYSQL_EXE (
    "%MYSQL_EXE%" %AUTH_ARGS% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
) else (
    mysql %AUTH_ARGS% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
)

echo [2/3] Mengimpor data dari file backup...
if defined MYSQL_EXE (
    "%MYSQL_EXE%" %AUTH_ARGS% %DB_NAME% < "%TARGET_FILE%"
) else (
    mysql %AUTH_ARGS% %DB_NAME% < "%TARGET_FILE%"
)

if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Gagal memulihkan database dari file SQL.
    echo Periksa kompatibilitas file backup SQL dan izin user MySQL.
    echo.
) else (
    echo [3/3] Menyelaraskan Prisma ORM Client...
    call npx prisma generate >nul 2>&1
    color 0A
    echo.
    echo ==============================================================================
    echo [SUKSES] Basis data CBT MUHIPO berhasil dipulihkan (Restore 100 persen).
    echo ==============================================================================
    echo.
)

pause
color 0B
goto MENU_BACKUP


:DO_LIST
cls
echo ==============================================================================
echo                    DAFTAR FILE BACKUP DATABASE CBT
echo ==============================================================================
echo.
dir "%BACKUP_DIR%\*.sql" /O:-D
echo.
echo ==============================================================================
pause
goto MENU_BACKUP


:DO_OPEN_FOLDER
start "" "%BACKUP_DIR%"
goto MENU_BACKUP


REM ==============================================================================
REM SUBROUTINES
REM ==============================================================================

:SUB_PARSE_ENV
for /f "usebackq tokens=*" %%L in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$c = Get-Content '.env' -Raw; if ($c -match 'DATABASE_URL\s*=\s*[\x22\x27]?mysql:\/\/([^:]+):?([^@]*)@([^:\/]+):?(\d*)\/([^?\x22\x27\s]+)') { Write-Output ('DB_USER=' + $Matches[1]); Write-Output ('DB_PASS=' + $Matches[2]); $h = if($Matches[3]){$Matches[3]}else{'127.0.0.1'}; Write-Output ('DB_HOST=' + $h); $p = if($Matches[4]){$Matches[4]}else{'3306'}; Write-Output ('DB_PORT=' + $p); Write-Output ('DB_NAME=' + $Matches[5]); }"`) do (
    set "%%L"
)
goto :eof
