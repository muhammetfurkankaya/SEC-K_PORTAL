import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Dosya işlemleri geçici bir veri klasöründe yapılır.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "seck-kapak-"));
process.env.SECK_DATA_DIR = dataDir;

type Uploads = typeof import("../lib/uploads");
let up: Uploads;

const PDF = "sec-k/7fc8060c-04d4-4192-b25e-786cbb2bf2d1.pdf";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

const file = (bytes: Uint8Array) => new File([bytes as Uint8Array<ArrayBuffer>], "kapak.jpg");

describe("bülten kapak görseli", () => {
  before(async () => {
    up = await import("../lib/uploads");
  });

  test("kapak yolu PDF yolundan türetilir (iki ayırıcı da)", () => {
    const expected = "_kapak/sec-k-7fc8060c-04d4-4192-b25e-786cbb2bf2d1.jpg";
    assert.equal(up.coverPathFor(PDF), expected);
    assert.equal(up.coverPathFor(PDF.replace("/", "\\")), expected);
    // Kapak yokken sürüm yalnızca PDF'in adı.
    assert.equal(up.coverVersion(PDF), "7fc8060c-04d4-4192-b25e-786cbb2bf2d1");
  });

  test("beklenmeyen yollardan kapak yolu üretilmez", () => {
    for (const bad of [
      "../sec-k/7fc8060c-04d4-4192-b25e-786cbb2bf2d1.pdf",
      "/etc/7fc8060c-04d4-4192-b25e-786cbb2bf2d1.pdf",
      "sec-k/../../x.pdf",
      "sec-k/bulten.pdf",
      "sec-k/7fc8060c-04d4-4192-b25e-786cbb2bf2d1.jpg",
    ]) {
      assert.equal(up.coverPathFor(bad), null, bad);
      assert.equal(up.coverAbsolutePath(bad), null, bad);
    }
  });

  test("yalnızca JPEG ve 1 MB'a kadar kabul edilir", async () => {
    await assert.rejects(up.saveCover(PDF, file(PNG)), up.UploadError);
    await assert.rejects(
      up.saveCover(PDF, file(new TextEncoder().encode("<svg onload=alert(1)>"))),
      up.UploadError,
    );
    const big = new Uint8Array(up.MAX_COVER_BYTES + 1);
    big.set(JPEG);
    await assert.rejects(up.saveCover(PDF, file(big)), up.UploadError);
    assert.equal(up.coverExists(PDF), false);
  });

  test("kapak değişince adres sürümü de değişir", async () => {
    await up.saveCover(PDF, file(JPEG));
    const first = up.coverVersion(PDF);
    assert.match(first, /^7fc8060c-04d4-4192-b25e-786cbb2bf2d1-\d+$/);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await up.saveCover(PDF, file(JPEG));
    assert.notEqual(up.coverVersion(PDF), first);
  });

  test("JPEG ölçüsü başlıktan okunur", () => {
    const hero = new Uint8Array(
      fs.readFileSync(path.join(__dirname, "..", "public", "brand", "hero-anasayfa.jpg")),
    );
    assert.deepEqual(up.jpegSize(hero), { width: 1600, height: 901 });
    assert.equal(up.jpegSize(PNG), null);
    assert.equal(up.jpegSize(JPEG), null, "SOF bölümü olmayan kesik dosya");
  });

  test("kaydedilen kapak PDF silinince o da silinir", async () => {
    await up.saveCover(PDF, file(JPEG));
    assert.equal(up.coverExists(PDF), true);
    await up.deletePdf(PDF);
    assert.equal(up.coverExists(PDF), false);
  });
});
