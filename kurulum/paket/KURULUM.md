# SEÇ-K Portalı — sunucu kurulumu

Bu klasör **derlenmiş yayın paketidir.** Sunucuda hiçbir kurulum
gerektirmez: `npm install`, internet, Python, derleyici — hiçbiri gerekmez.

**Node.js kurmanız gerekmez:** portalın çalıştırıcısı `node\node.exe` olarak
paketin içinde geliyor (Node.js 20, nodejs.org'dan indirilip SHA-256 ile
doğrulanmış — ayrıntı `node\OKU.txt`). Sunucudaki Node sürümüne dokunulmaz,
böylece aynı sunucudaki diğer uygulamalar etkilenmez.

**IIS eklentisi kurmanız gerekmez:** paketle gelen `web.config`, IIS'te zaten
kurulu olan **AspNetCoreModuleV2** modülünü kullanıyor. Bu modül
`web.config`'te belirtilen programı başlatıp istekleri ona aktarıyor —
başlattığı programın .NET olma zorunluluğu yok, burada `node.exe`.

**Komut çalıştırmanız gerekmez:** portal ilk açılışta veritabanını, dört
bülten sekmesini ve yönetici hesabını kendisi oluşturuyor.

Yani yapılacak iş: **dosyaları kopyala → IIS'te siteyi göster → Browse.**

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

### 2. IIS Yöneticisi'nde üç ayar

**a) Site paketin kökünü göstersin.**
Site → *Temel Ayarlar* → Fiziksel yol: paketin kök klasörü (`web.config`'in
yanındaki klasör), alt klasör değil.

**b) Uygulama havuzu.**
Uygulama Havuzları → sitenin havuzu → *Temel Ayarlar*:

| Ayar | Değer |
|---|---|
| .NET CLR sürümü | **Yönetilen Kod Yok** |

Aynı havuz → *Gelişmiş Ayarlar*:

| Ayar | Değer | Neden |
|---|---|---|
| 32 Bit Uygulamaları Etkinleştir | **False** | 64 bit `node.exe` çalıştırılıyor |
| Boşta Kalma Zaman Aşımı (dakika) | **0** | portal kapanmasın |
| Düzenli Aralıklarla Geri Dönüşüm (dakika) | **0** | gereksiz yeniden başlatma olmasın |

