"use client";

import {
  ColorChoice,
  Field,
  Segmented,
  Select,
  SizeChoice,
  SwitchRow,
  TextArea,
  TextInput,
} from "@/components/ui/form";
import { SETTINGS, type SettingDef, type SettingKey } from "@/lib/settings-schema";

/**
 * Tek bir ayarı çizer.
 *
 * Formun tamamı bu bileşenden geçiyor: yeni bir ayar eklemek artık
 * lib/settings-schema.ts'e bir satır yazmak demek, forma satır eklemek
 * değil. Eskiden her alan elle yazılıyordu ve dosya 382 satırdı.
 */
export function SettingField({
  name,
  value,
  error,
  onValueChange,
}: {
  name: SettingKey;
  value: string;
  error?: string;
  /**
   * Değer her değiştiğinde çağrılır — canlı önizleme yazılanı görebilsin
   * diye. Metin girdileri yine kontrolsüz kalır (form gönderimi değişmez);
   * seçim düğmeleri ise bu verildiğinde kontrollü olur.
   */
  onValueChange?: (value: string) => void;
}) {
  // `as const satisfies` literal tipleri koruyor; burada ortak biçime
  // genişletiyoruz, yoksa her girdi kendi dar tipiyle gelir ve örneğin
  // `help` alanı o anahtarda yoksa derleyici hata verir.
  const def: SettingDef = SETTINGS[name];
  const id = `ayar-${name}`;

  switch (def.kind) {
    case "bool":
      return (
        <SwitchRow
          name={name}
          label={def.label}
          description={def.description ?? def.help ?? ""}
          defaultChecked={value === "1"}
          onChange={
            onValueChange ? (event) => onValueChange(event.target.checked ? "1" : "0") : undefined
          }
        />
      );

    case "textarea":
      return (
        <Field label={def.label} htmlFor={id} hint={error ?? def.help}>
          <TextArea
            id={id}
            name={name}
            rows={def.rows ?? 3}
            maxLength={def.max}
            defaultValue={value}
            onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
            aria-invalid={error ? true : undefined}
          />
        </Field>
      );

    case "int":
      return (
        <Field label={def.label} htmlFor={id} hint={error ?? def.help}>
          <TextInput
            id={id}
            name={name}
            type="number"
            min={def.min}
            max={def.max}
            defaultValue={value}
            onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
            aria-invalid={error ? true : undefined}
          />
        </Field>
      );

    case "enum": {
      const control = def.control ?? "select";

      if (control === "select") {
        return (
          <Field label={def.label} htmlFor={id} hint={error ?? def.help}>
            <Select
              id={id}
              name={name}
              defaultValue={value}
              onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
            >
              {def.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        );
      }

      const Choice =
        control === "swatch" ? ColorChoice : control === "size" ? SizeChoice : Segmented;

      return (
        <Field label={def.label} hint={error ?? def.help}>
          <Choice name={name} value={value} options={def.options} onChange={onValueChange} />
        </Field>
      );
    }

    default:
      return (
        <Field
          label={def.label}
          htmlFor={id}
          hint={error ?? def.help}
          required={def.kind === "text" && def.required}
        >
          <TextInput
            id={id}
            name={name}
            type="text"
            maxLength={def.max}
            defaultValue={value}
            onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
            aria-invalid={error ? true : undefined}
          />
        </Field>
      );
  }
}
