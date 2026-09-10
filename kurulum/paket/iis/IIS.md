# SEÇ-K Portalı — IIS üzerinden yayın

## Bu sunucuda durum

Portal bir **Node.js** uygulamasıdır. IIS, Node.js'i kendi başına
çalıştıramaz; arada bir köprü modülü gerekir. Bu modül isteği alır, bir port
seçip programı başlatır ve istekleri o porta aktarır.

`A8SOTIMDMV01P` sunucusunda kurulu modüller (IIS Yöneticisi → Modüller):

| Modül | Durum | Kullanımı |
|---|---|---|
| **AspNetCoreModuleV2** | ✔ kurulu | **Kullandığımız yol** — kökteki `web.config` |
| ApplicationRequestRouting | ✔ kurulu | Ters vekil (ayrı süreç gerekir) |
| RewriteModule | ✔ kurulu | HTTP→HTTPS yönlendirme |
| HttpPlatformHandler | ✘ yok | — |
| iisnode | ✘ yok | — |

**AspNetCoreModuleV2 işi çözüyor ve kurulum gerektirmiyor.** Modül ASP.NET
Core için yazıldı ama `hostingModel="OutOfProcess"` modunda yaptığı iş
geneldir: `processPath` ile verilen programı başlatır, boş bir port seçip
`ASPNETCORE_PORT` ortam değişkeniyle bildirir, istekleri o porta aktarır,
program çökerse yeniden başlatır. Başlattığı programın .NET olma zorunluluğu
yoktur — biz paketle gelen `node.exe`'yi başlatıyoruz.

```
Tarayici  =[HTTP/HTTPS]=>  IIS  =>  AspNetCoreModuleV2  =>  node.exe
                                                            (127.0.0.1)
```

Portal yalnızca `127.0.0.1` dinler; dışarıya açık tek kapı IIS'tir. HTTPS'i
IIS bitirir.

---

## Kurulum: dosyaları kopyala → IIS'te göster → Browse

Ayrıntılı adımlar `KURULUM.md` dosyasında. Özet:

1. İki arşivi aynı klasöre açın
2. Site → *Temel Ayarlar* → fiziksel yol **paketin kökü**
3. Havuz → *.NET CLR sürümü* = **Yönetilen Kod Yok**;
   *Gelişmiş*: 32 bit **False**, boşta kalma **0**, geri dönüşüm **0**
