# SEC-K Portali - IIS uzerinden HTTP/HTTPS yayini
#
# Portal bir Node.js uygulamasidir; IIS on kapi olur: 80/443 portlarini
# dinler, sertifikayi sunar, istekleri portala iletir.
#
# NOT: Bu script bir kolaylik; zorunlu degil. Sunucuda komut satiri yetkiniz
# yoksa kurulum yalnizca dosya kopyalamak ve IIS Yoneticisi'ni kullanmakla
# tamamlanabilir - bkz. KURULUM.md ve iis\IIS.md.
#
# Uc mod var, script kurulu eklentilere gore kendisi secer:
#
#   ancm   (tercih edilen)  Sureci IIS baslatir ve yonetir. Site dogrudan bu
#                           paket klasorunu gosterir. Gerekli modul zaten
#                           kurulu: AspNetCoreModuleV2 (ASP.NET Core Hosting
#                           Bundle ile gelir). Ek kurulum gerektirmez.
#
#   iis                     Ayni is, ama HttpPlatformHandler 1.2 ile.
#                           O modul kuruluysa kullanilir.
#
#   vekil                   IIS ters vekil olur; Node surecini "SEC-K Portali"
#                           zamanlanmis gorevi calistirir (once .\kur.ps1).
#                           Gerekli: URL Rewrite 2.1 + ARR 3.0
#
# Kullanim (yonetici olarak acilmis PowerShell):
#   powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1
#   powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1 -HostAdi seck.turkishfuel.com
#   powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1 -HostAdi seck.turkishfuel.com -Sertifika A1B2C3... -HttpsZorla
#
# Once tani almak icin:  .\iis\iis-kontrol.ps1
# Ayrinti:               iis\IIS.md

[CmdletBinding()]
param(
    [ValidateSet("otomatik", "ancm", "iis", "vekil")]
    [string]$Mod = "otomatik",

    # Bos birakilirsa: bu paket klasorunu gosteren mevcut IIS sitesi bulunur
    # ve o kullanilir. Boylece IIS Yoneticisi'nde elle olusturulmus bir site
    # (ornegin TFS_SECKA) oldugu gibi devam eder.
    [string]$SiteAdi,

    # Bos birakilirsa sitenin kendi uygulama havuzu kullanilir.
    [string]$Havuz,

    # Anketlerin QR kodlarina gomulecek dis adres. Bos birakilirsa host adi
    # ve porttan uretilir. Ornek: -BaseUrl "http://10.34.32.55:9092"
    [string]$BaseUrl,

    [string]$HostAdi,
    [int]$HttpPort = 80,
    [int]$HttpsPort = 443,

    # Sertifikanin parmak izi. Bulmak icin:
    #   Get-ChildItem Cert:\LocalMachine\My | Format-List Subject, Thumbprint
    [string]$Sertifika,

    # HTTP ile geleni HTTPS'e yonlendir (yalnizca vekil modunda, URL Rewrite ile).
    [switch]$HttpsZorla,

    # Portalin dinledigi port (yalnizca vekil modunda).
    [int]$NodePort = 3000,

    # Portal yalnizca 127.0.0.1 dinlesin ve NodePort guvenlik duvarindan
    # kapatilsin (yalnizca vekil modunda).
    [switch]$YalnizIIS,

    # Kullanilacak node.exe. Bos birakilirsa once paketteki node\node.exe,
    # yoksa sistemde kurulu Node kullanilir.
    [string]$NodeExe
)

$ErrorActionPreference = "Stop"
$TaskName = "SEC-K Portali"

function Write-Step  ([string]$T) { Write-Host "`n=== $T ===" -ForegroundColor Cyan }
function Write-Ok    ([string]$T) { Write-Host "  [TAMAM] $T" -ForegroundColor Green }
function Write-Info  ([string]$T) { Write-Host "  $T" -ForegroundColor Gray }
function Write-Warn2 ([string]$T) { Write-Host "  [UYARI] $T" -ForegroundColor Yellow }
function Write-Fail  ([string]$T) { Write-Host "  [HATA] $T" -ForegroundColor Red }

# ————————————————————————————— Yol ve yetki —————————————————————————————

$paket   = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $paket "data"
$envPath = Join-Path $paket ".env"
$logDir  = Join-Path $dataDir "iis-log"

Write-Host ""
Write-Info "Paket klasoru : $paket"

if (-not (Test-Path -LiteralPath (Join-Path $paket "baslat.cjs"))) {
    Write-Fail "baslat.cjs bulunamadi: $paket"
    Write-Info "Script'i paketin icindeki iis\ klasorunden calistirin."
    exit 1
}

$kimlik = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not (New-Object Security.Principal.WindowsPrincipal($kimlik)).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Fail "Bu script yonetici yetkisi gerektirir."
    Write-Info "PowerShell'i 'Yonetici olarak calistir' ile acip tekrar deneyin."
    exit 1
}

# ————————————————————————————— appcmd yardimcilari —————————————————————————————

