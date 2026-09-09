# SEÇ-K Portalı — sunucu kurulumu

Bu klasör **derlenmiş yayın paketidir.** `npm install` gerekmez, internet
gerekmez, Python veya Visual Studio derleyicisi gerekmez.

**Node.js kurmanız da gerekmez:** portalın çalıştırıcısı `node\node.exe`
olarak paketin içinde geliyor (Node.js 20, nodejs.org'dan indirilip SHA-256
ile doğrulanmış — ayrıntı `node\OKU.txt`). Sunucudaki Node sürümüne
dokunulmaz, böylece aynı sunucudaki diğer uygulamalar etkilenmez.

Sistemde kurulu Node'u kullanmak isterseniz script'lere
`-NodeExe "C:\Program Files\nodejs\node.exe"` verebilirsiniz.

---

## Kurulum

### 1. Klasörü yerine koyun

> **Paket iki arşiv hâlinde geldiyse** (boyut sınırı nedeniyle) ikisini de
> **aynı klasöre** açın:
>
> | Arşiv | İçindekiler |
> |---|---|
> | `SEC-K-Portali-sunucu.zip` | portalın tamamı |
> | `SEC-K-Portali-node.zip` | yalnızca `node\node.exe` |
>
> İkinci arşiv `node\` klasörünü içerdiği için doğru yere açılır. Eksik
> kalırsa kurulum script'i "Pakette node\node.exe yok" diye uyarır.

Paketi kalıcı bir yere taşıyın — örneğin `C:\seckportal`. Şunlardan kaçının:

- Kullanıcı masaüstü veya `OneDrive` klasörleri (otomatik başlatma görevi
  SYSTEM hesabıyla çalışır ve buralara yazamayabilir)
- Yolunda parantez bulunan klasörler (`seckportal (1)` gibi)

### 2. `KUR.cmd` dosyasına sağ tıklayıp **"Yönetici olarak çalıştır"** seçin

Başka bir şey indirmeniz veya kurmanız gerekmez. Kurulum size iki soru sorar:

| Soru | Ne yazacaksınız |
|---|---|
| Port | Bu uygulama için ayrılan port, örneğin `9092` |
| Adres | Ağdan erişilecek adres, örneğin `http://10.34.32.55:9092` |

Sonra sırayla: portun boş olmasını sağlar (gerekirse o portu tutan IIS
sitesini durdurur) → `.env` oluşturup oturum anahtarı üretir → veritabanını
kurar ve admin hesabını açar → `.env` ve `data\` izinlerini kısıtlar →
sunucu açılışında portalı başlatan bir Windows görevi kurar → güvenlik
duvarında portu iç ağa açar → portalı başlatır ve yanıt verdiğini doğrular.

PowerShell'den yapmayı tercih ederseniz aynı iş:

```powershell
cd C:\seckportal
powershell -ExecutionPolicy Bypass -File .\kur.ps1 `
    -Port 9092 -BaseUrl "http://10.34.32.55:9092" -PortuBosalt
```

> **Neden IIS'e ihtiyaç yok:** portal kendi web sunucusunu içinde taşır
> (Node.js uygulamaları böyle çalışır). IIS'i yalnızca 80/443 üzerinden
> yayın veya sertifika yönetimi isterseniz kullanırsınız — o zaman bir IIS
> eklentisi gerekir, bkz. `iis\IIS.md`.

### Yönetim paneli giriş bilgileri

| | |
|---|---|
| Kullanıcı adı | `admin` |
| Şifre | `Tfs2026...` |

> **Bu varsayılan şifre bu belgede yazılı olduğu için gizli değildir.**
> İlk girişten sonra **Ayarlar → Şifre Değiştir**'den değiştirin.
> Değiştirilene kadar yönetim panelinin üstünde kırmızı bir uyarı şeridi
> görünür; şifreyi değiştirdiğinizde kendiliğinden kaybolur.

Kurulumu başka bir şifreyle yapmak isterseniz:

```powershell
.\kur.ps1 -AdminSifre "KendiSifreniz123"
```

Seçenekler:

```powershell
.\kur.ps1 -AdminSifre "Guclu1Sifre" -BaseUrl "http://seck.turkishfuel.com"
.\kur.ps1 -Port 8080
.\kur.ps1 -GorevAtla        # otomatik başlatma görevi kurulmasın
```

### 3. Açın

Kurulumun sonunda yazdığı adresi açın — örneğin:

```
http://10.34.32.55:9092
```

Sunucunun kendi üzerinden: `http://localhost:<port>`

Kurulum, portalın gerçekten yanıt verdiğini kendisi doğrular ve hem yerel
hem ağ adresini ekrana yazar. Yanıt vermezse sebebi görmek için portalı ön
planda çalıştırmayı önerir (`nodejs.cmd baslat.cjs`) — hata mesajı doğrudan
ekrana gelir.

