"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoView } from "@/components/brand/LogoView";
import { NavPreview } from "@/components/admin/NavPreview";
import { ColorChoice, Field, SizeChoice } from "@/components/ui/form";
import { footerLines } from "@/lib/footer";
import { TEXT_SLOT_META, navAlignClass, textClassFor, type TextSlot } from "@/lib/appearance";
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
  logoSrc,
}: {
  settings: PortalSettings;
  errors: Record<string, string>;
  /** Sayfa başlığı ve sekme önizlemelerinde gösterilecek gerçek sekme adı. */
  firstCategory: string;
  logoSrc: string | null;
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
      <p className="text-xs font-light text-ink-faint">
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
          logoSrc={logoSrc}
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
  logoSrc,
  onChange,
}: {
  card: TextCard;
  values: Record<string, string>;
  settings: PortalSettings;
  errors: Record<string, string>;
  firstCategory: string;
  logoSrc: string | null;
  onChange: (key: string, value: string) => void;
}) {
  const slot = card.slot;
  const sizeKey = slot ? `type_${slot}_size` : "";
  const colorKey = slot ? `type_${slot}_color` : "";

  // Boş bırakılan bir metnin önizlemesi kaybolmasın; gerçek sayfada da
  // bu durumda alan ya gizlenir ya da varsayılana düşer.
  const previewText = card.previewKey ? values[card.previewKey]?.trim() || "—" : firstCategory;

  return (
    <fieldset className="overflow-hidden rounded-brand border border-line">
      <legend className="sr-only">{card.title}</legend>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line bg-surface-2 px-4 py-2.5">
        <span className="text-xs font-semibold tracking-[0.1em] text-accent-ink uppercase">
          {card.title}
        </span>
        <span className="text-[0.6875rem] font-light text-ink-faint">{card.where}</span>
      </div>

      {card.preview === "footer" ? <FooterPreview values={values} logoSrc={logoSrc} /> : null}

      {slot ? (
        <SlotPreview
          slot={slot}
          text={previewText}
          secondTab={firstCategory}
          values={values}
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
          // Güncel değerler: seçim düğmeleri kontrollü, ilk değerle
          // beslenirse tıklama hiçbir şeyi değiştirmez.
          settings={{ ...settings, ...values }}
          errors={errors}
          onValueChange={(key: SettingKey, value: string) => onChange(key, value)}
        />

        {slot ? (
          <div className="grid gap-4 border-t border-line-soft pt-4 lg:grid-cols-2">
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
          <p className="text-[0.6875rem] font-light text-ink-faint">
            {card.note.text}{" "}
            {card.note.href ? (
              <Link href={card.note.href} className="font-semibold text-accent-ink hover:underline">
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
  values,
  appearance,
}: {
  slot: TextSlot;
  text: string;
  secondTab: string;
  values: Record<string, string>;
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
      <NavPreview
        labels={[sample, secondTab, values.nav_surveys_label ?? ""]}
        appearance={appearance}
        alignClass={navAlignClass(values.nav_align ?? "sol")}
      />
    );
  }

  if (slot === "section_title") {
    return (
      <div className="bg-surface px-5 py-5">
        <span className="block font-semibold tracking-[0.12em] uppercase">{text}</span>
      </div>
    );
  }

  // page_title ve page_eyebrow: sade başlık bandının aynısı.
  return (
    <div className="bg-surface-2 px-5 py-6">
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

/**
 * Alt bilgi ve logo yanı yazısı — kapatılan ya da boşaltılan parça
 * önizlemeden de anında kalkar.
 */
function FooterPreview({
  values,
  logoSrc,
}: {
  values: Record<string, string>;
  logoSrc: string | null;
}) {
  const showSubtitle = values.logo_subtitle_show === "1";
  const subtitle = values.logo_subtitle_text?.trim() || values.portal_title?.trim() || "";
  const { brand, legal } = footerLines(
    {
      portal_title: values.portal_title ?? "",
      portal_subtitle: values.portal_subtitle ?? "",
      footer_company: values.footer_company ?? "",
      footer_note: values.footer_note ?? "",
      footer_show_year: values.footer_show_year === "1",
    },
    new Date().getFullYear(),
  );
  const footerEmpty = !brand.title && !brand.rest && !legal;

  return (
    <div>
      <div className="bg-tfs-dark px-5 py-3.5">
        <LogoView variant="light" file={logoSrc} subtitle={showSubtitle ? subtitle : undefined} />
      </div>
      <div className="border-t border-line bg-surface-2 px-5 py-4 text-xs text-ink-faint">
        {footerEmpty ? (
          <p className="italic">Alt bilgi gizli — gösterilecek bir şey yok.</p>
        ) : (
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <p>
              {brand.title ? <span className="font-semibold text-ink">{brand.title}</span> : null}
              {brand.title && brand.rest ? " · " : ""}
              {brand.rest}
            </p>
            {legal ? <p>{legal}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
