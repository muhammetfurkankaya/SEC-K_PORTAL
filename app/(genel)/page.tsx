import Link from "next/link";
import { ReportAction } from "@/components/ReportAction";
import { SectionTitle } from "@/components/brand/SectionTitle";
import { listActiveCategories } from "@/lib/db/queries/categories";
import { listRecentBulletins } from "@/lib/db/queries/bulletins";
import { listOpenSurveys } from "@/lib/db/queries/surveys";
import { getSettings } from "@/lib/db/queries/settings";
import { formatDate, formatNumber } from "@/lib/format";

// Bültenler ve anketler admin panelinden değiştiğinde ana sayfa güncel
// görünmelidir; bu yüzden her istekte yeniden oluşturulur.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const settings = getSettings();
  const categories = listActiveCategories();
  const recent = listRecentBulletins(settings.homeRecentCount);
  const openSurveys = settings.surveysSectionVisible ? listOpenSurveys() : [];

  const totalBulletins = categories.reduce((sum, c) => sum + c.bulletin_count, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ————————————— Karşılama + arama ————————————— */}
      <section className="brand-bar pl-4">
        <p className="text-xs font-semibold tracking-[0.12em] text-tfs-red uppercase">
          {settings.portal_subtitle}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-tfs-dark sm:text-4xl">
          {settings.portal_title}
        </h1>
        {settings.home_intro ? (
          <p className="mt-2 max-w-2xl text-sm font-light text-tfs-dark-80">
            {settings.home_intro}
          </p>
        ) : null}
      </section>

      {/* Arama sekmelerin üstünde çalışır: çalışan bültenin hangi bölümde
          olduğunu bilmek zorunda kalmaz. */}
      <form action="/ara" method="get" className="mt-6" role="search">
        <label htmlFor="q" className="sr-only">
          Tüm bültenlerde ara
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-tfs-dark-60"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Tüm bültenlerde ara — bülten no veya konu"
              className="w-full rounded-brand border border-tfs-grey bg-white py-3 pr-4 pl-11 text-sm text-tfs-dark placeholder:text-tfs-dark-60 focus:border-tfs-red focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-brand bg-tfs-dark px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-tfs-red"
          >
            Ara
          </button>
        </div>
        {totalBulletins > 0 ? (
          <p className="mt-1.5 text-xs font-light text-tfs-dark-60">
            {formatNumber(totalBulletins)} bülten, {formatNumber(categories.length)} bölümde.
            Türkçe karakter yazmanız gerekmez.
          </p>
        ) : null}
      </form>

      {/* ————————————— Bildirimler ————————————— */}
      <section className="mt-8" aria-labelledby="bildirim-baslik">
        <SectionTitle>
          <span id="bildirim-baslik">Bildirim</span>
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <ReportAction
            href={settings.qdms_incident_url}
            title={settings.qdms_incident_title}
            description={settings.qdms_incident_desc}
            kind="incident"
          />
          <ReportAction
            href={settings.qdms_suggestion_url}
            title={settings.qdms_suggestion_title}
            description={settings.qdms_suggestion_desc}
            kind="suggestion"
          />
        </div>
      </section>

      {/* ————————————— Açık anketler ————————————— */}
      {openSurveys.length > 0 ? (
        <section className="mt-8" aria-labelledby="anket-baslik">
          <SectionTitle>
            <span id="anket-baslik">Açık Anket</span>
          </SectionTitle>
          <ul className="space-y-2">
            {openSurveys.map((survey) => (
              <li key={survey.id}>
                <Link
                  href={`/anket/${survey.public_token}`}
                  className="brand-bar flex flex-wrap items-center justify-between gap-3 rounded-brand border border-tfs-grey bg-white py-3 pr-4 pl-4 transition-colors hover:border-tfs-red"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-tfs-dark">
                      {survey.title}
                    </span>
                    <span className="mt-0.5 block text-xs font-light text-tfs-dark-60">
                      {survey.question_count} soru
                      {survey.closes_at ? ` · son gün ${formatDate(survey.closes_at)}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-brand bg-tfs-red px-3 py-1.5 text-xs font-semibold text-white">
                    Doldur
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ————————————— Son yayımlananlar ————————————— */}
      <section className="mt-8" aria-labelledby="son-baslik">
        <SectionTitle meta={recent.length > 0 ? `son ${formatNumber(recent.length)} bülten` : undefined}>
          <span id="son-baslik">Son Yayımlananlar</span>
        </SectionTitle>

        {recent.length === 0 ? (
          <p className="rounded-brand border border-dashed border-tfs-grey bg-tfs-grey-20 px-4 py-10 text-center text-sm font-light text-tfs-dark-60">
            Henüz bülten yayımlanmamış. Yönetim panelinden PDF yükleyerek başlayabilirsiniz.
          </p>
        ) : (
          <ul className="divide-y divide-tfs-grey-40 rounded-brand border border-tfs-grey bg-white">
            {recent.map((bulletin) => (
              <li key={bulletin.id}>
                <Link
                  href={`/bultenler/${bulletin.category_slug}?bulten=${bulletin.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-tfs-grey-20"
                >
                  <span className="placard-quiet">{bulletin.bulletin_no}</span>
                  <span className="min-w-0 flex-1 text-sm text-tfs-dark">{bulletin.subject}</span>
                  <span className="text-[0.6875rem] font-semibold tracking-[0.08em] text-tfs-dark-60 uppercase">
                    {bulletin.category_name}
                  </span>
                  <span className="tnum w-24 shrink-0 text-right text-xs text-tfs-dark-60">
                    {formatDate(bulletin.published_date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
