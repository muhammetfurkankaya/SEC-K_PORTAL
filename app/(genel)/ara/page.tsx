import type { Metadata } from "next";
import { BulletinReader } from "@/components/BulletinReader";
import { PageHero } from "@/components/brand/PageHero";
import { textClass } from "@/lib/appearance";
import { listAllPublishedBulletins } from "@/lib/db/queries/bulletins";
import { getSettings } from "@/lib/db/queries/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bülten Arama" };

type Props = { searchParams: Promise<{ q?: string; bulten?: string }> };

/**
 * Tüm sekmelerde bülten arama.
 *
 * Ana sayfadaki arama kutusu buraya gönderir. Aynı okuma bileşenini
 * kullanır — sonuç listesinde bölüm adı da görünür.
 */
export default async function SearchPage({ searchParams }: Props) {
  const { q, bulten } = await searchParams;
  const query = (q ?? "").trim();

  const settings = getSettings();
  const bulletins = listAllPublishedBulletins();

  // "Yeni" etiketi için tek tarih kaynağı (hidrasyon uyuşmazlığını önler).
  const todayIso = new Date().toISOString().slice(0, 10);

  const requestedId = Number(bulten);
  const initialSelectedId =
    Number.isInteger(requestedId) && bulletins.some((b) => b.id === requestedId)
      ? requestedId
      : undefined;

  return (
    <>
      <PageHero
        tone="flat"
        eyebrow={settings.page_search_eyebrow}
        title={query ? `“${query}” için sonuçlar` : settings.page_search_title}
        description={settings.page_search_desc}
        titleClass={textClass(settings, "page_title")}
        eyebrowClass={textClass(settings, "page_eyebrow")}
      />
      <BulletinReader
        bulletins={bulletins}
        labels={{
          indexTitle: settings.reader_index_title,
          download: settings.btn_download,
          newTab: settings.btn_new_tab,
          newBadge: settings.badge_new,
          newDays: settings.badge_new_days,
        }}
        previewEnabled={settings.pdfPreviewEnabled}
        showDownloadCount={settings.downloadCountVisible}
        defaultSort={settings.defaultSort}
        todayIso={todayIso}
        initialQuery={query}
        initialSelectedId={initialSelectedId}
        showCategory
        emptyNote={settings.empty_category}
      />
    </>
  );
}
