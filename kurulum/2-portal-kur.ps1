# SEÇ-K Portalı — Adım 2: portalı kur ve çalıştırmaya hazırla
#
# Bu script:
#   1. Node sürümünü doğrular
#   2. Bağımlılıkları kurar
#   3. .env dosyasını oluşturur (oturum anahtarı üretir)
#   4. Veritabanını hazırlar, admin şifresini ekrana yazar
#   5. Üretim derlemesini yapar
#
# Kullanım (projenin kök klasöründe):
#   powershell -ExecutionPolicy Bypass -File .\kurulum\2-portal-kur.ps1
#
# Örnek: kendi şifrenizi ve adresi belirleyerek
#   ... -File .\kurulum\2-portal-kur.ps1 -AdminSifre "Guclu1Sifre" -BaseUrl "http://seck.turkishfuel.com"

[CmdletBinding()]
param(
    # Admin şifresi. Verilmezse rastgele üretilir ve ekrana yazılır.
    [string]$AdminSifre,

    # Portalın dışarıdan erişilen adresi. Anket QR kodlarına bu adres gömülür.
    [string]$BaseUrl,

    # Portalın dinleyeceği port.
    [int]$Port = 3000,

    # Ekranları görmek için örnek bülten ve anket ekle (yalnızca test için).
    [switch]$OrnekVeri
)

$ErrorActionPreference = "Stop"

function Write-Step  ([string]$Text) { Write-Host "`n=== $Text ===" -ForegroundColor Cyan }
function Write-Ok    ([string]$Text) { Write-Host "  [TAMAM] $Text" -ForegroundColor Green }
function Write-Info  ([string]$Text) { Write-Host "  $Text" -ForegroundColor Gray }
function Write-Warn2 ([string]$Text) { Write-Host "  [UYARI] $Text" -ForegroundColor Yellow }
function Write-Fail  ([string]$Text) { Write-Host "  [HATA] $Text" -ForegroundColor Red }

# Script kurulum/ içinde; proje kökü bir üst klasör.
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
Write-Info "Proje klasoru: $projectRoot"

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "package.json"))) {
    Write-Fail "package.json bulunamadi. Script'i proje icindeki kurulum\ klasorunden calistirin."
    exit 1
}

# Yolda parantez veya Türkçe karakter bazı Node araçlarını bozabiliyor.
if ($projectRoot -match '[()]') {
    Write-Warn2 "Klasor yolunda parantez var: $projectRoot"
    Write-Info "Bazi Node araclari bundan etkilenir. Onerilen: klasoru C:\seckportal altina tasiyin."
}
if ($projectRoot -match '[^\u0000-\u007F]') {
    Write-Warn2 "Klasor yolunda Turkce/ozel karakter var. Onerilen: C:\seckportal"
}
if ($projectRoot -match 'OneDrive') {
    Write-Warn2 "Proje OneDrive ile senkronlanan bir klasorde."
    Write-Info "node_modules on binlerce dosya olusturur; senkron kurulumu yavaslatir ve"
    Write-Info "acik SQLite veritabanina mudahale veritabanini bozabilir. Tasimaniz onerilir."
}

# ————————————————————————————— Node kontrolü —————————————————————————————
Write-Step "Node.js kontrolu"

$nodeVersion = $null
try { $nodeVersion = (& node -v 2>$null) } catch { $nodeVersion = $null }

if (-not $nodeVersion) {
    Write-Fail "Node.js bulunamadi."
    Write-Info "Once .\kurulum\1-node-kur.ps1 script'ini yonetici olarak calistirin."
    Write-Info "Kurulumdan sonra bu pencereyi KAPATIP yeniden acin."
    exit 1
}

$nodeMajor = [int](($nodeVersion -replace '^v', '') -split '\.')[0]
Write-Info "Node.js: $nodeVersion"

if ($nodeMajor -lt 20) {
    Write-Fail "Node.js 20 veya uzeri gerekli (mevcut: $nodeVersion)."
    Write-Info ""
    Write-Info "Node 16/18 ile SQLite paketi kaynaktan derlenmeye calisir ve Python +"
    Write-Info "Visual Studio derleyicisi ister. Node 20'de hazir dosya indirilir,"
    Write-Info "derleyiciye gerek kalmaz — Python KURMANIZ GEREKMEZ."
    Write-Info ""
    Write-Info "Cozum: .\kurulum\1-node-kur.ps1 (yonetici olarak), sonra yeni pencere ac."
    exit 1
}
Write-Ok "Node.js surumu yeterli."

