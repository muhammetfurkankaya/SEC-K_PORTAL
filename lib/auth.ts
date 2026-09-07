import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DATA_DIR } from "@/lib/paths";
import { getUserById, getUserByUsername, touchLastLogin } from "@/lib/db/queries/users";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { SessionUser } from "@/lib/types";

const COOKIE_NAME = "seck_session";
const SESSION_HOURS = 8;

export { hashPassword, verifyPassword };

// ————————————————————————————————— Oturum imzası —————————————————————————————————

let cachedSecret: Buffer | null = null;

/**
 * Oturum cookie'sini imzalamak için kullanılan gizli anahtar.
 *
 * Üretimde SECK_SESSION_SECRET ortam değişkeni ile verilmelidir. Verilmezse
 * data/ altında rastgele bir anahtar üretilip saklanır; böylece geliştirme
 * ortamında ek yapılandırma gerekmez ve sunucu yeniden başladığında
 * oturumlar geçersiz olmaz.
 */
function getSecret(): Buffer {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.SECK_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    cachedSecret = Buffer.from(fromEnv, "utf8");
    return cachedSecret;
  }

  const secretFile = path.join(DATA_DIR, "session-secret");
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (fs.existsSync(secretFile)) {
    cachedSecret = Buffer.from(fs.readFileSync(secretFile, "utf8").trim(), "base64");
  } else {
    const generated = crypto.randomBytes(48);
    fs.writeFileSync(secretFile, generated.toString("base64"), { mode: 0o600 });
    cachedSecret = generated;
  }
  return cachedSecret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

type TokenPayload = SessionUser & { exp: number; pv?: string };

/**
 * Şifreye bağlı oturum damgası.
 *
 * Cookie imzalı olduğu için kurcalanamaz, ancak şifre değiştirildiğinde eski
 * cookie'ler kendiliğinden geçersiz olmaz — 8 saat boyunca çalışmaya devam
 * ederdi. Kurulum varsayılan şifresi belgelerde yazılı olduğundan bu önemli:
 * şifreyi değiştiren kişi, o şifreyle açılmış oturumların da kapanmasını
 * bekler. Damga şifre karmasından türetildiği için şifre değişince değişir.
 */
function passwordStamp(passwordHash: string): string {
  return crypto.createHmac("sha256", getSecret()).update(passwordHash).digest("base64url").slice(0, 16);
}

function createToken(user: SessionUser, passwordHash: string): string {
  const payload: TokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
    pv: passwordStamp(passwordHash),
  };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function readToken(token: string): TokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ————————————————————————————————— Oturum işlemleri —————————————————————————————————

/**
 * Kullanıcı adı ve şifreyi doğrular.
 *
 * Kullanıcı bulunamasa bile karşılaştırma yapılır; böylece var olmayan
 * kullanıcı ile yanlış şifre arasındaki yanıt süresi farkından kullanıcı
 * adı tahmin edilemez.
 */
export function authenticate(username: string, password: string): SessionUser | null {
  const user = getUserByUsername(username.trim());
  const hash = user?.password_hash ?? hashPassword("gecersiz-parola-yer-tutucu");

  if (!verifyPassword(password, hash) || !user) return null;

  // Pasife alınmış hesap giriş yapamaz. Şifre doğrulamasından sonra
  // kontrol ediyoruz: aksi halde yanıt süresi hesabın durumunu sızdırır.
  if (user.is_active !== 1) return null;

  touchLastLogin(user.id);
  return { id: user.id, username: user.username, role: user.role };
}

/**
 * Oturum cookie'sini yazar.
 *
 * Şifre karması cookie'ye damga olarak gömülür (bkz. passwordStamp); şifre
 * değiştiğinde eski oturumlar geçersiz olur.
 */
export async function startSession(user: SessionUser): Promise<void> {
  const record = getUserById(user.id);
  if (!record) return;

  const store = await cookies();
  store.set(COOKIE_NAME, createToken(user, record.password_hash), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
    // Intranette portal HTTP üzerinden yayınlanabileceği için varsayılan
    // olarak kapalı. HTTPS ile yayınlarken SECK_SECURE_COOKIE=true yapın.
    secure: process.env.SECK_SECURE_COOKIE === "true",
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Geçerli oturumdaki kullanıcıyı verir; yoksa null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = readToken(token);
  if (!payload) return null;

  // Kullanıcı silinmiş veya pasife alınmış olabilir — veritabanından doğrula.
  const user = getUserById(payload.id);
  if (!user || user.is_active !== 1) return null;

  // Şifre değiştiyse bu cookie ile açılmış oturum artık geçerli değil.
  // Damgası olmayan cookie'ler bu sürümden önce yazılmış olabilir; onları da
  // geçersiz sayıyoruz ki eski oturumlar kontrolü atlayamasın.
  const stamp = passwordStamp(user.password_hash);
  if (!payload.pv || payload.pv !== stamp) return null;

  return { id: user.id, username: user.username, role: user.role };
}

/**
 * Korumalı sayfa ve Server Action'lar için giriş zorunluluğu.
 *
 * Yalnızca sayfa yerleşimine güvenmiyoruz: her Server Action bu fonksiyonu
 * çağırarak kendi yetkisini doğrular.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/giris");
  return user;
}

/**
 * Anket tekrar doldurmayı sınırlamak için IP adresini karmalar.
 *
 * Ham IP saklamıyoruz; oturum anahtarıyla karmalanmış değer aynı cihazı
 * tanımaya yeterli, kişiyi belirlemeye yetmez.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return crypto.createHmac("sha256", getSecret()).update(ip).digest("hex").slice(0, 32);
}
