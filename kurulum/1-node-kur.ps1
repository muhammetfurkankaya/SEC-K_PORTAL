# SEÇ-K Portalı — Adım 1: Node.js 20 LTS kurulumu
#
# Portal Node.js 20 veya üzeri gerektirir. Node 16 ile kurulum, SQLite
# paketinin kaynaktan derlenmeye çalışması nedeniyle Python ve Visual Studio
# derleyicisi ister ve başarısız olur. Node 20'de hazır derlenmiş dosya
# indirildiği için derleyiciye HİÇ gerek kalmaz.
#
# Kullanım (yönetici olarak açılmış PowerShell'de):
#   powershell -ExecutionPolicy Bypass -File .\kurulum\1-node-kur.ps1
#
# İnternet erişimi yoksa: -MsiPath ile elle indirdiğiniz dosyayı verin
#   ... -File .\kurulum\1-node-kur.ps1 -MsiPath C:\indirilenler\node-v20.20.2-x64.msi

[CmdletBinding()]
param(
    # Kurulacak Node ana sürümü. 22 de desteklenir.
    [ValidateSet("20", "22")]
    [string]$Major = "20",

    # İnternet yoksa elle indirilmiş MSI dosyasının yolu.
    [string]$MsiPath,

    # Node zaten yeterliyse bile yeniden kur.
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$MinimumMajor = 20

function Write-Step  ([string]$Text) { Write-Host "`n=== $Text ===" -ForegroundColor Cyan }
function Write-Ok    ([string]$Text) { Write-Host "  [TAMAM] $Text" -ForegroundColor Green }
function Write-Info  ([string]$Text) { Write-Host "  $Text" -ForegroundColor Gray }
function Write-Warn2 ([string]$Text) { Write-Host "  [UYARI] $Text" -ForegroundColor Yellow }
function Write-Fail  ([string]$Text) { Write-Host "  [HATA] $Text" -ForegroundColor Red }

# ————————————————————————————— Yönetici kontrolü —————————————————————————————
$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Fail "Bu script yönetici yetkisi gerektirir."
    Write-Info "PowerShell'i 'Yönetici olarak çalıştır' ile açıp tekrar deneyin."
    exit 1
}

Write-Step "Mevcut Node.js sürümü"

$currentVersion = $null
try {
    $currentVersion = (& node -v 2>$null)
} catch {
    $currentVersion = $null
}

if ($currentVersion) {
    Write-Info "Kurulu sürüm: $currentVersion"
    $currentMajor = [int](($currentVersion -replace '^v', '') -split '\.')[0]

    if ($currentMajor -ge $MinimumMajor -and -not $Force) {
        Write-Ok "Node.js sürümü yeterli. Kuruluma gerek yok."
        Write-Info "Sonraki adım: .\kurulum\2-portal-kur.ps1"
        exit 0
    }

    if ($currentMajor -lt $MinimumMajor) {
        Write-Warn2 "Sürüm çok eski (v$currentMajor). Node $Major LTS kurulacak."
        Write-Info "Eski sürüm MSI tarafından güncellenir; ayrıca kaldırmanız gerekmez."
    }
} else {
    Write-Info "Node.js kurulu değil."
}

# ————————————————————————————— MSI'yi bul veya indir —————————————————————————————
Write-Step "Kurulum dosyasi"

