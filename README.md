# SEÇ-K Portalı

Turkish Fuel Services şirket içi SEÇ-K portalı. Üç işi yapar:

1. **Bülten arşivi** — SEÇ-K / SMS / İGA / THY bültenleri PDF olarak yayımlanır.
   Solda bülten numarası, konu ve yayım tarihi içeren aranabilir indeks; bir
   satıra tıklayınca bülten **sağ tarafta okunabilir biçimde açılır**, indirme
   yalnızca “PDF indir” düğmesiyle olur.
2. **QDMS yönlendirme** — ana sayfada Öneri Bildirim ve Olay Bildirim için iki
   belirgin giriş noktası.
3. **Anket ve analiz** — QR kod ile dağıtılan anketler ve karar vericiye hazır
   sunulan soru/cevap analizleri.

Görünüm TFS Marka Kimlik Kılavuzu'na göre kurulmuştur (aşağıya bakın).

---

## Hızlı başlangıç (local)

Gereksinim: **Node.js 20 veya üzeri** (18.18+ çalışır, 22 ile test edildi).

> Adım adım anlatım ve deneme senaryoları için: **[LOCALDE-DENE.md](LOCALDE-DENE.md)**

```bash
npm install
npm run seed     # veritabanını kurar, sekmeleri ve ilk admin hesabını oluşturur
npm run dev      # http://localhost:3000
```

`npm run seed` çıktısında admin kullanıcı adı ve şifresi yazar — **kaydedin**.
İlk girişten sonra Yönetim → Ayarlar'dan şifreyi değiştirin.

Sabit bir şifre ile kurmak isterseniz:

```bash
SECK_ADMIN_USERNAME=furkan SECK_ADMIN_PASSWORD='guclu-bir-sifre' npm run seed
```

### Deneme verisi

Ekranları gerçekçi veriyle görmek için:

```bash
npm run demo               # 12 örnek bülten + 1 anket + 48 cevap ekler
npm run demo -- --temizle  # demo verisini geri alır
```

> Demo script'i yalnızca yerel deneme içindir; sunucuda çalıştırmayın.

### Kontroller

```bash
npm test          # birim testleri (Türkçe arama + anket analizi hesapları)
npx tsc --noEmit  # tip denetimi
npm run build     # üretim derlemesi
```

---

## Sayfalar

### Herkese açık (şirket ağında giriş gerekmez)

| Adres | İçerik |
|---|---|
| `/` | Anlık öneri veren arama, QDMS bildirim eylemleri, açık anketler, son yayımlananlar (liste + kartlar) |
| `/ara?q=` | Tüm sekmelerde bülten arama (ana sayfadaki kutu buraya gönderir) |
| `/bultenler/<sekme>` | Aranabilir indeks + yanında PDF önizlemesi |
| `/bultenler/<sekme>?bulten=<id>` | Belirli bir bülteni açar (paylaşılabilir bağlantı) |
| `/anketler` | Doldurulmaya açık anketlerin listesi |
| `/anket/<token>` | QR kodun açtığı anket formu (mobil öncelikli) |

Eski `/bultenler/<sekme>/<id>` adresleri yeni biçime yönlendirilir.

### Yönetim (`/admin`, kullanıcı adı + şifre)

| Adres | İçerik |
|---|---|
| `/admin` | Özet sayılar, son yüklemeler, işlem kaydı |
| `/admin/bultenler` | Bülten listesi, arama, yükle / düzenle / yayından kaldır / sil |
| `/admin/kategoriler` | Sekme ekle, adlandır, sırala, gizle |
| `/admin/anketler` | Anket oluştur, soru editörü, QR kod, yayınla / kapat / kopyala |
| `/admin/anketler/<id>/analiz` | Analiz ekranı ve CSV dışa aktarım |
| `/admin/anketler/<id>/qr` | Panoya asılacak yazdırılabilir QR afişi |
| `/admin/ayarlar` | Portal metinleri, QDMS kartları, duyuru, bülten görünümü, şifre |

**Sekmeler kodda sabit değildir.** Yeni bir bölüm gerektiğinde
`/admin/kategoriler` üzerinden eklenir ve navigasyonda anında görünür.

---

## Ayarlardan yönetilenler

`/admin/ayarlar` ekranındaki her kontrolün portalda görünür bir karşılığı
vardır:

| Ayar | Etkisi |
|---|---|
| Portal adı / alt başlık | Üst bant, alt bilgi, sayfa başlıkları |
| Ana sayfa tanıtım metni | Ana sayfadaki başlık altı açıklama (boşsa gizlenir) |
| Alt bilgi notu | Her sayfanın altındaki iletişim satırı |
| QDMS kart başlığı ve açıklaması | Ana sayfadaki iki bildirim eyleminin metni |
| QDMS adresleri | Kartların açtığı hedef (öneri ve olay için ayrı) |
| Duyuru metni / tonu / açık-kapalı | Üstteki duyuru şeridi; ton bandın rengini belirler (bilgi · uyarı · kritik) |
| Ana sayfada bülten sayısı | “Son yayımlananlar” listesinin uzunluğu (3–24) |
| Varsayılan sıralama | Bülten listesi ilk açıldığında hangi sıraya göre dizilir |
| PDF önizlemesi | Kapatılırsa satıra tıklamak doğrudan indirir, önizleme paneli çıkmaz |
| İndirme sayısını göster | Sayacın çalışanlara görünüp görünmeyeceği |
| Anket bölümü | Anketler sekmesi ve ana sayfadaki anket şeridi (QR bağlantıları çalışmaya devam eder) |

