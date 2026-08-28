# SEC-K Portali — IIS uzerinden HTTP/HTTPS yayini
#
# Portal kendi web sunucusunu Node.js uzerinde calistirir. IIS'in gorevi on
# kapi olmaktir: 80/443 portlarini dinler, sirket sertifikasi ile HTTPS
# sunar ve istekleri portala iletir.
#
# Iki mod var:
#
#   -Mod vekil   (varsayilan)  IIS ters vekil olur; Node surecini "SEC-K
#                              Portali" zamanlanmis gorevi calistirir.
#                              Gerekli: URL Rewrite 2.1 + ARR 3.0
#                              Once .\kur.ps1 calistirilmis olmali.
#
#   -Mod iis                   Node surecini IIS'in kendisi baslatir ve
#                              yonetir; zamanlanmis gorev gerekmez.
#                              Gerekli: HttpPlatformHandler 1.2
#
# Kullanim (yonetici olarak acilmis PowerShell):
#   powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1 -HostAdi seck.turkishfuel.com
#
# Ornekler:
#   .\iis\iis-kur.ps1 -HostAdi seck.turkishfuel.com -Sertifika A1B2C3... -HttpsZorla
#   .\iis\iis-kur.ps1 -Mod iis -HostAdi seck.turkishfuel.com
#   .\iis\iis-kur.ps1 -HttpPort 8080            (host adi yoksa ayri port)
#
# Ayrintili anlatim ve elle kurulum adimlari: iis\IIS.md

[CmdletBinding()]
param(
    [ValidateSet("vekil", "iis")]
    [string]$Mod = "vekil",

    [string]$SiteAdi = "SEC-K Portali",
    [string]$HostAdi,
    [int]$HttpPort = 80,
    [int]$HttpsPort = 443,

    # Sertifikanin parmak izi (thumbprint). IIS Yoneticisi > Sunucu
    # Sertifikalari ekranindan veya:
    #   Get-ChildItem Cert:\LocalMachine\My | Format-List Subject, Thumbprint
    [string]$Sertifika,

    # HTTP ile geleni HTTPS'e yonlendir. Sertifika baglanmadan kullanmayin.
    [switch]$HttpsZorla,

    # Portalin dinledigi port (yalnizca vekil modunda; .env icindeki PORT).
    [int]$NodePort = 3000,

    # Portal yalnizca 127.0.0.1 dinlesin ve 3000 guvenlik duvarindan
    # kapatilsin — boylece IIS/HTTPS atlatilamaz (yalnizca vekil modunda).
    [switch]$YalnizIIS
)

$ErrorActionPreference = "Stop"
$TaskName = "SEC-K Portali"

function Write-Step  ([string]$Text) { Write-Host "`n=== $Text ===" -ForegroundColor Cyan }
function Write-Ok    ([string]$Text) { Write-Host "  [TAMAM] $Text" -ForegroundColor Green }
function Write-Info  ([string]$Text) { Write-Host "  $Text" -ForegroundColor Gray }
function Write-Warn2 ([string]$Text) { Write-Host "  [UYARI] $Text" -ForegroundColor Yellow }
function Write-Fail  ([string]$Text) { Write-Host "  [HATA] $Text" -ForegroundColor Red }

# ————————————————————————————— Yol ve yetki —————————————————————————————

$paket   = Split-Path -Parent $PSScriptRoot
$siteDir = Join-Path $paket "iis-site"
$dataDir = Join-Path $paket "data"
$envPath = Join-Path $paket ".env"

Write-Info "Paket klasoru : $paket"
Write-Info "Mod           : $Mod"

if (-not (Test-Path -LiteralPath (Join-Path $paket "baslat.cjs"))) {
    Write-Fail "baslat.cjs bulunamadi: $paket"
    Write-Info "Script'i paketin icindeki iis\ klasorunden calistirin."
    exit 1
}

$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Fail "Bu script yonetici yetkisi gerektirir."
    Write-Info "PowerShell'i 'Yonetici olarak calistir' ile acip tekrar deneyin."
    exit 1
}

# ————————————————————————————— Onkosullar —————————————————————————————

