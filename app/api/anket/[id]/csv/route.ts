import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { csvNumber, toCsv } from "@/lib/csv";
import { slugify } from "@/lib/format";
import {
  getQuestions,
  getSurvey,
  listAnswersForResponses,
  listResponses,
} from "@/lib/db/queries/surveys";
import type { SurveyAnswer } from "@/lib/types";

/**
 * Anket cevaplarını CSV olarak indirir.
 *
 * Analiz ekranındaki filtreler (tarih aralığı, departman) aynı sorgu
 * parametreleriyle buraya taşınır; böylece ekranda görülen küme ile indirilen
 * dosya birebir örtüşür.
 *
 * Bu bir route handler olduğu için yerleşimdeki oturum kontrolünden
 * faydalanamaz — yetkiyi kendisi doğrular.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Yetkisiz erişim", { status: 401 });

  const { id } = await params;
  const survey = getSurvey(Number(id));
  if (!survey) return new NextResponse("Anket bulunamadı", { status: 404 });

  const url = new URL(request.url);
  const filters = {
    from: url.searchParams.get("baslangic"),
    to: url.searchParams.get("bitis"),
    department: url.searchParams.get("departman"),
  };

  const questions = getQuestions(survey.id);
  const responses = listResponses(survey.id, filters);
  const answers = listAnswersForResponses(responses.map((response) => response.id));

  // Cevapları (cevap kaydı, soru) ikilisine göre grupla.
  const grouped = new Map<string, SurveyAnswer[]>();
  for (const answer of answers) {
    const key = `${answer.response_id}:${answer.question_id}`;
    const list = grouped.get(key);
    if (list) list.push(answer);
    else grouped.set(key, [answer]);
  }

  const header = [
    "Cevap No",
    "Gönderim Tarihi",
    "Süre (sn)",
    ...(survey.collect_identity ? ["Ad Soyad", "Departman"] : []),
    ...questions.map((question) => question.text),
  ];

  const rows: unknown[][] = [header];

  for (const response of responses) {
    const row: unknown[] = [
      response.id,
      response.submitted_at,
      csvNumber(response.duration_seconds),
    ];

    if (survey.collect_identity) {
      row.push(response.respondent_name ?? "", response.department ?? "");
    }

    for (const question of questions) {
      const cells = grouped.get(`${response.id}:${question.id}`) ?? [];
      row.push(formatAnswer(question, cells));
    }

    rows.push(row);
  }

  const csv = toCsv(rows);
  const filename = `anket-${survey.id}-${slugify(survey.title) || "cevaplar"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
        filename,
      )}`,
      "Cache-Control": "no-store",
    },
  });
}

/** Bir sorunun cevabını tek hücreye çevirir. */
function formatAnswer(
  question: ReturnType<typeof getQuestions>[number],
  cells: SurveyAnswer[],
): string {
  if (cells.length === 0) return "";

  switch (question.type) {
    case "single_choice":
      return question.options[cells[0].option_index ?? -1] ?? "";

    case "multi_choice":
      // Çok seçimli cevaplar tek hücrede noktalı virgülle değil, dikey
      // çizgiyle ayrılır — CSV ayırıcısıyla karışmasın.
      return cells
        .map((cell) => question.options[cell.option_index ?? -1] ?? "")
        .filter(Boolean)
        .join(" | ");

    case "yes_no":
      return cells[0].option_index === 0 ? "Evet" : cells[0].option_index === 1 ? "Hayır" : "";

    case "rating":
    case "nps":
    case "number":
      return csvNumber(cells[0].value_number);

    case "text":
      return cells[0].value_text ?? "";

    default:
      return "";
  }
}
