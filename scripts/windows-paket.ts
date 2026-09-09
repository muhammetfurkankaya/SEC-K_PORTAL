/**
 * Windows sunucusu için kurulum gerektirmeyen yayın paketi hazırlar.
 *
 * Kullanım:
 *   npm run build
 *   npm run paket:windows
 *
 * Sonuç: `yayin-paketi/` klasörü. Sunucuda yalnızca **Node.js 20 veya 22**
 * kurulu olması yeterli — `npm install` gerekmez, internet gerekmez,
 * derleyici (Python / Visual Studio) gerekmez.
 *
 * ————— Nasıl mümkün oluyor —————
 *
 * Next.js'in `output: "standalone"` çıktısı çalışmak için gereken tüm JS
 * modüllerini içeriyor. Tek sorun `better-sqlite3`: bu paket işletim
 * sistemine göre derlenmiş bir .node dosyası kullanıyor ve bu paket Linux'ta
 * hazırlandığı için içindeki dosya Windows'ta çalışmaz. Bu yüzden paketi
 * hazırlarken Windows için yayımlanmış hazır ikilileri indirip
 * `sqlite-ikili/` altına koyuyoruz; sunucuda `baslat.cjs` çalıştığı Node
 * sürümüne uygun olanı yerine kopyalıyor.
 *
 * Ayrıca yönetim komutları (seed / şifre / demo) TypeScript oldukları için
 * normalde `tsx` gerektiriyor; tsx de platforma özel esbuild ikilisi
 * kullanıyor. Bu komutları burada düz JavaScript'e derliyoruz, böylece
 * sunucuda yalnızca `node` yeterli oluyor.
 */
import { build as esbuild } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { createGunzip } from "node:zlib";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const STANDALONE = path.join(ROOT, ".next", "standalone");
const OUT = path.join(ROOT, "yayin-paketi");

/** better-sqlite3 sürümüne göre indirilecek Windows ikilileri. */
const SQLITE_VERSION = JSON.parse(
  fs.readFileSync(path.join(ROOT, "node_modules", "better-sqlite3", "package.json"), "utf8"),
).version as string;

/** Node ana sürümü → ABI (NODE_MODULE_VERSION) eşlemesi. */
const ABIS = [
  { node: "20", abi: "115" },
  { node: "22", abi: "127" },
];

// Yayın paketinde işi olmayan klasörler.
const DROP = [
  // Görüntü optimizasyonu için Linux ikilileri (~36 MB). Portal next/image
  // optimizasyonu kullanmıyor, bültenler ve logolar düz <img>.
  "@img",
  "sharp",
  // TypeScript yalnızca derleme sırasında gerekli.
  "typescript",
];

function log(text: string): void {
  console.log(text);
}

function step(text: string): void {
  console.log(`\n=== ${text} ===`);
}

/** Klasörü özyinelemeli kopyalar. */
function copyDir(from: string, to: string): void {
  fs.cpSync(from, to, { recursive: true });
}