---

## Elle başlatma

Otomatik başlatma görevi kurmadıysanız veya elle çalıştırmak isterseniz:

```
nodejs.cmd baslat.cjs
```

Durdurmak için `Ctrl + C`.

---

## Günlük yönetim

| İş | Komut |
|---|---|
| Durdur | `Stop-ScheduledTask -TaskName 'SEC-K Portali'` |
| Başlat | `Start-ScheduledTask -TaskName 'SEC-K Portali'` |
| Durum | `Get-ScheduledTask -TaskName 'SEC-K Portali'` |
| Şifre sıfırla | `nodejs.cmd komutlar\sifre.cjs` |
| Hesapları listele | `nodejs.cmd komutlar\sifre.cjs --liste` |
| Örnek veri ekle | `nodejs.cmd komutlar\demo.cjs` |
| Örnek veriyi sil | `nodejs.cmd komutlar\demo.cjs --temizle` |

Ayrıntı: `komutlar\OKU.txt`

---

## Güvenlik

Kurulum sonrası **sizin yapmanız gereken iki şey** var:

1. **Varsayılan şifreyi değiştirin** (Ayarlar → Şifre Değiştir). Değiştirilene
   kadar panelde kırmızı uyarı şeridi durur. Şifre değiştiğinde o hesapla
   açılmış diğer tüm oturumlar kapanır.
2. **HTTPS kullanın.** Sertifikanız varsa `iis\iis-kur.ps1` ile bağlayın ve
   `.env` içinde `SECK_SECURE_COOKIE=true` olduğundan emin olun — oturum
   cookie'si yalnızca o zaman şifreli bağlantıyla sınırlanır.

Kutudan çıktığı gibi çalışan korumalar:

