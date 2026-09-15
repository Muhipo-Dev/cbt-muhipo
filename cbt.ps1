param(
    [string]$Mode = ""
)

# ==============================================================================
#   CBT MUHIPO - Script Manajemen & Server CBT Standalone
#   SMA Muhammadiyah 1 Ponorogo (C) 2026 - Muhipo Dev
#   
#   PORT CBT STANDALONE:
#   - CBT Web App & API  : Port Mutlak 80 (Port Utama HTTP)
#   - Prisma Studio (DB) : Port Mutlak 5560
# ==============================================================================

$ROOT           = Split-Path -Parent $MyInvocation.MyCommand.Path
$APP_LOG        = Join-Path $ROOT "cbt-app.log"
$PRISMA_LOG     = Join-Path $ROOT "prisma-studio.log"
$APP_PID_FILE   = Join-Path $ROOT ".cbt-app.pid"
$PRISMA_PID_FILE= Join-Path $ROOT ".prisma-studio.pid"

$CBT_PORT       = 443
$HTTP_PORT      = 80
$STUDIO_PORT    = 5560

# ─── HELPERS ────────────────────────────────────────────────

function Write-Banner {
    try { Clear-Host } catch {}
    Write-Host ""
    Write-Host "  +==================================================+" -ForegroundColor Cyan
    Write-Host "  |       CBT MUHIPO STANDALONE - Muhipo Dev         |" -ForegroundColor Cyan
    Write-Host "  |    Sistem CBT Mandiri SMA Muhammadiyah 1 Ponorogo|" -ForegroundColor Cyan
    Write-Host "  |  Port Server: :$CBT_PORT (HTTPS) & :$STUDIO_PORT (Studio) |" -ForegroundColor DarkCyan
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
        $result = netstat -ano 2>$null | Select-String ":$Port\s" | Select-String "LISTENING"
        foreach ($line in $result) {
            $tokens = ($line.Line -split '\s+') | Where-Object { $_ -ne '' }
            $pidVal = $tokens[-1]
            if ($pidVal -match '^\d+$' -and [int]$pidVal -gt 0) {
                $null = cmd.exe /c "taskkill /PID $pidVal /T /F 2>nul"
            }
        }
    } catch {}
}

function Test-PortListening {
    param([int]$Port)
    $result = netstat -ano 2>$null | Select-String ":$Port\s" | Select-String "LISTENING"
    return ($null -ne $result -and $result.Count -gt 0)
}

function Test-DatabaseConnection {
    $dbFile = Join-Path $ROOT "prisma\dev.db"
    $dbFileRoot = Join-Path $ROOT "dev.db"
    return (Test-Path $dbFile) -or (Test-Path $dbFileRoot)
}

# ─── STATUS PANEL ───────────────────────────────────────────

function Show-Status {
    $appPid    = Get-StoredPid $APP_PID_FILE
    $prismaPid = Get-StoredPid $PRISMA_PID_FILE

    $appRunning    = ($null -ne $appPid -and (Test-ProcessRunning $appPid)) -or (Test-PortListening $CBT_PORT)
    $prismaRunning = ($null -ne $prismaPid -and (Test-ProcessRunning $prismaPid)) -or (Test-PortListening $STUDIO_PORT)
    $dbConnected   = Test-DatabaseConnection

    $aStatus = if ($appRunning)    { "AKTIF (HTTPS)".PadRight(15) } else { "MATI/OFF".PadRight(15) }
    $pStatus = if ($prismaRunning) { "AKTIF".PadRight(15) } else { "MATI/OFF".PadRight(15) }
    $dStatus = if ($dbConnected)   { "TERHUBUNG (SIAP)".PadRight(16) } else { "BELUM SEED".PadRight(16) }

    $aColor = if ($appRunning)    { "Green" } else { "Red" }
    $pColor = if ($prismaRunning) { "Green" } else { "DarkGray" }
    $dColor = if ($dbConnected)   { "Green" } else { "Yellow" }

    Write-Host "  +--------------------+------------------------+" -ForegroundColor DarkGray
    Write-Host "  | Komponen Layanan   | Status                 |" -ForegroundColor DarkGray
    Write-Host "  +--------------------+------------------------+" -ForegroundColor DarkGray
    Write-Host "  | Database SQLite    | " -NoNewline
    Write-Host ($dStatus + "   |") -ForegroundColor $dColor
    Write-Host "  | CBT Web HTTPS (:443)| " -NoNewline
    Write-Host ($aStatus + " :$CBT_PORT    |") -ForegroundColor $aColor
    Write-Host "  | Prisma Studio (:5560)| " -NoNewline
    Write-Host ($pStatus + " :$STUDIO_PORT     |") -ForegroundColor $pColor
    Write-Host "  +--------------------+------------------------+" -ForegroundColor DarkGray
    Write-Host ""
}

# ─── SERVICE ACTIONS ────────────────────────────────────────

