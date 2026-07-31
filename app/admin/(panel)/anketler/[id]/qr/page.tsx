import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { getSurvey } from "@/lib/db/queries/surveys";
import { surveyUrl } from "@/lib/base-url";
import { makeQr } from "@/lib/qr";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anket QR Afişi" };

type Props = { params: Promise<{ id: string }> };

/**
 * Panolara asılmak üzere yazdırılabilir QR afişi.
 *
 * Yerleşimdeki üst bant ve navigasyon `print-hidden` sınıfını taşıdığı için
 * çıktıda yalnızca afiş görünür. Renkler kılavuzun koyu zemin + kırmızı
 * vurgu kompozisyonunu izler.
 */
export default async function SurveyQrPosterPage({ params }: Props) {
  const { id } = await params;
  const survey = getSurvey(Number(id));
  if (!survey) notFound();

  const url = await surveyUrl(survey.public_token);
  const qr = await makeQr(url);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print-hidden">
        <Link
          href={`/admin/anketler/${survey.id}`}
          className="text-xs font-semibold text-tfs-red hover:underline"
        >
          ← Ankete dön
        </Link>
        <p className="text-xs font-light text-tfs-dark-60">
          Yazdırmak için Ctrl+P (veya ⌘+P) kullanın. Çıktıda yalnızca afiş görünür.
        </p>
      </div>

      {/* A4 dikey oranına yakın afiş */}
      <div className="mx-auto max-w-[46rem] border border-tfs-grey bg-white">
        <div className="bg-tfs-dark px-10 py-8">
          <Logo variant="light" />
        </div>

        <div className="px-10 py-10 text-center">
          <p className="text-xs font-semibold tracking-[0.14em] text-tfs-red uppercase">
            Görüşünüz Bizim İçin Değerli
          </p>

          <h1 className="mt-3 text-3xl leading-tight font-semibold text-tfs-dark">
            {survey.title}
          </h1>

          {survey.description ? (
            <p className="mx-auto mt-3 max-w-lg text-sm font-light text-tfs-dark-80">
              {survey.description}
            </p>
          ) : null}

          {/* eslint-disable-next-line @next/next/no-img-element -- sunucuda
              üretilen data URL. */}
          <img
            src={qr.pngDataUrl}
            alt={`${survey.title} anketinin QR kodu`}
            className="mx-auto mt-8 size-72 border border-tfs-grey"
          />

          <p className="mt-6 text-base font-semibold text-tfs-dark">
            Anketi doldurmak için QR kodu okutun
          </p>

          <p className="mt-2 font-mono text-xs break-all text-tfs-dark-60">{url}</p>

          <div className="mx-auto mt-8 w-24 border-t-2 border-tfs-red" />

          <p className="mt-4 text-xs font-light text-tfs-dark-60">
            Anket {survey.collect_identity ? "isteğe bağlı kimlik bilgisi ile" : "anonim olarak"}{" "}
            doldurulur. Şirket içi kullanım içindir.
          </p>
        </div>
      </div>
    </>
  );
}
