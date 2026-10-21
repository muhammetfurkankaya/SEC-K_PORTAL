"use client";

import { SETTINGS, type SettingDef, type SettingKey } from "@/lib/settings-schema";
import { SettingField } from "./SettingField";

/** Alt başlıklı çerçeve; başlıksız bölümler çerçevesiz akar. */
export function GroupSection({ title, children }: { title: string; children: React.ReactNode }) {
  if (!title) return <div className="space-y-4">{children}</div>;

  return (
    <fieldset className="rounded-brand border border-tfs-grey bg-tfs-grey-20 p-4">
      <legend className="px-1 text-xs font-semibold tracking-[0.1em] text-tfs-red uppercase">
        {title}
      </legend>
      <div className="mt-2 space-y-4">{children}</div>
    </fieldset>
  );
}

/**
 * Alanları yerleştirir.
 *
 * `span: "half"` olan ardışık alanlar iki sütuna girer; aç/kapa satırları
 * kendi arasında gruplanır ki aralarında ayırıcı çizgi düzgün görünsün.
 */
export function FieldRows({
  keys,
  settings,
  errors,
  onValueChange,
}: {
  keys: readonly SettingKey[];
  /** Alanların başlangıç değerleri. */
  settings: Record<string, string>;
  errors: Record<string, string>;
  /** Verilirse her alanın değişimi bildirilir (canlı önizleme için). */
  onValueChange?: (key: SettingKey, value: string) => void;
}) {
  const rows: React.ReactNode[] = [];
  let buffer: SettingKey[] = [];
  let bufferKind: "half" | "bool" | null = null;

  function flush(): void {
    if (buffer.length === 0) return;
    const items = buffer.map((key) => (
      <SettingField
        key={key}
        name={key}
        value={settings[key]}
        error={errors[key]}
        onValueChange={onValueChange ? (value) => onValueChange(key, value) : undefined}
      />
    ));

    rows.push(
      bufferKind === "bool" ? (
        <div key={`b${rows.length}`} className="rounded-brand border border-tfs-grey bg-white px-4">
          {items}
        </div>
      ) : (
        <div key={`h${rows.length}`} className="grid gap-4 sm:grid-cols-2">
          {items}
        </div>
      ),
    );
    buffer = [];
    bufferKind = null;
  }

  for (const key of keys) {
    const def: SettingDef = SETTINGS[key];
    const kind = def.kind === "bool" ? "bool" : def.span === "half" ? "half" : null;

    if (kind === null) {
      flush();
      rows.push(
        <SettingField
          key={key}
          name={key}
          value={settings[key]}
          error={errors[key]}
          onValueChange={onValueChange ? (value) => onValueChange(key, value) : undefined}
        />,
      );
      continue;
    }

    if (bufferKind !== null && bufferKind !== kind) flush();
    bufferKind = kind;
    buffer.push(key);
  }
  flush();

  return <>{rows}</>;
}
