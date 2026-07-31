import QRCode from "qrcode";

/**
 * Anket adresi için QR kod üretir.
 *
 * Hem PNG (ekranda göstermek ve indirmek için) hem SVG (baskıda kalite
 * kaybı olmaması için) üretilir. Kod, koyu modülleri marka koyusu (#1D252D)
 * ile çizilir; QR okunabilirliği için zemin beyaz bırakılır.
 */
export type QrAssets = { pngDataUrl: string; svg: string };

export async function makeQr(text: string): Promise<QrAssets> {
  const options = {
    // "M" seviyesi, baskıda ıslanma/kırışma gibi hasarlara karşı yeterli
    // hata düzeltme sağlar ve kodu gereğinden fazla yoğunlaştırmaz.
    errorCorrectionLevel: "M" as const,
    margin: 2,
    color: { dark: "#1D252DFF", light: "#FFFFFFFF" },
  };

  const [pngDataUrl, svg] = await Promise.all([
    QRCode.toDataURL(text, { ...options, width: 600 }),
    QRCode.toString(text, { ...options, type: "svg", width: 600 }),
  ]);

  return { pngDataUrl, svg };
}
