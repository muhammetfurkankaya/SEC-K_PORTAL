"use client";

import { useActionState } from "react";
import { Alert, Field, SubmitButton, TextInput } from "@/components/ui/form";
import { IDLE, type ActionState } from "@/lib/action-state";
import { resetSettingsAction } from "./actions";

/** Ayarları varsayılana döndürme — ayrı form, kazara gönderilmesin. */
export function ResetSettingsForm() {
  const [state, action] = useActionState<ActionState, FormData>(() => resetSettingsAction(), IDLE);

  return (
    <form action={action} className="space-y-3">
      {state.message ? <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert> : null}
      <p className="text-sm font-light text-tfs-dark-80">
        Portal metinleri, punto ve renk seçimleri, ana sayfa yerleşimi, duyuru ve bülten görünümü
        ayarlarının tamamı ilk kurulum değerlerine döner. Bültenler, anketler ve şifreniz
        etkilenmez.
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
