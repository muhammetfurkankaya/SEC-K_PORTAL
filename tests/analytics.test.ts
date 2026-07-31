import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { analyzeSurvey, computeNps, formatDuration, topWords } from "../lib/analytics";
import type { Question, SurveyAnswer, SurveyResponse } from "../lib/types";

/** Test için soru nesnesi üretir. */
function question(overrides: Partial<Question> & Pick<Question, "id" | "type">): Question {
  return {
    survey_id: 1,
    order_index: 0,
    text: "Soru",
    help_text: null,
    is_required: 0,
    options: [],
    scale_min: null,
    scale_max: null,
    ...overrides,
  };
}

function response(id: number, overrides: Partial<SurveyResponse> = {}): SurveyResponse {
  return {
    id,
    survey_id: 1,
    submitted_at: "2026-07-01 10:00:00",
    duration_seconds: null,
    ip_hash: null,
    respondent_name: null,
    department: null,
    ...overrides,
  };
}

function answer(
  responseId: number,
  questionId: number,
  overrides: Partial<SurveyAnswer> = {},
): SurveyAnswer {
  return {
    id: Math.random(),
    response_id: responseId,
    question_id: questionId,
    option_index: null,
    value_text: null,
    value_number: null,
    ...overrides,
  };
}

describe("computeNps", () => {
  test("destekleyici, nötr ve köstekleyicileri doğru ayırır", () => {
    // 9–10 destekleyici, 7–8 nötr, 0–6 köstekleyici
    const result = computeNps([10, 9, 8, 7, 6, 0]);
    assert.equal(result.promoters, 2);
    assert.equal(result.passives, 2);
    assert.equal(result.detractors, 2);
    // (2 - 2) / 6 * 100 = 0
    assert.equal(result.score, 0);
  });

  test("tamamı destekleyici ise +100 verir", () => {
    assert.equal(computeNps([9, 10, 10]).score, 100);
  });

  test("tamamı köstekleyici ise -100 verir", () => {
    assert.equal(computeNps([0, 3, 6]).score, -100);
  });

  test("cevap yoksa sıfır döner", () => {
    assert.deepEqual(computeNps([]), {
      score: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
    });
  });

  test("sınır değerleri doğru sınıflar", () => {
    assert.equal(computeNps([6]).detractors, 1);
    assert.equal(computeNps([7]).passives, 1);
    assert.equal(computeNps([9]).promoters, 1);
  });
});

describe("topWords", () => {
  test("Türkçe bağlaç ve edatları ayıklar", () => {
    const words = topWords(["bülten ve bülten için bülten", "eğitim ve eğitim"]);
    const found = words.map((w) => w.word);
    assert.ok(!found.includes("ve"), '"ve" ayıklanmalı');
    assert.ok(!found.includes("için"), '"için" ayıklanmalı');
    assert.equal(words[0].word, "bülten");
    assert.equal(words[0].count, 3);
  });

  test("büyük/küçük harf ve Türkçe karakter farkını birleştirir", () => {
    const words = topWords(["Yakıt yakıt YAKIT"]);
    assert.equal(words.length, 1);
    assert.equal(words[0].count, 3);
  });

  test("üç harften kısa kelimeleri atar", () => {
    const words = topWords(["ab cd efg"]);
    assert.deepEqual(
      words.map((w) => w.word),
      ["efg"],
    );
  });

  test("limiti aşmaz", () => {
    const text = Array.from({ length: 30 }, (_, i) => `kelime${i}`).join(" ");
    assert.equal(topWords([text], 5).length, 5);
  });
});

