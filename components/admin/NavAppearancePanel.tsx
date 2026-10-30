"use client";

import { useActionState, useState } from "react";
import { saveSettingsAction } from "@/app/admin/(panel)/ayarlar/actions";
import { NavPreview } from "@/components/admin/NavPreview";
import {
  Alert,
  ColorChoice,
  Field,
  Segmented,
  SizeChoice,
  SubmitButton,
  submitWithoutReset,
} from "@/components/ui/form";
import { IDLE } from "@/lib/action-state";
import { navAlignClass, textClassFor } from "@/lib/appearance";
import { ALIGN_OPTIONS, COLOR_OPTIONS, SIZE_OPTIONS } from "@/lib/settings-schema";

/** Bu panelin yazdığı anahtarlar — sunucuya yalnızca bunlar bildirilir. */
const KEYS = ["type_nav_size", "type_nav_color", "nav_align"] as const;

/**
 * Sekmeler ekranındaki "Sekme görünümü" paneli.
 *
 * Ayarlar > Metin ve Görünüm'deki "Sekmeler ve menü" kartıyla AYNI
 * anahtarları yazar; iki yerden de ayarlanabilir, tek kaynak vardır.
 * `__alanlar` yalnızca bu üç anahtarı bildirdiği için diğer ayarlar
 * kaydetmede ezilmez.
 */
export function NavAppearancePanel({
  labels,
  initial,
}: {
  /** Portaldaki gerçek sekme adları, sırasıyla. */
  labels: string[];
  initial: Record<(typeof KEYS)[number], string>;
}) {
  const [state, action, pending] = useActionState(saveSettingsAction, IDLE);
  const [values, setValues] = useState(initial);

  function set(key: (typeof KEYS)[number], value: string): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      onSubmit={submitWithoutReset(action)}
      className="overflow-hidden rounded-brand border border-line bg-surface"
    >
      <input type="hidden" name="__alanlar" value={KEYS.join(",")} />

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line bg-surface-2 px-4 py-2.5">
        <span className="text-xs font-semibold tracking-[0.1em] text-accent-ink uppercase">
          Sekme görünümü
        </span>
        <span className="text-[0.6875rem] font-light text-ink-faint">
          Portalın üstündeki sekme çubuğu — önizleme seçtikçe değişir
        </span>
      </div>

      <NavPreview
        labels={labels}
        appearance={textClassFor("nav", values.type_nav_size, values.type_nav_color)}
        alignClass={navAlignClass(values.nav_align)}
      />

      <div className="space-y-4 p-4">
        {state.message ? (
          <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="Hiza">
            <Segmented
              name="nav_align"
              value={values.nav_align}
              options={ALIGN_OPTIONS}
              onChange={(value) => set("nav_align", value)}
            />
          </Field>
          <Field label="Punto">
            <SizeChoice
              name="type_nav_size"
              value={values.type_nav_size}
              options={SIZE_OPTIONS}
              onChange={(value) => set("type_nav_size", value)}
            />
          </Field>
          <Field label="Renk">
            <ColorChoice
              name="type_nav_color"
              value={values.type_nav_color}
              options={COLOR_OPTIONS}
              onChange={(value) => set("type_nav_color", value)}
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <SubmitButton pending={pending} pendingLabel="Kaydediliyor…">
            Görünümü kaydet
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
