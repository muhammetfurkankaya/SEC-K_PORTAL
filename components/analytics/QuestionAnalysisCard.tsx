import { BarTally, EmptyNote, Histogram, NpsChart, NumericStats } from "./charts";
import { formatNumber, formatPercent } from "@/lib/format";
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/types";
import type { OptionTally, QuestionAnalysis } from "@/lib/analytics";

/**
 * Bir sorunun analiz kartı.
 *
 * Soru tipine göre doğru gösterimi seçer ve her kartın altında değerleri
 * tablo olarak da sunar. Tablo, açık tonlu marka renklerinin kontrast
 * uyarısına karşı öngörülen telafidir: hiçbir sayı yalnızca grafikte kalmaz.
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

        <p className="mt-1 text-xs text-tfs-dark-60">
          {formatNumber(analysis.answeredCount)} cevap
          {analysis.skippedCount > 0
            ? ` · ${formatNumber(analysis.skippedCount)} kişi bu soruyu boş bıraktı`
            : ""}
          {question.is_required ? " · zorunlu soru" : ""}
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
          <ValueTable rows={analysis.options ?? []} firstColumn="Seçenek" />
        </>
      );

    case "rating":
      return (
        <>
          {analysis.numeric ? (
            <NumericStats stats={analysis.numeric} unit="/ 5" />
          ) : null}
          <div className="mt-4">
            <Histogram items={analysis.distribution ?? []} />
          </div>
          <ValueTable rows={analysis.distribution ?? []} firstColumn="Puan" />
        </>
      );

    case "nps":
      return (
        <>
          {analysis.nps ? <NpsChart {...analysis.nps} /> : null}
          <div className="mt-5 border-t border-tfs-grey-40 pt-4">
            <p className="mb-2 text-[0.625rem] font-semibold tracking-[0.08em] text-tfs-dark-60 uppercase">
              Puan dağılımı
            </p>
            <Histogram items={analysis.distribution ?? []} />
          </div>
          <ValueTable rows={analysis.distribution ?? []} firstColumn="Puan" />
        </>
      );

    case "number":
      return analysis.numeric ? (
        <NumericStats stats={analysis.numeric} />
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
  const words = analysis.topWords ?? [];

  if (texts.length === 0) {
    return <EmptyNote>Bu soruya serbest metin cevabı gelmemiş.</EmptyNote>;
  }

  return (
    <>
      {words.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-[0.625rem] font-semibold tracking-[0.08em] text-tfs-dark-60 uppercase">
            En sık geçen kelimeler
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {words.map((word) => (
              <li
                key={word.word}
                className="rounded-brand border border-tfs-grey bg-tfs-grey-20 px-2 py-0.5 text-xs text-tfs-dark"
              >
                {word.word}
                <span className="ml-1.5 text-tfs-dark-60">{formatNumber(word.count)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mb-2 text-[0.625rem] font-semibold tracking-[0.08em] text-tfs-dark-60 uppercase">
        Cevaplar ({formatNumber(texts.length)})
      </p>

      {/* Uzun listelerde kendi içinde kayar. */}
      <ul className="max-h-96 space-y-2 overflow-y-auto">
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

/**
 * Grafiğin altındaki tablo görünümü.
 *
 * Katlanır (details) olarak durur; ekranı doldurmaz ama rakamlar her zaman
 * metin olarak erişilebilir kalır.
 */
function ValueTable({ rows, firstColumn }: { rows: OptionTally[]; firstColumn: string }) {
  if (rows.length === 0) return null;

  return (
    <details className="mt-4 border-t border-tfs-grey-40 pt-3">
      <summary className="cursor-pointer text-[0.6875rem] font-semibold text-tfs-dark-60 hover:text-tfs-dark">
        Değerleri tablo olarak göster
      </summary>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-left text-xs">
          <thead className="border-b border-tfs-grey text-tfs-dark-60">
            <tr>
              <th className="py-1.5 pr-3 font-semibold">{firstColumn}</th>
              <th className="py-1.5 pr-3 text-right font-semibold">Adet</th>
              <th className="py-1.5 text-right font-semibold">Yüzde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tfs-grey-40">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-1.5 pr-3 text-tfs-dark">{row.label}</td>
                <td className="py-1.5 pr-3 text-right text-tfs-dark">{formatNumber(row.count)}</td>
                <td className="py-1.5 text-right text-tfs-dark-60">
                  {formatPercent(row.percent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
