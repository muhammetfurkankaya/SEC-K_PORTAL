import assert from "node:assert/strict";
import { test, describe } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Ana sayfa görseli: paketteki dosyadan çözümleme ve görsel türü tespiti.
 *
 * Görsel panelden yüklenmiyor; geliştirici public/brand/hero-anasayfa.*
 * dosyasını değiştiriyor. Veri klasörü içe aktarmadan ÖNCE ayarlanıyor:
 * lib/paths.ts DATA_DIR'i modül yüklenirken bir kez hesaplıyor.
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

describe("resolveHomeHero", () => {
  async function settings(overrides: Record<string, string>) {
    const { resolveSettings } = await import("../lib/settings-validate");
    return resolveSettings(overrides);
  }

  test("paketteki görsel → marka gradyanı", async () => {
    const { resolveHomeHero } = await import("../lib/hero");

    const paket = resolveHomeHero(await settings({}), "/brand/hero-anasayfa.jpg?v=1");
    assert.equal(paket.imageSrc, "/brand/hero-anasayfa.jpg?v=1");

    const yok = resolveHomeHero(await settings({}), null);
    assert.equal(yok.imageSrc, null, "görsel yoksa marka gradyanı");

    const gradyan = resolveHomeHero(
      await settings({ home_hero_style: "gradyan" }),
      "/brand/hero-anasayfa.jpg?v=1",
    );
    assert.equal(gradyan.imageSrc, null, "fotoğrafsız seçimi görseli ezer");
  });

  test("daha önce panelden yüklenmiş görsel kaydı yok sayılır", async () => {
    const { resolveHomeHero } = await import("../lib/hero");
    const eski = await settings({
      home_hero_path: "_gorsel/0f8fad5b-d9cb-469f-a165-70867728950e.jpg",
    } as Record<string, string>);
    const hero = resolveHomeHero(eski, "/brand/hero-anasayfa.jpg?v=1");
    assert.equal(hero.imageSrc, "/brand/hero-anasayfa.jpg?v=1");
  });

  test("yazı perdesi: Normal / Güçlü; eski 'otomatik' kaydı Normal'e düşer", async () => {
    const { resolveHomeHero } = await import("../lib/hero");
    const src = "/brand/hero-anasayfa.jpg?v=1";
    assert.equal(resolveHomeHero(await settings({}), src).scrim, "normal");
    assert.equal(
      resolveHomeHero(await settings({ home_hero_scrim: "guclu" }), src).scrim,
      "strong",
    );
    assert.equal(
      resolveHomeHero(await settings({ home_hero_scrim: "otomatik" }), src).scrim,
      "normal",
    );
  });
});

describe("homeHeroImage", () => {
  test("adres dosyanın değişme zamanını taşır; dosya değişince adres değişir", async () => {
    const { homeHeroImage } = await import("../lib/brand");
    const cwd = process.cwd();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "seck-brand-"));
    const brand = path.join(root, "public", "brand");
    fs.mkdirSync(brand, { recursive: true });
    process.chdir(root);
    try {
      assert.equal(homeHeroImage(), null, "dosya yoksa gradyan");

      const file = path.join(brand, "hero-anasayfa.jpg");
      fs.writeFileSync(file, JPEG);
      fs.utimesSync(file, 1_700_000_000, 1_700_000_000);
      assert.equal(homeHeroImage(), "/brand/hero-anasayfa.jpg?v=1700000000000");

      fs.utimesSync(file, 1_700_000_500, 1_700_000_500);
      assert.equal(homeHeroImage(), "/brand/hero-anasayfa.jpg?v=1700000500000");

      // WebP önce gelir (daha küçük); ikisi birden varsa WebP seçilir.
      fs.writeFileSync(path.join(brand, "hero-anasayfa.webp"), WEBP);
      assert.match(homeHeroImage() ?? "", /^\/brand\/hero-anasayfa\.webp\?v=\d+$/);
    } finally {
      process.chdir(cwd);
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("yükleme yüzeyi kaldırıldı", () => {
  test("görsel yükleme anahtarları ve rotası yok", async () => {
    const { SETTING_KEYS } = await import("../lib/settings-schema");
    for (const key of ["home_hero_path", "home_hero_blur", "home_hero_brightness"]) {
      assert.equal((SETTING_KEYS as readonly string[]).includes(key), false, key);
    }
    assert.equal(fs.existsSync(path.join(process.cwd(), "app", "api", "gorsel")), false);
  });
});
