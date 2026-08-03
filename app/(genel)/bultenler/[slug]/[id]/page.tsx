import { notFound, redirect } from "next/navigation";
import { getPublishedBulletin } from "@/lib/db/queries/bulletins";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; id: string }> };

/**
 * Eski bülten adresi.
 *
 * Bültenler artık sekme sayfasında, listenin yanında açılıyor. Daha önce
 * paylaşılmış `/bultenler/<sekme>/<id>` bağlantıları kırılmasın diye bu yol
 * yeni biçime yönlendirilir.
 */
export default async function LegacyBulletinPage({ params }: Props) {
  const { slug, id } = await params;
  const bulletin = getPublishedBulletin(Number(id));

  if (!bulletin || bulletin.category_slug !== slug) notFound();

  redirect(`/bultenler/${bulletin.category_slug}?bulten=${bulletin.id}`);
}
