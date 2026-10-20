import assert from "node:assert/strict";
import { test, describe } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  TEXT_SLOTS,
  allAppearanceClasses,
  alignClass,
  blockPositionClass,
  blockWidthClass,
  textClass,
} from "../lib/appearance";
import {
  COLOR_OPTIONS,
  SIZE_OPTIONS,
  SETTING_DEFAULTS,
  type TypedSettings,
} from "../lib/settings-schema";
import { resolveSettings } from "../lib/settings-validate";

function withAppearance(overrides: Record<string, string>): TypedSettings {
  return resolveSettings({ ...SETTING_DEFAULTS, ...overrides } as Record<string, string>);
}

describe("appearance", () => {
  test("her yuva × punto × renk birleşimi geçerli sınıf üretir", () => {
    for (const slot of TEXT_SLOTS) {
      for (const size of SIZE_OPTIONS) {
        for (const color of COLOR_OPTIONS) {
          const settings = withAppearance({
            [`type_${slot}_size`]: size.value,
            [`type_${slot}_color`]: color.value,
          });

          for (const onDark of [false, true]) {
            const result = textClass(settings, slot, { onDark });
            assert.ok(result.length > 0, `${slot}/${size.value}/${color.value}: boş sınıf`);
            assert.ok(!result.includes("undefined"), `${slot}: undefined sızdı`);
            assert.ok(!/\s{2,}/.test(result), `${slot}: çift boşluk`);
          }
        }
      }
    }
  });

  test("bilinmeyen değerler varsayılana düşer", () => {
    const bozuk = withAppearance({
      type_nav_size: "devasa",
      type_nav_color: "mor",
    });
    const normal = withAppearance({});
    assert.equal(textClass(bozuk, "nav"), textClass(normal, "nav"));
  });

  test("yerleşim yardımcıları bilinmeyen değerde varsayılan verir", () => {
    assert.equal(alignClass("orta"), "text-center");
    assert.equal(alignClass("yok"), "text-left");
    assert.equal(blockPositionClass("sag"), "ml-auto");
    assert.equal(blockPositionClass("yok"), "mr-auto");
    assert.equal(blockWidthClass("dar"), "max-w-3xl");
    assert.equal(blockWidthClass("yok"), "max-w-none");
  });

  /**
   * Bu testin varlık nedeni: Tailwind, çalışma anında birleştirilen sınıf
   * adlarını göremez. Tablolardaki bir sınıf safelist'te yoksa üretimde
   * hiç üretilmez ve yazı biçimsiz kalır — geliştirmede fark edilmez.
   */
  test("tabloların ürettiği her sınıf globals.css safelist'inde var", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    const match = css.match(/@source inline\("([^"]+)"\);/);
    assert.ok(match, "globals.css içinde @source inline(...) satırı bulunamadı");

    const safelist = new Set(match[1].split(/\s+/).filter(Boolean));
    const eksik = allAppearanceClasses().filter((cls) => !safelist.has(cls));
    assert.deepEqual(eksik, [], `safelist eksik: ${eksik.join(", ")}`);
  });

  test("safelist'te fazlalık yok — liste tablolarla birebir", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    const match = css.match(/@source inline\("([^"]+)"\);/);
    assert.ok(match);

    const uretilen = new Set(allAppearanceClasses());
    const fazla = match[1].split(/\s+/).filter((cls) => cls && !uretilen.has(cls));
    assert.deepEqual(fazla, [], `safelist'te kullanılmayan sınıf: ${fazla.join(", ")}`);
  });
});
