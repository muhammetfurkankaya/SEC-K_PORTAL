/**
 * Test/demo verisi üretir: örnek bültenler, bir anket ve rastgele cevaplar.
 *
 * Kullanım:  npm run demo
 *
 * Bu script yalnızca localde deneme yapmak içindir; sunucuda çalıştırılmamalıdır.
 * `npm run demo -- --temizle` demo verisini geri alır.
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../lib/db";
import { UPLOADS_DIR } from "../lib/paths";
import { generateToken, generateFileId } from "../lib/token";
import { makeSimplePdf } from "./lib/make-pdf";
import { createBulletin, bulletinNoExists } from "../lib/db/queries/bulletins";
import { getCategoryBySlug } from "../lib/db/queries/categories";
import { createSurvey, replaceQuestions, saveResponse, setSurveyActive } from "../lib/db/queries/surveys";
import type { QuestionInput } from "../lib/db/queries/surveys";

const DEMO_MARK = "[DEMO]";

const BULLETINS = [
  { slug: "sec-k", no: "SEC-K-2026-01", subject: "Yakıt İkmali Sırasında Statik Elektrik Riskleri", date: "2026-01-15" },
  { slug: "sec-k", no: "SEC-K-2026-02", subject: "Kişisel Koruyucu Donanım Kullanım Kuralları", date: "2026-02-10" },
  { slug: "sec-k", no: "SEC-K-2026-03", subject: "Apronda Araç Trafiği ve Hız Sınırları", date: "2026-03-05" },
  { slug: "sec-k", no: "SEC-K-2026-10", subject: "Sıcak Havalarda Çalışan Sağlığı", date: "2026-06-20" },
  { slug: "sec-k", no: "SEC-K-2026-11", subject: "Atık Yönetimi ve Çevresel Döküntü Müdahalesi", date: "2026-07-01" },
  { slug: "sms", no: "SMS-2026-04", subject: "Ramak Kala Bildirimlerinin Değerlendirilmesi", date: "2026-04-12" },
  { slug: "sms", no: "SMS-2026-05", subject: "Emniyet Kültürü Anketi Sonuçları", date: "2026-05-18" },
  { slug: "sms", no: "SMS-2026-06", subject: "Risk Değerlendirme Metodolojisi Güncellemesi", date: "2026-06-30" },
  { slug: "iga", no: "IGA-2026-07", subject: "Havalimanı Apron Güvenlik Talimatı Revizyonu", date: "2026-05-22" },
  { slug: "iga", no: "IGA-2026-08", subject: "Kış Operasyonları Buz Çözme Prosedürü", date: "2026-06-11" },
  { slug: "thy", no: "THY-2026-09", subject: "Yakıt Kalite Kontrol Standartları", date: "2026-07-08" },
  { slug: "thy", no: "THY-2026-12", subject: "Uçak Altı Operasyon Emniyet Bültenidir", date: "2026-07-25" },
];

const QUESTIONS: QuestionInput[] = [
  {
    type: "single_choice",
    text: "Hangi birimde çalışıyorsunuz?",
    is_required: true,
    options: ["Apron Operasyon", "Depo ve Tank Sahası", "Bakım", "Kalite / SEÇ-K", "İdari Birimler"],
  },
  {
    type: "rating",
    text: "SEÇ-K bültenlerini ne kadar faydalı buluyorsunuz?",
    help_text: "1 = Hiç faydalı değil, 5 = Çok faydalı",
    is_required: true,
    options: [],
    scale_min: 1,
    scale_max: 5,
  },
  {
    type: "nps",
    text: "SEÇ-K Portalını bir iş arkadaşınıza önerme olasılığınız nedir?",
    is_required: true,
    options: [],
    scale_min: 0,
    scale_max: 10,
  },
  {
    type: "multi_choice",
    text: "Hangi konularda daha fazla bülten görmek istersiniz?",
    is_required: false,
    options: ["Yakıt İkmali Emniyeti", "Yangın ve Acil Durum", "Çevre Yönetimi", "İş Sağlığı", "Araç ve Ekipman"],
  },
  {
    type: "yes_no",
    text: "Son bir ay içinde en az bir bülten okudunuz mu?",
    is_required: true,
    options: [],
  },
  {
    type: "number",
    text: "Bu yıl kaç adet öneri bildirimi yaptınız?",
    is_required: false,
    options: [],
  },
  {
    type: "text",
    text: "Portal ve bültenler hakkında eklemek istediğiniz görüşünüz var mı?",
    is_required: false,
    options: [],
  },
];

const DEPARTMENTS = ["Apron Operasyon", "Depo ve Tank Sahası", "Bakım", "Kalite / SEÇ-K", "İdari Birimler"];

const COMMENTS = [
  "Bültenler çok faydalı, görsellerin daha fazla olması iyi olur.",
  "Mobil telefondan okumak kolay oldu, teşekkürler.",
  "Bülten indeksinden arama yapmak işimi çok kolaylaştırdı.",
  "Vardiya başında toplu okuma yapmak için basılı kopya da istiyoruz.",
  "QDMS bağlantısının ana sayfada olması pratik olmuş.",
  "Daha kısa ve maddeler halinde bültenler tercih ederim.",
  "Yeni personel için özet bir eğitim bülteni hazırlanabilir.",
];

/** Diziden rastgele bir öğe seçer. */
function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** min–max arası rastgele tamsayı (dahil). */
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Ağırlıklı seçim: puanlama sorularında gerçekçi (yüksek puanlara kayan)
 * bir dağılım üretir, böylece analiz ekranı anlamlı görünür.
 */
function weighted(values: number[], weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < values.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return values[i];
  }
  return values[values.length - 1];
}

