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
    [switch]$GorevAtla,

    # Kullanilacak node.exe. Bos birakilirsa once paketteki node\node.exe,
    # yoksa sistemde kurulu Node kullanilir.
    [string]$NodeExe,

    # Port baska bir IIS sitesi tarafindan tutuluyorsa o siteyi durdur.
    # Windows'ta portu HTTP.sys tutar; IIS sitesi acikken Node ayni
    # IP:port ikilisini dinleyemez.
    [switch]$PortuBosalt
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

# ————————————————————————————— Node.js —————————————————————————————
Write-Step "Node.js"

<#
    Kullanilacak node.exe: once -NodeExe, sonra PAKETTEKI node\node.exe,
    sonra sistemde kurulu node.

    Paketle node.exe gelmesinin nedeni: sunucuya Node.js kurmak zorunda
    kalmamak. MSI kurulumu eski bir surumu kaldirmaya calisip orijinal msi
    paketini isteyebiliyor; ayrica ayni sunucudaki diger uygulamalar eski
    Node surumune bagli olabiliyor.
#>
function Test-NodeExe ([string]$Yol) {
    if (-not $Yol -or -not (Test-Path -LiteralPath $Yol)) { return $null }
    $s = $null
    try { $s = (& $Yol -v 2>$null) } catch { return $null }
    if (-not $s) { return $null }
    $ana = [int](($s -replace '^v','') -split '\.')[0]
    if ($ana -ne 20 -and $ana -ne 22) { return $null }
    return $s
}

$nodeExe = $null
$nodeVersion = $null

