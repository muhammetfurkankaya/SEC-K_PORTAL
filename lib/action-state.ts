/**
 * Server Action'ların istemciye döndürdüğü ortak sonuç tipi.
 *
 * useActionState ile birlikte kullanılır: formlar başarı/hata mesajını
 * doğrudan bu nesneden okur.
 */
export type ActionState = {
  ok: boolean;
  message?: string;
  /** Alan bazlı doğrulama hataları (alan adı → mesaj). */
  fieldErrors?: Record<string, string>;
};

export const IDLE: ActionState = { ok: false };

export function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, message, fieldErrors };
}

export function succeed(message: string): ActionState {
  return { ok: true, message };
}

/**
 * Zod hata nesnesini alan bazlı mesaj sözlüğüne çevirir.
 *
 * Sadece ilk hatayı gösteriyoruz; kullanıcı için tek ve net bir mesaj,
 * aynı alan için sıralanmış birden fazla mesajdan daha anlaşılır.
 */
export function zodFieldErrors(error: {
  issues: { path: (string | number)[]; message: string }[];
}): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
