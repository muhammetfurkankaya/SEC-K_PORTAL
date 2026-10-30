"use client";

import { useActionState, useMemo, useState } from "react";
import { Alert, SubmitButton, submitWithoutReset } from "@/components/ui/form";
import { IDLE } from "@/lib/action-state";
import {
  SETTINGS,
  SETTING_GROUPS,
  SETTING_KEYS,
  type PortalSettings,
  type SettingDef,
  type SettingGroupId,
  type SettingKey,
} from "@/lib/settings-schema";
import { textCardKeys } from "@/lib/settings-layout";
import { FieldRows, GroupSection } from "./FieldRows";
import { TextAppearanceGroup } from "./TextAppearanceGroup";
import { HeroImagePicker } from "@/components/admin/HeroImagePicker";
import { saveSettingsAction } from "./actions";

/**
 * Portal ayarları formu.
 *
 * ~70 alan tek bir sayfaya sığmıyor, bu yüzden gruplar sekmeye bölündü.
 * Ama hepsi **tek form, tek kaydet düğmesi**: kullanıcı birden fazla sekmede
 * değişiklik yapıp bir kez kaydedebilmeli.
 *
 * Pasif sekmeler `hidden` ile gizleniyor, DOM'dan çıkarılmıyor — çıkarılsaydı
 * o sekmedeki alanlar FormData'ya hiç girmez, işaretsiz onay kutuları da
 * "kapat" olarak yazılırdı. `__alanlar` alanı aynı tehlikeye karşı ikinci
 * katman: sunucu yalnızca gerçekten gönderilen anahtarları doğrular ve yazar.
 */
export type HeroPickerInfo = {
  currentSrc: string | null;
  uploaded: boolean;
  strongScrim: boolean;
  title: string;
};

export function PortalSettingsForm({
  settings,
  firstCategory,
  hero,
  logoSrc,
}: {
  settings: PortalSettings;
  /** Önizlemelerde gösterilecek gerçek bülten sekmesi adı. */
  firstCategory: string;
  /** Ana sayfa görselinin şu anki durumu — seçici için. */
  hero: HeroPickerInfo;
  /** Alt bilgi/logo önizlemesi için beyaz logonun adresi. */
  logoSrc: string | null;
}) {
  const [state, action, pending] = useActionState(saveSettingsAction, IDLE);
  const [activeGroup, setActiveGroup] = useState<SettingGroupId>(SETTING_GROUPS[0].id);
  const errors = state.fieldErrors ?? {};

  // Anahtarlar grup → alt başlık biçiminde, kayıttaki sırayı koruyarak.
  const grouped = useMemo(() => {
    const map = new Map<SettingGroupId, Map<string, SettingKey[]>>();
    for (const key of SETTING_KEYS) {
      const def: SettingDef = SETTINGS[key];
      if (def.hidden) continue; // kendi eylemi yazar, formda çizilmez
      const sections = map.get(def.group) ?? new Map<string, SettingKey[]>();
      const section = def.section ?? "";
      sections.set(section, [...(sections.get(section) ?? []), key]);
      map.set(def.group, sections);
    }
    return map;
  }, []);

  // Sunucuya bildirilen alan listesi: GERÇEKTEN çizilen anahtarlar.
  // "Metin ve Görünüm" sekmesi jenerik çiziciyi değil kart düzenini
  // kullanıyor; bir anahtar karta konmayı unutulursa ekranda olmaz ve tüm
  // anahtarları bildirseydik sunucu onu boş metin olarak yazardı. Böylece
  // çizilmeyen bir ayar asla ezilmez (tests/settings-layout.test.ts da
  // böyle bir boşluğun oluşmadığını ayrıca doğruluyor).
  const renderedKeys = useMemo(() => {
    const keys = new Set<SettingKey>(textCardKeys());
    for (const key of SETTING_KEYS) {
      const def: SettingDef = SETTINGS[key];
      if (def.group !== "metin" && !def.hidden) keys.add(key);
    }
    return [...keys];
  }, []);

  // Hatalı alan hangi sekmede? Kullanıcı başka sekmedeyken kaydederse
  // "işaretli alanları düzeltin" mesajı tek başına yetersiz kalıyordu.
  const groupsWithError = new Set<SettingGroupId>();
  for (const key of Object.keys(errors)) {
    if ((SETTING_KEYS as string[]).includes(key)) {
      groupsWithError.add(SETTINGS[key as SettingKey].group);
    }
  }

  return (
    <form onSubmit={submitWithoutReset(action)}>
      {/* Sunucuya hangi alanların gönderildiğini bildirir. */}
      <input type="hidden" name="__alanlar" value={renderedKeys.join(",")} />

      {state.message ? (
        <div className="mb-4">
          <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert>
        </div>
      ) : null}

      <div className="-mx-4 mb-5 overflow-x-auto border-b border-line px-4 sm:-mx-5 sm:px-5">
        <div className="flex gap-1">
          {SETTING_GROUPS.map((group) => {
            const isActive = group.id === activeGroup;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveGroup(group.id)}
                aria-current={isActive ? "true" : undefined}
                className={`flex shrink-0 items-center gap-1.5 border-b-[3px] px-3 py-2.5 text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-tfs-red font-semibold text-ink"
                    : "border-transparent text-ink-faint hover:text-ink"
                }`}
              >
                {group.title}
                {groupsWithError.has(group.id) ? (
                  <span
                    aria-label="düzeltilmesi gereken alan var"
                    className="size-1.5 shrink-0 rounded-full bg-tfs-red"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {SETTING_GROUPS.map((group) => {
        const sections = grouped.get(group.id);
        if (!sections) return null;

        return (
          <div key={group.id} hidden={group.id !== activeGroup} className="space-y-6">
            {/* Metin grubu kart düzeniyle çiziliyor: her yazının metni,
                puntosu ve rengi bir arada, canlı önizlemeyle. */}
            {group.id === "metin" ? (
              <TextAppearanceGroup
                settings={settings}
                errors={errors}
                firstCategory={firstCategory}
                logoSrc={logoSrc}
              />
            ) : (
              <>
                <p className="text-xs font-light text-ink-faint">{group.hint}</p>

                {[...sections.entries()].map(([section, keys]) => (
                  <GroupSection key={section || "_"} title={section}>
                    {/* Görsel, kullanıcının arayacağı yerde: Hero bölümünün
                        başında. Kendi eylemiyle anında yüklenir. */}
                    {group.id === "anasayfa" && section === "Hero" ? (
                      <HeroImagePicker {...hero} />
                    ) : null}
                    <FieldRows keys={keys} settings={settings} errors={errors} />
                  </GroupSection>
                ))}
              </>
            )}
          </div>
        );
      })}

      {/* Yapışkan: 70 alanlık bir formda kaydet düğmesi hep erişilebilir olmalı. */}
      <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center gap-3 border-t border-line bg-surface px-4 py-3 sm:-mx-5 sm:px-5">
        <SubmitButton pending={pending} pendingLabel="Kaydediliyor…">
          Ayarları kaydet
        </SubmitButton>
        <span className="text-xs font-light text-ink-faint">
          Değişiklikler kaydettiğiniz anda portalda geçerli olur.
        </span>
      </div>
    </form>
  );
}
