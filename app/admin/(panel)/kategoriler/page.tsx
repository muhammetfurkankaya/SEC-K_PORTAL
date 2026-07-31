import type { Metadata } from "next";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { Alert } from "@/components/ui/form";
import { listAllCategories } from "@/lib/db/queries/categories";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sekmeler" };

const STATUS_MESSAGES: Record<string, { kind: "success" | "error"; text: string }> = {
  silindi: { kind: "success", text: "Sekme silindi." },
  dolu: {
    kind: "error",
    text: "Bu sekmede bülten olduğu için silinemedi. Önce bültenleri başka bir sekmeye taşıyın veya silin.",
  },
  bulunamadi: { kind: "error", text: "Sekme bulunamadı." },
};

type Props = { searchParams: Promise<{ durum?: string }> };

export default async function CategoriesPage({ searchParams }: Props) {
  const { durum } = await searchParams;
  const status = durum ? STATUS_MESSAGES[durum] : undefined;
  const categories = listAllCategories();

  return (
    <>
      <AdminHeading
        title="Sekmeler"
        description="Portalda görünen bülten bölümlerini yönetin. İhtiyaç halinde yeni sekme ekleyebilirsiniz."
      />

      {status ? (
        <div className="mb-4">
          <Alert kind={status.kind}>{status.text}</Alert>
        </div>
      ) : null}

      <CategoryManager categories={categories} />
    </>
  );
}
