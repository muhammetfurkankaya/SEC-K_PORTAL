export type LogoProps = {
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
 * Dosya aramadan çizen sürüm — istemci bileşenleri (ayar önizlemesi) dosya
 * sistemine erişemediği için logo adresini prop olarak alır.
 */
export function LogoView({
  variant = "light",
  subtitle,
  size = "md",
  className = "",
  file,
}: LogoProps & { file: string | null }) {
  const subtitleColor = variant === "light" ? "text-tfs-grey-20" : "text-ink-soft";

  return (
    <span className={`flex min-w-0 items-center gap-3 ${className}`}>
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
          // Telefonda da görünür; uzun yazı tek satırda kısaltılır.
          className={`block min-w-0 truncate border-l pl-3 text-[0.8125rem] leading-tight font-normal sm:text-sm ${subtitleColor} ${
            variant === "light" ? "border-tfs-dark-80" : "border-line"
          }`}
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
