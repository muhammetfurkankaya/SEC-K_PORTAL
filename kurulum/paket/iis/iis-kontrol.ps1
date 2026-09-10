# SEC-K Portali - IIS tani script'i
#
# HICBIR SEYI DEGISTIRMEZ. Yalnizca bakar ve neyin eksik oldugunu soyler.
# Portal IIS'te acilmiyorsa once bunu calistirin.
#
# Kullanim:
#   powershell -ExecutionPolicy Bypass -File .\iis\iis-kontrol.ps1
#
# Cikti ayni zamanda iis-tani.txt dosyasina yazilir; sorun cozulmezse o
# dosyayi paylasmak yeterlidir.

[CmdletBinding()]
param(
    [string]$SiteAdi = "SEC-K Portali",
    [string]$Havuz   = "SEC-K Portali"
)

$ErrorActionPreference = "Continue"

$paket    = Split-Path -Parent $PSScriptRoot
$raporYol = Join-Path $paket "iis-tani.txt"
$satirlar = New-Object Collections.Generic.List[string]
$sorunlar = New-Object Collections.Generic.List[string]

function Yaz ([string]$Text, [string]$Renk = "Gray") {
    Write-Host $Text -ForegroundColor $Renk
    $satirlar.Add($Text) | Out-Null
}
function Baslik ([string]$Text) { Yaz ""; Yaz "=== $Text ===" "Cyan" }
function Ok     ([string]$Text) { Yaz "  [+] $Text" "Green" }
function Yok    ([string]$Text) { Yaz "  [-] $Text" "Red" }
function Uyari  ([string]$Text) { Yaz "  [!] $Text" "Yellow" }
function Bilgi  ([string]$Text) { Yaz "      $Text" "Gray" }
function Sorun  ([string]$Text) { $sorunlar.Add($Text) | Out-Null }

Yaz ""
Yaz "SEC-K Portali - IIS tanisi   ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))" "White"
Yaz "Paket klasoru: $paket"

# ————————————————————————————— Yonetici mi —————————————————————————————

$yonetici = $false
try {
    $kimlik = [Security.Principal.WindowsIdentity]::GetCurrent()
    $yonetici = (New-Object Security.Principal.WindowsPrincipal($kimlik)).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
} catch { }

if (-not $yonetici) {
    Uyari "Bu pencere YONETICI olarak acilmamis."
    Bilgi "IIS ayarlari (moduller, siteler, havuzlar) bu durumda okunamaz ve"
    Bilgi "asagidaki sonuclar yaniltici olabilir."
    Sorun "Tanıyı yonetici olarak acilmis bir PowerShell penceresinde tekrar calistirin."
}

# ————————————————————————————— Isletim sistemi —————————————————————————————

Baslik "Sunucu"
try {
    $os = Get-CimInstance Win32_OperatingSystem
    Bilgi "$($os.Caption) ($($os.Version))"
} catch {
    Bilgi "Isletim sistemi bilgisi okunamadi."
}
Bilgi "PowerShell: $($PSVersionTable.PSVersion)"

# ————————————————————————————— Node.js —————————————————————————————

Baslik "Node.js"

<#
    Portal, PAKETTEKI node\node.exe ile calisir; sunucuya Node.js kurmak
    gerekmez. Sistemde kurulu surum yalnizca bilgi olarak yaziliyor.
#>
function Get-NodeSurum ([string]$Yol) {
    if (-not $Yol -or -not (Test-Path -LiteralPath $Yol)) { return $null }
    try { return (& $Yol -v 2>$null) } catch { return $null }
}

$paketNode = Join-Path $paket "node\node.exe"
$paketSurum = Get-NodeSurum $paketNode

$sistemNode = $null
try { $sistemNode = (Get-Command node -ErrorAction Stop).Source } catch { }
$sistemSurum = Get-NodeSurum $sistemNode

$kullanilacak = $null

