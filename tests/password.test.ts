import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  hashPassword,
  verifyPassword,
} from "../lib/password";

describe("hashPassword / verifyPassword", () => {
  test("doğru şifreyi kabul, yanlışı reddeder", () => {
    const hash = hashPassword("Tfs2026...");
    assert.equal(verifyPassword("Tfs2026...", hash), true);
    assert.equal(verifyPassword("Tfs2026..", hash), false);
    assert.equal(verifyPassword("", hash), false);
  });

  test("aynı şifre her seferinde farklı karma üretir (tuz)", () => {
    assert.notEqual(hashPassword("aynisifre"), hashPassword("aynisifre"));
  });

  test("bozuk karma değerinde çökmez", () => {
    assert.equal(verifyPassword("x", "bu-bir-karma-degil"), false);
    assert.equal(verifyPassword("x", "scrypt$1$2$3$4"), false);
  });
});
