# Localde deneme rehberi

Bu portalı kendi bilgisayarınızda çalıştırıp denemek için hazırlanmıştır.
Sunucuya kurulum gerekmez, hiçbir şeye kalıcı olarak yüklenmez — denedikten
sonra klasörü silmeniz yeterlidir.

---

## 1. Node.js kurulu mu?

Bir komut satırı açın (Windows'ta **PowerShell**, Mac'te **Terminal**) ve yazın:

```
node -v
```

- `v20.x` veya üzeri bir sürüm görüyorsanız hazırsınız.
- "komut bulunamadı" diyorsa <https://nodejs.org> adresinden **LTS** sürümünü
  kurun, sonra komut satırını kapatıp yeniden açın.

> `npm install` adımı bir kez internete çıkar (paketleri indirir). Kurumsal ağda
> npm erişimi kapalıysa bu adımı internete çıkabilen bir bilgisayarda yapıp
> klasörün tamamını (`node_modules` dahil) taşıyabilirsiniz.

### Windows: "npm.ps1 cannot be loaded" hatası alırsanız

PowerShell varsayılan olarak imzasız script'leri engeller ve `npm` komutu
`npm.ps1` üzerinden çalıştığı için şu hatayı verir:

```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded.
The file is not digitally signed. ... UnauthorizedAccess
```

Bu, Node.js'in kurulmadığı anlamına **gelmez** — sadece PowerShell'in
kısıtlamasıdır. Sistem ayarı değiştirmeden çözmenin iki yolu var:

1. **`npm` yerine `npm.cmd` yazın** (en kolay):
   ```
   npm.cmd install
   npm.cmd run seed
   npm.cmd run demo
   npm.cmd run dev
   ```
2. Ya da PowerShell yerine **Komut İstemi (cmd.exe)** açıp normal `npm install`
   yazın — orada bu kısıt yoktur.

> Yürütme politikasını kalıcı olarak değiştirmek de mümkündür
> (`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`),
> ancak bu bir sistem ayarıdır ve kurumsal bilgisayarlarda grup ilkesiyle
> engellenmiş olabilir. Denemek için gerekmez; yukarıdaki `npm.cmd` yeterlidir.

---

## 2. Klasöre girin

Arşivi açtıysanız:

```
cd sec-k-portal
```

**Windows PowerShell** kullanıyorsanız, örneğin Masaüstü'ne açtıysanız:

```
cd $HOME\Desktop\sec-k-portal
```

### Klasörü OneDrive içine koymayın

Projeyi `OneDrive\Masaüstü\...` gibi senkronlanan bir klasörde çalıştırmayın:

- `npm install` on binlerce dosya oluşturur (`node_modules`). OneDrive bunları
  senkronlamaya çalışır; kurulum çok yavaşlar ve dosya kilitleme hataları verir.
- Portalın veritabanı SQLite'tır (`data/portal.db`). OneDrive açık dosyaya
  müdahale ederse veritabanı bozulabilir.

Senkronlanmayan bir yere taşıyın, örneğin `C:\seckportal`:

```
Move-Item "$HOME\OneDrive\Masaüstü\seckportal" C:\seckportal
cd C:\seckportal\sec-k-portal
```

Yolda Türkçe karakter bulunması (`Masaüstü` gibi) da bazı araçlarda sorun
çıkarabilir; `C:\seckportal` bu riski de ortadan kaldırır.

---

## 3. Üç komut

Sırayla çalıştırın:

```
npm install
npm run seed
npm run demo
```

| Komut | Ne yapar |
|---|---|
| `npm install` | Gerekli paketleri indirir (1–2 dakika, bir kez) |
| `npm run seed` | Veritabanını kurar, 4 sekmeyi ve **admin hesabını** oluşturur |
| `npm run demo` | Görmek için 12 örnek bülten + 1 anket + 48 cevap ekler |

> **PowerShell'de `npm.ps1 cannot be loaded` hatası alırsanız** bu rehberdeki tüm
> `npm` komutlarını `npm.cmd` olarak yazın (ör. `npm.cmd install`). Ayrıntı:
> 1. adımdaki not.

> **`npm run seed` çıktısındaki kullanıcı adı ve şifreyi bir yere not edin.**
> Şifre her kurulumda rastgele üretilir. Şuna benzer bir kutu göreceksiniz:
>
> ```
>   ┌─────────────────────────────────────────────┐
>   │  ADMIN GİRİŞ BİLGİLERİ                      │
>   ├─────────────────────────────────────────────┤
>   │  Kullanıcı adı : admin                      │
>   │  Şifre         : gh0Z62qPN7Ac               │
>   └─────────────────────────────────────────────┘
> ```

Kendi şifrenizi belirlemek isterseniz `npm run seed` yerine:

- **Windows PowerShell:**
  ```
  $env:SECK_ADMIN_PASSWORD="Deneme1234"; npm run seed
  ```
- **Mac / Linux:**
  ```
  SECK_ADMIN_PASSWORD="Deneme1234" npm run seed
  ```

---

## 4. Başlatın

```
npm run dev
```

Tarayıcıdan açın: **<http://localhost:3000>**

Durdurmak için komut satırında **Ctrl + C**.

---

## 5. Neye bakmalı

### Genel portal

