/**
 * pdf.js'in tarayıcıda yüklenmesi — PDF okuyucu ve kapak üretimi ortak kullanır.
 *
 * YALNIZCA İSTEMCİDE çağrılır (useEffect / olay işleyicisi içinde). Kütüphane
 * dinamik içe aktarılıyor: sayfa kodu küçük kalır, sunucu tarafı onu hiç
 * çalıştırmaz. Yardımcı dosyalar (worker, yazı tipleri, çözücüler)
 * portalın kendi adresinden gelir: public/pdfjs/ (scripts/pdfjs-kopyala.cjs).
 */

import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

const ASSETS = "/pdfjs/";

export async function loadPdf(source: string | ArrayBuffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `${ASSETS}pdf.worker.min.mjs`;

  return pdfjs.getDocument({
    ...(typeof source === "string" ? { url: source } : { data: new Uint8Array(source.slice(0)) }),
    wasmUrl: `${ASSETS}wasm/`,
    standardFontDataUrl: `${ASSETS}standard_fonts/`,
    cMapUrl: `${ASSETS}cmaps/`,
    cMapPacked: true,
    iccUrl: `${ASSETS}iccs/`,
    // (Kopya: pdf.js veriyi worker'a aktarırken kaynağı boşaltıyor; çağıranın
    // elindeki içerik kullanılabilir kalsın.)
    // Sunucu parçalı (Range) istek desteklemiyor; tek seferde iner.
    disableRange: true,
    enableXfa: false,
  });
}

/** Kapak görselinin piksel genişliği — kartta ~240 px, yüksek DPI için iki katı. */
export const COVER_WIDTH = 480;

export type PdfDoc = PDFDocumentProxy;

/** Bir sayfayı beyaz zeminli tuvale çizer ve JPEG olarak döndürür. */
export async function renderPageJpeg(
  doc: PdfDoc,
  pageNumber: number,
  width: number,
  quality = 0.82,
): Promise<Blob> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: width / base.width });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  // Saydam PDF arka planı JPEG'de siyaha dönmesin.
  const context = canvas.getContext("2d");
  if (!context) throw new Error("tuval yok");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, viewport, background: "#ffffff" }).promise;

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("JPEG üretilemedi"))),
      "image/jpeg",
      quality,
    ),
  );
}

/**
 * PDF'in bir sayfasını (varsayılan: ilk) küçük bir JPEG'e çevirir — bülten
 * kapağı.
 *
 * Görsel bir kez, bülten yüklenirken yöneticinin tarayıcısında üretilir;
 * sunucuda görüntü işleme yapılamıyor (paket sharp/poppler içermiyor).
 */
export async function renderCoverJpeg(
  source: string | ArrayBuffer,
  width = COVER_WIDTH,
  pageNumber = 1,
): Promise<Blob> {
  const task = await loadPdf(source);
  try {
    const doc = await task.promise;
    return await renderPageJpeg(doc, Math.min(Math.max(1, pageNumber), doc.numPages), width);
  } finally {
    void task.destroy();
  }
}
