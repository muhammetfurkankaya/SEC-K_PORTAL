# SEÇ-K Portalı — IIS üzerinden HTTP/HTTPS yayını

## İki seçenek var — önce bunu okuyun

Portal bir **Node.js** uygulamasıdır. IIS, PHP ve .NET uygulamalarını doğrudan
çalıştırır ama Node.js uygulamalarını çalıştıramaz. Bu yüzden iki yol var:

| | **A seçeneği — IIS barındırır** | **B seçeneği — portal kendi portunu dinler** |
|---|---|---|
| Ek IIS modülü | HttpPlatformHandler 1.2 (tek MSI) | **gerekmez** |
| IIS sitesi | Kalır, klasörü gösterir | Gerekmez (varsa durdurulur) |
| Süreci kim yönetir | IIS (çökerse yeniden başlatır) | Windows zamanlanmış görevi |
| IIS Yöneticisi'nde *Browse* | Portalı açar | Kullanılmaz; adrese doğrudan gidilir |
| HTTPS | IIS'in sertifika yönetimi | Ters vekil veya ayrı yapılandırma gerekir |

**Node.js kurmanız gerekmiyor.** Portalın çalıştırıcısı `node\node.exe` olarak
paketin içinde geliyor (Node.js 20, nodejs.org'dan indirilip SHA-256 ile
doğrulanmış; ayrıntı `node\OKU.txt`). Sunucudaki Node sürümüne dokunulmaz —
aynı sunucudaki diğer uygulamalar etkilenmez. Sistemdeki Node'u kullanmak
isterseniz script'lere `-NodeExe "C:\Program Files\nodejs\node.exe"`
verebilirsiniz.

> Node.js MSI kurulumu **"The feature you are trying to use is on a network
> resource that is unavailable"** hatası veriyorsa: Windows Installer eski
> sürümü kaldırmak için orijinal `node-v16.13.1-x64.msi` dosyasını arıyor,
> önbelleği silinmiş. Artık bu kuruluma hiç gerek yok — paketteki node.exe
> yeterli. Yine de sistem geneline kurmak isterseniz eksik dosyayı
> <https://nodejs.org/dist/v16.13.1/node-v16.13.1-x64.msi> adresinden indirip
> "Use source" kutusuna dosyanın bulunduğu **klasörü** yazın.

### B seçeneği (modül kuramıyorsanız): tek komut

IIS sitesi ile aynı portu kullanacaksanız önce siteyi durdurun; Windows'ta
portu HTTP.sys tutar ve IIS sitesi açıkken başka bir program o portu
dinleyemez.

```powershell
appcmd stop site "TFS_SECKA"
cd E:\TSF_DATA\TFS_SECKA
powershell -ExecutionPolicy Bypass -File .\kur.ps1 -Port 9092 -BaseUrl "http://10.34.32.55:9092"
```

Bu komut veritabanını kurar, oturum anahtarını üretir, izinleri kısıtlar,
açılışta otomatik başlatma görevini oluşturur, güvenlik duvarında portu iç ağa
açar ve portalı başlatır. Sonra `http://10.34.32.55:9092` adresi çalışır.

---

## Çalışmadıysa önce bunu yapın

```powershell
cd C:\seckportal
powershell -ExecutionPolicy Bypass -File .\iis\iis-kontrol.ps1
```

Bu script **hiçbir şeyi değiştirmez.** Neyin eksik olduğunu sırayla söyler ve
çıktıyı `iis-tani.txt` dosyasına yazar. Sorun çözülmezse o dosyayı paylaşmak
yeterlidir — tahmin etmeye gerek kalmaz.

---

## Neden bir IIS eklentisi gerekiyor

IIS, PHP veya .NET uygulamalarını doğrudan çalıştırır ama **Node.js
uygulamalarını çalıştıramaz.** Portal bir Node.js uygulamasıdır. IIS'in bu
kurulumdaki görevi ön kapı olmaktır: 80/443'ü dinler, sertifikayı sunar,
isteği portala iletir. Bunun için IIS ile Node arasında bir köprü modülü
gerekir.

**Kurulması gereken tek şey:** HttpPlatformHandler 1.2 —
<https://www.iis.net/downloads/microsoft/httpplatformhandler>

Node.js paketle geliyor (`node\node.exe`), ayrıca kurmanız gerekmez.

> Sunucuda internet yoksa MSI'ı internet erişimi olan bir bilgisayara indirip
> kopyalayın. Kurulumun kendisi internet gerektirmez.

Kurulu olup olmadığını görmek için:

```powershell
Get-WebGlobalModule | Where-Object Name -match 'httpPlatform|Rewrite|RequestRouting'
```

Bu komut hata veriyorsa (`Get-WebGlobalModule` tanınmıyorsa) şunu kullanın:

```
%windir%\system32\inetsrv\appcmd.exe list modules
```

---

## En kısa yol (önerilen)

Paket **doğrudan bir IIS uygulaması** olarak hazırlandı: kökünde `web.config`
dosyası var, yolları görecelidir, düzenleme gerektirmez.

