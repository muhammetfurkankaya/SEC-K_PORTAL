"use client";

import { startTransition } from "react";
import { useFormStatus } from "react-dom";

/**
 * Admin panelindeki formlarda tekrar kullanılan girdi öğeleri.
 *
 * Tek yerde toplanmaları, alan görünümünün tüm ekranlarda aynı kalmasını
 * ve marka renklerinin (odak halkası #CE2028) tutarlı uygulanmasını sağlar.
 */

/**
 * Formu React'ın otomatik sıfırlaması OLMADAN gönderir.
 *
 * React 19, `<form action={...}>` başarıyla gönderilince formu sıfırlıyor.
 * Kontrollü seçim düğmelerinde (canlı önizlemeli punto/renk/konum) bu,
 * işaretleri ilk açılıştaki değere geri atıyordu: ekranda "Normal" görünüyor,
 * tekrar kaydedilince eski değer veritabanına geri yazılıyordu. `onSubmit`
 * ile gönderilen formda sıfırlama hiç devreye girmez.
 *
 * Kullanım: `<form onSubmit={submitWithoutReset(action)}>` ve gönder
 * düğmesine `pending` (useActionState'in üçüncü değeri) — `useFormStatus`
 * bu yolla gönderilen formu izlemez.
 */
export function submitWithoutReset(dispatch: (formData: FormData) => void) {
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };
}

