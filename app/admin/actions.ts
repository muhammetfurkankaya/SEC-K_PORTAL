"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { authenticate, endSession, startSession } from "@/lib/auth";
import { pickClientIp } from "@/lib/client-ip";
import { logAction } from "@/lib/db/queries/audit";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { fail, type ActionState } from "@/lib/action-state";

const LoginSchema = z.object({
  username: z.string().trim().min(1, "Kullanıcı adını girin."),
  password: z.string().min(1, "Şifrenizi girin."),
});

/**
 * İstemcinin IP adresini ters vekil başlıklarından okur.
 *
 * pickClientIp, vekilin kendi adresini (IIS arkasında her istekte görünen
 * 127.0.0.1) istemci saymaz; okunamadığında sabit bir etiket dönüyoruz, yani
 * hız sınırı o durumda kullanıcı adı başına uygulanır.
 */
async function clientIp(): Promise<string> {
  const store = await headers();
  return pickClientIp(store.get("x-forwarded-for"), store.get("x-real-ip")) ?? "bilinmiyor";
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

  // Sınır aşıldığında hesabı KİLİTLEMİYORUZ, denemeyi yavaşlatıyoruz.
  //
  // Kilitleme, ters vekil arkasında istemci adresi okunamadığında (bkz.
  // clientIp) hizmet engellemeye dönüşür: sınır tüm istekler için tek kovaya
  // düştüğü için herhangi biri 8 hatalı denemeyle yöneticiyi 5 dakika dışarıda
  // bırakabilirdi. Doğru şifreyi bilen kişi her hâlükârda girebilir; şifreyi
  // bilmeyen için her deneme yavaşlar ve scrypt'in kendi maliyeti de eklenir.
  if (!limit.allowed) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const user = authenticate(parsed.data.username, parsed.data.password);
  if (!user) {
    logAction(null, "giris.basarisiz", { detail: parsed.data.username });

    if (!limit.allowed) {
      return fail(
        `Çok fazla hatalı deneme yapıldı. ${limit.retryAfterSeconds} saniye sonra tekrar deneyin.`,
      );
    }
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
