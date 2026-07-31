import Link from "next/link";
import { BulletinCard } from "@/components/BulletinCard";
import { QdmsCard } from "@/components/QdmsCard";
import { SectionTitle } from "@/components/brand/SectionTitle";
import { listActiveCategories } from "@/lib/db/queries/categories";
import { listRecentBulletins } from "@/lib/db/queries/bulletins";
import { listOpenSurveys } from "@/lib/db/queries/surveys";
import { getSettings } from "@/lib/db/queries/settings";
import { formatNumber } from "@/lib/format";

// Bültenler ve anketler admin panelinden değiştiğinde ana sayfa güncel
// görünmelidir; bu yüzden her istekte yeniden oluşturulur.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const settings = getSettings();
  const categories = listActiveCategories();
  const recent = listRecentBulletins(8);
  const openSurveys = listOpenSurveys();

  return (
    <>
      {/* ————— Karşılama bandı ————— */}
      <section className="border-b border-tfs-grey bg-tfs-grey-20">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="brand-bar pl-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-tfs-red uppercase">
              {settings.portal_subtitle}
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-tfs-dark sm:text-4xl">
              {settings.portal_title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-light text-tfs-dark-80">
              Bültenlere buradan ulaşabilir, öneri ve olay bildirimlerinizi QDMS
              üzerinden iletebilir, açık anketleri doldurabilirsiniz.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* ————— QDMS yönlendirmeleri ————— */}
        <section aria-labelledby="bildirim-baslik">
          <SectionTitle>
            <span id="bildirim-baslik">Bildirimler</span>
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <QdmsCard
              href={settings.qdms_suggestion_url}
              title="Öneri Bildirim"
              description="İyileştirme önerilerinizi QDMS Öneri Sistemi üzerinden iletin."
              icon="suggestion"
            />
            <QdmsCard
              href={settings.qdms_incident_url}
              title="Olay Bildirim"
              description="Kaza, ramak kala ve tehlikeli durumları QDMS üzerinden bildirin."
              icon="incident"
            />
          </div>
        </section>

        {/* ————— Bülten sekmeleri ————— */}
        <section className="mt-12" aria-labelledby="bulten-baslik">
          <SectionTitle
            meta={`${formatNumber(categories.length)} bölüm`}
          >
            <span id="bulten-baslik">Bültenler</span>
          </SectionTitle>

          {categories.length === 0 ? (
            <EmptyNote>
              Henüz bülten bölümü tanımlanmamış. Yönetim panelinden sekme
              ekleyebilirsiniz.
            </EmptyNote>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/bultenler/${category.slug}`}
                  className="group flex flex-col rounded-brand border border-tfs-grey bg-white p-5 transition-colors hover:border-tfs-red"
                >
                  <span className="text-base font-semibold text-tfs-dark">{category.name}</span>
                  {category.description ? (
                    <span className="mt-1 line-clamp-2 text-xs font-light text-tfs-dark-80">
                      {category.description}
                    </span>
                  ) : null}
                  <span className="mt-4 text-xs text-tfs-dark-60">
                    {category.bulletin_count > 0
                      ? `${formatNumber(category.bulletin_count)} bülten`
                      : "Henüz bülten yok"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ————— Açık anketler ————— */}
        {openSurveys.length > 0 ? (
          <section className="mt-12" aria-labelledby="anket-baslik">
            <SectionTitle>
              <span id="anket-baslik">Açık Anketler</span>
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openSurveys.map((survey) => (
                <Link
                  key={survey.id}
                  href={`/anket/${survey.public_token}`}
                  className="group flex flex-col rounded-brand border border-tfs-grey bg-white p-5 transition-colors hover:border-tfs-red"
                >
                  <span className="text-sm font-semibold text-tfs-dark">{survey.title}</span>
                  {survey.description ? (
                    <span className="mt-1 line-clamp-2 text-xs font-light text-tfs-dark-80">
                      {survey.description}
                    </span>
                  ) : null}
                  <span className="mt-4 text-xs font-semibold tracking-[0.08em] text-tfs-red uppercase">
                    Anketi doldur
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* ————— Son yayımlananlar ————— */}
        <section className="mt-12" aria-labelledby="son-baslik">
          <SectionTitle>
            <span id="son-baslik">Son Yayımlananlar</span>
          </SectionTitle>

          {recent.length === 0 ? (
            <EmptyNote>
              Henüz bülten yayımlanmamış. Yönetim panelinden PDF yükleyerek
              başlayabilirsiniz.
            </EmptyNote>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((bulletin) => (
                <BulletinCard key={bulletin.id} bulletin={bulletin} showCategory />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-brand border border-dashed border-tfs-grey bg-tfs-grey-20 px-4 py-8 text-center text-sm font-light text-tfs-dark-60">
      {children}
    </p>
  );
}
