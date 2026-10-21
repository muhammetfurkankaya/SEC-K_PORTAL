"use client";

import Link from "next/link";
import { useState } from "react";
import { ColorChoice, Field, SizeChoice } from "@/components/ui/form";
import { TEXT_SLOT_META, textClassFor, type TextSlot } from "@/lib/appearance";
import { TEXT_CARDS, textCardKeys, type TextCard } from "@/lib/settings-layout";
import {
  COLOR_OPTIONS,
  SIZE_OPTIONS,
  type PortalSettings,
  type SettingKey,
} from "@/lib/settings-schema";
import { FieldRows } from "./FieldRows";

/**
 * "Metin ve Görünüm" sekmesi.
 *
 * Her kart portaldaki bir yeri temsil ediyor ve o yerin metnini, puntosunu
 * ve rengini BİRLİKTE taşıyor. Önizleme hem punto/renk seçimini hem de
 * yazılan metni anında gösteriyor — kaydedip portala bakmak gerekmiyor.
 *
 * Girdiler büyük formun içinde kalıyor; tek kaydet düğmesi düzeni bozulmaz.
 */
export function TextAppearanceGroup({
  settings,
  errors,
  firstCategory,
}: {
  settings: PortalSettings;
  errors: Record<string, string>;
  /** Sayfa başlığı ve sekme önizlemelerinde gösterilecek gerçek sekme adı. */
  firstCategory: string;
}) {
  // Kartların çizdiği tüm alanların canlı değeri. Önizleme buradan okur.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const key of textCardKeys()) initial[key] = settings[key];
    return initial;
  });

  function set(key: string, value: string): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-light text-tfs-dark-60">
        Her yazının metni, puntosu ve rengi bir arada. Yazdıkça ve seçtikçe önizleme değişir;
        önizlemeler masaüstü ölçeğini gösterir, telefonda her kademe bir tık daha ölçülüdür.
      </p>

      {TEXT_CARDS.map((card) => (
        <CardBlock
          key={card.id}
          card={card}
          values={values}
          settings={settings}
          errors={errors}
          firstCategory={firstCategory}
          onChange={set}
        />
      ))}
    </div>
  );
}

function CardBlock({
  card,
  values,
  settings,
  errors,
  firstCategory,
  onChange,
}: {
  card: TextCard;
  values: Record<string, string>;
  settings: PortalSettings;
  errors: Record<string, string>;
  firstCategory: string;
  onChange: (key: string, value: string) => void;
}) {
  const slot = card.slot;
  const sizeKey = slot ? `type_${slot}_size` : "";
  const colorKey = slot ? `type_${slot}_color` : "";

  // Boş bırakılan bir metnin önizlemesi kaybolmasın; gerçek sayfada da
  // bu durumda alan ya gizlenir ya da varsayılana düşer.
  const previewText = card.previewKey ? values[card.previewKey]?.trim() || "—" : firstCategory;

  return (
    <fieldset className="overflow-hidden rounded-brand border border-tfs-grey">
      <legend className="sr-only">{card.title}</legend>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-tfs-grey bg-tfs-grey-20 px-4 py-2.5">
        <span className="text-xs font-semibold tracking-[0.1em] text-tfs-red uppercase">
          {card.title}
        </span>
        <span className="text-[0.6875rem] font-light text-tfs-dark-60">{card.where}</span>
      </div>

      {slot ? (
        <SlotPreview
          slot={slot}
          text={previewText}
          secondTab={firstCategory}
          appearance={textClassFor(
            slot,
            values[sizeKey],
            values[colorKey],
            TEXT_SLOT_META[slot].onDark,
          )}
        />
      ) : null}

      <div className="space-y-4 p-4">
        <FieldRows
          keys={card.fields}
          settings={settings}
          errors={errors}
          onValueChange={(key: SettingKey, value: string) => onChange(key, value)}
        />

        {slot ? (
          <div className="grid gap-4 border-t border-tfs-grey-40 pt-4 lg:grid-cols-2">
            <Field label="Punto">
              <SizeChoice
                name={sizeKey}
                value={values[sizeKey]}
                options={SIZE_OPTIONS}
                onChange={(value) => onChange(sizeKey, value)}
              />
            </Field>
            <Field label="Renk">
              <ColorChoice
                name={colorKey}
                value={values[colorKey]}
                options={COLOR_OPTIONS}
                onChange={(value) => onChange(colorKey, value)}
              />
            </Field>
          </div>
        ) : null}

        {card.note ? (
          <p className="text-[0.6875rem] font-light text-tfs-dark-60">
            {card.note.text}{" "}
            {card.note.href ? (
              <Link href={card.note.href} className="font-semibold text-tfs-red hover:underline">
                {card.note.linkText}
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </fieldset>
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
  text: sample,
  secondTab,
  appearance,
}: {
  slot: TextSlot;
  text: string;
  secondTab: string;
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
          <span className={appearance}>{secondTab}</span>
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
