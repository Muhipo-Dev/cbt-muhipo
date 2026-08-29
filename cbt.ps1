param(
    [string]$Mode = ""
)

# ==============================================================================
#   CBT MUHIPO - Script Manajemen & Maintain Aplikasi CBT
#   SMA Muhammadiyah 1 Ponorogo (C) 2026 - Muhipo Dev
#   
#   PORT MUTLAK (ABSOLUTE DEDICATED PORTS - ISOLATED FROM SIMASMUH):
#   - CBT Web App & API  : Port Mutlak 3010
#   - Prisma Studio (DB) : Port Mutlak 5560
#   - Supabase DB Local  : Port Mutlak 54332 (Docker Desktop)
#   - Supabase API Local : Port Mutlak 54331
#   - Supabase Studio GUI: Port Mutlak 54333 (Docker Desktop)
# ==============================================================================

$ROOT           = Split-Path -Parent $MyInvocation.MyCommand.Path
$APP_LOG        = Join-Path $ROOT "cbt-app.log"
$PRISMA_LOG     = Join-Path $ROOT "prisma-studio.log"
$APP_PID_FILE   = Join-Path $ROOT ".cbt-app.pid"
$PRISMA_PID_FILE= Join-Path $ROOT ".prisma-studio.pid"

$CBT_PORT       = 3010
$STUDIO_PORT    = 5560
$SUPABASE_DB_PORT = 54332
$SUPABASE_STUDIO_PORT = 54333

# ─── HELPERS ────────────────────────────────────────────────

function Write-Banner {
    try { Clear-Host } catch {}
    Write-Host ""
    Write-Host "  +==================================================+" -ForegroundColor Cyan
    Write-Host "  |          CBT MUHIPO - Muhipo Dev 2026            |" -ForegroundColor Cyan
    Write-Host "  |    Sistem CBT SMA Muhammadiyah 1 Ponorogo        |" -ForegroundColor Cyan
    Write-Host "  |    Port Mutlak: :$CBT_PORT (Web CBT) & :$STUDIO_PORT (DB)   |" -ForegroundColor DarkCyan
    Write-Host "  |    Docker DB  : :$SUPABASE_DB_PORT (Supabase RLS)         |" -ForegroundColor DarkCyan
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
    $envFile = Join-Path $ROOT ".env"
    if (-not (Test-Path $envFile)) { return $false }

    try {
        $envContent = Get-Content $envFile -Raw
        if (-not ($envContent -match 'DATABASE_URL\s*=\s*"?([^"\r\n]+)"?')) { return $false }
        $dbUrl = $Matches[1].Trim('"').Trim("'")

        if ($dbUrl -match '://[^@]+@([^:/]+):?(\d+)?/') {
            $dbHost = $Matches[1]
            $dbPort = if ($Matches[2]) { [int]$Matches[2] } else { 54332 }
        } else {
            return $false
        }

        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect   = $tcpClient.BeginConnect($dbHost, $dbPort, $null, $null)
        $waited    = $connect.AsyncWaitHandle.WaitOne(2000, $false)
        if ($waited -and $tcpClient.Connected) {
            $tcpClient.Close()
            return $true
        }
        $tcpClient.Close()
        return $false
    } catch {
        return $false
    }
}

# ─── STATUS DISPLAY ──────────────────────────────────────────