# ————————————————————————————— Bağımlılıklar —————————————————————————————
Write-Step "Bagimliliklar kuruluyor"
Write-Info "Bu adim internete cikar ve 1-3 dakika surebilir."

$npmCommand = if (Test-Path -LiteralPath (Join-Path $projectRoot "package-lock.json")) { "ci" } else { "install" }
Write-Info "Komut: npm $npmCommand"

# npm.cmd kullaniyoruz: PowerShell'in imzasiz script kisitlamasi npm.ps1'i engeller.
& npm.cmd $npmCommand
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Bagimlilik kurulumu basarisiz (cikis kodu $LASTEXITCODE)."
    Write-Info "Kurumsal ag npm erisimini engelliyorsa: internete cikabilen bir makinede"
    Write-Info "'npm ci' calistirip node_modules klasorunu buraya kopyalayabilirsiniz."
    exit 1
}
Write-Ok "Bagimliliklar kuruldu."

# ————————————————————————————— .env —————————————————————————————
Write-Step "Ortam ayarlari (.env)"

$envPath = Join-Path $projectRoot ".env"
if (Test-Path -LiteralPath $envPath) {
    Write-Ok ".env zaten var, degistirilmedi."
    Write-Info "Icerigini gozden gecirmek isterseniz: notepad .env"
} else {
    # Oturum cookie'lerini imzalayan anahtar. Uretimde mutlaka sabit ve gizli olmali.
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)

    $lines = @(
        "# SEC-K Portali ortam ayarlari (kurulum script'i tarafindan olusturuldu)",
        "",
        "# Oturum cookie'lerini imzalayan gizli anahtar. Degistirirseniz acik",
        "# oturumlar gecersiz olur. Bu dosyayi paylasmayin.",
        "SECK_SESSION_SECRET=$secret",
        "",
        "# Anket QR kodlarina gomulecek kok adres.",
        "SECK_BASE_URL=$BaseUrl",
        "",
        "# HTTPS uzerinden yayinliyorsaniz true yapin.",
        "SECK_SECURE_COOKIE=false",
        "",
        "PORT=$Port"
    )
    Set-Content -LiteralPath $envPath -Value $lines -Encoding UTF8
    Write-Ok ".env olusturuldu, oturum anahtari uretildi."

    if (-not $BaseUrl) {
        Write-Warn2 "SECK_BASE_URL bos birakildi."
        Write-Info "Anket QR kodlari dogru adresi gostersin diye bunu doldurun:"
        Write-Info "  notepad .env  ->  SECK_BASE_URL=http://sunucu-adi:$Port"
    }
}

# ————————————————————————————— Veritabanı —————————————————————————————
Write-Step "Veritabani ve admin hesabi"

$dbPath = Join-Path $projectRoot "data\portal.db"
if (Test-Path -LiteralPath $dbPath) {
    Write-Ok "Veritabani zaten var, korunuyor."
    Write-Info "Sifrenizi bilmiyorsaniz: npm.cmd run sifre"
} else {
    if ($AdminSifre) {
        $env:SECK_ADMIN_PASSWORD = $AdminSifre
    }
    & npm.cmd run seed
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Veritabani kurulumu basarisiz."
        exit 1
    }
    Remove-Item Env:\SECK_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    Write-Warn2 "Yukaridaki kutudaki kullanici adi ve SIFREYI kaydedin."
}

if ($OrnekVeri) {
    Write-Step "Ornek veri ekleniyor"
    & npm.cmd run demo
    Write-Info "Geri almak icin: npm.cmd run demo -- --temizle"
}

# ————————————————————————————— Derleme —————————————————————————————
Write-Step "Uretim derlemesi"
Write-Info "Bu adim 1-2 dakika surebilir."

& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Derleme basarisiz (cikis kodu $LASTEXITCODE)."
    exit 1
}
Write-Ok "Derleme tamamlandi."

# ————————————————————————————— Bitti —————————————————————————————
Write-Host ""
Write-Host "  ┌──────────────────────────────────────────────────────────┐" -ForegroundColor Green
Write-Host "  │  KURULUM TAMAMLANDI                                      │" -ForegroundColor Green
Write-Host "  └──────────────────────────────────────────────────────────┘" -ForegroundColor Green
Write-Host ""
Write-Info "Portali simdi baslatmak icin:"
Write-Host "      npm.cmd start" -ForegroundColor White
Write-Info ""
Write-Info "Ardindan tarayicidan:"
Write-Host "      http://localhost:$Port" -ForegroundColor White
Write-Info ""
Write-Info "Sunucu her aciliste kendiliginden baslasin isterseniz:"
Write-Host "      .\kurulum\3-servis-kur.ps1" -ForegroundColor White
Write-Host ""
