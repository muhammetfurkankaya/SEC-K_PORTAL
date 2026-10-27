/**
 * PDF okuyucunun (pdf.js) tarayıcıda yüklediği yardımcı dosyaları
 * public/pdfjs/ altına kopyalar.
 *
 * NEDEN: pdf.js sayfaları ayrı bir "worker" dosyasında çözer ve bazı
 * PDF'ler için yazı tipi / görüntü çözücü dosyalarına ihtiyaç duyar. Bunlar
 * portalın kendi adresinden sunulmalı: sunucunun internet erişimi yok ve
 * içerik güvenlik politikası (CSP) yalnızca aynı kaynağa izin veriyor.
 *
 * `npm run build` öncesinde otomatik çalışır (package.json → prebuild).
 * Çıktı depoya eklenmez (.gitignore); sürüm node_modules'tan gelir, böylece
 * kütüphane güncellendiğinde dosyalar kendiliğinden eşleşir.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "node_modules", "pdfjs-dist");
const OUT = path.join(ROOT, "public", "pdfjs");

if (!fs.existsSync(SRC)) {
  console.error("HATA: node_modules/pdfjs-dist bulunamadı. Önce `npm install` çalıştırın.");
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

fs.copyFileSync(
  path.join(SRC, "legacy", "build", "pdf.worker.min.mjs"),
  path.join(OUT, "pdf.worker.min.mjs"),
);
for (const dir of ["wasm", "standard_fonts", "cmaps", "iccs"]) {
  fs.cpSync(path.join(SRC, dir), path.join(OUT, dir), { recursive: true });
}

const { version } = require(path.join(SRC, "package.json"));
fs.writeFileSync(path.join(OUT, "SURUM.txt"), `pdfjs-dist ${version}\n`);
console.log(`pdf.js ${version} yardımcı dosyaları public/pdfjs/ altına kopyalandı.`);
