type SectionTitleProps = {
  children: React.ReactNode;
  /** Başlığın yanında gösterilen ikincil bilgi (ör. kayıt sayısı). */
  meta?: React.ReactNode;
  className?: string;
};

/**
 * Bölüm alt başlığı.
 *
 * Marka Kimlik Kılavuzu s.55'teki "Belge Alt Başlık" kuralı: Nunito Sans
 * SemiBold, büyük harf, #CE2028.
 */
export function SectionTitle({ children, meta, className = "" }: SectionTitleProps) {
  return (
    <div className={`mb-4 flex flex-wrap items-baseline justify-between gap-2 ${className}`}>
      <h2 className="text-xs font-semibold tracking-[0.12em] text-tfs-red uppercase">
        {children}
      </h2>
      {meta ? <span className="text-xs text-tfs-dark-60">{meta}</span> : null}
    </div>
  );
}
