"use client";

import { useActionState } from "react";
import { changePasswordAction, saveSettingsAction } from "./actions";
import { Alert, Field, SubmitButton, TextArea, TextInput } from "@/components/ui/form";
import { IDLE } from "@/lib/action-state";
import type { SETTING_DEFAULTS } from "@/lib/db/queries/settings";

type Settings = Record<keyof typeof SETTING_DEFAULTS, string>;

export function PortalSettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState(saveSettingsAction, IDLE);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5">
      {state.message ? (
        <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

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

        <Field label="Portal alt başlığı" htmlFor="portal_subtitle">
          <TextInput
            id="portal_subtitle"
            name="portal_subtitle"
            defaultValue={settings.portal_subtitle}
            maxLength={120}
          />
        </Field>
      </div>

      <Field
        label="QDMS — Öneri Bildirim adresi"
        htmlFor="qdms_suggestion_url"
        required
        hint={errors.qdms_suggestion_url ?? "Ana sayfadaki Öneri Bildirim kartının açtığı adres."}
      >
        <TextInput
          id="qdms_suggestion_url"
          name="qdms_suggestion_url"
          type="url"
          defaultValue={settings.qdms_suggestion_url}
          required
        />
      </Field>

      <Field
        label="QDMS — Olay Bildirim adresi"
        htmlFor="qdms_incident_url"
        required
        hint={
          errors.qdms_incident_url ??
          "QDMS'te olay bildirimi için ayrı bir adres varsa buraya girin."
        }
      >
        <TextInput
          id="qdms_incident_url"
          name="qdms_incident_url"
          type="url"
          defaultValue={settings.qdms_incident_url}
          required
        />
      </Field>

      <Field
        label="Duyuru bandı"
        htmlFor="announcement"
        hint="Doldurulursa portalın üstünde kırmızı bir duyuru şeridi görünür. Boş bırakırsanız gizlenir."
      >
        <TextArea
          id="announcement"
          name="announcement"
          rows={2}
          defaultValue={settings.announcement}
          maxLength={300}
        />
      </Field>

      <div className="border-t border-tfs-grey pt-4">
        <SubmitButton pendingLabel="Kaydediliyor…">Ayarları kaydet</SubmitButton>
      </div>
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

      <Field
        label="Yeni şifre"
        htmlFor="next"
        required
        hint={errors.next ?? "En az 8 karakter."}
      >
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
