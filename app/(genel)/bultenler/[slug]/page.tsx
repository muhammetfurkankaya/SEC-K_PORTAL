import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BulletinBrowser } from "@/components/BulletinBrowser";
import { PageHeader } from "@/components/brand/SectionTitle";
import { getCategoryBySlug } from "@/lib/db/queries/categories";
import { listBulletinsByCategory } from "@/lib/db/queries/bulletins";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  return { title: category?.name ?? "Bültenler" };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const bulletins = listBulletinsByCategory(category.id);

  return (
    <>
      <PageHeader
        eyebrow="Bültenler"
        title={category.name}
        description={category.description}
      />
      <BulletinBrowser bulletins={bulletins} />
    </>
  );
}
