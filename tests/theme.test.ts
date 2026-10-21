import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  resolveTheme,
  type ThemeDefault,
} from "../lib/theme";

/**
 * Gece / gündüz modu kararı.
 *
 * Kural iki yerde yaşıyor: TypeScript'te (resolveTheme) ve sayfa boyanmadan
 * önce çalışan gömülü betikte (THEME_INIT_SCRIPT). İkisi ayrışırsa sunucu
 * bir temayı, tarayıcı başka bir temayı uygular. Son test betiği sahte bir
 * tarayıcıda çalıştırıp her birleşimde aynı sonucu verdiğini doğruluyor.
 */
describe("resolveTheme", () => {
  test("ziyaretçinin seçimi varsayılanı ezer", () => {
    assert.equal(resolveTheme("koyu", "acik", false), "dark");
    assert.equal(resolveTheme("acik", "koyu", true), "light");
    assert.equal(resolveTheme("acik", "sistem", true), "light");
  });

  test("seçim yoksa ya da geçersizse varsayılan uygulanır", () => {
    assert.equal(resolveTheme(null, "acik", true), "light");
    assert.equal(resolveTheme(null, "koyu", false), "dark");
    assert.equal(resolveTheme("mor", "koyu", false), "dark");
    assert.equal(resolveTheme("", "acik", false), "light");
  });

  test("'cihaza göre' işletim sistemi tercihini izler", () => {
    assert.equal(resolveTheme(null, "sistem", true), "dark");
    assert.equal(resolveTheme(null, "sistem", false), "light");
  });

  test("düğme gizlenmişse ziyaretçinin eski seçimi yok sayılır", () => {
    // Aksi halde kimsenin değiştiremeyeceği bir seçimde kalırdı.
    assert.equal(resolveTheme("koyu", "acik", false, true), "light");
    assert.equal(resolveTheme("acik", "koyu", false, true), "dark");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  test("satır içine güvenle gömülebilir", () => {
    assert.ok(!THEME_INIT_SCRIPT.includes("</script"), "betik etiketi kapatıyor");
    assert.ok(!THEME_INIT_SCRIPT.includes("`"), "ters tırnak var");
    assert.ok(THEME_INIT_SCRIPT.includes(THEME_STORAGE_KEY));
    assert.doesNotThrow(() => new Function(THEME_INIT_SCRIPT));
  });

  /** Betiği sahte bir tarayıcıda çalıştırır, koyduğu data-theme'i döndürür. */
  function runScript(opts: {
    path: string;
    def: ThemeDefault;
    lock: boolean;
    stored: string | null;
    prefersDark: boolean;
    storageThrows?: boolean;
  }): string | null {
    const attrs: Record<string, string> = { "data-theme-default": opts.def };
    if (opts.lock) attrs["data-theme-lock"] = "1";
    const document = {
      documentElement: {
        getAttribute: (k: string) => attrs[k] ?? null,
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
        },
      },
    };
    const localStorage = {
      getItem: (k: string) => {
        if (opts.storageThrows) throw new Error("engellendi");
        return k === THEME_STORAGE_KEY ? opts.stored : null;
      },
    };
    const window = { matchMedia: () => ({ matches: opts.prefersDark }) };
    const location = { pathname: opts.path };

    new Function("document", "localStorage", "window", "location", THEME_INIT_SCRIPT)(
      document,
      localStorage,
      window,
      location,
    );
    return attrs["data-theme"] ?? null;
  }

  test("her birleşimde resolveTheme ile aynı kararı verir", () => {
    for (const def of ["acik", "koyu", "sistem"] as const) {
      for (const stored of [null, "acik", "koyu", "bozuk"]) {
        for (const prefersDark of [false, true]) {
          for (const lock of [false, true]) {
            const got = runScript({ path: "/", def, lock, stored, prefersDark });
            const want = resolveTheme(stored, def, prefersDark, lock);
            assert.equal(got, want, JSON.stringify({ def, stored, prefersDark, lock }));
          }
        }
      }
    }
  });

  test("yönetim paneli her zaman gündüz", () => {
    assert.equal(
      runScript({
        path: "/admin/ayarlar",
        def: "koyu",
        lock: false,
        stored: "koyu",
        prefersDark: true,
      }),
      "light",
    );
  });

  test("tarayıcı depolamayı engellese de çalışır", () => {
    // Gizli pencere / sıkı güvenlik ayarı: varsayılana düşmeli, hata vermemeli.
    assert.equal(
      runScript({
        path: "/",
        def: "koyu",
        lock: false,
        stored: "acik",
        prefersDark: false,
        storageThrows: true,
      }),
      "dark",
    );
  });
});
