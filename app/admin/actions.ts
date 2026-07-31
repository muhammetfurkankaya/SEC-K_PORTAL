"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { authenticate, endSession, startSession } from "@/lib/auth";
import { logAction } from "@/lib/db/queries/audit";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { fail, type ActionState } from "@/lib/action-state";

const LoginSchema = z.object({
  username: z.string().trim().min(1, "Kullanıcı adını girin."),
  password: z.string().min(1, "Şifrenizi girin."),
});

/** İstemcinin IP adresini ters vekil başlıklarından okur. */
async function clientIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return store.get("x-real-ip") ?? "bilinmiyor";
}

export async function loginAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return fail("Kullanıcı adı ve şifre zorunludur.");
  }

  // Kaba kuvvet denemelerini yavaşlat: 5 dakikada en fazla 8 deneme.
  const key = `giris:${await clientIp()}:${parsed.data.username.toLocaleLowerCase("tr")}`;
  const limit = checkRateLimit(key, 8, 5 * 60 * 1000);
  if (!limit.allowed) {
    return fail(
      `Çok fazla hatalı deneme yapıldı. ${limit.retryAfterSeconds} saniye sonra tekrar deneyin.`,
    );
  }

  const user = authenticate(parsed.data.username, parsed.data.password);
  if (!user) {
    logAction(null, "giris.basarisiz", { detail: parsed.data.username });
    // Hangi bilginin yanlış olduğunu söylemiyoruz.
    return fail("Kullanıcı adı veya şifre hatalı.");
  }

  resetRateLimit(key);
  await startSession(user);
  logAction(user, "giris.basarili");

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/admin/giris");
}
