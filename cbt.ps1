param(
    [string]$Mode = ""
)

# ==============================================================================
#   CBT v2 SMA Muhipo - Script Manajemen & Server CBT Standalone
#   Muhipo Dev (C) 2026
#   
#   PORT CBT STANDALONE:
#   - CBT Web App & API  : Port 4020 (HTTP Server)
#   - Prisma Studio (DB) : Port Mutlak 5560
#   - Database PostgreSQL: Port 54322 (Native Database Engine)
# ==============================================================================

$ROOT           = Split-Path -Parent $MyInvocation.MyCommand.Path
$APP_LOG        = Join-Path $ROOT "cbt-app.log"
$PRISMA_LOG     = Join-Path $ROOT "prisma-studio.log"
$APP_PID_FILE   = Join-Path $ROOT ".cbt-app.pid"
$PRISMA_PID_FILE= Join-Path $ROOT ".prisma-studio.pid"

$CBT_PORT       = 4020
$STUDIO_PORT    = 5560
$DB_PORT        = 5432

# Parse DB Port dari .env jika ada
if (Test-Path (Join-Path $ROOT ".env")) {
    $envContent = Get-Content (Join-Path $ROOT ".env") -Raw
    if ($envContent -match 'DATABASE_URL="postgresql:\/\/[^:]+:?[^@]*@[^:\/]+:?(\d*)\/') {
        if ($Matches[1]) { $DB_PORT = [int]$Matches[1] }
    }
}

# ─── HELPERS ────────────────────────────────────────────────

