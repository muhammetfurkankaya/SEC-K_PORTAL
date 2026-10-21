import { findLogo } from "@/lib/brand";

type LogoProps = {
  /** "light" koyu zemin üzerinde, "dark" açık zemin üzerinde kullanılır. */
  variant?: "light" | "dark";
  /** Logonun yanında gösterilen alt başlık (ör. portal adı). */
  subtitle?: string;
  /** Logo yüksekliği. Kılavuzdaki güvenli alan kuralı buna göre uygulanır. */
  size?: "sm" | "md" | "lg";
  className?: string;
};

const HEIGHTS = { sm: "h-7", md: "h-9", lg: "h-12" } as const;

/**
 * Kurumsal logo kilidi.
 *
 * public/brand/ altındaki resmî logo dosyasını kullanır (logo.png /
 * logo-beyaz.png). Dosya bulunamazsa kılavuzun dijital kurallarına uygun
 * yazı tabanlı bir kilit gösterir: #CE2028 dikey çubuk + Nunito Sans
 * SemiBold marka adı (kılavuz s.51, s.54).
 *
 * Resmî logo varken dikey çubuk çizilmez: amblemin kendisi kırmızıyı
 * taşıdığı için çubuk aynı vurguyu ikinci kez yapardı.
 */
export function Logo({ variant = "light", subtitle, size = "md", className = "" }: LogoProps) {
  const file = findLogo(variant);
  const subtitleColor = variant === "light" ? "text-tfs-grey" : "text-ink-faint";

  return (
    <span className={`flex items-center gap-3 ${className}`}>
      {file ? (
        /* eslint-disable-next-line @next/next/no-img-element -- boyutu CSS ile
           sınırlı statik marka varlığı; optimizasyon gerekmiyor. */
        <img
          src={file}
          alt="Turkish Fuel Services"
          className={`${HEIGHTS[size]} w-auto shrink-0`}
        />
      ) : (
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="block h-10 w-1 shrink-0 bg-tfs-red" />
          <span
            className={`text-[1.375rem] leading-none font-semibold tracking-tight ${
              variant === "light" ? "text-white" : "text-ink"
            }`}
          >
            TFS
          </span>
        </span>
      )}

      {subtitle ? (
        <span
          className={`hidden border-l pl-3 text-[0.8125rem] leading-tight font-light sm:block ${subtitleColor} ${
            variant === "light" ? "border-tfs-dark-80" : "border-line"
          }`}
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
