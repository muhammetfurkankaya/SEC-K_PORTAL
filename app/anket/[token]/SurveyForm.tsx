"use client";

import { useActionState } from "react";
import { submitSurveyAction } from "./actions";
import { Alert, Field, SubmitButton, TextArea, TextInput } from "@/components/ui/form";
import { IDLE } from "@/lib/action-state";
import type { Question, Survey } from "@/lib/types";

/**
 * QR ile açılan anket formu.
 *
 * Mobil öncelikli tasarlanmıştır: seçenekler parmakla rahat basılacak
 * büyüklükte, puanlama ölçekleri tek satırda sığacak biçimde.
 */
export function SurveyForm({
  survey,
  questions,
  startedAt,
}: {
  survey: Survey;
  questions: Question[];
  startedAt: number;
}) {
  const [state, action] = useActionState(submitSurveyAction, IDLE);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="token" value={survey.public_token} />
      <input type="hidden" name="started_at" value={startedAt} />

      {state.message ? <Alert kind="error">{state.message}</Alert> : null}

      {survey.collect_identity ? (
        <fieldset className="rounded-brand border border-tfs-grey bg-white p-4">
          <legend className="px-1 text-xs font-semibold tracking-[0.1em] text-tfs-red uppercase">
            Kimlik Bilgileri (isteğe bağlı)
          </legend>

          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Field label="Ad Soyad" htmlFor="respondent_name">
              <TextInput id="respondent_name" name="respondent_name" maxLength={120} />
            </Field>
            <Field label="Departman" htmlFor="department">
              <TextInput id="department" name="department" maxLength={120} />
            </Field>
          </div>

          <p className="mt-2 text-[0.6875rem] font-light text-tfs-dark-60">
            Bu alanları doldurmak zorunlu değildir; boş bırakırsanız cevabınız anonim kalır.
          </p>
        </fieldset>
      ) : null}

      <ol className="space-y-4">
        {questions.map((question, index) => (
          <li key={question.id} className="rounded-brand border border-tfs-grey bg-white p-4">
            <QuestionField question={question} index={index} />
          </li>
        ))}
      </ol>

      <div className="rounded-brand border border-tfs-grey bg-tfs-grey-20 p-4">
        <SubmitButton className="w-full !py-3" pendingLabel="Gönderiliyor…">
          Anketi gönder
        </SubmitButton>
        <p className="mt-2 text-center text-[0.6875rem] font-light text-tfs-dark-60">
          Cevaplarınız SEÇ-K değerlendirmelerinde toplu olarak kullanılır.
        </p>
      </div>
    </form>
  );
}

function QuestionField({ question, index }: { question: Question; index: number }) {
  const name = `q_${question.id}`;

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-tfs-dark">
        <span className="mr-1.5 text-tfs-red">{index + 1}.</span>
        {question.text}
        {question.is_required ? (
          <span className="ml-1 text-tfs-red" title="Zorunlu">
            *
          </span>
        ) : null}
      </legend>

      {question.help_text ? (
        <p className="mt-1 text-xs font-light text-tfs-dark-60">{question.help_text}</p>
      ) : null}

      <div className="mt-3">
        {question.type === "single_choice" ? (
          <ChoiceList name={name} options={question.options} multiple={false} />
        ) : null}

        {question.type === "multi_choice" ? (
          <ChoiceList
            name={name}
            options={question.options}
            multiple
            questionId={question.id}
          />
        ) : null}

        {question.type === "yes_no" ? (
          <ChoiceList name={name} options={["Evet", "Hayır"]} multiple={false} />
        ) : null}

        {question.type === "rating" ? (
          <ScaleInput
            name={name}
            min={question.scale_min ?? 1}
            max={question.scale_max ?? 5}
            minLabel="Hiç faydalı değil"
            maxLabel="Çok faydalı"
          />
        ) : null}

        {question.type === "nps" ? (
          <ScaleInput
            name={name}
            min={question.scale_min ?? 0}
            max={question.scale_max ?? 10}
            minLabel="Hiç önermem"
            maxLabel="Kesinlikle öneririm"
          />
        ) : null}

        {question.type === "number" ? (
          <TextInput
            name={name}
            type="number"
            step="any"
            inputMode="decimal"
            required={Boolean(question.is_required)}
            className="max-w-[10rem]"
          />
        ) : null}

        {question.type === "text" ? (
          <TextArea
            name={name}
            rows={3}
            maxLength={4000}
            required={Boolean(question.is_required)}
            placeholder="Görüşünüzü yazabilirsiniz…"
          />
        ) : null}
      </div>
    </fieldset>
  );
}

function ChoiceList({
  name,
  options,
  multiple,
  questionId,
}: {
  name: string;
  options: string[];
  multiple: boolean;
  questionId?: number;
}) {
  return (
    <ul className="space-y-2">
      {options.map((option, index) => (
        <li key={index}>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-brand border border-tfs-grey px-3 py-2.5 transition-colors hover:border-tfs-dark-20 has-checked:border-tfs-red has-checked:bg-tfs-red-10">
            <input
              type={multiple ? "checkbox" : "radio"}
              // Çok seçimlide her seçenek kendi alan adını taşır; böylece
              // sunucu tarafı hangi seçeneklerin işaretlendiğini ayırt eder.
              name={multiple ? `q_${questionId}_${index}` : name}
              value={multiple ? "1" : index}
              className="mt-0.5 size-4 shrink-0 accent-tfs-red"
            />
            <span className="text-sm text-tfs-dark">{option}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function ScaleInput({
  name,
  min,
  max,
  minLabel,
  maxLabel,
}: {
  name: string;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div>
      {/* Ölçek 11 basamağa kadar çıkabilir (NPS 0–10). Dar ekranda yatay
          kaydırma yerine ikinci satıra sarar: dokunmatik bir form kontrolünde
          görünmeyen bir basamak bırakmak, sarmaktan daha kötüdür. */}
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <label
            key={value}
            className="flex min-w-9 grow basis-9 cursor-pointer flex-col items-center rounded-brand border border-tfs-grey py-2 transition-colors hover:border-tfs-dark-20 has-checked:border-tfs-red has-checked:bg-tfs-red has-checked:text-white"
          >
            <input type="radio" name={name} value={value} className="sr-only" />
            <span className="text-sm font-semibold">{value}</span>
          </label>
        ))}
      </div>

      <div className="mt-1 flex justify-between text-[0.6875rem] font-light text-tfs-dark-60">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
