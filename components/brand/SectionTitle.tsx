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

type PageHeaderProps = {
  title: string;
  /** Başlığın üstünde gösterilen küçük etiket (ör. sekme adı). */
  eyebrow?: string;
  description?: string | null;
  children?: React.ReactNode;
};

/**
 * Sayfa başlığı bandı.
 *
 * Kılavuzun koyu zemin (#1D252D) + beyaz metin + kırmızı dikey çubuk
 * kompozisyonunu sayfa üstüne taşır.
 */
export function PageHeader({ title, eyebrow, description, children }: PageHeaderProps) {
  return (
    <div className="border-b border-tfs-grey bg-tfs-grey-20">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-8 sm:px-6 lg:px-8">
        <div className="brand-bar pl-4">
          {eyebrow ? (
            <p className="text-xs font-semibold tracking-[0.12em] text-tfs-red uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-semibold text-tfs-dark sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm font-light text-tfs-dark-80">{description}</p>
          ) : null}
        </div>
        {children ? <div className="flex items-center gap-2">{children}</div> : null}
      </div>
    </div>
  );
}
