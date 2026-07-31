import { getDb } from "@/lib/db";
import type {
  Question,
  Survey,
  SurveyAnswer,
  SurveyQuestion,
  SurveyResponse,
  SurveyWithStats,
} from "@/lib/types";

/** options_json alanını diziye çözer. */
function hydrate(row: SurveyQuestion): Question {
  const { options_json, ...rest } = row;
  let options: string[] = [];
  if (options_json) {
    try {
      const parsed = JSON.parse(options_json);
      if (Array.isArray(parsed)) options = parsed.filter((o): o is string => typeof o === "string");
    } catch {
      options = [];
    }
  }
  return { ...rest, options };
}

const SURVEY_STATS = `
  SELECT s.*,
         (SELECT COUNT(*) FROM survey_questions q WHERE q.survey_id = s.id) AS question_count,
         (SELECT COUNT(*) FROM survey_responses r WHERE r.survey_id = s.id) AS response_count,
         (SELECT MAX(submitted_at) FROM survey_responses r WHERE r.survey_id = s.id) AS last_response_at
    FROM surveys s
`;

export function listSurveys(): SurveyWithStats[] {
  return getDb()
    .prepare(`${SURVEY_STATS} ORDER BY s.created_at DESC`)
    .all() as SurveyWithStats[];
}

/** Ana sayfada gösterilecek, şu an doldurulabilir anketler. */
export function listOpenSurveys(): SurveyWithStats[] {
  return getDb()
    .prepare(
      `${SURVEY_STATS}
        WHERE s.is_active = 1
          AND (s.opens_at IS NULL OR s.opens_at <= datetime('now'))
          AND (s.closes_at IS NULL OR s.closes_at >= datetime('now'))
        ORDER BY s.created_at DESC`,
    )
    .all() as SurveyWithStats[];
}

export function getSurvey(id: number): SurveyWithStats | undefined {
  return getDb().prepare(`${SURVEY_STATS} WHERE s.id = ?`).get(id) as
    | SurveyWithStats
    | undefined;
}

export function getSurveyByToken(token: string): Survey | undefined {
  return getDb().prepare(`SELECT * FROM surveys WHERE public_token = ?`).get(token) as
    | Survey
    | undefined;
}

export function getQuestions(surveyId: number): Question[] {
  const rows = getDb()
    .prepare(`SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY order_index, id`)
    .all(surveyId) as SurveyQuestion[];
  return rows.map(hydrate);
}

export function createSurvey(input: {
  public_token: string;
  title: string;
  description?: string | null;
  collect_identity: boolean;
  allow_multiple: boolean;
  opens_at?: string | null;
  closes_at?: string | null;
}): number {
  const result = getDb()
    .prepare(
      `INSERT INTO surveys
         (public_token, title, description, collect_identity, allow_multiple, opens_at, closes_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.public_token,
      input.title,
      input.description ?? null,
      input.collect_identity ? 1 : 0,
      input.allow_multiple ? 1 : 0,
      input.opens_at || null,
      input.closes_at || null,
    );
  return Number(result.lastInsertRowid);
}

export function updateSurveyMeta(
  id: number,
  input: {
    title: string;
    description?: string | null;
    collect_identity: boolean;
    allow_multiple: boolean;
    opens_at?: string | null;
    closes_at?: string | null;
  },
): void {
  getDb()
    .prepare(
      `UPDATE surveys
          SET title = ?, description = ?, collect_identity = ?, allow_multiple = ?,
              opens_at = ?, closes_at = ?, updated_at = datetime('now')
        WHERE id = ?`,
    )
    .run(
      input.title,
      input.description ?? null,
      input.collect_identity ? 1 : 0,
      input.allow_multiple ? 1 : 0,
      input.opens_at || null,
      input.closes_at || null,
      id,
    );
}

export function setSurveyActive(id: number, active: boolean): void {
  getDb()
    .prepare(`UPDATE surveys SET is_active = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(active ? 1 : 0, id);
}

export function deleteSurvey(id: number): void {
  // Sorular ve cevaplar ON DELETE CASCADE ile birlikte silinir.
  getDb().prepare(`DELETE FROM surveys WHERE id = ?`).run(id);
}

export type QuestionInput = {
  type: Question["type"];
  text: string;
  help_text?: string | null;
  is_required: boolean;
  options: string[];
  scale_min?: number | null;
  scale_max?: number | null;
};

/**
 * Anketin sorularını tümüyle yeniden yazar.
 *
 * Soru editörü sıralama ve silme işlemlerini birlikte gönderdiği için
 * tek tek fark hesaplamak yerine hepsini değiştiriyoruz. Cevap alınmış bir
 * anketin soruları değiştirilirse eski cevaplar CASCADE ile silineceğinden
 * çağıran taraf bunu engellemekle yükümlü (bkz. hasResponses).
 */
export function replaceQuestions(surveyId: number, questions: QuestionInput[]): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare(`DELETE FROM survey_questions WHERE survey_id = ?`).run(surveyId);
    const stmt = db.prepare(
      `INSERT INTO survey_questions
         (survey_id, order_index, type, text, help_text, is_required, options_json, scale_min, scale_max)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    questions.forEach((q, index) => {
      stmt.run(
        surveyId,
        index,
        q.type,
        q.text,
        q.help_text ?? null,
        q.is_required ? 1 : 0,
        q.options.length ? JSON.stringify(q.options) : null,
        q.scale_min ?? null,
        q.scale_max ?? null,
      );
    });
    db.prepare(`UPDATE surveys SET updated_at = datetime('now') WHERE id = ?`).run(surveyId);
  })();
}

export function hasResponses(surveyId: number): boolean {
  const row = getDb()
    .prepare(`SELECT 1 AS x FROM survey_responses WHERE survey_id = ? LIMIT 1`)
    .get(surveyId);
  return Boolean(row);
}

/** Bir anket cevabını, tüm soru cevapları ile birlikte tek işlemde kaydeder. */
export function saveResponse(input: {
  survey_id: number;
  duration_seconds?: number | null;
  ip_hash?: string | null;
  respondent_name?: string | null;
  department?: string | null;
  answers: {
    question_id: number;
    option_index?: number | null;
    value_text?: string | null;
    value_number?: number | null;
  }[];
}): number {
  const db = getDb();
  return db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO survey_responses
           (survey_id, duration_seconds, ip_hash, respondent_name, department)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        input.survey_id,
        input.duration_seconds ?? null,
        input.ip_hash ?? null,
        input.respondent_name ?? null,
        input.department ?? null,
      );

    const responseId = Number(result.lastInsertRowid);
    const stmt = db.prepare(
      `INSERT INTO survey_answers (response_id, question_id, option_index, value_text, value_number)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const answer of input.answers) {
      stmt.run(
        responseId,
        answer.question_id,
        answer.option_index ?? null,
        answer.value_text ?? null,
        answer.value_number ?? null,
      );
    }
    return responseId;
  })();
}