if ($paketSurum) {
    $ana = [int](($paketSurum -replace '^v','') -split '\.')[0]
    if ($ana -eq 20 -or $ana -eq 22) {
        Ok "Paketteki Node.js $paketSurum  (node\node.exe) - portal bunu kullanir"
        $kullanilacak = $paketNode
    } else {
        Yok "Paketteki node.exe surumu uyumsuz: $paketSurum"
    }
} elseif (Test-Path -LiteralPath $paketNode) {
    # Dosya duruyor ama surum sorulamadi: eksik indirilmis, virus tarayici
    # engellemis veya bloke isaretli (Windows "unblock") olabilir.
    $boyut = [math]::Round((Get-Item -LiteralPath $paketNode).Length / 1MB)
    Yok "Pakette node\node.exe var ama CALISTIRILAMADI ($boyut MB)"
    Bilgi "Beklenen boyut ~70 MB. Kucukse arsiv eksik acilmis demektir."
    Bilgi "Virus tarayici engelliyor olabilir; ayrica dosyayi 'engeli kaldir'"
    Bilgi "ile serbest birakmayi deneyin:"
    Bilgi "  Unblock-File `"$paketNode`""
    Sorun "Paketteki node.exe calistirilamiyor. Arsivi yeniden acin veya Unblock-File deneyin."
} else {
    Yok "Pakette node\node.exe YOK"
    Bilgi "Bu dosya yaklasik 70 MB'dir; arsiv eksik acilmis olabilir."
    Sorun "Pakette node\node.exe yok. Arsivi yeniden ve eksiksiz acin."
}

if ($sistemSurum) {
    Bilgi "Sistemde kurulu Node.js: $sistemSurum  ($sistemNode)"
    $sAna = [int](($sistemSurum -replace '^v','') -split '\.')[0]
    if (-not $kullanilacak) {
        if ($sAna -eq 20 -or $sAna -eq 22) {
            Ok "Sistemdeki surum uygun; portal onu kullanabilir."
            $kullanilacak = $sistemNode
        } else {
            Yok "Sistemdeki surum de uyumsuz (20 veya 22 gerekir)."
        }
    } elseif ($sAna -ne 20 -and $sAna -ne 22) {
        Bilgi "(Uyumsuz ama sorun degil: portal paketteki node.exe ile calisir,"
        Bilgi " sistemdeki surume dokunulmaz.)"
    }
} else {
    Bilgi "Sistemde kurulu Node.js yok - paketteki yeterli."
}

# Calisan web.config'in processPath'i gercekten var olan bir node.exe mi?
#
# Dosyayi metin olarak taramiyoruz: web.config yorumlarinda ornek processPath
# satirlari da bulunuyor ve duz arama once onlari yakaliyor. XML olarak
# okumak yorumlari atliyor.
$kokConfig = Join-Path $paket "web.config"
if (Test-Path -LiteralPath $kokConfig) {
    $cfgYol = $null
    $cfgModul = $null
    try {
        [xml]$cfg = Get-Content -LiteralPath $kokConfig -Raw
        $ws = $cfg.configuration.'system.webServer'
        # Once AspNetCoreModuleV2 (varsayilan), sonra HttpPlatformHandler.
        if ($ws.aspNetCore)   { $cfgYol = $ws.aspNetCore.processPath;   $cfgModul = "AspNetCoreModuleV2" }
        elseif ($ws.httpPlatform) { $cfgYol = $ws.httpPlatform.processPath; $cfgModul = "HttpPlatformHandler" }
    } catch {
        Yok "web.config okunamadi (bozuk XML?): $($_.Exception.Message)"
        Sorun "web.config bozuk. iis\web.config.ancm dosyasini kokteki web.config uzerine kopyalayin."
    }

    if (-not $cfgYol) {
        Bilgi "web.config portali baslatmayan BILGI surumu (yalnizca kurulum.html)."
        Bilgi "Portali acmak icin: iis\web.config.ancm dosyasini kokteki web.config yapin."
    } else {
        Bilgi "web.config modulu     : $cfgModul"
        Bilgi "web.config processPath: $cfgYol"

        # Goreceli yol (.\node\node.exe) paket klasorune gore cozulur.
        $cozulen = [Environment]::ExpandEnvironmentVariables($cfgYol)
        if (-not [IO.Path]::IsPathRooted($cozulen)) {
            $cozulen = Join-Path $paket ($cozulen -replace '^\.\\','')
        }
        if (Test-Path -LiteralPath $cozulen) {
            Ok "processPath gecerli bir dosyayi gosteriyor: $cozulen"
        } else {
            Yok "processPath dosyasi yok: $cozulen"
            Bilgi "Ikinci arsiv (node) acilmamis olabilir."
            Sorun "web.config processPath yolu gecersiz: $cozulen bulunamadi."
        }
    }
}

# ————————————————————————————— IIS —————————————————————————————

Baslik "IIS"

$appcmd = Join-Path $env:windir "system32\inetsrv\appcmd.exe"
$iisVar = Test-Path -LiteralPath $appcmd

if (-not $iisVar) {
    Yok "IIS kurulu degil (appcmd.exe yok)."
    Sorun "IIS kurulu degil. Sunucu Yoneticisi > Rol ve Ozellik Ekle > Web Sunucusu (IIS)."
} else {
    $iisMajor = 0
    try { $iisMajor = [int](Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\InetStp" -ErrorAction Stop).MajorVersion } catch { }
    Ok "IIS kurulu (surum $iisMajor)"

    $wa = $false
    try { Import-Module WebAdministration -ErrorAction Stop; $wa = $true } catch { }
    if ($wa) {
        Ok "WebAdministration modulu var (script'ler tam calisir)."
    } else {
        Uyari "WebAdministration modulu yok; kurulum script'i appcmd ile devam eder."
        Bilgi "Eklemek icin: Web Sunucusu (IIS) > Yonetim Araclari >"
        Bilgi "'IIS Yonetim Script'leri ve Araclari'"
    }
}

# ————————————————————————————— IIS eklentileri —————————————————————————————

Baslik "IIS eklentileri"

$modMetin = ""
$modOkundu = $false
if ($iisVar) {
    $cikti = & $appcmd list modules 2>&1
    $modMetin = ($cikti | ForEach-Object { "$_" }) -join "`n"
    # appcmd yetki yetersizliginde de 0 disi kod dondurup hata metni yaziyor.
    # Bunu "modul kurulu degil" ile karistirmamak onemli: aksi halde kurulu
    # bir eklenti "YOK" gorunur ve yanlis yola sapariz.
    $modOkundu = ($LASTEXITCODE -eq 0) -and ($modMetin -notmatch "ERROR|insufficient permissions")
}

