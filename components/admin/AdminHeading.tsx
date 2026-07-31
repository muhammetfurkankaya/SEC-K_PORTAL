type AdminHeadingProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

/** Yönetim paneli sayfa başlığı (kılavuzun kırmızı dikey çubuk aksanı ile). */
export function AdminHeading({ title, description, children }: AdminHeadingProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="brand-bar pl-4">
        <h1 className="text-xl font-semibold text-tfs-dark sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm font-light text-tfs-dark-80">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

/** Özet sayı kutusu. */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-brand border border-tfs-grey bg-white p-4">
      <p className="text-[0.6875rem] font-semibold tracking-[0.1em] text-tfs-dark-60 uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-tfs-dark">{value}</p>
      {hint ? <p className="mt-0.5 text-xs font-light text-tfs-dark-60">{hint}</p> : null}
    </div>
  );
}

/** İçerik bloklarını çerçeveleyen kart. */
export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-brand border border-tfs-grey bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tfs-grey px-4 py-3">
        <h2 className="text-xs font-semibold tracking-[0.12em] text-tfs-red uppercase">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
