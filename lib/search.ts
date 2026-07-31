/**
 * Türkçe duyarlı arama yardımcıları.
 *
 * Bülten indeksinde "sec" yazan bir kullanıcı "SEÇ-K" bültenlerini,
 * "gorev" yazan "Görev" konusunu bulabilmelidir. Bunun için metinleri
 * karşılaştırmadan önce küçük harfe indirip diyakritikleri katlıyoruz.
 */

const FOLD_MAP: Record<string, string> = {
  ı: "i",
  i: "i",
  ş: "s",
  ğ: "g",
  ü: "u",
  ö: "o",
  ç: "c",
  â: "a",
  î: "i",
  û: "u",
};

/**
 * Metni arama için normalleştirir: Türkçe kurallarına göre küçük harfe
 * çevirir, Türkçeye özgü harfleri ASCII karşılıklarına katlar ve fazla
 * boşlukları temizler.
 *
 * `toLocaleLowerCase("tr")` kullanmak önemlidir: JavaScript'in varsayılan
 * `toLowerCase()` metodu "I" harfini "i" yapar, Türkçede ise "ı" olmalıdır.
 */
export function normalizeTr(value: string | null | undefined): string {
  if (!value) return "";
  const lowered = value.toLocaleLowerCase("tr");
  let out = "";
  for (const char of lowered) {
    out += FOLD_MAP[char] ?? char;
  }
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Arama terimini boşluklardan bölerek her parçanın hedef metinlerden
 * en az birinde geçmesini şart koşar. Böylece "12 acil" gibi çok kelimeli
 * aramalar hem bülten numarasında hem konuda eşleşebilir.
 */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const normalizedQuery = normalizeTr(query);
  if (!normalizedQuery) return true;

  const haystack = fields.map((f) => normalizeTr(f)).join(" ");
  return normalizedQuery.split(" ").every((term) => haystack.includes(term));
}

/**
 * Bülten numaralarını doğal (sayısal) sırada karşılaştırır.
 *
 * Düz metin sıralaması "10" değerini "2"den önce koyar; bülten
 * numaralarında bu yanlış görünür. Numaralar "2024/12" gibi karma
 * biçimlerde olabildiği için sayı ve metin parçalarını ayrı ayrı
 * karşılaştırıyoruz.
 */
export function compareBulletinNo(a: string, b: string): number {
  const chunk = (value: string) => value.match(/(\d+|\D+)/g) ?? [];
  const aParts = chunk(a);
  const bParts = chunk(b);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i += 1) {
    const aPart = aParts[i];
    const bPart = bParts[i];
    if (aPart === undefined) return -1;
    if (bPart === undefined) return 1;

    const aNum = Number(aPart);
    const bNum = Number(bPart);
    const bothNumeric = !Number.isNaN(aNum) && !Number.isNaN(bNum);

    if (bothNumeric) {
      if (aNum !== bNum) return aNum - bNum;
    } else {
      const cmp = normalizeTr(aPart).localeCompare(normalizeTr(bPart), "tr");
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}