const INPUT_CLASS =
  "w-full rounded-brand border border-line bg-surface px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-faint focus:border-accent focus:outline-none " +
  "disabled:bg-surface-2 disabled:text-ink-faint";

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function Field({ label, htmlFor, hint, required, children, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink">
        {label}
        {required ? <span className="ml-0.5 text-accent-ink">*</span> : null}
      </label>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-[0.6875rem] font-light text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT_CLASS} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${INPUT_CLASS} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${INPUT_CLASS} ${props.className ?? ""}`} />;
}

export function Checkbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        {...props}
        className="size-4 rounded-brand border-line text-accent-ink accent-tfs-red"
      />
      {label}
    </label>
  );
}

/**
 * Açıklamalı aç/kapa satırı.
 *
 * Ayar ekranında kullanılır: her kontrolün ne yaptığı yanında yazılı olsun
 * diye etiketi ve açıklamasını birlikte taşır.
 */
export function SwitchRow({
  label,
  description,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 border-b border-line-soft py-3 last:border-b-0">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-xs font-light text-ink-faint">{description}</span>
      </span>
      <input
        type="checkbox"
        {...props}
        className="mt-0.5 size-4 shrink-0 rounded-brand border-line accent-tfs-red"
      />
    </label>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-tfs-red text-white hover:bg-tfs-dark",
  secondary: "border border-line bg-surface text-ink hover:border-line-strong",
  danger: "border border-accent bg-surface text-accent-ink hover:bg-tfs-red hover:text-white",
};

/**
 * Form gönderim düğmesi.
 *
 * useFormStatus ile gönderim sırasında kendini devre dışı bırakır; böylece
 * çift tıklama ile aynı bülten iki kez yüklenmez.
 */
export function SubmitButton({
  children,
  variant = "primary",
  pendingLabel,
  confirm,
  className = "",
  pending: pendingProp,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  pendingLabel?: string;
  /** `submitWithoutReset` ile gönderilen formlarda bekleme durumu. */
  pending?: boolean;
  /** Doldurulmuşsa tıklamada onay penceresi gösterir. */
  confirm?: string;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;

  return (
    // `props` önce yayılıyor: dışarıdan verilen `disabled` gönderim sırasındaki
    // kilidi ezmesin.
    <button
      type="submit"
      {...props}
      disabled={pending || props.disabled}
      onClick={
        confirm
          ? (event) => {
              if (!window.confirm(confirm)) event.preventDefault();
            }
          : props.onClick
      }
      className={`rounded-brand px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

export function Alert({
  kind,
  children,
}: {
  kind: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    success: "border-tfs-green bg-tfs-green/10 text-ink",
    error: "border-accent bg-accent-wash text-ink",
    info: "border-line bg-surface-2 text-ink",
  }[kind];

  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-brand border px-3 py-2 text-sm ${styles}`}
    >
      {children}
    </p>
  );
}

// ————————————————————————————————————————————————
// Seçim öğeleri
//
// Üçü de radio + `peer` ile çalışır: istemci durumu tutmazlar, bu yüzden
// 70 alanlık ayar formunda 70 ayrı state olmaz. Görsel dil bülten
// okuyucudaki sıralama düğmeleriyle aynı — bu arayüzün segment kontrolü o.
// ————————————————————————————————————————————————

export type ChoiceOption = {
  value: string;
  label: string;
  /** Renk seçiminde gösterilecek kare. */
  swatch?: string;
  /** Punto seçiminde örnek harf. */
  sample?: string;
};

const CHOICE_BASE =
  "cursor-pointer rounded-brand border px-2.5 py-1.5 text-xs transition-colors " +
  "border-line text-ink-faint hover:border-line-strong hover:text-ink " +
  "peer-checked:border-accent peer-checked:bg-accent-wash peer-checked:font-semibold " +
  "peer-checked:text-accent-ink peer-focus-visible:outline peer-focus-visible:outline-2 " +
  "peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tfs-red";

/**
 * Seçim öğelerinin ortak propları.
 *
 * `onChange` verilmezse girdi KONTROLSÜZ çalışır (`defaultChecked`): ayar
 * formunun çoğu sekmesinde React durumu tutmaya gerek yok. Verildiğinde
 * kontrollü olur — canlı önizlemenin seçimi anında görebilmesi için.
 */
type ChoiceProps = {
  name: string;
  value: string;
  options: readonly ChoiceOption[];
  onChange?: (value: string) => void;
};

/** Seçili olma durumunu kontrollü/kontrolsüz moda göre verir. */
function checkedProps(controlled: boolean, selected: boolean) {
  return controlled ? { checked: selected } : { defaultChecked: selected };
}

/** Birkaç kısa seçenek arasından biri — açılır liste yerine görünür düğmeler. */
export function Segmented({ name, value, options, onChange }: ChoiceProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            {...checkedProps(Boolean(onChange), value === option.value)}
            onChange={onChange ? () => onChange(option.value) : undefined}
            className="peer sr-only"
          />
          <span className={`inline-block ${CHOICE_BASE}`}>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

/** Kurumsal paletten renk seçimi — kare + ad. */
export function ColorChoice({ name, value, options, onChange }: ChoiceProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            {...checkedProps(Boolean(onChange), value === option.value)}
            onChange={onChange ? () => onChange(option.value) : undefined}
            className="peer sr-only"
          />
          <span className={`inline-flex items-center gap-1.5 ${CHOICE_BASE}`}>
            <span
              aria-hidden="true"
              className="size-3.5 shrink-0 rounded-brand border border-line"
              style={{ backgroundColor: option.swatch ?? "transparent" }}
            />
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/**
 * Punto seçimi.
 *
 * Örnek harf gerçek ölçeğinde gösteriliyor: "Büyük"ün ne kadar büyük
 * olduğunu kaydedip portala bakmadan görmek gerekiyor.
 */
const SAMPLE_SCALE: Record<string, string> = {
  kucuk: "text-[0.75rem]",
  normal: "text-[0.9375rem]",
  buyuk: "text-[1.1875rem]",
  "cok-buyuk": "text-[1.5rem]",
};

export function SizeChoice({ name, value, options, onChange }: ChoiceProps) {
  return (
    <div className="flex flex-wrap items-stretch gap-1.5">
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            {...checkedProps(Boolean(onChange), value === option.value)}
            onChange={onChange ? () => onChange(option.value) : undefined}
            className="peer sr-only"
          />
          <span className={`flex min-w-[4.5rem] flex-col items-center gap-0.5 ${CHOICE_BASE}`}>
            <span
              aria-hidden="true"
              className={`leading-none font-semibold ${SAMPLE_SCALE[option.value] ?? "text-sm"}`}
            >
              {option.sample ?? "Aa"}
            </span>
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