if (-not $modOkundu) {
    Uyari "IIS modul listesi OKUNAMADI - eklenti durumu bilinmiyor."
    if ($modMetin) { Bilgi (($modMetin -split "`n" | Where-Object { $_.Trim() } | Select-Object -First 3) -join " ") }
    Bilgi "Neredeyse her zaman nedeni: bu pencere yonetici olarak acilmamis."
    Sorun "Tanıyı YONETICI olarak acilmis PowerShell'de tekrar calistirin: eklenti durumu okunamadi."
}

$ancmVar = $modOkundu -and ($modMetin -match "AspNetCoreModuleV2")
$hpVar   = $modOkundu -and ($modMetin -match "httpPlatformHandler")
$rwVar   = $modOkundu -and ($modMetin -match "RewriteModule")
$arrVar  = $modOkundu -and ($modMetin -match "ApplicationRequestRouting|RequestRouter")
$inVar   = $modOkundu -and ($modMetin -match "iisnode")

if ($modOkundu) {
    if ($ancmVar) { Ok "AspNetCoreModuleV2 kurulu  (kullandigimiz yol - ek kurulum gerekmez)" }
    else          { Yok "AspNetCoreModuleV2 YOK" }

    if ($hpVar) { Ok "HttpPlatformHandler kurulu  (alternatif: iis\web.config.iis)" }
    else        { Bilgi "HttpPlatformHandler yok (AspNetCoreModuleV2 varsa gerekmiyor)" }

    if ($rwVar) { Ok "URL Rewrite kurulu" } else { Yok "URL Rewrite YOK" }
    if ($arrVar) { Ok "Application Request Routing (ARR) kurulu" } else { Yok "ARR YOK" }
    if ($inVar) { Bilgi "(iisnode kurulu - bu paket iisnode kullanmiyor)" }

    if ($ancmVar -and $cfgModul -and $cfgModul -ne "AspNetCoreModuleV2") {
        Uyari "Modul kurulu ama web.config baska modul istiyor ($cfgModul)."
        Bilgi "iis\web.config.ancm dosyasini kokteki web.config uzerine kopyalayin."
    }
}