describe("analyzeSurvey", () => {
  test("tek seçimli soruda adet ve yüzdeleri hesaplar", () => {
    const q = question({ id: 1, type: "single_choice", options: ["Evet", "Belki", "Hayır"] });
    const responses = [response(1), response(2), response(3), response(4)];
    const answers = [
      answer(1, 1, { option_index: 0 }),
      answer(2, 1, { option_index: 0 }),
      answer(3, 1, { option_index: 2 }),
      // 4. katılımcı bu soruyu boş bıraktı.
    ];

    const result = analyzeSurvey([q], responses, answers);
    const analysis = result.questions[0];

    assert.equal(analysis.answeredCount, 3);
    assert.equal(analysis.skippedCount, 1);
    assert.equal(analysis.options?.[0].count, 2);
    assert.ok(Math.abs((analysis.options?.[0].percent ?? 0) - 66.667) < 0.01);
    assert.equal(analysis.options?.[1].count, 0);
    assert.equal(analysis.options?.[2].count, 1);
  });

  test("çok seçimli soruda yüzde katılımcı sayısına göre hesaplanır", () => {
    const q = question({ id: 1, type: "multi_choice", options: ["A", "B", "C"] });
    const responses = [response(1), response(2)];
    // 1. katılımcı A ve B, 2. katılımcı sadece A seçti.
    const answers = [
      answer(1, 1, { option_index: 0 }),
      answer(1, 1, { option_index: 1 }),
      answer(2, 1, { option_index: 0 }),
    ];

    const analysis = analyzeSurvey([q], responses, answers).questions[0];

    // Cevaplayan iki kişi — üç satır olmasına rağmen.
    assert.equal(analysis.answeredCount, 2);
    assert.equal(analysis.options?.[0].percent, 100);
    assert.equal(analysis.options?.[1].percent, 50);
    // Yüzdeler toplamı 100'ü aşabilir; bu beklenen davranış.
    const total = (analysis.options ?? []).reduce((sum, o) => sum + o.percent, 0);
    assert.ok(total > 100);
  });

  test("puanlama sorusunda ortalama, ortanca ve sapma hesaplar", () => {
    const q = question({ id: 1, type: "rating", scale_min: 1, scale_max: 5 });
    const values = [5, 4, 4, 3, 4];
    const responses = values.map((_, i) => response(i + 1));
    const answers = values.map((value, i) => answer(i + 1, 1, { value_number: value }));

    const analysis = analyzeSurvey([q], responses, answers).questions[0];

    assert.equal(analysis.numeric?.count, 5);
    assert.equal(analysis.numeric?.mean, 4);
    assert.equal(analysis.numeric?.median, 4);
    assert.equal(analysis.numeric?.min, 3);
    assert.equal(analysis.numeric?.max, 5);
    // Örneklem std sapması: sqrt(2/4) = 0.7071…
    assert.ok(Math.abs((analysis.numeric?.stdDev ?? 0) - 0.7071) < 0.001);

    // Dağılım 1–5 arası tüm değerleri içermeli (sıfır olanlar dahil).
    assert.equal(analysis.distribution?.length, 5);
    assert.equal(analysis.distribution?.[0].count, 0); // 1 puan
    assert.equal(analysis.distribution?.[3].count, 3); // 4 puan
  });

  test("NPS sorusunda skor üretir ve dağılım 0–10 arasıdır", () => {
    const q = question({ id: 1, type: "nps", scale_min: 0, scale_max: 10 });
    const values = [10, 9, 8, 5];
    const responses = values.map((_, i) => response(i + 1));
    const answers = values.map((value, i) => answer(i + 1, 1, { value_number: value }));

    const analysis = analyzeSurvey([q], responses, answers).questions[0];

    assert.equal(analysis.distribution?.length, 11);
    assert.equal(analysis.nps?.promoters, 2);
    assert.equal(analysis.nps?.detractors, 1);
    // (2 - 1) / 4 * 100 = 25
    assert.equal(analysis.nps?.score, 25);
  });

  test("evet/hayır sorusunda etiketleri kendisi üretir", () => {
    const q = question({ id: 1, type: "yes_no" });
    const responses = [response(1), response(2)];
    const answers = [answer(1, 1, { option_index: 0 }), answer(2, 1, { option_index: 1 })];

    const analysis = analyzeSurvey([q], responses, answers).questions[0];

    assert.deepEqual(
      analysis.options?.map((o) => o.label),
      ["Evet", "Hayır"],
    );
    assert.equal(analysis.options?.[0].count, 1);
  });

  test("serbest metin cevaplarını departmanla birlikte listeler", () => {
    const q = question({ id: 1, type: "text" });
    const responses = [response(1, { department: "Bakım" }), response(2)];
    const answers = [
      answer(1, 1, { value_text: "Bültenler faydalı" }),
      // Boş metin listeye girmemeli.
      answer(2, 1, { value_text: "   " }),
    ];

    const analysis = analyzeSurvey([q], responses, answers).questions[0];

    assert.equal(analysis.texts?.length, 1);
    assert.equal(analysis.texts?.[0].department, "Bakım");
  });

  test("genel özet: tamamlanma oranı ve departman kırılımı", () => {
    const questions = [
      question({ id: 1, type: "yes_no" }),
      question({ id: 2, type: "text" }),
    ];
    const responses = [
      response(1, { department: "Bakım", duration_seconds: 100 }),
      response(2, { department: "Bakım", duration_seconds: 200 }),
      response(3, { department: "Apron" }),
    ];
    // 1. kişi iki soruyu, 2. ve 3. kişi birer soruyu yanıtladı → 4/6.
    const answers = [
      answer(1, 1, { option_index: 0 }),
      answer(1, 2, { value_text: "yorum" }),
      answer(2, 1, { option_index: 1 }),
      answer(3, 1, { option_index: 0 }),
    ];

    const result = analyzeSurvey(questions, responses, answers);

    assert.equal(result.responseCount, 3);
    assert.ok(Math.abs(result.averageCompletionPercent - 66.667) < 0.01);
    assert.equal(result.averageDurationSeconds, 150);
    assert.deepEqual(
      result.departments.map((d) => [d.label, d.count]),
      [
        ["Bakım", 2],
        ["Apron", 1],
      ],
    );
  });

  test("cevap yokken çökmez", () => {
    const result = analyzeSurvey([question({ id: 1, type: "rating" })], [], []);
    assert.equal(result.responseCount, 0);
    assert.equal(result.averageCompletionPercent, 0);
    assert.equal(result.averageDurationSeconds, null);
    assert.equal(result.questions[0].answeredCount, 0);
  });
});

describe("formatDuration", () => {
  test("saniye, dakika ve karma süreleri yazar", () => {
    assert.equal(formatDuration(45), "45 sn");
    assert.equal(formatDuration(120), "2 dk");
    assert.equal(formatDuration(135), "2 dk 15 sn");
    assert.equal(formatDuration(null), "—");
  });
});
