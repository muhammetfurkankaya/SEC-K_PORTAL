import Link from "next/link";
import type { Metadata } from "next";
import {
  deleteSurveyAction,
  duplicateSurveyAction,
  toggleSurveyActiveAction,
} from "./actions";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { Alert, SubmitButton } from "@/components/ui/form";
import { listSurveys } from "@/lib/db/queries/surveys";
import { formatDateTime, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anketler" };

const STATUS_MESSAGES: Record<string, { kind: "success" | "error"; text: string }> = {
  yayinlandi: { kind: "success", text: "Anket yayınlandı. QR kodu artık çalışıyor." },
  kapatildi: { kind: "success", text: "Anket kapatıldı." },
  silindi: { kind: "success", text: "Anket ve cevapları silindi." },
  bulunamadi: { kind: "error", text: "Anket bulunamadı." },
};

type Props = { searchParams: Promise<{ durum?: string }> };

export default async function AdminSurveysPage({ searchParams }: Props) {
  const { durum } = await searchParams;
  const status = durum ? STATUS_MESSAGES[durum] : undefined;
  const surveys = listSurveys();

  return (
    <>
      <AdminHeading
        title="Anketler"
        description="Anket oluşturun, QR kod ile yayın yapın ve cevapların analizini görün."
      >
        <Link
          href="/admin/anketler/yeni"
          className="rounded-brand bg-tfs-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-tfs-dark"
        >
          + Yeni anket
        </Link>
      </AdminHeading>

      {status ? (
        <div className="mb-4">
          <Alert kind={status.kind}>{status.text}</Alert>
        </div>
      ) : null}

      {surveys.length === 0 ? (
        <p className="rounded-brand border border-dashed border-tfs-grey bg-white px-4 py-12 text-center text-sm font-light text-tfs-dark-60">
          Henüz anket oluşturulmadı.
        </p>
      ) : (
        <ul className="space-y-3">
          {surveys.map((survey) => (
            <li
              key={survey.id}
              className="rounded-brand border border-tfs-grey bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/anketler/${survey.id}`}
                      className="text-base font-semibold text-tfs-dark hover:text-tfs-red"
                    >
                      {survey.title}
                    </Link>

                    {survey.is_active ? (
                      <span className="rounded-brand bg-tfs-green/20 px-2 py-0.5 text-[0.6875rem] font-semibold text-tfs-dark">
                        Açık
                      </span>
                    ) : (
                      <span className="rounded-brand bg-tfs-grey-40 px-2 py-0.5 text-[0.6875rem] font-semibold text-tfs-dark-60">
                        Kapalı
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-tfs-dark-60">
                    {formatNumber(survey.question_count)} soru ·{" "}
                    <span className="font-semibold text-tfs-dark">
                      {formatNumber(survey.response_count)} cevap
                    </span>
                    {survey.last_response_at
                      ? ` · son cevap ${formatDateTime(survey.last_response_at)}`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Link
                    href={`/admin/anketler/${survey.id}/analiz`}
                    className="rounded-brand bg-tfs-dark px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-tfs-red"
                  >
                    Analiz
                  </Link>

                  <Link
                    href={`/admin/anketler/${survey.id}`}
                    className="rounded-brand border border-tfs-grey px-3 py-1.5 text-xs text-tfs-dark-80 hover:border-tfs-dark-20 hover:text-tfs-dark"
                  >
                    Düzenle / QR
                  </Link>

                  <form action={toggleSurveyActiveAction}>
                    <input type="hidden" name="id" value={survey.id} />
                    <SubmitButton variant="secondary" className="!px-3 !py-1.5 !text-xs !font-normal">
                      {survey.is_active ? "Kapat" : "Yayınla"}
                    </SubmitButton>
                  </form>

                  <form action={duplicateSurveyAction}>
                    <input type="hidden" name="id" value={survey.id} />
                    <SubmitButton variant="secondary" className="!px-3 !py-1.5 !text-xs !font-normal">
                      Kopyala
                    </SubmitButton>
                  </form>

                  <form action={deleteSurveyAction}>
                    <input type="hidden" name="id" value={survey.id} />
                    <SubmitButton
                      variant="danger"
                      className="!px-3 !py-1.5 !text-xs !font-normal"
                      confirm={
                        survey.response_count > 0
                          ? `"${survey.title}" anketini ve ${survey.response_count} cevabı kalıcı olarak silmek istediğinize emin misiniz?`
                          : `"${survey.title}" anketini silmek istediğinize emin misiniz?`
                      }
                    >
                      Sil
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