function Start-CBTApp {
    Write-Status "Memeriksa port $CBT_PORT dan port $HTTP_PORT..." "Cyan"
    Stop-PortProcess $CBT_PORT
    Stop-PortProcess $HTTP_PORT
    if (Test-Path $APP_PID_FILE) { Remove-Item $APP_PID_FILE -Force }

    $nextFolder = Join-Path $ROOT ".next"
    if (-not (Test-Path $nextFolder)) {
        Write-Info "Build production belum ada. Membangun sistem (build)..."
        cmd.exe /c "cd /d `"$ROOT`" && npm run build"
    }

    Write-Status "Menjalankan CBT Web App Secure HTTPS pada port $CBT_PORT (Auto-Redirect di Port $HTTP_PORT)..." "Cyan"
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$ROOT`" && node server.js > `"$APP_LOG`" 2>&1" -PassThru -WindowStyle Hidden
    
    $proc.Id | Out-File $APP_PID_FILE -Force -Encoding ASCII
    Start-Sleep -Seconds 3

    if (Test-PortListening $CBT_PORT) {
        Write-Ok "CBT Web App HTTPS berhasil aktif di https://localhost"
    } else {
        Write-Info "Server sedang inisialisasi di latar belakang (cek $APP_LOG)"
    }
}

function Stop-CBTApp {
    Write-Status "Menghentikan CBT Web App (Port $CBT_PORT & $HTTP_PORT)..." "Yellow"
    $appPid = Get-StoredPid $APP_PID_FILE
    if ($appPid) { Stop-ProcessById $appPid }
    Stop-PortProcess $CBT_PORT
    Stop-PortProcess $HTTP_PORT
    if (Test-Path $APP_PID_FILE) { Remove-Item $APP_PID_FILE -Force }
    Write-Ok "CBT Web App dihentikan."
}

function Start-PrismaStudio {
    Write-Status "Memeriksa port $STUDIO_PORT..." "Cyan"
    Stop-PortProcess $STUDIO_PORT
    if (Test-Path $PRISMA_PID_FILE) { Remove-Item $PRISMA_PID_FILE -Force }

    Write-Status "Menjalankan Prisma Studio pada port $STUDIO_PORT..." "Cyan"
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$ROOT`" && npx prisma studio --port $STUDIO_PORT > `"$PRISMA_LOG`" 2>&1" -PassThru -WindowStyle Hidden
    
    $proc.Id | Out-File $PRISMA_PID_FILE -Force -Encoding ASCII
    Start-Sleep -Seconds 2

    if (Test-PortListening $STUDIO_PORT) {
        Write-Ok "Prisma Studio berhasil aktif di http://localhost:$STUDIO_PORT"
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

function Start-AllServices {
    Write-Banner
    Write-Status "Menjalankan semua layanan CBT Standalone..." "Cyan"
    Start-CBTApp
    Start-PrismaStudio
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

# ─── INTERACTIVE MENU ───────────────────────────────────────

if ($Mode -eq "start") {
    Start-AllServices
    exit 0
} elseif ($Mode -eq "stop") {
    Stop-AllServices
    exit 0
} elseif ($Mode -eq "status") {
    Write-Banner
    Show-Status
    exit 0
}

while ($true) {
    Write-Banner
    Show-Status

    Write-Host "  PILIHAN MENU MANAJEMEN CBT STANDALONE:" -ForegroundColor White
    Write-Host "  [1] Jalankan Semua Layanan (CBT App + Prisma Studio)" -ForegroundColor Green
    Write-Host "  [2] Hentikan Semua Layanan" -ForegroundColor Red
    Write-Host "  [3] Jalankan CBT Web App Saja (:80)" -ForegroundColor Cyan
    Write-Host "  [4] Jalankan Prisma Studio GUI Saja (:5560)" -ForegroundColor Cyan
    Write-Host "  [5] Buka Browser CBT Web App (http://localhost)" -ForegroundColor Yellow
    Write-Host "  [6] Inisialisasi Ulang Skema Database (Prisma db push & seed)" -ForegroundColor Magenta
    Write-Host "  [7] Rebuild Sistem (Prisma generate + Next.js build)" -ForegroundColor Cyan
    Write-Host "  [0] Keluar" -ForegroundColor DarkGray
    Write-Host ""
    $choice = Read-Host "  Pilih nomor menu (0-7)"

    switch ($choice) {
        "1" { Start-AllServices; Read-Host "  Tekan Enter untuk kembali ke menu..." }
        "2" { Stop-AllServices; Read-Host "  Tekan Enter untuk kembali ke menu..." }
        "3" { Start-CBTApp; Read-Host "  Tekan Enter untuk kembali ke menu..." }
        "4" { Start-PrismaStudio; Read-Host "  Tekan Enter untuk kembali ke menu..." }
        "5" { Start-Process "http://localhost" }
        "6" {
            Write-Status "Inisialisasi database..." "Cyan"
            cmd.exe /c "cd /d `"$ROOT`" && npx prisma db push && npx tsx prisma/seed.ts"
            Read-Host "  Tekan Enter untuk kembali ke menu..."
        }
        "7" {
            Write-Status "Rebuilding sistem CBT..." "Cyan"
            Stop-CBTApp
            cmd.exe /c "cd /d `"$ROOT`" && npx prisma generate && npm run build"
            Start-CBTApp
            Read-Host "  Tekan Enter untuk kembali ke menu..."
        }
        "0" { exit 0 }
        default { Write-Err "Pilihan tidak valid."; Start-Sleep -Seconds 1 }
    }
}
