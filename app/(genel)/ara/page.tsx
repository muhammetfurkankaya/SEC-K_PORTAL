import type { Metadata } from "next";
import { BulletinReader } from "@/components/BulletinReader";
import { PageHeader } from "@/components/brand/SectionTitle";
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
      <PageHeader
        eyebrow="Arama"
        title={query ? `“${query}” için sonuçlar` : "Tüm bültenlerde ara"}
        description="Bülten numarası veya konuya göre arayın. Türkçe karakter yazmanız gerekmez."
      />
      <BulletinReader
        bulletins={bulletins}
        previewEnabled={settings.pdfPreviewEnabled}
        showDownloadCount={settings.downloadCountVisible}
        defaultSort={settings.defaultSort}
        todayIso={todayIso}
        initialQuery={query}
        initialSelectedId={initialSelectedId}
        showCategory
        emptyNote="Portalda henüz yayımlanmış bülten yok."
      />
    </>
  );
}
