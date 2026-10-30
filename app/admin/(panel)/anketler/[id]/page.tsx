import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { saveSurveyAction } from "../actions";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { SurveyEditor } from "@/components/admin/SurveyEditor";
import { SurveyQrPanel } from "@/components/admin/SurveyQrPanel";
import { Alert } from "@/components/ui/form";
import { getQuestions, getSurvey, hasResponses } from "@/lib/db/queries/surveys";
import { surveyUrl } from "@/lib/base-url";
import { makeQr } from "@/lib/qr";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anketi Düzenle" };

const STATUS_MESSAGES: Record<string, { kind: "success" | "info" | "error"; text: string }> = {
  olusturuldu: {
    kind: "success",
    text: "Anket oluşturuldu. Şimdi sorularını ekleyip kaydedin, sonra yayınlayın.",
  },
  kopyalandi: {
    kind: "success",
    text: "Anket kopyalandı. Kopya kapalı durumdadır; soruları düzenleyip yayınlayabilirsiniz.",
  },
  sorusuz: {
    kind: "error",
    text: "Sorusu olmayan bir anket yayınlanamaz. Önce en az bir soru ekleyip kaydedin.",
  },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ durum?: string }>;
};

export default async function EditSurveyPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { durum } = await searchParams;

  const survey = getSurvey(Number(id));
  if (!survey) notFound();

  const questions = getQuestions(survey.id);
  const locked = hasResponses(survey.id);
  const status = durum ? STATUS_MESSAGES[durum] : undefined;

  const url = await surveyUrl(survey.public_token);
  const qr = await makeQr(url);

  return (
    <>
      <AdminHeading
        title={survey.title}
        description={`${formatNumber(questions.length)} soru · ${formatNumber(
          survey.response_count,
        )} cevap`}
      >
        <Link
          href={`/admin/anketler/${survey.id}/analiz`}
          className="rounded-brand border border-line-strong bg-surface-3 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-tfs-red"
        >
          Analizi gör
        </Link>
        <Link
          href="/admin/anketler"
          className="rounded-brand border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-line-strong"
        >
          Listeye dön
        </Link>
      </AdminHeading>

      {status ? (
        <div className="mb-4">
          <Alert kind={status.kind}>{status.text}</Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <SurveyEditor
          survey={survey}
          questions={questions}
          action={saveSurveyAction}
          locked={locked}
        />

        <div className="lg:sticky lg:top-4 lg:self-start">
          <SurveyQrPanel
            surveyId={survey.id}
            title={survey.title}
            url={url}
            pngDataUrl={qr.pngDataUrl}
            svg={qr.svg}
            isActive={Boolean(survey.is_active)}
          />
        </div>
      </div>
    </>
  );
}