/** Dosyayı indirir (yönlendirmeleri izler) ve içeriğini döndürür. */
function download(url: string, redirects = 0): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("Çok fazla yönlendirme"));

    https
      .get(url, (response) => {
        const status = response.statusCode ?? 0;

        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          resolve(download(response.headers.location, redirects + 1));
          return;
        }
        if (status !== 200) {
          response.resume();
          reject(new Error(`HTTP ${status} — ${url}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

/**
 * .tar.gz içinden tek bir dosyayı çıkarır.
 *
 * better-sqlite3 hazır paketleri küçük ve tek dosyalı olduğu için tam bir
 * tar kütüphanesi eklemek yerine başlıkları elle okuyoruz.
 */
async function extractFromTarGz(archive: Buffer, fileSuffix: string): Promise<Buffer> {
  const tar: Buffer = await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const gunzip = createGunzip();
    gunzip.on("data", (chunk) => chunks.push(chunk));
    gunzip.on("end", () => resolve(Buffer.concat(chunks)));
    gunzip.on("error", reject);
    gunzip.end(archive);
  });

  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);

    // Adı boş olan başlık arşivin sonunu işaret eder.
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    if (!name) break;

    const sizeField = header.subarray(124, 136).toString("utf8").replace(/\0.*$/, "").trim();
    const size = parseInt(sizeField, 8) || 0;
    const dataStart = offset + 512;

    if (name.endsWith(fileSuffix)) {
      return tar.subarray(dataStart, dataStart + size);
    }

    // Veri bloğu 512'nin katına yuvarlanır.
    offset = dataStart + Math.ceil(size / 512) * 512;
  }

  throw new Error(`Arşivde ${fileSuffix} bulunamadı`);
}

/** Yönetim komutlarını tsx gerektirmeyecek şekilde düz JS'e derler. */
async function bundleAdminScripts(): Promise<void> {
  const scripts = [
    { entry: "scripts/seed.ts", out: "komutlar/seed.cjs" },
    { entry: "scripts/sifre.ts", out: "komutlar/sifre.cjs" },
    { entry: "scripts/demo.ts", out: "komutlar/demo.cjs" },
  ];

  for (const script of scripts) {
    await esbuild({
      entryPoints: [path.join(ROOT, script.entry)],
      outfile: path.join(OUT, script.out),
      bundle: true,
      platform: "node",
      target: "node20",
      format: "cjs",
      // Native modül paketlenemez; sunucudaki node_modules'ten yüklenecek.
      external: ["better-sqlite3"],
      // Komutlar better-sqlite3'ü yüklenirken require ediyor; doğru .node
      // dosyasının o andan ÖNCE yerine konmuş olması gerekiyor. Sunucuda ilk
      // çalıştırılan komut seed.cjs olabildiği için bu işi sunucu
      // başlatıcısına bırakamıyoruz.
      banner: { js: 'require("../sqlite-hazir.cjs");' },
      logLevel: "warning",
    });
    log(`  + ${script.out}`);
  }
}

async function main(): Promise<void> {
  if (!fs.existsSync(STANDALONE)) {
    console.error("HATA: .next/standalone bulunamadı. Önce `npm run build` çalıştırın.");
    process.exit(1);
  }

  step("Önceki paket temizleniyor");
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  step("Standalone çıktısı kopyalanıyor");
  copyDir(STANDALONE, OUT);

  // Next, izleme sırasında geliştirme verisini de kopyalıyor. Bu klasör
  // yerel veritabanını, yüklenmiş PDF'leri ve oturum anahtarını içerir —
  // kesinlikle paketle dağıtılmamalı.
  const bundledData = path.join(OUT, "data");
  if (fs.existsSync(bundledData)) {
    fs.rmSync(bundledData, { recursive: true, force: true });
    log("  - data/ çıkarıldı (geliştirme veritabanı pakete girmez)");
  }
  fs.rmSync(path.join(OUT, ".env"), { force: true });

  step("Statik dosyalar");
  copyDir(path.join(ROOT, ".next", "static"), path.join(OUT, ".next", "static"));
  log("  + .next/static");

  // Standalone çıktısı public/ klasörünü içermez, elle eklenir.
  const publicOut = path.join(OUT, "public");
  if (!fs.existsSync(publicOut)) {
    copyDir(path.join(ROOT, "public"), publicOut);
  }
  log("  + public/ (logolar dahil)");

  step("Gereksiz paketler çıkarılıyor");
  for (const name of DROP) {
    const target = path.join(OUT, "node_modules", name);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
      log(`  - node_modules/${name}`);
    }
  }

  step("Windows SQLite ikilileri indiriliyor");
  const binDir = path.join(OUT, "sqlite-ikili");
  fs.mkdirSync(binDir, { recursive: true });

  for (const target of ABIS) {
    const file = `better-sqlite3-v${SQLITE_VERSION}-node-v${target.abi}-win32-x64.tar.gz`;
    const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${SQLITE_VERSION}/${file}`;

    log(`  Node ${target.node} (ABI ${target.abi}) indiriliyor…`);
    const archive = await download(url);
    const binary = await extractFromTarGz(archive, "better_sqlite3.node");

    const outFile = path.join(binDir, `better_sqlite3-abi${target.abi}.node`);
    fs.writeFileSync(outFile, binary);
    log(`  + sqlite-ikili/better_sqlite3-abi${target.abi}.node (${Math.round(binary.length / 1024)} KB)`);
  }

  // Linux ikilisini paketten çıkarıyoruz: Windows'ta işe yaramaz ve
  // yanlışlıkla yüklenirse anlaşılmaz bir hata verir.
  const linuxBinary = path.join(
    OUT,
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node",
  );
  if (fs.existsSync(linuxBinary)) {
    fs.rmSync(linuxBinary);
    log("  - Linux ikilisi çıkarıldı (baslat.cjs doğrusunu yerleştirir)");
  }

  step("Yönetim komutları düz JS'e derleniyor");
  await bundleAdminScripts();

  step("Paket dosyaları yazılıyor");
  writeBundleFiles();

  const size = await folderSize(OUT);
  step("Hazır");
  log(`  Klasör : yayin-paketi/`);
  log(`  Boyut  : ${size}`);
  log(`  Sunucuda gereken: yalnızca Node.js 20 veya 22`);
  log("");
}

/** Paket boyutunu okunabilir biçimde döndürür. */
function folderSize(dir: string): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn("du", ["-sh", dir]);
    let out = "";
    proc.stdout.on("data", (chunk) => (out += chunk));
    proc.on("close", () => resolve(out.split("\t")[0] || "bilinmiyor"));
    proc.on("error", () => resolve("bilinmiyor"));
  });
}

