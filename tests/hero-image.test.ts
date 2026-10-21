import assert from "node:assert/strict";
import { test, describe } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Hero görseli: tür tespiti, yol koruması, kayıt ve çözümleme.
 *
 * Veri klasörü içe aktarmadan ÖNCE ayarlanıyor: lib/paths.ts DATA_DIR'i
 * modül yüklenirken bir kez hesaplıyor.
 */
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "seck-hero-"));
process.env.SECK_DATA_DIR = dataDir;

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const WEBP = new TextEncoder().encode("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ");
const SVG = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
);
const HTML = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");

function fileOf(bytes: Uint8Array, name: string, type: string): File {
  return new File([bytes as Uint8Array<ArrayBuffer>], name, { type });
}

describe("sniffImageType", () => {
  test("JPEG, PNG ve WebP ilk baytlarından tanınır", async () => {
    const { sniffImageType } = await import("../lib/uploads");
    assert.equal(sniffImageType(JPEG), "jpg");
    assert.equal(sniffImageType(PNG), "png");
    assert.equal(sniffImageType(WEBP), "webp");
  });

  test("SVG ve HTML reddedilir — etkin belgeler görsel değildir", async () => {
    const { sniffImageType } = await import("../lib/uploads");
    assert.equal(sniffImageType(SVG), null);
    assert.equal(sniffImageType(HTML), null);
    assert.equal(sniffImageType(new Uint8Array([])), null);
  });
});

describe("saveHeroImage", () => {
  test("uzantı dosya adından değil içerikten belirlenir", async () => {
    const { saveHeroImage, UploadError } = await import("../lib/uploads");

    // Adı .jpg ama içi SVG: reddedilmeli.
    await assert.rejects(saveHeroImage(fileOf(SVG, "masum.jpg", "image/jpeg")), UploadError);

    // Adı .svg ama içi PNG: PNG olarak kaydedilmeli.
    const saved = await saveHeroImage(fileOf(PNG, "garip.svg", "image/svg+xml"));
    assert.match(saved.path, /^_gorsel\/[0-9a-f-]{36}\.png$/);
  });

  test("boyut sınırı aşılamaz", async () => {
    const { saveHeroImage, MAX_HERO_BYTES, UploadError } = await import("../lib/uploads");
    const big = new Uint8Array(MAX_HERO_BYTES + 1);
    big.set(JPEG);
    await assert.rejects(saveHeroImage(fileOf(big, "buyuk.jpg", "image/jpeg")), UploadError);
  });

  test("her kayıt yeni bir ad alır ve önceki dosya silinir", async () => {
    const { saveHeroImage, heroAbsolutePath } = await import("../lib/uploads");

    const first = await saveHeroImage(fileOf(JPEG, "a.jpg", "image/jpeg"));
    const firstAbs = heroAbsolutePath(first.path)!;
    assert.ok(fs.existsSync(firstAbs));

    const second = await saveHeroImage(fileOf(JPEG, "b.jpg", "image/jpeg"), first.path);
    assert.notEqual(second.path, first.path, "aynı ad önbelleği bozardı");
    assert.equal(fs.existsSync(firstAbs), false, "önceki dosya silinmeli");
    assert.ok(fs.existsSync(heroAbsolutePath(second.path)!));
  });
});

describe("resolveHeroRequest", () => {
  const stored = "_gorsel/0f8fad5b-d9cb-469f-a165-70867728950e.jpg";

  test("yalnızca ayarlarda kayıtlı görsel sunulur", async () => {
    const { resolveHeroRequest } = await import("../lib/uploads");
    const hit = resolveHeroRequest(stored.split("/"), stored);
    assert.ok(hit);
    assert.equal(hit.type, "jpg");

    // Biçimi geçerli ama kayıtlı olmayan bir dosya: sunulmaz.
    const other = "_gorsel/7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg";
    assert.equal(resolveHeroRequest(other.split("/"), stored), null);
  });

  test("yol kaçışı ve desen dışı adlar reddedilir", async () => {
    const { resolveHeroRequest } = await import("../lib/uploads");
    const kotu = [
      ["..", "portal.db"],
      ["_gorsel", "..", "..", "portal.db"],
      ["_gorsel", "../session-secret"],
      ["_gorsel", "resim.svg"],
      ["sec-k", "0f8fad5b-d9cb-469f-a165-70867728950e.pdf"],
      ["/etc", "passwd"],
      [],
    ];
    for (const parts of kotu) {
      assert.equal(resolveHeroRequest(parts, stored), null, parts.join("/"));
    }
    // Kayıtlı yol bile bozuk olsa sunulmaz.
    assert.equal(resolveHeroRequest(["..", "x"], "../x"), null);
  });
});

