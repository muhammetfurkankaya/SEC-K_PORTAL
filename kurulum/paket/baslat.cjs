/**
 * SEÇ-K Portalı — başlatıcı.
 *
 * Çalıştığı Node sürümüne uygun SQLite ikilisini yerine kopyalar, .env
 * dosyasını okur, sonra portalı başlatır. Bu paket derlenmiş hâldedir: npm,
 * internet veya derleyici gerekmez; yalnızca Node.js 20 veya 22 kurulu olmalı.
 *
 * Kullanım:  node baslat.cjs
 *
 * IIS altında HttpPlatformHandler ile çalıştırıldığında süreci IIS başlatır ve
 * dinlenecek portu HTTP_PLATFORM_PORT ile bildirir; bu durumda o port
 * kullanılır ve sunucu yalnızca 127.0.0.1 üzerinden dinler — dışarıya açık
 * olan tek kapı IIS olur.
 */
"use strict";

var fs = require("fs");
var path = require("path");

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

// IIS (HttpPlatformHandler) süreci kendisi başlatır ve dinlenecek portu
// HTTP_PLATFORM_PORT ile verir. Bu modda dışarıya IIS bakar; Node'un tüm
// arayüzlerde dinlemesi gereksizdir ve IIS'i (dolayısıyla HTTPS'i) atlatma
// riski taşır.
if (process.env.HTTP_PLATFORM_PORT) {
  process.env.PORT = process.env.HTTP_PLATFORM_PORT;
  process.env.HOSTNAME = "127.0.0.1";
}

// ————————————————————————————— SQLite ikilisi —————————————————————————————

// Node surumune uygun .node dosyasini yerine koyar; uyumsuz bir surumde
// anlasilir bir mesajla durur. Ayni dosya yonetim komutlari tarafindan da
// kullaniliyor.
require("./sqlite-hazir.cjs");

require("./server.js");
