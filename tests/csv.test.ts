import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { csvNumber, toCsv } from "../lib/csv";

describe("toCsv", () => {
  test("BOM ile başlar ve noktalı virgülle ayırır", () => {
    // Türkçe Excel virgülü ondalık ayırıcı sayar; BOM olmadan ş/ğ/İ bozulur.
    const csv = toCsv([["a", "b"]]);
    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.ok(csv.includes("a;b"));
  });

  test("ayırıcı, tırnak ve satır sonu içeren hücreleri kaçırır", () => {
    const csv = toCsv([['tır"nak', "a;b", "iki\nsatır"]]);
    assert.ok(csv.includes('"tır""nak"'));
    assert.ok(csv.includes('"a;b"'));
    assert.ok(csv.includes('"iki\nsatır"'));
  });
});

describe("formül enjeksiyonu", () => {
  // Anket serbest metnini QR kodu okutan herkes yazabiliyor; bu metin karar
  // vericinin Excel'de açtığı dosyaya giriyor. Formül olarak yorumlanmaması
  // gerekir.
  test("tehlikeli başlangıçları tek tırnakla etkisizleştirir", () => {
    for (const kotu of [
      "=1+1",
      "=cmd|'/c calc'!A0",
      "+1",
      "@SUM(A1)",
      "-2+3",
      "\tsekme",
    ]) {
      const csv = toCsv([[kotu]]);
      assert.ok(csv.includes(`'${kotu}`) || csv.includes(`"'${kotu}`), `etkisizleşmedi: ${kotu}`);
    }
  });

  test("gerçek sayıları bozmaz", () => {
    // Puanlar ve süreler sayı olarak okunmaya devam etmeli.
    for (const iyi of ["3", "-3", "4,5", "12.75"]) {
      const csv = toCsv([[iyi]]);
      assert.ok(!csv.includes(`'${iyi}`), `gereksiz kaçırma: ${iyi}`);
    }
  });

  test("normal metne dokunmaz", () => {
    const csv = toCsv([["Bültenler çok faydalı"]]);
    assert.ok(csv.includes("Bültenler çok faydalı"));
    assert.ok(!csv.includes("'Bültenler"));
  });
});

describe("csvNumber", () => {
  test("ondalık ayırıcıyı virgüle çevirir", () => {
    assert.equal(csvNumber(4.5), "4,5");
    assert.equal(csvNumber(3), "3");
  });

  test("boş ve geçersiz değerlerde boş hücre verir", () => {
    assert.equal(csvNumber(null), "");
    assert.equal(csvNumber(undefined), "");
    assert.equal(csvNumber(Number.NaN), "");
  });
});