| Nerede | Ne deneyin |
|---|---|
| Ana sayfa | **Öneri Bildirim** ve **Olay Bildirim** kartları QDMS'i yeni sekmede açar |
| Sekmeler | SEÇ-K / SMS / İGA / THY — üstteki sekmelerden geçin |
| Ana sayfa arama | Üstteki kutuya `ucak` yazın — **Ara'ya basmadan** eşleşen bültenler altta listelenir; birini seçince o bülten açılır. Ok tuşları + Enter da çalışır |
| | Tüm sonuçları görmek için **Ara** düğmesi |
| Bülten sayfası | Soldaki **indekste** arama yapın: `2026-01`, `yakit`, `sec`, `atik` |
| Bülten satırı | **Satıra tıklayın → bülten sağda açılır, inmez.** İndirmek için satırdaki ↓ simgesi ya da sağdaki **PDF indir** düğmesi |
| Adres çubuğu | Bülten seçtikçe `?bulten=…` değişir — bağlantıyı kopyalayıp paylaşabilirsiniz |
| Telefon | Aynı adresi telefondan da açabilirsiniz (aşağıdaki nota bakın) |

> **Türkçe arama testi:** indekse `sec` yazın — SEÇ-K bültenleri çıkar.
> `yakit` yazın — "Yakıt İkmali" bulunur. Türkçe karakter yazmak zorunda değilsiniz.

### Yönetim paneli

Sağ üstteki **YÖNETİM** düğmesi → 3. adımdaki kullanıcı adı ve şifre.

| Bölüm | Ne deneyin |
|---|---|
| **Bültenler** | **+ Bülten yükle** ile bilgisayarınızdan bir PDF yükleyin, sonra genel sayfada görün |
| | Bir bülteni **Yayından kaldır** — portalda kaybolur, panelde "Taslak" olur |
| **Sekmeler** | **Yeni sekme ekle** (ör. "ISG Bültenleri") → üst menüde anında çıkar |
| | Sekmeleri ↑ ↓ ile sıralayın |
| **Anketler** | **Analiz** düğmesi → grafikler, puan ortalamaları, serbest metin cevapları |
| | Tarih / departman **filtresi** → grafikler yenilenir |
| | **CSV indir** → Excel'de açın, Türkçe karakterler bozuk olmamalı |
| | **Düzenle / QR** → QR kodu, **PNG/SVG indir**, **asılacak afişi yazdır** |
| | **+ Yeni anket** → soru ekleyin, **Yayınla**, QR'ı telefonla okutup doldurun |
| **Ayarlar** | Portal metinleri, QDMS kart başlıkları, duyuru bandı ve tonu, şifre |
| | **PDF önizlemesini kapatıp** bülten sayfasına dönün — tıklama artık indirir |
| | Ana sayfadaki bülten sayısını 3 yapıp ana sayfayı yenileyin |
| | Duyuru metni yazıp tonunu **Kritik** seçin — üstte dolu kırmızı bant çıkar |

---

## Telefondan denemek (QR kodu okutmak için)

QR kodu telefonla okutmak isterseniz portala telefondan erişebilmesi gerekir.
Bilgisayarınızın yerel IP adresini bulun:

- **Windows:** `ipconfig` → "IPv4 Adresi" (ör. `192.168.1.25`)
- **Mac:** `ipconfig getifaddr en0`

Sonra sunucuyu şu şekilde başlatın:

```
npm run dev
```

Komut çıktısında **Network:** satırındaki adresi telefondan açın
(ör. `http://192.168.1.25:3000`). Telefon ve bilgisayar aynı Wi-Fi'de olmalı.

QR kodunun bu adresi göstermesi için sunucuyu şöyle başlatmanız gerekir
(kendi IP'nizi yazın):

- **Windows PowerShell:**
  ```
  $env:SECK_BASE_URL="http://192.168.1.25:3000"; npm run dev
  ```
- **Mac / Linux:**
  ```
  SECK_BASE_URL="http://192.168.1.25:3000" npm run dev
  ```

> Windows güvenlik duvarı ilk seferde izin sorabilir — "İzin ver" deyin.

---

## Sık karşılaşılanlar

**"Port 3000 kullanılıyor"**
Başka bir port kullanın: `npm run dev -- -p 3001`

**Örnek verileri silmek istiyorum**
```
npm run demo -- --temizle
```
Kendi yüklediğiniz bültenler silinmez, yalnızca demo verisi gider.

**Her şeyi sıfırdan başlatmak istiyorum**
`data` klasörünü silin, sonra `npm run seed` çalıştırın. Bu klasörde
veritabanı ve yüklenen PDF'ler durur — sildiğinizde her şey sıfırlanır.

**Şifremi unuttum / mevcut şifreyi nereden görebilirim?**
Şifre tek yönlü hashlenerek saklandığı için hiçbir yerden okunamaz — yalnızca
`npm run seed` çalıştığı anda ekrana yazılır. Komut satırında yukarı
kaydırırsanız o kutu duruyor olabilir.

Bulamazsanız yenisini belirleyin — bültenler ve anketler silinmez:

```
npm run sifre                          rastgele yeni şifre üretir ve yazar
npm run sifre -- --sifre=Deneme12345   şifreyi kendiniz belirlersiniz
npm run sifre -- --liste               hesapları listeler
```

Giriş yaptıktan sonra **Yönetim → Ayarlar → Şifre Değiştir** ile de
değiştirebilirsiniz.

**Logoyu değiştirmek istiyorum**
Kurumsal logolar `public/brand/` altında hazır (`logo-beyaz.png` koyu zemin,
`logo.png` açık zemin, `app/icon.png` sekme simgesi). Değiştirmek için aynı
adla üzerine yazmanız yeterli; `.svg` de kabul edilir.

---

Sunucuya yayın adımları (Windows/IIS ve Linux) ve teknik ayrıntılar için
`README.md` dosyasına bakın.
