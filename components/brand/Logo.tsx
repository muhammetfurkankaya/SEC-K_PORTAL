import { findLogo } from "@/lib/brand";

type LogoProps = {
  /** "light" koyu zemin üzerinde, "dark" açık zemin üzerinde kullanılır. */
  variant?: "light" | "dark";
  /** Logonun altında gösterilen alt başlık (ör. portal adı). */
  subtitle?: string;
  className?: string;
};

/**
 * Kurumsal logo kilidi.
 *
 * public/brand/ altında logo dosyası varsa onu kullanır. Yoksa Marka Kimlik
 * Kılavuzu'nun dijital kurallarına uygun yazı tabanlı bir kilit gösterir:
 * #CE2028 dikey çubuk + Nunito Sans SemiBold marka adı (kılavuz s.51, s.54).
 */
export function Logo({ variant = "light", subtitle, className = "" }: LogoProps) {
  const file = findLogo(variant);
  const textColor = variant === "light" ? "text-white" : "text-tfs-dark";
  const subtitleColor = variant === "light" ? "text-tfs-grey" : "text-tfs-dark-60";

  return (
    <span className={`flex items-center gap-3 ${className}`}>
      {/* Kılavuz s.51/54: marka kilidinin solundaki kırmızı dikey çubuk */}
      <span aria-hidden="true" className="block h-10 w-1 shrink-0 bg-tfs-red" />

      {file ? (
        // eslint-disable-next-line @next/next/no-img-element -- boyutu CSS ile
        // sınırlı statik marka varlığı; optimizasyon gerekmiyor.
        <img src={file} alt="TFS" className="h-9 w-auto" />
      ) : (
        <span
          className={`text-[1.375rem] leading-none font-semibold tracking-tight ${textColor}`}
        >
          TFS
        </span>
      )}

      {subtitle ? (
        <span className={`hidden text-[0.8125rem] font-light sm:block ${subtitleColor}`}>
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