function Write-Banner {
    try { Clear-Host } catch {}
    Write-Host ""
    Write-Host "  +==================================================+" -ForegroundColor Cyan
    Write-Host "  |       CBT v2 SMA Muhipo - Muhipo Dev             |" -ForegroundColor Cyan
    Write-Host "  |    Sistem CBT SMA Muhammadiyah 1 Ponorogo (v2)   |" -ForegroundColor Cyan
    Write-Host "  |  Port: :$CBT_PORT (Web), :$STUDIO_PORT (Studio), :$DB_PORT (DB) |" -ForegroundColor DarkCyan
    Write-Host "  +==================================================+" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Status { param($Message, $Color = "White"); Write-Host "  >> $Message" -ForegroundColor $Color }
function Write-Ok     { param($Message); Write-Host "  [OK] $Message" -ForegroundColor Green }
function Write-Err    { param($Message); Write-Host "  [ERR] $Message" -ForegroundColor Red }
function Write-Info   { param($Message); Write-Host "  [i]  $Message" -ForegroundColor Yellow }

function Get-StoredPid {
    param($File)
    if (Test-Path $File) {
        $raw = Get-Content $File -Raw
        if ($raw -match '^\d+$') { return [int]$raw.Trim() }
    }
    return $null
}

function Test-ProcessRunning {
    param([int]$ProcessId)
    try {
        $p = Get-Process -Id $ProcessId -ErrorAction Stop
        return (-not $p.HasExited)
    } catch {
        return $false
    }
}

function Stop-ProcessById {
    param([int]$ProcessId)
    try {
        $null = cmd.exe /c "taskkill /PID $ProcessId /T /F 2>nul"
    } catch {}
}

function Stop-PortProcess {
    param([int]$Port)
    try {
        $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pidVal in $pids) {
            if ($pidVal -gt 4) {
                Stop-Process -Id $pidVal -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
    try {
        $lines = netstat -ano 2>$null | Select-String ":$Port\s"
        foreach ($line in $lines) {
            $tokens = ($line.Line.Trim() -split '\s+') | Where-Object { $_ -ne '' }
            $pidVal = $tokens[-1]
            if ($pidVal -match '^\d+$' -and [int]$pidVal -gt 4) {
                cmd.exe /c "taskkill /PID $pidVal /T /F 2>nul"
            }
        }
    } catch {}
}

function Test-PortListening {
    param([int]$Port)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
        $wait = $iar.AsyncWaitHandle.WaitOne(400, $false)
        if ($wait -and $tcp.Connected) {
            $tcp.EndConnect($iar)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
    } catch {}
    return $false
}

function Test-DatabaseConnection {
    return (Test-PortListening $DB_PORT)
}

function Ensure-DatabaseRunning {
    if (-not (Test-DatabaseConnection)) {
        Write-Status "Memeriksa dan menyalakan Database PostgreSQL (Port $DB_PORT)..." "Cyan"
        
        # 1. Coba nyalakan service PostgreSQL bawaan Windows Server
        $pgService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($pgService -and $pgService.Status -ne "Running") {
            try {
                Start-Service -Name $pgService.Name -ErrorAction SilentlyContinue
                for ($i = 0; $i -lt 10; $i++) {
                    Start-Sleep -Milliseconds 500
                    if (Test-DatabaseConnection) { return }
                }
            } catch {}
        }

        # 2. Coba nyalakan standalone jika ada data simasmuh
        $simasmuhData = "D:\simasmuh\database\data"
        $pgCtl = @("18", "17", "16", "15", "14") | ForEach-Object { "C:\Program Files\PostgreSQL\$_\bin\pg_ctl.exe" } | Where-Object { Test-Path $_ } | Select-Object -First 1
        if ((Test-Path $simasmuhData) -and $pgCtl) {
            Start-Process -FilePath $pgCtl -ArgumentList "-D `"$simasmuhData`" -o `"-p $DB_PORT`" start" -WindowStyle Hidden
            for ($i = 0; $i -lt 15; $i++) {
                Start-Sleep -Milliseconds 500
                if (Test-DatabaseConnection) { break }
            }
        }
    }
}

function Restart-Database {
    Write-Status "Merestart Layanan Database PostgreSQL (Port $DB_PORT)..." "Yellow"

    $pgService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pgService) {
        try {
            Restart-Service -Name $pgService.Name -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        } catch {}
    }

    $simasmuhData = "D:\simasmuh\database\data"
    $pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
    if ((Test-Path $simasmuhData) -and (Test-Path $pgCtl)) {
        Write-Status "Menghentikan PostgreSQL via pg_ctl..." "Cyan"
        Start-Process -FilePath $pgCtl -ArgumentList "-D `"$simasmuhData`" stop -m fast" -WindowStyle Hidden -Wait
        Start-Sleep -Seconds 1
    }

    Stop-PortProcess $DB_PORT
    Start-Sleep -Milliseconds 500
    Ensure-DatabaseRunning

    if (Test-DatabaseConnection) {
        Write-Ok "Database PostgreSQL berhasil aktif di port $DB_PORT."
    } else {
        Write-Err "Gagal menyalakan kembali Database PostgreSQL di port $DB_PORT."
    }
}

# ─── STATUS PANEL ───────────────────────────────────────────

function Show-Status {
    $appPid    = Get-StoredPid $APP_PID_FILE
    $prismaPid = Get-StoredPid $PRISMA_PID_FILE

    $appRunning    = (Test-PortListening $CBT_PORT) -or ($null -ne $appPid -and (Test-ProcessRunning $appPid))
    $prismaRunning = (Test-PortListening $STUDIO_PORT) -or ($null -ne $prismaPid -and (Test-ProcessRunning $prismaPid))
    $dbConnected   = Test-DatabaseConnection

    $aStatus = if ($appRunning)    { "AKTIF (HTTP)".PadRight(15) } else { "MATI/OFF".PadRight(15) }
    $pStatus = if ($prismaRunning) { "AKTIF".PadRight(15) } else { "MATI/OFF".PadRight(15) }
    $dStatus = if ($dbConnected)   { "TERHUBUNG (:$DB_PORT)".PadRight(16) } else { "TERPUTUS (:$DB_PORT)".PadRight(16) }

    $aColor = if ($appRunning)    { "Green" } else { "Red" }
    $pColor = if ($prismaRunning) { "Green" } else { "DarkGray" }
    $dColor = if ($dbConnected)   { "Green" } else { "Red" }

    Write-Host "  +--------------------+------------------------+" -ForegroundColor DarkGray
    Write-Host "  | Komponen Layanan   | Status                 |" -ForegroundColor DarkGray
    Write-Host "  +--------------------+------------------------+" -ForegroundColor DarkGray
    Write-Host "  | Database PostgreSQL| " -NoNewline
    Write-Host ($dStatus + "   |") -ForegroundColor $dColor
    Write-Host "  | CBT Web (:4020)    | " -NoNewline
    Write-Host ($aStatus + " :$CBT_PORT     |") -ForegroundColor $aColor
    Write-Host "  | Prisma Studio (:5560)| " -NoNewline
    Write-Host ($pStatus + " :$STUDIO_PORT     |") -ForegroundColor $pColor
    Write-Host "  +--------------------+------------------------+" -ForegroundColor DarkGray
    Write-Host ""
}

# ─── SERVICE ACTIONS ────────────────────────────────────────

function Start-CBTApp {
    Write-Status "Memeriksa port $CBT_PORT..." "Cyan"
    Stop-PortProcess $CBT_PORT
    if (Test-Path $APP_PID_FILE) { Remove-Item $APP_PID_FILE -Force }

    $nextFolder = Join-Path $ROOT ".next"
    if (-not (Test-Path $nextFolder)) {
        Write-Info "Build production belum ada. Membangun sistem (build)..."
        cmd.exe /c "cd /d `"$ROOT`" && npm run build"
    }

    Write-Status "Menjalankan CBT Web App HTTP pada port $CBT_PORT..." "Cyan"
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c set PORT=$CBT_PORT& set HTTP_PORT=$CBT_PORT& set NODE_ENV=production& node server.js > `"$APP_LOG`" 2>&1" -WorkingDirectory $ROOT -PassThru -WindowStyle Hidden
    
    $proc.Id | Out-File $APP_PID_FILE -Force -Encoding ASCII
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-PortListening $CBT_PORT) { break }
    }

    if (Test-PortListening $CBT_PORT) {
        $appUrl = if ($CBT_PORT -eq 80) { "http://localhost" } else { "http://localhost:$CBT_PORT" }
        Write-Ok "CBT Web App HTTP berhasil aktif di $appUrl"
    } else {
        Write-Info "Server sedang inisialisasi di latar belakang (cek $APP_LOG)"
    }
}

