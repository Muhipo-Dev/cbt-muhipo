# ==============================================================================
#   CBT v2 SMA MUHIPO - Automated Deployment & Server Installer
#   Platform: Windows Server 2025 / 2022 / Windows 11 Desktop
#   Muhipo Dev (C) 2026
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Installer CBT v2 SMA Muhipo - Windows Server"

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ROOT

# ─── UTILITIES ───────────────────────────────────────────────────────────────
function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "==============================================================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor White
    Write-Host "==============================================================================" -ForegroundColor Cyan
}

function Write-Step { param([string]$Msg) Write-Host "`n>> $Msg" -ForegroundColor Yellow }
function Write-Ok { param([string]$Msg) Write-Host " [OK] $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host " [!]  $Msg" -ForegroundColor DarkYellow }
function Write-Err { param([string]$Msg) Write-Host " [ERR] $Msg" -ForegroundColor Red }
function Write-Info { param([string]$Msg) Write-Host " [i]  $Msg" -ForegroundColor Cyan }

function Test-IsAdmin {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-PortOpen {
    param([string]$HostAddress, [int]$Port)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect($HostAddress, $Port, $null, $null)
        $wait = $iar.AsyncWaitHandle.WaitOne(800, $false)
        if ($wait -and $tcp.Connected) {
            $tcp.EndConnect($iar)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
    }
    catch {}
    return $false
}

function Refresh-EnvPath {
    $sysPath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $usrPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$sysPath;$usrPath;C:\Program Files\nodejs;C:\Program Files\PostgreSQL\18\bin;C:\Program Files\PostgreSQL\17\bin;C:\Program Files\PostgreSQL\16\bin;C:\Program Files\Git\cmd;$env:APPDATA\npm"
}

# ─── WIZARD START ───────────────────────────────────────────────────────────
Clear-Host
Write-Header "WIZARD INSTALASI & SETUP LENGKAP CBT v2 SMA MUHIPO`n  Mendukung Windows 10 / 11 / Windows Server 2022 & 2025"

$isAdmin = Test-IsAdmin
if (-not $isAdmin) {
    Write-Warn "Script berjalan tanpa hak Administrator. Konfigurasi Firewall & Windows Service otomatis mungkin dilewati."
}
else {
    Write-Ok "Berjalan dengan hak Administrator penuh."
}

# ─── LANGKAH 1: RUNTIME NODE.JS & NPM ───────────────────────────────────────
Write-Step "[1/7] Memeriksa Runtime Node.js LTS dan NPM..."
Refresh-EnvPath

$nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Warn "Node.js belum terdeteksi di sistem Windows Server ini."
    Write-Info "Mencoba mengunduh dan menginstal Node.js LTS resmi..."

    $wingetCmd = Get-Command "winget" -ErrorAction SilentlyContinue
    if ($wingetCmd) {
        Write-Info "Menginstal Node.js LTS via winget..."
        winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent | Out-Null
    }

    Refresh-EnvPath
    $nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        $msiUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        $msiDest = Join-Path $env:TEMP "nodejs_lts_installer.msi"
        Write-Info "Mengunduh langsung dari $msiUrl ..."
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        (New-Object Net.WebClient).DownloadFile($msiUrl, $msiDest)
        
        if (Test-Path $msiDest) {
            Write-Info "Memasang MSI Node.js (Silent)..."
            Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$msiDest`" /qn /norestart" -Wait
            Remove-Item $msiDest -Force -ErrorAction SilentlyContinue
        }
    }

    Refresh-EnvPath
    $nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
}

if ($nodeCmd) {
    $nodeVer = (& node -v)
    $npmVer = (& npm -v)
    Write-Ok "Node.js aktif: $nodeVer | NPM: v$npmVer"
}
else {
    Write-Err "Node.js belum terpasang. Silakan pasang Node.js LTS secara manual lalu jalankan ulang installer ini."
    Read-Host "Tekan Enter untuk keluar..."
    exit 1
}

# ─── LANGKAH 2: DETEKSI ATAU INSTALASI POSTGRESQL ───────────────────────────
Write-Step "[2/7] Memeriksa Layanan Basis Data PostgreSQL..."
Refresh-EnvPath

function Find-PgBin {
    $possiblePgDirs = @(
        "C:\Program Files\PostgreSQL\18\bin",
        "C:\Program Files\PostgreSQL\17\bin",
        "C:\Program Files\PostgreSQL\16\bin",
        "C:\Program Files\PostgreSQL\15\bin",
        "C:\Program Files\PostgreSQL\14\bin"
    )
    foreach ($dir in $possiblePgDirs) {
        if (Test-Path (Join-Path $dir "psql.exe")) {
            return $dir
        }
    }
    $psqlCmd = Get-Command "psql" -ErrorAction SilentlyContinue
    if ($psqlCmd) { return (Split-Path $psqlCmd.Source) }
    return $null
}

function Start-PostgresService {
    param([string]$PgBinPath)
    $pgService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pgService) {
        if ($isAdmin -and $pgService.StartType -ne 'Automatic') {
            Set-Service -Name $pgService.Name -StartupType Automatic -ErrorAction SilentlyContinue
        }
        if ($pgService.Status -ne 'Running') {
            Write-Info "Menyalakan service Windows '$($pgService.Name)'..."
            Start-Service -Name $pgService.Name -ErrorAction SilentlyContinue
            if ((Get-Service -Name $pgService.Name -ErrorAction SilentlyContinue).Status -ne 'Running') {
                cmd.exe /c "net start `"$($pgService.Name)`"" 2>$null | Out-Null
            }
        }
        for ($i = 0; $i -lt 20; $i++) {
            Start-Sleep -Milliseconds 500
            if (Test-PortOpen "127.0.0.1" 5432) { return 5432 }
            if (Test-PortOpen "127.0.0.1" 54322) { return 54322 }
        }
    }

    # Fallback: coba pg_ctl jika ada data directory standar
    if ($PgBinPath -and (Test-Path (Join-Path $PgBinPath "pg_ctl.exe"))) {
        $pgCtl = Join-Path $PgBinPath "pg_ctl.exe"
        $pgRoot = Split-Path $PgBinPath -Parent
        $dataDirs = @("D:\simasmuh\database\data", (Join-Path $pgRoot "data"))
        foreach ($dDir in $dataDirs) {
            if (Test-Path $dDir) {
                Write-Info "Mencoba menyalakan PostgreSQL via pg_ctl ($dDir)..."
                Start-Process -FilePath $pgCtl -ArgumentList "-D `"$dDir`" start" -WindowStyle Hidden
                for ($i = 0; $i -lt 15; $i++) {
                    Start-Sleep -Milliseconds 500
                    if (Test-PortOpen "127.0.0.1" 5432) { return 5432 }
                    if (Test-PortOpen "127.0.0.1" 54322) { return 54322 }
                }
            }
        }
    }
    return $null
}

$pgBin = Find-PgBin

# Deteksi Port PostgreSQL Aktif (Prioritaskan 5432 atau 54322)
$detectedPgPort = $null
if (Test-PortOpen "127.0.0.1" 5432) {
    $detectedPgPort = 5432
}
elseif (Test-PortOpen "127.0.0.1" 54322) {
    $detectedPgPort = 54322
}

if (-not $detectedPgPort) {
    Write-Warn "Layanan PostgreSQL belum terdeteksi aktif pada port 5432 atau 54322."
    $detectedPgPort = Start-PostgresService -PgBinPath $pgBin
}

# Jika PostgreSQL belum terpasang sama sekali di Windows
if (-not $pgBin -and -not $detectedPgPort) {
    Write-Warn "PostgreSQL belum terpasang di sistem ini. Memulai instalasi otomatis..."
    $wingetCmdPg = Get-Command "winget" -ErrorAction SilentlyContinue
    if ($wingetCmdPg) {
        Write-Info "Mengunduh & menginstal PostgreSQL via winget..."
        winget install --id PostgreSQL.PostgreSQL -e --accept-source-agreements --accept-package-agreements --silent | Out-Null
        Refresh-EnvPath
        $pgBin = Find-PgBin
        $detectedPgPort = Start-PostgresService -PgBinPath $pgBin
    }
    else {
        Write-Warn "winget tidak tersedia di Windows ini. Silakan instal PostgreSQL secara manual dari:"
        Write-Info "https://www.enterprisedb.com/downloads/postgres-postgresql-downloads"
        Read-Host "Tekan Enter setelah PostgreSQL terpasang (atau Ctrl+C untuk batal)..."
        Refresh-EnvPath
        $pgBin = Find-PgBin
        $detectedPgPort = Start-PostgresService -PgBinPath $pgBin
    }
}

if (-not $detectedPgPort) {
    Write-Err "Layanan PostgreSQL masih belum berjalan pada port 5432 atau 54322."
    Write-Info "Pastikan PostgreSQL sudah terinstal dan service-nya berjalan, lalu jalankan ulang installer ini."
    Read-Host "Tekan Enter untuk keluar..."
    exit 1
}
else {
    Write-Ok "PostgreSQL aktif terdeteksi pada port $detectedPgPort."
}

# ─── LANGKAH 3: SETUP FILE KONFIGURASI .ENV ─────────────────────────────────
Write-Step "[3/7] Mengonfigurasi Lingkungan Server (.env)..."

$envFile = Join-Path $ROOT ".env"
$cbtPort = 4020
$dbUser = "postgres"
$dbPass = "postgres"
$dbPort = $detectedPgPort
$dbName = "cbt_muhipo"

if (Test-Path $envFile) {
    Write-Ok "File .env sudah ada. Memeriksa pengaturan URL database & port..."
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match 'DATABASE_URL="postgresql:\/\/([^:]+):?([^@]*)@([^:\/]+):?(\d*)\/([^?\s]+)') {
        $dbUser = $Matches[1]
        $dbPass = $Matches[2]
        $dbHost = $Matches[3]
        $dbPort = if ($Matches[4]) { [int]$Matches[4] } else { $detectedPgPort }
        $dbName = ($Matches[5] -split '\?')[0]

        if ($dbPort -ne $detectedPgPort) {
            Write-Warn "Port DATABASE_URL di .env ($dbPort) berbeda dengan PostgreSQL aktif ($detectedPgPort). Menyelaraskan otomatis..."
            $envContent = $envContent -replace '(DATABASE_URL="postgresql:\/\/[^:]+:?[^@]*@[^:\/]+):?\d*(\/)', "`$1:$detectedPgPort`$2"
            Set-Content -Path $envFile -Value $envContent -Encoding UTF8
            $dbPort = $detectedPgPort
            Write-Ok "DATABASE_URL di .env berhasil diselaraskan ke port $detectedPgPort."
        }
    }
    if ($envContent -match '(?m)^PORT=(\d+)') {
        $cbtPort = [int]$Matches[1]
    }
}
else {
    Write-Info "Membuat file .env baru untuk server produksi..."
    $newEnv = @"
# ==============================================================================
# KONFIGURASI CBT v2 SMA MUHIPO (WINDOWS SERVER 2025 STANDALONE)
# ==============================================================================

# Database URL PostgreSQL Native Windows
DATABASE_URL="postgresql://$($dbUser):$($dbPass)@127.0.0.1:$($dbPort)/$($dbName)?schema=public"

# Kunci Keamanan Token JWT
JWT_SECRET="cbt-muhipo-super-secret-key-2026-production-ready"

# Pengaturan Port Server Standalone CBT v2
PORT=$cbtPort
HTTP_PORT=$cbtPort

# Pengaturan Aplikasi & Sekolah
NEXT_PUBLIC_APP_URL="http://localhost:$cbtPort"
NEXT_PUBLIC_APP_NAME="CBT v2 SMA Muhipo"
NEXT_PUBLIC_SCHOOL_NAME="SMA Muhammadiyah 1 Ponorogo"
NEXT_PUBLIC_SCHOOL_ADDRESS="Jl. Batoro Katong No. 6 Ponorogo, Jawa Timur"
"@
    Set-Content -Path $envFile -Value $newEnv -Encoding UTF8
    Write-Ok "File .env berhasil dibuat."
}

# ─── LANGKAH 4: DEPENDENSI NPM (NODE_MODULES) & CEK UPDATE PAKET ────────────
Write-Step "[4/7] Memeriksa, Memasang, dan Cek Update Paket Dependensi (npm)..."
if (-not (Test-Path (Join-Path $ROOT "node_modules")) -or -not (Test-Path (Join-Path $ROOT "node_modules\@prisma\client"))) {
    Write-Info "Mengunduh paket node_modules (Next.js, Prisma, React)..."
    cmd.exe /c "npm install"
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Gagal menjalankan npm install. Periksa koneksi internet."
        Read-Host "Tekan Enter untuk keluar..."
        exit 1
    }
    Write-Ok "Paket dependensi berhasil dipasang."
}
else {
    Write-Ok "node_modules sudah tersedia. Memastikan sinkronisasi paket..."
    cmd.exe /c "npm install"
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Sinkronisasi npm install mengalami kendala, melanjutkan dengan paket yang ada..."
    }
}

Write-Info "Memeriksa pembaruan paket (npm outdated)..."
$outdatedOutput = cmd.exe /c "npm outdated" 2>$null
if ($outdatedOutput) {
    Write-Warn "Ditemukan paket yang memiliki versi terbaru, memperbarui otomatis (npm update)..."
    $outdatedOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    cmd.exe /c "npm update"
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Paket dependensi berhasil diperbarui."
    }
    else {
        Write-Warn "Sebagian paket gagal diperbarui. Sistem tetap menggunakan versi yang kompatibel."
    }
}
else {
    Write-Ok "Semua paket dependensi sudah dalam versi terbaru."
}

# ─── LANGKAH 5: INISIALISASI DATABASE POSTGRESQL & PRISMA ───────────────────
Write-Step "[5/7] Sinkronisasi Skema Basis Data (Prisma db push & seed)..."

# Pastikan PostgreSQL masih aktif sebelum inisialisasi
if (-not (Test-PortOpen "127.0.0.1" $dbPort)) {
    Write-Warn "Port PostgreSQL $dbPort belum merespons. Mencoba menyalakan ulang service..."
    $null = Start-PostgresService -PgBinPath $pgBin
}

# Buat database jika belum ada menggunakan psql jika tersedia
if (-not $pgBin) { $pgBin = Find-PgBin }
if ($pgBin -and (Test-Path (Join-Path $pgBin "psql.exe"))) {
    $psqlExe = Join-Path $pgBin "psql.exe"
    $env:PGPASSWORD = $dbPass
    Write-Info "Memeriksa ketersediaan basis data '$dbName' di PostgreSQL..."
    & $psqlExe -h 127.0.0.1 -p $dbPort -U $dbUser -d postgres -c "CREATE DATABASE $dbName;" 2>$null
}

Write-Info "Menghasilkan Prisma Client (prisma generate)..."
cmd.exe /c "npx prisma generate"
if ($LASTEXITCODE -ne 0) {
    Write-Err "Gagal menjalankan npx prisma generate."
    Read-Host "Tekan Enter untuk keluar..."
    exit 1
}

Write-Info "Menerapkan skema tabel (prisma db push)..."
cmd.exe /c "npx prisma db push --skip-generate"
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Gagal db push dengan URL saat ini. Mencoba koneksi port 5432..."
    $env:DATABASE_URL = "postgresql://$($dbUser):$($dbPass)@127.0.0.1:5432/$($dbName)?schema=public"
    cmd.exe /c "npx prisma db push --skip-generate"
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Gagal menerapkan skema tabel ke PostgreSQL. Periksa kredensial DATABASE_URL di .env."
        Read-Host "Tekan Enter untuk keluar..."
        exit 1
    }
}

Write-Info "Memeriksa dan menyuntikkan data akun default / master seed..."
cmd.exe /c "npx tsx prisma/seed.ts"
if ($LASTEXITCODE -ne 0) {
    Write-Err "Gagal menjalankan seed database (prisma/seed.ts)."
    Read-Host "Tekan Enter untuk keluar..."
    exit 1
}
Write-Ok "Skema tabel dan akun master Superadmin (nailar) siap digunakan."

# ─── LANGKAH 6: BUILD FRONTEND & API NEXT.JS TURBOPACK ──────────────────────
Write-Step "[6/7] Mengompilasi Sistem Produksi (npm run build)..."
$nextBuildDir = Join-Path $ROOT ".next"
Write-Info "Membangun Next.js optimized production package..."
cmd.exe /c "npm run build"
if ($LASTEXITCODE -ne 0) {
    Write-Err "Gagal melakukan build Next.js. Periksa error di atas."
    Read-Host "Tekan Enter untuk keluar..."
    exit 1
}
Write-Ok "Production build selesai 100%!"

# ─── LANGKAH 7: FIREWALL WINDOWS SERVER & PERIZINAN PORT ────────────────────
Write-Step "[7/7] Konfigurasi Windows Defender Firewall untuk Port $cbtPort & 5560..."
if ($isAdmin) {
    try {
        $fwRule = Get-NetFirewallRule -DisplayName "CBT v2 SMA Muhipo (Port $cbtPort)" -ErrorAction SilentlyContinue
        if (-not $fwRule) {
            New-NetFirewallRule -DisplayName "CBT v2 SMA Muhipo (Port $cbtPort)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $cbtPort -Description "Akses HTTP Siswa & Proktor CBT v2" | Out-Null
            Write-Ok "Aturan Firewall Port $cbtPort berhasil ditambahkan (Inbound Allow)."
        }
        else {
            Write-Ok "Aturan Firewall Port $cbtPort sudah aktif."
        }

        $fwStudio = Get-NetFirewallRule -DisplayName "CBT v2 Prisma Studio (Port 5560)" -ErrorAction SilentlyContinue
        if (-not $fwStudio) {
            New-NetFirewallRule -DisplayName "CBT v2 Prisma Studio (Port 5560)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5560 -Description "Akses Database Studio GUI CBT v2" | Out-Null
            Write-Ok "Aturan Firewall Port 5560 berhasil ditambahkan."
        }
    }
    catch {
        Write-Warn "Gagal mengatur firewall otomatis: $_"
    }
}
else {
    Write-Warn "Dilewati: Jalankan script sebagai Administrator untuk membuka port 4020 di Firewall."
}

# ─── SUMMARY & SELESAI ───────────────────────────────────────────────────────
Write-Header "INSTALASI & INISIALISASI CBT v2 SMA MUHIPO SUKSES 100%"

# Dapatkan IP Address Lokal Server
$localIps = @()
try {
    $nics = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }
    foreach ($nic in $nics) { $localIps += $nic.IPAddress }
}
catch {}

Write-Host "  Informasi Akses Sistem:" -ForegroundColor White
Write-Host "  * Nama Aplikasi  : CBT v2 SMA Muhipo" -ForegroundColor Green
Write-Host "  * Akses Lokal    : http://localhost:$cbtPort" -ForegroundColor Cyan
if ($localIps.Count -gt 0) {
    Write-Host "  * Akses Klien/LAN:" -ForegroundColor White
    foreach ($ip in $localIps) {
        Write-Host "    -> http://${ip}:$cbtPort" -ForegroundColor Yellow
    }
}
Write-Host "  * Database GUI   : http://localhost:5560 (Prisma Studio)" -ForegroundColor Cyan
Write-Host "  * Akun Default   : Username: nailar | Password: nailar" -ForegroundColor White
Write-Host "  * Cara Menjalankan: Cukup klik ganda 'JALANKAN_CBT.bat'" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# ─── LANGKAH 8: AKTIVASI & VERIFIKASI PORT SEMUA LAYANAN ─────────────────────
Write-Step "[8/8] Mengaktifkan & Memverifikasi Port Semua Layanan..."

# 1. Pastikan PostgreSQL aktif
if (-not (Test-PortOpen "127.0.0.1" $dbPort)) {
    Write-Warn "Port PostgreSQL ($dbPort) belum aktif. Menyalakan otomatis..."
    $null = Start-PostgresService -PgBinPath $pgBin
}
if (Test-PortOpen "127.0.0.1" $dbPort) {
    Write-Ok "PostgreSQL AKTIF pada port $dbPort."
}
else {
    Write-Warn "PostgreSQL pada port $dbPort belum merespons."
}

# 2. Jalankan layanan CBT Web App & Prisma Studio
$launcherBat = Join-Path $ROOT "JALANKAN_CBT.bat"
$cbtPs1 = Join-Path $ROOT "cbt.ps1"
if (-not (Test-PortOpen "127.0.0.1" $cbtPort)) {
    if (Test-Path $cbtPs1) {
        Write-Info "Menyalakan CBT Web App (:$cbtPort) dan Prisma Studio (:5560)..."
        Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$cbtPs1`" -Mode StartAll" -WindowStyle Hidden
    }
    elseif (Test-Path $launcherBat) {
        Write-Info "Mengaktifkan seluruh layanan CBT v2 SMA Muhipo secara otomatis..."
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$launcherBat`""
    }
}

# 3. Pantau dan update status port di terminal
Write-Info "Memeriksa status port layanan..."
for ($i = 1; $i -le 15; $i++) {
    $appUp = Test-PortOpen "127.0.0.1" $cbtPort
    $dbUp  = Test-PortOpen "127.0.0.1" $dbPort
    if ($appUp -and $dbUp) { break }
    Start-Sleep -Seconds 1
}

$statusDb     = if (Test-PortOpen "127.0.0.1" $dbPort) { "AKTIF (:$dbPort)" } else { "BELUM AKTIF (:$dbPort)" }
$statusApp    = if (Test-PortOpen "127.0.0.1" $cbtPort) { "AKTIF (:$cbtPort)" } else { "BELUM AKTIF (:$cbtPort)" }
$statusStudio = if (Test-PortOpen "127.0.0.1" 5560) { "AKTIF (:5560)" } else { "MENUNGGU (:5560)" }

Write-Ok "Status Akhir Layanan -> PostgreSQL: $statusDb | CBT Web: $statusApp | Studio: $statusStudio"