if ($modOkundu -and -not $ancmVar -and -not $hpVar -and -not ($rwVar -and $arrVar)) {
    Yaz ""
    Uyari "IIS bir Node.js uygulamasini ancak bir kopru modulle yayinlar."
    Bilgi "Bu sunucuda uc modulden hicbiri yok. Kurulabilecekler:"
    Bilgi "  ASP.NET Core Hosting Bundle (AspNetCoreModuleV2 gelir)"
    Bilgi "  HttpPlatformHandler 1.2"
    Bilgi "  URL Rewrite + ARR (ters vekil)"
    Bilgi ""
    Bilgi "Sunucuda internet yoksa MSI dosyalarini baska bir bilgisayara indirip"
    Bilgi "kopyalayin; kurulum internet gerektirmez."
    Bilgi "O zamana kadar iis\web.config.bilgi dosyasini web.config yaparsaniz"
    Bilgi "site 500.19 yerine kurulum bilgi sayfasini gosterir."
    Sorun "IIS kopru modulu eksik: AspNetCoreModuleV2 de HttpPlatformHandler de yok."
}

if ($rwVar -and $arrVar) {
    $proxyAcik = $false
    try {
        $p = & $appcmd list config -section:system.webServer/proxy 2>&1
        $proxyAcik = (($p -join " ") -match 'enabled="true"')
    } catch { }
    if ($proxyAcik) { Ok "ARR vekil modu acik" }
    else {
        Uyari "ARR vekil modu KAPALI (ters vekil calismaz)."
        Bilgi "Acmak icin: appcmd set config -section:system.webServer/proxy /enabled:`"True`" /commit:apphost"
        Sorun "ARR vekil modu kapali."
    }
}

# ————————————————————————————— Paket dosyalari —————————————————————————————

Baslik "Paket dosyalari"

$gerekli = @("baslat.cjs", "server.js", "sqlite-hazir.cjs", "web.config", "komutlar\seed.cjs")
foreach ($d in $gerekli) {
    if (Test-Path -LiteralPath (Join-Path $paket $d)) { Ok $d }
    else {
        Yok "$d bulunamadi"
        Sorun "Paket eksik: $d yok. Arsivi yeniden acin."
    }
}

$abi = @(Get-ChildItem -Path (Join-Path $paket "sqlite-ikili") -Filter "*.node" -ErrorAction SilentlyContinue)
if ($abi.Count -gt 0) { Ok "SQLite ikilileri: $($abi.Count) dosya" }
else {
    Yok "sqlite-ikili klasoru bos"
    Sorun "SQLite ikilileri eksik. Arsivi yeniden acin."
}

$envPath = Join-Path $paket ".env"
if (Test-Path -LiteralPath $envPath) {
    Ok ".env var"
    $envIcerik = Get-Content -LiteralPath $envPath -ErrorAction SilentlyContinue
    foreach ($anahtar in @("SECK_SESSION_SECRET", "SECK_BASE_URL", "SECK_SECURE_COOKIE", "PORT")) {
        $satir = $envIcerik | Where-Object { $_ -match "^\s*$anahtar\s*=" } | Select-Object -First 1
        if ($satir) {
            $goster = if ($anahtar -eq "SECK_SESSION_SECRET") { "$anahtar=(gizli, $(($satir -split '=',2)[1].Length) karakter)" } else { $satir }
            Bilgi $goster
        }
    }
} else {
    Bilgi ".env yok - zorunlu degil."
    Bilgi "Oturum imza anahtari data\session-secret icinde kendiliginden uretilir."
    Bilgi "HTTPS'e gecerken SECK_SECURE_COOKIE ve SECK_BASE_URL icin gerekecek."
}

$dbYol = Join-Path $paket "data\portal.db"
if (Test-Path -LiteralPath $dbYol) {
    $db = Get-Item -LiteralPath $dbYol
    Ok "Veritabani var ($([math]::Round($db.Length/1KB)) KB, $($db.LastWriteTime.ToString('yyyy-MM-dd HH:mm')))"
} else {
    # Ilk istekte portal semayi, dort sekmeyi ve admin hesabini kendisi kurar;
    # bu yuzden veritabaninin olmamasi bir sorun degil.
    Bilgi "data\portal.db yok - portal ilk acilista kendisi olusturacak."
}

# ————————————————————————————— Izinler —————————————————————————————

Baslik "Klasor izinleri"

$dataDir = Join-Path $paket "data"
if (Test-Path -LiteralPath $dataDir) {
    try {
        $acl = (& icacls "$dataDir" 2>&1) -join "`n"
        $havuzVar  = $acl -match [regex]::Escape("IIS AppPool\$Havuz")
        $iisUsrVar = $acl -match "IIS_IUSRS"

        if ($havuzVar)  { Ok "data\ uzerinde 'IIS AppPool\$Havuz' izni var" }
        elseif ($iisUsrVar) { Ok "data\ uzerinde IIS_IUSRS izni var" }
        else {
            Yok "data\ uzerinde IIS uygulama havuzu izni GORUNMUYOR"
            Bilgi "IIS'in portali baslatamamasinin en sik nedeni budur (502.5)."
            Bilgi "Duzeltmek icin: powershell -ExecutionPolicy Bypass -File .\iis\iis-izin.ps1"
            Sorun "data\ klasorunde uygulama havuzu yazma izni yok. .\iis\iis-izin.ps1 calistirin."
        }
    } catch {
        Uyari "Izinler okunamadi: $($_.Exception.Message)"
    }
} else {
    Uyari "data\ klasoru henuz yok."
}

