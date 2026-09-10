/**
 * SEÇ-K Portalı — başlatıcı.
 *
 * Çalışma klasörünü sabitler, .env dosyasını okur, Node sürümüne uygun SQLite
 * ikilisini yerine koyar, sonra portalı başlatır. Bu paket derlenmiş hâldedir:
 * npm, internet veya derleyici gerekmez; yalnızca Node.js 20 veya 22 kurulu
 * olmalı.
 *
 * Kullanım:  node baslat.cjs
 *
 * IIS altında süreci IIS başlatır ve dinlenecek portu bildirir
 * (AspNetCoreModuleV2 → ASPNETCORE_PORT, HttpPlatformHandler →
 * HTTP_PLATFORM_PORT). Bu durumda o port kullanılır ve sunucu yalnızca
 * 127.0.0.1 üzerinden dinler — dışarıya açık olan tek kapı IIS olur.
 */
"use strict";

var fs = require("fs");
var path = require("path");

// ————————————————————————————— Çalışma klasörü —————————————————————————————

// Süreci kim başlatırsa başlatsın (komut satırı, zamanlanmış görev, IIS
// uygulama havuzu) çalışma klasörü paketin kökü olsun. IIS süreci başka bir
// klasörden başlatabiliyor; o durumda veritabanı yanlış yere açılır ve
// "veri yok" gibi anlaşılmaz sonuçlar doğar.
try {
  process.chdir(__dirname);
} catch (error) {
  console.error("  Calisma klasoru ayarlanamadi: " + error.message);
}

// ————————————————————————————————— .env —————————————————————————————————

/**
 * .env dosyasını okuyup process.env'e yerleştirir.
 *
 * Next'in derlenmiş server.js dosyası PORT ve HOSTNAME değerlerini kendi env
 * yükleyicisinden ÖNCE okuyor; bu yüzden .env'deki PORT tek başına etkisiz
 * kalıyordu. Dosyayı burada, sunucu yüklenmeden önce biz okuyoruz.
 *
 * Zaten tanımlı olan değişkenler korunur: böylece IIS'in veya zamanlanmış
 * görevin verdiği değerler .env'i ezebilir.
 */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;

  var text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    console.error("  .env okunamadi: " + error.message);
    console.error("  IIS altinda calisiyorsa uygulama havuzu kimligine bu");
    console.error("  dosya icin okuma izni verilmelidir (bkz. iis\\IIS.md).");
    return;
  }

  // PowerShell'in UTF8 çıktısı BOM ile başlayabiliyor.
  text = text.replace(/^\uFEFF/, "");

  var lines = text.split(/\r?\n/);
  for (var i = 0; i < lines.length; i += 1) {
    var line = lines[i].trim();
    if (!line || line.charAt(0) === "#") continue;

    var eq = line.indexOf("=");
    if (eq < 1) continue;

    var key = line.slice(0, eq).trim();
    var value = line.slice(eq + 1).trim();

    var first = value.charAt(0);
    if (value.length > 1 && (first === '"' || first === "'") && value.charAt(value.length - 1) === first) {
      value = value.slice(1, -1);
    }

    if (!key || !value) continue;
    if (Object.prototype.hasOwnProperty.call(process.env, key)) continue;

    process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, ".env"));

// ————————————————————————————— IIS altında mıyız —————————————————————————————

/**
 * IIS, portalı iki farklı modülle barındırabiliyor ve ikisi de dinlenecek
 * portu bir ortam değişkeniyle bildiriyor:
 *
 *   ASPNETCORE_PORT     → AspNetCoreModuleV2 (hostingModel="OutOfProcess")
 *   HTTP_PLATFORM_PORT  → HttpPlatformHandler
 *
 * İkisi de aynı işi yapar: bu süreci başlatır, boş bir port seçer ve
 * istekleri o porta aktarır. Modül adına göre davranış değişmiyor, tek fark
 * değişkenin adı.
 *
 * Bu modlarda dışarıya IIS bakar; Node'un tüm arayüzlerde dinlemesi
 * gereksizdir ve IIS'i (dolayısıyla HTTPS'i) atlatma riski taşır — bu yüzden
 * yalnızca 127.0.0.1'e bağlanıyoruz.
 */
var iisPort = process.env.ASPNETCORE_PORT || process.env.HTTP_PLATFORM_PORT;
var iisModul = process.env.ASPNETCORE_PORT ? "AspNetCoreModuleV2" : "HttpPlatformHandler";
var underIis = Boolean(iisPort);

if (underIis) {
  process.env.PORT = String(iisPort);
  process.env.HOSTNAME = "127.0.0.1";
  console.log(
    "  IIS tarafindan baslatildi (" + iisModul + ", port " + iisPort + ", yalnizca 127.0.0.1)",
  );
}