/**
 * Aynı cihazdan tekrar doldurmayı sınırlamak için son 12 saatteki
 * cevaplarda aynı IP karmasını arar.
 */
export function hasRecentResponseFrom(surveyId: number, ipHash: string): boolean {
  const row = getDb()
    .prepare(
      `SELECT 1 AS x FROM survey_responses
        WHERE survey_id = ? AND ip_hash = ?
          AND submitted_at >= datetime('now', '-12 hours')
        LIMIT 1`,
    )
    .get(surveyId, ipHash);
  return Boolean(row);
}

/** Analiz ekranı için: isteğe bağlı tarih/departman filtresiyle cevaplar. */
export function listResponses(
  surveyId: number,
  filters: { from?: string | null; to?: string | null; department?: string | null } = {},
): SurveyResponse[] {
  const clauses = ["survey_id = ?"];
  const params: unknown[] = [surveyId];

  if (filters.from) {
    clauses.push("date(submitted_at) >= date(?)");
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push("date(submitted_at) <= date(?)");
    params.push(filters.to);
  }
  if (filters.department) {
    clauses.push("department = ?");
    params.push(filters.department);
  }

  return getDb()
    .prepare(
      `SELECT * FROM survey_responses
        WHERE ${clauses.join(" AND ")}
        ORDER BY submitted_at ASC, id ASC`,
    )
    .all(...params) as SurveyResponse[];
}

/** Verilen cevap kayıtlarına ait tüm soru cevapları. */
export function listAnswersForResponses(responseIds: number[]): SurveyAnswer[] {
  if (responseIds.length === 0) return [];
  const placeholders = responseIds.map(() => "?").join(",");
  return getDb()
    .prepare(`SELECT * FROM survey_answers WHERE response_id IN (${placeholders})`)
    .all(...responseIds) as SurveyAnswer[];
}

/** Departman filtresi için mevcut değerler. */
export function listDepartments(surveyId: number): string[] {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT department FROM survey_responses
        WHERE survey_id = ? AND department IS NOT NULL AND TRIM(department) <> ''
        ORDER BY department COLLATE NOCASE`,
    )
    .all(surveyId) as { department: string }[];
  return rows.map((r) => r.department);
}

export function countSurveys(): { total: number; active: number; responses: number } {
  return getDb()
    .prepare(
      `SELECT (SELECT COUNT(*) FROM surveys) AS total,
              (SELECT COALESCE(SUM(is_active), 0) FROM surveys) AS active,
              (SELECT COUNT(*) FROM survey_responses) AS responses`,
    )
    .get() as { total: number; active: number; responses: number };
}
