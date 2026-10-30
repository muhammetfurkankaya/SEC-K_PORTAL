"use client";

import { useActionState, useState } from "react";
import {
  Alert,
  Checkbox,
  Field,
  Select,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/ui/form";
import { IDLE, type ActionState } from "@/lib/action-state";
import {
  CHOICE_TYPES,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type Question,
  type QuestionType,
  type Survey,
} from "@/lib/types";

/** Editörde tutulan soru taslağı (henüz kaydedilmemiş olabilir). */
type Draft = {
  key: string;
  type: QuestionType;
  text: string;
  help_text: string;
  is_required: boolean;
  options: string[];
};

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `q-${keyCounter}`;
}

function toDraft(question: Question): Draft {
  return {
    key: nextKey(),
    type: question.type,
    text: question.text,
    help_text: question.help_text ?? "",
    is_required: Boolean(question.is_required),
    options: question.options.length > 0 ? question.options : ["", ""],
  };
}

function emptyDraft(type: QuestionType): Draft {
  return {
    key: nextKey(),
    type,
    text: "",
    help_text: "",
    is_required: false,
    options: CHOICE_TYPES.includes(type) ? ["", ""] : [],
  };
}

type SurveyEditorProps = {
  survey?: Survey;
  questions?: Question[];
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  /** Cevap gelmişse soru listesi kilitlenir (mevcut cevapları korumak için). */
  locked?: boolean;
};

/**
 * Anket oluşturma / düzenleme editörü.
 *
 * Sorular istemcide bir dizi olarak tutulur ve kaydetmede tek bir JSON alanı
 * olarak gönderilir; sunucu tarafı listeyi bütün olarak değiştirir
 * (replaceQuestions). Bu, sıralama ve silme işlemlerini tek kaydetmede
 * toplamayı sağlar.
 */
