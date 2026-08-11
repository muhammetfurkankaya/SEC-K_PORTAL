# SEÇ-K Portalı — Adım 3: sunucu açılışta kendiliğinden başlasın
#
# Portalı bir Zamanlanmış Görev olarak kaydeder: sunucu her açıldığında
# oturum açılmasını beklemeden başlar. Ayrıca güvenlik duvarında portu açar.
#
# Kullanım (yönetici olarak açılmış PowerShell'de):
#   powershell -ExecutionPolicy Bypass -File .\kurulum\3-servis-kur.ps1
#
# Kaldırmak için:
#   ... -File .\kurulum\3-servis-kur.ps1 -Kaldir

[CmdletBinding()]
param(
    [int]$Port = 3000,

    # Görevi ve güvenlik duvarı kuralını kaldırır.
    [switch]$Kaldir,

    # Güvenlik duvarı kuralı eklemeyi atla.
    [switch]$GuvenlikDuvariAtla
)

$ErrorActionPreference = "Stop"

$TaskName     = "SEC-K Portali"
$FirewallName = "SEC-K Portali (HTTP $Port)"

function Write-Step  ([string]$Text) { Write-Host "`n=== $Text ===" -ForegroundColor Cyan }
function Write-Ok    ([string]$Text) { Write-Host "  [TAMAM] $Text" -ForegroundColor Green }
function Write-Info  ([string]$Text) { Write-Host "  $Text" -ForegroundColor Gray }
function Write-Warn2 ([string]$Text) { Write-Host "  [UYARI] $Text" -ForegroundColor Yellow }
function Write-Fail  ([string]$Text) { Write-Host "  [HATA] $Text" -ForegroundColor Red }

$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Fail "Bu script yonetici yetkisi gerektirir."
    exit 1
}

$projectRoot = Split-Path -Parent $PSScriptRoot

# ————————————————————————————— Kaldırma —————————————————————————————
if ($Kaldir) {
    Write-Step "Kaldiriliyor"

    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Stop-ScheduledTask   -TaskName $TaskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Ok "Zamanlanmis gorev kaldirildi."
    } else {
        Write-Info "Zamanlanmis gorev bulunamadi."
    }

    if (Get-NetFirewallRule -DisplayName $FirewallName -ErrorAction SilentlyContinue) {
        Remove-NetFirewallRule -DisplayName $FirewallName
        Write-Ok "Guvenlik duvari kurali kaldirildi."
    }

    Write-Info "Not: Portal surecleri calisiyorsa el ile kapatin (Gorev Yoneticisi -> node.exe)."
    exit 0
}

# ————————————————————————————— Ön kontroller —————————————————————————————
Write-Step "On kontroller"

$nextBin = Join-Path $projectRoot "node_modules\next\dist\bin\next"
if (-not (Test-Path -LiteralPath $nextBin)) {
    Write-Fail "Bagimliliklar kurulmamis gorunuyor."
    Write-Info "Once .\kurulum\2-portal-kur.ps1 script'ini calistirin."
    exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot ".next"))) {
    Write-Fail "Uretim derlemesi yok (.next klasoru bulunamadi)."
    Write-Info "Once: npm.cmd run build"
    exit 1
}

$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodeExe) {
    $candidate = Join-Path $env:ProgramFiles "nodejs\node.exe"
    if (Test-Path -LiteralPath $candidate) { $nodeExe = $candidate }
}
if (-not $nodeExe) {
    Write-Fail "node.exe bulunamadi."
    exit 1
}
Write-Ok "node.exe: $nodeExe"

# Gorev SYSTEM olarak calisacagi icin data\ klasorune yazma izni gerekiyor.
# Kullanici klasorleri (Desktop, OneDrive) bu yuzden uygun degil.
if ($projectRoot -match '\\Users\\') {
    Write-Warn2 "Proje bir kullanici klasorunde: $projectRoot"
    Write-Info "Gorev SYSTEM hesabiyla calisir ve buraya yazamayabilir."
    Write-Info "Onerilen: projeyi C:\seckportal altina tasiyip script'i tekrar calistirin."
    $answer = Read-Host "  Yine de devam edilsin mi? (E/H)"
    if ($answer -notmatch '^[Ee]') { exit 1 }
}

# ————————————————————————————— Görev —————————————————————————————
Write-Step "Zamanlanmis gorev olusturuluyor"

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Write-Info "Ayni isimde gorev var, yenisiyle degistiriliyor."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$action = New-ScheduledTaskAction `
    -Execute $nodeExe `
    -Argument "`"$nextBin`" start -p $Port" `
    -WorkingDirectory $projectRoot

$trigger = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

$taskPrincipal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $taskPrincipal `
    -Description "SEC-K Portali (Next.js) - sunucu acilisinda baslar" | Out-Null

Write-Ok "Gorev olusturuldu: $TaskName"

# ————————————————————————————— Güvenlik duvarı —————————————————————————————
if (-not $GuvenlikDuvariAtla) {
    Write-Step "Guvenlik duvari"

    if (Get-NetFirewallRule -DisplayName $FirewallName -ErrorAction SilentlyContinue) {
        Write-Ok "Kural zaten var."
    } else {
        New-NetFirewallRule -DisplayName $FirewallName `
            -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port `
            -Profile Domain, Private | Out-Null
        Write-Ok "Port $Port ic aga acildi (Domain + Private)."
        Write-Info "Genel aglara acilmadi — sirket ici kullanim icin dogrusu bu."
    }
}

# ————————————————————————————— Başlat —————————————————————————————
Write-Step "Baslatiliyor"
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 6

$state = (Get-ScheduledTask -TaskName $TaskName).State
Write-Info "Gorev durumu: $state"

try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 30
    Write-Ok "Portal yanit veriyor (HTTP $($response.StatusCode))."
} catch {
    Write-Warn2 "Portal henuz yanit vermedi. Ilk aciliste birkac saniye surebilir."
    Write-Info "Kontrol: Invoke-WebRequest http://localhost:$Port/ -UseBasicParsing"
}

Write-Host ""
Write-Host "  ┌──────────────────────────────────────────────────────────┐" -ForegroundColor Green
Write-Host "  │  PORTAL CALISIYOR                                        │" -ForegroundColor Green
Write-Host "  └──────────────────────────────────────────────────────────┘" -ForegroundColor Green
Write-Host ""
Write-Info "Yerel adres     : http://localhost:$Port"
Write-Info "Ag uzerinden    : http://$env:COMPUTERNAME`:$Port"
Write-Info ""
Write-Info "Yonetim komutlari:"
Write-Info "  Durdur   : Stop-ScheduledTask  -TaskName '$TaskName'"
Write-Info "  Baslat   : Start-ScheduledTask -TaskName '$TaskName'"
Write-Info "  Durum    : Get-ScheduledTask   -TaskName '$TaskName'"
Write-Info "  Kaldir   : .\kurulum\3-servis-kur.ps1 -Kaldir"
Write-Host ""
Write-Warn2 "Zamanlanmis gorev, surec cokerse 3 kez yeniden dener ama gercek bir"
Write-Info "  Windows servisi kadar dayanikli degildir. Kalici uretim kurulumu icin"
Write-Info "  NSSM ile servis olusturmayi dusunun (kurulum\README.md icinde anlatildi)."
Write-Host ""
