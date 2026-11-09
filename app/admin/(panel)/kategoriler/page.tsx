import type { Metadata } from "next";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { NavAppearancePanel } from "@/components/admin/NavAppearancePanel";
import { Alert } from "@/components/ui/form";
import { listActiveCategories, listAllCategories } from "@/lib/db/queries/categories";
import { listOpenSurveys } from "@/lib/db/queries/surveys";
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
  // Portaldaki sayılar yalnızca yayındaki bültenleri sayar (listActiveCategories).
  const active = listActiveCategories();
  const navLabels = [
    settings.nav_home_label,
    ...active.map((category) => category.name),
    ...(settings.surveysSectionVisible ? [settings.nav_surveys_label] : []),
  ];
  // Önizlemedeki sayılar portaldakilerle aynı: yayındaki bülten, açık anket.
  const navCounts = [
    undefined,
    ...active.map((category) => category.bulletin_count),
    ...(settings.surveysSectionVisible ? [listOpenSurveys().length] : []),
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
          counts={navCounts}
          initial={{
            type_nav_size: settings.type_nav_size,
            type_nav_color: settings.type_nav_color,
            nav_align: settings.nav_align,
            nav_show_counts: settings.nav_show_counts ? "1" : "0",
          }}
        />
      </div>

      <CategoryManager categories={categories} />
    </>
  );
}
