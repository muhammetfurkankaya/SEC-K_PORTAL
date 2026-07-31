/**
 * Test amaçlı basit PDF üretici.
 *
 * Yalnızca demo verisi oluşturmak için kullanılır (scripts/demo.ts); portal
 * çalışma zamanında PDF üretmez, yüklenen dosyaları olduğu gibi saklar.
 * Bu yüzden dış bir PDF kütüphanesi eklemek yerine asgari yapıyı elle
 * kuruyoruz.
 */

/** PDF metin dizelerinde kaçırılması gereken karakterler. */
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Verilen satırlardan tek sayfalık bir PDF üretir.
 *
 * Helvetica WinAnsi kodlamasını kullandığı için Türkçeye özgü harfler
 * (ş, ğ, İ, ı) desteklenmez; demo içeriğinde ASCII karşılıkları kullanılır.
 */
export function makeSimplePdf(title: string, lines: string[]): Buffer {
  const content = [
    "BT",
    "/F1 20 Tf",
    "60 760 Td",
    `(${escapeText(title)}) Tj`,
    "/F2 11 Tf",
    "0 -34 Td",
    "16 TL",
    ...lines.map((line) => `(${escapeText(line)}) Tj T*`),
    "ET",
    // Marka kırmızısı ile ince bir üst çizgi.
    "0.807 0.125 0.156 rg",
    "60 780 476 3 re f",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  // Nesneleri sırayla yazıp her birinin bayt konumunu (xref için) kaydediyoruz.
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