# IIS yonetimini bastan sona appcmd ile yapiyoruz: WebAdministration modulu
# her sunucuda kurulu olmuyor (yalnizca IIS Yonetim Script'leri ozelligiyle
# gelir), appcmd.exe ise IIS ile birlikte her zaman var.
$appcmd = Join-Path $env:windir "system32\inetsrv\appcmd.exe"

if (-not (Test-Path -LiteralPath $appcmd)) {
    Write-Fail "IIS kurulu degil (appcmd.exe bulunamadi)."
    Write-Info "Sunucu Yoneticisi > Rol ve Ozellik Ekle > Web Sunucusu (IIS)"
    exit 1
}

<#
    appcmd cagirir; cikti ve cikis kodunu birlikte dondurur.
    Hata mesajini yutmuyoruz: IIS'in kendi aciklamasi sorunu bulmanin en
    kisa yolu oluyor.
#>
function Invoke-AppCmd {
    $cikti = & $appcmd @args 2>&1
    return [pscustomobject]@{
        Ok     = ($LASTEXITCODE -eq 0)
        Kod    = $LASTEXITCODE
        Metin  = ($cikti | ForEach-Object { "$_" }) -join "`n"
    }
}

function Test-IisNesne ([string]$Tur, [string]$Ad) {
    $r = Invoke-AppCmd "list" $Tur $Ad
    return ($r.Ok -and $r.Metin -match [regex]::Escape($Ad))
}

<#
    Bu paket klasorunu gosteren IIS sitesini bulur.

    Kullanici siteyi IIS Yoneticisi'nden kendi adiyla olusturmus olabilir
    (ornegin TFS_SECKA). Ad tahmin etmek yerine fiziksel yola bakiyoruz:
    boylece var olan site, baglantilari ve havuzuyla oldugu gibi kullanilir.
#>
function Find-SiteByPath ([string]$Yol) {
    $r = Invoke-AppCmd "list" "vdirs"
    if (-not $r.Ok) { return $null }

    foreach ($satir in ($r.Metin -split "`n")) {
        # Ornek satir: VDIR "TFS_SECKA/" (physicalPath:E:\TSF_DATA\TFS_SECKA)
        if ($satir -match 'VDIR\s+"([^"]+)"\s+\(physicalPath:(.*)\)\s*$') {
            $vdir = $matches[1]
            $fizik = $matches[2].Trim()
            if ($fizik.TrimEnd('\') -ieq $Yol.TrimEnd('\')) {
                # "TFS_SECKA/" -> "TFS_SECKA"
                return ($vdir -split "/")[0]
            }
        }
    }
    return $null
}

function Get-SitePool ([string]$Site) {
    $r = Invoke-AppCmd "list" "app" "$Site/" "/text:applicationPool"
    if ($r.Ok -and $r.Metin.Trim()) { return $r.Metin.Trim() }
    return $null
}

# ————————————————————————————— Node.js —————————————————————————————

Write-Step "Node.js"

<#
    Kullanilacak node.exe'yi sirayla ariyoruz:

      1. -NodeExe ile verilen yol
      2. PAKETTEKI node\node.exe  (varsayilan)
      3. sistemde kurulu node

    Paketle node.exe gelmesinin nedeni: sunucuya Node.js kurmak zorunda
    kalmamak. MSI kurulumu eski bir surumu kaldirmaya calisip orijinal msi
    paketini isteyebiliyor, ayrica ayni sunucudaki diger uygulamalar eski
    surume bagli olabiliyor. Paketteki node.exe ile sistemdekine hic
    dokunmuyoruz.
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
$nodeSurum = $null

if ($NodeExe) {
    $nodeSurum = Test-NodeExe $NodeExe
    if (-not $nodeSurum) {
        Write-Fail "-NodeExe ile verilen dosya kullanilamadi: $NodeExe"
        Write-Info "Dosya var mi ve surumu 20 ya da 22 mi? Kontrol: & `"$NodeExe`" -v"
        exit 1
    }
    $nodeExe = $NodeExe
    Write-Ok "Node.js $nodeSurum  (elle verildi: $nodeExe)"
} else {
    $paketNode = Join-Path $paket "node\node.exe"
    $nodeSurum = Test-NodeExe $paketNode

    if ($nodeSurum) {
        $nodeExe = $paketNode
        Write-Ok "Node.js $nodeSurum  (paketle geldi: node\node.exe)"
        Write-Info "Sistemdeki Node surumune dokunulmuyor."
    } else {
        $sistem = $null
        try { $sistem = (Get-Command node -ErrorAction Stop).Source } catch { }
        $nodeSurum = Test-NodeExe $sistem

        if ($nodeSurum) {
            $nodeExe = $sistem
            Write-Ok "Node.js $nodeSurum  (sistemde kurulu: $nodeExe)"
        } else {
            Write-Fail "Kullanilabilir Node.js bulunamadi."
            Write-Info ""
            Write-Info "Pakette node\node.exe olmali. Arsivi eksiksiz actiginizdan"
            Write-Info "emin olun; dosya 70 MB civarindadir."
            if ($sistem) {
                $sv = $null
                try { $sv = (& $sistem -v 2>$null) } catch { }
                Write-Info "Sistemdeki surum: $sv (bu paket 20 veya 22 ister)"
            }
            Write-Info ""
            Write-Info "Alternatif: -NodeExe `"C:\yol\node.exe`" ile elle gosterin."
            exit 1
        }
    }
}

