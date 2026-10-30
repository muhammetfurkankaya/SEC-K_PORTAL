/**
 * Üst menünün fotoğrafın ÜZERİNDE saydam durduğu sayfalar: ana sayfa ve
 * bülten sekmeleri (ikisi de fotoğraflı hero ile başlar). Arama, anketler
 * ve diğer sayfalar koyu şerit + sade başlıkla çalışır.
 */
export function isPhotoRoute(pathname: string): boolean {
  return pathname === "/" || /^\/bultenler\/[^/]+\/?$/.test(pathname);
}