### 1. Hazırlık

- Paketi kalıcı bir yere açın (kullanıcı klasörleri ve OneDrive'dan kaçının)
- HttpPlatformHandler kurun — **tek gereksinim bu**
- Komut penceresini kapatıp yeniden açın

### 2. Tek komut

```powershell
cd C:\seckportal
powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1 -HostAdi seck.turkishfuel.com
```

Sertifikanız hazırsa aynı adımda:

```powershell
powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1 `
    -HostAdi seck.turkishfuel.com -Sertifika A1B2C3D4E5F6...
```

Script kurulu eklentilere bakıp modu kendisi seçer, uygulama havuzunu ve
siteyi oluşturur, izinleri verir, sertifikayı bağlar, güvenlik duvarını açar
ve bir istekle doğrular. IIS yönetimini `appcmd` ile yapar; `WebAdministration`
PowerShell modülü kurulu olmasa da çalışır.

Sertifika parmak izini bulmak için:

```powershell
Get-ChildItem Cert:\LocalMachine\My | Format-List Subject, Thumbprint, NotAfter
```

### 3. Açın

```
https://seck.turkishfuel.com
```

Giriş: **`admin` / `Tfs2026...`** — ilk girişten sonra Ayarlar → Şifre
Değiştir'den değiştirin.

---

## Script çalışmıyorsa: IIS Yöneticisi ile elle kurulum

Script'in yaptığı işin tamamı dört adımdır. Hepsini arayüzden yapabilirsiniz.

**1. Uygulama havuzu**
IIS Yöneticisi → Uygulama Havuzları → **Uygulama Havuzu Ekle**
- Ad: `SEC-K Portali`
- .NET CLR sürümü: **Yönetilen Kod Yok**
- Yönetilen ardışık düzen modu: Tümleşik

Havuzu seçip **Gelişmiş Ayarlar**:
- *32 Bit Uygulamaları Etkinleştir*: **False** ← önemli, `%ProgramFiles%`
  aksi halde yanlış klasöre çözülür
- *Boşta Kalma Zaman Aşımı (dakika)*: `0`
- Geri Dönüşüm → *Düzenli Aralıklarla (dakika)*: `0`

**2. Site**
Siteler → **Web Sitesi Ekle**
- Site adı: `SEC-K Portali`
- Uygulama havuzu: `SEC-K Portali`
- Fiziksel yol: `C:\seckportal` ← **paketin kökü**, alt klasör değil
- Bağlama: http, port 80, ana bilgisayar adı `seck.turkishfuel.com`

Paketle gelen `C:\seckportal\web.config` gerisini halleder.

**3. İzinler** — atlanırsa site 502.5 verir

```powershell
powershell -ExecutionPolicy Bypass -File .\iis\iis-izin.ps1
```

Elle yapmak isterseniz, yönetici komut isteminde:

```
icacls "C:\seckportal" /grant "IIS AppPool\SEC-K Portali:(OI)(CI)(RX)"
icacls "C:\seckportal\data" /grant "IIS AppPool\SEC-K Portali:(OI)(CI)(M)" /T
```

**4. Veritabanı** (daha önce kurulmadıysa)

```powershell
cd C:\seckportal
nodejs.cmd komutlar\seed.cjs
```

`nodejs.cmd`, paketteki `node\node.exe` dosyasını kullanır; sistemde Node
kurulu olmasa da çalışır.

**HTTPS bağlaması:** Site → *Bağlamalar* → **Ekle** → tür `https`, port 443,
ana bilgisayar adı, *Sunucu Adı Belirtme Gerektir* işaretli, sertifikayı
listeden seçin. Ardından `.env` dosyasında:

```
SECK_BASE_URL=https://seck.turkishfuel.com
SECK_SECURE_COOKIE=true
```

`SECK_SECURE_COOKIE` **yalnızca HTTPS** varken `true` olmalı; HTTP'de `true`
yaparsanız yönetim paneline giriş yapılamaz. Değiştirdikten sonra havuzu
yeniden başlatın: `appcmd recycle apppool "SEC-K Portali"`

---

## Alternatif: ters vekil (URL Rewrite + ARR)

Sunucunuzda HttpPlatformHandler yerine URL Rewrite ve ARR kuruluysa bu mod
kullanılır. Farkı: Node sürecini IIS değil, bir zamanlanmış görev çalıştırır —
portal IIS durduğunda da ayakta kalır.

```powershell
cd C:\seckportal
powershell -ExecutionPolicy Bypass -File .\kur.ps1          # portal + veritabani
powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1 -Mod vekil `
    -HostAdi seck.turkishfuel.com -Sertifika A1B2C3... -HttpsZorla
```

Bu modda IIS sitesi paketin kökünü değil, yalnızca `web.config` içeren
`iis-site\` klasörünü gösterir.

HTTP'yi HTTPS'e zorlamak (`-HttpsZorla`) yalnızca bu modda vardır; URL Rewrite
kuralı kullanır. Doğrudan IIS modunda HTTPS'e yönlendirme için IIS'in
*HTTP Yeniden Yönlendirme* özelliğini ayrı bir HTTP sitesinde kullanın.

Portal yalnızca IIS üzerinden erişilsin (3000 portu kapatılsın):

```powershell
.\iis\iis-kur.ps1 -Mod vekil -HostAdi seck.turkishfuel.com -Sertifika A1B2C3... -HttpsZorla -YalnizIIS
```

---

## Hata kodlarına göre çözüm

Her durumda ilk adım: `.\iis\iis-kontrol.ps1`

| Ne görüyorsunuz | Nedeni | Çözüm |
|---|---|---|
| **500.19** `0x8007000d` | `web.config` IIS'in tanımadığı bir bölüm içeriyor — neredeyse her zaman HttpPlatformHandler kurulu değildir | Modülü kurun; kurulumu bitirene kadar `copy web.config.kurulum-oncesi web.config` ile bilgi sayfasına dönebilirsiniz |
| **502.5** / "Process failure" | Node süreci başlamıyor | `data\iis-log\` içindeki son `.log` dosyasını okuyun; genellikle izin sorunu → `.\iis\iis-izin.ps1` |
| **502.3** (ters vekil) | Portal süreci ayakta değil | `Start-ScheduledTask -TaskName 'SEC-K Portali'` |
| **500.52** veya boş sayfa (ters vekil) | ARR vekil modu kapalı | `appcmd set config -section:system.webServer/proxy /enabled:"True" /commit:apphost` |
| **403.14** "Directory listing denied" | Handler devreye girmiyor; IIS klasörü statik sunmaya çalışıyor | HttpPlatformHandler kurulu mu? Havuz "Yönetilen Kod Yok" mu? |
| **404** | Site başka bir klasöre bakıyor | Site fiziksel yolu paketin kökü olmalı |
| **HTTP 503** | Uygulama havuzu durmuş | `appcmd start apppool "SEC-K Portali"` — sonra `data\iis-log\` bakın |
| Sayfa açılıyor, **giriş yapılamıyor** | `SECK_SECURE_COOKIE=true` ama site HTTP | `.env` içinde `false` yapın veya HTTPS'e geçin |
| **"is not digitally signed"** | PowerShell imza politikası | Komutu `powershell -ExecutionPolicy Bypass -File ...` biçiminde çağırın |
| **Bültenler kayboldu** | `data\` klasörü yerinde değil | Yükseltmede eski `data\` klasörünü geri koyun |
| QR kodu **yanlış adres** gösteriyor | `.env` içindeki `SECK_BASE_URL` | Dış adresle aynı yapın, havuzu yeniden başlatın |

### Hatanın kendisini nerede göreceksiniz

Doğrudan IIS modunda Node'un tüm çıktısı buraya yazılır:

```
C:\seckportal\data\iis-log\portal_*.log
```

**Tarayıcıda 502.5 görüyorsanız gerçek hata bu dosyadadır.** Portal
başlayamadığında oraya ne yapılması gerektiğini yazar (örneğin hangi `icacls`
komutunun çalıştırılacağını).

IIS'in kendi günlükleri: `%SystemDrive%\inetpub\logs\LogFiles`

---

## Kurulumdan sonra

| İş | Doğrudan IIS modu | Ters vekil modu |
|---|---|---|
| Durdur | `appcmd stop site "SEC-K Portali"` | `Stop-ScheduledTask -TaskName 'SEC-K Portali'` |
| Başlat | `appcmd start site "SEC-K Portali"` | `Start-ScheduledTask -TaskName 'SEC-K Portali'` |
| Yeniden başlat | `appcmd recycle apppool "SEC-K Portali"` | görevi durdur + başlat |
| Şifre sıfırla | `nodejs.cmd komutlar\sifre.cjs` | (aynı) |
| Tanı | `.\iis\iis-kontrol.ps1` | (aynı) |

`.env` dosyasını değiştirdikten sonra süreç **yeniden başlamalıdır**, aksi
halde eski değerler kullanılmaya devam eder.

---

## QDMS ile aynı sunucuda

Aynı portu (80/443) farklı ana bilgisayar adlarıyla paylaşabilirsiniz —
portal için `-HostAdi seck.turkishfuel.com` verin. Host adı vermeden 80'e
bağlanmaya çalışırsanız script çakışmayı bildirip durur. Ayrı bir port da
kullanabilirsiniz: `-HttpPort 8080`.

---

## Yedekleme

Her şey `data\` klasöründedir: veritabanı, yüklenen PDF'ler, oturum anahtarı
ve IIS günlükleri.

```powershell
Copy-Item C:\seckportal\data "\\yedek-sunucu\seck\data-$(Get-Date -f yyyyMMdd)" -Recurse
```

Kurulum script'i bu klasörün izinlerini kısıtladığı için yedek komutunu
yönetici olarak çalıştırın.