Write-Step "Node.js kontrolu"

$nodeVersion = $null
try { $nodeVersion = (& node -v 2>$null) } catch { $nodeVersion = $null }

if (-not $nodeVersion) {
    Write-Fail "Node.js bulunamadi."
    Write-Info "IIS, portalin kodunu kendi basina calistiramaz; portal bir"
    Write-Info "Node.js uygulamasidir. https://nodejs.org/en/download adresinden"
    Write-Info "Node.js 20 LTS (.msi) kurup pencereyi kapatip yeniden acin."
    exit 1
}

$nodeMajor = [int](($nodeVersion -replace '^v', '') -split '\.')[0]
if ($nodeMajor -ne 20 -and $nodeMajor -ne 22) {
    Write-Fail "Bu paket Node.js 20 veya 22 ile calisir (mevcut: $nodeVersion)."
    exit 1
}
$nodeExe = (Get-Command node).Source
Write-Ok "Node.js $nodeVersion  ($nodeExe)"

Write-Step "IIS kontrolu"

try {
    Import-Module WebAdministration -ErrorAction Stop
} catch {
    Write-Fail "IIS yonetim modulu (WebAdministration) yuklenemedi."
    Write-Info "IIS yonetim script'leri kurulu degil olabilir. Sunucu Yoneticisi >"
    Write-Info "Rol ve Ozellik Ekle > Web Sunucusu (IIS) > Yonetim Araclari >"
    Write-Info "'IIS Yonetim Script'leri ve Araclari' ozelligini ekleyin."
    exit 1
}
Write-Ok "IIS yonetim modulu hazir."

$modules = @()
try { $modules = Get-WebGlobalModule | Select-Object -ExpandProperty Name } catch { $modules = @() }

function Test-IisModule ([string]$Pattern) {
    foreach ($m in $modules) { if ($m -match $Pattern) { return $true } }
    return $false
}

$appcmd = Join-Path $env:windir "system32\inetsrv\appcmd.exe"

