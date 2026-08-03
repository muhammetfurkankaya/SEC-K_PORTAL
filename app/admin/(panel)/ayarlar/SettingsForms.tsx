"use client";

import { useActionState } from "react";
import { changePasswordAction, resetSettingsAction, saveSettingsAction } from "./actions";
import {
  Alert,
  Field,
  Select,
  SubmitButton,
  SwitchRow,
  TextArea,
  TextInput,
} from "@/components/ui/form";
import { IDLE, type ActionState } from "@/lib/action-state";
import {
  ANNOUNCEMENT_LABELS,
  ANNOUNCEMENT_LEVELS,
  SORT_DESCRIPTIONS,
  SORT_KEYS,
  type PortalSettings,
} from "@/lib/settings-schema";

/** Ayar ekranındaki bölüm başlığı. */
function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-t border-tfs-grey pt-5">
      <legend className="sr-only">{title}</legend>
      <p className="text-xs font-semibold tracking-[0.12em] text-tfs-red uppercase">{title}</p>
      {hint ? <p className="mt-1 text-xs font-light text-tfs-dark-60">{hint}</p> : null}
      <div className="mt-4 space-y-5">{children}</div>
    </fieldset>
  );
}

export function PortalSettingsForm({ settings }: { settings: PortalSettings }) {
  const [state, action] = useActionState(saveSettingsAction, IDLE);
  const errors = state.fieldErrors ?? {};
  const on = (value: string) => value === "1";

  return (
    <form action={action} className="space-y-7">
      {state.message ? (
        <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      {/* ————— Kimlik ————— */}
      <Group title="Portal Kimliği" hint="Üst bantta ve alt bilgide görünen metinler.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Portal adı" htmlFor="portal_title" required hint={errors.portal_title}>
            <TextInput
              id="portal_title"
              name="portal_title"
              defaultValue={settings.portal_title}
              maxLength={80}
              required
            />
          </Field>

          <Field label="Alt başlık" htmlFor="portal_subtitle">
            <TextInput
              id="portal_subtitle"
              name="portal_subtitle"
              defaultValue={settings.portal_subtitle}
              maxLength={120}
            />
          </Field>
        </div>

        <Field
          label="Ana sayfa tanıtım metni"
          htmlFor="home_intro"
          hint="Ana sayfadaki başlığın altında görünür. Boş bırakırsanız gizlenir."
        >
          <TextArea
            id="home_intro"
            name="home_intro"
            rows={2}
            defaultValue={settings.home_intro}
            maxLength={400}
          />
        </Field>

        <Field
          label="Alt bilgi notu"
          htmlFor="footer_note"
          hint="Her sayfanın en altında görünür — ör. iletişim satırı."
        >
          <TextInput
            id="footer_note"
            name="footer_note"
            defaultValue={settings.footer_note}
            maxLength={200}
          />
        </Field>
      </Group>

      {/* ————— QDMS ————— */}
      <Group
        title="QDMS Bildirim Kartları"
        hint="Ana sayfadaki iki bildirim kartının başlığı, açıklaması ve açtığı adres."
      >
        <div className="rounded-brand border border-tfs-grey bg-tfs-grey-20 p-4">
          <p className="mb-4 text-xs font-semibold text-tfs-dark">Öneri kartı</p>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Field
                label="Kart başlığı"
                htmlFor="qdms_suggestion_title"
                required
                hint={errors.qdms_suggestion_title}
              >
                <TextInput
                  id="qdms_suggestion_title"
                  name="qdms_suggestion_title"
                  defaultValue={settings.qdms_suggestion_title}
                  maxLength={60}
                  required
                />
              </Field>
              <Field label="Açıklama" htmlFor="qdms_suggestion_desc">
                <TextInput
                  id="qdms_suggestion_desc"
                  name="qdms_suggestion_desc"
                  defaultValue={settings.qdms_suggestion_desc}
                  maxLength={240}
                />
              </Field>
            </div>
            <Field
              label="Açılacak adres"
              htmlFor="qdms_suggestion_url"
              required
              hint={errors.qdms_suggestion_url}
            >
              <TextInput
                id="qdms_suggestion_url"
                name="qdms_suggestion_url"
                type="url"
                defaultValue={settings.qdms_suggestion_url}
                required
              />
            </Field>
          </div>
        </div>

        <div className="rounded-brand border border-tfs-grey bg-tfs-grey-20 p-4">
          <p className="mb-4 text-xs font-semibold text-tfs-dark">Olay kartı</p>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Field
                label="Kart başlığı"
                htmlFor="qdms_incident_title"
                required
                hint={errors.qdms_incident_title}
              >
                <TextInput
                  id="qdms_incident_title"
                  name="qdms_incident_title"
                  defaultValue={settings.qdms_incident_title}
                  maxLength={60}
                  required
                />
              </Field>
              <Field label="Açıklama" htmlFor="qdms_incident_desc">
                <TextInput
                  id="qdms_incident_desc"
                  name="qdms_incident_desc"
                  defaultValue={settings.qdms_incident_desc}
                  maxLength={240}
                />
              </Field>
            </div>
            <Field
              label="Açılacak adres"
              htmlFor="qdms_incident_url"
              required
              hint={errors.qdms_incident_url}
            >
              <TextInput
                id="qdms_incident_url"
                name="qdms_incident_url"
                type="url"
                defaultValue={settings.qdms_incident_url}
                required
              />
            </Field>
          </div>
        </div>
      </Group>

      {/* ————— Duyuru ————— */}
      <Group
        title="Duyuru Bandı"
        hint="Portalın üstünde tüm sayfalarda görünen şerit. Metin boşsa gösterilmez."
      >
        <Field label="Duyuru metni" htmlFor="announcement">
          <TextArea
            id="announcement"
            name="announcement"
            rows={2}
            defaultValue={settings.announcement}
            maxLength={300}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Duyuru tonu"
            htmlFor="announcement_level"
            hint="Bandın rengini ve dikkat çekme derecesini belirler."
          >
            <Select
              id="announcement_level"
              name="announcement_level"
              defaultValue={settings.announcement_level}
            >
              {ANNOUNCEMENT_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {ANNOUNCEMENT_LABELS[level]}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-end">
            <div className="w-full">
              <SwitchRow
                name="announcement_active"
                label="Duyuru bandı açık"
                description="Kapatırsanız metin silinmez, yalnızca gizlenir."
                defaultChecked={on(settings.announcement_active)}
              />
            </div>
          </div>
        </div>
      </Group>

      {/* ————— Bülten görünümü ————— */}
      <Group title="Bülten Görünümü" hint="Çalışanların bültenleri nasıl gördüğünü belirler.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Ana sayfada gösterilecek bülten sayısı"
            htmlFor="home_recent_count"
            hint={errors.home_recent_count ?? "3 ile 24 arası."}
          >
            <TextInput
              id="home_recent_count"
              name="home_recent_count"
              type="number"
              min={3}
              max={24}
              defaultValue={settings.home_recent_count}
              required
            />
          </Field>

          <Field
            label="Varsayılan sıralama"
            htmlFor="default_sort"
            hint="Bülten listesi ilk açıldığında hangi sıraya göre dizilsin."
          >
            <Select id="default_sort" name="default_sort" defaultValue={settings.default_sort}>
              {SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SORT_DESCRIPTIONS[key]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="rounded-brand border border-tfs-grey px-4">
          <SwitchRow
            name="enable_pdf_preview"
            label="PDF önizlemesi açık"
            description="Bültene tıklayınca sağ tarafta okunabilir önizleme açılır. Kapatırsanız tıklama doğrudan indirir."
            defaultChecked={on(settings.enable_pdf_preview)}
          />
          <SwitchRow
            name="show_download_count"
            label="İndirme sayısını çalışanlara göster"
            description="Kapalıyken sayaç yalnızca yönetim panelinde görünür."
            defaultChecked={on(settings.show_download_count)}
          />
          <SwitchRow
            name="show_surveys_section"
            label="Anket bölümü açık"
            description="Kapatırsanız Anketler sekmesi ve ana sayfadaki anket şeridi gizlenir. QR bağlantısı çalışmaya devam eder."
            defaultChecked={on(settings.show_surveys_section)}
          />
        </div>
      </Group>

      <div className="flex flex-wrap items-center gap-3 border-t border-tfs-grey pt-5">
        <SubmitButton pendingLabel="Kaydediliyor…">Ayarları kaydet</SubmitButton>
        <p className="text-xs font-light text-tfs-dark-60">
          Değişiklikler kaydettiğiniz anda portalda geçerli olur.
        </p>
      </div>
    </form>
  );
}

/** Ayarları varsayılana döndürme — ayrı form, kazara gönderilmesin. */
export function ResetSettingsForm() {
  const [state, action] = useActionState<ActionState, FormData>(
    () => resetSettingsAction(),
    IDLE,
  );

  return (
    <form action={action} className="space-y-3">
      {state.message ? (
        <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}
      <p className="text-sm font-light text-tfs-dark-80">
        Portal adı, QDMS adresleri, duyuru ve görünüm ayarlarının tamamı ilk kurulum
        değerlerine döner. Bültenler, anketler ve şifreniz etkilenmez.
      </p>
      <SubmitButton
        variant="danger"
        pendingLabel="Sıfırlanıyor…"
        confirm="Tüm portal ayarları varsayılan değerlere dönecek. Devam edilsin mi?"
      >
        Ayarları sıfırla
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, IDLE);
  const errors = state.fieldErrors ?? {};

  return (
    // key: başarılı değişiklikten sonra şifre alanları temizlensin.
    <form action={action} key={state.ok ? "temiz" : "form"} className="space-y-4">
      {state.message ? (
        <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <Field label="Mevcut şifre" htmlFor="current" required hint={errors.current}>
        <TextInput
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field label="Yeni şifre" htmlFor="next" required hint={errors.next ?? "En az 8 karakter."}>
        <TextInput id="next" name="next" type="password" autoComplete="new-password" required />
      </Field>

      <Field label="Yeni şifre (tekrar)" htmlFor="repeat" required hint={errors.repeat}>
        <TextInput id="repeat" name="repeat" type="password" autoComplete="new-password" required />
      </Field>

      <div className="border-t border-tfs-grey pt-4">
        <SubmitButton variant="secondary" pendingLabel="Güncelleniyor…">
          Şifreyi değiştir
        </SubmitButton>
      </div>
    </form>
  );
}
