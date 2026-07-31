import type { NextConfig } from "next";

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

  // Intranet portalı için temel güvenlik başlıkları.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
