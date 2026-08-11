/**
 * Node sürümünü kurulumdan ÖNCE kontrol eder.
 *
 * Neden gerekli: portal `better-sqlite3` kullanıyor ve bu paketin hazır
 * (derlenmiş) Windows/Linux ikilileri yalnızca Node 18, 20 ve 22 için var.
 * Daha eski bir Node ile `npm install` çalıştırıldığında npm paketi
 * kaynaktan derlemeye çalışıyor; bu da Python ve Visual Studio derleyicisi
 * istiyor ve ekrana yüzlerce satırlık node-gyp hatası döküyor.
 *
 * O hata yığını yerine tek ve net bir mesaj vermek için buradan çıkıyoruz.
 * Bu dosya `preinstall` adımında, yani hiçbir bağımlılık kurulmadan önce
 * çalıştığı için yalnızca Node'un yerleşik özelliklerini kullanır ve eski
 * Node sürümlerinde de sorunsuz çalışacak biçimde yazılmıştır.
 */
"use strict";

var MINIMUM_MAJOR = 20;

// Test amaçlı sürüm geçersiz kılma: node scripts/check-node.cjs --test=16.13.1
var override = process.argv.filter(function (arg) {
  return arg.indexOf("--test=") === 0;
})[0];

var version = override ? override.slice("--test=".length) : process.version.replace(/^v/, "");
var major = parseInt(version.split(".")[0], 10);

if (isNaN(major)) {
  // Sürüm okunamadıysa kurulumu engellemeyelim.
  process.exit(0);
}

if (major >= MINIMUM_MAJOR) {
  process.exit(0);
}

var lines = [
  "",
  "  ┌──────────────────────────────────────────────────────────────┐",
  "  │  KURULUM DURDURULDU — Node.js sürümü çok eski               │",
  "  └──────────────────────────────────────────────────────────────┘",
  "",
  "  Bu bilgisayardaki Node.js sürümü : v" + version,
  "  Portalın ihtiyaç duyduğu sürüm   : v" + MINIMUM_MAJOR + " veya üzeri",
  "",
  "  Node.js 20 LTS kurun, ardından komut satırını KAPATIP yeniden açın:",
  "",
  "      https://nodejs.org/en/download  →  Windows Installer (.msi), LTS",
  "",
  "  Sunucuda kuruyorsanız hazır script:  kurulum\\1-node-kur.ps1",
  "",
  "  ── Neden gerekli ────────────────────────────────────────────────",
  "  Portal SQLite kullanıyor. Bu paketin hazır derlenmiş dosyaları",
  "  yalnızca Node 18, 20 ve 22 için yayımlanıyor. Daha eski bir Node ile",
  "  npm paketi kaynaktan derlemeye çalışır ve Python + Visual Studio",
  "  derleyicisi ister. Node sürümünü yükseltmek bu ihtiyacı tamamen",
  "  ortadan kaldırır — Python KURMANIZ GEREKMEZ.",
  "",
];

console.error(lines.join("\n"));
process.exit(1);
