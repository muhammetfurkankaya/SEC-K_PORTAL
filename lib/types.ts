/** Portal genelinde kullanılan veri tipleri. */

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: number;
  created_at: string;
};

/** Sekme listesinde gösterilen, bülten sayısı ile zenginleştirilmiş kategori. */
export type CategoryWithCount = Category & { bulletin_count: number };

export type Bulletin = {
  id: number;
  category_id: number;
  bulletin_no: string;
  subject: string;
  description: string | null;
  published_date: string;
  file_name: string;
  file_path: string;
  file_size: number;
  is_published: number;
  download_count: number;
  created_at: string;
  updated_at: string;
};

/** Liste ekranlarında kategori adıyla birlikte gösterilen bülten. */
export type BulletinWithCategory = Bulletin & {
  category_name: string;
  category_slug: string;
};

export const QUESTION_TYPES = [
  "single_choice",
  "multi_choice",
  "rating",
  "nps",
  "text",
  "number",
  "yes_no",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Soru tiplerinin admin panelinde gösterilen Türkçe adları. */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "Tek seçim",
  multi_choice: "Çok seçim",
  rating: "Puanlama (1–5)",
  nps: "Öneri skoru (0–10)",
  text: "Serbest metin",
  number: "Sayı",
  yes_no: "Evet / Hayır",
};

/** Seçenek listesi gerektiren soru tipleri. */
export const CHOICE_TYPES: QuestionType[] = ["single_choice", "multi_choice"];

export type SurveyQuestion = {
  id: number;
  survey_id: number;
  order_index: number;
  type: QuestionType;
  text: string;
  help_text: string | null;
  is_required: number;
  options_json: string | null;
  scale_min: number | null;
  scale_max: number | null;
};

/** options_json çözümlenmiş hali ile soru. */
export type Question = Omit<SurveyQuestion, "options_json"> & {
  options: string[];
};

export type Survey = {
  id: number;
  public_token: string;
  title: string;
  description: string | null;
  is_active: number;
  collect_identity: number;
  allow_multiple: number;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SurveyWithStats = Survey & {
  question_count: number;
  response_count: number;
  last_response_at: string | null;
};

export type SurveyResponse = {
  id: number;
  survey_id: number;
  submitted_at: string;
  duration_seconds: number | null;
  ip_hash: string | null;
  respondent_name: string | null;
  department: string | null;
};

export type SurveyAnswer = {
  id: number;
  response_id: number;
  question_id: number;
  option_index: number | null;
  value_text: string | null;
  value_number: number | null;
};

export type AdminUser = {
  id: number;
  username: string;
  password_hash: string;
  full_name: string | null;
  role: string;
  is_active: number;
  created_at: string;
  last_login_at: string | null;
};

/** Oturum cookie'sinde taşınan asgari kullanıcı bilgisi. */
export type SessionUser = {
  id: number;
  username: string;
  role: string;
};
