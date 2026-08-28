# SEÇ-K Portalı — sunucu kurulumu

Bu klasör **derlenmiş yayın paketidir.** `npm install` gerekmez, internet
gerekmez, Python veya Visual Studio derleyicisi gerekmez.

**Tek gereksinim: Node.js 20 veya 22.**

---

## Kurulum

### 1. Node.js kurulu mu?

```
node -v
```

`v20.x` veya `v22.x` görüyorsanız hazırsınız. Aksi halde
<https://nodejs.org/en/download> adresinden **Node.js 20 LTS** Windows
Installer (.msi) kurun, sonra komut penceresini **kapatıp yeniden açın**.

> Node 16 ile çalışmaz. Sunucunuzda Node 16 varsa MSI kurulumu onu
> günceller; ayrıca kaldırmanız gerekmez.

### 2. Klasörü yerine koyun

Paketi kalıcı bir yere taşıyın — örneğin `C:\seckportal`. Şunlardan kaçının:

- Kullanıcı masaüstü veya `OneDrive` klasörleri (otomatik başlatma görevi
  SYSTEM hesabıyla çalışır ve buralara yazamayabilir)
- Yolunda parantez bulunan klasörler (`seckportal (1)` gibi)

### 3. Kurulum script'ini çalıştırın

Yönetici olarak açılmış PowerShell'de:

```powershell
cd C:\seckportal
powershell -ExecutionPolicy Bypass -File .\kur.ps1
```

Script sırayla: `.env` oluşturup oturum anahtarı üretir → veritabanını kurar
ve **admin şifresini ekrana yazar** → açılışta otomatik başlatma görevini
oluşturur → güvenlik duvarında portu iç ağa açar → portalı başlatır.

> **Ekrana yazılan kullanıcı adı ve şifreyi kaydedin.** Şifre tek yönlü
> hashlenerek saklandığı için sonradan görüntülenemez.

Seçenekler:

```powershell
.\kur.ps1 -AdminSifre "Guclu1Sifre" -BaseUrl "http://seck.turkishfuel.com"
.\kur.ps1 -Port 8080
.\kur.ps1 -GorevAtla        # otomatik başlatma görevi kurulmasın
```

### 4. Açın

```
http://localhost:3000
```

Ağdaki diğer bilgisayarlardan: `http://<sunucu-adı>:3000`

---

## Elle başlatma

Otomatik başlatma görevi kurmadıysanız veya elle çalıştırmak isterseniz:

```
node baslat.cjs
```

Durdurmak için `Ctrl + C`.

---

## Günlük yönetim

| İş | Komut |
|---|---|
| Durdur | `Stop-ScheduledTask -TaskName 'SEC-K Portali'` |
| Başlat | `Start-ScheduledTask -TaskName 'SEC-K Portali'` |
| Durum | `Get-ScheduledTask -TaskName 'SEC-K Portali'` |
| Şifre sıfırla | `node komutlar\sifre.cjs` |
| Hesapları listele | `node komutlar\sifre.cjs --liste` |
| Örnek veri ekle | `node komutlar\demo.cjs` |
| Örnek veriyi sil | `node komutlar\demo.cjs --temizle` |

Ayrıntı: `komutlar\OKU.txt`

---

## Yedekleme

Her şey `data\` klasöründedir: veritabanı, yüklenen PDF'ler ve oturum
anahtarı. Yedek için bu klasörü kopyalamak yeterlidir.

```powershell
Copy-Item C:\seckportal\data "\\yedek-sunucu\seck\data-$(Get-Date -f yyyyMMdd)" -Recurse
```

Yedek alırken portalı durdurmak zorunlu değildir, ancak durdurulmuş hâlde
alınan yedek daha tutarlı olur.

---

## IIS ile 80/443 üzerinden yayınlamak

Portal kendi web sunucusunu 3000 portunda çalıştırır. IIS'te
**Application Request Routing** ile ters vekil kurup gelen istekleri
`http://localhost:3000` adresine yönlendirin. QDMS ile aynı sunucuda yan
yana çalışır.

Ters vekil arkasında `.env` dosyasında şunları ayarlayın:

```
SECK_BASE_URL=https://seck.turkishfuel.com
SECK_SECURE_COOKIE=true
```

`SECK_SECURE_COOKIE` **yalnızca HTTPS** kullanıyorsanız `true` olmalı;
HTTP'de `true` yaparsanız yönetim paneline giriş yapılamaz.

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
`node -v` ile sürümü kontrol edin. Node 16/18 veya 24+ ile paketteki SQLite
ikilisi uyumsuzdur. Node 20 LTS kurun.

**Port 3000 kullanılıyor**
`.\kur.ps1 -Port 8080` ile farklı port seçin. Kurulum yapıldıysa `.env`
içindeki `PORT` değerini değiştirip görevi yeniden başlatın.

**Ağdaki başka bilgisayarlardan açılmıyor**
Güvenlik duvarı kuralı, script yönetici olarak çalıştırıldığında ekleniyor.
Elle eklemek için:
`New-NetFirewallRule -DisplayName "SEC-K" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Domain,Private`

**Şifreyi kaybettim**
`node komutlar\sifre.cjs` — bültenler ve anketler silinmez.

**Portal açılıyor ama logolar görünmüyor**
`public\brand\` klasörünün paketle birlikte kopyalandığından emin olun.

**Bültenler kayboldu**
`data\` klasörü yerinde mi? Veritabanı ve PDF'ler orada tutulur. Yükseltme
yaptıysanız eski `data\` klasörünü geri koymayı atlamış olabilirsiniz.
