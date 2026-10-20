/**
 * Sayfa geçişi.
 *
 * `template.tsx` her gezinmede yeniden bağlanır (layout'tan farkı budur), bu
 * yüzden buradaki CSS animasyonu her sekme değişiminde yeniden çalışır.
 * Üst bant ve sekmeler `layout.tsx`'te kaldığı için yerinde durur; yalnızca
 * gövde girer. Hareket `prefers-reduced-motion` ile kapanır.
 *
 * Next'in `experimental.viewTransition` seçeneği bilerek KULLANILMIYOR:
 * uygulamayı Next'in deneysel React kanalına taşıyor ve bu portal, konsol
 * erişimi olmayan bir IIS makinesine donmuş bir zip olarak gidiyor.
 */
export default function GenelTemplate({ children }: { children: React.ReactNode }) {
  return <div className="route-enter">{children}</div>;
}
