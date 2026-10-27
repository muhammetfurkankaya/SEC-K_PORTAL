import { findLogo } from "@/lib/brand";
import { LogoView, type LogoProps } from "./LogoView";

/**
 * Kurumsal logo kilidi.
 *
 * public/brand/ altındaki resmî logo dosyasını kullanır (logo.png /
 * logo-beyaz.png). Dosya bulunamazsa kılavuzun dijital kurallarına uygun
 * yazı tabanlı bir kilit gösterir: #CE2028 dikey çubuk + Nunito Sans
 * SemiBold marka adı (kılavuz s.51, s.54).
 *
 * Resmî logo varken dikey çubuk çizilmez: amblemin kendisi kırmızıyı
 * taşıdığı için çubuk aynı vurguyu ikinci kez yapardı.
 */
export function Logo(props: LogoProps) {
  return <LogoView {...props} file={findLogo(props.variant ?? "light")} />;
}
