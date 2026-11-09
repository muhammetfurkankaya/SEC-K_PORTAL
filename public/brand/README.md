# Kurumsal logo dosyaları

Bu klasöre TFS logo dosyalarını koyduğunuzda portal otomatik olarak
kullanmaya başlar — kod değişikliği gerekmez.

| Dosya adı | Nerede kullanılır |
|---|---|
| `logo-beyaz.svg` | Koyu (#1D252D) üst bant ve admin panelinde |
| `logo.svg` | Açık zeminlerde, yazdırma çıktısında |

`.svg` tercih edilir; `.png` ve `.webp` de kabul edilir. Dosya adı
`logo-white.svg` / `logo-dark.svg` biçiminde de olabilir.

Bu dosyalar yokken portal, Marka Kimlik Kılavuzu'nun tipografi ve renk
kurallarına uygun (Nunito Sans SemiBold + `#CE2028` dikey çubuk) yazı tabanlı
geçici bir logo gösterir. Yani portal logosuz görünmez, yalnızca resmî
amblem yerine kurallı bir yazı kilidi kullanır.

> Not: Logo yalnızca bu klasöre eklenir. Kılavuzdaki güvenli alan (marjin)
> kuralı gereği logonun çevresinde "T" harfi yüksekliğine eşit boşluk
> bırakılmıştır; bileşen bu boşluğu kendisi uygular.

# Ana sayfa görseli (yalnızca geliştirici)

Ana sayfadaki büyük fotoğraf bu klasördeki **`hero-anasayfa.jpg`**
dosyasıdır. Yönetim panelinden değiştirilemez — bilinçli bir karar: görsel
kurumsal kimliğin parçası, yalnızca geliştirici değiştirir.

**Önerilen dosya:** yatay (16:9), en az 1920 px genişlik, JPEG, ~300–600 KB.
Görselin ortası her ekranda görünür; kenarlar dar ekranda kırpılabilir.
Panelde kalan "Fotoğraf kadrajı" (Üst / Orta / Alt) hangi kısmın öne
çıkacağını, "Yazı perdesi" (Normal / Güçlü) parlak fotoğrafta yazının
okunurluğunu ayarlar.

**Değiştirmenin iki yolu:**

1. **Kaynakta (kalıcı):** bu dosyayı aynı adla değiştirin, sonra
   `npm run paket:windows` ile paketi yeniden üretin. Sonraki sürümlerde de
   yeni görsel gelir.
2. **Doğrudan sunucuda:** `<site klasörü>\public\brand\hero-anasayfa.jpg`
   üzerine yeni dosyayı kopyalayın ve sayfayı yenileyin — yeniden başlatma
   gerekmez (gelmezse IIS'te uygulama havuzunu **Recycle** edin). Sürüm yükseltmede paket klasörü değiştiği için görseli
   kaynağa da koymayı unutmayın (1. yol).

Tarayıcı önbelleği sorun olmaz: sayfadaki adres dosyanın değişme zamanını
taşır (`/brand/hero-anasayfa.jpg?v=…`), dosya değişince adres de değişir.

Dosya hiç yoksa ana sayfa kurumsal gradyanla açılır — boş alan kalmaz.
`.webp` ve `.png` de kabul edilir (aynı ad, öncelik: webp → jpg → png).
Eski sürümde panelden yüklenmiş bir görsel (`data\uploads\_gorsel\`) artık
kullanılmaz; o klasör silinebilir.