if ($Mod -eq "vekil") {
    if (-not (Test-IisModule "Rewrite")) {
        Write-Fail "URL Rewrite kurulu degil."
        Write-Info "Indirme: https://www.iis.net/downloads/microsoft/url-rewrite"
        Write-Info "Kurduktan sonra bu script'i tekrar calistirin."
        Write-Info "Alternatif: -Mod iis (yalnizca HttpPlatformHandler ister)."
        exit 1
    }
    Write-Ok "URL Rewrite kurulu."

    # ARR'nin varligini modul adindan tahmin etmek yerine, ihtiyacimiz olan
    # ayari yazmayi deneyerek anliyoruz: proxy bolumu yalnizca ARR kuruluysa
    # var oldugu icin bu en kesin kontrol.
    & $appcmd set config -section:system.webServer/proxy /enabled:"True" /commit:apphost 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Application Request Routing (ARR) kurulu degil."
        Write-Info "URL Rewrite tek basina baska bir sunucuya istek iletemez; ARR gerekir."
        Write-Info "Indirme: https://www.iis.net/downloads/microsoft/application-request-routing"
        Write-Info "Kurduktan sonra bu script'i tekrar calistirin."
        Write-Info "Alternatif: -Mod iis (yalnizca HttpPlatformHandler ister)."
        exit 1
    }
    Write-Ok "ARR kurulu ve vekil modu acildi."

    # Gercek istemci adresini portala tasiyabilmek icin sunucu degiskenine
    # izin gerekiyor; izin verilemezse web.config'ten ilgili blok cikarilir.
    # Izin zaten varsa tekrar eklemek hata verecegi icin once listeye bakiyoruz.
    $izinliler = (& $appcmd list config -section:system.webServer/rewrite/allowedServerVariables 2>&1) -join "`n"

    if ($izinliler -match "HTTP_X_FORWARDED_FOR") {
        $script:xffIzinli = $true
    } else {
        & $appcmd set config -section:system.webServer/rewrite/allowedServerVariables `
            /+"[name='HTTP_X_FORWARDED_FOR']" /commit:apphost 2>&1 | Out-Null
        $script:xffIzinli = ($LASTEXITCODE -eq 0)
    }

    if ($script:xffIzinli) {
        Write-Ok "Istemci adresi (X-Forwarded-For) portala iletilecek."
    } else {
        Write-Warn2 "X-Forwarded-For izni eklenemedi; istemci adresi iletilmeyecek."
        Write-Info "Anket hiz siniri bu durumda cerez tabanli calisir, sorun degil."
    }
} else {
    $script:xffIzinli = $false
    if (-not (Test-IisModule "httpPlatformHandler")) {
        Write-Fail "HttpPlatformHandler kurulu degil."
        Write-Info "Indirme: https://www.iis.net/downloads/microsoft/httpplatformhandler"
        Write-Info "Kurduktan sonra bu script'i tekrar calistirin."
        Write-Info "Alternatif: -Mod vekil (URL Rewrite + ARR ister)."
        exit 1
    }
    Write-Ok "HttpPlatformHandler kurulu."
}

# ————————————————————————————— .env —————————————————————————————

<#
    .env icindeki bir anahtari gunceller, yoksa ekler.
    Dosya baslat.cjs tarafindan okunuyor; bicim: ANAHTAR=deger
#>
function Set-EnvValue ([string]$File, [string]$Key, [string]$Value) {
    $lines = @()
    if (Test-Path -LiteralPath $File) { $lines = @(Get-Content -LiteralPath $File) }

    $found = $false
    for ($i = 0; $i -lt $lines.Count; $i += 1) {
        if ($lines[$i] -match "^\s*$([regex]::Escape($Key))\s*=") {
            $lines[$i] = "$Key=$Value"
            $found = $true
        }
    }
    if (-not $found) { $lines += "$Key=$Value" }

    Set-Content -LiteralPath $File -Value $lines -Encoding UTF8
}

Write-Step "Ortam ayarlari"

if (-not (Test-Path -LiteralPath $envPath)) {
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)

    @(
        "# SEC-K Portali ortam ayarlari (iis-kur.ps1 tarafindan olusturuldu)",
        "",
        "# Oturum cookie'lerini imzalayan gizli anahtar. Bu dosyayi paylasmayin.",
        "SECK_SESSION_SECRET=$secret",
        "",
        "PORT=$NodePort"
    ) | Set-Content -LiteralPath $envPath -Encoding UTF8

    Write-Ok ".env olusturuldu, oturum anahtari uretildi."
} else {
    Write-Ok ".env zaten var."
}

# Dis adres: QR kodlarin ve mutlak baglantilarin uretilmesinde kullanilir.
$https = [bool]$Sertifika -or $HttpsZorla
$scheme = if ($https) { "https" } else { "http" }
$publicHost = if ($HostAdi) { $HostAdi } else { $env:COMPUTERNAME }
$publicPort = if ($https) { $HttpsPort } else { $HttpPort }

$baseUrl = "${scheme}://${publicHost}"
if (($https -and $HttpsPort -ne 443) -or ((-not $https) -and $HttpPort -ne 80)) {
    $baseUrl = "${scheme}://${publicHost}:${publicPort}"
}

Set-EnvValue $envPath "SECK_BASE_URL" $baseUrl
Write-Ok "SECK_BASE_URL = $baseUrl"

# Guvenli cookie yalnizca HTTPS ile calisir; HTTP'de true olursa yonetim
# paneline giris yapilamaz.
Set-EnvValue $envPath "SECK_SECURE_COOKIE" $(if ($https) { "true" } else { "false" })
Write-Ok "SECK_SECURE_COOKIE = $(if ($https) { 'true' } else { 'false' })"

if ($Mod -eq "vekil") {
    Set-EnvValue $envPath "PORT" "$NodePort"
    if ($YalnizIIS) {
        Set-EnvValue $envPath "HOSTNAME" "127.0.0.1"
        Write-Ok "Portal yalnizca 127.0.0.1 dinleyecek (IIS atlatilamaz)."
    }
}

# ————————————————————————————— Veritabani —————————————————————————————

Write-Step "Veritabani"

if (Test-Path -LiteralPath (Join-Path $dataDir "portal.db")) {
    Write-Ok "Veritabani zaten var, korunuyor."
} else {
    Push-Location -LiteralPath $paket
    try {
        & node "komutlar\seed.cjs"
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Veritabani kurulumu basarisiz (cikis kodu $LASTEXITCODE)."
            exit 1
        }
    } finally {
        Pop-Location
    }
    Write-Warn2 "Yukaridaki kutudaki kullanici adi ve SIFREYI kaydedin."
    Write-Info "Sifre tek yonlu saklanir; sonradan goruntulenemez."
}

# ————————————————————————————— Site klasoru ve web.config —————————————————————————————

Write-Step "Site klasoru ve web.config"

# IIS sitesi paketin kokunu DEGIL, yalnizca web.config iceren ayri bir
# klasoru gosterir. Boylece .env veya data\ altindaki dosyalarin yanlis bir
# yapilandirmada statik dosya olarak sunulmasi mumkun olmaz.
if (-not (Test-Path -LiteralPath $siteDir)) {
    New-Item -ItemType Directory -Path $siteDir | Out-Null
}

$sablon = Join-Path $PSScriptRoot $(if ($Mod -eq "vekil") { "web.config.vekil" } else { "web.config.iis" })
if (-not (Test-Path -LiteralPath $sablon)) {
    Write-Fail "Sablon bulunamadi: $sablon"
    exit 1
}

$config = Get-Content -LiteralPath $sablon -Raw

if ($Mod -eq "vekil") {
    $config = $config.Replace("http://127.0.0.1:3000/", "http://127.0.0.1:$NodePort/")

    if ($HttpsZorla) {
        $config = $config.Replace(
            'name="SEC-K HTTPS yonlendirme" enabled="false"',
            'name="SEC-K HTTPS yonlendirme" enabled="true"')
    }

    # Izin verilmeyen bir sunucu degiskenine yazmak IIS'te 500.19 hatasi
    # uretir; izin alinamadiysa blogu aciklamasiyla birlikte cikariyoruz.
    if (-not $script:xffIzinli) {
        $config = $config -replace '(?s)\s*<!--\s*Gercek istemci adresini.*?</serverVariables>', ''
    }
} else {
    $config = $config.Replace("C:\Program Files\nodejs\node.exe", $nodeExe)
    $config = $config.Replace("C:\seckportal\baslat.cjs", (Join-Path $paket "baslat.cjs"))
    $config = $config.Replace("C:\seckportal\data", $dataDir)

    $logDir = Join-Path $dataDir "iis-log"
    if (-not (Test-Path -LiteralPath $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
}

$configPath = Join-Path $siteDir "web.config"
# IIS yapilandirma dosyalari BOM'suz UTF-8 olmali.
[IO.File]::WriteAllText($configPath, $config, (New-Object Text.UTF8Encoding($false)))
Write-Ok "web.config yazildi: $configPath"

# ————————————————————————————— Uygulama havuzu —————————————————————————————

Write-Step "Uygulama havuzu"

$poolPath = "IIS:\AppPools\$SiteAdi"
if (-not (Test-Path -LiteralPath $poolPath)) {
    New-WebAppPool -Name $SiteAdi | Out-Null
    Write-Ok "Havuz olusturuldu: $SiteAdi"
} else {
    Write-Ok "Havuz zaten var: $SiteAdi"
}

# .NET calistirmiyoruz; havuz yalnizca istekleri tasiyor.
Set-ItemProperty -Path $poolPath -Name "managedRuntimeVersion" -Value ""
# Portal surekli acik kalmali: bosta kapatma ve gunluk geri donusum kapali.
Set-ItemProperty -Path $poolPath -Name "processModel.idleTimeout" -Value ([TimeSpan]::Zero)
Set-ItemProperty -Path $poolPath -Name "recycling.periodicRestart.time" -Value ([TimeSpan]::Zero)
try { Set-ItemProperty -Path $poolPath -Name "startMode" -Value "AlwaysRunning" } catch { }
Write-Ok "Havuz ayarlandi (yonetilen kod yok, bosta kapatma kapali)."

# ————————————————————————————— Site ve baglantilar —————————————————————————————

Write-Step "Site ve baglantilar"

$hedefBinding = "*:${HttpPort}:$HostAdi"

# Ayni port + host adini kullanan baska bir site varsa ikisi birlikte
# calismaz; kullaniciyi ucu acik bir hataya birakmak yerine uyariyoruz.
foreach ($s in Get-Website) {
    if ($s.Name -eq $SiteAdi) { continue }
    foreach ($b in $s.bindings.Collection) {
        if ($b.protocol -eq "http" -and $b.bindingInformation -eq $hedefBinding) {
            Write-Fail "Port $HttpPort (host: '$HostAdi') zaten '$($s.Name)' sitesinde kullaniliyor."
            Write-Info "Cozum: -HostAdi seck.turkishfuel.com verin (ayni portu host adiyla"
            Write-Info "paylasabilirsiniz) veya -HttpPort 8080 gibi bos bir port secin."
            exit 1
        }
    }
}

$site = Get-Website | Where-Object { $_.Name -eq $SiteAdi }

if (-not $site) {
    if ($HostAdi) {
        New-Website -Name $SiteAdi -PhysicalPath $siteDir -ApplicationPool $SiteAdi `
            -Port $HttpPort -HostHeader $HostAdi | Out-Null
    } else {
        New-Website -Name $SiteAdi -PhysicalPath $siteDir -ApplicationPool $SiteAdi `
            -Port $HttpPort | Out-Null
    }
    Write-Ok "Site olusturuldu: $SiteAdi  ($hedefBinding)"
} else {
    Set-ItemProperty -Path "IIS:\Sites\$SiteAdi" -Name "physicalPath"        -Value $siteDir
    Set-ItemProperty -Path "IIS:\Sites\$SiteAdi" -Name "applicationPool"     -Value $SiteAdi
    Write-Ok "Site zaten var, klasor ve havuz guncellendi."

    $varMi = $false
    foreach ($b in $site.bindings.Collection) {
        if ($b.protocol -eq "http" -and $b.bindingInformation -eq $hedefBinding) { $varMi = $true }
    }
    if (-not $varMi) {
        if ($HostAdi) { New-WebBinding -Name $SiteAdi -Protocol http -Port $HttpPort -HostHeader $HostAdi }
        else          { New-WebBinding -Name $SiteAdi -Protocol http -Port $HttpPort }
        Write-Ok "HTTP baglantisi eklendi: $hedefBinding"
    }
}

# ————————————————————————————— HTTPS —————————————————————————————

if ($Sertifika) {
    Write-Step "HTTPS"

    $Sertifika = ($Sertifika -replace '[^0-9A-Fa-f]', '').ToUpper()
    $cert = Get-ChildItem -Path Cert:\LocalMachine\My |
            Where-Object { $_.Thumbprint -eq $Sertifika }

    if (-not $cert) {
        Write-Warn2 "Sertifika bulunamadi: $Sertifika"
        Write-Info "Yuklu sertifikalari gormek icin:"
        Write-Info "  Get-ChildItem Cert:\LocalMachine\My | Format-List Subject, Thumbprint"
        Write-Info "HTTPS baglantisini IIS Yoneticisi > Baglantilar ekranindan da"
        Write-Info "elle ekleyebilirsiniz (bkz. iis\IIS.md)."
    } else {
        Write-Info "Sertifika: $($cert.Subject)"
        Write-Info "Gecerlilik: $($cert.NotAfter.ToString('yyyy-MM-dd'))"

        $sslVar = $false
        $site2 = Get-Website | Where-Object { $_.Name -eq $SiteAdi }
        foreach ($b in $site2.bindings.Collection) {
            if ($b.protocol -eq "https" -and $b.bindingInformation -eq "*:${HttpsPort}:$HostAdi") { $sslVar = $true }
        }

        if (-not $sslVar) {
            try {
                if ($HostAdi) {
                    # SNI: ayni IP'de birden fazla HTTPS sitesi olabilsin.
                    New-WebBinding -Name $SiteAdi -Protocol https -Port $HttpsPort `
                        -HostHeader $HostAdi -SslFlags 1
                } else {
                    New-WebBinding -Name $SiteAdi -Protocol https -Port $HttpsPort
                }
                Write-Ok "HTTPS baglantisi eklendi (port $HttpsPort)."
            } catch {
                Write-Warn2 "HTTPS baglantisi eklenemedi: $($_.Exception.Message)"
            }
        } else {
            Write-Ok "HTTPS baglantisi zaten var."
        }

        try {
            $binding = Get-WebBinding -Name $SiteAdi -Protocol https |
                       Where-Object { $_.bindingInformation -eq "*:${HttpsPort}:$HostAdi" }
            if ($binding) {
                $binding.AddSslCertificate($cert.Thumbprint, "My")
                Write-Ok "Sertifika baglantiya atandi."
            } else {
                Write-Warn2 "HTTPS baglantisi bulunamadi, sertifika atanamadi."
            }
        } catch {
            Write-Warn2 "Sertifika atanamadi: $($_.Exception.Message)"
            Write-Info "IIS Yoneticisi > $SiteAdi > Baglantilar > https satiri > Duzenle"
            Write-Info "ekranindan sertifikayi listeden secmeniz yeterli."
        }
    }
} elseif ($HttpsZorla) {
    Write-Warn2 "-HttpsZorla verildi ama -Sertifika verilmedi."
    Write-Info "HTTPS baglantisini elle eklediyseniz sorun yok; eklemediyseniz"
    Write-Info "site HTTP uzerinden acilmayacak. Bkz. iis\IIS.md"
}