| Konu | Uygulanan |
|---|---|
| Şifre saklama | scrypt (N=16384) ile tek yönlü karma, sabit zamanlı karşılaştırma |
| Oturum | HMAC imzalı, httpOnly, sameSite=lax cookie; 8 saat geçerli |
| Şifre değişimi | Eski oturumlar geçersiz olur; pasife alınan hesap anında düşer |
| Kaba kuvvet | 5 dakikada 8 hatalı denemeden sonra her deneme yavaşlatılır (doğru şifreyi bilen kilitlenmez) |
| Yönetim ekranları | Her sayfa ve her işlem ayrı ayrı oturum doğrular |
| PDF erişimi | Dosyalar web kökünün dışında; yayından kaldırılan bültenler sunulmaz |
| Yükleme | Yalnızca gerçek PDF (dosya imzası kontrol edilir), en fazla 25 MB, diskte rastgele ad |
| Anket | Tahmin edilemez bağlantı, cihaz başına tekrar ve hız sınırı |
| CSV çıktısı | Formül olarak yorumlanabilecek hücreler etkisizleştirilir (Excel) |
| Veritabanı | Tüm sorgular parametreli (SQL enjeksiyonuna kapalı) |
| Tarayıcı | CSP, nosniff, çerçeveleme ve referrer başlıkları; dış kaynak yüklenmez |
| Dosya izinleri | `.env` ve `data\` yalnızca SYSTEM ve yöneticilere açık |
| İşlem kaydı | Girişler ve yönetim işlemleri `audit_log` tablosuna yazılır |

`.env` dosyası oturumları imzalayan gizli anahtarı tutar: **paylaşmayın,**
e-posta ile göndermeyin. Anahtar değişirse açık oturumlar düşer (zararsızdır).

---

## Yedekleme

Her şey `data\` klasöründedir: veritabanı, yüklenen PDF'ler ve oturum
anahtarı. Yedek için bu klasörü kopyalamak yeterlidir.

> Kurulum script'i bu klasörün izinlerini kısıtlar; yedek komutunu yönetici
> olarak çalıştırın.

```powershell
Copy-Item C:\seckportal\data "\\yedek-sunucu\seck\data-$(Get-Date -f yyyyMMdd)" -Recurse
```

Yedek alırken portalı durdurmak zorunlu değildir, ancak durdurulmuş hâlde
alınan yedek daha tutarlı olur.

---

## IIS ile 80/443 üzerinden yayınlamak (HTTP/HTTPS)

Bu paket **doğrudan bir IIS uygulaması** olarak hazırlandı: kökünde `web.config`
dosyası var, yolları görecelidir, düzenleme gerektirmez. IIS'te bu klasörü
gösteren bir site oluşturmak yeterlidir.

**Kurulması gereken tek şey:** HttpPlatformHandler 1.2 —
<https://www.iis.net/downloads/microsoft/httpplatformhandler>

> IIS, PHP veya .NET uygulamalarını doğrudan çalıştırır ama **Node.js
> uygulamalarını çalıştıramaz.** Portal bir Node.js uygulamasıdır; IIS ile
> Node arasında bir köprü modülü gerekir. Node.js'in kendisi paketle geliyor.
> Sunucuda internet yoksa MSI'ı başka bir bilgisayara indirip kopyalayın.

Sonra:

```powershell
cd C:\seckportal
powershell -ExecutionPolicy Bypass -File .\iis\iis-kur.ps1 -HostAdi seck.turkishfuel.com
```

Script kurulu eklentilere bakıp modu kendisi seçer; uygulama havuzunu, siteyi,
izinleri ve sertifikayı ayarlar. QDMS ile aynı sunucuda, aynı portu farklı ana
bilgisayar adlarıyla paylaşarak yan yana çalışır.

### Çalışmazsa

```powershell
powershell -ExecutionPolicy Bypass -File .\iis\iis-kontrol.ps1
```

Hiçbir şeyi değiştirmez; neyin eksik olduğunu sırayla söyler ve çıktıyı
`iis-tani.txt` dosyasına yazar.

**Ayrıntılı anlatım, elle kurulum, hata kodlarına göre çözüm tablosu:
[`iis\IIS.md`](iis/IIS.md)**

---

## Yükseltme (yeni sürüm geldiğinde)

1. Portalı durdurun: `Stop-ScheduledTask -TaskName 'SEC-K Portali'`
2. **`data\` klasörünü ve `.env` dosyasını bir yere kopyalayın.**
3. Yeni paketi açın, eski klasörün yerine koyun.
4. Kopyaladığınız `data\` klasörünü ve `.env` dosyasını geri koyun.
5. Başlatın: `Start-ScheduledTask -TaskName 'SEC-K Portali'`

Veritabanı şeması geriye dönük uyumludur; yeni tablolar açılışta
kendiliğinden oluşturulur.

---

## Bu paket nasıl çalışıyor

Portal Next.js ile yazıldı ve burada **derlenmiş** hâlde geliyor: çalışmak
için gereken tüm JavaScript modülleri `node_modules` içinde hazır.

Tek istisna SQLite. Bu paket işletim sistemine göre derlenmiş bir `.node`
dosyası kullanır ve paket Linux üzerinde hazırlandığı için içindeki dosya
Windows'ta çalışmaz. Bu yüzden `sqlite-ikili\` klasöründe Node 20 ve Node 22
için **Windows x64 hazır ikilileri** duruyor; `baslat.cjs` çalıştığı Node
sürümüne uygun olanı yerine kopyalıyor. Sunucuda derleyiciye gerek kalmıyor.

Yönetim komutları da (`komutlar\`) düz JavaScript'e derlendi, böylece
TypeScript veya `tsx` kurulumu gerekmiyor.

---

## Sorun giderme

**`kur.ps1` çalışmıyor — "is not digitally signed"**
Script'i şu biçimde çağırın:
`powershell -ExecutionPolicy Bypass -File .\kur.ps1`

**"Bu paket Node.js 20 veya 22 ile çalışır"**
Bu mesajı görüyorsanız pakette `node\node.exe` bulunamamış ve sistemdeki
sürüm uyumsuz demektir. Arşivi eksiksiz açtığınızdan emin olun (`node.exe`
yaklaşık 70 MB'dır). Farklı bir Node kullanmak için:
`.\kur.ps1 -NodeExe "C:\yol\node.exe"`

**Port 3000 kullanılıyor**
`.\kur.ps1 -Port 8080` ile farklı port seçin. Kurulum yapıldıysa `.env`
içindeki `PORT` değerini değiştirip görevi yeniden başlatın:
`Stop-ScheduledTask -TaskName 'SEC-K Portali'; Start-ScheduledTask -TaskName 'SEC-K Portali'`

**Ağdaki başka bilgisayarlardan açılmıyor**
Güvenlik duvarı kuralı, script yönetici olarak çalıştırıldığında ekleniyor.
Elle eklemek için:
`New-NetFirewallRule -DisplayName "SEC-K" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Domain,Private`

**Şifreyi kaybettim**
`nodejs.cmd komutlar\sifre.cjs` — bültenler ve anketler silinmez.

**Portal açılıyor ama logolar görünmüyor**
`public\brand\` klasörünün paketle birlikte kopyalandığından emin olun.

**Bültenler kayboldu**
`data\` klasörü yerinde mi? Veritabanı ve PDF'ler orada tutulur. Yükseltme
yaptıysanız eski `data\` klasörünü geri koymayı atlamış olabilirsiniz.