export function SurveyEditor({ survey, questions, action, locked = false }: SurveyEditorProps) {
  const [state, formAction] = useActionState(action, IDLE);
  const [drafts, setDrafts] = useState<Draft[]>(() => (questions ?? []).map(toDraft));
  const [newType, setNewType] = useState<QuestionType>("single_choice");

  const isEdit = Boolean(survey);
  const errors = state.fieldErrors ?? {};

  function update(key: string, patch: Partial<Draft>): void {
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)),
    );
  }

  function move(index: number, delta: number): void {
    setDrafts((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      {survey ? <input type="hidden" name="id" value={survey.id} /> : null}

      {/* Soru listesi tek JSON alanı olarak gönderilir. */}
      {isEdit && !locked ? (
        <input
          type="hidden"
          name="questions"
          value={JSON.stringify(
            drafts.map(({ type, text, help_text, is_required, options }) => ({
              type,
              text,
              help_text,
              is_required,
              options,
            })),
          )}
        />
      ) : null}

      {state.message ? <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert> : null}

      {/* ————— Anket bilgileri ————— */}
      <section className="rounded-brand border border-line bg-surface p-5">
        <h2 className="mb-4 text-xs font-semibold tracking-[0.12em] text-accent-ink uppercase">
          Anket Bilgileri
        </h2>

        <div className="space-y-5">
          <Field label="Anket başlığı" htmlFor="title" required hint={errors.title}>
            <TextInput
              id="title"
              name="title"
              defaultValue={survey?.title ?? ""}
              maxLength={200}
              required
            />
          </Field>

          <Field
            label="Açıklama"
            htmlFor="description"
            hint="Anket formunun üstünde katılımcıya gösterilir."
          >
            <TextArea
              id="description"
              name="description"
              rows={3}
              defaultValue={survey?.description ?? ""}
              maxLength={1000}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Başlangıç tarihi"
              htmlFor="opens_at"
              hint="İsteğe bağlı. Boşsa hemen açılır."
            >
              <TextInput
                id="opens_at"
                name="opens_at"
                type="date"
                defaultValue={survey?.opens_at?.slice(0, 10) ?? ""}
              />
            </Field>

            <Field
              label="Bitiş tarihi"
              htmlFor="closes_at"
              hint="İsteğe bağlı. Boşsa süresiz açık kalır."
            >
              <TextInput
                id="closes_at"
                name="closes_at"
                type="date"
                defaultValue={survey?.closes_at?.slice(0, 10) ?? ""}
              />
            </Field>
          </div>

          <div className="space-y-2 border-t border-line-soft pt-4">
            <Checkbox
              name="collect_identity"
              label="İsim ve departman alanlarını sor (isteğe bağlı doldurulur)"
              defaultChecked={survey ? Boolean(survey.collect_identity) : false}
            />
            <Checkbox
              name="allow_multiple"
              label="Aynı cihazdan birden fazla kez doldurulabilsin"
              defaultChecked={survey ? Boolean(survey.allow_multiple) : true}
            />
          </div>
        </div>
      </section>

      {/* ————— Sorular ————— */}
      {isEdit ? (
        <section className="rounded-brand border border-line bg-surface p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold tracking-[0.12em] text-accent-ink uppercase">
              Sorular ({drafts.length})
            </h2>
          </div>

          {locked ? (
            <Alert kind="info">
              Bu ankete cevap geldiği için soruları değiştirilemez — mevcut cevaplar korunuyor.
              Soruları güncellemek için anketi kopyalayıp yeni sürümünü yayınlayın.
            </Alert>
          ) : null}

          {!locked ? (
            <>
              {drafts.length === 0 ? (
                <p className="rounded-brand border border-dashed border-line bg-surface-2 px-4 py-8 text-center text-sm font-light text-ink-faint">
                  Henüz soru eklenmedi. Aşağıdan soru tipi seçip ekleyin.
                </p>
              ) : (
                <ul className="space-y-3">
                  {drafts.map((draft, index) => (
                    <li key={draft.key}>
                      <QuestionCard
                        draft={draft}
                        index={index}
                        total={drafts.length}
                        onChange={(patch) => update(draft.key, patch)}
                        onMove={(delta) => move(index, delta)}
                        onRemove={() =>
                          setDrafts((current) => current.filter((d) => d.key !== draft.key))
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
                <div className="min-w-[12rem]">
                  <Field label="Yeni soru tipi" htmlFor="new-question-type">
                    <Select
                      id="new-question-type"
                      value={newType}
                      onChange={(event) => setNewType(event.target.value as QuestionType)}
                    >
                      {QUESTION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {QUESTION_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <button
                  type="button"
                  onClick={() => setDrafts((current) => [...current, emptyDraft(newType)])}
                  className="rounded-brand border border-tfs-red bg-surface px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-tfs-red hover:text-white"
                >
                  + Soru ekle
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : (
        <Alert kind="info">
          Anketi oluşturduktan sonra soru ekleme ekranına yönlendirileceksiniz.
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Kaydediliyor…">
          {isEdit ? "Anketi kaydet" : "Anketi oluştur"}
        </SubmitButton>
      </div>
    </form>
  );
}

function QuestionCard({
  draft,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  draft: Draft;
  index: number;
  total: number;
  onChange: (patch: Partial<Draft>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const isChoice = CHOICE_TYPES.includes(draft.type);

  return (
    <div className="rounded-brand border border-line bg-surface-2 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-ink">
          Soru {index + 1}
          <span className="ml-2 font-normal text-ink-faint">
            {QUESTION_TYPE_LABELS[draft.type]}
          </span>
        </span>

        <div className="flex items-center gap-1">
          <IconButton label="Yukarı taşı" disabled={index === 0} onClick={() => onMove(-1)}>
            ↑
          </IconButton>
          <IconButton label="Aşağı taşı" disabled={index === total - 1} onClick={() => onMove(1)}>
            ↓
          </IconButton>
          <IconButton label="Soruyu sil" danger onClick={onRemove}>
            ✕
          </IconButton>
        </div>
      </div>

      <div className="space-y-3">
        <Field label="Soru metni" required>
          <TextInput
            value={draft.text}
            onChange={(event) => onChange({ text: event.target.value })}
            maxLength={500}
            placeholder="Örn. Bültenleri ne kadar faydalı buluyorsunuz?"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Yardım metni" hint="İsteğe bağlı açıklama.">
            <TextInput
              value={draft.help_text}
              onChange={(event) => onChange({ help_text: event.target.value })}
              maxLength={300}
            />
          </Field>

          <Field label="Soru tipi">
            <Select
              value={draft.type}
              onChange={(event) => {
                const type = event.target.value as QuestionType;
                onChange({
                  type,
                  // Seçimli tipe geçilirken boş seçenek satırları hazırla.
                  options: CHOICE_TYPES.includes(type)
                    ? draft.options.length >= 2
                      ? draft.options
                      : ["", ""]
                    : [],
                });
              }}
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {QUESTION_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {isChoice ? (
          <div>
            <span className="block text-xs font-semibold text-ink">Seçenekler</span>
            <ul className="mt-1 space-y-2">
              {draft.options.map((option, optionIndex) => (
                <li key={optionIndex} className="flex items-center gap-2">
                  <span className="w-5 text-right text-xs text-ink-faint">{optionIndex + 1}.</span>
                  <TextInput
                    value={option}
                    onChange={(event) => {
                      const options = [...draft.options];
                      options[optionIndex] = event.target.value;
                      onChange({ options });
                    }}
                    maxLength={200}
                    placeholder={`Seçenek ${optionIndex + 1}`}
                  />
                  <IconButton
                    label="Seçeneği sil"
                    danger
                    disabled={draft.options.length <= 2}
                    onClick={() =>
                      onChange({
                        options: draft.options.filter((_, i) => i !== optionIndex),
                      })
                    }
                  >
                    ✕
                  </IconButton>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => onChange({ options: [...draft.options, ""] })}
              className="mt-2 text-xs font-semibold text-accent-ink hover:underline"
            >
              + Seçenek ekle
            </button>
          </div>
        ) : null}

        {draft.type === "rating" ? (
          <p className="text-[0.6875rem] font-light text-ink-faint">
            Katılımcı 1–5 arası puan verir. Analizde ortalama ve dağılım gösterilir.
          </p>
        ) : null}
        {draft.type === "nps" ? (
          <p className="text-[0.6875rem] font-light text-ink-faint">
            Katılımcı 0–10 arası puan verir. Analizde NPS skoru hesaplanır.
          </p>
        ) : null}

        <Checkbox
          checked={draft.is_required}
          onChange={(event) => onChange({ is_required: event.target.checked })}
          label="Bu soru zorunlu"
        />
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex size-7 items-center justify-center rounded-brand border text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "border-line bg-surface text-accent-ink hover:border-tfs-red"
          : "border-line bg-surface text-ink-soft hover:border-line-strong"
      }`}
    >
      {children}
    </button>
  );
}
