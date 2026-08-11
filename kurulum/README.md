# Sunucu kurulumu (Windows)

Bu klasördeki script'ler portalı bir Windows sunucusunda çalıştırmak için
hazırlandı. Sırayla çalıştırmanız yeterli.

---

## Aldığınız hata ve nedeni

`npm install` sırasında şuna benzer bir yığın görüyorsanız:

```
npm ERR! path ...\node_modules\better-sqlite3
npm ERR! prebuild-install warn install No prebuilt binaries found (target=16.13.1 ...)
npm ERR! gyp ERR! find Python
npm ERR! gyp ERR! find Python You need to install the latest version of Python.
```

**Sebep Python değil, Node.js sürümü.** Portal SQLite kullanıyor; bu paketin
hazır derlenmiş dosyaları yalnızca **Node 18, 20 ve 22** için yayımlanıyor.
Sunucuda Node 16 olduğu için npm hazır dosya bulamıyor, paketi kaynaktan
derlemeye çalışıyor ve derleyici (Python + Visual Studio Build Tools)
istiyor.

**Node 20'ye çıkınca hazır dosya iniyor, derleyici hiç devreye girmiyor.**
Python veya Visual Studio Build Tools **kurmanız gerekmez** — birkaç GB'lık
gereksiz kurulumdan kurtulursunuz.

Doğrulama: `better-sqlite3` 11.10.0 için Windows x64 hazır dosyaları
Node 18 / 20 / 22'de mevcut, Node 16'da yok.

---

## Adımlar

Projeyi **kullanıcı klasörü dışına** çıkarın. Yolda parantez
(`seckportal (1)`), Türkçe karakter (`Masaüstü`) veya OneDrive bulunması
sorun çıkarır:

```powershell
Move-Item "$HOME\Desktop\seckportal (1)\sec-k-portal" C:\seckportal
cd C:\seckportal
```

### 1. Node.js 20 LTS — yönetici PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File .\kurulum\1-node-kur.ps1
```

Node'un güncel 20 LTS sürümünü indirip sessizce kurar. Kurulum bitince
**pencereyi kapatıp yeniden açın** — PATH değişikliği ancak yeni pencerede
geçerli olur.

Sunucunun interneti yoksa MSI'yi başka bir makineden indirip verin:

```powershell
# https://nodejs.org/dist/latest-v20.x/ adresinden node-v20.x.x-x64.msi
powershell -ExecutionPolicy Bypass -File .\kurulum\1-node-kur.ps1 -MsiPath C:\indirilenler\node-v20.20.2-x64.msi
```

### 2. Portalı kur

```powershell
powershell -ExecutionPolicy Bypass -File .\kurulum\2-portal-kur.ps1
```

Sırayla: bağımlılıkları kurar → `.env` oluşturup oturum anahtarı üretir →
veritabanını hazırlar ve **admin şifresini ekrana yazar** → üretim
derlemesini yapar.

> Ekrana yazılan **kullanıcı adı ve şifreyi kaydedin.** Şifre tek yönlü
> hashlenerek saklandığı için sonradan görüntülenemez. Kaybederseniz:
> `npm.cmd run sifre`

Seçenekler:

```powershell
# Şifreyi ve adresi kendiniz belirleyin
.\kurulum\2-portal-kur.ps1 -AdminSifre "Guclu1Sifre" -BaseUrl "http://seck.turkishfuel.com"

# Ekranları örnek veriyle görmek için (yalnızca test)
.\kurulum\2-portal-kur.ps1 -OrnekVeri

# Farklı port
.\kurulum\2-portal-kur.ps1 -Port 8080
```

Test için hemen başlatmak:

```powershell
npm.cmd start
```

Ardından `http://localhost:3000`.

