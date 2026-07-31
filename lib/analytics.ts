import { normalizeTr } from "@/lib/search";
import type { Question, SurveyAnswer, SurveyResponse } from "@/lib/types";

/**
 * Anket cevaplarını karar vericiye sunulacak özetlere dönüştürür.
 *
 * Hesaplamalar saf fonksiyonlardır (veritabanına dokunmaz); böylece birim
 * testleriyle doğrulanabilir ve analiz ekranı ile CSV dışa aktarım aynı
 * sayıları kullanır.
 */

export type OptionTally = {
  label: string;
  count: number;
  /** Yüzde payı — çok seçimli sorularda toplam 100'ü aşabilir. */
  percent: number;
};

export type NumericSummary = {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  /** Örneklem standart sapması (n < 2 ise 0). */
  stdDev: number;
};

export type TextAnswer = { responseId: number; text: string; department: string | null };

export type WordCount = { word: string; count: number };

export type QuestionAnalysis = {
  question: Question;
  /** Bu soruya cevap veren katılımcı sayısı. */
  answeredCount: number;
  /** Cevaplamayan katılımcı sayısı. */
  skippedCount: number;
  options?: OptionTally[];
  numeric?: NumericSummary;
  /** Puanlama/NPS dağılımı: her ölçek değeri için adet. */
  distribution?: OptionTally[];
  nps?: { score: number; promoters: number; passives: number; detractors: number };
  texts?: TextAnswer[];
  topWords?: WordCount[];
};

export type SurveyAnalysis = {
  responseCount: number;
  firstResponseAt: string | null;
  lastResponseAt: string | null;
  /** Ortalama doldurma süresi (saniye); ölçülemediyse null. */
  averageDurationSeconds: number | null;
  /** Sorulara verilen cevapların, sorulabilecek toplam cevaba oranı (%). */
  averageCompletionPercent: number;
  questions: QuestionAnalysis[];
  departments: OptionTally[];
};

// ————————————————————————————————— Sayısal yardımcılar —————————————————————————————————

function summarize(values: number[]): NumericSummary {
  if (values.length === 0) {
    return { count: 0, mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((total, value) => total + value, 0);
  const mean = sum / values.length;

  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];

  // Örneklem standart sapması (n-1); tek cevapta tanımsız olacağından 0.
  const variance =
    values.length < 2
      ? 0
      : values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1);

  return {
    count: values.length,
    mean,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev: Math.sqrt(variance),
  };
}

/**
 * Net Öneri Skoru (NPS).
 *
 * 9–10 verenler Destekleyici, 7–8 Nötr, 0–6 Köstekleyici sayılır.
 * Skor = %Destekleyici − %Köstekleyici (−100 … +100).
 */
export function computeNps(values: number[]): {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
} {
  if (values.length === 0) return { score: 0, promoters: 0, passives: 0, detractors: 0 };

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const value of values) {
    if (value >= 9) promoters += 1;
    else if (value >= 7) passives += 1;
    else detractors += 1;
  }

  const score = ((promoters - detractors) / values.length) * 100;
  return { score, promoters, passives, detractors };
}

function percent(count: number, total: number): number {
  return total === 0 ? 0 : (count / total) * 100;
}

// ————————————————————————————————— Serbest metin —————————————————————————————————

/**
 * Serbest metin cevaplarında en sık geçen kelimeler.
 *
 * Türkçe bağlaç ve edatları ayıklıyoruz; aksi halde liste "ve", "bir", "için"
 * gibi kelimelerle dolar ve karar vericiye hiçbir şey söylemez.
 */
const STOP_WORDS = new Set(
  [
    "ve", "veya", "ile", "için", "gibi", "daha", "çok", "bir", "bu", "şu", "o",
    "da", "de", "ki", "mi", "ama", "fakat", "ancak", "olarak", "olan", "oldu",
    "var", "yok", "ben", "biz", "siz", "onlar", "her", "hep", "en", "kadar",
    "sonra", "önce", "ise", "değil", "çünkü", "ya", "hem", "tüm", "bazı",
    "kendi", "böyle", "şöyle", "nasıl", "neden", "hangi", "olur", "oluyor",
    "yani", "hiç", "artık", "biraz", "ayrıca", "üzere", "beri", "göre",
  ].map((word) => normalizeTr(word)),
);

export function topWords(texts: string[], limit = 12): WordCount[] {
  const counts = new Map<string, { display: string; count: number }>();

  for (const text of texts) {
    // Kelime sınırlarını Türkçe harfleri koruyarak bölüyoruz.
    const words = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

    for (const word of words) {
      if (word.length < 3) continue;
      const key = normalizeTr(word);
      if (!key || STOP_WORDS.has(key)) continue;

      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { display: word.toLocaleLowerCase("tr"), count: 1 });
      }
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display, "tr"))
    .slice(0, limit)
    .map(({ display, count }) => ({ word: display, count }));
}

// ————————————————————————————————— Ana çözümleme —————————————————————————————————

/**
 * Cevap ve soru listelerinden tam analiz üretir.
 *
 * @param responses Filtrelenmiş cevap kayıtları (tarih/departman süzgeci
 *                  uygulanmış olabilir).
 * @param answers   Bu cevaplara ait tüm soru cevapları.
 */
