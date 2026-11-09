import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { pickClientIp } from "../lib/client-ip";

describe("pickClientIp", () => {
  test("yalnızca IIS'in eklediği en sağdaki adrese güvenir", () => {
    // İstemci "1.2.3.4" uydurdu; IIS gerçek adresi (10.0.0.1) sona ekledi.
    assert.equal(pickClientIp("1.2.3.4, 10.0.0.1"), "10.0.0.1");
    assert.equal(pickClientIp("1.2.3.4, 5.6.7.8, 10.0.0.1:51234"), "10.0.0.1");
  });

  test("x-real-ip okunmaz (IIS yazmaz, istemci uydurabilir)", () => {
    // @ts-expect-error — ikinci parametre artık yok
    assert.equal(pickClientIp(null, "10.20.30.40"), null);
  });

  test("vekilin kendi adresini istemci saymaz", () => {
    // IIS + ARR ya da HttpPlatformHandler arkasında Next, soketten üretilen
    // 127.0.0.1 değerini x-forwarded-for olarak sunuyor. Bu değer istemci
    // adresi sayılırsa tüm ziyaretçiler aynı hız sınırı kovasına düşer.
    assert.equal(pickClientIp("127.0.0.1"), null);
    assert.equal(pickClientIp("::1"), null);
    assert.equal(pickClientIp("::ffff:127.0.0.1"), null);
    // Sunucunun kendisinden gelen istek: soldaki uydurma değere düşülmez.
    assert.equal(pickClientIp("10.20.30.40, 127.0.0.1"), null);
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
