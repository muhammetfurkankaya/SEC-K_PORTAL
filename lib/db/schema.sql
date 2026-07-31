-- SEÇ-K Portal — SQLite şeması
-- Tüm tarih/saat alanları ISO 8601 metin olarak saklanır.
-- published_date yalnızca gün hassasiyetindedir: 'YYYY-MM-DD'.

PRAGMA foreign_keys = ON;

-- ————————————————————————————————————————————————
-- Bülten sekmeleri. Sekmeler kodda sabit değildir; admin panelinden
-- eklenip yeniden sıralanabilir (ihtiyaç halinde yeni sekme gereksinimi).
-- ————————————————————————————————————————————————
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ————————————————————————————————————————————————
-- Yayımlanan PDF bültenler. Dosyalar public/ dışında, data/uploads
-- altında tutulur; erişim /api/dosya/[id] üzerinden yapılır.
-- ————————————————————————————————————————————————
CREATE TABLE IF NOT EXISTS bulletins (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id    INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  bulletin_no    TEXT    NOT NULL,
  subject        TEXT    NOT NULL,
  description    TEXT,
  published_date TEXT    NOT NULL,
  file_name      TEXT    NOT NULL,
  file_path      TEXT    NOT NULL,
  file_size      INTEGER NOT NULL DEFAULT 0,
  is_published   INTEGER NOT NULL DEFAULT 1,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (category_id, bulletin_no)
);

CREATE INDEX IF NOT EXISTS idx_bulletins_category
  ON bulletins (category_id, is_published);
CREATE INDEX IF NOT EXISTS idx_bulletins_date
  ON bulletins (published_date DESC);

-- ————————————————————————————————————————————————
-- Anketler. public_token, QR kodun işaret ettiği /anket/<token> adresini
-- oluşturur; tahmin edilemez olması için rastgele üretilir.
-- ————————————————————————————————————————————————
CREATE TABLE IF NOT EXISTS surveys (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  public_token     TEXT    NOT NULL UNIQUE,
  title            TEXT    NOT NULL,
  description      TEXT,
  is_active        INTEGER NOT NULL DEFAULT 0,
  collect_identity INTEGER NOT NULL DEFAULT 0,
  allow_multiple   INTEGER NOT NULL DEFAULT 1,
  opens_at         TEXT,
  closes_at        TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS survey_questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id   INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  type        TEXT    NOT NULL CHECK (type IN (
                'single_choice', 'multi_choice', 'rating',
                'nps', 'text', 'number', 'yes_no'
              )),
  text        TEXT    NOT NULL,
  help_text   TEXT,
  is_required INTEGER NOT NULL DEFAULT 0,
  options_json TEXT,
  scale_min   INTEGER,
  scale_max   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_questions_survey
  ON survey_questions (survey_id, order_index);

CREATE TABLE IF NOT EXISTS survey_responses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id        INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  submitted_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  duration_seconds INTEGER,
  ip_hash          TEXT,
  respondent_name  TEXT,
  department       TEXT
);

CREATE INDEX IF NOT EXISTS idx_responses_survey
  ON survey_responses (survey_id, submitted_at);

CREATE TABLE IF NOT EXISTS survey_answers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  response_id  INTEGER NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id  INTEGER NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  option_index INTEGER,
  value_text   TEXT,
  value_number REAL
);

CREATE INDEX IF NOT EXISTS idx_answers_question ON survey_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_answers_response ON survey_answers (response_id);

-- ————————————————————————————————————————————————
-- Admin kullanıcıları. Şifreler node:crypto scrypt ile hashlenir.
-- ————————————————————————————————————————————————
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  full_name     TEXT,
  role          TEXT    NOT NULL DEFAULT 'admin',
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- Portal ayarları (QDMS adresleri, portal başlığı, duyuru bandı).
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Kim neyi ne zaman değiştirdi kaydı.
CREATE TABLE IF NOT EXISTS audit_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER,
  username  TEXT,
  action    TEXT NOT NULL,
  entity    TEXT,
  entity_id TEXT,
  detail    TEXT,
  at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log (at DESC);