// ————————————————————————————— Veri klasörü —————————————————————————————

/**
 * Veri klasörüne yazılabildiğini başlamadan önce doğrular.
 *
 * IIS'te en sık görülen açılış hatası budur: uygulama havuzu kimliğinin
 * (varsayılan olarak "IIS AppPool\<havuz adı>") data\ klasörüne yazma izni
 * olmaz, SQLite açılamaz ve tarayıcı yalnızca 502.5 gösterir. Ham SQLite
 * hatası yerine ne yapılacağını söyleyen bir mesaj bırakıyoruz — bu çıktı
 * IIS modülü tarafından data\iis-log\ altına yazılır.
 */
function checkDataDirWritable() {
  var dataDir = process.env.SECK_DATA_DIR
    ? path.resolve(process.env.SECK_DATA_DIR)
    : path.join(__dirname, "data");

  try {
    fs.mkdirSync(dataDir, { recursive: true });
    var probe = path.join(dataDir, ".yazma-denemesi");
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    return;
  } catch (error) {
    console.error("");
    console.error("  ============================================================");
    console.error("  VERI KLASORUNE YAZILAMIYOR");
    console.error("  ============================================================");
    console.error("  Klasor : " + dataDir);
    console.error("  Hata   : " + error.message);
    console.error("");

    if (underIis) {
      console.error("  Portali IIS calistiriyor. Uygulama havuzu kimligine bu");
      console.error("  klasor icin yazma izni verin. Yonetici komut isteminde:");
      console.error("");
      console.error('    icacls "' + dataDir + '" /grant "IIS AppPool\\SEC-K Portali:(OI)(CI)(M)" /T');
      console.error("");
      console.error("  Havuz adiniz farkliysa yukaridaki adi degistirin.");
      console.error("  Hazir script: powershell -ExecutionPolicy Bypass -File .\\iis\\iis-izin.ps1");
    } else {
      console.error("  Komutu yonetici olarak calistirin veya paketi yazma izni");
      console.error("  olan bir klasore (ornegin C:\\seckportal) tasiyin.");
    }
    console.error("");
    process.exit(1);
  }
}

checkDataDirWritable();

// ————————————————————————————— SQLite ikilisi —————————————————————————————

// Node surumune uygun .node dosyasini yerine koyar; uyumsuz bir surumde
// anlasilir bir mesajla durur. Ayni dosya yonetim komutlari tarafindan da
// kullaniliyor.
require("./sqlite-hazir.cjs");

// Açılışta oluşan hatalar IIS altında yalnızca 502.5 olarak görünür; günlüğe
// okunabilir bir iz bırakmak sorunu bulmanın tek yolu oluyor.
process.on("uncaughtException", function (error) {
  console.error("");
  console.error("  PORTAL BASLATILAMADI");
  console.error("  " + (error && error.stack ? error.stack : error));
  console.error("");
  process.exit(1);
});

// ————————————————————————————— İlk kurulum —————————————————————————————

/**
 * Veritabanı şeması, bülten sekmeleri ve yönetici hesabı yoksa oluşturulur.
 *
 * Sunucuda komut satırı erişimi olmayabiliyor (yayına alma yalnızca dosya
 * kopyalayıp IIS'te site açmakla yapılıyor), bu yüzden ilk kurulumu bir
 * script'e bırakamıyoruz. İşlem fikirsizdir: kayıtlar varsa hiçbir şeye
 * dokunulmaz.
 */
try {
  var sonuc = require("./bootstrap.cjs").bootstrap();

  if (sonuc.createdCategories.length > 0) {
    console.log("  Ilk kurulum: " + sonuc.createdCategories.length + " bulten sekmesi olusturuldu");
  }
  if (sonuc.createdAdmin) {
    console.log("");
    console.log("  ============================================================");
    console.log("  YONETIM PANELI GIRIS BILGILERI");
    console.log("  ============================================================");
    console.log("  Kullanici adi : " + sonuc.adminUsername);
    console.log("  Sifre         : " + sonuc.adminPassword);
    console.log("");
    console.log("  ILK GIRISTEN SONRA Ayarlar > Sifre Degistir ile degistirin.");
    console.log("  Degistirilene kadar panelde kirmizi uyari seridi gorunur.");
    console.log("  ============================================================");
    console.log("");
  }
} catch (error) {
  console.error("");
  console.error("  ILK KURULUM TAMAMLANAMADI");
  console.error("  " + (error && error.stack ? error.stack : error));
  console.error("");
  console.error("  Veritabani olusturulamadiysa data\\ klasoru yazilabilir olmali.");
  console.error("");
  process.exit(1);
}

require("./server.js");
