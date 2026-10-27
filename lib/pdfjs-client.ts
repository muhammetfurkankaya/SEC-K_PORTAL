/**
 * pdf.js'in tarayıcıda yüklenmesi — PDF okuyucu ve kapak üretimi ortak kullanır.
 *
 * YALNIZCA İSTEMCİDE çağrılır (useEffect / olay işleyicisi içinde). Kütüphane
 * dinamik içe aktarılıyor: sayfa kodu küçük kalır, sunucu tarafı onu hiç
 * çalıştırmaz. Yardımcı dosyalar (worker, yazı tipleri, çözücüler)
 * portalın kendi adresinden gelir: public/pdfjs/ (scripts/pdfjs-kopyala.cjs).
 */

const ASSETS = "/pdfjs/";

export async function loadPdf(source: string | ArrayBuffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `${ASSETS}pdf.worker.min.mjs`;

  return pdfjs.getDocument({
    ...(typeof source === "string" ? { url: source } : { data: new Uint8Array(source) }),
    wasmUrl: `${ASSETS}wasm/`,
    standardFontDataUrl: `${ASSETS}standard_fonts/`,
    cMapUrl: `${ASSETS}cmaps/`,
    cMapPacked: true,
    iccUrl: `${ASSETS}iccs/`,
    // Sunucu parçalı (Range) istek desteklemiyor; tek seferde iner.
    disableRange: true,
    enableXfa: false,
  });
}

/** Kapak görselinin piksel genişliği — kartta ~240 px, yüksek DPI için iki katı. */
export const COVER_WIDTH = 480;

/**
 * PDF'in ilk sayfasını küçük bir JPEG'e çevirir (bülten kapağı).
 *
 * Görsel bir kez, bülten yüklenirken yöneticinin tarayıcısında üretilir;
 * sunucuda görüntü işleme yapılamıyor (paket sharp/poppler içermiyor).
 */
export async function renderCoverJpeg(
  source: string | ArrayBuffer,
  width = COVER_WIDTH,
): Promise<Blob> {
  const task = await loadPdf(source);
  try {
    const doc = await task.promise;
    const page = await doc.getPage(1);
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

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("JPEG üretilemedi"))),
        "image/jpeg",
        0.82,
      ),
    );
  } finally {
    void task.destroy();
  }
}
