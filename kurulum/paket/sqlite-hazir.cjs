/**
 * Çalışan Node sürümüne uygun SQLite ikilisini yerine kopyalar.
 *
 * Paket Linux üzerinde hazırlandığı için içindeki derlenmiş `.node` dosyası
 * Windows'ta çalışmaz; bu yüzden `sqlite-ikili/` altında Node 20 ve Node 22
 * için Windows x64 hazır ikilileri duruyor ve doğru olan çalışma anında
 * `node_modules/better-sqlite3/build/Release/` altına konuyor.
 *
 * Bu dosyayı hem `baslat.cjs` hem de `komutlar/` altındaki yönetim komutları
 * kullanır: veritabanına dokunan her giriş noktasının ikiliyi hazır bulması
 * gerekiyor. Sunucuda ilk çalıştırılan komut `seed.cjs` olabilir, yani iş
 * yalnızca sunucu başlatıcısına bırakılamaz.
 *
 * Kullanım:  require("./sqlite-hazir.cjs")  → yüklendiğinde kendisi çalışır
 */
"use strict";

var fs = require("fs");
var path = require("path");

// NODE_MODULE_VERSION (ABI), derlenmiş .node dosyasının hangi Node sürümüyle
// uyumlu olduğunu belirler. Node 20 → 115, Node 22 → 127.
var SUPPORTED = { "115": "20", "127": "22" };

/** Paketin kök klasörü — bu dosya orada duruyor. */
var ROOT = __dirname;

function hazirla() {
  var abi = process.versions.modules;

  if (!SUPPORTED[abi]) {
    console.error("");
    console.error("  Bu paket Node.js 20 veya 22 ile calisir.");
    console.error("  Bu bilgisayardaki surum: v" + process.versions.node);
    console.error("");
    console.error("  Node.js 20 LTS kurun: https://nodejs.org/en/download");
    console.error("  Kurulumdan sonra komut penceresini kapatip yeniden acin.");
    console.error("");
    process.exit(1);
  }

  var source = path.join(ROOT, "sqlite-ikili", "better_sqlite3-abi" + abi + ".node");
  var targetDir = path.join(ROOT, "node_modules", "better-sqlite3", "build", "Release");
  var target = path.join(targetDir, "better_sqlite3.node");

  if (!fs.existsSync(source)) {
    console.error("");
    console.error("  SQLite ikilisi bulunamadi: " + source);
    console.error("  Paket eksik kopyalanmis olabilir; arsivi yeniden acin.");
    console.error("");
    process.exit(1);
  }

  // Her çalıştırmada kopyalamak yerine yalnizca farkliysa kopyaliyoruz.
  var needsCopy = true;
  if (fs.existsSync(target)) {
    try {
      needsCopy = fs.statSync(target).size !== fs.statSync(source).size;
    } catch (error) {
      needsCopy = true;
    }
  }

  if (needsCopy) {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(source, target);
    console.log("  SQLite ikilisi hazirlandi (Node " + SUPPORTED[abi] + ", ABI " + abi + ")");
  }
}

hazirla();

module.exports = { hazirla: hazirla };