**c) `data\` klasörüne yazma izni.**
`data` klasörü → sağ tık → *Özellikler* → *Güvenlik* → *Düzenle* → **Ekle** →
kutuya `IIS AppPool\<havuz adı>` yazın → **Değiştir** iznini işaretleyin.

> Bu adım atlanırsa site **502.5** verir: portal veritabanını oluşturamaz.
> Gerçek hata her zaman `data\iis-log\` altındaki dosyada yazılıdır.

### Yönetim paneli giriş bilgileri

| | |
|---|---|
| Kullanıcı adı | `admin` |
| Şifre | `Tfs2026...` |

> **Bu varsayılan şifre bu belgede yazılı olduğu için gizli değildir.**
> İlk girişten sonra **Ayarlar → Şifre Değiştir**'den değiştirin.
> Değiştirilene kadar yönetim panelinin üstünde kırmızı bir uyarı şeridi
> görünür; şifreyi değiştirdiğinizde kendiliğinden kaybolur.

Başka bir başlangıç şifresi istiyorsanız, **ilk açılıştan önce** paket
köküne `.env` adlı bir metin dosyası koyun:

```
SECK_ADMIN_PASSWORD=KendiSifreniz123
```

Portal ilk açılışta hesabı bu şifreyle oluşturur. Hesap zaten oluştuysa bu
satırın etkisi olmaz — şifreyi panelden değiştirin.

### 3. Site → **Browse**

Portal açılır. İlk istek biraz uzun sürebilir: IIS o anda `node.exe`'yi
başlatıyor, portal da veritabanını ve yönetici hesabını oluşturuyor.

Açılmazsa gerçek hata şurada yazılıdır:

```
<paket klasörü>\data\iis-log\portal_*.log
```

---

## Portalı durdurmak / yeniden başlatmak

Süreci IIS yönetiyor, ayrı bir servis yok:

| İş | IIS Yöneticisi'nde |
|---|---|
| Durdur | Site → *Durdur* |
| Başlat | Site → *Başlat* |
| Yeniden başlat | Uygulama Havuzları → havuz → *Geri Dönüştür* |

Ayar dosyasını (`.env`) değiştirdikten sonra havuzu geri dönüştürmeniz
gerekir; aksi halde eski değerler kullanılmaya devam eder.

Komut satırı erişiminiz varsa portalı IIS dışında da çalıştırabilirsiniz:
`nodejs.cmd baslat.cjs` (durdurmak için `Ctrl + C`).

---

## Günlük yönetim

Günlük işlerin tamamı **yönetim panelinden** yapılır: bülten yükleme,
sekme ekleme, anket oluşturma, şifre değiştirme, analiz. Sunucuya girmeniz
gerekmez.

Komut satırı erişiminiz varsa ek araçlar (`komutlar\OKU.txt`):

| İş | Komut |
|---|---|
| Şifre sıfırla (panele giremiyorsanız) | `nodejs.cmd komutlar\sifre.cjs` |
| Hesapları listele | `nodejs.cmd komutlar\sifre.cjs --liste` |
| Örnek veri ekle | `nodejs.cmd komutlar\demo.cjs` |
| Örnek veriyi sil | `nodejs.cmd komutlar\demo.cjs --temizle` |

---

## Güvenlik

Kurulum sonrası **sizin yapmanız gereken iki şey** var:

1. **Varsayılan şifreyi değiştirin** (Ayarlar → Şifre Değiştir). Değiştirilene
   kadar panelde kırmızı uyarı şeridi durur. Şifre değiştiğinde o hesapla
   açılmış diğer tüm oturumlar kapanır.
2. **HTTPS'e geçin.** Sertifikayı IIS site bağlamasına ekleyip `.env`
   dosyasına `SECK_SECURE_COOKIE=true` yazın (aşağıdaki HTTPS bölümü) —
   oturum cookie'si yalnızca o zaman şifreli bağlantıyla sınırlanır.

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

> Portal çalışırken de kopyalanabilir; durdurulmuş hâlde alınan yedek daha
> tutarlı olur.

```powershell
Copy-Item C:\seckportal\data "\\yedek-sunucu\seck\data-$(Get-Date -f yyyyMMdd)" -Recurse
```

Yedek alırken portalı durdurmak zorunlu değildir, ancak durdurulmuş hâlde
alınan yedek daha tutarlı olur.

---

## HTTPS / sertifika

Sertifikayı **IIS yönetir**; portal tarafında yapılacak iş yalnızca iki
satırdır.

### 1. Sertifikayı siteye bağlayın

IIS Yöneticisi → site → *Bağlamalar* → **Ekle**:

| Alan | Değer |
|---|---|
| Tür | `https` |
| Port | 443 (veya size ayrılan port) |
| Ana bilgisayar adı | ör. `seck.turkishfuel.com` |
| Sunucu Adı Belirtme Gerektir (SNI) | işaretli (aynı IP'de başka HTTPS sitesi varsa) |
| SSL sertifikası | listeden seçin |

Sertifika listede çıkmıyorsa `LocalMachine\My` deposuna kurulu olmalıdır.

### 2. Paket köküne `.env` koyun

```
SECK_SECURE_COOKIE=true
SECK_BASE_URL=https://seck.turkishfuel.com
```

- `SECK_SECURE_COOKIE=true` → oturum cookie'si yalnızca şifreli bağlantıda
  gönderilir. **Yalnızca HTTPS varken açın:** HTTP üzerinden `true` yaparsanız
  yönetim paneline giriş yapılamaz (tarayıcı cookie'yi göndermez).
- `SECK_BASE_URL` → anket QR kodlarının içine gömülen adres. Dış adresle
  birebir aynı olmalı.

Ardından uygulama havuzunu geri dönüştürün (Uygulama Havuzları → havuz →
*Geri Dönüştür*).

### HTTP'yi HTTPS'e yönlendirmek

IIS'te URL Rewrite kurulu (sunucunuzda var). Site → *URL Rewrite* → yeni
kural → *Blank rule*:

- Match URL: pattern `(.*)`
- Condition: `{HTTPS}` matches `^OFF$`
- Action: **Redirect** → `https://{HTTP_HOST}/{R:1}`, tür *Found (302)*

301 yerine 302 seçin: tarayıcılar 301'i kalıcı önbelleğe alır ve HTTP'ye
dönmek gerekirse sorun çıkar.

---

## Başka IIS modülleriyle yayın

