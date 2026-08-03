import { BarTally, EmptyNote, Histogram, NumberSummary, ScoreSummary } from "./charts";
import { formatNumber } from "@/lib/format";
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/types";
import type { QuestionAnalysis } from "@/lib/analytics";

/**
 * Bir sorunun analiz kartı.
 *
 * Soru tipine göre tek bir gösterim seçer. Bilinçli olarak sade tutuldu:
 * her soru için tek bir grafik ve okunması gereken sayılar — yan yana
 * duran istatistik yığını yok.
 */
export function QuestionAnalysisCard({
  analysis,
  index,
}: {
  analysis: QuestionAnalysis;
  index: number;
}) {
  const { question } = analysis;

  return (
    <section className="rounded-brand border border-tfs-grey bg-white">
      <header className="border-b border-tfs-grey px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-tfs-dark">
            <span className="mr-1.5 text-tfs-red">{index + 1}.</span>
            {question.text}
          </h3>
          <span className="shrink-0 rounded-brand bg-tfs-grey-40 px-2 py-0.5 text-[0.625rem] font-semibold text-tfs-dark-60">
            {QUESTION_TYPE_LABELS[question.type as QuestionType]}
          </span>
        </div>

        <p className="tnum mt-1 text-xs text-tfs-dark-60">
          {formatNumber(analysis.answeredCount)} cevap
          {analysis.skippedCount > 0
            ? ` · ${formatNumber(analysis.skippedCount)} kişi boş bıraktı`
            : ""}
        </p>
      </header>

      <div className="p-4">
        <Body analysis={analysis} />
      </div>
    </section>
  );
}

function Body({ analysis }: { analysis: QuestionAnalysis }) {
  const { question } = analysis;

  switch (question.type) {
    case "single_choice":
    case "multi_choice":
    case "yes_no":
      return (
        <>
          <BarTally items={analysis.options ?? []} />
          {question.type === "multi_choice" && (analysis.options?.length ?? 0) > 0 ? (
            <p className="mt-3 text-[0.6875rem] font-light text-tfs-dark-60">
              Çok seçimli soru: katılımcılar birden fazla seçenek işaretleyebildiği için
              yüzdeler toplamı %100&apos;ü aşabilir.
            </p>
          ) : null}
        </>
      );

    case "rating":
    case "nps": {
      const max = question.scale_max ?? (question.type === "nps" ? 10 : 5);
      return (
        <>
          {analysis.numeric ? (
            <ScoreSummary stats={analysis.numeric} unit={`/ ${max}`} />
          ) : null}
          <div className="mt-5">
            <Histogram items={analysis.distribution ?? []} />
          </div>
        </>
      );
    }

    case "number":
      return analysis.numeric ? (
        <NumberSummary stats={analysis.numeric} />
      ) : (
        <EmptyNote>Bu soruya cevap gelmemiş.</EmptyNote>
      );

    case "text":
      return <TextAnswers analysis={analysis} />;

    default:
      return <EmptyNote>Bu soru tipi için özet bulunmuyor.</EmptyNote>;
  }
}

function TextAnswers({ analysis }: { analysis: QuestionAnalysis }) {
  const texts = analysis.texts ?? [];
  const words = (analysis.topWords ?? []).slice(0, 8);

  if (texts.length === 0) {
    return <EmptyNote>Bu soruya serbest metin cevabı gelmemiş.</EmptyNote>;
  }

  return (
    <>
      {words.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-[0.625rem] font-semibold tracking-[0.08em] text-tfs-dark-60 uppercase">
            Sık geçen kelimeler
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {words.map((word) => (
              <li
                key={word.word}
                className="rounded-brand border border-tfs-grey bg-tfs-grey-20 px-2 py-0.5 text-xs text-tfs-dark"
              >
                {word.word}
                <span className="tnum ml-1.5 text-tfs-dark-60">{formatNumber(word.count)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mb-2 text-[0.625rem] font-semibold tracking-[0.08em] text-tfs-dark-60 uppercase">
        Cevaplar ({formatNumber(texts.length)})
      </p>

      {/* Uzun listelerde kendi içinde kayar. */}
      <ul className="max-h-80 space-y-2 overflow-y-auto">
        {texts.map((item, index) => (
          <li
            key={`${item.responseId}-${index}`}
            className="brand-bar rounded-brand bg-tfs-grey-20 py-2 pr-3 pl-3"
          >
            <p className="text-sm text-tfs-dark">{item.text}</p>
            {item.department ? (
              <p className="mt-1 text-[0.6875rem] text-tfs-dark-60">{item.department}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
