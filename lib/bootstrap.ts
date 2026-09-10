import { getDb } from "@/lib/db";
import { DEFAULT_ADMIN_PASSWORD, hashPassword } from "@/lib/password";
import { countUsers, createUser, getUserByUsername } from "@/lib/db/queries/users";
import { createCategory, getCategoryBySlug } from "@/lib/db/queries/categories";

/**
 * Portalın çalışabilmesi için gereken asgari kayıtları oluşturur.
 *
 * Sunucuda komut satırı erişimi olmayabiliyor: yayına alma yalnızca dosya
 * kopyalayıp IIS'te site açmakla yapılıyor. Bu yüzden "ilk kurulum" bir
 * script'e bırakılamaz; portal ilk açılışta eksikleri kendisi tamamlar.
 *
 * İşlem fikirsizdir (idempotent): var olan hiçbir kayda dokunulmaz, bu
 * yüzden her açılışta çağrılması güvenlidir. Veritabanı şeması `getDb()`
 * tarafından zaten uygulanıyor; burada yalnızca içerik oluşturuluyor.
 */

/** Kullanıcının belirttiği başlangıç sekmeleri. Yenileri panelden eklenir. */
const CATEGORIES = [
  { slug: "sec-k", name: "SEÇ-K Bültenleri", description: "Sağlık, Emniyet, Çevre ve Kalite bültenleri" },
  { slug: "sms", name: "SMS Bültenleri", description: "Emniyet Yönetim Sistemi (SMS) bültenleri" },
  { slug: "iga", name: "İGA Bültenleri", description: "İGA İstanbul Havalimanı bültenleri" },
  { slug: "thy", name: "THY Bültenleri", description: "Türk Hava Yolları bültenleri" },
];

export type BootstrapResult = {
  /** Bu çağrıda oluşturulan sekme sayısı. */
  createdCategories: string[];
  /** Yönetici hesabı bu çağrıda mı oluşturuldu? */
  createdAdmin: boolean;
  /** Oluşturulduysa kullanıcı adı. */
  adminUsername: string | null;
  /** Oluşturulduysa şifre — yalnızca kurulum çıktısında gösterilmek için. */
  adminPassword: string | null;
};

/** Eksik bülten sekmelerini oluşturur, var olanlara dokunmaz. */
function ensureCategories(): string[] {
  const created: string[] = [];

  for (const category of CATEGORIES) {
    if (getCategoryBySlug(category.slug)) continue;
    createCategory(category);
    created.push(category.name);
  }

  return created;
}

/**
 * Yönetici hesabı yoksa oluşturur.
 *
 * Şifre sabittir (bkz. DEFAULT_ADMIN_PASSWORD) ve kurulum belgelerinde
 * yazılıdır; değiştirilene kadar yönetim panelinde uyarı şeridi görünür.
 * SECK_ADMIN_USERNAME / SECK_ADMIN_PASSWORD ile başka değerler verilebilir.
 */
function ensureAdmin(): { created: boolean; username: string | null; password: string | null } {
  const username = process.env.SECK_ADMIN_USERNAME?.trim() || "admin";

  if (getUserByUsername(username)) return { created: false, username: null, password: null };
  // Farklı adla bir hesap zaten varsa yenisini açmıyoruz.
  if (countUsers() > 0) return { created: false, username: null, password: null };

  const password = process.env.SECK_ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;

  createUser({
    username,
    password_hash: hashPassword(password),
    full_name: "Portal Yöneticisi",
  });

  return { created: true, username, password };
}

/**
 * İlk kurulumu tamamlar.
 *
 * Hem `npm run seed` script'i hem de sunucu açılışı (baslat.cjs) bunu
 * çağırır; tek bir yerde durması iki yolun aynı sonucu üretmesini garanti
 * ediyor.
 */
export function bootstrap(): BootstrapResult {
  // getDb() şemayı da uygular; tablolar bu çağrıdan sonra hazır.
  getDb();

  const createdCategories = ensureCategories();
  const admin = ensureAdmin();

  return {
    createdCategories,
    createdAdmin: admin.created,
    adminUsername: admin.username,
    adminPassword: admin.password,
  };
}