if ($MsiPath) {
    if (-not (Test-Path -LiteralPath $MsiPath)) {
        Write-Fail "Belirtilen dosya bulunamadi: $MsiPath"
        exit 1
    }
    $installer = (Resolve-Path -LiteralPath $MsiPath).Path
    Write-Ok "Yerel dosya kullanilacak: $installer"
} else {
    # Node dagitim dizininden en güncel yama sürümünü okuyoruz; böylece
    # script sabit bir sürüm numarasina bagli kalmaz.
    $distUrl = "https://nodejs.org/dist/latest-v$Major.x"
    Write-Info "Guncel surum ogreniliyor: $distUrl"

    # Windows Server 2019'un varsayilan TLS ayari eski olabilir.
    try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

    try {
        $shaFile  = Invoke-WebRequest -Uri "$distUrl/SHASUMS256.txt" -UseBasicParsing -TimeoutSec 60
        $msiMatch = [regex]::Match($shaFile.Content, "node-v$Major\.[0-9]+\.[0-9]+-x64\.msi")
        if (-not $msiMatch.Success) { throw "MSI adi bulunamadi." }
        $msiName = $msiMatch.Value
    } catch {
        Write-Fail "Node dagitim adresine ulasilamadi: $($_.Exception.Message)"
        Write-Info ""
        Write-Info "Sunucunun internet erisimi kapali olabilir. Bu durumda:"
        Write-Info "  1. Internete cikabilen bir bilgisayardan MSI'yi indirin:"
        Write-Info "     https://nodejs.org/dist/latest-v$Major.x/"
        Write-Info "     (node-v$Major.x.x-x64.msi dosyasi)"
        Write-Info "  2. Sunucuya kopyalayip su sekilde calistirin:"
        Write-Info "     .\kurulum\1-node-kur.ps1 -MsiPath C:\yol\node-v$Major.x.x-x64.msi"
        exit 1
    }

    $installer = Join-Path $env:TEMP $msiName
    Write-Info "Indiriliyor: $msiName"

    try {
        $progressPreferenceBackup = $ProgressPreference
        $ProgressPreference = "SilentlyContinue"   # büyük dosyada cok daha hizli
        Invoke-WebRequest -Uri "$distUrl/$msiName" -OutFile $installer -UseBasicParsing -TimeoutSec 900
        $ProgressPreference = $progressPreferenceBackup
    } catch {
        Write-Fail "Indirme basarisiz: $($_.Exception.Message)"
        exit 1
    }

    $sizeMb = [math]::Round((Get-Item $installer).Length / 1MB, 1)
    Write-Ok "Indirildi ($sizeMb MB)"
}

# ————————————————————————————— Kur —————————————————————————————
Write-Step "Node.js kuruluyor"
Write-Info "Bu adim 1-2 dakika surebilir, ekran hareketsiz gorunebilir."

$logFile = Join-Path $env:TEMP "node-kurulum.log"
$process = Start-Process -FilePath "msiexec.exe" `
    -ArgumentList "/i", "`"$installer`"", "/qn", "/norestart", "/l*v", "`"$logFile`"" `
    -Wait -PassThru

if ($process.ExitCode -ne 0) {
    Write-Fail "Kurulum basarisiz (msiexec cikis kodu: $($process.ExitCode))"
    Write-Info "Ayrintili kayit: $logFile"
    exit 1
}

Write-Ok "Node.js kuruldu."

# Bu oturumun PATH'i guncellenmedigi icin dogrulamayi tam yoldan yapiyoruz.
$nodeExe = Join-Path $env:ProgramFiles "nodejs\node.exe"
if (Test-Path -LiteralPath $nodeExe) {
    $installedVersion = (& $nodeExe -v)
    Write-Ok "Dogrulandi: $installedVersion"
} else {
    Write-Warn2 "node.exe beklenen konumda bulunamadi: $nodeExe"
}

Write-Host ""
Write-Host "  ┌──────────────────────────────────────────────────────────┐" -ForegroundColor Yellow
Write-Host "  │  ONEMLI: Bu komut penceresini KAPATIP yeniden acin.      │" -ForegroundColor Yellow
Write-Host "  │  PATH degisikligi ancak yeni pencerede gecerli olur.     │" -ForegroundColor Yellow
Write-Host "  └──────────────────────────────────────────────────────────┘" -ForegroundColor Yellow
Write-Host ""
Write-Info "Yeni pencerede sirayla:"
Write-Info "  node -v                              (v$Major.x gormelisiniz)"
Write-Info "  .\kurulum\2-portal-kur.ps1           (portali kurar)"
Write-Host ""
