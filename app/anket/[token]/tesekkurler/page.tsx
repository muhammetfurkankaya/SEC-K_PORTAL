import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { getSurveyByToken } from "@/lib/db/queries/surveys";
import { getSettings } from "@/lib/db/queries/settings";
import { checkAvailability } from "@/lib/survey-window";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Teşekkürler" };

type Props = { params: Promise<{ token: string }> };

export default async function ThanksPage({ params }: Props) {
  const { token } = await params;
  const survey = getSurveyByToken(token);
  if (!survey) notFound();

  const settings = getSettings();
  const canFillAgain = Boolean(survey.allow_multiple) && checkAvailability(survey).open;

  return (
    <div className="flex min-h-screen flex-col bg-tfs-grey-20">
      <div className="bg-tfs-dark">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Portala git">
            <Logo variant="light" subtitle={settings.portal_title} />
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-brand border border-tfs-grey bg-white p-8 text-center">
          <span
            aria-hidden="true"
            className="mx-auto flex size-14 items-center justify-center rounded-full bg-tfs-green/20"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-7 text-tfs-dark"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 13 4.5 4.5L19 7" />
            </svg>
          </span>

          <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-tfs-red uppercase">
            Cevabınız kaydedildi
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-tfs-dark">Teşekkür ederiz</h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-light text-tfs-dark-80">
            “{survey.title}” anketine katıldığınız için teşekkürler. Görüşleriniz SEÇ-K
            değerlendirmelerinde dikkate alınacaktır.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/"
              className="rounded-brand bg-tfs-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-tfs-dark"
            >
              Portala git
            </Link>

            {canFillAgain ? (
              <Link
                href={`/anket/${token}`}
                className="rounded-brand border border-tfs-grey bg-white px-4 py-2.5 text-sm font-semibold text-tfs-dark transition-colors hover:border-tfs-dark-20"
              >
                Yeni cevap gönder
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