function Stop-CBTApp {
    Write-Status "Menghentikan CBT Web App (Port $CBT_PORT)..." "Yellow"
    $appPid = Get-StoredPid $APP_PID_FILE
    if ($appPid) { Stop-ProcessById $appPid }
    Stop-PortProcess $CBT_PORT
    if (Test-Path $APP_PID_FILE) { Remove-Item $APP_PID_FILE -Force }
    Write-Ok "CBT Web App dihentikan."
}

function Start-PrismaStudio {
    Write-Status "Memeriksa port $STUDIO_PORT..." "Cyan"
    Stop-PortProcess $STUDIO_PORT
    if (Test-Path $PRISMA_PID_FILE) { Remove-Item $PRISMA_PID_FILE -Force }

    Write-Status "Menjalankan Prisma Studio pada port $STUDIO_PORT..." "Cyan"
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$ROOT`" && npx prisma studio --port $STUDIO_PORT --browser none > `"$PRISMA_LOG`" 2>&1" -PassThru -WindowStyle Hidden
    
    $proc.Id | Out-File $PRISMA_PID_FILE -Force -Encoding ASCII
    Start-Sleep -Seconds 2

    if (Test-PortListening $STUDIO_PORT) {
        Write-Ok "Prisma Studio berhasil aktif di http://localhost:$STUDIO_PORT (Latar Belakang)"
    } else {
        Write-Info "Prisma Studio sedang berjalan di latar belakang."
    }
}

