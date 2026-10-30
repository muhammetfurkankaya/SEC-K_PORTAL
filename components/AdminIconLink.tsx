import Link from "next/link";

/**
 * Yönetim paneline giden küçük kilit simgesi.
 *
 * Bilerek silik: portalın ziyaretçisi çalışanlar; yönetim girişi onların
 * dikkatini çekmemeli, bilen bulabilmeli. Çerçevesiz ve yarı saydam; üzerine
 * gelince ya da klavyeyle odaklanınca belirginleşir ve küçük bir ipucu
 * çıkar. Ekran okuyucular için etiket ayarlardaki "Yönetim" metni.
 */
export function AdminIconLink({ label }: { label: string }) {
  return (
    <Link
      href="/admin"
      aria-label={label}
      className="group relative grid size-8 place-items-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-4"
      >
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[calc(100%+0.5rem)] right-0 -translate-y-1 rounded-brand border border-line bg-surface-2 px-2 py-1 text-[0.6875rem] font-semibold whitespace-nowrap text-ink opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </Link>
  );
}