/**
 * Sunucuda kullanılacak başlatma dosyalarını pakete kopyalar.
 *
 * Bu dosyalar `kurulum/paket/` altında gerçek dosya olarak tutuluyor —
 * PowerShell'in kaçış karakteri (backtick) JavaScript template literal'i
 * ile çakıştığı için içerikleri koda gömmek hataya çok açıktı.
 */
function writeBundleFiles(): void {
  const source = path.join(ROOT, "kurulum", "paket");

  const files: { from: string; to: string }[] = [
    { from: "baslat.cjs", to: "baslat.cjs" },
    { from: "sqlite-hazir.cjs", to: "sqlite-hazir.cjs" },
    { from: "kur.ps1", to: "kur.ps1" },
    { from: "KURULUM.md", to: "KURULUM.md" },
    { from: "komutlar-OKU.txt", to: path.join("komutlar", "OKU.txt") },
    // Kurulum oncesi web.config: hicbir IIS eklentisi gerektirmez, siteyi
    // her zaman acar ve kurulum.html bilgi sayfasini gosterir. Boylece
    // eklenti kurulmadan once "500.19" yerine ne yapilacagi yaziyor.
    { from: "web.config", to: "web.config" },
    { from: "kurulum.html", to: "kurulum.html" },
    // IIS ile yayin: script'ler, sablonlar ve rehber.
    { from: path.join("iis", "iis-kur.ps1"), to: path.join("iis", "iis-kur.ps1") },
    { from: path.join("iis", "iis-kontrol.ps1"), to: path.join("iis", "iis-kontrol.ps1") },
    { from: path.join("iis", "iis-izin.ps1"), to: path.join("iis", "iis-izin.ps1") },
    { from: path.join("iis", "web.config.iis"), to: path.join("iis", "web.config.iis") },
    { from: path.join("iis", "web.config.vekil"), to: path.join("iis", "web.config.vekil") },
    { from: path.join("iis", "IIS.md"), to: path.join("iis", "IIS.md") },
  ];

  for (const file of files) {
    const from = path.join(source, file.from);
    if (!fs.existsSync(from)) {
      throw new Error(`Paket dosyasi eksik: kurulum/paket/${file.from}`);
    }
    const to = path.join(OUT, file.to);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    log(`  + ${file.to.replace(/\\/g, "/")}`);
  }
}

main().catch((error) => {
  console.error("\nPaket hazırlanamadı:", error instanceof Error ? error.message : error);
  process.exit(1);
});