# ————————————————————————————— Eklentiler ve mod secimi —————————————————————————————

Write-Step "IIS eklentileri"

$modSonuc = Invoke-AppCmd "list" "modules"
if (-not $modSonuc.Ok) {
    Write-Fail "IIS modul listesi okunamadi."
    Write-Info $modSonuc.Metin
    Write-Info "Bu pencere yonetici olarak acilmis olmali."
    exit 1
}

$modMetin = $modSonuc.Metin
$ancmVar = $modMetin -match "AspNetCoreModuleV2"
$hpVar   = $modMetin -match "httpPlatformHandler"
$rwVar   = $modMetin -match "RewriteModule"
$arrVar  = $modMetin -match "ApplicationRequestRouting|RequestRouter"

if ($ancmVar) { Write-Ok "AspNetCoreModuleV2 kurulu" }  else { Write-Info "AspNetCoreModuleV2 yok" }
if ($hpVar)   { Write-Ok "HttpPlatformHandler kurulu" }  else { Write-Info "HttpPlatformHandler yok" }
if ($rwVar)   { Write-Ok "URL Rewrite kurulu" }          else { Write-Info "URL Rewrite yok" }
if ($arrVar)  { Write-Ok "ARR kurulu" }                  else { Write-Info "ARR yok" }

if ($Mod -eq "otomatik") {
    # ANCM once: cogu Windows sunucusunda zaten kurulu oldugu icin hicbir
    # indirme gerektirmiyor. Ters vekil en sona kaliyor; o mod sureci IIS
    # yerine zamanlanmis gorevle calistirdigi icin daha fazla yetki ister.
    if ($ancmVar) { $Mod = "ancm" }
    elseif ($hpVar) { $Mod = "iis" }
    elseif ($rwVar -and $arrVar) { $Mod = "vekil" }
    else {
        Write-Host ""
        Write-Fail "IIS bir Node.js uygulamasini kopru modul olmadan yayinlayamaz."
        Write-Info ""
        Write-Info "Bu sunucuda uc modulden hicbiri yok. Kurulabilecekler:"
        Write-Info "  ASP.NET Core Hosting Bundle (AspNetCoreModuleV2 gelir)"
        Write-Info "  HttpPlatformHandler 1.2"
        Write-Info "  URL Rewrite + ARR (ters vekil)"
        Write-Info ""
        Write-Info "Sunucuda internet yoksa MSI dosyalarini baska bir bilgisayarda"
        Write-Info "indirip kopyalayin; kurulumun kendisi internet gerektirmez."
        Write-Info ""
        Write-Info "Kurduktan sonra bu script'i tekrar calistirin."
        exit 1
    }
    Write-Ok "Secilen mod: $Mod"
} else {
    if ($Mod -eq "ancm" -and -not $ancmVar) {
        Write-Fail "-Mod ancm icin AspNetCoreModuleV2 gerekir; kurulu degil."
        Write-Info "ASP.NET Core Hosting Bundle ile gelir."
        exit 1
    }
    if ($Mod -eq "iis" -and -not $hpVar) {
        Write-Fail "-Mod iis icin HttpPlatformHandler gerekir; kurulu degil."
        Write-Info "https://www.iis.net/downloads/microsoft/httpplatformhandler"
        exit 1
    }
    if ($Mod -eq "vekil" -and -not ($rwVar -and $arrVar)) {
        Write-Fail "-Mod vekil icin URL Rewrite ve ARR gerekir; eksik."
        exit 1
    }
    Write-Ok "Mod: $Mod"
}

# Bu iki modda IIS sureci kendisi baslatir ve site paket klasorunu gosterir;
# aralarindaki tek fark hangi web.config sablonunun kullanildigi.
$dogrudan = ($Mod -eq "ancm" -or $Mod -eq "iis")

# ————————————————————————————— Site ve havuz tespiti —————————————————————————————

Write-Step "IIS sitesi"

$mevcutSite = $null
if (-not $SiteAdi) {
    # Ters vekilde site paketin kokunu degil iis-site\ klasorunu gosterir.
    $aranan = if ($Mod -eq "vekil") { Join-Path $paket "iis-site" } else { $paket }
    $mevcutSite = Find-SiteByPath $aranan
    if (-not $mevcutSite -and $Mod -eq "vekil") { $mevcutSite = Find-SiteByPath $paket }

    if ($mevcutSite) {
        $SiteAdi = $mevcutSite
        Write-Ok "Bu klasoru gosteren site bulundu: $SiteAdi"
    } else {
        $SiteAdi = "SEC-K Portali"
        Write-Info "Bu klasoru gosteren site yok; '$SiteAdi' adiyla olusturulacak."
    }
} else {
    if (Test-IisNesne "site" $SiteAdi) {
        $mevcutSite = $SiteAdi
        Write-Ok "Site: $SiteAdi (mevcut)"
    } else {
        Write-Info "Site: $SiteAdi (olusturulacak)"
    }
}

