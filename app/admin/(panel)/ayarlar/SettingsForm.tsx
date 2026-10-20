"use client";

import { useActionState, useMemo, useState } from "react";
import { Alert, SubmitButton } from "@/components/ui/form";
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
import { SettingField } from "./SettingField";
import { saveSettingsAction } from "./actions";

/**
 * Portal ayarları formu.
 *
 * ~70 alan tek bir sayfaya sığmıyor, bu yüzden gruplar sekmeye bölündü.
 * Ama hepsi **tek form, tek kaydet düğmesi**: kullanıcı üç sekmede değişiklik
 * yapıp bir kez kaydedebilmeli.
 *
 * Pasif sekmeler `hidden` ile gizleniyor, DOM'dan çıkarılmıyor — çıkarılsaydı
 * o sekmedeki alanlar FormData'ya hiç girmez, işaretsiz onay kutuları da
 * "kapat" olarak yazılırdı. `__alanlar` alanı aynı tehlikeye karşı ikinci
 * katman: sunucu yalnızca gerçekten gönderilen anahtarları doğrular ve yazar.
 */
export function PortalSettingsForm({ settings }: { settings: PortalSettings }) {
  const [state, action] = useActionState(saveSettingsAction, IDLE);
  const [activeGroup, setActiveGroup] = useState<SettingGroupId>(SETTING_GROUPS[0].id);
  const errors = state.fieldErrors ?? {};

  // Anahtarlar grup → alt başlık biçiminde, kayıttaki sırayı koruyarak.
  const grouped = useMemo(() => {
    const map = new Map<SettingGroupId, Map<string, SettingKey[]>>();
    for (const key of SETTING_KEYS) {
      const def: SettingDef = SETTINGS[key];
      const sections = map.get(def.group) ?? new Map<string, SettingKey[]>();
      const section = def.section ?? "";
      sections.set(section, [...(sections.get(section) ?? []), key]);
      map.set(def.group, sections);
    }
    return map;
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
    <form action={action}>
      {/* Sunucuya hangi alanların gönderildiğini bildirir. */}
      <input type="hidden" name="__alanlar" value={SETTING_KEYS.join(",")} />

      {state.message ? (
        <div className="mb-4">
          <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert>
        </div>
      ) : null}

      <div className="-mx-4 mb-5 overflow-x-auto border-b border-tfs-grey px-4 sm:-mx-5 sm:px-5">
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
                    ? "border-tfs-red font-semibold text-tfs-dark"
                    : "border-transparent text-tfs-dark-60 hover:text-tfs-dark"
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
            <p className="text-xs font-light text-tfs-dark-60">{group.hint}</p>

            {[...sections.entries()].map(([section, keys]) => (
              <GroupSection key={section || "_"} title={section}>
                <FieldRows keys={keys} settings={settings} errors={errors} />
              </GroupSection>
            ))}
          </div>
        );
      })}

      {/* Yapışkan: 70 alanlık bir formda kaydet düğmesi hep erişilebilir olmalı. */}
      <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center gap-3 border-t border-tfs-grey bg-white px-4 py-3 sm:-mx-5 sm:px-5">
        <SubmitButton pendingLabel="Kaydediliyor…">Ayarları kaydet</SubmitButton>
        <span className="text-xs font-light text-tfs-dark-60">
          Değişiklikler kaydettiğiniz anda portalda geçerli olur.
        </span>
      </div>
    </form>
  );
}

/** Alt başlıklı çerçeve; başlıksız bölümler çerçevesiz akar. */
function GroupSection({ title, children }: { title: string; children: React.ReactNode }) {
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
function FieldRows({
  keys,
  settings,
  errors,
}: {
  keys: SettingKey[];
  settings: PortalSettings;
  errors: Record<string, string>;
}) {
  const rows: React.ReactNode[] = [];
  let buffer: SettingKey[] = [];
  let bufferKind: "half" | "bool" | null = null;

  function flush(): void {
    if (buffer.length === 0) return;
    const items = buffer.map((key) => (
      <SettingField key={key} name={key} value={settings[key]} error={errors[key]} />
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
      rows.push(<SettingField key={key} name={key} value={settings[key]} error={errors[key]} />);
      continue;
    }

    if (bufferKind !== null && bufferKind !== kind) flush();
    bufferKind = kind;
    buffer.push(key);
  }
  flush();

  return <>{rows}</>;
}
