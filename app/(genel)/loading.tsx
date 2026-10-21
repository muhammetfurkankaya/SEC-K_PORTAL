/**
 * Sekme değişiminde görünen iskelet.
 *
 * Sayfalar `force-dynamic` olduğu için her geçişte sunucuya gidiliyor. Bu
 * dosya olmadan arada boş beyaz bir kare görünüyordu; hero ve içerik aynı
 * ölçülerde gri bloklarla temsil edilince geçiş "sayfa doluyor" gibi
 * okunuyor.
 */
export default function Loading() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="h-[17rem] bg-tfs-dark sm:h-[20rem]" />
      <div className="brand-seam" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-4 w-40 bg-surface-3" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[21rem_1fr]">
          <div className="h-80 rounded-brand border border-line bg-surface-2" />
          <div className="h-80 rounded-brand border border-line bg-surface-2" />
        </div>
      </div>
    </div>
  );
}