# ————————————————————————————— Izinler —————————————————————————————

Write-Step "Klasor izinleri"

$poolUser = "IIS AppPool\$SiteAdi"

# (OI)(CI) devralinabilir izin verir; alt dosyalara Windows kendisi yayar.
# Paket klasorunde on binlerce dosya oldugu icin /T ile tek tek dolasmiyoruz.
& icacls "$siteDir" /grant "${poolUser}:(OI)(CI)(RX)" /C /Q | Out-Null
Write-Ok "Site klasorune okuma izni verildi."

if ($Mod -eq "iis") {
    # Bu modda Node surecini havuz kimligi calistirir: programa okuma,
    # veri klasorune yazma izni gerekir.
    & icacls "$paket"   /grant "${poolUser}:(OI)(CI)(RX)" /C /Q | Out-Null
    & icacls "$dataDir" /grant "${poolUser}:(OI)(CI)(M)"  /T /C /Q | Out-Null
    Write-Ok "Pakete okuma, data\ klasorune yazma izni verildi."
}

# ————————————————————————————— Surec yonetimi —————————————————————————————

Write-Step "Portal sureci"

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($Mod -eq "iis") {
    # Iki surecin ayni veritabanina yazmasini onlemek icin gorevi kaldiriyoruz.
    if ($task) {
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Ok "Zamanlanmis gorev kaldirildi; sureci artik IIS yonetiyor."
    } else {
        Write-Ok "Sureci IIS baslatacak; zamanlanmis gorev gerekmiyor."
    }

    $ruleName = "SEC-K Portali (HTTP $NodePort)"
    $rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($rule) {
        Remove-NetFirewallRule -DisplayName $ruleName
        Write-Ok "Port $NodePort guvenlik duvarindan kapatildi (artik gereksiz)."
    }
} else {
    if ($YalnizIIS) {
        $ruleName = "SEC-K Portali (HTTP $NodePort)"
        $rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        if ($rule) {
            Remove-NetFirewallRule -DisplayName $ruleName
            Write-Ok "Port $NodePort guvenlik duvarindan kapatildi."
        }
    }

    if ($task) {
        # .env degisiklikleri (SECK_BASE_URL, HOSTNAME) ancak surec yeniden
        # baslayinca gecerli olur.
        Stop-ScheduledTask  -TaskName $TaskName -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Write-Ok "Portal sureci yeniden baslatildi (.env degisiklikleri icin)."
        Start-Sleep -Seconds 6
    } else {
        Write-Warn2 "'$TaskName' gorevi yok; portal sureci calismiyor olabilir."
        Write-Info "Paket kokunde once sunu calistirin:  .\kur.ps1"
    }

    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$NodePort/" -UseBasicParsing -TimeoutSec 20
        Write-Ok "Portal 127.0.0.1:$NodePort adresinde yanit veriyor (HTTP $($r.StatusCode))."
    } catch {
        Write-Fail "Portal 127.0.0.1:$NodePort adresinde yanit vermiyor."
        Write-Info "IIS bu adrese vekil olacagi icin once portalin ayakta olmasi gerekir."
        Write-Info "Elle denemek icin paket kokunde:  node baslat.cjs"
    }
}

