"use client";

import { useActionState } from "react";
import { Alert, Field, SubmitButton, TextInput } from "@/components/ui/form";
import { IDLE, type ActionState } from "@/lib/action-state";
import { changePasswordAction } from "./actions";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, IDLE);
  const errors = state.fieldErrors ?? {};

  return (
    // key: başarılı değişiklikten sonra şifre alanları temizlensin.
    <form action={action} key={state.ok ? "temiz" : "form"} className="space-y-4">
      {state.message ? <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert> : null}

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

      <div className="border-t border-line pt-4">
        <SubmitButton variant="secondary" pendingLabel="Güncelleniyor…">
          Şifreyi değiştir
        </SubmitButton>
      </div>
    </form>
  );
}
