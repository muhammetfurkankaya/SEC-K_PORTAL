import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { footerLines } from "../lib/footer";

const base = {
  portal_title: "SEÇ-K Portalı",
  portal_subtitle: "Sağlık, Emniyet, Çevre ve Kalite",
  footer_company: "Turkish Fuel Services",
  footer_note: "Şirket içi kullanım içindir",
  footer_show_year: true,
};

describe("alt bilgi", () => {
  test("dolu parçalar ayırıcıyla birleşir", () => {
    assert.equal(
      footerLines(base, 2026).legal,
      "Turkish Fuel Services · 2026 · Şirket içi kullanım içindir",
    );
  });

  test("şirket adı silinince satır ayırıcıyla başlamaz", () => {
    assert.equal(
      footerLines({ ...base, footer_company: "" }, 2026).legal,
      "2026 · Şirket içi kullanım içindir",
    );
  });

  test("her şey silinip yıl kapatılınca satır boş kalır", () => {
    const lines = footerLines(
      { ...base, footer_company: " ", footer_note: "", footer_show_year: false },
      2026,
    );
    assert.equal(lines.legal, "");
  });

  test("yıl kapatılabilir", () => {
    assert.equal(
      footerLines({ ...base, footer_show_year: false }, 2026).legal,
      "Turkish Fuel Services · Şirket içi kullanım içindir",
    );
  });
});