function Stop-PrismaStudio {
    Write-Status "Menghentikan Prisma Studio (Port $STUDIO_PORT)..." "Yellow"
    $prismaPid = Get-StoredPid $PRISMA_PID_FILE
    if ($prismaPid) { Stop-ProcessById $prismaPid }
    Stop-PortProcess $STUDIO_PORT
    if (Test-Path $PRISMA_PID_FILE) { Remove-Item $PRISMA_PID_FILE -Force }
    Write-Ok "Prisma Studio dihentikan."
}

function Restart-CBTApp {
    Write-Banner
    Write-Status "Merestart CBT Web App..." "Yellow"
    Stop-CBTApp
    Start-Sleep -Seconds 1
    Start-CBTApp
    Write-Host ""
    Show-Status
}

function Rebuild-CBTApp {
    Write-Banner
    Write-Status "Rebuilding sistem CBT (Prisma Client + Next.js Turbopack)..." "Cyan"
    Write-Status "Menghentikan layanan CBT Web App dan Prisma Studio agar file binary tidak terkunci..." "Yellow"
    Stop-CBTApp
    Stop-PrismaStudio
    Start-Sleep -Seconds 1
    Write-Status "Menghasilkan Prisma Client (prisma generate)..." "Cyan"
    cmd.exe /c "cd /d `"$ROOT`" && npx prisma generate"
    Write-Status "Mengompilasi Next.js Production Build (npm run build)..." "Cyan"
    cmd.exe /c "cd /d `"$ROOT`" && npm run build"
    Start-Sleep -Seconds 1
    Start-CBTApp
    Start-PrismaStudio
    Write-Host ""
    Show-Status
}

function Start-AllServices {
    Write-Banner
    Write-Status "Menjalankan semua layanan CBT Standalone..." "Cyan"
    Ensure-DatabaseRunning
    Start-CBTApp
    Start-PrismaStudio
    
    $cbtUrl = if ($CBT_PORT -eq 80) { "http://localhost" } else { "http://localhost:$CBT_PORT" }
    Write-Status "Membuka browser CBT Web App: $cbtUrl" "Green"
    try { Start-Process $cbtUrl } catch {}

    Write-Host ""
    Show-Status
}

function Stop-AllServices {
    Write-Banner
    Write-Status "Menghentikan semua layanan CBT..." "Yellow"
    Stop-CBTApp
    Stop-PrismaStudio
    Write-Host ""
    Show-Status
}

function Restart-AllServices {
    Write-Banner
    Write-Status "Merestart semua layanan CBT (Aplikasi, Database, & Studio)..." "Yellow"
    Stop-CBTApp
    Stop-PrismaStudio
    Restart-Database
    Start-CBTApp
    Start-PrismaStudio
    Write-Host ""
    Show-Status
}

# ─── INTERACTIVE MENU ───────────────────────────────────────

if ($Mode -eq "start") {
    Start-AllServices
    exit 0
} elseif ($Mode -eq "stop") {
    Stop-AllServices
    exit 0
} elseif ($Mode -eq "restart") {
    Restart-AllServices
    exit 0
} elseif ($Mode -eq "restart-app") {
    Restart-CBTApp
    exit 0
} elseif ($Mode -eq "restart-db") {
    Restart-Database
    exit 0
} elseif ($Mode -eq "rebuild") {
    Rebuild-CBTApp
    exit 0
} elseif ($Mode -eq "status") {
    Write-Banner
    Show-Status
    exit 0
}

