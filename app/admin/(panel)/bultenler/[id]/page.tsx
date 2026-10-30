import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { BulletinForm } from "@/components/admin/BulletinForm";
import { updateBulletinAction } from "../actions";
import { getBulletin } from "@/lib/db/queries/bulletins";
import { listAllCategories } from "@/lib/db/queries/categories";
import { formatNumber } from "@/lib/format";
import { MAX_UPLOAD_BYTES, coverExists, coverVersion } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bülteni Düzenle" };

type Props = { params: Promise<{ id: string }> };

export default async function EditBulletinPage({ params }: Props) {
  const { id } = await params;
  const bulletin = getBulletin(Number(id));
  if (!bulletin) notFound();

  const categories = listAllCategories();
  const currentCoverUrl = coverExists(bulletin.file_path)
    ? `/api/kapak/${bulletin.id}?v=${coverVersion(bulletin.file_path)}`
    : null;

  return (
    <>
      <AdminHeading
        title="Bülteni Düzenle"
        description={`${bulletin.bulletin_no} — ${formatNumber(bulletin.download_count)} indirme`}
      />

      <div className="max-w-3xl rounded-brand border border-tfs-grey bg-white p-6">
        <BulletinForm
          categories={categories}
          bulletin={bulletin}
          currentCoverUrl={currentCoverUrl}
          action={updateBulletinAction}
          maxUploadBytes={MAX_UPLOAD_BYTES}
        />
      </div>
    </>
  );
}