if (-not $Havuz) {
    if ($mevcutSite) {
        $Havuz = Get-SitePool $mevcutSite
        if ($Havuz) { Write-Ok "Sitenin uygulama havuzu: $Havuz" }
    }
    if (-not $Havuz) { $Havuz = $SiteAdi }
}
Write-Info "Uygulama havuzu: $Havuz"

# Mevcut sitenin baglantilarini ogren: bunlara dokunmayacagiz, yalnizca
# hicbir HTTP baglantisi yoksa ekleyecegiz.
$mevcutBaglantilar = ""
if ($mevcutSite) {
    $mevcutBaglantilar = (Invoke-AppCmd "list" "site" $mevcutSite "/text:bindings").Metin.Trim()
    if ($mevcutBaglantilar) {
        Write-Info "Mevcut baglantilar: $mevcutBaglantilar"

        # Dis adresi mevcut baglantidan cikar: kullanici -HostAdi/-HttpPort
        # vermediyse QR kodlarina dogru adres gitsin.
        if (-not $BaseUrl -and $mevcutBaglantilar -match 'http/([^:]*):(\d+):([^,]*)') {
            $bIp = $matches[1]; $bPort = $matches[2]; $bHost = $matches[3]
            $adresHost = if ($bHost) { $bHost } elseif ($bIp -and $bIp -ne "*") { $bIp } else { $env:COMPUTERNAME }
            $BaseUrl = if ($bPort -eq "80") { "http://$adresHost" } else { "http://${adresHost}:$bPort" }
            Write-Info "Dis adres baglantidan cikarildi: $BaseUrl"
        }
    }
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

$https = [bool]$Sertifika -or $HttpsZorla

if ($BaseUrl) {
    # Kullanici verdi ya da mevcut IIS baglantisindan cikarildi.
    $baseUrl = $BaseUrl.TrimEnd("/")
} else {
    $scheme = if ($https) { "https" } else { "http" }
    $publicHost = if ($HostAdi) { $HostAdi } else { $env:COMPUTERNAME }
    $publicPort = if ($https) { $HttpsPort } else { $HttpPort }

    $baseUrl = "${scheme}://${publicHost}"
    if (($https -and $HttpsPort -ne 443) -or ((-not $https) -and $HttpPort -ne 80)) {
        $baseUrl = "${scheme}://${publicHost}:${publicPort}"
    }
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
        Write-Ok "Portal yalnizca 127.0.0.1 dinleyecek."
    }
} else {
    # Bu modda portu IIS secer (HTTP_PLATFORM_PORT); .env'deki PORT kullanilmaz.
    Write-Info "Portu IIS secer; .env icindeki PORT bu modda kullanilmaz."
}

# ————————————————————————————— Veritabani —————————————————————————————

Write-Step "Veritabani"

if (Test-Path -LiteralPath (Join-Path $dataDir "portal.db")) {
    Write-Ok "Veritabani zaten var, korunuyor."
} else {
    Push-Location -LiteralPath $paket
    try {
        & $nodeExe "komutlar\seed.cjs"
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Veritabani kurulumu basarisiz (cikis kodu $LASTEXITCODE)."
            exit 1
        }
    } finally {
        Pop-Location
    }
    Write-Warn2 "Varsayilan sifre atandi. ILK GIRISTEN SONRA degistirin:"
    Write-Info "Ayarlar > Sifre Degistir. Degistirilene kadar panelde uyari gorunur."
}