if ($NodeExe) {
    $nodeVersion = Test-NodeExe $NodeExe
    if (-not $nodeVersion) {
        Write-Fail "-NodeExe ile verilen dosya kullanilamadi: $NodeExe"
        exit 1
    }
    $nodeExe = $NodeExe
    Write-Ok "Node.js $nodeVersion  (elle verildi)"
} else {
    $paketNode = Join-Path $root "node\node.exe"
    $nodeVersion = Test-NodeExe $paketNode

    if ($nodeVersion) {
        $nodeExe = $paketNode
        Write-Ok "Node.js $nodeVersion  (paketle geldi: node\node.exe)"
        Write-Info "Sistemdeki Node surumune dokunulmuyor."
    } else {
        $sistem = $null
        try { $sistem = (Get-Command node -ErrorAction Stop).Source } catch { }
        $nodeVersion = Test-NodeExe $sistem

        if ($nodeVersion) {
            $nodeExe = $sistem
            Write-Ok "Node.js $nodeVersion  (sistemde kurulu)"
        } else {
            Write-Fail "Kullanilabilir Node.js bulunamadi."
            Write-Info ""
            Write-Info "Pakette node\node.exe olmali (yaklasik 70 MB). Arsivi"
            Write-Info "eksiksiz actiginizdan emin olun."
            if ($sistem) {
                $sv = $null
                try { $sv = (& $sistem -v 2>$null) } catch { }
                Write-Info "Sistemdeki surum: $sv (bu paket 20 veya 22 ister)"
            }
            Write-Info ""
            Write-Info "Alternatif: .\kur.ps1 -NodeExe `"C:\yol\node.exe`""
            exit 1
        }
    }
}

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

$appcmdYol = Join-Path $env:windir "system32\inetsrv\appcmd.exe"

<# Portu bir IIS sitesi tutuyorsa o sitenin adini dondurur. #>
function Get-PortuTutanSite {
    if (-not (Test-Path -LiteralPath $appcmdYol)) { return $null }
    $siteler = (& $appcmdYol list sites 2>&1) | ForEach-Object { "$_" }
    $satir = $siteler | Where-Object { $_ -match ":${Port}:" } | Select-Object -First 1
    if ($satir -and $satir -match 'SITE\s+"([^"]+)"') { return $matches[1] }
    return $null
}

if ($portDolu) {
    Write-Warn2 "Port $Port su anda baska bir program tarafindan dinleniyor."
    $iisSiteAdi = Get-PortuTutanSite

    if ($iisSiteAdi) {
        Write-Info "Portu IIS sitesi tutuyor: $iisSiteAdi"

        if ($PortuBosalt) {
            $r = & $appcmdYol stop site "$iisSiteAdi" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "'$iisSiteAdi' sitesi durduruldu."
                Start-Sleep -Seconds 2

                # Gercekten serbest kaldi mi?
                $halaDolu = $false
                try {
                    if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) { $halaDolu = $true }
                } catch { }

                if ($halaDolu) {
                    Write-Warn2 "Port hala dolu. Ayni portu kullanan baska bir site olabilir:"
                    Write-Info "  $appcmdYol list sites"
                } else {
                    Write-Ok "Port $Port serbest kaldi."
                    $portDolu = $false
                }
            } else {
                Write-Warn2 "Site durdurulamadi: $r"
            }
        } else {
            Write-Info ""
            Write-Info "Portal bu portu dinleyecekse siteyi durdurmalisiniz. Iki yol:"
            Write-Info "  1) Bu script'i -PortuBosalt ile tekrar calistirin"
            Write-Info "  2) Elle: appcmd stop site `"$iisSiteAdi`""
            Write-Info ""
            Write-Info "IIS'i on kapi olarak kullanmak isterseniz bunun yerine:"
            Write-Info "  powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1"
        }
    } else {
        Write-Info "Portu tutan bir IIS sitesi bulunamadi."
        Write-Info "Farkli bir port secmek icin: .\kur.ps1 -Port 9093"
    }

    if ($portDolu) {
        Write-Info ""
        Write-Info "Kuruluma devam ediliyor; portal baslatilirken hata verebilir."
    }
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

    & $nodeExe "komutlar\seed.cjs"
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

        # Ilk acilisda Next sunucusu birkac saniye hazirlanir; 30 saniye
        # boyunca deneyip sonucu net soyluyoruz.
        $yanitVerdi = $false
        $sonHata = $null
        for ($deneme = 1; $deneme -le 10; $deneme += 1) {
            Start-Sleep -Seconds 3
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 10
                Write-Ok "Portal yanit veriyor (HTTP $($response.StatusCode))."
                $yanitVerdi = $true
                break
            } catch {
                $sonHata = $_.Exception.Message
            }
        }

        if ($yanitVerdi) {
            # Ag uzerinden de erisilebiliyor mu? (guvenlik duvari / dinlenen adres)
            try {
                $agAdres = "http://$($env:COMPUTERNAME):$Port/"
                $r2 = Invoke-WebRequest -Uri $agAdres -UseBasicParsing -TimeoutSec 10
                Write-Ok "Ag uzerinden de erisilebiliyor: $agAdres (HTTP $($r2.StatusCode))"
            } catch {
                Write-Warn2 "Yalnizca localhost yanit veriyor; agdan erisilemedi."
                Write-Info "Guvenlik duvari kurali eklenmis olmali; .env icinde"
                Write-Info "HOSTNAME=127.0.0.1 satiri varsa onu silin ve gorevi yeniden baslatin."
            }
        } else {
            Write-Fail "Portal $Port portunda yanit vermiyor."
            Write-Info "Son hata: $sonHata"
            Write-Info ""
            Write-Info "Sebebi gormenin en hizli yolu portali ON PLANDA calistirmak:"
            Write-Info "  Stop-ScheduledTask -TaskName '$TaskName'"
            Write-Info "  .\nodejs.cmd baslat.cjs"
            Write-Info ""
            Write-Info "Hata mesaji dogrudan ekrana yazilir (izin, port, veritabani...)."
            Write-Info "Duzelttikten sonra: Start-ScheduledTask -TaskName '$TaskName'"
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

Write-Info "Giris        : admin / Tfs2026...  (ilk giristen sonra degistirin)"
Write-Info ""

if ($taskCreated) {
    Write-Info "Portal bir Windows gorevi olarak calisiyor; sunucu yeniden"
    Write-Info "baslatildiginda kendiliginden aciliyor."
    Write-Info ""
    Write-Info "Yonetim komutlari:"
    Write-Info "  Durdur  : Stop-ScheduledTask  -TaskName '$TaskName'"
    Write-Info "  Baslat  : Start-ScheduledTask -TaskName '$TaskName'"
    Write-Info "  Durum   : Get-ScheduledTask   -TaskName '$TaskName'"
} else {
    Write-Info "Portali baslatmak icin:  .\nodejs.cmd baslat.cjs"
}

Write-Info ""
Write-Info "Sifre sifirlama : .\nodejs.cmd komutlar\sifre.cjs"
Write-Info "Ornek veri      : .\nodejs.cmd komutlar\demo.cjs"
Write-Info "Ayrintili bilgi : KURULUM.md"
Write-Host ""
