import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isPhotoRoute } from "../lib/routes";
import { textPartsFor, textClassFor } from "../lib/appearance";
import { SETTINGS } from "../lib/settings-schema";

describe("saydam menü ve sekme rengi", () => {
  test("fotoğraflı sayfalar: ana sayfa ve bülten sekmeleri", () => {
    assert.equal(isPhotoRoute("/"), true);
    assert.equal(isPhotoRoute("/bultenler/sec-k"), true);
    assert.equal(isPhotoRoute("/bultenler/sec-k/"), true);
    for (const path of ["/ara", "/anketler", "/bultenler/sec-k/5", "/goruntule/5", "/admin"]) {
      assert.equal(isPhotoRoute(path), false, path);
    }
  });

  test("renk 'Varsayılan' iken ayrı renk sınıfı yok, seçilince var", () => {
    assert.equal(textPartsFor("nav", "buyuk", "otomatik").color, "");
    assert.equal(textPartsFor("nav", "buyuk", "kirmizi").color, "text-accent-ink");
    assert.equal(textPartsFor("nav", "buyuk", "koyu", true).color, "text-white");
    // Punto, birleşik sınıfla aynı.
    assert.ok(
      textClassFor("nav", "buyuk", "kirmizi").startsWith(textPartsFor("nav", "buyuk", "x").size),
    );
  });

  test("boş liste mesajları artık ayar değil", () => {
    for (const key of ["empty_home", "empty_category", "empty_surveys"]) {
      assert.equal(key in SETTINGS, false, key);
    }
  });
});
