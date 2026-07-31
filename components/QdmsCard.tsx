type QdmsCardProps = {
  href: string;
  title: string;
  description: string;
  icon: "suggestion" | "incident";
};

/**
 * Ana sayfadaki QDMS yönlendirme kartı.
 *
 * Öneri ve Olay bildirimi QDMS üzerinden yapılır; portal bu iki işlem için
 * belirgin bir giriş noktası sunar. Adresler admin panelinden düzenlenebilir.
 */
export function QdmsCard({ href, title, description, icon }: QdmsCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-4 rounded-brand border border-tfs-grey bg-white p-6 transition-colors hover:border-tfs-red focus-visible:border-tfs-red"
    >
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-brand bg-tfs-red-10 text-tfs-red transition-colors group-hover:bg-tfs-red group-hover:text-white"
      >
        {icon === "suggestion" ? <SuggestionIcon /> : <IncidentIcon />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-base font-semibold text-tfs-dark">{title}</span>
          <ExternalIcon />
        </span>
        <span className="mt-1 block text-sm font-light text-tfs-dark-80">{description}</span>
        <span className="mt-3 block text-xs font-semibold tracking-[0.08em] text-tfs-red uppercase">
          QDMS&apos;te aç
        </span>
      </span>
    </a>
  );
}

function SuggestionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth={1.6}>
      <path
        d="M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.3v.4h6v-.4c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 19h4M10.5 21h3" strokeLinecap="round" />
    </svg>
  );
}

function IncidentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth={1.6}>
      <path
        d="M10.3 4.3 2.8 17.2A1.6 1.6 0 0 0 4.2 19.6h15.6a1.6 1.6 0 0 0 1.4-2.4L13.7 4.3a1.6 1.6 0 0 0-2.8 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 9v4.5" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="size-3.5 shrink-0 text-tfs-dark-60"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}
