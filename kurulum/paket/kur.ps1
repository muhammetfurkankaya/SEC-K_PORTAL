# SEÇ-K Portalı — sunucu kurulumu (yayın paketi)
#
# Bu paket derlenmiş hâldedir: npm, internet veya derleyici gerekmez.
# Yalnızca Node.js 20 veya 22 kurulu olmalıdır.
#
# Kullanım (yönetici olarak açılmış PowerShell):
#   powershell -ExecutionPolicy Bypass -File .\kur.ps1
#
# Seçenekler:
#   .\kur.ps1 -AdminSifre "Guclu1Sifre" -BaseUrl "http://seck.turkishfuel.com"
#   .\kur.ps1 -Port 8080
#   .\kur.ps1 -GorevAtla        (açılışta otomatik başlatma görevi kurulmasın)

[CmdletBinding()]
param(
    [int]$Port = 3000,
    [string]$AdminSifre,
    [string]$BaseUrl,
    [switch]$GorevAtla
)

$ErrorActionPreference = "Stop"
$TaskName = "SEC-K Portali"

function Write-Step  ([string]$Text) { Write-Host "`n=== $Text ===" -ForegroundColor Cyan }
function Write-Ok    ([string]$Text) { Write-Host "  [TAMAM] $Text" -ForegroundColor Green }
function Write-Info  ([string]$Text) { Write-Host "  $Text" -ForegroundColor Gray }
function Write-Warn2 ([string]$Text) { Write-Host "  [UYARI] $Text" -ForegroundColor Yellow }
function Write-Fail  ([string]$Text) { Write-Host "  [HATA] $Text" -ForegroundColor Red }

$root = $PSScriptRoot
Set-Location -LiteralPath $root
Write-Info "Paket klasoru: $root"

if (-not (Test-Path -LiteralPath (Join-Path $root "baslat.cjs"))) {
    Write-Fail "baslat.cjs bulunamadi. Script'i paketin kok klasorunden calistirin."
    exit 1
}

# ————————————————————————————— Node kontrolü —————————————————————————————
Write-Step "Node.js kontrolu"

$nodeVersion = $null
try { $nodeVersion = (& node -v 2>$null) } catch { $nodeVersion = $null }

if (-not $nodeVersion) {
    Write-Fail "Node.js bulunamadi."
    Write-Info ""
    Write-Info "https://nodejs.org/en/download adresinden Node.js 20 LTS"
    Write-Info "Windows Installer (.msi) kurun, sonra bu pencereyi KAPATIP"
    Write-Info "yeniden acin ve script'i tekrar calistirin."
    exit 1
}

$major = [int](($nodeVersion -replace '^v', '') -split '\.')[0]
Write-Info "Node.js: $nodeVersion"

if ($major -ne 20 -and $major -ne 22) {
    Write-Fail "Bu paket Node.js 20 veya 22 ile calisir (mevcut: $nodeVersion)."
    Write-Info ""
    Write-Info "Paketteki SQLite dosyasi bu iki surum icin derlenmis hazir ikili"
    Write-Info "iceriyor. Node.js 20 LTS kurun: https://nodejs.org/en/download"
    exit 1
}
Write-Ok "Node.js surumu uygun."

# Yol uyarıları — SYSTEM hesabı kullanıcı klasörlerine yazamayabilir.
if ($root -match '[()]') {
    Write-Warn2 "Klasor yolunda parantez var. Onerilen: C:\seckportal"
}
if ($root -match '\\Users\\' -or $root -match 'OneDrive') {
    Write-Warn2 "Paket bir kullanici klasorunde: $root"
    Write-Info "Otomatik baslatma gorevi SYSTEM hesabiyla calisir ve buraya yazamayabilir."
    Write-Info "Onerilen: paketi C:\seckportal altina tasiyip script'i tekrar calistirin."
}

# ————————————————————————————— Port kontrolü —————————————————————————————
Write-Step "Port kontrolu"

<#
    Portu baska bir program tutuyorsa portal baslayamaz ve hata mesaji
    ("EADDRINUSE") kullaniciya bir sey anlatmaz.

    En sik durum: ayni port icin IIS'te bir site tanimli. Windows'ta portu
    HTTP.sys tutar, dolayisiyla IIS sitesi durdurulmadan Node o portu
    dinleyemez.
#>
$portDolu = $false
try {
    $dinleyen = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($dinleyen) { $portDolu = $true }
} catch {
    # Get-NetTCPConnection eski sunucularda olmayabilir; netstat ile bak.
    $portDolu = (& netstat -ano | Select-String ":${Port}\s" | Select-String "LISTENING") -ne $null
}

