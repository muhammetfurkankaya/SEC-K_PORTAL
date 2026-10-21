import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SurveyForm } from "./SurveyForm";
import { Logo } from "@/components/brand/Logo";
import { getQuestions, getSurveyByToken } from "@/lib/db/queries/surveys";
import { getSettings } from "@/lib/db/queries/settings";
import { AVAILABILITY_MESSAGES, checkAvailability } from "@/lib/survey-window";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const survey = getSurveyByToken(token);
  return { title: survey?.title ?? "Anket" };
}

/**
 * QR kodun açtığı anket sayfası.
 *
 * Portal sekmeleri ve üst navigasyon bilinçli olarak yok: katılımcı tek bir
 * işe (anketi doldurmaya) odaklanmalı.
 */
export default async function SurveyPage({ params }: Props) {
  const { token } = await params;
  const survey = getSurveyByToken(token);
  if (!survey) notFound();

  const settings = getSettings();
  const availability = checkAvailability(survey);
  const questions = availability.open ? getQuestions(survey.id) : [];

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <div className="bg-tfs-dark">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Portala git">
            <Logo variant="light" subtitle={settings.portal_title} />
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="brand-bar pl-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-accent-ink uppercase">Anket</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{survey.title}</h1>
          {survey.description ? (
            <p className="mt-2 text-sm font-light text-ink-soft">{survey.description}</p>
          ) : null}
          {survey.closes_at && availability.open ? (
            <p className="mt-2 text-xs text-ink-faint">
              Son doldurma tarihi: {formatDate(survey.closes_at)}
            </p>
          ) : null}
        </div>

        <div className="mt-6">
          {!availability.open ? (
            <div className="rounded-brand border border-line bg-surface p-6 text-center">
              <p className="text-sm text-ink">{AVAILABILITY_MESSAGES[availability.reason]}</p>
              <Link
                href="/"
                className="mt-4 inline-block rounded-brand bg-tfs-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-tfs-dark"
              >
                Portala git
              </Link>
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-brand border border-line bg-surface p-6 text-center">
              <p className="text-sm text-ink">
                Bu ankette henüz soru bulunmuyor. Lütfen daha sonra tekrar deneyin.
              </p>
            </div>
          ) : (
            <SurveyForm survey={survey} questions={questions} startedAt={Date.now()} />
          )}
        </div>
      </div>

      <footer className="border-t border-line bg-surface">
        <p className="mx-auto max-w-2xl px-4 py-4 text-center text-xs font-light text-ink-faint sm:px-6">
          Turkish Fuel Services · {settings.portal_title} · Şirket içi kullanım içindir
        </p>
      </footer>
    </div>
  );
}
