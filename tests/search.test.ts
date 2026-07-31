import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { compareBulletinNo, matchesQuery, normalizeTr } from "../lib/search";

describe("normalizeTr", () => {
  test("Türkçe büyük I harfini doğru küçültür", () => {
    // JavaScript'in varsayılan toLowerCase() metodu "I" → "i" yapar;
    // Türkçede "I" → "ı" olmalıdır.
    assert.equal(normalizeTr("IKMAL"), "ikmal");
    assert.equal(normalizeTr("İKMAL"), "ikmal");
  });

  test("Türkçeye özgü harfleri ASCII karşılığına katlar", () => {
    assert.equal(normalizeTr("SEÇ-K"), "sec-k");
    assert.equal(normalizeTr("Görev Değişikliği"), "gorev degisikligi");
    assert.equal(normalizeTr("Şişli"), "sisli");
    assert.equal(normalizeTr("Yakıt"), "yakit");
  });

  test("fazla boşlukları temizler", () => {
    assert.equal(normalizeTr("  iki   kelime  "), "iki kelime");
  });

  test("boş değerlerde boş dize döner", () => {
    assert.equal(normalizeTr(null), "");
    assert.equal(normalizeTr(undefined), "");
    assert.equal(normalizeTr(""), "");
  });
});

describe("matchesQuery", () => {
  test("ASCII yazımla Türkçe metni bulur", () => {
    assert.equal(matchesQuery("sec", "SEÇ-K-2026-01", "Yakıt İkmali"), true);
    assert.equal(matchesQuery("yakit", "SEÇ-K-2026-01", "Yakıt İkmali"), true);
    assert.equal(matchesQuery("ikmali", "SEÇ-K-2026-01", "Yakıt İkmali"), true);
  });

  test("bülten numarasında arama yapar", () => {
    assert.equal(matchesQuery("2026-01", "SEÇ-K-2026-01", "Konu"), true);
    assert.equal(matchesQuery("2026-02", "SEÇ-K-2026-01", "Konu"), false);
  });

  test("çok kelimeli aramada her parça eşleşmeli", () => {
    assert.equal(matchesQuery("01 yakit", "SEÇ-K-2026-01", "Yakıt İkmali"), true);
    // "atik" hiçbir alanda yok — eşleşmemeli.
    assert.equal(matchesQuery("01 atik", "SEÇ-K-2026-01", "Yakıt İkmali"), false);
  });

  test("boş arama her şeyi geçirir", () => {
    assert.equal(matchesQuery("", "herhangi", "bir şey"), true);
    assert.equal(matchesQuery("   ", "herhangi", "bir şey"), true);
  });

  test("null alanlarda çökmez", () => {
    assert.equal(matchesQuery("konu", null, "Konu", undefined), true);
  });
});

describe("compareBulletinNo", () => {
  test("sayıları doğal sırada karşılaştırır", () => {
    // Düz metin sıralaması "10" < "2" derdi; bu yanlış.
    const numbers = ["SEC-K-10", "SEC-K-2", "SEC-K-11", "SEC-K-1"];
    assert.deepEqual(
      [...numbers].sort(compareBulletinNo),
      ["SEC-K-1", "SEC-K-2", "SEC-K-10", "SEC-K-11"],
    );
  });

  test("yıl/sıra biçimini doğru sıralar", () => {
    const numbers = ["2026/10", "2025/3", "2026/2"];
    assert.deepEqual([...numbers].sort(compareBulletinNo), ["2025/3", "2026/2", "2026/10"]);
  });

  test("farklı ön ekleri alfabetik sıralar", () => {
    const numbers = ["THY-1", "IGA-1", "SMS-1"];
    assert.deepEqual([...numbers].sort(compareBulletinNo), ["IGA-1", "SMS-1", "THY-1"]);
  });

  test("aynı numara için 0 döner", () => {
    assert.equal(compareBulletinNo("SEC-K-2026-01", "SEC-K-2026-01"), 0);
  });
});
