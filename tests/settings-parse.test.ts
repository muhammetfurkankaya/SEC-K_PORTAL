import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { SETTINGS, SETTING_KEYS, type SettingDef } from "../lib/settings-schema";
import { parseSetting, resolveSettings, buildSettingsSchema } from "../lib/settings-validate";

/**
 * Okuma yönü: veritabanındaki metin → tipli değer.
 *
 * Buradaki asıl güvence şu: veritabanında kalmış bozuk ya da eski bir değer
 * (ör. kaldırılmış bir seçenek) arayüze sızmamalı, sessizce varsayılana
 * düşmeli. Aksi halde tek bir eski satır sayfayı biçimsiz bırakabilir.
 */
describe("parseSetting", () => {
  test("her anahtar kendi varsayılanını sorunsuz çözüyor", () => {
    for (const key of SETTING_KEYS) {
      const def: SettingDef = SETTINGS[key];
      const parsed = parseSetting(key, def.default);

      if (def.kind === "bool") assert.equal(typeof parsed, "boolean", key);
      else if (def.kind === "int") assert.equal(parsed, Number(def.default), key);
      else assert.equal(parsed, def.default, key);
    }
  });

  test("değer hiç kaydedilmemişse varsayılan gelir", () => {
    for (const key of SETTING_KEYS) {
      const def: SettingDef = SETTINGS[key];
      const parsed = parseSetting(key, undefined);
      if (def.kind === "bool") assert.equal(parsed, def.default === "1", key);
      else if (def.kind === "int") assert.equal(parsed, Number(def.default), key);
      else assert.equal(parsed, def.default, key);
    }
  });

  test("boolean yalnızca bilinen doğru değerleri kabul eder", () => {
    assert.equal(parseSetting("enable_pdf_preview", "1"), true);
    assert.equal(parseSetting("enable_pdf_preview", "true"), true);
    assert.equal(parseSetting("enable_pdf_preview", "on"), true);
    assert.equal(parseSetting("enable_pdf_preview", "0"), false);
    assert.equal(parseSetting("enable_pdf_preview", ""), false);
    assert.equal(parseSetting("enable_pdf_preview", "evet"), false);
  });

  test("sayı sınırlanır, saçma değer varsayılana döner", () => {
    assert.equal(parseSetting("home_recent_count", "12"), 12);
    assert.equal(parseSetting("home_recent_count", "1"), 3, "alt sınır");
    assert.equal(parseSetting("home_recent_count", "500"), 24, "üst sınır");
    assert.equal(parseSetting("home_recent_count", "abc"), 6, "sayı değilse varsayılan");
    assert.equal(parseSetting("home_recent_count", "7.9"), 7, "ondalık kırpılır");
  });

  test("listede olmayan enum değeri varsayılana düşer", () => {
    assert.equal(parseSetting("default_sort", "no-artan"), "no-artan");
    assert.equal(parseSetting("default_sort", "kaldirilmis-secenek"), "tarih-yeni");
    assert.equal(parseSetting("home_kicker_pos", "altta"), "altta");
    assert.equal(parseSetting("home_kicker_pos", ""), "altta");
  });

  test("resolveSettings boş tablodan tam bir ayar kümesi üretir", () => {
    const resolved = resolveSettings({});
    assert.deepEqual(Object.keys(resolved).sort(), [...SETTING_KEYS].sort());
    assert.equal(resolved.portal_title, "SEÇ-K Portalı");
    assert.equal(resolved.show_surveys_section, true);
    assert.equal(resolved.home_recent_count, 6);
  });
});

/**
 * Yazma yönü: form verisi → saklanacak metin.
 */
describe("buildSettingsSchema", () => {
  test("varsayılanlardan kurulu bir form kabul edilir ve metin döner", () => {
    const input: Record<string, string> = {};
    for (const key of SETTING_KEYS) input[key] = (SETTINGS[key] as SettingDef).default;

    const parsed = buildSettingsSchema(SETTING_KEYS).safeParse(input);
    assert.ok(parsed.success, JSON.stringify(parsed.success ? {} : parsed.error.issues[0]));
    for (const value of Object.values(parsed.data)) {
      assert.equal(typeof value, "string", "saklanacak değer daima metin olmalı");
    }
  });

  test("gönderilmeyen onay kutusu kapalı olarak yazılır", () => {
    const parsed = buildSettingsSchema(["enable_pdf_preview"]).safeParse({
      enable_pdf_preview: "",
    });
    assert.ok(parsed.success);
    assert.equal(parsed.data.enable_pdf_preview, "0");
  });

  test("zorunlu alan boş bırakılamaz", () => {
    const parsed = buildSettingsSchema(["portal_title"]).safeParse({ portal_title: "   " });
    assert.equal(parsed.success, false);
    if (!parsed.success) assert.equal(parsed.error.issues[0].path[0], "portal_title");
  });

  test("uzunluk sınırı aşılamaz", () => {
    const parsed = buildSettingsSchema(["nav_home_label"]).safeParse({
      nav_home_label: "x".repeat(200),
    });
    assert.equal(parsed.success, false);
  });

  test("yalnızca gönderilen anahtarlar doğrulanır", () => {
    // __alanlar mekanizması: çizilmemiş bir sekmedeki alanlar istenmez.
    const parsed = buildSettingsSchema(["portal_title"]).safeParse({ portal_title: "Deneme" });
    assert.ok(parsed.success);
    assert.deepEqual(Object.keys(parsed.data), ["portal_title"]);
  });
});
