import type { Survey } from "@/lib/types";

export type SurveyAvailability =
  | { open: true }
  | { open: false; reason: "kapali" | "henuz-baslamadi" | "sona-erdi" };

/**
 * Anketin şu anda doldurulabilir olup olmadığını söyler.
 *
 * Hem genel form sayfası hem gönderim işlemi aynı kuralı kullanır; böylece
 * formu açıkken süresi dolan bir anket, gönderim anında da reddedilir.
 */
export function checkAvailability(survey: Survey, now = new Date()): SurveyAvailability {
  if (!survey.is_active) return { open: false, reason: "kapali" };

  const today = toDateOnly(now);

  if (survey.opens_at) {
    const opens = survey.opens_at.slice(0, 10);
    if (today < opens) return { open: false, reason: "henuz-baslamadi" };
  }

  if (survey.closes_at) {
    const closes = survey.closes_at.slice(0, 10);
    // Bitiş tarihi dahil kabul edilir: o gün gün sonuna kadar doldurulabilir.
    if (today > closes) return { open: false, reason: "sona-erdi" };
  }

  return { open: true };
}

/** Yerel saate göre 'YYYY-MM-DD'. */
function toDateOnly(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export const AVAILABILITY_MESSAGES: Record<
  Extract<SurveyAvailability, { open: false }>["reason"],
  string
> = {
  kapali: "Bu anket şu anda doldurulmaya açık değil.",
  "henuz-baslamadi": "Bu anket henüz başlamadı. Lütfen daha sonra tekrar deneyin.",
  "sona-erdi": "Bu anketin doldurma süresi sona erdi. Katılımınız için teşekkür ederiz.",
};