### 3. Açılışta otomatik başlatma — yönetici PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File .\kurulum\3-servis-kur.ps1
```

Portalı Zamanlanmış Görev olarak kaydeder (sunucu açıldığında oturum
açılmasını beklemeden başlar) ve güvenlik duvarında portu iç ağa açar.

```powershell
Stop-ScheduledTask  -TaskName 'SEC-K Portali'    # durdur
Start-ScheduledTask -TaskName 'SEC-K Portali'    # başlat
Get-ScheduledTask   -TaskName 'SEC-K Portali'    # durum
.\kurulum\3-servis-kur.ps1 -Kaldir               # kaldır
```

---

## Kalıcı üretim kurulumu için

Zamanlanmış görev, süreç çökerse 3 kez yeniden dener ama gerçek bir Windows
servisi kadar dayanıklı değildir. Kalıcı kurulumda **NSSM** ile servis
oluşturmak daha sağlam:

```powershell
# nssm.cc adresinden indirip nssm.exe'yi PATH'e koyduktan sonra:
nssm install "SEC-K Portali" "C:\Program Files\nodejs\node.exe" `
  "C:\seckportal\node_modules\next\dist\bin\next start -p 3000"
nssm set "SEC-K Portali" AppDirectory C:\seckportal
nssm set "SEC-K Portali" AppStdout   C:\seckportal\data\portal.log
nssm set "SEC-K Portali" AppStderr   C:\seckportal\data\portal-hata.log
nssm set "SEC-K Portali" Start SERVICE_AUTO_START
nssm start "SEC-K Portali"
```

NSSM süreci sürekli izler ve çöktüğünde anında yeniden başlatır, ayrıca
günlükleri dosyaya yazar.

### IIS ile aynı sunucuda yayınlamak

Portal kendi web sunucusunu çalıştırır (3000 portu). IIS'te 80/443'ten
erişilmesini isterseniz **Application Request Routing** ile ters vekil
kurun: gelen istekleri `http://localhost:3000` adresine yönlendirin. QDMS
ile aynı sunucuda sorunsuz yan yana çalışır.

Ters vekil arkasında `.env` içinde şunları ayarlayın:

```
SECK_BASE_URL=https://seck.turkishfuel.com
SECK_SECURE_COOKIE=true
```

`SECK_SECURE_COOKIE` yalnızca HTTPS ile yayınlıyorsanız `true` olmalı;
HTTP'de `true` yaparsanız giriş yapılamaz.

---

## Yedekleme

Her şey `data\` klasöründedir: veritabanı, yüklenen PDF'ler ve oturum
anahtarı. Düzenli yedek için bu klasörü kopyalamak yeterlidir.

```powershell
Copy-Item C:\seckportal\data "\\yedek-sunucu\seck\data-$(Get-Date -f yyyyMMdd)" -Recurse
```

Yedek alırken portalı durdurmak gerekmez, ancak durdurulmuş hâlde alınan
yedek daha tutarlıdır.

---

## Sık karşılaşılanlar

**`npm.ps1 cannot be loaded` / `UnauthorizedAccess`**
PowerShell imzasız script'leri engelliyor. `npm` yerine `npm.cmd` yazın.
Bu klasördeki script'ler bunu zaten yapıyor.

**`... is not digitally signed` (kurulum script'i çalışmıyor)**
Script'i şu şekilde çağırın:
`powershell -ExecutionPolicy Bypass -File .\kurulum\1-node-kur.ps1`

**Port 3000 kullanılıyor**
Başka bir port seçin: `.\kurulum\2-portal-kur.ps1 -Port 8080`

**Ağdaki başka bilgisayarlardan açılmıyor**
Güvenlik duvarı kuralı 3. adımda ekleniyor. Elle eklemek için:
`New-NetFirewallRule -DisplayName "SEC-K" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Domain,Private`

**Şifreyi kaybettim**
`npm.cmd run sifre` — bültenler ve anketler silinmez.

**npm sunucudan internete çıkamıyor**
İnternete çıkabilen bir makinede aynı Node sürümüyle `npm ci` çalıştırıp
oluşan `node_modules` klasörünü sunucuya kopyalayın. Aynı işletim sistemi ve
Node ana sürümü olmalı (SQLite ikili dosyası platforma bağlıdır).
