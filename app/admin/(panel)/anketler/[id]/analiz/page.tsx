import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminHeading, StatTile } from "@/components/admin/AdminHeading";
import { BarTally } from "@/components/analytics/charts";
import { QuestionAnalysisCard } from "@/components/analytics/QuestionAnalysisCard";
import {
  getQuestions,
  getSurvey,
  listAnswersForResponses,
  listDepartments,
  listResponses,
} from "@/lib/db/queries/surveys";
import { analyzeSurvey, formatDuration } from "@/lib/analytics";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anket Analizi" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ baslangic?: string; bitis?: string; departman?: string }>;
};

/**
 * Anket analiz ekranı — karar destek görünümü.
 *
 * Filtreler adres çubuğunda taşınır (GET formu): sayfa tümüyle sunucuda
 * oluşur, JavaScript gerekmez ve filtrelenmiş görünümün bağlantısı
 * paylaşılabilir. CSV indirme aynı filtreleri kullanır.
 */
export default async function SurveyAnalysisPage({ params, searchParams }: Props) {
  const { id } = await params;
  const filters = await searchParams;

  const survey = getSurvey(Number(id));
  if (!survey) notFound();

  const questions = getQuestions(survey.id);
  const departments = listDepartments(survey.id);

  const responses = listResponses(survey.id, {
    from: filters.baslangic || null,
    to: filters.bitis || null,
    department: filters.departman || null,
  });
  const answers = listAnswersForResponses(responses.map((response) => response.id));
  const analysis = analyzeSurvey(questions, responses, answers);

  const hasFilter = Boolean(filters.baslangic || filters.bitis || filters.departman);
  const csvQuery = new URLSearchParams();
  if (filters.baslangic) csvQuery.set("baslangic", filters.baslangic);
  if (filters.bitis) csvQuery.set("bitis", filters.bitis);
  if (filters.departman) csvQuery.set("departman", filters.departman);

  return (
    <>
      <AdminHeading title={survey.title} description="Anket sonuçları ve değerlendirme özeti">
        <a
          href={`/api/anket/${survey.id}/csv${csvQuery.size > 0 ? `?${csvQuery}` : ""}`}
          className="rounded-brand bg-tfs-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-tfs-dark print-hidden"
        >
          CSV indir
        </a>
        <Link
          href={`/admin/anketler/${survey.id}`}
          className="rounded-brand border border-tfs-grey bg-white px-4 py-2 text-sm font-semibold text-tfs-dark transition-colors hover:border-tfs-dark-20 print-hidden"
        >
          Düzenle / QR
        </Link>
      </AdminHeading>

      {/* ————— Filtreler ————— */}
      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-brand border border-tfs-grey bg-white p-4 print-hidden"
      >
        <div>
          <label
            htmlFor="baslangic"
            className="block text-xs font-semibold text-tfs-dark"
          >
            Başlangıç tarihi
          </label>
          <input
            id="baslangic"
            name="baslangic"
            type="date"
            defaultValue={filters.baslangic ?? ""}
            className="mt-1 rounded-brand border border-tfs-grey px-3 py-2 text-sm text-tfs-dark focus:border-tfs-red focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="bitis" className="block text-xs font-semibold text-tfs-dark">
            Bitiş tarihi
          </label>
          <input
            id="bitis"
            name="bitis"
            type="date"
            defaultValue={filters.bitis ?? ""}
            className="mt-1 rounded-brand border border-tfs-grey px-3 py-2 text-sm text-tfs-dark focus:border-tfs-red focus:outline-none"
          />
        </div>

        {departments.length > 0 ? (
          <div>
            <label htmlFor="departman" className="block text-xs font-semibold text-tfs-dark">
              Departman
            </label>
            <select
              id="departman"
              name="departman"
              defaultValue={filters.departman ?? ""}
              className="mt-1 rounded-brand border border-tfs-grey px-3 py-2 text-sm text-tfs-dark focus:border-tfs-red focus:outline-none"
            >
              <option value="">Tümü</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <button
          type="submit"
          className="rounded-brand bg-tfs-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-tfs-red"
        >
          Filtrele
        </button>

        {hasFilter ? (
          <Link
            href={`/admin/anketler/${survey.id}/analiz`}
            className="rounded-brand border border-tfs-grey px-4 py-2 text-sm font-semibold text-tfs-dark transition-colors hover:border-tfs-dark-20"
          >
            Filtreyi temizle
          </Link>
        ) : null}
      </form>

      {/* ————— Özet ————— */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Katılım"
          value={formatNumber(analysis.responseCount)}
          hint={
            hasFilter
              ? `filtreli · toplam ${formatNumber(survey.response_count)}`
              : "toplam cevap sayısı"
          }
        />
        <StatTile
          label="Soru tamamlama"
          value={formatPercent(analysis.averageCompletionPercent, 0)}
          hint="soruların ortalama yanıtlanma oranı"
        />
        <StatTile
          label="Ortalama süre"
          value={formatDuration(analysis.averageDurationSeconds)}
          hint="formu doldurma süresi"
        />
        <StatTile
          label="Son cevap"
          value={
            analysis.lastResponseAt ? formatDate(analysis.lastResponseAt) : "—"
          }
          hint={
            analysis.firstResponseAt
              ? `ilk cevap ${formatDate(analysis.firstResponseAt)}`
              : undefined
          }
        />
      </div>

      {analysis.responseCount === 0 ? (
        <p className="mt-6 rounded-brand border border-dashed border-tfs-grey bg-white px-4 py-12 text-center text-sm font-light text-tfs-dark-60">
          {hasFilter
            ? "Seçtiğiniz filtreye uyan cevap bulunamadı."
            : "Bu ankete henüz cevap gelmemiş. QR kodu paylaşarak katılım toplayabilirsiniz."}
        </p>
      ) : (
        <>
          {analysis.departments.length > 0 ? (
            <section className="mt-6 rounded-brand border border-tfs-grey bg-white">
              <header className="border-b border-tfs-grey px-4 py-3">
                <h2 className="text-xs font-semibold tracking-[0.12em] text-tfs-red uppercase">
                  Departman Kırılımı
                </h2>
              </header>
              <div className="p-4">
                <BarTally items={analysis.departments} />
              </div>
            </section>
          ) : null}

          <div className="mt-6 space-y-4">
            {analysis.questions.map((questionAnalysis, index) => (
              <QuestionAnalysisCard
                key={questionAnalysis.question.id}
                analysis={questionAnalysis}
                index={index}
              />
            ))}
          </div>

          <p className="mt-6 text-xs font-light text-tfs-dark-60 print-hidden">
            Bu sayfayı Ctrl+P (⌘+P) ile yazdırıp toplantıya rapor olarak
            götürebilirsiniz; filtre ve düğmeler çıktıda görünmez.
          </p>
        </>
      )}
    </>
  );
}
