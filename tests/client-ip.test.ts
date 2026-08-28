import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { pickClientIp } from "../lib/client-ip";

describe("pickClientIp", () => {
  test("x-forwarded-for'daki ilk adresi alır", () => {
    assert.equal(pickClientIp("10.20.30.40, 10.0.0.1"), "10.20.30.40");
  });

  test("başlık yoksa x-real-ip'e düşer", () => {
    assert.equal(pickClientIp(null, "10.20.30.40"), "10.20.30.40");
  });

  test("vekilin kendi adresini istemci saymaz", () => {
    // IIS + ARR ya da HttpPlatformHandler arkasında Next, soketten üretilen
    // 127.0.0.1 değerini x-forwarded-for olarak sunuyor. Bu değer istemci
    // adresi sayılırsa tüm ziyaretçiler aynı hız sınırı kovasına düşer.
    assert.equal(pickClientIp("127.0.0.1"), null);
    assert.equal(pickClientIp("::1"), null);
    assert.equal(pickClientIp("::ffff:127.0.0.1"), null);
    assert.equal(pickClientIp(null, "127.0.0.1"), null);
  });

  test("zincirde vekil adresi varsa gerçek istemciyi bulur", () => {
    assert.equal(pickClientIp("127.0.0.1, 10.20.30.40"), "10.20.30.40");
  });

  test("porta takılmaz", () => {
    // IIS, istemci portunu da ekleyebiliyor.
    assert.equal(pickClientIp("10.20.30.40:51234"), "10.20.30.40");
    assert.equal(pickClientIp("[2001:db8::5]:51234"), "2001:db8::5");
  });

  test("IPv6 adresini porta bakarak bozmaz", () => {
    assert.equal(pickClientIp("2001:db8::5"), "2001:db8::5");
  });

  test("boş ve anlamsız değerlerde null döner", () => {
    assert.equal(pickClientIp(null), null);
    assert.equal(pickClientIp(""), null);
    assert.equal(pickClientIp("  ,  "), null);
    assert.equal(pickClientIp("unknown"), null);
  });
});
