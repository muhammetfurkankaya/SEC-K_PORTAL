import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BulletinReader } from "@/components/BulletinReader";
import { PageHeader } from "@/components/brand/SectionTitle";
import { getCategoryBySlug } from "@/lib/db/queries/categories";
import { listBulletinsByCategory } from "@/lib/db/queries/bulletins";
import { getSettings } from "@/lib/db/queries/settings";

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
      <PageHeader
        eyebrow="Bültenler"
        title={category.name}
        description={category.description}
      />
      <BulletinReader
        bulletins={bulletins}
        previewEnabled={settings.pdfPreviewEnabled}
        showDownloadCount={settings.downloadCountVisible}
        defaultSort={settings.defaultSort}
        todayIso={todayIso}
        initialSelectedId={initialSelectedId}
      />
    </>
  );
}
