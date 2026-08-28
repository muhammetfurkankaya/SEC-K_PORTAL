# SEÇ-K Portalı — IIS üzerinden HTTP/HTTPS yayını

Bu klasör, portalı mevcut IIS sunucunuzda 80/443 portlarından (şirket
sertifikanızla HTTPS dahil) yayınlamak için gereken her şeyi içerir.

---

## Önce şunu bilin: Node.js kurulu olmalı

**IIS portalın kodunu kendi başına çalıştıramaz.** Portal bir Node.js
uygulamasıdır; IIS bir PHP veya .NET uygulaması gibi doğrudan çalıştıramaz.
IIS'in bu kurulumdaki görevi **ön kapı** olmaktır:

- 80/443 portlarını dinler
- Sertifikayı sunar (HTTPS'i IIS bitirir)
- İstekleri arka planda çalışan portal sürecine iletir

Yani sunucuda **Node.js 20 (veya 22) kurulu olmak zorunda** — yerelde deneme
yapıp yapmamanızla ilgisi yok. Buna karşılık:

- `npm install` **gerekmez** (paket derlenmiş geliyor)
- Python, Visual Studio, derleyici **gerekmez**
- İnternet erişimi **gerekmez** (Node.js MSI'ı dışında)

Node.js kurulumu tek bir MSI dosyasıdır: <https://nodejs.org/en/download> →
**Node.js 20 LTS**, Windows Installer (.msi). Kurulumdan sonra komut
penceresini kapatıp yeniden açın.

---

## İki yöntem — hangisini seçmeli

| | **Ters vekil (varsayılan)** | **IIS süreci yönetir** |
|---|---|---|
| IIS eklentisi | URL Rewrite 2.1 **+** ARR 3.0 | HttpPlatformHandler 1.2 |
| Portal sürecini kim başlatır | Zamanlanmış görev (`kur.ps1`) | IIS'in kendisi |
| Portal IIS'ten bağımsız çalışır | ✔ (IIS dursa da ayakta) | ✘ (site durursa portal da durur) |
| Kurulum adımı | `kur.ps1` **sonra** `iis-kur.ps1` | yalnızca `iis-kur.ps1` |
| Script parametresi | `-Mod vekil` | `-Mod iis` |

**Öneri:** Sunucunuzda URL Rewrite + ARR varsa (birçok kurumsal IIS'te
zaten vardır, QDMS gibi uygulamalar için kurulmuş olabilir) **ters vekil**
yöntemini kullanın. Portal IIS'e bağımlı olmaz, IIS bakımı sırasında bile
`http://sunucu:3000` üzerinden erişilebilir kalır.

Hiç eklenti kurmak istemiyorsanız ve tek bir MSI ile bitirmek istiyorsanız
**HttpPlatformHandler** yeterlidir; ayrıca zamanlanmış göreve gerek kalmaz.

Eklentiler kurulu mu diye bakmak için:

```powershell
Get-WebGlobalModule | Where-Object Name -match 'Rewrite|RequestRouting|httpPlatform'
```

İndirme adresleri:

- URL Rewrite — <https://www.iis.net/downloads/microsoft/url-rewrite>
- ARR — <https://www.iis.net/downloads/microsoft/application-request-routing>
- HttpPlatformHandler — <https://www.iis.net/downloads/microsoft/httpplatformhandler>

---

## Kurulum — ters vekil yöntemi

### 1. Paketi yerine koyun

Paketi `C:\seckportal` gibi kalıcı bir yere açın. Kullanıcı klasörleri,
OneDrive ve yolunda parantez bulunan klasörlerden kaçının.

### 2. Portalı kurun

Yönetici PowerShell'de:

```powershell
cd C:\seckportal
powershell -ExecutionPolicy Bypass -File .\kur.ps1
```

Bu adım veritabanını kurar, **admin şifresini ekrana yazar** ve portalı
3000 portunda çalışan bir zamanlanmış görev olarak başlatır.
**Şifreyi kaydedin.**

### 3. IIS ön yüzünü kurun

```powershell
powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1 `
    -HostAdi seck.turkishfuel.com
```

Sertifikanız hazırsa aynı adımda HTTPS'i de bağlayın:

```powershell
powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1 `
    -HostAdi seck.turkishfuel.com `
    -Sertifika A1B2C3D4E5F6... `
    -HttpsZorla
```

Script sırayla şunları yapar:

1. Node.js ve IIS ön koşullarını doğrular
2. ARR'nin vekil modunu açar, istemci adresinin (`X-Forwarded-For`)
   iletilmesine izin verir
3. `.env` dosyasına dış adresi yazar (`SECK_BASE_URL`, `SECK_SECURE_COOKIE`)
4. `iis-site\web.config` dosyasını doğru port ve kurallarla üretir
5. Uygulama havuzunu ve siteyi oluşturur, bağlantıları ekler
6. Sertifikayı bağlantıya atar
7. Güvenlik duvarında portu iç ağa açar, siteyi başlatır ve bir istekle
   doğrular

### 4. Sertifika parmak izini nereden bulurum

```powershell
Get-ChildItem Cert:\LocalMachine\My | Format-List Subject, Thumbprint, NotAfter
```

Sertifika henüz yoksa geçici olarak kendinden imzalı bir tane
üretebilirsiniz (tarayıcı uyarı verir, iç ağda kabul edilebilir):

```powershell
New-SelfSignedCertificate -DnsName seck.turkishfuel.com `
    -CertStoreLocation Cert:\LocalMachine\My
```

Kalıcı çözüm: kurum içi sertifika otoritenizden (AD CS) sunucu sertifikası
alıp `LocalMachine\My` deposuna kurmak.

---

## Kurulum — IIS süreci yönetir yöntemi

```powershell
cd C:\seckportal
powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1 `
    -Mod iis -HostAdi seck.turkishfuel.com -Sertifika A1B2C3...
```

Bu modda:

- Veritabanı yoksa script kurar ve şifreyi ekrana yazar
- Zamanlanmış görev varsa **kaldırılır** (iki sürecin aynı veritabanına
  yazmasını önlemek için) ve 3000 portu güvenlik duvarından kapatılır
- Portu IIS seçer; `.env` içindeki `PORT` bu modda kullanılmaz
- Node çıktısı `data\iis-log\` altına yazılır — sorun ararken ilk bakılacak yer

---

## Kurulumdan sonra

| İş | Ters vekil | IIS yönetir |
|---|---|---|
| Portalı durdur | `Stop-ScheduledTask -TaskName 'SEC-K Portali'` | `Stop-Website -Name 'SEC-K Portali'` |
| Portalı başlat | `Start-ScheduledTask -TaskName 'SEC-K Portali'` | `Start-Website -Name 'SEC-K Portali'` |
| Yeniden başlat | görevi durdur + başlat | `Restart-WebAppPool -Name 'SEC-K Portali'` |
| IIS ön yüzü | `Stop-Website` / `Start-Website` | (aynı) |
| Şifre sıfırla | `node komutlar\sifre.cjs` | (aynı) |

`.env` dosyasını değiştirdiğinizde portal sürecinin **yeniden başlaması**
gerekir; aksi halde eski değerler kullanılmaya devam eder.

---

## Portal yalnızca IIS üzerinden erişilsin

HTTPS'i zorunlu tuttuysanız, 3000 portu ağda açık kaldığı sürece bir kullanıcı
`http://sunucu:3000` yazarak HTTPS'i atlayabilir. Kapatmak için:

```powershell
powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1 `
    -HostAdi seck.turkishfuel.com -Sertifika A1B2C3... -HttpsZorla -YalnizIIS
```

`-YalnizIIS`, `.env` dosyasına `HOSTNAME=127.0.0.1` yazar (portal yalnızca
sunucunun kendi içinden erişilebilir olur) ve 3000 portunun güvenlik duvarı
kuralını kaldırır. `-Mod iis` kullanıyorsanız bu zaten böyledir.

---

## Elle kurulum (script çalışmazsa)

Script'in yaptığı her adımın elle karşılığı:

**1. ARR vekil modunu aç**
IIS Yöneticisi → sunucu adına tıkla → *Application Request Routing Cache* →
sağ panelde *Server Proxy Settings* → **Enable proxy** işaretle → Uygula.
Veya:

```powershell
& "$env:windir\system32\inetsrv\appcmd.exe" set config `
    -section:system.webServer/proxy /enabled:"True" /commit:apphost
```

**2. İstemci adresinin iletilmesine izin ver** (yalnızca ters vekil)

```powershell
& "$env:windir\system32\inetsrv\appcmd.exe" set config `
    -section:system.webServer/rewrite/allowedServerVariables `
    /+"[name='HTTP_X_FORWARDED_FOR']" /commit:apphost
```

Bu izni vermezseniz `web.config` içindeki `<serverVariables>` bloğunu
**silmeniz gerekir**, yoksa site 500.19 hatası verir.

**3. Site klasörünü ve web.config'i hazırla**

```powershell
New-Item -ItemType Directory C:\seckportal\iis-site
Copy-Item C:\seckportal\iis\web.config.vekil C:\seckportal\iis-site\web.config
notepad C:\seckportal\iis-site\web.config     # port ve HTTPS kuralını gözden geçir
```

Site klasörü kasıtlı olarak paketin kökü **değil**: içinde yalnızca
`web.config` bulunur, böylece `.env` veya `data\` altındaki dosyalar hatalı
bir yapılandırmada bile statik dosya olarak sunulamaz.

`-Mod iis` için `web.config.iis` dosyasını kopyalayın ve içindeki üç yolu
(node.exe, baslat.cjs, data klasörü) kendi sunucunuza göre düzeltin.

**4. Uygulama havuzu**
IIS Yöneticisi → Uygulama Havuzları → Ekle → ad: `SEC-K Portali`,
.NET CLR sürümü: **Yönetilen Kod Yok**. Gelişmiş Ayarlar'da
*Boşta Kalma Zaman Aşımı* = `0`, *Düzenli Aralıklarla Geri Dönüşüm* = `0`.

**5. Site**
Siteler → Web Sitesi Ekle → ad: `SEC-K Portali`, fiziksel yol:
`C:\seckportal\iis-site`, uygulama havuzu: `SEC-K Portali`,
ana bilgisayar adı: `seck.turkishfuel.com`.

**6. HTTPS bağlantısı**
Site → *Bağlamalar* → Ekle → tür: **https**, port 443, ana bilgisayar adı,
*Sunucu Adı Belirtme Gerektir* (SNI) işaretli, sertifikayı listeden seç.

**7. `.env`**

```
SECK_BASE_URL=https://seck.turkishfuel.com
SECK_SECURE_COOKIE=true
```

`SECK_SECURE_COOKIE` **yalnızca HTTPS** kullanıyorsanız `true` olmalı; HTTP'de
`true` yaparsanız yönetim paneline giriş yapılamaz (tarayıcı cookie'yi
göndermez).

---

## Sorun giderme

**HTTP 502.3 / "Bad Gateway"** (ters vekil)
Portal süreci ayakta değil. Kontrol:
`Invoke-WebRequest http://127.0.0.1:3000/ -UseBasicParsing`
Ayakta değilse: `Start-ScheduledTask -TaskName 'SEC-K Portali'` veya paket
kökünde `node baslat.cjs` ile elle çalıştırıp hatayı okuyun.

**HTTP 500.19 — "Bu yapılandırma bölümü okunamıyor"**
Eksik IIS eklentisi (`<rewrite>` için URL Rewrite, `<httpPlatform>` için
HttpPlatformHandler) veya izin verilmemiş bir sunucu değişkeni. Yukarıdaki
2. maddeye bakın.

**HTTP 500.52 / boş sayfa** (ters vekil)
ARR'nin vekil modu kapalı. 1. maddeye bakın.

**HTTP 502.5 veya site açılmıyor** (`-Mod iis`)
Node süreci başlatılamamış. `data\iis-log\` altındaki dosyayı okuyun.
En sık nedenler: `node.exe` yolu yanlış, uygulama havuzu kimliğinin `data\`
klasörüne yazma izni yok.

**Yönetim paneline giriş yapılamıyor, hata da vermiyor**
`SECK_SECURE_COOKIE=true` ama site HTTP üzerinden açılıyor. `false` yapın
veya HTTPS'e geçin, sonra portalı yeniden başlatın.

**Anket QR kodu yanlış adresi gösteriyor**
`.env` içindeki `SECK_BASE_URL` dış adresle aynı olmalı
(`https://seck.turkishfuel.com`). Değiştirdikten sonra portalı yeniden
başlatın.

**Büyük PDF yüklenmiyor (413 / "Request Entity Too Large")**
`web.config` içindeki `maxAllowedContentLength` 50 MB'a ayarlı. Sorun
sürerse sunucu genelinde ön okuma tamponunu büyütün:

```powershell
& "$env:windir\system32\inetsrv\appcmd.exe" set config `
    -section:system.webServer/serverRuntime /uploadReadAheadSize:"10485760" /commit:apphost
```

**QDMS ile aynı sunucuda çakışma**
Aynı portu (80/443) farklı ana bilgisayar adlarıyla paylaşabilirsiniz —
portal için `-HostAdi seck.turkishfuel.com` verin. Host adı vermeden 80'e
bağlanmaya çalışırsanız script çakışmayı bildirip durur. Ayrı bir port da
kullanabilirsiniz: `-HttpPort 8080`.

**Sertifika süresi doldu**
Yeni sertifikayı `LocalMachine\My` deposuna kurun, sonra:
IIS Yöneticisi → site → Bağlamalar → https → Düzenle → yeni sertifikayı seçin.
Portalı yeniden başlatmak gerekmez.

---

## Yedekleme

Her şey `data\` klasöründedir: veritabanı, yüklenen PDF'ler ve oturum
anahtarı. IIS yapılandırması buna dahil değil; `iis-site\web.config` dosyasını
da yedeklemek isterseniz kopyalayın.

```powershell
Copy-Item C:\seckportal\data "\\yedek-sunucu\seck\data-$(Get-Date -f yyyyMMdd)" -Recurse
```
