import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  SETTINGS,
  SETTING_DEFAULTS,
  SETTING_GROUPS,
  SETTING_KEYS,
  type SettingDef,
  type SettingKey,
} from "../lib/settings-schema";

/**
 * Ayar kaydının kendi tutarlılığı.
 *
 * Kayıt artık formun, doğrulamanın ve kaydetmenin tek kaynağı: buradaki bir
 * yazım hatası (var olmayan bir grup, listede olmayan bir varsayılan) üretimde
 * boş bir sekme ya da kaydedilemeyen bir alan olarak ortaya çıkar. Bu testler
 * o hataları yazarken yakalar.
 */
describe("ayar kaydı", () => {
  const groupIds = new Set(SETTING_GROUPS.map((g) => g.id));

  test("anahtar adları tutarlı ve varsayılanlar eksiksiz", () => {
    assert.ok(SETTING_KEYS.length > 50, "kayıt beklenenden küçük");
    for (const key of SETTING_KEYS) {
      assert.match(key, /^[a-z][a-z0-9_]*$/, `${key}: anahtar adı küçük harf olmalı`);
    }
    assert.deepEqual(Object.keys(SETTING_DEFAULTS).sort(), [...SETTING_KEYS].sort());
  });

  test("her alanın Türkçe etiketi ve geçerli grubu var", () => {
    for (const key of SETTING_KEYS) {
      const def: SettingDef = SETTINGS[key];
      assert.ok(def.label.trim().length > 0, `${key}: etiket boş`);
      assert.ok(groupIds.has(def.group), `${key}: '${def.group}' diye bir grup yok`);
    }
  });

  test("her enum en az iki seçenekli ve varsayılanı listede", () => {
    for (const key of SETTING_KEYS) {
      const def: SettingDef = SETTINGS[key];
      if (def.kind !== "enum") continue;

      const values = def.options.map((o) => o.value);
      assert.ok(values.length >= 2, `${key}: enum en az iki seçenek içermeli`);
      assert.equal(new Set(values).size, values.length, `${key}: seçenek değerleri tekrar ediyor`);
      assert.ok(values.includes(def.default), `${key}: varsayılan '${def.default}' listede yok`);
    }
  });

  test("boolean, sayı ve metin varsayılanları kendi kurallarına uyuyor", () => {
    for (const key of SETTING_KEYS) {
      const def: SettingDef = SETTINGS[key];

      if (def.kind === "bool") {
        assert.ok(
          def.default === "0" || def.default === "1",
          `${key}: bool varsayılanı 0/1 olmalı`,
        );
      }

      if (def.kind === "int") {
        const value = Number(def.default);
        assert.ok(Number.isInteger(value), `${key}: sayı varsayılanı tam sayı olmalı`);
        assert.ok(value >= def.min && value <= def.max, `${key}: varsayılan aralık dışında`);
      }

      if (def.kind === "text" || def.kind === "textarea") {
        assert.ok(
          def.default.length <= def.max,
          `${key}: varsayılan kendi uzunluk sınırını aşıyor`,
        );
      }
    }
  });

  test("zorunlu metin alanlarının varsayılanı boş değil", () => {
    for (const key of SETTING_KEYS) {
      const def: SettingDef = SETTINGS[key];
      if (def.kind === "text" && def.required) {
        assert.ok(def.default.trim().length > 0, `${key}: zorunlu alanın varsayılanı boş`);
      }
    }
  });

  test("her grupta en az bir alan var — boş sekme görünmemeli", () => {
    const used = new Set(SETTING_KEYS.map((key) => (SETTINGS[key] as SettingDef).group));
    for (const group of SETTING_GROUPS) {
      assert.ok(used.has(group.id), `${group.id}: grupta hiç alan yok`);
    }
  });

  test("eski anahtarlar korundu — kaydedilmiş ayarlar kaybolmamalı", () => {
    // Kayıt tablosuna geçerken bu anahtarlar yeniden adlandırılırsa
    // müşterinin veritabanındaki değerler sessizce yok sayılırdı.
    // (QDMS anahtarları bilinçli olarak kaldırıldı — aşağıdaki teste bakın.)
    const onceki: SettingKey[] = [
      "portal_title",
      "portal_subtitle",
      "home_intro",
      "footer_note",
      "announcement",
      "announcement_level",
      "announcement_active",
      "home_recent_count",
      "default_sort",
      "enable_pdf_preview",
      "show_download_count",
      "show_surveys_section",
    ];
    for (const key of onceki) {
      assert.ok(SETTING_KEYS.includes(key), `${key}: eski anahtar kayıttan düşmüş`);
    }
  });

  test("QDMS ile ilgili hiçbir ayar yok", () => {
    // Portaldan QDMS tamamen kaldırıldı; geri sızmasın.
    const sizan = SETTING_KEYS.filter((key) => {
      const def: SettingDef = SETTINGS[key];
      return /qdms/i.test(key) || /qdms/i.test(def.label) || /qdms/i.test(def.help ?? "");
    });
    assert.deepEqual(sizan, []);
    assert.ok(!SETTING_GROUPS.some((g) => /qdms/i.test(g.id + g.title)));
  });
});
