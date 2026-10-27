import type { Metadata } from "next";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { NavAppearancePanel } from "@/components/admin/NavAppearancePanel";
import { Alert } from "@/components/ui/form";
import { listAllCategories } from "@/lib/db/queries/categories";
import { getSettings } from "@/lib/db/queries/settings";

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
  const settings = getSettings();

  // Önizleme portaldaki sırayla: Ana Sayfa, aktif sekmeler, Anketler.
  const navLabels = [
    settings.nav_home_label,
    ...categories.filter((category) => category.is_active).map((category) => category.name),
    ...(settings.surveysSectionVisible ? [settings.nav_surveys_label] : []),
  ];

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

      <div className="mb-6">
        <NavAppearancePanel
          labels={navLabels}
          initial={{
            type_nav_size: settings.type_nav_size,
            type_nav_color: settings.type_nav_color,
            nav_align: settings.nav_align,
          }}
        />
      </div>

      <CategoryManager categories={categories} />
    </>
  );
}