if (-not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

# ————————————————————————————— Site klasoru ve web.config —————————————————————————————

Write-Step "Site klasoru ve web.config"

if ($dogrudan) {
    # Site dogrudan paket klasorunu gosterir; kokteki web.config hangi modulu
    # kullanacagini soyler. Secilen moda gore dogru sablonu yaziyoruz.
    $siteDir = $paket
    $kokConfig = Join-Path $paket "web.config"
    $sablonAdi = if ($Mod -eq "ancm") { "web.config.ancm" } else { "web.config.iis" }
    $sablon = Join-Path $PSScriptRoot $sablonAdi

    if (-not (Test-Path -LiteralPath $sablon)) {
        Write-Fail "Sablon bulunamadi: $sablon"
        Write-Info "Arsivi yeniden acin."
        exit 1
    }

    # Mevcut surumu bir kez yedekle; geri donmek gerekebilir.
    if ((Test-Path -LiteralPath $kokConfig) -and
        -not (Test-Path -LiteralPath (Join-Path $paket "web.config.kurulum-oncesi"))) {
        Copy-Item -LiteralPath $kokConfig -Destination (Join-Path $paket "web.config.kurulum-oncesi") -Force
    }

    $icerik = Get-Content -LiteralPath $sablon -Raw

    # processPath'i gercek node.exe yoluna cek. ANCM sablonunda goreceli yol
    # (.\node\node.exe) duruyor: paketle gelen node.exe kullaniliyorsa oldugu
    # gibi kaliyor, baska bir Node secildiyse tam yolla degistiriliyor.
    $paketNode = Join-Path $paket "node\node.exe"
    if ($Mod -eq "ancm") {
        if ($nodeExe -ne $paketNode) {
            $icerik = $icerik.Replace('processPath=".\node\node.exe"', "processPath=`"$nodeExe`"")
            Write-Ok "processPath ayarlandi: $nodeExe"
        } else {
            Write-Ok "processPath goreceli kaldi: .\node\node.exe"
        }
    } else {
        $icerik = $icerik.Replace('processPath="C:\seckportal\node\node.exe"', "processPath=`"$nodeExe`"")
        Write-Ok "processPath ayarlandi: $nodeExe"
    }

    [IO.File]::WriteAllText($kokConfig, $icerik, (New-Object Text.UTF8Encoding($false)))
    Write-Ok "web.config yazildi ($sablonAdi): $kokConfig"
    Write-Info "Site yolu: $siteDir"
} else {
    # Ters vekilde site, yalnizca web.config iceren ayri bir klasoru gosterir.
    $siteDir = Join-Path $paket "iis-site"
    if (-not (Test-Path -LiteralPath $siteDir)) {
        New-Item -ItemType Directory -Path $siteDir | Out-Null
    }

    $sablon = Join-Path $PSScriptRoot "web.config.vekil"
    if (-not (Test-Path -LiteralPath $sablon)) {
        Write-Fail "Sablon bulunamadi: $sablon"
        exit 1
    }

    $config = Get-Content -LiteralPath $sablon -Raw
    $config = $config.Replace("http://127.0.0.1:3000/", "http://127.0.0.1:$NodePort/")

    if ($HttpsZorla) {
        $config = $config.Replace(
            'name="SEC-K HTTPS yonlendirme" enabled="false"',
            'name="SEC-K HTTPS yonlendirme" enabled="true"')
    } else {
        # HSTS: sertifika yokken gonderilirse site erisilemez hale gelebilir.
        $config = $config -replace '(?s)\s*<!--\s*HSTS satiri.*?/>', ''
    }

    # ARR vekil modu sunucu genelinde acik olmali; web.config'ten ayarlanamaz.
    $r = Invoke-AppCmd "set" "config" "-section:system.webServer/proxy" "/enabled:True" "/commit:apphost"
    if ($r.Ok) { Write-Ok "ARR vekil modu acik." }
    else {
        Write-Fail "ARR vekil modu acilamadi."
        Write-Info $r.Metin
        exit 1
    }

    # Gercek istemci adresini portala tasimak icin sunucu degiskeni izni.
    $izinli = (Invoke-AppCmd "list" "config" "-section:system.webServer/rewrite/allowedServerVariables").Metin
    $xffIzinli = $false
    if ($izinli -match "HTTP_X_FORWARDED_FOR") {
        $xffIzinli = $true
    } else {
        $r2 = Invoke-AppCmd "set" "config" "-section:system.webServer/rewrite/allowedServerVariables" "/+[name='HTTP_X_FORWARDED_FOR']" "/commit:apphost"
        $xffIzinli = $r2.Ok
    }

    if ($xffIzinli) {
        Write-Ok "Istemci adresi (X-Forwarded-For) portala iletilecek."
    } else {
        Write-Warn2 "X-Forwarded-For izni eklenemedi; anket hiz siniri cerezle calisir."
        $config = $config -replace '(?s)\s*<!--\s*Gercek istemci adresini.*?</serverVariables>', ''
    }

    # removeServerHeader yalnizca IIS 10+ da var; eski IIS'te site 500.19 verir.
    $iisMajor = 0
    try { $iisMajor = [int](Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\InetStp" -ErrorAction Stop).MajorVersion } catch { }
    if ($iisMajor -lt 10) {
        $config = $config.Replace(' removeServerHeader="true"', '')
        Write-Info "IIS ${iisMajor}: 'Server' basligi kaldirma ozelligi atlandi."
    }

    $configPath = Join-Path $siteDir "web.config"
    [IO.File]::WriteAllText($configPath, $config, (New-Object Text.UTF8Encoding($false)))
    Write-Ok "web.config yazildi: $configPath"
}

# ————————————————————————————— Uygulama havuzu —————————————————————————————

Write-Step "Uygulama havuzu"

if (-not (Test-IisNesne "apppool" $Havuz)) {
    $r = Invoke-AppCmd "add" "apppool" "/name:$Havuz"
    if (-not $r.Ok) {
        Write-Fail "Uygulama havuzu olusturulamadi."
        Write-Info $r.Metin
        exit 1
    }
    Write-Ok "Havuz olusturuldu: $Havuz"
} else {
    Write-Ok "Havuz zaten var: $Havuz"
}

# .NET calistirmiyoruz; 32 bit mod %ProgramFiles% degiskenini yanlis klasore
# cozer; portal surekli acik kalmali.
$ayarlar = @(
    "/managedRuntimeVersion:",
    "/enable32BitAppOnWin64:false",
    "/processModel.idleTimeout:00:00:00",
    "/recycling.periodicRestart.time:00:00:00"
)
foreach ($a in $ayarlar) {
    $r = Invoke-AppCmd "set" "apppool" $Havuz $a
    if (-not $r.Ok) { Write-Warn2 "Havuz ayari uygulanamadi: $a" }
}
# startMode yalnizca IIS 8+ da var; basarisiz olursa onemli degil.
Invoke-AppCmd "set" "apppool" $Havuz "/startMode:AlwaysRunning" | Out-Null
Write-Ok "Havuz ayarlandi (yonetilen kod yok, 64 bit, bosta kapatma kapali)."

# ————————————————————————————— Site ve baglantilar —————————————————————————————

Write-Step "Site ve baglantilar"

$bindingInfo = "*:${HttpPort}:$HostAdi"

if ($mevcutSite) {
    # Var olan siteye dokunmuyoruz: baglantilari (ornegin 10.34.32.55:9092)
    # yoneticinin kurdugu gibi kalsin. Yalnizca klasoru ve havuzu bagliyoruz.
    Write-Ok "Mevcut site kullaniliyor: $SiteAdi"
    Invoke-AppCmd "set" "vdir" "$SiteAdi/" "/physicalPath:$siteDir" | Out-Null
    Invoke-AppCmd "set" "app"  "$SiteAdi/" "/applicationPool:$Havuz" | Out-Null
    Write-Info "Klasor ve havuz baglandi; baglantilar degistirilmedi."

    if (-not $mevcutBaglantilar) {
        $r = Invoke-AppCmd "set" "site" $SiteAdi "/+bindings.[protocol='http',bindingInformation='$bindingInfo']"
        if ($r.Ok) { Write-Ok "Site baglantisiz oldugu icin eklendi: $bindingInfo" }
    }
} else {
    # Ayni port + host adini kullanan baska bir site varsa ikisi birlikte
    # calismaz; ucu acik bir hataya birakmak yerine simdi soyluyoruz.
    $tumSiteler = (Invoke-AppCmd "list" "sites").Metin
    foreach ($satir in ($tumSiteler -split "`n")) {
        if ($satir -match [regex]::Escape($bindingInfo) -and $satir -notmatch [regex]::Escape($SiteAdi)) {
            Write-Fail "Su baglanti baska bir sitede kullaniliyor: $bindingInfo"
            Write-Info $satir.Trim()
            Write-Info "Cozum: -HostAdi seck.turkishfuel.com verin (ayni portu host adiyla"
            Write-Info "paylasabilirsiniz) veya -HttpPort 9092 gibi bos bir port secin."
            exit 1
        }
    }

    $httpBinding = "http/*:${HttpPort}:$HostAdi"
    $r = Invoke-AppCmd "add" "site" "/name:$SiteAdi" "/physicalPath:$siteDir" "/bindings:$httpBinding"
    if (-not $r.Ok) {
        Write-Fail "Site olusturulamadi."
        Write-Info $r.Metin
        exit 1
    }
    Write-Ok "Site olusturuldu: $SiteAdi  ($bindingInfo)"

    $r = Invoke-AppCmd "set" "app" "$SiteAdi/" "/applicationPool:$Havuz"
    if (-not $r.Ok) { Write-Warn2 "Site havuza baglanamadi; IIS Yoneticisi'nden secin." }
}

# ————————————————————————————— HTTPS —————————————————————————————

if ($Sertifika) {
    Write-Step "HTTPS"

    $parmak = ($Sertifika -replace '[^0-9A-Fa-f]', '').ToUpper()
    $cert = Get-ChildItem -Path Cert:\LocalMachine\My -ErrorAction SilentlyContinue |
            Where-Object { $_.Thumbprint -eq $parmak }

    if (-not $cert) {
        Write-Warn2 "Sertifika bulunamadi: $parmak"
        Write-Info "Yuklu sertifikalar:"
        Write-Info "  Get-ChildItem Cert:\LocalMachine\My | Format-List Subject, Thumbprint"
        Write-Info "HTTPS baglantisini IIS Yoneticisi > Baglamalar ekranindan elle"
        Write-Info "ekleyebilirsiniz (bkz. iis\IIS.md)."
    } else {
        Write-Info "Sertifika : $($cert.Subject)"
        Write-Info "Gecerlilik: $($cert.NotAfter.ToString('yyyy-MM-dd'))"

        $sslInfo = "*:${HttpsPort}:$HostAdi"
        $sniBayrak = if ($HostAdi) { "1" } else { "0" }

        $mevcut = (Invoke-AppCmd "list" "site" $SiteAdi).Metin
        if ($mevcut -notmatch [regex]::Escape("https/$sslInfo")) {
            $r = Invoke-AppCmd "set" "site" $SiteAdi "/+bindings.[protocol='https',bindingInformation='$sslInfo',sslFlags='$sniBayrak']"
            if ($r.Ok) { Write-Ok "HTTPS baglantisi eklendi (port $HttpsPort)." }
            else {
                Write-Warn2 "HTTPS baglantisi eklenemedi."
                Write-Info $r.Metin
            }
        } else {
            Write-Ok "HTTPS baglantisi zaten var."
        }

        # Sertifikayi baglantiya ata. netsh her IIS surumunde ayni sekilde
        # calisiyor; WebAdministration modulu gerekmiyor.
        $appId = "{4dc3e181-e14b-4a21-b022-59fc669b0914}"
        if ($HostAdi) {
            $ns = & netsh http add sslcert hostnameport="${HostAdi}:$HttpsPort" certhash=$parmak appid=$appId certstorename=MY 2>&1
        } else {
            $ns = & netsh http add sslcert ipport="0.0.0.0:$HttpsPort" certhash=$parmak appid=$appId certstorename=MY 2>&1
        }

        $nsMetin = ($ns | ForEach-Object { "$_" }) -join " "
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Sertifika baglantiya atandi."
        } elseif ($nsMetin -match "1183|zaten|already|exists") {
            Write-Ok "Sertifika baglantisi zaten tanimli."
        } else {
            Write-Warn2 "Sertifika netsh ile atanamadi."
            Write-Info $nsMetin
            Write-Info "IIS Yoneticisi > $SiteAdi > Baglamalar > https > Duzenle"
            Write-Info "ekranindan sertifikayi listeden secmeniz yeterli."
        }
    }
} elseif ($HttpsZorla) {
    Write-Warn2 "-HttpsZorla verildi ama -Sertifika verilmedi."
    Write-Info "HTTPS baglantisini elle eklediyseniz sorun yok; eklemediyseniz"
    Write-Info "site HTTP uzerinden acilmayacak."
}

# ————————————————————————————— Izinler —————————————————————————————

Write-Step "Klasor izinleri"

$SID_SYSTEM = "*S-1-5-18"
$SID_ADMINS = "*S-1-5-32-544"
$SID_IISUSR = "*S-1-5-32-568"
$poolUser = "IIS AppPool\$Havuz"

<#
    .env oturum imza anahtarini, data\ ise veritabanini ve PDF'leri tutuyor.
    Klasorden izin devraldiklari surece sunucuda oturum acabilen herkes
    anahtari okuyabilir; anahtari bilen kendine yonetici cookie'si uretir.
    Devralmayi kesip yalnizca SYSTEM ve yerel yoneticilere yetki veriyoruz.
    Gruplar SID ile: Turkce Windows'ta "Administrators" -> "Yoneticiler".
#>
foreach ($hedef in @($envPath, $dataDir)) {
    if (-not (Test-Path -LiteralPath $hedef)) { continue }
    $klasorMu = (Get-Item -LiteralPath $hedef) -is [IO.DirectoryInfo]
    $bayrak = if ($klasorMu) { "(OI)(CI)(F)" } else { "(F)" }
    & icacls "$hedef" /inheritance:r /grant "${SID_SYSTEM}:$bayrak" /grant "${SID_ADMINS}:$bayrak" /T /C /Q 2>&1 | Out-Null
}
Write-Ok ".env ve data\ yalnizca SYSTEM ve yoneticilere acik."

if ($dogrudan) {
    # Sureci havuz kimligi calistirir: pakete okuma, data\ ya yazma gerekir.
    # Kilitten SONRA veriliyor ki devralma kesme bu izinleri silmesin.
    # Havuz kimligi cozulemezse IIS_IUSRS grubuna veriyoruz.
    $kimlikVar = $true
    try {
        $null = (New-Object Security.Principal.NTAccount($poolUser)).Translate([Security.Principal.SecurityIdentifier])
    } catch { $kimlikVar = $false }

    $kimler = @()
    if ($kimlikVar) { $kimler += $poolUser } else { Write-Warn2 "'$poolUser' kimligi cozulemedi; IIS_IUSRS kullanilacak." }
    $kimler += $SID_IISUSR

    foreach ($kim in $kimler) {
        & icacls "$paket"   /grant "${kim}:(OI)(CI)(RX)" /C /Q 2>&1 | Out-Null
        & icacls "$dataDir" /grant "${kim}:(OI)(CI)(M)"  /T /C /Q 2>&1 | Out-Null
        if (Test-Path -LiteralPath $envPath) {
            & icacls "$envPath" /grant "${kim}:(R)" /C /Q 2>&1 | Out-Null
        }
    }
    Write-Ok "Havuz kimligine okuma ve data\ yazma izni verildi."
} else {
    & icacls "$siteDir" /grant "${SID_IISUSR}:(OI)(CI)(RX)" /C /Q 2>&1 | Out-Null
    Write-Ok "Site klasorune okuma izni verildi."
}

# ————————————————————————————— Surec yonetimi —————————————————————————————

Write-Step "Portal sureci"

$gorev = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($dogrudan) {
    # Iki surecin ayni veritabanina yazmasini onlemek icin gorevi kaldiriyoruz.
    if ($gorev) {
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Ok "Zamanlanmis gorev kaldirildi; sureci artik IIS yonetiyor."
    } else {
        Write-Ok "Sureci IIS baslatacak; zamanlanmis gorev gerekmiyor."
    }

    $kural = "SEC-K Portali (HTTP $NodePort)"
    if (Get-NetFirewallRule -DisplayName $kural -ErrorAction SilentlyContinue) {
        Remove-NetFirewallRule -DisplayName $kural -ErrorAction SilentlyContinue
        Write-Ok "Port $NodePort guvenlik duvarindan kapatildi (artik gereksiz)."
    }
} else {
    if ($YalnizIIS) {
        $kural = "SEC-K Portali (HTTP $NodePort)"
        if (Get-NetFirewallRule -DisplayName $kural -ErrorAction SilentlyContinue) {
            Remove-NetFirewallRule -DisplayName $kural -ErrorAction SilentlyContinue
            Write-Ok "Port $NodePort guvenlik duvarindan kapatildi."
        }
    }

    if ($gorev) {
        Stop-ScheduledTask  -TaskName $TaskName -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Write-Ok "Portal sureci yeniden baslatildi (.env degisiklikleri icin)."
        Start-Sleep -Seconds 6
    } else {
        Write-Warn2 "'$TaskName' gorevi yok - portal sureci calismiyor."
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

$portlar = @($HttpPort)
if ($Sertifika) { $portlar += $HttpsPort }

foreach ($p in $portlar) {
    $kn = "SEC-K Portali (IIS $p)"
    if (-not (Get-NetFirewallRule -DisplayName $kn -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $kn -Direction Inbound -Action Allow `
            -Protocol TCP -LocalPort $p -Profile Domain, Private | Out-Null
        Write-Ok "Port $p ic aga acildi (genel aglara kapali)."
    } else {
        Write-Ok "Port $p icin kural zaten var."
    }
}

Invoke-AppCmd "start" "apppool" $Havuz | Out-Null
$r = Invoke-AppCmd "start" "site" $SiteAdi
if ($r.Ok) { Write-Ok "Site baslatildi." } else { Write-Warn2 "Site baslatilamadi: $($r.Metin)" }

# ————————————————————————————— Dogrulama —————————————————————————————

Write-Step "Dogrulama"

$testUrl = if ($HostAdi) { "http://${HostAdi}:$HttpPort/" } else { "http://localhost:$HttpPort/" }

# Ilk istekte IIS sureci baslatir; birkac saniye surebilir.
Start-Sleep -Seconds 3

$basarili = $false
try {
    $r = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 0
    Write-Ok "$testUrl  ->  HTTP $($r.StatusCode)"
    $basarili = $true
} catch {
    $kod = $null
    if ($_.Exception.Response) { $kod = [int]$_.Exception.Response.StatusCode }

    if ($kod -eq 302 -or $kod -eq 301) {
        Write-Ok "$testUrl  ->  HTTPS'e yonlendiriyor (HTTP $kod). Beklenen davranis."
        $basarili = $true
    } elseif ($kod) {
        Write-Fail "$testUrl  ->  HTTP $kod"
        switch ($kod) {
            500 { Write-Info "Yapilandirma hatasi veya portal acilamadi." }
            502 { Write-Info "Portal sureci baslamiyor." }
            403 { Write-Info "Site yolu veya handler yapilandirmasi hatali." }
            404 { Write-Info "Site baska bir klasore bakiyor olabilir." }
        }
        Write-Info ""
        Write-Info "Gercek hatayi gormek icin:"
        if ($dogrudan) { Write-Info "  $logDir  klasorundeki son .log dosyasi" }
        Write-Info "  powershell -ExecutionPolicy Bypass -File .\iis\iis-kontrol.ps1"
    } else {
        Write-Warn2 "$testUrl denenemedi: $($_.Exception.Message)"
        if ($HostAdi) {
            Write-Info "Host adi DNS'te tanimli olmayabilir. Sunucudan denemek icin"
            Write-Info "hosts dosyasina gecici satir ekleyebilirsiniz:"
            Write-Info "  127.0.0.1  $HostAdi"
        }
    }
}

# ————————————————————————————— Bitti —————————————————————————————

Write-Host ""
if ($basarili) {
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Green
    Write-Host "  |  IIS YAYINI HAZIR                                        |" -ForegroundColor Green
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Green
} else {
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Yellow
    Write-Host "  |  KURULUM BITTI - SITE HENUZ YANIT VERMIYOR               |" -ForegroundColor Yellow
    Write-Host "  |  Tani icin: .\iis\iis-kontrol.ps1                        |" -ForegroundColor Yellow
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Yellow
}

Write-Host ""
Write-Info "Adres        : $baseUrl"
Write-Info "Site         : $SiteAdi"
Write-Info "Site klasoru : $siteDir"
Write-Info "Mod          : $Mod"
Write-Info "Giris        : admin / Tfs2026...  (ilk giristen sonra degistirin)"
Write-Info ""

if ($dogrudan) {
    Write-Info "Yonetim:"
    Write-Info "  Durdur  : appcmd stop site `"$SiteAdi`""
    Write-Info "  Baslat  : appcmd start site `"$SiteAdi`""
    Write-Info "  Yeniden : appcmd recycle apppool `"$Havuz`""
    Write-Info "  Gunluk  : $logDir"
} else {
    Write-Info "Yonetim:"
    Write-Info "  Portal    : Stop-ScheduledTask / Start-ScheduledTask -TaskName '$TaskName'"
    Write-Info "  IIS on yuz: appcmd stop site `"$SiteAdi`" / appcmd start site `"$SiteAdi`""
}

Write-Info ""
Write-Info "Tani            : .\iis\iis-kontrol.ps1"
Write-Info "Izin onarimi    : .\iis\iis-izin.ps1"
Write-Info "Sifre sifirlama : node komutlar\sifre.cjs"
Write-Info "Ayrintili bilgi : iis\IIS.md"
Write-Host ""
