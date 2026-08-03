type ReportActionProps = {
  href: string;
  title: string;
  description: string;
  kind: "suggestion" | "incident";
};

/**
 * Ana sayfadaki QDMS bildirim eylemi.
 *
 * Renk tesadüfi değil: olay bildirimi kurumsal kırmızıyı taşır, öneri
 * bildirimi koyu zemini. Saha işaretlemelerinde kırmızı tehlikeyi anlattığı
 * için acil olan eylem kırmızıdır — renk burada bir bilgi taşıyor.
 */
export function ReportAction({ href, title, description, kind }: ReportActionProps) {
  const isIncident = kind === "incident";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-4 rounded-brand px-5 py-4 transition-colors ${
        isIncident
          ? "bg-tfs-red text-white hover:bg-[#a81a20]"
          : "bg-tfs-dark text-white hover:bg-tfs-deep"
      }`}
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-brand border border-white/30"
      >
        {isIncident ? <IncidentIcon /> : <SuggestionIcon />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-base font-semibold">{title}</span>
          <ExternalIcon />
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs font-light text-white/80">{description}</span>
        ) : null}
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
      className="size-3.5 shrink-0 opacity-70"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}
