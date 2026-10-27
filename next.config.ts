import type { NextConfig } from "next";

/**
 * İçerik güvenliği politikası.
 *
 * Portal hiçbir dış kaynağa bağlanmıyor: yazı tipleri, betikler ve görseller
 * kendi sunucusundan geliyor (intranette internet erişimi olmayabilir diye
 * baştan böyle kurgulandı). Bu yüzden politika "yalnızca kendi kaynağım"
 * diyebiliyor; olası bir metin sızması durumunda veriyi dışarı taşıyacak
 * kanal kalmıyor.
 *
 * script-src'de 'unsafe-inline' bulunmasının nedeni Next'in sayfa durumunu
 * satır içi betikle taşıması. React çıktıyı kendisi kaçırdığı ve kodda
 * dangerouslySetInnerHTML kullanılmadığı için asıl koruma orada; bu başlık
 * ek bir katman.
 *
 * 'wasm-unsafe-eval' yalnızca WebAssembly derlemesine izin verir (JS eval'e
 * değil): PDF okuyucu (pdf.js) bazı PDF'lerdeki JPEG2000/JBIG2 görselleri
 * public/pdfjs/wasm/ altındaki çözücülerle açıyor.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // PDF önizlemesi ve QR kodu aynı kaynaktan geliyor.
  "frame-src 'self' blob:",
  "object-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Sunucuya yayın için tek klasörlük çıktı üretir (.next/standalone).
  output: "standalone",

  // better-sqlite3 native bir modül; Next'in bundle etmesi yerine
  // çalışma zamanında require edilmesi gerekir.
  serverExternalPackages: ["better-sqlite3"],

  experimental: {
    // Bülten PDF yüklemeleri için Server Action gövde sınırı.
    serverActions: { bodySizeLimit: "30mb" },
  },

  // Sunucunun hangi çatıyı kullandığını duyurmanın faydası yok.
  poweredByHeader: false,

  // Intranet portalı için güvenlik başlıkları.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // frame-ancestors bunun modern karşılığı; X-Frame-Options eski
          // tarayıcılar ve tarama araçları için duruyor.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
