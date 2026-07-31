"use client";

import { useFormStatus } from "react-dom";

/**
 * Admin panelindeki formlarda tekrar kullanılan girdi öğeleri.
 *
 * Tek yerde toplanmaları, alan görünümünün tüm ekranlarda aynı kalmasını
 * ve marka renklerinin (odak halkası #CE2028) tutarlı uygulanmasını sağlar.
 */

const INPUT_CLASS =
  "w-full rounded-brand border border-tfs-grey bg-white px-3 py-2 text-sm text-tfs-dark " +
  "placeholder:text-tfs-dark-60 focus:border-tfs-red focus:outline-none " +
  "disabled:bg-tfs-grey-20 disabled:text-tfs-dark-60";

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
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-tfs-dark">
        {label}
        {required ? <span className="ml-0.5 text-tfs-red">*</span> : null}
      </label>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-[0.6875rem] font-light text-tfs-dark-60">{hint}</p> : null}
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
    <label className="flex items-center gap-2 text-sm text-tfs-dark">
      <input
        type="checkbox"
        {...props}
        className="size-4 rounded-brand border-tfs-grey text-tfs-red accent-tfs-red"
      />
      {label}
    </label>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-tfs-red text-white hover:bg-tfs-dark",
  secondary: "border border-tfs-grey bg-white text-tfs-dark hover:border-tfs-dark-20",
  danger: "border border-tfs-red bg-white text-tfs-red hover:bg-tfs-red hover:text-white",
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
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  pendingLabel?: string;
  /** Doldurulmuşsa tıklamada onay penceresi gösterir. */
  confirm?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      onClick={
        confirm
          ? (event) => {
              if (!window.confirm(confirm)) event.preventDefault();
            }
          : props.onClick
      }
      {...props}
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
    success: "border-tfs-green bg-tfs-green/10 text-tfs-dark",
    error: "border-tfs-red bg-tfs-red-10 text-tfs-dark",
    info: "border-tfs-grey bg-tfs-grey-20 text-tfs-dark",
  }[kind];

  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-brand border px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}