if ($portDolu) {
    Write-Warn2 "Port $Port su anda baska bir program tarafindan dinleniyor."

    $iisSite = $null
    $appcmdYol = Join-Path $env:windir "system32\inetsrv\appcmd.exe"
    if (Test-Path -LiteralPath $appcmdYol) {
        $siteler = (& $appcmdYol list sites 2>&1) | ForEach-Object { "$_" }
        $iisSite = $siteler | Where-Object { $_ -match ":${Port}:" } | Select-Object -First 1
    }

    if ($iisSite) {
        Write-Info "Portu IIS tutuyor:"
        Write-Info "  $($iisSite.Trim())"
        Write-Info ""
        Write-Info "Portal bu portu dinleyecekse IIS sitesini durdurmalisiniz."
        if ($iisSite -match 'SITE\s+"([^"]+)"') {
            Write-Info "  appcmd stop site `"$($matches[1])`""
        }
        Write-Info ""
        Write-Info "IIS'i on kapi olarak kullanmak isterseniz bunun yerine:"
        Write-Info "  powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1"
    } else {
        Write-Info "Farkli bir port secmek icin: .\kur.ps1 -Port 9093"
    }
    Write-Info ""
    Write-Info "Kuruluma devam ediliyor; portal baslatilirken hata verebilir."
} else {
    Write-Ok "Port $Port musait."
}

# ————————————————————————————— .env —————————————————————————————
Write-Step "Ortam ayarlari"

$envPath = Join-Path $root ".env"
if (Test-Path -LiteralPath $envPath) {
    Write-Ok ".env zaten var, degistirilmedi."
} else {
    # Oturum cookie'lerini imzalayan anahtar. Degisirse acik oturumlar duser.
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)

    @(
        "# SEC-K Portali ortam ayarlari (kur.ps1 tarafindan olusturuldu)",
        "",
        "# Oturum cookie'lerini imzalayan gizli anahtar. Bu dosyayi paylasmayin.",
        "SECK_SESSION_SECRET=$secret",
        "",
        "# Anket QR kodlarina gomulecek kok adres.",
        "SECK_BASE_URL=$BaseUrl",
        "",
        "# HTTPS uzerinden yayinliyorsaniz true yapin.",
        "SECK_SECURE_COOKIE=false",
        "",
        "PORT=$Port"
    ) | Set-Content -LiteralPath $envPath -Encoding UTF8

    Write-Ok ".env olusturuldu, oturum anahtari uretildi."

    if (-not $BaseUrl) {
        Write-Warn2 "SECK_BASE_URL bos birakildi."
        Write-Info "Anket QR kodlari dogru adresi gostersin diye doldurun:"
        Write-Info "  notepad .env   ->   SECK_BASE_URL=http://$($env:COMPUTERNAME):$Port"
    }
}

# ————————————————————————————— Veritabanı —————————————————————————————
Write-Step "Veritabani ve admin hesabi"

if (Test-Path -LiteralPath (Join-Path $root "data\portal.db")) {
    Write-Ok "Veritabani zaten var, korunuyor."
    Write-Info "Sifreyi bilmiyorsaniz: node komutlar\sifre.cjs"
} else {
    if ($AdminSifre) { $env:SECK_ADMIN_PASSWORD = $AdminSifre }

    & node "komutlar\seed.cjs"
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Veritabani kurulumu basarisiz (cikis kodu $LASTEXITCODE)."
        exit 1
    }

    Remove-Item Env:\SECK_ADMIN_PASSWORD -ErrorAction SilentlyContinue

    if ($AdminSifre) {
        Write-Warn2 "Yukaridaki kutudaki kullanici adi ve SIFREYI kaydedin."
        Write-Info "Sifre tek yonlu saklanir; sonradan goruntulenemez."
    } else {
        Write-Warn2 "Varsayilan sifre atandi. ILK GIRISTEN SONRA degistirin:"
        Write-Info "Ayarlar > Sifre Degistir. Degistirilene kadar panelde uyari gorunur."
    }
}

# ————————————————————————————— Dosya izinleri —————————————————————————————
Write-Step "Dosya izinleri"

<#
    .env dosyasi oturum cookie'lerini imzalayan gizli anahtari, data\ klasoru
    ise veritabanini ve yuklenen PDF'leri tutuyor. Bu iki yol klasorden izin
    devraldigi surece sunucuda oturum acabilen herkes anahtari okuyabilir —
    anahtari bilen kisi kendine yonetici oturum cookie'si uretebilir.

    Bu yuzden devralmayi kesip yalnizca SYSTEM (gorevi calistiran hesap) ve
    yerel yoneticilere tam yetki veriyoruz. Gruplar SID ile veriliyor: Turkce
    Windows'ta "Administrators" grubunun adi "Yoneticiler" oluyor.
#>
$SID_SYSTEM = "*S-1-5-18"
$SID_ADMINS = "*S-1-5-32-544"

$envPath = Join-Path $root ".env"
$dataDir = Join-Path $root "data"
$izinTamam = $true

foreach ($hedef in @($envPath, $dataDir)) {
    if (-not (Test-Path -LiteralPath $hedef)) { continue }

    $klasorMu = (Get-Item -LiteralPath $hedef) -is [IO.DirectoryInfo]
    $bayrak = if ($klasorMu) { "(OI)(CI)(F)" } else { "(F)" }

    $cikti = & icacls "$hedef" /inheritance:r /grant "${SID_SYSTEM}:$bayrak" /grant "${SID_ADMINS}:$bayrak" /T /C /Q 2>&1
    if ($LASTEXITCODE -ne 0) {
        $izinTamam = $false
        Write-Warn2 "Izinler ayarlanamadi: $hedef"
        Write-Info ($cikti | Select-Object -First 2)
    }
}

if ($izinTamam) {
    Write-Ok ".env ve data\ yalnizca SYSTEM ve yoneticiler tarafindan okunabilir."
} else {
    Write-Info "Script'i yonetici olarak calistirdiginizdan emin olun."
}

# ————————————————————————————— Açılışta başlatma —————————————————————————————
$taskCreated = $false

if (-not $GorevAtla) {
    Write-Step "Acilista otomatik baslatma"

    $identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)

    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Warn2 "Yonetici yetkisi yok; gorev ve guvenlik duvari atlandi."
        Write-Info "Portali elle baslatmak icin: node baslat.cjs"
    } else {
        if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
            Write-Info "Ayni isimde gorev var, yenisiyle degistiriliyor."
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        }

        $nodeExe = (Get-Command node).Source
        $action  = New-ScheduledTaskAction -Execute $nodeExe -Argument "baslat.cjs" -WorkingDirectory $root
        $trigger = New-ScheduledTaskTrigger -AtStartup

        $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
            -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
            -ExecutionTimeLimit ([TimeSpan]::Zero)

        $taskPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" `
            -LogonType ServiceAccount -RunLevel Highest

        Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
            -Settings $settings -Principal $taskPrincipal `
            -Description "SEC-K Portali - sunucu acilisinda baslar" | Out-Null

        Write-Ok "Zamanlanmis gorev olusturuldu."
        $taskCreated = $true

        $ruleName = "SEC-K Portali (HTTP $Port)"
        if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
            New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow `
                -Protocol TCP -LocalPort $Port -Profile Domain, Private | Out-Null
            Write-Ok "Guvenlik duvarinda port $Port ic aga acildi."
            Write-Info "Genel aglara acilmadi; sirket ici kullanim icin dogrusu bu."
        } else {
            Write-Ok "Guvenlik duvari kurali zaten var."
        }

        Write-Step "Baslatiliyor"
        Start-ScheduledTask -TaskName $TaskName
        Start-Sleep -Seconds 8

        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 30
            Write-Ok "Portal yanit veriyor (HTTP $($response.StatusCode))."
        } catch {
            Write-Warn2 "Portal henuz yanit vermedi. Ilk aciliste birkac saniye surebilir."
            Write-Info "Kontrol: Invoke-WebRequest http://localhost:$Port/ -UseBasicParsing"
        }
    }
}

# ————————————————————————————— Bitti —————————————————————————————
Write-Host ""
Write-Host "  +----------------------------------------------------------+" -ForegroundColor Green
Write-Host "  |  KURULUM TAMAMLANDI                                      |" -ForegroundColor Green
Write-Host "  +----------------------------------------------------------+" -ForegroundColor Green
Write-Host ""
Write-Info "Yerel adres  : http://localhost:$Port"
Write-Info "Ag uzerinden : http://$($env:COMPUTERNAME):$Port"
Write-Info ""

if ($taskCreated) {
    Write-Info "Yonetim komutlari:"
    Write-Info "  Durdur  : Stop-ScheduledTask  -TaskName '$TaskName'"
    Write-Info "  Baslat  : Start-ScheduledTask -TaskName '$TaskName'"
    Write-Info "  Durum   : Get-ScheduledTask   -TaskName '$TaskName'"
} else {
    Write-Info "Portali baslatmak icin:  node baslat.cjs"
}

Write-Info ""
Write-Info "Sifre sifirlama : node komutlar\sifre.cjs"
Write-Info "Ornek veri      : node komutlar\demo.cjs"
Write-Info "Ayrintili bilgi : KURULUM.md"
Write-Host ""
