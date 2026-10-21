import { z } from "zod";
import {
  SETTINGS,
  SETTING_KEYS,
  type PortalSettings,
  type SettingDef,
  type SettingKey,
  type TypedSettings,
} from "@/lib/settings-schema";

/**
 * Ayarların okunması ve yazılması için doğrulama katmanı.
 *
 * İki yön var ve ikisi de lib/settings-schema.ts'teki kayıttan üretilir:
 *
 *   OKUMA   parseSetting / resolveSettings — veritabanındaki metni türüne
 *           çevirir. Bozuk ya da eski bir değer hiçbir zaman arayüze
 *           sızmaz, varsayılana düşer.
 *   YAZMA   buildSettingsSchema — form verisini doğrular ve **saklanacak
 *           metni** döndürür, böylece kaydetme eylemi hiçbir eşleme yapmaz.
 *
 * Veritabanına dokunmadığı için node:test'ten doğrudan import edilebilir.
 */

function truthy(value: string): boolean {
  return value === "1" || value === "true" || value === "on";
}

/** Tek bir ayarı türüne çevirir; geçersizse varsayılana döner. */
export function parseSetting<K extends SettingKey>(
  key: K,
  raw: string | undefined,
): TypedSettings[K] {
  const def: SettingDef = SETTINGS[key];

  switch (def.kind) {
    case "bool":
      return (raw === undefined ? truthy(def.default) : truthy(raw)) as TypedSettings[K];

    case "int": {
      const parsed = Number(raw ?? def.default);
      const fallback = Number(def.default);
      if (!Number.isFinite(parsed)) return fallback as TypedSettings[K];
      const clamped = Math.min(Math.max(Math.trunc(parsed), def.min), def.max);
      return clamped as TypedSettings[K];
    }

    case "enum": {
      const allowed = def.options.map((option) => option.value);
      return (allowed.includes(raw ?? "") ? raw : def.default) as TypedSettings[K];
    }

    default:
      return (raw ?? def.default) as TypedSettings[K];
  }
}

/** Ham ayar tablosunu tipi çözülmüş hâle getirir. */
export function resolveSettings(raw: Partial<PortalSettings>): TypedSettings {
  const result = {} as Record<SettingKey, unknown>;
  for (const key of SETTING_KEYS) {
    result[key] = parseSetting(key, raw[key]);
  }
  return result as TypedSettings;
}

// ————————————————————————————————————————————————
// Yazma yönü
// ————————————————————————————————————————————————

/** Bir ayar için, çıktısı DAİMA saklanacak metin olan zod şeması. */
export function fieldSchema(key: SettingKey): z.ZodType<string> {
  const def: SettingDef = SETTINGS[key];

  switch (def.kind) {
    case "bool":
      // İşaretsiz onay kutusu formda hiç gönderilmez; "" de "0" sayılır.
      return z.preprocess(
        (value) => (truthy(String(value ?? "")) ? "1" : "0"),
        z.enum(["0", "1"]),
      ) as unknown as z.ZodType<string>;

    case "int":
      return z.coerce
        .number({ invalid_type_error: "Sayı girin." })
        .int("Tam sayı girin.")
        .min(def.min, `En az ${def.min} olmalı.`)
        .max(def.max, `En fazla ${def.max} olabilir.`)
        .transform(String) as unknown as z.ZodType<string>;

    case "enum": {
      const values = def.options.map((option) => option.value) as [string, ...string[]];
      return z.enum(values, {
        invalid_type_error: "Listeden bir seçenek seçin.",
      });
    }

    default: {
      // text ve textarea; textarea'da `required` alanı yok.
      const required = def.kind === "text" && def.required === true;
      const schema = z.string().trim().max(def.max, `En fazla ${def.max} karakter.`);
      return required ? schema.min(1, `${def.label} zorunludur.`) : schema;
    }
  }
}

/**
 * Verilen anahtarlar için birleşik şema.
 *
 * Form hangi alanları gönderdiğini kendisi bildiriyor (`__alanlar`): aksi
 * halde o anda çizilmemiş bir sekmedeki işaretsiz onay kutusu "0" olarak
 * yazılır ve kullanıcının hiç görmediği bir ayar sessizce kapanırdı.
 */
export function buildSettingsSchema(
  keys: readonly SettingKey[],
): z.ZodType<Record<string, string>> {
  const shape: Record<string, z.ZodType<string>> = {};
  for (const key of keys) shape[key] = fieldSchema(key);
  return z.object(shape) as unknown as z.ZodType<Record<string, string>>;
}
