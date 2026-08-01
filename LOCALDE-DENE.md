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
| Bülten sayfası | Soldaki **indekste** arama yapın: `2026-01`, `yakit`, `sec`, `atik` |
| Bülten kartı | **Kartın üzerine tıklayın → PDF iner.** Dosya adı bülten no + konu olur |
| "Görüntüle" | PDF'i indirmeden tarayıcıda okur |
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
| **Anketler** | **Analiz** düğmesi → grafikler, NPS skoru, serbest metin cevapları |
| | Tarih / departman **filtresi** → grafikler yenilenir |
| | **CSV indir** → Excel'de açın, Türkçe karakterler bozuk olmamalı |
| | **Düzenle / QR** → QR kodu, **PNG/SVG indir**, **asılacak afişi yazdır** |
| | **+ Yeni anket** → soru ekleyin, **Yayınla**, QR'ı telefonla okutup doldurun |
| **Ayarlar** | Portal adı, QDMS adresleri, duyuru bandı, şifre değiştirme |

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

**Şifremi unuttum**
`data` klasörünü silip `npm run seed` çalıştırın (bültenler de silinir), ya da
yeni şifreyle tekrar kurmak için 3. adımdaki `SECK_ADMIN_PASSWORD` yöntemini
kullanın.

**Logoyu görmek istiyorum**
`public/brand/` klasörüne `logo-beyaz.svg` (koyu zemin için) ve `logo.svg`
dosyalarını koyun, sayfayı yenileyin — otomatik kullanılır. Dosya yokken
kılavuza uygun geçici bir yazı logosu görünür.

---

Sunucuya yayın adımları (Windows/IIS ve Linux) ve teknik ayrıntılar için
`README.md` dosyasına bakın.
