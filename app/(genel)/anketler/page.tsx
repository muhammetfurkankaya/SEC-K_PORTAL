import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHero } from "@/components/brand/PageHero";
import { listOpenSurveys } from "@/lib/db/queries/surveys";
import { getSettings } from "@/lib/db/queries/settings";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anketler" };

export default function SurveysPage() {
  // Anket bölümü ayarlardan kapatılmışsa bu sayfa da kapalıdır. QR ile
  // paylaşılan tek tek anket bağlantıları çalışmaya devam eder.
  if (!getSettings().surveysSectionVisible) notFound();

  const surveys = listOpenSurveys();

  return (
    <>
      <PageHero
        tone="flat"
        eyebrow="Değerlendirme"
        title="Açık Anketler"
        description="Aşağıdaki anketler doldurulmaya açıktır. QR kodla da erişebilirsiniz."
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {surveys.length === 0 ? (
          <p className="rounded-brand border border-dashed border-tfs-grey bg-tfs-grey-20 px-4 py-12 text-center text-sm font-light text-tfs-dark-60">
            Şu anda doldurulmaya açık anket bulunmuyor.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => (
              <li key={survey.id}>
                <Link
                  href={`/anket/${survey.public_token}`}
                  className="flex h-full flex-col rounded-brand border border-tfs-grey bg-white p-5 transition-colors hover:border-tfs-red"
                >
                  <span className="text-sm font-semibold text-tfs-dark">{survey.title}</span>
                  {survey.description ? (
                    <span className="mt-1 line-clamp-3 text-xs font-light text-tfs-dark-80">
                      {survey.description}
                    </span>
                  ) : null}

                  <span className="mt-4 flex items-center justify-between text-xs text-tfs-dark-60">
                    <span>{survey.question_count} soru</span>
                    {survey.closes_at ? (
                      <span>Bitiş: {formatDate(survey.closes_at)}</span>
                    ) : null}
                  </span>

                  <span className="mt-3 text-xs font-semibold tracking-[0.08em] text-tfs-red uppercase">
                    Anketi doldur →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