function Get-AppStatus {
    $appRunning          = Test-PortListening $CBT_PORT
    $prismaStudioRunning = Test-PortListening $STUDIO_PORT
    $supabaseRunning     = Test-PortListening $SUPABASE_DB_PORT
    $dbConnected         = Test-DatabaseConnection

    $aStatus = if ($appRunning)          { "AKTIF".PadRight(12) } else { "MATI".PadRight(12) }
    $pStatus = if ($prismaStudioRunning) { "AKTIF".PadRight(12) } else { "MATI".PadRight(12) }
    $sStatus = if ($supabaseRunning)     { "AKTIF".PadRight(12) } else { "MATI/OFF".PadRight(12) }
    $dStatus = if ($dbConnected)         { "TERHUBUNG".PadRight(12) } else { "STANDBY/OFF".PadRight(12) }

    $aColor = if ($appRunning)          { "Green" } else { "Red" }
    $pColor = if ($prismaStudioRunning) { "Green" } else { "DarkGray" }
    $sColor = if ($supabaseRunning)     { "Green" } else { "Yellow" }
    $dColor = if ($dbConnected)         { "Green" } else { "Yellow" }

    Write-Host "  +--------------------+--------------------------+"
    Write-Host "  |   STATUS LAYANAN CBT MUHIPO (DOCKER)         |"
    Write-Host "  +--------------------+--------------------------+"
    Write-Host "  | CBT Web App (Next) | " -NoNewline
    Write-Host ($aStatus + " :$CBT_PORT   |") -ForegroundColor $aColor
    Write-Host "  | Supabase DB Docker | " -NoNewline
    Write-Host ($sStatus + " :$SUPABASE_DB_PORT  |") -ForegroundColor $sColor
    Write-Host "  | Supabase Studio    | " -NoNewline
    Write-Host ($sStatus + " :$SUPABASE_STUDIO_PORT  |") -ForegroundColor $sColor
    Write-Host "  | Prisma Studio (ERD)| " -NoNewline
    Write-Host ($pStatus + " :$STUDIO_PORT   |") -ForegroundColor $pColor
    Write-Host "  | Database Status    | " -NoNewline
    Write-Host ($dStatus + "         |") -ForegroundColor $dColor
    Write-Host "  +--------------------+--------------------------+"
    Write-Host ""
}

# ─── SUPABASE DOCKER MANAGEMENT ───────────────────────────────

function Start-SupabaseDocker {
    Write-Status "Memeriksa status Supabase CBT di Docker Desktop..." "Cyan"
    if (Test-PortListening $SUPABASE_DB_PORT) {
        Write-Ok "Supabase CBT (Docker) aktif di port $SUPABASE_DB_PORT (DB) & $SUPABASE_STUDIO_PORT (Studio)"
        return $true
    }

    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        Write-Info "Docker CLI tidak terdeteksi. Lewati startup otomatis Supabase."
        return $false
    }

    Write-Status "Menjalankan Supabase CBT di Docker Desktop (npx supabase start)..." "Yellow"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$ROOT`" && npx supabase start 2>&1" -NoNewWindow -Wait

    if (Test-PortListening $SUPABASE_DB_PORT) {
        Write-Ok "Supabase CBT (Docker) berhasil dijalankan!"
        return $true
    }
    Write-Info "Supabase Docker belum aktif atau sedang proses startup. Pastikan Docker Desktop berjalan."
    return $false
}

function Stop-SupabaseDocker {
    Write-Status "Menghentikan Supabase CBT di Docker Desktop (npx supabase stop)..." "Yellow"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$ROOT`" && npx supabase stop" -NoNewWindow -Wait
    Write-Ok "Supabase CBT di Docker Desktop berhasil dihentikan."
}

# ─── STOP ────────────────────────────────────────────────────

function Stop-Apps {
    Write-Status "Menghentikan semua proses aplikasi CBT Muhipo..." "Yellow"

    $aPid = Get-StoredPid $APP_PID_FILE
    $pPid = Get-StoredPid $PRISMA_PID_FILE

    if ($aPid) {
        Stop-ProcessById $aPid
        Remove-Item $APP_PID_FILE -ErrorAction SilentlyContinue
    }
    if ($pPid) {
        Stop-ProcessById $pPid
        Remove-Item $PRISMA_PID_FILE -ErrorAction SilentlyContinue
    }

    Stop-PortProcess $CBT_PORT
    Stop-PortProcess $STUDIO_PORT

    Write-Ok "Semua proses aplikasi CBT telah dihentikan."
}

# ─── START ───────────────────────────────────────────────────

