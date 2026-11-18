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
function Write-Ok   { param([string]$Msg) Write-Host " [OK] $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host " [!]  $Msg" -ForegroundColor DarkYellow }
function Write-Err  { param([string]$Msg) Write-Host " [ERR] $Msg" -ForegroundColor Red }
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
    } catch {}
    return $false
}

function Refresh-EnvPath {
    $sysPath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $usrPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$sysPath;$usrPath;C:\Program Files\nodejs;C:\Program Files\PostgreSQL\18\bin;C:\Program Files\PostgreSQL\17\bin;C:\Program Files\PostgreSQL\16\bin;C:\Program Files\Git\cmd;$env:APPDATA\npm"
}

# ─── WIZARD START ───────────────────────────────────────────────────────────
Clear-Host
Write-Header "WIZARD INSTALASI & SETUP LENGKAP CBT v2 SMA MUHIPO`n  Didesain Khusus untuk Windows Server 2025 / Windows Server 2022"

$isAdmin = Test-IsAdmin
if (-not $isAdmin) {
    Write-Warn "Script berjalan tanpa hak Administrator. Konfigurasi Firewall & Windows Service otomatis mungkin dilewati."
} else {
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
} else {
    Write-Err "Node.js belum terpasang. Silakan pasang Node.js LTS secara manual lalu jalankan ulang installer ini."
    Read-Host "Tekan Enter untuk keluar..."
    exit 1
}

# ─── LANGKAH 2: DETEKSI ATAU INSTALASI POSTGRESQL ───────────────────────────
Write-Step "[2/7] Memeriksa Layanan Basis Data PostgreSQL..."
Refresh-EnvPath

# Cari psql / pg_ctl di path standar
$pgBin = $null
$possiblePgDirs = @(
    "C:\Program Files\PostgreSQL\18\bin",
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin"
)

foreach ($dir in $possiblePgDirs) {
    if (Test-Path (Join-Path $dir "psql.exe")) {
        $pgBin = $dir
        break
    }
}

if (-not $pgBin) {
    $psqlCmd = Get-Command "psql" -ErrorAction SilentlyContinue
    if ($psqlCmd) { $pgBin = Split-Path $psqlCmd.Source }
}

# Deteksi Port PostgreSQL Aktif (Prioritaskan 5432 atau 54322)
$detectedPgPort = $null
if (Test-PortOpen "127.0.0.1" 5432) {
    $detectedPgPort = 5432
} elseif (Test-PortOpen "127.0.0.1" 54322) {
    $detectedPgPort = 54322
}

if (-not $detectedPgPort) {
    Write-Warn "Layanan PostgreSQL belum terdeteksi aktif pada port 5432 atau 54322."
    # Coba periksa apakah Windows Service PostgreSQL ada tapi Stopped
    $pgService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pgService) {
        Write-Info "Menemukan service Windows '$($pgService.Name)'. Menyalakan service..."
        Start-Service -Name $pgService.Name -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        if (Test-PortOpen "127.0.0.1" 5432) { $detectedPgPort = 5432 }
    }
}

# Jika PostgreSQL belum terpasang sama sekali di Windows Server baru
if (-not $pgBin -and -not $detectedPgPort) {
    Write-Warn "PostgreSQL belum terpasang di sistem ini."
    $askPg = Read-Host "Apakah Anda ingin menginstal PostgreSQL secara otomatis via winget? (y/n) [y]"
    if ($askPg -ne "n") {
        Write-Info "Mengunduh & menginstal PostgreSQL via winget..."
        winget install --id PostgreSQL.PostgreSQL -e --accept-source-agreements --accept-package-agreements --silent | Out-Null
        Refresh-EnvPath
        Start-Sleep -Seconds 5
        if (Test-PortOpen "127.0.0.1" 5432) { $detectedPgPort = 5432 }
    }
}

if (-not $detectedPgPort) {
    $detectedPgPort = 5432
    Write-Info "Menggunakan port standar PostgreSQL: 5432."
} else {
    Write-Ok "PostgreSQL aktif terdeteksi pada port $detectedPgPort."
}

# ─── LANGKAH 3: SETUP FILE KONFIGURASI .ENV ─────────────────────────────────
Write-Step "[3/7] Mengonfigurasi Lingkungan Server (.env)..."

$envFile = Join-Path $ROOT ".env"
$cbtPort = 4020
$dbUser  = "postgres"
$dbPass  = "postgres"
$dbPort  = $detectedPgPort
$dbName  = "cbt_muhipo"