function seedBulletins(): number {
  let created = 0;

  for (const item of BULLETINS) {
    const category = getCategoryBySlug(item.slug);
    if (!category) {
      console.log(`  ! "${item.slug}" sekmesi bulunamadı, atlandı`);
      continue;
    }
    if (bulletinNoExists(category.id, item.no)) continue;

    const pdf = makeSimplePdf(item.no, [
      item.subject,
      "",
      `Yayim tarihi: ${item.date}`,
      `Bolum: ${category.name}`,
      "",
      "Bu dosya SEC-K Portali test verisidir. Gercek bulten icerigi",
      "yonetim panelinden PDF olarak yuklenir.",
      "",
      "1. Amac ve Kapsam",
      "2. Sorumluluklar",
      "3. Uygulama Esaslari",
      "4. Kayit ve Raporlama",
    ]);

    const relative = path.join(category.slug, `${generateFileId()}.pdf`);
    const absolute = path.join(UPLOADS_DIR, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, pdf);

    createBulletin({
      category_id: category.id,
      bulletin_no: item.no,
      subject: item.subject,
      description: `${DEMO_MARK} Örnek bülten kaydı.`,
      published_date: item.date,
      file_name: `${item.no}.pdf`,
      file_path: relative,
      file_size: pdf.length,
      is_published: true,
    });
    created += 1;
  }

  return created;
}

function seedSurvey(): void {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM surveys WHERE description LIKE ? LIMIT 1`)
    .get(`${DEMO_MARK}%`) as { id: number } | undefined;

  if (existing) {
    console.log("  · demo anketi zaten mevcut, yeniden oluşturulmadı");
    return;
  }

  const surveyId = createSurvey({
    public_token: generateToken(),
    title: "SEÇ-K Bültenleri Değerlendirme Anketi",
    description: `${DEMO_MARK} Bültenlerin faydası ve portal deneyimi hakkında görüşleriniz.`,
    collect_identity: true,
    allow_multiple: true,
  });

  replaceQuestions(surveyId, QUESTIONS);
  setSurveyActive(surveyId, true);

  const questions = db
    .prepare(`SELECT id, type FROM survey_questions WHERE survey_id = ? ORDER BY order_index`)
    .all(surveyId) as { id: number; type: string }[];

  const RESPONSE_COUNT = 48;
  for (let i = 0; i < RESPONSE_COUNT; i += 1) {
    const department = pick(DEPARTMENTS);
    const answers: Parameters<typeof saveResponse>[0]["answers"] = [];

    for (const question of questions) {
      switch (question.type) {
        case "single_choice":
          answers.push({
            question_id: question.id,
            option_index: DEPARTMENTS.indexOf(department),
          });
          break;

        case "multi_choice": {
          // Her katılımcı 1–3 konu seçsin.
          const indexes = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5).slice(0, randInt(1, 3));
          for (const index of indexes) {
            answers.push({ question_id: question.id, option_index: index });
          }
          break;
        }

        case "rating":
          answers.push({
            question_id: question.id,
            value_number: weighted([1, 2, 3, 4, 5], [2, 4, 14, 30, 22]),
          });
          break;

        case "nps":
          answers.push({
            question_id: question.id,
            value_number: weighted(
              [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              [1, 1, 1, 2, 2, 4, 5, 10, 14, 12, 10],
            ),
          });
          break;

        case "yes_no":
          answers.push({ question_id: question.id, option_index: Math.random() < 0.78 ? 0 : 1 });
          break;

        case "number":
          answers.push({ question_id: question.id, value_number: randInt(0, 6) });
          break;

        case "text":
          // Serbest metni herkes doldurmaz.
          if (Math.random() < 0.45) {
            answers.push({ question_id: question.id, value_text: pick(COMMENTS) });
          }
          break;
      }
    }

    const responseId = saveResponse({
      survey_id: surveyId,
      duration_seconds: randInt(45, 260),
      department,
      respondent_name: Math.random() < 0.6 ? `Katılımcı ${i + 1}` : null,
      answers,
    });

    // Cevapları son 30 güne yay — tarih filtresini test edebilmek için.
    db.prepare(`UPDATE survey_responses SET submitted_at = datetime('now', ?) WHERE id = ?`).run(
      `-${randInt(0, 29)} days`,
      responseId,
    );
  }

  console.log(`  + demo anketi ve ${RESPONSE_COUNT} cevap oluşturuldu`);
}

function clean(): void {
  const db = getDb();

  const bulletins = db
    .prepare(`SELECT id, file_path FROM bulletins WHERE description LIKE ?`)
    .all(`${DEMO_MARK}%`) as { id: number; file_path: string }[];

  for (const bulletin of bulletins) {
    try {
      fs.unlinkSync(path.join(UPLOADS_DIR, bulletin.file_path));
    } catch {
      // Dosya zaten silinmiş olabilir.
    }
  }
  db.prepare(`DELETE FROM bulletins WHERE description LIKE ?`).run(`${DEMO_MARK}%`);
  db.prepare(`DELETE FROM surveys WHERE description LIKE ?`).run(`${DEMO_MARK}%`);

  console.log(`Demo verisi silindi (${bulletins.length} bülten, demo anketleri).`);
}

function main(): void {
  getDb();

  if (process.argv.includes("--temizle")) {
    clean();
    return;
  }

  console.log("SEÇ-K Portal — demo verisi");
  console.log("");

  console.log("Bültenler:");
  const created = seedBulletins();
  console.log(created > 0 ? `  + ${created} örnek bülten eklendi` : "  · örnek bültenler zaten mevcut");

  console.log("Anket:");
  seedSurvey();

  console.log("");
  console.log("Demo verisi hazır. Geri almak için aynı komutu --temizle ile çalıştırın.");
}

main();
