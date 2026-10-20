import Link from "next/link";
import { BulletinCard } from "@/components/BulletinCard";
import { BulletinSearch } from "@/components/BulletinSearch";
import { ReportAction } from "@/components/ReportAction";
import { PageHero } from "@/components/brand/PageHero";
import { SectionTitle } from "@/components/brand/SectionTitle";
import { listAllPublishedBulletins, listRecentBulletins } from "@/lib/db/queries/bulletins";
import { listOpenSurveys } from "@/lib/db/queries/surveys";
import { getSettings } from "@/lib/db/queries/settings";
import { HOME_HERO_IMAGE } from "@/lib/brand";
import { formatDate, formatNumber } from "@/lib/format";

// Bültenler ve anketler admin panelinden değiştiğinde ana sayfa güncel
// görünmelidir; bu yüzden her istekte yeniden oluşturulur.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const settings = getSettings();
  const recent = listRecentBulletins(settings.homeRecentCount);
  const openSurveys = settings.surveysSectionVisible ? listOpenSurveys() : [];

  // Kart alanı listenin yanına sığdığı kadar bülten gösterir; listenin
  // tamamını tekrar etmesi gerekmiyor.
  const cards = recent.slice(0, 4);

  // Arama önerileri istemcide filtrelenir; yalnızca gereken alanlar
  // gönderilir, tüm bülten kaydı değil.
  const suggestions = listAllPublishedBulletins().map((bulletin) => ({
    id: bulletin.id,
    bulletin_no: bulletin.bulletin_no,
    subject: bulletin.subject,
    category_name: bulletin.category_name,
    category_slug: bulletin.category_slug,
  }));

  return (
    <>
      {/* ————————————— Hero —————————————
          Üst etiket (portal_subtitle) başlığın ALTINDA duruyor: büyük
          başlık önce okunsun, tanım sonra gelsin. */}
      <PageHero
        size="lg"
        title={settings.portal_title}
        eyebrow={settings.portal_subtitle}
        eyebrowPlace="altta"
        description={settings.home_intro}
        imageSrc={HOME_HERO_IMAGE}
      />

      {/* ————————————— Koyu arama bandı —————————————
          Arama sekmelerin üstünde çalışır: çalışan bültenin hangi bölümde
          olduğunu bilmek zorunda kalmaz. Hero'nun koyusunu içeriğe doğru
          sürdürüyor, böylece fotoğraftan beyaz sayfaya sert düşüş olmuyor. */}
      <div className="bg-tfs-deep print-hidden">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <BulletinSearch bulletins={suggestions} tone="koyu" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        {/* ————————————— Bildirimler —————————————
            Varsayılan olarak kapalı: QDMS kartları ana sayfadan kaldırıldı.
            Ayarlar > QDMS Bildirim Kartları bölümünden geri açılabilir. */}
        {settings.qdmsSectionVisible ? (
          <section aria-labelledby="bildirim-baslik">
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
        ) : null}

        {/* ————————————— Açık anketler ————————————— */}
        {openSurveys.length > 0 ? (
          <section aria-labelledby="anket-baslik">
            <SectionTitle>
              <span id="anket-baslik">Açık Anket</span>
            </SectionTitle>
            <ul className="space-y-2">
              {openSurveys.map((survey) => (
                <li key={survey.id}>
                  <Link
                    href={`/anket/${survey.public_token}`}
                    className="brand-bar flex flex-wrap items-center justify-between gap-3 rounded-brand border border-tfs-grey bg-white py-3 pr-4 pl-4 transition-[border-color,box-shadow] duration-[180ms] hover:border-tfs-red hover:shadow-brand-raised"
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
        <section aria-labelledby="son-baslik">
          <SectionTitle
            meta={recent.length > 0 ? `son ${formatNumber(recent.length)} bülten` : undefined}
          >
            <span id="son-baslik">Son Yayımlananlar</span>
          </SectionTitle>

          {recent.length === 0 ? (
            <p className="rounded-brand border border-dashed border-tfs-grey bg-tfs-grey-20 px-4 py-10 text-center text-sm font-light text-tfs-dark-60">
              Henüz bülten yayımlanmamış. Yönetim panelinden PDF yükleyerek başlayabilirsiniz.
            </p>
          ) : (
            /* Solda tam liste, sağda en yenilerin kartları. Liste taramak,
               kartlar göz gezdirmek için — ikisi aynı bültenlere farklı iki
               yoldan bakıyor. */
            <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
              {/* items-start: liste kartlar kadar uzayıp altında boş çerçeve
                  bırakmasın. */}
              <ul className="divide-y divide-tfs-grey-40 rounded-brand border border-tfs-grey bg-white">
                {recent.map((bulletin) => (
                  <li key={bulletin.id}>
                    <Link
                      href={`/bultenler/${bulletin.category_slug}?bulten=${bulletin.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-3 transition-colors hover:bg-tfs-grey-20"
                    >
                      <span className="placard-quiet">{bulletin.bulletin_no}</span>
                      <span className="min-w-0 flex-1 text-sm text-tfs-dark">
                        {bulletin.subject}
                      </span>
                      <span className="tnum shrink-0 text-xs text-tfs-dark-60">
                        {formatDate(bulletin.published_date)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="grid gap-3 sm:grid-cols-2">
                {cards.map((bulletin) => (
                  <BulletinCard key={bulletin.id} bulletin={bulletin} showCategory />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
