import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { TEXT_SLOTS } from "../lib/appearance";
import { TEXT_CARDS, cardKeys, textCardKeys } from "../lib/settings-layout";
import { SETTINGS, SETTING_KEYS, type SettingDef } from "../lib/settings-schema";

/**
 * "Metin ve Görünüm" sekmesinin kart düzeni.
 *
 * Bu sekme jenerik alan çiziciyi kullanmıyor: alanlar lib/settings-layout.ts
 * içindeki kart listesinden çiziliyor. Bir anahtar karta konmayı
 * unutulursa ekranda HİÇ görünmez ve düzenlenemez. Bu testler o boşluğu
 * yazarken yakalıyor.
 */
describe("metin kart düzeni", () => {
  const metinKeys = SETTING_KEYS.filter((key) => (SETTINGS[key] as SettingDef).group === "metin");

  test("metin grubundaki her anahtar tam olarak bir kartta", () => {
    const sayac = new Map<string, number>();
    for (const key of textCardKeys()) sayac.set(key, (sayac.get(key) ?? 0) + 1);

    const eksik = metinKeys.filter((key) => !sayac.has(key));
    assert.deepEqual(eksik, [], `hiçbir kartta olmayan anahtar: ${eksik.join(", ")}`);

    const tekrar = [...sayac].filter(([, n]) => n > 1).map(([key]) => key);
    assert.deepEqual(tekrar, [], `birden fazla kartta olan anahtar: ${tekrar.join(", ")}`);
  });

  test("kartlardaki her anahtar gerçekten metin grubunda", () => {
    // Başka gruptaki bir anahtar karta konarsa iki sekmede birden çizilir
    // ve form aynı adla iki değer gönderir.
    for (const key of textCardKeys()) {
      assert.ok(SETTING_KEYS.includes(key), `${key}: kayıtta yok`);
      assert.equal((SETTINGS[key] as SettingDef).group, "metin", `${key}: metin grubunda değil`);
    }
  });

  test("her punto/renk yuvası tam olarak bir kartta", () => {
    for (const slot of TEXT_SLOTS) {
      const kartlar = TEXT_CARDS.filter((card) => card.slot === slot);
      assert.equal(kartlar.length, 1, `${slot}: ${kartlar.length} kartta`);
    }
  });

  test("önizleme anahtarı o kartın kendi alanı", () => {
    // Önizleme yazılanı dinliyor; başka karttaki bir alanı gösterirse
    // yazdığınız metin önizlemeye hiç yansımaz.
    for (const card of TEXT_CARDS) {
      if (!card.previewKey) continue;
      assert.ok(card.fields.includes(card.previewKey), `${card.id}: önizleme anahtarı kartta yok`);
    }
  });

  test("kart kimlikleri benzersiz", () => {
    const ids = TEXT_CARDS.map((card) => card.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("punto yuvalı kart kendi type_ anahtarlarını çiziyor", () => {
    for (const card of TEXT_CARDS) {
      if (!card.slot) continue;
      const keys = cardKeys(card);
      assert.ok(keys.includes(`type_${card.slot}_size` as never));
      assert.ok(keys.includes(`type_${card.slot}_color` as never));
    }
  });
});