function Start-AppServer {
    param([string]$Mode = "Development")

    # 1. Otomatis nyalakan Supabase di Docker Desktop jika belum aktif
    $null = Start-SupabaseDocker
    Write-Host ""

    if ($Mode -eq "Development") {
        Write-Status "Menjalankan CBT Muhipo DEVELOPMENT (port mutlak $CBT_PORT)..." "Cyan"
        $cmdLine = "/c npm run dev >> `"$APP_LOG`" 2>&1"
    } else {
        Write-Status "Menjalankan CBT Muhipo PRODUCTION (port mutlak $CBT_PORT)..." "Cyan"
        $cmdLine = "/c npm run start >> `"$APP_LOG`" 2>&1"
    }

    try { "" | Out-File -FilePath $APP_LOG -Encoding utf8 -Force -ErrorAction SilentlyContinue } catch {}

    $proc = Start-Process -FilePath "cmd.exe" `
                          -ArgumentList $cmdLine `
                          -WorkingDirectory $ROOT `
                          -NoNewWindow -PassThru

    $proc.Id | Set-Content $APP_PID_FILE

    $timeout = 40
    $elapsed = 0
    Write-Host "  " -NoNewline
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $elapsed++
        Write-Host "." -NoNewline -ForegroundColor Cyan

        if (Test-PortListening $CBT_PORT) {
            Write-Host ""
            Write-Ok "=========================================================="
            Write-Ok " CBT MUHIPO + SUPABASE DOCKER + RLS TELAH AKTIF!"
            Write-Ok " - Portal CBT Web & API : http://localhost:$CBT_PORT"
            Write-Ok " - Supabase DB (Docker) : Port $SUPABASE_DB_PORT"
            Write-Ok " - Supabase Studio GUI  : http://localhost:$SUPABASE_STUDIO_PORT"
            Write-Ok " - Prisma Studio (ERD)  : http://localhost:$STUDIO_PORT"
            Write-Ok "=========================================================="
            return $true
        }
    }

    Write-Host ""
    if (Test-PortListening $CBT_PORT) {
        Write-Ok "CBT Muhipo aktif di port $CBT_PORT"
        return $true
    }

    Write-Err "CBT gagal dimulai dalam $timeout detik. Cek log: $APP_LOG"
    return $false
}

function Start-PrismaStudio {
    Write-Status "Menjalankan Prisma Studio (port mutlak $STUDIO_PORT)..." "Cyan"
    $cmdLine = "/c npx prisma studio --port $STUDIO_PORT >> `"$PRISMA_LOG`" 2>&1"

    $proc = Start-Process -FilePath "cmd.exe" `
                          -ArgumentList $cmdLine `
                          -WorkingDirectory $ROOT `
                          -NoNewWindow -PassThru

    $proc.Id | Set-Content $PRISMA_PID_FILE
    Start-Sleep -Seconds 2
    Write-Ok "Prisma Studio berjalan di http://localhost:$STUDIO_PORT"
}

# ─── DATABASE OPERATIONS ─────────────────────────────────────

function Run-DbPush {
    $null = Start-SupabaseDocker
    Write-Status "Melakukan migrasi skema database ke Supabase Docker (prisma db push)..." "Cyan"
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run db:push" -WorkingDirectory $ROOT -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -eq 0) {
        Write-Ok "Sinkronisasi skema database ke Docker berhasil!"
    } else {
        Write-Err "Gagal sinkronisasi skema database. Pastikan Docker Desktop berjalan."
    }
}

function Run-DbSeed {
    $null = Start-SupabaseDocker
    Write-Status "Mengisi data awal / seed database CBT Muhipo..." "Cyan"
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run db:seed" -WorkingDirectory $ROOT -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -eq 0) {
        Write-Ok "Seeding data ke Supabase Docker berhasil selesai!"
    } else {
        Write-Err "Seeding database gagal."
    }
}

# ─── BUILD ───────────────────────────────────────────────────

function Build-App {
    Write-Status "Menjalankan kompilasi produksi (npm run build)..." "Magenta"
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run build" -WorkingDirectory $ROOT -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -eq 0) {
        Write-Ok "Build selesai dengan sukses!"
        return $true
    } else {
        Write-Err "Build gagal."
        return $false
    }
}

# ─── REBUILD & RESTART (FULL) ─────────────────────────────────

function Rebuild-And-Restart {
    Write-Status "Memulai proses Rebuild & Restart CBT Muhipo..." "Magenta"
    Write-Info "1. Menghentikan proses yang sedang berjalan..."
    Stop-Apps
    Start-Sleep -Seconds 1

    Write-Info "2. Memastikan container Supabase Docker aktif..."
    $null = Start-SupabaseDocker

    Write-Info "3. Membersihkan cache build lama (.next)..."
    try {
        Remove-Item -Recurse -Force (Join-Path $ROOT ".next\cache") -ErrorAction SilentlyContinue
    } catch {}

    Write-Info "4. Melakukan kompilasi ulang (Build)..."
    $built = Build-App
    if ($built) {
        Write-Info "5. Menjalankan server kembali dalam MODE PRODUCTION..."
        Start-AppServer -Mode "Production"
        Write-Ok "Rebuild & Restart berhasil selesai 100%!"
    } else {
        Write-Err "Rebuild gagal. Server tidak dimulai ulang."
    }
}

# ─── CLI MODE EXECUTION ──────────────────────────────────────

if ($Mode -ne "") {
    Write-Banner
    switch -Wildcard ($Mode.ToLower()) {
        "*status*"    { Get-AppStatus }
        "*dev*"       { Start-AppServer -Mode "Development" }
        "*prod*"      { Start-AppServer -Mode "Production" }
        "*stop*"      { Stop-Apps }
        "*restart*"   { Stop-Apps; Start-Sleep -Seconds 1; Start-AppServer -Mode "Production" }
        "*rebuild*"   { Rebuild-And-Restart }
        "*supabase*"  { Start-SupabaseDocker }
        "*studio*"    { Start-PrismaStudio }
        "*push*"      { Run-DbPush }
        "*seed*"      { Run-DbSeed }
        "*build*"     { Build-App }
        default {
            Write-Err "Mode '$Mode' tidak dikenali. Menampilkan Menu Utama..."
            Start-Sleep -Seconds 1
        }
    }
    if ($Mode -notmatch "menu") { return }
}

# ─── INTERACTIVE MENU ────────────────────────────────────────

while ($true) {
    Write-Banner
    Get-AppStatus

    Write-Host "  +=========================================+" -ForegroundColor DarkCyan
    Write-Host "  |               MENU UTAMA                |" -ForegroundColor DarkCyan
    Write-Host "  +=========================================+" -ForegroundColor DarkCyan
    Write-Host "  |  [1] Mulai CBT (Port :$CBT_PORT) Dev         |" -ForegroundColor White
    Write-Host "  |  [2] Mulai CBT (Port :$CBT_PORT) Production  |" -ForegroundColor Green
    Write-Host "  |  [3] Restart Server CBT (Production)    |" -ForegroundColor White
    Write-Host "  |  [4] Rebuild & Restart CBT (Production) |" -ForegroundColor Magenta
    Write-Host "  |  [5] Hentikan Server CBT (Stop)         |" -ForegroundColor Red
    Write-Host "  |  [6] Jalankan Supabase Docker (:54332)  |" -ForegroundColor Yellow
    Write-Host "  |  [7] Stop Supabase Docker               |" -ForegroundColor Red
    Write-Host "  |  [8] Buka Supabase Studio (:54333) GUI  |" -ForegroundColor Cyan
    Write-Host "  |  [9] Buka Prisma Studio (:5560) ERD     |" -ForegroundColor Cyan
    Write-Host "  |  [10] Push Skema Database (db:push)     |" -ForegroundColor Yellow
    Write-Host "  |  [11] Seed Data Uji Coba (db:seed)      |" -ForegroundColor Green
    Write-Host "  |  [12] Build Aplikasi (next build)       |" -ForegroundColor White
    Write-Host "  |  [13] Buka Portal CBT di Browser        |" -ForegroundColor White
    Write-Host "  |  [14] Lihat Log Server                  |" -ForegroundColor White
    Write-Host "  |  [0] Keluar                             |" -ForegroundColor White
    Write-Host "  +=========================================+" -ForegroundColor DarkCyan
    Write-Host ""

    $choice = Read-Host "  Pilih menu"

    switch ($choice) {
        "1" {
            Write-Banner
            $running = Test-PortListening $CBT_PORT
            if ($running) {
                Write-Info "Aplikasi sudah berjalan di port $CBT_PORT. Gunakan Restart (menu 3) jika perlu."
            } else {
                Start-AppServer -Mode "Development"
            }
            Read-Host "  Tekan ENTER untuk kembali"
        }
        "2" {
            Write-Banner
            $running = Test-PortListening $CBT_PORT
            if ($running) {
                Write-Info "Aplikasi sudah berjalan di port $CBT_PORT. Gunakan Restart jika perlu."
            } else {
                # Pastikan build sudah ada sebelum start production
                if (-not (Test-Path (Join-Path $ROOT ".next"))) {
                    Write-Info "Kompilasi build belum ditemukan. Menjalankan build terlebih dahulu..."
                    Build-App
                }
                Start-AppServer -Mode "Production"
            }
            Read-Host "  Tekan ENTER untuk kembali"
        }
        "3" {
            Write-Banner
            Stop-Apps
            Start-Sleep -Seconds 1
            Start-AppServer -Mode "Production"
            Read-Host "  Tekan ENTER untuk kembali"
        }
        "4" {
            Write-Banner
            Rebuild-And-Restart
            Read-Host "  Tekan ENTER untuk kembali"
        }
        "5" {
            Write-Banner
            Stop-Apps
            Read-Host "  Tekan ENTER untuk kembali"
        }
        "6" {
            Write-Banner
            Start-SupabaseDocker
            Read-Host "  Tekan ENTER untuk kembali"
        }
        "7" {
            Write-Banner
            Stop-SupabaseDocker
            Read-Host "  Tekan ENTER untuk kembali"
        }
        "8" {
            Write-Status "Membuka Supabase Studio ke http://localhost:$SUPABASE_STUDIO_PORT ..." "Cyan"
            Start-Process "http://localhost:$SUPABASE_STUDIO_PORT"
            Start-Sleep -Seconds 1
        }
        "9" {
            Write-Banner
            Start-PrismaStudio
            Read-Host "  Tekan ENTER untuk kembali"
        }
        "10" {
            Write-Banner
            Run-DbPush
            Read-Host "  Tekan ENTER untuk kembali"
        }
        "11" {
            Write-Banner
            Run-DbSeed
            Read-Host "  Tekan ENTER untuk kembali"
        }
        "12" {
            Write-Banner
            Build-App
            Read-Host "  Tekan ENTER untuk kembali"
        }
        "13" {
            Write-Status "Membuka browser ke http://localhost:$CBT_PORT ..." "Cyan"
            Start-Process "http://localhost:$CBT_PORT"
            Start-Sleep -Seconds 1
        }
        "14" {
            Write-Banner
            if (Test-Path $APP_LOG) {
                Write-Host "--- 30 BARIS TERAKHIR LOG SERVER CBT ---" -ForegroundColor Cyan
                Get-Content $APP_LOG -Tail 30
            } else {
                Write-Info "Belum ada file log $APP_LOG"
            }
            Read-Host "  Tekan ENTER untuk kembali"
        }
        "0" {
            Write-Banner
            Write-Ok "Sampai jumpa! - Muhipo Dev 2026"
            break
        }
        default {
            Write-Err "Pilihan tidak valid."
            Start-Sleep -Seconds 1
        }
    }

    if ($choice -eq "0") { break }
}