describe("resolveHomeHero", () => {
  async function settings(overrides: Record<string, string>) {
    const { resolveSettings } = await import("../lib/settings-validate");
    return resolveSettings(overrides);
  }

  test("yüklenen görsel > paketle gelen > gradyan", async () => {
    const { resolveHomeHero } = await import("../lib/hero");
    const path = "_gorsel/0f8fad5b-d9cb-469f-a165-70867728950e.jpg";

    const yuklu = resolveHomeHero(await settings({ home_hero_path: path }), "/brand/hero.jpg");
    assert.equal(yuklu.imageSrc, `/api/gorsel/${path}`);
    assert.equal(yuklu.uploaded, true);

    const paket = resolveHomeHero(await settings({}), "/brand/hero.jpg");
    assert.equal(paket.imageSrc, "/brand/hero.jpg");
    assert.equal(paket.uploaded, false);

    const hicbiri = resolveHomeHero(await settings({}), null);
    assert.equal(hicbiri.imageSrc, null, "görsel yoksa marka gradyanı");

    const gradyan = resolveHomeHero(
      await settings({ home_hero_path: path, home_hero_style: "gradyan" }),
      "/brand/hero.jpg",
    );
    assert.equal(gradyan.imageSrc, null, "fotoğrafsız seçimi her şeyi ezer");
  });

  test("otomatik perde parlak görselde güçlenir", async () => {
    const { resolveHomeHero, BRIGHT_THRESHOLD } = await import("../lib/hero");
    const path = "_gorsel/0f8fad5b-d9cb-469f-a165-70867728950e.jpg";

    const parlak = resolveHomeHero(
      await settings({ home_hero_path: path, home_hero_brightness: String(BRIGHT_THRESHOLD + 30) }),
    );
    assert.equal(parlak.scrim, "strong");

    const koyu = resolveHomeHero(
      await settings({ home_hero_path: path, home_hero_brightness: "60" }),
    );
    assert.equal(koyu.scrim, "normal");

    const elle = resolveHomeHero(
      await settings({
        home_hero_path: path,
        home_hero_brightness: "60",
        home_hero_scrim: "guclu",
      }),
    );
    assert.equal(elle.scrim, "strong", "elle seçim otomatiği ezer");
  });

  test("bozuk ya da tehlikeli yol/ön izleme sayfaya sızmaz", async () => {
    const { resolveHomeHero, safeBlur } = await import("../lib/hero");

    const bozuk = resolveHomeHero(await settings({ home_hero_path: "../../portal.db" }), null);
    assert.equal(bozuk.imageSrc, null);

    assert.equal(safeBlur('data:image/jpeg;base64,AAAA") ; background:url(//kotu'), null);
    assert.equal(safeBlur("https://dis-site/x.jpg"), null);
    assert.equal(
      safeBlur("data:image/jpeg;base64,/9j/4AAQSkZJRg=="),
      "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    );
  });
});

describe("gizli ayarlar", () => {
  test("hero yolu formdan yazılamaz", async () => {
    // "Ayarları kaydet" yüklenen görseli asla ezmemeli: bu anahtarlar
    // yalnızca yükleme eylemiyle yazılıyor.
    const { isFormKey, SETTING_KEYS, SETTINGS } = await import("../lib/settings-schema");
    for (const key of ["home_hero_path", "home_hero_blur", "home_hero_brightness"]) {
      assert.equal(isFormKey(key), false, `${key} formdan yazılabiliyor`);
    }
    assert.equal(isFormKey("home_hero_scrim"), true, "kullanıcı seçimi formda olmalı");

    const gizli = SETTING_KEYS.filter((k) => (SETTINGS[k] as { hidden?: true }).hidden);
    assert.deepEqual(gizli.sort(), ["home_hero_blur", "home_hero_brightness", "home_hero_path"]);
  });
});
