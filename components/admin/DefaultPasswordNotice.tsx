import Link from "next/link";
import { getUserById } from "@/lib/db/queries/users";
import { isDefaultPassword } from "@/lib/password";

/**
 * Varsayılan şifre hâlâ kullanımdaysa uyarı şeridi.
 *
 * Kurulum varsayılan bir şifreyle geliyor ve bu şifre kurulum belgelerinde
 * açıkça yazılı; yani değiştirilmediği sürece portala şirket ağındaki herkes
 * yönetici olarak girebilir. Uyarıyı panelin yerleşimine koyuyoruz ki hangi
 * ekranda olursa olsun görünsün ve şifre değiştirilince kendiliğinden kaybolsun.
 */
export function DefaultPasswordNotice({ userId }: { userId: number }) {
  const user = getUserById(userId);
  if (!user || !isDefaultPassword(user.password_hash)) return null;

  return (
    <div className="border-b-2 border-tfs-red bg-tfs-red/10 print-hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-6 lg:px-8">
        <span className="text-xs font-bold tracking-wide text-tfs-red uppercase">Güvenlik</span>
        <p className="text-sm text-tfs-dark">
          <strong className="font-semibold">{user.username}</strong> hesabı hâlâ kurulumla gelen
          varsayılan şifreyi kullanıyor. Bu şifre kurulum belgelerinde yazılı — değiştirene kadar
          portala herkes yönetici olarak girebilir.
        </p>
        <Link
          href="/admin/ayarlar/sifre"
          className="rounded-brand bg-tfs-red px-3 py-1.5 text-xs font-semibold tracking-wide text-white uppercase transition-colors hover:bg-tfs-dark"
        >
          Şifreyi değiştir
        </Link>
      </div>
    </div>
  );
}
