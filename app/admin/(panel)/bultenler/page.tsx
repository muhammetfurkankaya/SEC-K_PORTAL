import Link from "next/link";
import type { Metadata } from "next";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { BulletinTable } from "@/components/admin/BulletinTable";
import { Alert } from "@/components/ui/form";
import { listAllBulletins } from "@/lib/db/queries/bulletins";
import { listAllCategories } from "@/lib/db/queries/categories";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bültenler" };

/** İşlem sonrası adres çubuğundaki ?durum= değerine karşılık gelen mesajlar. */
const STATUS_MESSAGES: Record<string, { kind: "success" | "error"; text: string }> = {
  eklendi: { kind: "success", text: "Bülten yüklendi ve portalda yayımlandı." },
  silindi: { kind: "success", text: "Bülten ve PDF dosyası silindi." },
  yayinlandi: { kind: "success", text: "Bülten yayına alındı." },
  kaldirildi: { kind: "success", text: "Bülten yayından kaldırıldı." },
  bulunamadi: { kind: "error", text: "İşlem yapılacak bülten bulunamadı." },
};

type Props = { searchParams: Promise<{ durum?: string }> };

export default async function AdminBulletinsPage({ searchParams }: Props) {
  const { durum } = await searchParams;
  const status = durum ? STATUS_MESSAGES[durum] : undefined;

  const bulletins = listAllBulletins();
  const categories = listAllCategories();

  return (
    <>
      <AdminHeading
        title="Bültenler"
        description="Yayımlanan bültenleri yönetin, yeni PDF yükleyin."
      >
        <Link
          href="/admin/bultenler/yeni"
          className="rounded-brand bg-tfs-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-tfs-dark"
        >
          + Bülten yükle
        </Link>
      </AdminHeading>

      {status ? (
        <div className="mb-4">
          <Alert kind={status.kind}>{status.text}</Alert>
        </div>
      ) : null}

      <BulletinTable bulletins={bulletins} categories={categories} />
    </>
  );
}