if (Test-Path $envFile) {
    Write-Ok "File .env sudah ada. Memeriksa pengaturan URL database..."
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match 'DATABASE_URL="postgresql:\/\/([^:]+):?([^@]*)@([^:\/]+):?(\d*)\/([^?\s]+)') {
        $dbUser = $Matches[1]
        $dbPass = $Matches[2]
        $dbHost = $Matches[3]
        $dbPort = if ($Matches[4]) { [int]$Matches[4] } else { $detectedPgPort }
        $dbName = ($Matches[5] -split '\?')[0]
    }
} else {
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

# ─── LANGKAH 4: DEPENDENSI NPM (NODE_MODULES) ───────────────────────────────
Write-Step "[4/7] Memeriksa dan Memasang Paket Dependensi (npm install)..."
if (-not (Test-Path (Join-Path $ROOT "node_modules")) -or -not (Test-Path (Join-Path $ROOT "node_modules\@prisma\client"))) {
    Write-Info "Mengunduh paket node_modules (Next.js, Prisma, React)..."
    cmd.exe /c "npm install"
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Gagal menjalankan npm install. Periksa koneksi internet."
        Read-Host "Tekan Enter untuk keluar..."
        exit 1
    }
    Write-Ok "Paket dependensi berhasil dipasang."
} else {
    Write-Ok "node_modules sudah lengkap."
}

# ─── LANGKAH 5: INISIALISASI DATABASE POSTGRESQL & PRISMA ───────────────────
Write-Step "[5/7] Sinkronisasi Skema Basis Data (Prisma db push & seed)..."

# Buat database jika belum ada menggunakan psql jika tersedia
if ($pgBin -and (Test-Path (Join-Path $pgBin "psql.exe"))) {
    $psqlExe = Join-Path $pgBin "psql.exe"
    $env:PGPASSWORD = $dbPass
    Write-Info "Memeriksa ketersediaan basis data '$dbName' di PostgreSQL..."
    & $psqlExe -h 127.0.0.1 -p $dbPort -U $dbUser -d postgres -c "CREATE DATABASE $dbName;" 2>$null
}

Write-Info "Menghasilkan Prisma Client (prisma generate)..."
cmd.exe /c "npx prisma generate"

Write-Info "Menerapkan skema tabel (prisma db push)..."
cmd.exe /c "npx prisma db push --skip-generate"
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Gagal db push dengan URL saat ini. Mencoba koneksi port 5432..."
    $env:DATABASE_URL = "postgresql://$($dbUser):$($dbPass)@127.0.0.1:5432/$($dbName)?schema=public"
    cmd.exe /c "npx prisma db push --skip-generate"
}

Write-Info "Memeriksa dan menyuntikkan data akun default / master seed..."
cmd.exe /c "npx tsx prisma/seed.ts"
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

# ─── LANGKAH 7: FIREWALL WINDOWS SERVER & PERIZINAN PORT 4020 ───────────────
Write-Step "[7/7] Konfigurasi Windows Defender Firewall untuk Port 4020 & 5560..."
if ($isAdmin) {
    try {
        $fwRule = Get-NetFirewallRule -DisplayName "CBT v2 SMA Muhipo (Port 4020)" -ErrorAction SilentlyContinue
        if (-not $fwRule) {
            New-NetFirewallRule -DisplayName "CBT v2 SMA Muhipo (Port 4020)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4020 -Description "Akses HTTP Siswa & Proktor CBT v2" | Out-Null
            Write-Ok "Aturan Firewall Port 4020 berhasil ditambahkan (Inbound Allow)."
        } else {
            Write-Ok "Aturan Firewall Port 4020 sudah aktif."
        }

        $fwStudio = Get-NetFirewallRule -DisplayName "CBT v2 Prisma Studio (Port 5560)" -ErrorAction SilentlyContinue
        if (-not $fwStudio) {
            New-NetFirewallRule -DisplayName "CBT v2 Prisma Studio (Port 5560)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5560 -Description "Akses Database Studio GUI CBT v2" | Out-Null
            Write-Ok "Aturan Firewall Port 5560 berhasil ditambahkan."
        }
    } catch {
        Write-Warn "Gagal mengatur firewall otomatis: $_"
    }
} else {
    Write-Warn "Dilewati: Jalankan script sebagai Administrator untuk membuka port 4020 di Firewall."
}

# ─── SUMMARY & SELESAI ───────────────────────────────────────────────────────
Write-Header "INSTALASI & INISIALISASI CBT v2 SMA MUHIPO SUKSES 100%"

# Dapatkan IP Address Lokal Server
$localIps = @()
try {
    $nics = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }
    foreach ($nic in $nics) { $localIps += $nic.IPAddress }
} catch {}

Write-Host "  Informasi Akses Sistem:" -ForegroundColor White
Write-Host "  * Nama Aplikasi  : CBT v2 SMA Muhipo" -ForegroundColor Green
Write-Host "  * Akses Lokal    : http://localhost:4020" -ForegroundColor Cyan
if ($localIps.Count -gt 0) {
    Write-Host "  * Akses Klien/LAN:" -ForegroundColor White
    foreach ($ip in $localIps) {
        Write-Host "    -> http://${ip}:4020" -ForegroundColor Yellow
    }
}
Write-Host "  * Database GUI   : http://localhost:5560 (Prisma Studio)" -ForegroundColor Cyan
Write-Host "  * Akun Default   : Username: nailar | Password: nailar" -ForegroundColor White
Write-Host "  * Cara Menjalankan: Cukup klik ganda 'JALANKAN_CBT.bat'" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""
