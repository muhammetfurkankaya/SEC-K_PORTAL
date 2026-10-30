/**
 * Boş liste mesajları — geliştiricinin belirlediği sabit metinler.
 *
 * Önceden ayarlardan değiştirilebiliyordu; içerik yöneticisinin bunlarla
 * uğraşmasına gerek olmadığı için koda alındı.
 */
export const EMPTY_MESSAGES = {
  home: "Henüz bülten yayımlanmamış. Yönetim panelinden PDF yükleyerek başlayabilirsiniz.",
  category: "Bu bölümde henüz yayımlanmış bülten yok.",
  surveys: "Şu anda doldurulmaya açık anket bulunmuyor.",
} as const;
