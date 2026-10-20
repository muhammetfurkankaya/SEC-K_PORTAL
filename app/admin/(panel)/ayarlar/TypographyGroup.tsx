"use client";

import { useState } from "react";
import { ColorChoice, Field, SizeChoice } from "@/components/ui/form";
import { TEXT_SLOTS, TEXT_SLOT_META, textClassFor, type TextSlot } from "@/lib/appearance";
import {
  COLOR_OPTIONS,
  SIZE_OPTIONS,
  type PortalSettings,
  type SettingKey,
} from "@/lib/settings-schema";

/** Önizlemede gösterilecek gerçek metinler — sunucudan geliyor. */
export type TypographySamples = Record<TextSlot, string>;

/**
 * "Punto ve Renk" sekmesi.
 *
 * Diğer gruplar jenerik SettingField ile çiziliyor; bu grup kendi bileşenini
 * hak ediyor, çünkü asıl soru "hangi seçenek" değil "**nasıl görünecek**".
 * Her yuva, portaldaki gerçek metni gerçek zemininde gösteren bir
 * önizlemeyle birlikte geliyor ve seçim anında güncelleniyor — kaydedip
 * portala gidip bakmak gerekmiyor.
 *
 * Girdiler büyük formun içinde kalıyor: tek kaydet düğmesi düzeni bozulmaz.
 */
export function TypographyGroup({
  settings,
  samples,
}: {
  settings: PortalSettings;
  samples: TypographySamples;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const slot of TEXT_SLOTS) {
      initial[`type_${slot}_size`] = settings[`type_${slot}_size` as SettingKey];
      initial[`type_${slot}_color`] = settings[`type_${slot}_color` as SettingKey];
    }
    return initial;
  });

  function set(key: string, value: string): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-light text-tfs-dark-60">
        Her yazı için boyut ve kurumsal paletten renk. Önizlemeler masaüstü ölçeğini gösterir;
        telefonda her kademe bir tık daha ölçülü görünür.
      </p>

      {TEXT_SLOTS.map((slot) => {
        const meta = TEXT_SLOT_META[slot];
        const sizeKey = `type_${slot}_size`;
        const colorKey = `type_${slot}_color`;
        const appearance = textClassFor(slot, values[sizeKey], values[colorKey], meta.onDark);

        return (
          <fieldset key={slot} className="rounded-brand border border-tfs-grey">
            <legend className="sr-only">{meta.label}</legend>

            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-tfs-grey bg-tfs-grey-20 px-4 py-2.5">
              <span className="text-xs font-semibold tracking-[0.1em] text-tfs-red uppercase">
                {meta.label}
              </span>
              <span className="text-[0.6875rem] font-light text-tfs-dark-60">{meta.where}</span>
            </div>

            <SlotPreview slot={slot} sample={samples[slot]} appearance={appearance} />

            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <Field label="Punto">
                <SizeChoice
                  name={sizeKey}
                  value={values[sizeKey]}
                  options={SIZE_OPTIONS}
                  onChange={(value) => set(sizeKey, value)}
                />
              </Field>
              <Field label="Renk">
                <ColorChoice
                  name={colorKey}
                  value={values[colorKey]}
                  options={COLOR_OPTIONS}
                  onChange={(value) => set(colorKey, value)}
                />
              </Field>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

/**
 * Yuvanın portaldaki bağlamını taklit eden önizleme.
 *
 * Koyu zeminliler `hero-brand` kullanıyor: fotoğraf yüklemeye gerek
 * kalmıyor ve renkler hero'daki ile birebir aynı oluyor.
 */
function SlotPreview({
  slot,
  sample,
  appearance,
}: {
  slot: TextSlot;
  sample: string;
  appearance: string;
}) {
  // Uzun bir başlık önizlemeyi taşırmasın; gerçek sayfada da sarıyor.
  const text = <span className={`block break-words ${appearance}`}>{sample}</span>;

  if (TEXT_SLOT_META[slot].onDark) {
    return (
      <div className="hero-brand px-5 py-6">
        {slot === "home_kicker" ? (
          <span className="flex items-center gap-2.5 font-semibold tracking-[0.18em] uppercase">
            <span aria-hidden="true" className="h-px w-6 shrink-0 bg-tfs-red" />
            {text}
          </span>
        ) : slot === "home_title" ? (
          <span className="block leading-[1.06] font-semibold tracking-[-0.02em]">{text}</span>
        ) : (
          <span className="block leading-relaxed font-light">{text}</span>
        )}
      </div>
    );
  }

  if (slot === "nav") {
    return (
      <div className="flex gap-1 border-b border-tfs-grey bg-white px-3">
        <span className="border-b-[3px] border-tfs-red px-3 py-3 font-semibold text-tfs-dark">
          <span className={appearance}>{sample}</span>
        </span>
        <span className="border-b-[3px] border-transparent px-3 py-3 text-tfs-dark-80">
          <span className={appearance}>SEÇ-K Bültenleri</span>
        </span>
      </div>
    );
  }

  if (slot === "section_title") {
    return (
      <div className="bg-white px-5 py-5">
        <span className="block font-semibold tracking-[0.12em] uppercase">{text}</span>
      </div>
    );
  }

  // page_title ve page_eyebrow: sade başlık bandının aynısı.
  return (
    <div className="bg-tfs-grey-20 px-5 py-6">
      <div className="brand-bar pl-4">
        {slot === "page_eyebrow" ? (
          <span className="block font-semibold tracking-[0.16em] uppercase">{text}</span>
        ) : (
          <span className="block font-semibold tracking-[-0.015em]">{text}</span>
        )}
      </div>
    </div>
  );
}
