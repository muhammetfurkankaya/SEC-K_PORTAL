import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BulletinReader } from "@/components/BulletinReader";
import { PageHero } from "@/components/brand/PageHero";
import { textClass } from "@/lib/appearance";
import { getCategoryBySlug } from "@/lib/db/queries/categories";
import { listBulletinsByCategory } from "@/lib/db/queries/bulletins";
import { getSettings } from "@/lib/db/queries/settings";
import { resolveHomeHero } from "@/lib/hero";
import { EMPTY_MESSAGES } from "@/lib/messages";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bulten?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  return { title: category?.name ?? "Bültenler" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { bulten } = await searchParams;

  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const settings = getSettings();
  const hero = resolveHomeHero(settings);
  const heroHeight =
    settings.category_hero_height === "orta" || settings.category_hero_height === "yuksek"
      ? settings.category_hero_height
      : "kisa";
  const bulletins = listBulletinsByCategory(category.id);

  // "Yeni" etiketi için tek tarih kaynağı (hidrasyon uyuşmazlığını önler).
  const todayIso = new Date().toISOString().slice(0, 10);

  // Paylaşılan bağlantı başka bir sekmenin bültenini gösteriyorsa yok sayılır.
  const requestedId = Number(bulten);
  const initialSelectedId =
    Number.isInteger(requestedId) && bulletins.some((b) => b.id === requestedId)
      ? requestedId
      : undefined;

  return (
    <>
      {/* Ana sayfanın görseli sekmelerde de: aynı görsel, aynı kadraj ve
          perde; üst menü onun üzerinde saydam durur (lib/routes.ts).
          Yükseklik ayrı ayarlanır — okuma ekranı aşağı itilmesin. */}
      <PageHero
        size={({ kisa: "sm", orta: "md", yuksek: "lg" } as const)[heroHeight]}
        align={settings.hero_align === "orta" ? "orta" : "sol"}
        title={category.name}
        eyebrow={settings.page_category_eyebrow}
        eyebrowPlace={settings.page_category_eyebrow_pos}
        titleClass={textClass(settings, "page_title", { onDark: true })}
        eyebrowClass={textClass(settings, "page_eyebrow", { onDark: true })}
        description={category.description}
        imageSrc={hero.imageSrc}
        blurDataUrl={hero.blurDataUrl}
        scrim={hero.scrim}
        focal={hero.focal}
        fadeTo="surface"
        motion={settings.category_hero_motion ? settings.hero_motion : "yok"}
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
        initialSelectedId={initialSelectedId}
        emptyNote={EMPTY_MESSAGES.category}
      />
    </>
  );
}
