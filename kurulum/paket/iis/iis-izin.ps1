# SEC-K Portali - IIS uygulama havuzuna gereken izinleri verir
#
# IIS'te portal acilmiyorsa (502.5) en sik neden budur: uygulama havuzu
# kimliginin data\ klasorune yazma izni yoktur, SQLite acilamaz.
#
# Kullanim (yonetici olarak acilmis PowerShell):
#   powershell -ExecutionPolicy Bypass -File .\iis\iis-izin.ps1
#   powershell -ExecutionPolicy Bypass -File .\iis\iis-izin.ps1 -Havuz "SEC-K Portali"
#
# Havuz adini bilmiyorsaniz: IIS Yoneticisi > site > Temel Ayarlar ekraninda
# yazili. Varsayilani asagidaki gibidir.

[CmdletBinding()]
param(
    [string]$Havuz = "SEC-K Portali"
)

$ErrorActionPreference = "Stop"

function Write-Ok   ([string]$T) { Write-Host "  [TAMAM] $T" -ForegroundColor Green }
function Write-Info ([string]$T) { Write-Host "  $T" -ForegroundColor Gray }
function Write-Warn2([string]$T) { Write-Host "  [UYARI] $T" -ForegroundColor Yellow }
function Write-Fail ([string]$T) { Write-Host "  [HATA] $T" -ForegroundColor Red }

$paket   = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $paket "data"
$envPath = Join-Path $paket ".env"

Write-Host ""
Write-Host "=== IIS izinleri ===" -ForegroundColor Cyan
Write-Info "Paket : $paket"
Write-Info "Havuz : $Havuz"

$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Fail "Bu script yonetici yetkisi gerektirir."
    Write-Info "PowerShell'i 'Yonetici olarak calistir' ile acip tekrar deneyin."
    exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $paket "baslat.cjs"))) {
    Write-Fail "baslat.cjs bulunamadi: $paket"
    Write-Info "Script'i paketin icindeki iis\ klasorunden calistirin."
    exit 1
}

# data\ klasoru henuz yoksa olustur; izinleri simdi verip sonra dolsun.
if (-not (Test-Path -LiteralPath $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
    Write-Info "data\ klasoru olusturuldu."
}

$logDir = Join-Path $dataDir "iis-log"
if (-not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
    Write-Info "data\iis-log\ klasoru olusturuldu."
}

$poolUser = "IIS AppPool\$Havuz"

# Havuz kimliginin gercekten cozulup cozulmedigini onceden anlamak, icacls'in
# anlasilmaz "gecersiz hesap adi" hatasindan iyidir.
$kimlikVar = $true
try {
    $null = (New-Object Security.Principal.NTAccount($poolUser)).Translate([Security.Principal.SecurityIdentifier])
} catch {
    $kimlikVar = $false
}

if (-not $kimlikVar) {
    Write-Warn2 "'$poolUser' kimligi cozulemedi."
    Write-Info "Uygulama havuzu bu isimle var mi? IIS Yoneticisi > Uygulama Havuzlari."
    Write-Info "Farkli bir isimse: .\iis\iis-izin.ps1 -Havuz 'GercekHavuzAdi'"
    Write-Info "Yine de IIS_IUSRS grubuna izin vermeyi deneyecegim."
}

$hedefler = @()
if ($kimlikVar) { $hedefler += $poolUser }
# IIS_IUSRS: havuz kimlikleri bu gruba uyedir; yedek olarak ona da veriyoruz.
$hedefler += "*S-1-5-32-568"

$hata = $false

foreach ($kim in $hedefler) {
    # Paket klasoru: okuma + calistirma (node.exe dosyalari okuyabilsin)
    & icacls "$paket" /grant "${kim}:(OI)(CI)(RX)" /C /Q 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { $hata = $true }

    # data\: yazma (veritabani, yuklenen PDF'ler, gunlukler)
    & icacls "$dataDir" /grant "${kim}:(OI)(CI)(M)" /T /C /Q 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { $hata = $true }

    # .env: yalnizca okuma (oturum imza anahtarini tutuyor)
    if (Test-Path -LiteralPath $envPath) {
        & icacls "$envPath" /grant "${kim}:(R)" /C /Q 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { $hata = $true }
    }
}

if ($hata) {
    Write-Warn2 "Bazi izinler verilemedi. Yukaridaki havuz adini kontrol edin."
} else {
    Write-Ok "Izinler verildi:"
    Write-Info "  $paket        -> okuma"
    Write-Info "  $dataDir      -> yazma"
    if (Test-Path -LiteralPath $envPath) { Write-Info "  .env          -> okuma" }
}

# Yazma izninin gercekten ise yaradigini dogrula.
try {
    $deneme = Join-Path $dataDir ".izin-denemesi"
    Set-Content -LiteralPath $deneme -Value "ok" -Encoding ASCII
    Remove-Item -LiteralPath $deneme -Force
    Write-Ok "data\ klasorune yazilabiliyor."
} catch {
    Write-Fail "data\ klasorune hala yazilamiyor: $($_.Exception.Message)"
}

Write-Host ""
Write-Info "Simdi siteyi yeniden baslatin:"
Write-Info "  Restart-WebAppPool -Name '$Havuz'"
Write-Info ""
Write-Info "Portal hala acilmiyorsa hatanin kendisi burada yazilidir:"
Write-Info "  $logDir"
Write-Host ""
