import assert from "node:assert/strict";
import { test, describe } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Ayarların veritabanı turu.
 *
 * Veri klasörünü içe aktarmadan ÖNCE ayarlıyoruz: lib/paths.ts DATA_DIR'i
 * modül yüklenirken bir kez hesaplıyor.
 */
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "seck-settings-"));
process.env.SECK_DATA_DIR = dataDir;

describe("ayar veritabanı", () => {
  test("her türden bir anahtar yazılıp aynı tiple okunuyor", async () => {
    const { setSettings, getSettings } = await import("../lib/db/queries/settings");

    setSettings({
      portal_title: "TFS Pusula",
      home_recent_count: "9",
      show_search_band: "0",
      default_sort: "no-artan",
      home_block_position: "orta",
    });

    const settings = getSettings();
    assert.equal(settings.portal_title, "TFS Pusula");
    assert.equal(settings.home_recent_count, 9, "sayı olarak gelmeli");
    assert.equal(settings.show_search_band, false, "boolean olarak gelmeli");
    assert.equal(settings.default_sort, "no-artan");
    assert.equal(settings.home_block_position, "orta");
  });

  test("duyuru yalnızca metin doluyken ve bant açıkken görünür", async () => {
    const { setSettings, getSettings } = await import("../lib/db/queries/settings");

    setSettings({ announcement: "", announcement_active: "1" });
    assert.equal(getSettings().announcementVisible, false, "boş metin görünmemeli");

    setSettings({ announcement: "Bakım çalışması", announcement_active: "0" });
    assert.equal(getSettings().announcementVisible, false, "kapalıyken görünmemeli");

    setSettings({ announcement: "Bakım çalışması", announcement_active: "1" });
    assert.equal(getSettings().announcementVisible, true);
  });

  test("bilinmeyen anahtar yok sayılır, bozuk değer varsayılana düşer", async () => {
    const { getDb } = await import("../lib/db");
    const { getRawSettings, getSettings } = await import("../lib/db/queries/settings");

    getDb()
      .prepare(
        `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
      )
      .run("kaldirilmis_ayar", "deger");
    getDb()
      .prepare(
        `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
      )
      .run("home_recent_count", "9999");

    assert.ok(
      !Object.keys(getRawSettings()).includes("kaldirilmis_ayar"),
      "kayıtta olmayan anahtar arayüze geçmemeli",
    );
    assert.equal(getSettings().home_recent_count, 24, "üst sınıra çekilmeli");
  });

  test("sıfırlama YENİ eklenen anahtarları da varsayılana döndürür", async () => {
    const { setSettings, resetSettings, getSettings } = await import("../lib/db/queries/settings");
    const { SETTING_KEYS } = await import("../lib/settings-schema");
    const { resolveSettings } = await import("../lib/settings-validate");

    setSettings({ nav_home_label: "Başlangıç", type_home_title_size: "cok-buyuk" });
    resetSettings();

    const settings = getSettings();
    const varsayilan = resolveSettings({});
    for (const key of SETTING_KEYS) {
      assert.deepEqual(
        settings[key],
        varsayilan[key],
        `${key}: sıfırlamadan sonra varsayılan olmalı`,
      );
    }
  });
});
