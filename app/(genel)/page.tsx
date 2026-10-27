import Link from "next/link";
import { BulletinCard } from "@/components/BulletinCard";
import { BulletinCoverCard } from "@/components/BulletinCoverCard";
import { BulletinSearch } from "@/components/BulletinSearch";
import { PageHero } from "@/components/brand/PageHero";
import { SectionTitle } from "@/components/brand/SectionTitle";
import { listAllPublishedBulletins, listRecentBulletins } from "@/lib/db/queries/bulletins";
import { listOpenSurveys } from "@/lib/db/queries/surveys";
import { getSettings } from "@/lib/db/queries/settings";
import { resolveHomeHero } from "@/lib/hero";
import { alignClass, blockWidthClass, textClass } from "@/lib/appearance";
import { formatDate, formatNumber } from "@/lib/format";
import { coverExists, coverVersion } from "@/lib/uploads";

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

  // "Yalnızca kart" görünümünde kartlar kapaklı (PDF'in ilk sayfası).
  // Kapağı henüz üretilmemiş bültende kart yazılı kapağa düşer.
  const coverCards = settings.home_list_mode === "kart";
  const coverUrl = (bulletin: (typeof recent)[number]) =>
    coverExists(bulletin.file_path)
      ? `/api/kapak/${bulletin.id}?v=${coverVersion(bulletin.file_path)}`
      : null;

  // Hero yüksekliği ayardan; kayıttaki değerler bileşenin boyut adlarına
  // çevriliyor.
  // Görsel: yüklenen → paketle gelen → marka gradyanı (lib/hero.ts).
  const hero = resolveHomeHero(settings);

  const heroSize = ({ tam: "full", kisa: "sm", orta: "md", yuksek: "lg" } as const)[
    settings.hero_height
  ];

  // "Son yayımlananlar" bloğunun yerleşimi: hangi görünüm, ne genişlikte,
  // yazılar nasıl hizalı. Tam genişlikten dar bir blok her zaman ortalanır.
  const listVisible = settings.home_list_mode !== "kart";
  const cardsVisible = settings.home_list_mode !== "liste";
  const blockClass = [
    blockWidthClass(settings.home_block_width),
    "mx-auto",
    alignClass(settings.home_block_align),
  ].join(" ");

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
        size={heroSize}
        align={settings.hero_align === "orta" ? "orta" : "sol"}
        title={settings.portal_title}
        eyebrow={settings.portal_subtitle}
        eyebrowPlace={settings.home_kicker_pos}
        description={settings.home_intro}
        titleClass={textClass(settings, "home_title", { onDark: true })}
        eyebrowClass={textClass(settings, "home_kicker", { onDark: true })}
        descriptionClass={textClass(settings, "home_intro", { onDark: true })}
        imageSrc={hero.imageSrc}
        blurDataUrl={hero.blurDataUrl}
        scrim={hero.scrim}
        focal={hero.focal}
      />

      {/* ————————————— Koyu arama bandı —————————————
          Arama sekmelerin üstünde çalışır: çalışan bültenin hangi bölümde
          olduğunu bilmek zorunda kalmaz. Hero'nun koyusunu içeriğe doğru
          sürdürüyor, böylece fotoğraftan beyaz sayfaya sert düşüş olmuyor. */}
      {settings.show_search_band ? (
        <div className="bg-tfs-deep print-hidden dark:border-b dark:border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            <BulletinSearch bulletins={suggestions} submitLabel={settings.btn_search} tone="koyu" />
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        {/* ————————————— Açık anketler ————————————— */}
        {openSurveys.length > 0 ? (
          <section aria-labelledby="anket-baslik">
            <SectionTitle titleClass={textClass(settings, "section_title")}>
              <span id="anket-baslik">{settings.section_survey_title}</span>
            </SectionTitle>
            <ul className="space-y-2">
              {openSurveys.map((survey) => (
                <li key={survey.id}>
                  <Link
                    href={`/anket/${survey.public_token}`}
                    className="brand-bar flex flex-wrap items-center justify-between gap-3 rounded-brand border border-line bg-surface py-3 pr-4 pl-4 transition-[border-color,box-shadow] duration-[180ms] hover:border-accent hover:shadow-brand-raised"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{survey.title}</span>
                      <span className="mt-0.5 block text-xs font-light text-ink-faint">
                        {survey.question_count} soru
                        {survey.closes_at ? ` · son gün ${formatDate(survey.closes_at)}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-brand bg-tfs-red px-3 py-1.5 text-xs font-semibold text-white">
                      {settings.btn_survey}
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
            titleClass={textClass(settings, "section_title")}
            meta={recent.length > 0 ? `son ${formatNumber(recent.length)} bülten` : undefined}
          >
            <span id="son-baslik">{settings.section_recent_title}</span>
          </SectionTitle>

          {recent.length === 0 ? (
            <p className="rounded-brand border border-dashed border-line bg-surface-2 px-4 py-10 text-center text-sm font-light text-ink-faint">
              {settings.empty_home}
            </p>
          ) : (
            /* Solda tam liste, sağda en yenilerin kartları. Liste taramak,
               kartlar göz gezdirmek için — ikisi aynı bültenlere farklı iki
               yoldan bakıyor. */
            <div
              className={`grid items-start gap-6 ${blockClass} ${
                listVisible && cardsVisible ? "lg:grid-cols-[1.1fr_1fr]" : ""
              }`}
            >
              {/* items-start: liste kartlar kadar uzayıp altında boş çerçeve
                  bırakmasın. */}
              {listVisible ? (
                <ul className="divide-y divide-line-soft rounded-brand border border-line bg-surface">
                  {recent.map((bulletin) => (
                    <li key={bulletin.id}>
                      <Link
                        href={`/bultenler/${bulletin.category_slug}?bulten=${bulletin.id}`}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-3 transition-colors hover:bg-surface-2"
                      >
                        <span className="placard-quiet">{bulletin.bulletin_no}</span>
                        <span className="min-w-0 flex-1 text-sm text-ink">{bulletin.subject}</span>
                        <span className="tnum shrink-0 text-xs text-ink-faint">
                          {formatDate(bulletin.published_date)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}

              {coverCards ? (
                <div
                  className={`grid gap-4 ${
                    settings.home_block_width === "dar" ? "" : "lg:grid-cols-2"
                  }`}
                >
                  {recent.map((bulletin) => (
                    <BulletinCoverCard
                      key={bulletin.id}
                      bulletin={bulletin}
                      coverUrl={coverUrl(bulletin)}
                      openLabel={settings.btn_open}
                    />
                  ))}
                </div>
              ) : cardsVisible ? (
                <div className={`grid gap-3 sm:grid-cols-2 ${listVisible ? "" : "lg:grid-cols-4"}`}>
                  {(listVisible ? cards : recent).map((bulletin) => (
                    <BulletinCard
                      key={bulletin.id}
                      bulletin={bulletin}
                      openLabel={settings.btn_open}
                      showCategory
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
