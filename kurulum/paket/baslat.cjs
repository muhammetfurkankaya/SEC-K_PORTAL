/**
 * SEÇ-K Portalı — başlatıcı.
 *
 * Çalıştığı Node sürümüne uygun SQLite ikilisini yerine kopyalar, sonra
 * portalı başlatır. Bu paket derlenmiş hâldedir: npm, internet veya
 * derleyici gerekmez; yalnızca Node.js 20 veya 22 kurulu olmalıdır.
 *
 * Kullanım:  node baslat.cjs
 */
"use strict";

var fs = require("fs");
var path = require("path");

// NODE_MODULE_VERSION (ABI), derlenmiş .node dosyasının hangi Node sürümüyle
// uyumlu olduğunu belirler. Node 20 → 115, Node 22 → 127.
var ABI = process.versions.modules;
var SUPPORTED = { "115": "20", "127": "22" };

if (!SUPPORTED[ABI]) {
  console.error("");
  console.error("  Bu paket Node.js 20 veya 22 ile calisir.");
  console.error("  Bu bilgisayardaki surum: v" + process.versions.node);
  console.error("");
  console.error("  Node.js 20 LTS kurun: https://nodejs.org/en/download");
  console.error("  Kurulumdan sonra komut penceresini kapatip yeniden acin.");
  console.error("");
  process.exit(1);
}

var source = path.join(__dirname, "sqlite-ikili", "better_sqlite3-abi" + ABI + ".node");
var targetDir = path.join(__dirname, "node_modules", "better-sqlite3", "build", "Release");
var target = path.join(targetDir, "better_sqlite3.node");

if (!fs.existsSync(source)) {
  console.error("  SQLite ikilisi bulunamadi: " + source);
  console.error("  Paket eksik kopyalanmis olabilir; arsivi yeniden acin.");
  process.exit(1);
}

// Her aciliste kopyalamak yerine yalnizca farkliysa kopyaliyoruz.
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
  console.log("  SQLite ikilisi hazirlandi (Node " + SUPPORTED[ABI] + ", ABI " + ABI + ")");
}

require("./server.js");