while ($true) {
    Write-Banner
    Show-Status

    Write-Host "  +=========================================+" -ForegroundColor DarkCyan
    Write-Host "  |               MENU UTAMA                |" -ForegroundColor DarkCyan
    Write-Host "  +=========================================+" -ForegroundColor DarkCyan
    Write-Host "  |  [1] Mulai Aplikasi (Mode Development)  |" -ForegroundColor White
    Write-Host "  |  [2] Mulai Aplikasi (Mode Production)   |" -ForegroundColor White
    Write-Host "  |  [3] Buka Prisma Studio (Port 5560)     |" -ForegroundColor Green
    Write-Host "  |  [4] Restart Database PostgreSQL        |" -ForegroundColor Yellow
    Write-Host "  |  [5] Inisialisasi Database (Push+Seed)  |" -ForegroundColor Magenta
    Write-Host "  |  [7] Restart Aplikasi                   |" -ForegroundColor White
    Write-Host "  |  [8] Rebuild & Restart (Full)           |" -ForegroundColor White
    Write-Host "  |  [9] Menonaktifkan Mode / Stop Aplikasi |" -ForegroundColor Red
    Write-Host "  |  [10] Build Aplikasi (Tanpa Jalankan)   |" -ForegroundColor White
    Write-Host "  |  [11] Cek Kesiapan Sistem               |" -ForegroundColor Green
    Write-Host "  |  [12] Buka Browser (localhost:4020)     |" -ForegroundColor White
    Write-Host "  |  [13] Update & Git Pull (Fetch/Merge)   |" -ForegroundColor Cyan
    Write-Host "  |  [14] Push Perubahan ke GitHub (Commit) |" -ForegroundColor Green
    Write-Host "  |  [15] Tampilkan Konfigurasi .env        |" -ForegroundColor White
    Write-Host "  |  [0] Keluar dari Script                 |" -ForegroundColor White
    Write-Host "  +=========================================+" -ForegroundColor DarkCyan
    Write-Host ""
    $choice = Read-Host "  Pilih menu [0-15]"

    switch ($choice) {
        "1" {
            Write-Status "Memulai CBT Web App (Mode Development) di port 4020..." "Cyan"
            Ensure-DatabaseRunning
            Stop-CBTApp
            Start-Process "cmd.exe" -ArgumentList "/c cd /d `"$ROOT`" && set PORT=4020&& npm run dev" -WindowStyle Normal
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "2" { Start-AllServices; Read-Host "  Tekan ENTER untuk kembali ke menu" }
        "3" { Start-PrismaStudio; Read-Host "  Tekan ENTER untuk kembali ke menu" }
        "4" { Restart-Database; Read-Host "  Tekan ENTER untuk kembali ke menu" }
        "5" {
            Write-Status "Inisialisasi database..." "Cyan"
            Ensure-DatabaseRunning
            cmd.exe /c "cd /d `"$ROOT`" && npx prisma db push && npx tsx prisma/seed.ts"
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "7" { Restart-AllServices; Read-Host "  Tekan ENTER untuk kembali ke menu" }
        "8" { Rebuild-CBTApp; Read-Host "  Tekan ENTER untuk kembali ke menu" }
        "9" { Stop-AllServices; Read-Host "  Tekan ENTER untuk kembali ke menu" }
        "10" {
            Write-Status "Build Aplikasi (Tanpa Menjalankan)..." "Cyan"
            cmd.exe /c "cd /d `"$ROOT`" && npx prisma generate && npm run build"
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "11" {
            Write-Banner
            Show-Status
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "12" { Start-Process "http://localhost:4020" }
        "13" {
            Write-Status "Mengambil update dari Git (git pull)..." "Cyan"
            cmd.exe /c "cd /d `"$ROOT`" && git pull"
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "14" {
            $msg = Read-Host "  Masukkan pesan commit"
            if (-not [string]::IsNullOrWhiteSpace($msg)) {
                cmd.exe /c "cd /d `"$ROOT`" && git add -A && git commit -m `"$msg`" && git push"
            }
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "15" {
            if (Test-Path "$ROOT\.env") { Get-Content "$ROOT\.env" } else { Write-Err ".env tidak ditemukan." }
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "0" { exit 0 }
        default { Write-Err "Pilihan tidak valid."; Start-Sleep -Seconds 1 }
    }
}
