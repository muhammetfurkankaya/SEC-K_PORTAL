import type { Metadata } from "next";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { BulletinForm } from "@/components/admin/BulletinForm";
import { createBulletinAction } from "../actions";
import { listAllCategories } from "@/lib/db/queries/categories";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bülten Yükle" };

export default function NewBulletinPage() {
  const categories = listAllCategories();

  return (
    <>
      <AdminHeading
        title="Bülten Yükle"
        description="PDF dosyasını seçin ve bülten bilgilerini girin."
      />

      <div className="max-w-3xl rounded-brand border border-line bg-surface p-6">
        {categories.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Önce Sekmeler bölümünden en az bir sekme oluşturmanız gerekiyor.
          </p>
        ) : (
          <BulletinForm
            categories={categories}
            action={createBulletinAction}
            maxUploadBytes={MAX_UPLOAD_BYTES}
          />
        )}
      </div>
    </>
  );
}
