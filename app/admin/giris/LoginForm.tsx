"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";
import { Alert, Field, SubmitButton, TextInput } from "@/components/ui/form";
import { IDLE } from "@/lib/action-state";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, IDLE);

  return (
    <form action={action} className="space-y-4">
      {state.message ? <Alert kind="error">{state.message}</Alert> : null}

      <Field label="Kullanıcı adı" htmlFor="username" required>
        <TextInput
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          autoFocus
        />
      </Field>

      <Field label="Şifre" htmlFor="password" required>
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Giriş yapılıyor…">
        Giriş yap
      </SubmitButton>
    </form>
  );
}