4. `data\` klasörüne havuz kimliği (`IIS AppPool\<havuz>`) için **Değiştir** izni
5. **Browse**

Portal ilk açılışta veritabanını, dört bülten sekmesini ve `admin` hesabını
kendisi oluşturur — hiçbir komut çalıştırmanız gerekmez.

---

## Modülü değiştirmek gerekirse

Kökteki `web.config` AspNetCoreModuleV2 içindir. Başka bir modüle geçmek için
ilgili dosyayı kökteki `web.config` üzerine kopyalayın:

| Dosya | Hangi modül | Notu |
|---|---|---|
| `iis\web.config.ancm` | AspNetCoreModuleV2 | varsayılan; kökteki dosyanın yedeği |
| `iis\web.config.iis` | HttpPlatformHandler 1.2 | modül kurulursa; `processPath` yolunu düzeltin |
| `iis\web.config.vekil` | URL Rewrite + ARR | portalı ayrıca çalıştıran bir süreç gerekir |
| `iis\web.config.bilgi` | (hiçbiri) | 500.19 yerine `kurulum.html` bilgi sayfasını gösterir |

Dosyayı Windows Gezgini'nde kopyalayıp adını `web.config` yapmanız yeterli;
komut satırına gerek yok. Değişiklikten sonra IIS Yöneticisi'nde siteyi
*Yeniden Başlat* deyin.

---

## Portal açılmazsa: hatayı nerede göreceksiniz

Tarayıcıdaki hata kodu yalnızca *nerede* takıldığını söyler; **gerçek sebep
Node'un kendi çıktısındadır** ve şu klasöre yazılır:

```
<paket klasörü>\data\iis-log\portal_*.log
```

Bu dosya klasörden çift tıklayarak açılabilir. Portal başlayamadığında
sebebini ve yapılması gerekeni buraya yazar (örneğin `data\` klasörüne yazma
izni verilmesi gerektiğini). Dosya **hiç oluşmadıysa** modül süreci hiç
başlatmamış demektir — o zaman aşağıdaki tablodaki 500.19 / 500.31 / 503
satırlarına bakın.

`iis-log\` klasörü yoksa elle oluşturun ve havuz kimliğine yazma izni verin;
modül günlük dosyasını kendisi yaratamazsa sessizce vazgeçer.

IIS'in kendi günlükleri (istek bazlı): `%SystemDrive%\inetpub\logs\LogFiles`

> Sunucuda komut satırı erişiminiz varsa `iis\iis-kontrol.ps1` eksikleri
> sırayla söyleyip çıktıyı `iis-tani.txt` dosyasına yazar; **hiçbir şeyi
> değiştirmez.** Yetkiniz yoksa gerek de yok — yukarıdaki günlük dosyası
> aynı bilgiyi veriyor.

---

## Hata kodlarına göre çözüm

Hepsi IIS Yöneticisi'nden çözülebilir; komut satırı gerekmez.

| Ne görüyorsunuz | Nedeni | Çözüm |
|---|---|---|
| **500.19** `0x8007000d` | `web.config` IIS'in tanımadığı bir bölüm içeriyor — kökteki dosya AspNetCoreModuleV2 ister, bu modül sunucuda yoksa bu hatayı verir | Modüller listesinde `AspNetCoreModuleV2` var mı diye bakın. Yoksa `iis\web.config.bilgi` dosyasını `web.config` yapın (site açılır, bilgi sayfası gösterir) ve durumu bize bildirin |
| **500.19** başka kod | `web.config` okunamıyor veya bozuk | Havuz kimliğinin paket klasörüne **Okuma** izni olduğundan emin olun; `iis\web.config.ancm` dosyasını kökteki `web.config` üzerine kopyalayın |
| **500.30** / **500.31** | Modül `node.exe`'yi başlattı ama süreç ayağa kalkmadı | `data\iis-log\` altındaki günlüğü okuyun. `node\node.exe` dosyası yerinde mi (ikinci arşiv açıldı mı) diye bakın |
| **502.5** / "Process failure" | Node süreci başladı ve öldü, ya da hiç başlamadı | Günlüğü okuyun; en sık sebep `data\` klasörüne yazma izni olmaması → klasör > *Özellikler* > *Güvenlik* > *Ekle* > `IIS AppPool\<havuz adı>` > **Değiştir** |
| **403.14** "Directory listing denied" | Handler devreye girmiyor, IIS klasörü statik sunmaya çalışıyor | Havuz *.NET CLR sürümü* = **Yönetilen Kod Yok** mu? Site fiziksel yolu `web.config`'in bulunduğu klasör mü? |
| **404** ana sayfada | Site başka bir klasöre bakıyor | Site → *Temel Ayarlar* → fiziksel yol **paketin kökü** olmalı, alt klasör değil |
| **HTTP 503** | Uygulama havuzu durmuş | IIS Yöneticisi → Uygulama Havuzları → havuz → **Başlat**. Tekrar duruyorsa Olay Görüntüleyici → Uygulama günlüğüne bakın |
| Sayfa açılıyor, **giriş yapılamıyor** | `SECK_SECURE_COOKIE=true` ama site HTTP üzerinden açılıyor | `.env` içinde `false` yapın veya HTTPS bağlaması ekleyin, sonra siteyi yeniden başlatın |
| İlk açılış **çok yavaş**, sonra düzeliyor | İlk istekte veritabanı ve hesaplar oluşturuluyor | Normal; bir kereliktir. `startupTimeLimit` 120 saniyeye ayarlı |
| **Bültenler kayboldu** | Yükseltmede `data\` klasörü üzerine yazıldı | Eski `data\` klasörünü geri koyun; arşivi açarken bu klasörü hariç tutun |
| QR kodu **yanlış adres** gösteriyor | `.env` içindeki `SECK_BASE_URL` | Dış adresle aynı yapın, siteyi yeniden başlatın |
| **502.3** (yalnızca ters vekil modunda) | Portal süreci ayakta değil | O modda süreci IIS başlatmaz; ANCM moduna dönün |

---

## HTTPS

Sertifika IIS'te durur; portal tarafında sertifika işi yoktur.

1. Site → *Bağlamalar* → **Ekle** → tür `https`, port 443, ana bilgisayar adı,
   *Sunucu Adı Belirtme Gerektir* işaretli, sertifikayı listeden seçin
2. Paket kökündeki `.env` dosyasına (yoksa oluşturun) iki satır:

```
SECK_BASE_URL=https://seck.turkishfuel.com
SECK_SECURE_COOKIE=true
```

3. IIS Yöneticisi → siteyi **Yeniden Başlat**

`SECK_SECURE_COOKIE` **yalnızca HTTPS** varken `true` olmalı; HTTP'de `true`
yaparsanız tarayıcı oturum çerezini göndermez ve yönetim paneline giriş
yapılamaz.

**HTTP'yi HTTPS'e zorlamak:** `RewriteModule` kurulu olduğu için Site →
*URL Yeniden Yazma* → *Kural Ekle* → *Boş kural* ile yapılabilir; hazır kural
metni `KURULUM.md` içindedir.

---

## Kurulumdan sonra

| İş | IIS Yöneticisi'nden | Komut satırı varsa |
|---|---|---|
| Durdur | Site → **Durdur** | `appcmd stop site "SEC-K Portali"` |
| Başlat | Site → **Başlat** | `appcmd start site "SEC-K Portali"` |
| Yeniden başlat (`.env` değişince) | Uygulama Havuzları → havuz → **Geri Dönüştür** | `appcmd recycle apppool "SEC-K Portali"` |
| Sürüm yükseltme | Siteyi durdur → dosyaları üzerine kopyala (`data\` hariç) → Başlat | (aynı) |
| Şifre sıfırlama | Yönetim panelinden (Ayarlar → Şifre Değiştir) | `nodejs.cmd komutlar\sifre.cjs` |

`.env` dosyasını değiştirdikten sonra süreç **yeniden başlamalıdır**, aksi
halde eski değerler kullanılmaya devam eder.

Yönetici şifresini bilmiyorsanız ve komut satırı da yoksa: `data\portal.db`
dosyasını yedekleyip klasörden kaldırın; portal bir sonraki açılışta
veritabanını ve `admin` / `Tfs2026...` hesabını yeniden oluşturur. **Bu
işlem bültenleri ve anket yanıtlarını da siler** — yalnızca son çare olarak
kullanın.

---

## QDMS ile aynı sunucuda

Aynı portu (80/443) farklı ana bilgisayar adlarıyla paylaşabilirsiniz; site
bağlamasına ana bilgisayar adı yazmanız yeterli. Ayrı bir port da
kullanılabilir — bu sunucuda portal için **9092** ayrıldı.

Portal süreci yalnızca `127.0.0.1` üzerinde, IIS'in seçtiği rastgele bir
portta dinler; güvenlik duvarında ek bir kural açmanız gerekmez.

---

## Yedekleme

Her şey `data\` klasöründedir: veritabanı, yüklenen PDF'ler, oturum anahtarı
ve IIS günlükleri. Klasörü olduğu gibi kopyalamak yeterlidir.

```powershell
Copy-Item <paket>\data "\\yedek-sunucu\seck\data-$(Get-Date -f yyyyMMdd)" -Recurse
```

Veritabanı açıkken kopyalanırsa tutarsız olabilir; sağlıklı bir yedek için
önce siteyi durdurun (Site → **Durdur**), kopyalayın, sonra başlatın.
