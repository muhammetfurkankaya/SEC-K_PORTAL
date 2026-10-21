/**
 * Gece / gündüz modu.
 *
 * Kim karar verir:
 *   - Yönetici varsayılanı seçer: Gündüz / Gece / Sistem (ziyaretçinin
 *     işletim sistemi tercihi).
 *   - Ziyaretçi üst banttaki düğmeyle kendi seçimini yapar; seçim kendi
 *     tarayıcısında saklanır ve varsayılanı ezer.
 *   - Yönetici düğmeyi gizlerse ziyaretçinin eski seçimi de yok sayılır —
 *     aksi halde kimse değiştiremeyeceği bir seçimde kalırdı.
 *
 * Bu dosya veritabanına ve React'a dokunmuyor: testlerden doğrudan
 * çağrılabiliyor ve gömülü betik de buradaki kuralın aynısını uyguluyor.
 */

export const THEME_STORAGE_KEY = "seck-tema";

/** Ziyaretçinin seçebildikleri. */
export type ThemeChoice = "acik" | "koyu";
/** Yöneticinin seçebildikleri. */
export type ThemeDefault = "acik" | "koyu" | "sistem";
export type ResolvedTheme = "light" | "dark";

export function resolveTheme(
  stored: string | null,
  fallback: ThemeDefault,
  prefersDark: boolean,
  locked = false,
): ResolvedTheme {
  if (!locked && (stored === "acik" || stored === "koyu")) {
    return stored === "koyu" ? "dark" : "light";
  }
  if (fallback === "koyu") return "dark";
  if (fallback === "sistem") return prefersDark ? "dark" : "light";
  return "light";
}

/**
 * <head> içine gömülen betik — sayfa BOYANMADAN önce doğru temayı koyar.
 *
 * Bu olmasaydı sayfa önce gündüz çizilir, sonra React yüklenince geceye
 * dönerdi: her açılışta beyaz bir parlama. Bilinçli olarak eski JavaScript
 * (ES5, `var`, isteğe bağlı zincir yok): her tarayıcıda, hatta derleme
 * adımından geçmeden çalışmalı. Yönetim paneli her zaman gündüz.
 *
 * Kural resolveTheme ile aynı; tests/theme.test.ts ikisini karşılaştırıyor.
 */
export const THEME_INIT_SCRIPT = [
  "(function(){try{",
  "var d=document.documentElement;",
  "if(location.pathname.indexOf('/admin')===0){d.setAttribute('data-theme','light');return;}",
  "var f=d.getAttribute('data-theme-default')||'acik';",
  "var lock=d.getAttribute('data-theme-lock')==='1';",
  "var s=null;",
  "if(!lock){try{s=localStorage.getItem('" + THEME_STORAGE_KEY + "');}catch(e){}}",
  "var dark;",
  "if(s==='acik'||s==='koyu'){dark=s==='koyu';}",
  "else if(f==='koyu'){dark=true;}",
  "else if(f==='sistem'){dark=!!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);}",
  "else{dark=false;}",
  "d.setAttribute('data-theme',dark?'dark':'light');",
  "}catch(e){}})();",
].join("");