“Ayarları sıfırla” hepsini ilk kurulum değerlerine döndürür; bültenler,
anketler ve şifre etkilenmez.

---

## Anket soru tipleri ve analizleri

| Soru tipi | Analizde gösterilen |
|---|---|
| Tek seçim | Adet + yüzde çubukları |
| Çok seçim | Adet + yüzde (toplam %100'ü aşabilir, not düşülür) |
| Puanlama (1–5) | Ortalama, ortanca, cevap sayısı + dağılım histogramı |
| Puanlama (0–10) | Ortalama, ortanca, cevap sayısı + dağılım histogramı |
| Evet / Hayır | Adet + yüzde |
| Sayı | Ortalama, ortanca, aralık, cevap sayısı |
| Serbest metin | Cevap listesi + en sık geçen kelimeler (Türkçe bağlaçlar ayıklanır) |

Analiz bilinçli olarak sadedir: her soru için tek bir grafik ve okunması
gereken sayılar. Net Öneri Skoru (NPS) bandı kaldırıldı — 0–10 ölçeği düz
puanlama olarak gösterilir.

Ekranda tarih aralığı ve departman filtresi vardır; **CSV indirme aynı
filtreyi kullanır**, yani ekranda görülen küme ile indirilen dosya örtüşür.
CSV, Türkçe Excel için BOM ve noktalı virgül ayırıcı ile üretilir.

Sayfa yazdırılabilir: filtre ve düğmeler çıktıda görünmez, böylece toplantıya
rapor olarak götürülebilir.

### Cevap gelmiş anketin soruları

Bir ankete cevap geldikten sonra soruları **değiştirilemez** — mevcut cevaplar
anlamsız hale gelmesin diye. Güncellenmiş bir sürüm yayınlamak için anketi
**Kopyala** ile çoğaltıp kopyayı düzenleyin.

---

## Kurumsal kimlik

Değerler TFS Marka Kimlik Kılavuzu'ndan alınmıştır:

| Öğe | Değer | Kılavuz |
|---|---|---|
| Ana koyu renk | `#1D252D` (PANTONE 433 C) | s.30, s.51 |
| Kurumsal kırmızı | `#CE2028` (PANTONE 7620 C) | s.30, s.51 |
| Sıcak gri | `#D6D1CA` (PANTONE Warm Grey 1 C) | s.30 |
| Yeşil (alt marka) | `#9ED660` (PANTONE 2285 C) | s.28 |
| Yazı ailesi | **Nunito Sans** (300/400/500/600/700) | s.29 |

Renkler `app/globals.css` içinde tek yerde token olarak tanımlıdır. Yazı tipi
`@fontsource/nunito-sans` ile **kendi sunucumuzdan** servis edilir; intranette
internet erişimi gerekmez. Türkçe karakterler için `latin-ext` alt kümesi
otomatik yüklenir.

### Logo

Resmî TFS logoları `public/brand/` altında hazırdır:

| Dosya | Nerede |
|---|---|
| `logo-beyaz.png` | Koyu üst bant ve yönetim paneli |
| `logo.png` | Açık zeminler, yazdırma |
| `amblem.png` | Amblem (kuş/damla) |
| `app/icon.png` | Tarayıcı sekmesi simgesi |

Dosyalar kurumsal arşivden alınıp şeffaf kenarları kırpılarak web boyutuna
getirildi. Değiştirmek isterseniz aynı adla üzerine yazmanız yeterli; `.svg`
ve `.webp` de kabul edilir (bkz. `lib/brand.ts`). Dosya bulunamazsa portal
kılavuza uygun yazı tabanlı bir kilide düşer, logosuz kalmaz.

Resmî logo kullanılırken logonun yanına ayrıca kırmızı dikey çubuk
çizilmez — amblem kırmızıyı zaten taşıdığı için vurgu ikinci kez yapılmaz.

### Arayüz imzası

Bülten numarası **plaka** olarak ele alınır: koyu zemin, tabular rakamlar,
geniş harf aralığı, solunda kırmızı çizgi. Apron işaretlemeleri ve doküman
kontrol damgalarının dilinden gelir; kullanıcının aradığı şey numara olduğu
için görsel çapa odur (`.placard` / `.placard-quiet`, bkz. `app/globals.css`).

---

## Mimari

- **Next.js 15** (App Router, TypeScript) — tek Node.js süreci
- **SQLite** (`better-sqlite3`) — ayrı veritabanı sunucusu gerektirmez
- **Tailwind CSS 4** — marka renkleri `@theme` tokenları
- Grafikler **saf HTML/CSS** ile sunucuda üretilir; grafik kütüphanesi yoktur,
  JavaScript kapalıyken de okunur ve yazdırmada bozulmaz
- PDF'ler tarayıcının kendi görüntüleyicisiyle gösterilir

### Önemli dosyalar

```
lib/db/schema.sql        veritabanı şeması
lib/search.ts            Türkçe duyarlı arama (normalizeTr) — her yerde kullanılır
lib/settings-schema.ts   ayar anahtarları ve seçenekler (istemci de buradan okur)
components/BulletinSearch.tsx  ana sayfadaki anlık öneri veren arama
lib/analytics.ts         anket toplulaştırma ve NPS hesapları
lib/auth.ts              scrypt şifre + HMAC imzalı oturum cookie'si
lib/uploads.ts           PDF yükleme doğrulaması
app/api/dosya/[id]/      bülten servis/indirme
components/analytics/    analiz grafikleri
```

### Veri ve dosyalar

Her şey `data/` klasöründe tutulur:

```
data/portal.db           SQLite veritabanı
data/uploads/<sekme>/    yüklenen PDF'ler
data/session-secret      oturum imza anahtarı (SECK_SESSION_SECRET verilmezse)
```

Bu klasör `.gitignore`'dadır. **Yedekleme için `data/` klasörünü kopyalamak
yeterlidir.**

PDF'ler bilinçli olarak `public/` **dışında** tutulur; erişim
`/api/dosya/[id]` üzerinden yapılır. Böylece indirme adı bülten numarası ve
konusundan üretilir, yayından kaldırılmış bültenler engellenir, dizin
listeleme sızmaz ve indirme sayacı tutulabilir.

---

## Güvenlik notları

- Admin şifreleri `node:crypto` scrypt ile hashlenir.
- Oturum, HMAC imzalı `httpOnly` cookie ile taşınır (8 saat).
- Giriş denemeleri hız sınırlıdır (5 dakikada 8 deneme).
- Yüklenen dosyaların gerçekten PDF olduğu **ilk baytlarından** doğrulanır;
  istemcinin bildirdiği MIME türüne güvenilmez.
- Anket gönderimleri hız sınırlıdır; tek kez doldurulan anketlerde aynı cihaz
  IP karması ile tanınır (ham IP saklanmaz).
- Portal arama motorlarına kapalıdır (`robots: noindex`).
- Her Server Action kendi yetkisini doğrular; yalnızca sayfa yerleşimine
  güvenilmez.

---

## Sunucuya yayın

`npm run build` `output: "standalone"` çıktısı üretir: `.next/standalone`
klasörü tek başına çalışabilir.

### Ortam değişkenleri

| Değişken | Ne işe yarar |
|---|---|
| `SECK_SESSION_SECRET` | Oturum imza anahtarı. **Üretimde verin** (en az 16 karakter). Verilmezse `data/session-secret` dosyasında üretilir. |
| `SECK_BASE_URL` | QR kodlara gömülecek kök adres, ör. `https://seck.turkishfuel.com`. Ters vekil arkasında ayarlayın. |
| `SECK_DATA_DIR` | `data/` yerine başka bir konum (ör. yedeklenen disk). |
| `SECK_SECURE_COOKIE` | HTTPS ile yayınlıyorsanız `true` yapın. |
| `PORT` | Dinlenecek port (varsayılan 3000). |

`.env.example` dosyasını `.env` olarak kopyalayıp doldurabilirsiniz.

### Linux (systemd + nginx)

```bash
npm ci && npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
# .next/standalone klasörünü sunucuya taşıyın, ardından:
node server.js
```

`data/` klasörünün `server.js` ile aynı dizinde (veya `SECK_DATA_DIR` ile
belirtilen yerde) olduğundan emin olun. Önüne nginx koyup 3000 portuna
yönlendirin.

### Windows Server (IIS)

İki yol var:

1. **Ters vekil (önerilen).** Node.js'i bir Windows servisi olarak çalıştırın
   (ör. [NSSM](https://nssm.cc/) ile `node server.js`), IIS'te
   *Application Request Routing* ile `http://localhost:3000` adresine reverse
   proxy kurun. QDMS ile aynı sunucuda sorunsuz yan yana çalışır.
2. **iisnode** modülü ile doğrudan barındırma.

Her iki durumda `SECK_SESSION_SECRET` ve `SECK_BASE_URL` değişkenlerini
tanımlayın, `data/` klasörüne servis hesabı için yazma izni verin.

### İlk kurulumdan sonra

```bash
npm run seed   # sekmeleri ve ilk admin hesabını oluşturur (bir kez)
```

Ardından `/admin/ayarlar` üzerinden QDMS adreslerini kontrol edin — Öneri ve
Olay bildirimi için QDMS'te ayrı derin linkler varsa buraya girilir.
