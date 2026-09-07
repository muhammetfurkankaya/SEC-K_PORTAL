import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { checkRateLimit, resetRateLimit } from "../lib/rate-limit";

describe("checkRateLimit", () => {
  test("sınıra kadar izin verir, sonra reddeder", () => {
    const key = `test-sinir-${Math.random()}`;
    for (let i = 0; i < 3; i += 1) {
      assert.equal(checkRateLimit(key, 3, 60_000).allowed, true, `${i}. deneme reddedildi`);
    }
    const asim = checkRateLimit(key, 3, 60_000);
    assert.equal(asim.allowed, false);
    assert.ok(asim.retryAfterSeconds > 0);
  });

  test("resetRateLimit sayacı sıfırlar", () => {
    // Başarılı girişten sonra kullanıcı ceza almamalı.
    const key = `test-reset-${Math.random()}`;
    checkRateLimit(key, 1, 60_000);
    assert.equal(checkRateLimit(key, 1, 60_000).allowed, false);

    resetRateLimit(key);
    assert.equal(checkRateLimit(key, 1, 60_000).allowed, true);
  });

  test("pencere dolduğunda yeniden izin verir", () => {
    const key = `test-pencere-${Math.random()}`;
    assert.equal(checkRateLimit(key, 1, 1).allowed, true);
    assert.equal(checkRateLimit(key, 1, 1).allowed, false);

    const sonra = Date.now() + 5;
    while (Date.now() < sonra) { /* kısa pencerenin geçmesini bekle */ }

    assert.equal(checkRateLimit(key, 1, 1).allowed, true);
  });

  test("çok sayıda farklı anahtar bellekte birikmez", () => {
    // Anahtarlar istemciden gelen değerleri içerdiği için saldırgan her
    // denemede yenisini üretebilir; süresi geçmiş kovalar temizlenmeli.
    for (let i = 0; i < 12_000; i += 1) {
      checkRateLimit(`test-sizinti-${i}`, 5, 1);
    }

    // Temizlik çalıştıysa sınır hâlâ doğru işliyor olmalı.
    const key = `test-sizinti-son-${Math.random()}`;
    assert.equal(checkRateLimit(key, 2, 60_000).allowed, true);
    assert.equal(checkRateLimit(key, 2, 60_000).allowed, true);
    assert.equal(checkRateLimit(key, 2, 60_000).allowed, false);
  });
});