Bu paket üç farklı IIS modülüyle çalışabilir. Kökteki `web.config`
**AspNetCoreModuleV2** içindir (sunucunuzda kurulu olan). Diğerleri
`iis\` klasöründe hazır duruyor:

| Modül | Dosya |
|---|---|
| AspNetCoreModuleV2 | kökteki `web.config` (varsayılan) — yedeği `iis\web.config.ancm` |
| HttpPlatformHandler 1.2 | `iis\web.config.iis` |
| URL Rewrite + ARR (ters vekil) | `iis\web.config.vekil` |
| (hiçbiri) — 500.19 yerine bilgi sayfası | `iis\web.config.bilgi` |

Değiştirmek için ilgili dosyayı kökteki `web.config` üzerine kopyalayın.
Ayrıntı: `iis\IIS.md`

---

## Yükseltme (yeni sürüm geldiğinde)

1. IIS Yöneticisi → site → **Durdur**
2. **`data\` klasörünü ve varsa `.env` dosyasını bir yere kopyalayın.**
3. Yeni paketi açın, eski klasörün yerine koyun.
4. Kopyaladığınız `data\` klasörünü ve `.env` dosyasını geri koyun.
5. IIS Yöneticisi → site → **Başlat**

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

IIS ile bağlantıyı **AspNetCoreModuleV2** kuruyor. Bu modül `web.config`'te
yazan programı başlatır, ona boş bir port seçip `ASPNETCORE_PORT` ile
bildirir ve istekleri o porta aktarır. `baslat.cjs` bu değişkeni okuyup
Next'i o portta ve yalnızca `127.0.0.1` üzerinde çalıştırır — dışarıya açık
tek kapı IIS olur. Modül ASP.NET Core için yazılmış olsa da başlattığı
programın .NET olma zorunluluğu yoktur.

İlk kurulum da koda gömülü: portal açılışta veritabanı şemasını, dört bülten
sekmesini ve yönetici hesabını yoksa kendisi oluşturur (`bootstrap.cjs`).
İşlem fikirsizdir; var olan kayıtlara dokunulmaz, şifreniz her açılışta
sıfırlanmaz.

---

## Sorun giderme

Her durumda ilk bakılacak yer: **`data\iis-log\portal_*.log`** — portal
açılamazsa gerçek hata orada yazılıdır.

**HTTP 500.19** — `web.config` okunamıyor
IIS bir yapılandırma bölümünü tanımıyor. Kökteki `web.config`
AspNetCoreModuleV2 ister; sunucuda o modül yoksa `iis\` klasöründeki başka
bir sürümü kökteki `web.config` üzerine kopyalayın (bkz. "Başka IIS
modülleriyle yayın").

**HTTP 502.5** — portal süreci başlamıyor
Neredeyse her zaman `data\` klasörüne yazma izni eksiktir. `data` klasörü →
Özellikler → Güvenlik → `IIS AppPool\<havuz adı>` → **Değiştir**. Günlük
dosyası zaten hangi klasöre yazamadığını söyler.

**HTTP 503** — uygulama havuzu durmuş
Uygulama Havuzları → havuz → *Başlat*. Tekrar duruyorsa günlüğe bakın.

**HTTP 403.14** — dizin listesi hatası
Handler devreye girmiyor: havuzun *.NET CLR sürümü* **Yönetilen Kod Yok**
olmalı ve site paketin **kökünü** göstermeli.

**Sayfa açılıyor ama yönetim paneline giriş yapılamıyor**
`.env` içinde `SECK_SECURE_COOKIE=true` yazıyor ama site HTTP üzerinden
açılıyor. HTTPS'e geçin veya bu satırı `false` yapıp havuzu geri dönüştürün.

**"Bu paket Node.js 20 veya 22 ile çalışır"**
Pakette `node\node.exe` bulunamamış. Arşivi eksiksiz açtığınızdan emin olun;
bu dosya yaklaşık 70 MB'dır.

**Anket QR kodu yanlış adresi gösteriyor**
`.env` içindeki `SECK_BASE_URL` dış adresle aynı olmalı. Değiştirdikten sonra
havuzu geri dönüştürün.

**Şifreyi kaybettim**
Komut satırı erişiminiz varsa: `nodejs.cmd komutlar\sifre.cjs` — bültenler ve
anketler silinmez. Erişiminiz yoksa `data\portal.db` dosyasını yedekleyip
`admin_users` tablosundaki satırı silmek de olur; portal bir sonraki açılışta
hesabı varsayılan şifreyle yeniden oluşturur.

**Portal açılıyor ama logolar görünmüyor**
`public\brand\` klasörünün paketle birlikte kopyalandığından emin olun.

**Bültenler kayboldu**
`data\` klasörü yerinde mi? Veritabanı ve PDF'ler orada tutulur. Yükseltme
yaptıysanız eski `data\` klasörünü geri koymayı atlamış olabilirsiniz.