# ————————————————————————————— Site ve havuz —————————————————————————————

Baslik "IIS site ve uygulama havuzu"

if ($iisVar) {
    $siteler = @()
    try { $siteler = @(& $appcmd list sites 2>&1 | ForEach-Object { "$_" }) } catch { }

    if ($siteler.Count -eq 0) { Uyari "Hic IIS sitesi listelenemedi." }
    else {
        Bilgi "Tanimli siteler:"
        foreach ($s in $siteler) { Bilgi "  $s" }
    }

    # Siteyi ADIYLA degil, FIZIKSEL YOLUYLA ariyoruz: yonetici siteyi kendi
    # adiyla olusturmus olabilir (ornegin TFS_SECKA).
    $vdirMetin = ((& $appcmd list vdirs 2>&1) | ForEach-Object { "$_" }) -join "`n"
    foreach ($satir in ($vdirMetin -split "`n")) {
        if ($satir -match 'VDIR\s+"([^"]+)"\s+\(physicalPath:(.*)\)\s*$') {
            $fizik = $matches[2].Trim()
            if ($fizik.TrimEnd('\') -ieq $paket.TrimEnd('\') -or
                $fizik.TrimEnd('\') -ieq (Join-Path $paket "iis-site").TrimEnd('\')) {
                $SiteAdi = ($matches[1] -split "/")[0]
                Ok "Bu klasoru gosteren site: $SiteAdi"
                $bulunanPool = ((& $appcmd list app "$SiteAdi/" /text:applicationPool 2>&1) | ForEach-Object { "$_" }) -join ""
                if ($bulunanPool.Trim()) {
                    $Havuz = $bulunanPool.Trim()
                    Bilgi "Uygulama havuzu: $Havuz"
                }
                break
            }
        }
    }

    $bizimSite = $siteler | Where-Object { $_ -match [regex]::Escape($SiteAdi) } | Select-Object -First 1
    if ($bizimSite) {
        Ok "'$SiteAdi' sitesi var"
        if ($bizimSite -match "state:Stopped") {
            Yok "Site DURDURULMUS"
            Sorun "'$SiteAdi' sitesi durdurulmus. Baslatin: appcmd start site `"$SiteAdi`""
        }

        # Sitenin fiziksel yolu pakete mi bakiyor?
        try {
            $app = (& $appcmd list vdir "$SiteAdi/" /text:physicalPath 2>&1) -join ""
            if ($app) {
                Bilgi "Fiziksel yol: $app"
                $beklenen1 = $paket
                $beklenen2 = Join-Path $paket "iis-site"
                if ($app -ne $beklenen1 -and $app -ne $beklenen2) {
                    Uyari "Sitenin yolu ne pakete ne de iis-site klasorune bakiyor."
                    Bilgi "Beklenen: $beklenen1   (dogrudan IIS uygulamasi)"
                    Bilgi "veya    : $beklenen2   (ters vekil)"
                    Sorun "IIS sitesinin fiziksel yolu yanlis: $app"
                }
            }
        } catch { }
    } else {
        Yok "'$SiteAdi' adinda site yok"
        Sorun "IIS sitesi olusturulmamis. Bkz. KURULUM.md - adim adim IIS Yoneticisi."
    }

    $havuzlar = @()
    try { $havuzlar = @(& $appcmd list apppools 2>&1 | ForEach-Object { "$_" }) } catch { }
    $bizimHavuz = $havuzlar | Where-Object { $_ -match [regex]::Escape($Havuz) } | Select-Object -First 1

    if ($bizimHavuz) {
        Ok "'$Havuz' havuzu var"
        Bilgi $bizimHavuz
        if ($bizimHavuz -match "state:Stopped") {
            Yok "Havuz DURDURULMUS"
            Sorun "'$Havuz' havuzu durmus. Baslatin: appcmd start apppool `"$Havuz`""
        }
        try {
            $clr = (& $appcmd list apppool "$Havuz" /text:managedRuntimeVersion 2>&1) -join ""
            if ($clr -and $clr.Trim() -ne "") {
                Uyari "Havuzun .NET CLR surumu: '$clr' (Yonetilen Kod Yok olmali)"
                Bilgi "appcmd set apppool `"$Havuz`" /managedRuntimeVersion:`"`""
            } else {
                Ok "Havuz 'Yonetilen Kod Yok' olarak ayarli"
            }
            $b32 = (& $appcmd list apppool "$Havuz" /text:enable32BitAppOnWin64 2>&1) -join ""
            if ($b32 -match "true") {
                Uyari "Havuz 32 bit modda; %ProgramFiles% yanlis klasore cozulur."
                Bilgi "appcmd set apppool `"$Havuz`" /enable32BitAppOnWin64:`"false`""
                Sorun "Uygulama havuzu 32 bit modda. 64 bit yapin."
            }
        } catch { }
    } else {
        Yok "'$Havuz' adinda uygulama havuzu yok"
    }
}

# ————————————————————————————— Zamanlanmis gorev —————————————————————————————

Baslik "Zamanlanmis gorev (ters vekil modu icin)"

$gorev = $null
try { $gorev = Get-ScheduledTask -TaskName "SEC-K Portali" -ErrorAction SilentlyContinue } catch { }
if ($gorev) {
    Ok "Gorev var - durum: $($gorev.State)"
    if ($gorev.State -ne "Running") {
        Bilgi "Ters vekil modunda gorev calisiyor olmalidir:"
        Bilgi "  Start-ScheduledTask -TaskName 'SEC-K Portali'"
    }
} else {
    Bilgi "Gorev yok (dogrudan IIS uygulamasi modunda gerekmez)."
}

# ————————————————————————————— Portal yanit veriyor mu —————————————————————————————

Baslik "Portal yanit veriyor mu"

$port = 3000
if (Test-Path -LiteralPath $envPath) {
    $pSatir = (Get-Content -LiteralPath $envPath) | Where-Object { $_ -match "^\s*PORT\s*=" } | Select-Object -First 1
    if ($pSatir) { $port = [int](($pSatir -split "=",2)[1]).Trim() }
}

try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 10
    Ok "Portal sureci 127.0.0.1:$port adresinde yanit veriyor (HTTP $($r.StatusCode))"
} catch {
    Bilgi "127.0.0.1:$port yanit vermiyor."
    Bilgi "Dogrudan IIS uygulamasi modunda bu NORMALDIR: portu IIS secer."
}

# IIS uzerinden dene
if ($iisVar -and $bizimSite) {
    try {
        $r2 = Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing -TimeoutSec 20
        Ok "http://localhost/ -> HTTP $($r2.StatusCode)"
    } catch {
        $kod = $null
        if ($_.Exception.Response) { $kod = [int]$_.Exception.Response.StatusCode }
        if ($kod) {
            Yok "http://localhost/ -> HTTP $kod"
            switch ($kod) {
                500 { Sorun "IIS 500 donuyor. Yapilandirma hatasi olabilir (eksik eklenti) veya portal acilamiyor. data\iis-log\ altina bakin." }
                502 { Sorun "IIS 502 donuyor. Portal sureci baslamiyor: data\iis-log\ altindaki gunlugu okuyun ve .\iis\iis-izin.ps1 calistirin." }
                403 { Sorun "IIS 403 donuyor. Site yolu veya handler yapilandirmasi yanlis." }
                404 { Sorun "IIS 404 donuyor. Site baska bir klasore bakiyor olabilir." }
                default { Sorun "IIS HTTP $kod donuyor." }
            }
        } else {
            Bilgi "http://localhost/ denenemedi: $($_.Exception.Message)"
        }
    }
}

# ————————————————————————————— Node gunlugu —————————————————————————————

Baslik "Portal gunlugu (data\iis-log)"

$logDir = Join-Path $dataDir "iis-log"
if (Test-Path -LiteralPath $logDir) {
    $log = Get-ChildItem -Path $logDir -Filter "*.log" -ErrorAction SilentlyContinue |
           Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($log) {
        Bilgi "Dosya: $($log.FullName)  ($($log.LastWriteTime.ToString('yyyy-MM-dd HH:mm')))"
        Yaz ""
        Yaz "  --- son 40 satir ---"
        Get-Content -LiteralPath $log.FullName -Tail 40 -ErrorAction SilentlyContinue |
            ForEach-Object { Yaz "  $_" }
        Yaz "  --- gunluk sonu ---"
    } else {
        Bilgi "Gunluk dosyasi yok - IIS portali hic baslatmayi denememis olabilir."
    }
} else {
    Bilgi "data\iis-log klasoru yok."
}

# ————————————————————————————— Sonuc —————————————————————————————

Baslik "SONUC"

if ($sorunlar.Count -eq 0) {
    Ok "Engelleyici bir eksik bulunamadi."
    Bilgi "Portal hala acilmiyorsa yukaridaki gunluk bolumune bakin."
} else {
    Yaz "  Yapilacaklar (siraya gore):" "Yellow"
    $i = 1
    foreach ($s in $sorunlar) {
        Yaz "   $i. $s" "Yellow"
        $i += 1
    }
}

Yaz ""
try {
    Set-Content -LiteralPath $raporYol -Value $satirlar -Encoding UTF8
    Write-Host "  Rapor kaydedildi: $raporYol" -ForegroundColor Cyan
    Write-Host "  Sorun cozulmezse bu dosyayi paylasin." -ForegroundColor Cyan
} catch {
    Write-Host "  Rapor dosyaya yazilamadi: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""