# ————————————————————————————— Guvenlik duvari ve baslatma —————————————————————————————

Write-Step "Guvenlik duvari ve site baslatma"

foreach ($p in @($HttpPort) + $(if ($Sertifika) { @($HttpsPort) } else { @() })) {
    $rn = "SEC-K Portali (IIS $p)"
    if (-not (Get-NetFirewallRule -DisplayName $rn -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $rn -Direction Inbound -Action Allow `
            -Protocol TCP -LocalPort $p -Profile Domain, Private | Out-Null
        Write-Ok "Port $p ic aga acildi (genel aglara kapali)."
    } else {
        Write-Ok "Port $p icin kural zaten var."
    }
}

try {
    Start-WebAppPool -Name $SiteAdi -ErrorAction SilentlyContinue
    Start-Website -Name $SiteAdi
    Write-Ok "Site baslatildi."
} catch {
    Write-Warn2 "Site baslatilamadi: $($_.Exception.Message)"
}

# ————————————————————————————— Dogrulama —————————————————————————————

Write-Step "Dogrulama"

$testUrl = if ($HostAdi) { "http://${HostAdi}:$HttpPort/" } else { "http://localhost:$HttpPort/" }

try {
    $r = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -TimeoutSec 60 -MaximumRedirection 0
    Write-Ok "$testUrl  ->  HTTP $($r.StatusCode)"
} catch {
    $status = $null
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }

    if ($status -eq 302 -or $status -eq 301) {
        Write-Ok "$testUrl  ->  HTTPS'e yonlendiriyor (HTTP $status). Beklenen davranis."
    } else {
        Write-Warn2 "$testUrl yanit vermedi: $($_.Exception.Message)"
        if ($HostAdi) {
            Write-Info "Host adi DNS'te tanimli olmayabilir. Sunucudan denemek icin"
            Write-Info "hosts dosyasina gecici satir ekleyebilirsiniz:"
            Write-Info "  127.0.0.1  $HostAdi"
        }
        Write-Info "IIS gunlukleri: %SystemDrive%\inetpub\logs\LogFiles"
        if ($Mod -eq "iis") { Write-Info "Node cikisi: $dataDir\iis-log\" }
    }
}

# ————————————————————————————— Bitti —————————————————————————————

Write-Host ""
Write-Host "  +----------------------------------------------------------+" -ForegroundColor Green
Write-Host "  |  IIS YAYINI HAZIR                                        |" -ForegroundColor Green
Write-Host "  +----------------------------------------------------------+" -ForegroundColor Green
Write-Host ""
Write-Info "Adres        : $baseUrl"
Write-Info "Site         : $SiteAdi"
Write-Info "Site klasoru : $siteDir"
Write-Info "Mod          : $Mod"
Write-Info ""

if ($Mod -eq "iis") {
    Write-Info "Yonetim:"
    Write-Info "  Durdur : Stop-Website  -Name '$SiteAdi'"
    Write-Info "  Baslat : Start-Website -Name '$SiteAdi'"
    Write-Info "  Yeniden: Restart-WebAppPool -Name '$SiteAdi'"
} else {
    Write-Info "Yonetim:"
    Write-Info "  Portal   : Stop-ScheduledTask / Start-ScheduledTask -TaskName '$TaskName'"
    Write-Info "  IIS on yuz: Stop-Website / Start-Website -Name '$SiteAdi'"
}

Write-Info ""
Write-Info "Sifre sifirlama : node komutlar\sifre.cjs"
Write-Info "Ayrintili bilgi : iis\IIS.md"
Write-Host ""
