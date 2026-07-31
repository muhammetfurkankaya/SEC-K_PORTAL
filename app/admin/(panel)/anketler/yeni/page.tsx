import type { Metadata } from "next";
import { createSurveyAction } from "../actions";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { SurveyEditor } from "@/components/admin/SurveyEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yeni Anket" };

export default function NewSurveyPage() {
  return (
    <>
      <AdminHeading
        title="Yeni Anket"
        description="Anket bilgilerini girin; kaydettikten sonra soruları ekleyeceksiniz."
      />

      <div className="max-w-3xl">
        <SurveyEditor action={createSurveyAction} />
      </div>
    </>
  );
}