export function analyzeSurvey(
  questions: Question[],
  responses: SurveyResponse[],
  answers: SurveyAnswer[],
): SurveyAnalysis {
  const responseCount = responses.length;

  // Soru bazlı erişim için cevapları grupla.
  const byQuestion = new Map<number, SurveyAnswer[]>();
  for (const answer of answers) {
    const list = byQuestion.get(answer.question_id);
    if (list) list.push(answer);
    else byQuestion.set(answer.question_id, [answer]);
  }

  const departmentOf = new Map(responses.map((r) => [r.id, r.department]));

  const questionAnalyses = questions.map((question): QuestionAnalysis => {
    const questionAnswers = byQuestion.get(question.id) ?? [];

    // Çok seçimli sorularda bir katılımcı birden fazla satır üretir; bu yüzden
    // "cevaplayan sayısı" için benzersiz cevap kaydı sayısına bakıyoruz.
    const respondents = new Set(questionAnswers.map((a) => a.response_id));
    const answeredCount = respondents.size;

    const base: QuestionAnalysis = {
      question,
      answeredCount,
      skippedCount: Math.max(0, responseCount - answeredCount),
    };

    switch (question.type) {
      case "single_choice":
      case "multi_choice":
      case "yes_no": {
        const labels =
          question.type === "yes_no" ? ["Evet", "Hayır"] : question.options;

        const counts = new Array(labels.length).fill(0) as number[];
        for (const answer of questionAnswers) {
          const index = answer.option_index;
          if (index !== null && index >= 0 && index < counts.length) counts[index] += 1;
        }

        return {
          ...base,
          options: labels.map((label, index) => ({
            label,
            count: counts[index],
            // Çok seçimlide yüzde, katılımcı sayısına göre hesaplanır:
            // "katılımcıların %40'ı bu seçeneği işaretledi" okuması doğrudur.
            percent: percent(counts[index], answeredCount),
          })),
        };
      }

      case "rating":
      case "nps": {
        const values = questionAnswers
          .map((answer) => answer.value_number)
          .filter((value): value is number => value !== null);

        const min = question.scale_min ?? (question.type === "nps" ? 0 : 1);
        const max = question.scale_max ?? (question.type === "nps" ? 10 : 5);

        const buckets = new Map<number, number>();
        for (let value = min; value <= max; value += 1) buckets.set(value, 0);
        for (const value of values) {
          if (buckets.has(value)) buckets.set(value, (buckets.get(value) ?? 0) + 1);
        }

        const distribution: OptionTally[] = [...buckets.entries()].map(([value, count]) => ({
          label: String(value),
          count,
          percent: percent(count, values.length),
        }));

        return {
          ...base,
          numeric: summarize(values),
          distribution,
          nps: question.type === "nps" ? computeNps(values) : undefined,
        };
      }

      case "number": {
        const values = questionAnswers
          .map((answer) => answer.value_number)
          .filter((value): value is number => value !== null);
        return { ...base, numeric: summarize(values) };
      }

      case "text": {
        const texts: TextAnswer[] = questionAnswers
          .filter((answer) => answer.value_text && answer.value_text.trim().length > 0)
          .map((answer) => ({
            responseId: answer.response_id,
            text: answer.value_text as string,
            department: departmentOf.get(answer.response_id) ?? null,
          }));

        return {
          ...base,
          texts,
          topWords: topWords(texts.map((item) => item.text)),
        };
      }

      default:
        return base;
    }
  });

  // ————— Genel özet —————

  const durations = responses
    .map((response) => response.duration_seconds)
    .filter((value): value is number => value !== null && value > 0);

  const dates = responses.map((response) => response.submitted_at).sort();

  // Tamamlanma: her katılımcının kaç soruyu yanıtladığının ortalaması.
  const answeredPerResponse = new Map<number, Set<number>>();
  for (const answer of answers) {
    const set = answeredPerResponse.get(answer.response_id);
    if (set) set.add(answer.question_id);
    else answeredPerResponse.set(answer.response_id, new Set([answer.question_id]));
  }

  const totalPossible = responseCount * questions.length;
  const totalAnswered = [...answeredPerResponse.values()].reduce(
    (total, set) => total + set.size,
    0,
  );

  const departmentCounts = new Map<string, number>();
  for (const response of responses) {
    const department = response.department?.trim();
    if (!department) continue;
    departmentCounts.set(department, (departmentCounts.get(department) ?? 0) + 1);
  }

  return {
    responseCount,
    firstResponseAt: dates[0] ?? null,
    lastResponseAt: dates[dates.length - 1] ?? null,
    averageDurationSeconds:
      durations.length > 0
        ? durations.reduce((total, value) => total + value, 0) / durations.length
        : null,
    averageCompletionPercent: percent(totalAnswered, totalPossible),
    questions: questionAnalyses,
    departments: [...departmentCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        label,
        count,
        percent: percent(count, responseCount),
      })),
  };
}

/** Saniyeyi "2 dk 15 sn" biçiminde yazar. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded} sn`;
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${minutes} dk` : `${minutes} dk ${rest} sn`;
}
