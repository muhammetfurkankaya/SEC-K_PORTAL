import fs from "node:fs";
import path from "node:path";
import { UPLOADS_DIR } from "@/lib/paths";
import { generateFileId } from "@/lib/token";

/** Yüklenebilecek en büyük PDF boyutu. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type SavedFile = { file_name: string; file_path: string; file_size: number };

export class UploadError extends Error {}

/**
 * Yüklenen PDF'i diske kaydeder.
 *
 * Dosya adına güvenmiyoruz: diskteki ad rastgele bir UUID'dir, kullanıcının
 * gördüğü ad ise indirme sırasında bülten numarası ve konusundan üretilir
 * (bkz. app/api/dosya/[id]/route.ts). Bu, yol kaçışı ve aynı adlı dosya
 * çakışmalarını baştan ortadan kaldırır.
 *
 * @param categorySlug Dosyanın konulacağı alt klasör (sekme slug'ı).
 */
export async function savePdf(file: File, categorySlug: string): Promise<SavedFile> {
  if (file.size === 0) {
    throw new UploadError("Dosya boş görünüyor. Lütfen geçerli bir PDF seçin.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `Dosya çok büyük (en fazla ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB olabilir).`,
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // MIME türü istemciden gelir ve değiştirilebilir; dosyanın ilk baytlarını
  // ("%PDF-") doğrulamak gerçek kontrolü sağlar.
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new UploadError("Yalnızca PDF dosyası yükleyebilirsiniz.");
  }

  // Slug yalnızca güvenli karakterler içermeli — klasör adı olarak kullanılıyor.
  const safeSlug = categorySlug.replace(/[^a-z0-9-]/gi, "") || "genel";
  const relative = path.join(safeSlug, `${generateFileId()}.pdf`);
  const absolute = path.join(UPLOADS_DIR, relative);

  await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
  await fs.promises.writeFile(absolute, bytes);

  return {
    file_name: file.name || "bulten.pdf",
    file_path: relative,
    file_size: bytes.length,
  };
}

/**
 * Diskteki bülten dosyasını siler.
 *
 * Dosya bulunamazsa sessizce geçer: veritabanı kaydını silmek asıl işlemdir,
 * eksik bir dosya bunu engellememelidir.
 */
export async function deletePdf(relativePath: string): Promise<void> {
  const absolute = path.resolve(UPLOADS_DIR, relativePath);
  const root = path.resolve(UPLOADS_DIR);

  // Yol kaçışına karşı koruma.
  if (absolute !== root && !absolute.startsWith(root + path.sep)) return;

  try {
    await fs.promises.unlink(absolute);
  } catch {
    // Dosya zaten yok.
  }

  // Kapak görseli PDF'e bağlı: PDF değiştirilince ya da silinince o da gider.
  await deleteCover(relativePath);
}

// ————————————————————————————————————————————————
// Bülten kapak görseli (PDF'in ilk sayfası)
// ————————————————————————————————————————————————

/**
 * Kapak görseli için üst sınır. Görsel yönetim panelinde, tarayıcıda 480 px
 * genişliğinde JPEG olarak üretilir ve ~40-80 KB gelir.
 */
export const MAX_COVER_BYTES = 1024 * 1024;

/** Kapak görsellerinin UPLOADS_DIR altındaki klasörü. */
export const COVER_DIR = "_kapak";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * PDF yolundan kapak yolunu türetir: `sec-k/<uuid>.pdf` → `_kapak/sec-k-<uuid>.jpg`.
 *
 * Veritabanında ayrı bir sütun yok: kapak, PDF'in rastgele adını taşıyor.
 * PDF değiştirildiğinde yeni ad gelir ve eski kapak kendiliğinden geçersiz
 * olur. Yol yalnızca veritabanındaki file_path'ten türetilir, istekten asla.
 * Windows'ta path.join ters bölü kullandığı için iki ayırıcı da kabul edilir.
 */
export function coverPathFor(pdfPath: string): string | null {
  const match = new RegExp(`^([a-z0-9-]+)[\\\\/](${UUID})\\.pdf$`, "i").exec(pdfPath);
  if (!match) return null;
  return `${COVER_DIR}/${match[1].toLowerCase()}-${match[2].toLowerCase()}.jpg`;
}

/** Kapak dosyasının mutlak yolu; türetilemezse ya da kök dışına çıkarsa null. */
export function coverAbsolutePath(pdfPath: string): string | null {
  const relative = coverPathFor(pdfPath);
  if (!relative) return null;
  const root = path.resolve(UPLOADS_DIR);
  const absolute = path.resolve(root, ...relative.split("/"));
  return absolute.startsWith(root + path.sep) ? absolute : null;
}

/**
 * Kapak adresindeki sürüm (önbellek kırıcı): PDF'in rastgele adı + kapak
 * dosyasının değişme zamanı. Kapak sayfası PDF değişmeden de
 * değiştirilebildiği için yalnızca PDF adı yetmiyor — yoksa tarayıcılar
 * "değişmez" diye önbelleğe aldıkları eski kapağı göstermeye devam ederdi.
 */
export function coverVersion(pdfPath: string): string {
  const pdfId = /([0-9a-f-]{36})\.pdf$/i.exec(pdfPath)?.[1].toLowerCase() ?? "";
  const absolute = coverAbsolutePath(pdfPath);
  try {
    return absolute ? `${pdfId}-${Math.round(fs.statSync(absolute).mtimeMs)}` : pdfId;
  } catch {
    return pdfId;
  }
}

export function coverExists(pdfPath: string): boolean {
  const absolute = coverAbsolutePath(pdfPath);
  return absolute ? fs.existsSync(absolute) : false;
}

/**
 * JPEG'in piksel ölçüsünü başlığından (SOF bölümü) okur; dosyanın tamamı
 * çözülmez. Bozuk ya da tanınmayan dosyada null.
 */
export function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    // Uzunluğu olmayan işaretler (dolgu, RST) atlanır.
    if (marker === 0xff || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += marker === 0xff ? 1 : 2;
      continue;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    // SOF0–SOF15 (DHT=C4, JPG=C8, DAC=CC hariç): ölçü burada.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    i += 2 + length;
  }
  return null;
}

/**
 * Kaydedilmiş kapağın piksel ölçüsü — kart, görsel yüklenmeden önce doğru
 * oranda yer ayırsın (sayfa kaymasın) diye. Yalnızca baştaki 64 KB okunur.
 */
export function coverSize(pdfPath: string): { width: number; height: number } | null {
  const absolute = coverAbsolutePath(pdfPath);
  if (!absolute) return null;
  try {
    const handle = fs.openSync(absolute, "r");
    try {
      const head = Buffer.alloc(64 * 1024);
      const read = fs.readSync(handle, head, 0, head.length, 0);
      return jpegSize(head.subarray(0, read));
    } finally {
      fs.closeSync(handle);
    }
  } catch {
    return null;
  }
}

/** Kapak görselini kaydeder (varsa üzerine yazar). Yalnızca JPEG. */
export async function saveCover(pdfPath: string, file: File): Promise<void> {
  if (file.size === 0) throw new UploadError("Kapak görseli boş.");
  if (file.size > MAX_COVER_BYTES) throw new UploadError("Kapak görseli çok büyük.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniffImageType(bytes) !== "jpg") throw new UploadError("Kapak görseli JPEG olmalı.");

  const absolute = coverAbsolutePath(pdfPath);
  if (!absolute) throw new UploadError("Kapak görseli kaydedilemedi.");

  await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
  await fs.promises.writeFile(absolute, bytes);
}

export async function deleteCover(pdfPath: string): Promise<void> {
  const absolute = coverAbsolutePath(pdfPath);
  if (!absolute) return;
  try {
    await fs.promises.unlink(absolute);
  } catch {
    // Dosya zaten yok.
  }
}

// ————————————————————————————————————————————————
// Ana sayfa hero görseli
// ————————————————————————————————————————————————

/**
 * Hero görseli için üst sınır.
 *
 * Görsel normalde yönetim panelinde, tarayıcıda 2000 px'e küçültülüp
 * ~300-400 KB olarak gelir (paket `sharp` içermiyor; küçültmeyi sunucu
 * yapamıyor). 4 MB, JavaScript'in çalışmadığı nadir durum için pay bırakıyor
 * ve `data/` klasörünün şişmesini sınırlıyor.
 */
export const MAX_HERO_BYTES = 4 * 1024 * 1024;

/** Hero görsellerinin UPLOADS_DIR altındaki klasörü. */
export const HERO_DIR = "_gorsel";

export type ImageType = "jpg" | "png" | "webp";

/** Saklanan hero yolunun tek geçerli biçimi: `_gorsel/<uuid>.<uzantı>`. */
export const HERO_PATH_PATTERN =
  /^_gorsel\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/**
 * Dosya türünü İLK BAYTLARDAN tespit eder.
 *
 * İstemcinin bildirdiği MIME türüne ve dosya adına güvenilmez — ikisi de
 * değiştirilebilir. SVG burada bilinçli olarak YOK: SVG bir görsel değil
 * etkin bir belgedir, içine betik konabilir ve kendi adresimizden sunulduğu
 * için tarayıcı onu çalıştırırdı.
 */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "png";
  }
  if (
    b.length >= 12 &&
    String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" &&
    String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export const IMAGE_CONTENT_TYPES: Record<ImageType, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Saklanan göreli yolu (`_gorsel/x.jpg`) diskteki mutlak yola çevirir. */
export function heroAbsolutePath(relative: string): string | null {
  if (!HERO_PATH_PATTERN.test(relative)) return null;
  const root = path.resolve(UPLOADS_DIR);
  const absolute = path.resolve(root, ...relative.split("/"));
  // Desen zaten kaçışı imkânsız kılıyor; bu ikinci kilit.
  return absolute.startsWith(root + path.sep) ? absolute : null;
}

/**
 * Hero görselini kaydeder ve öncekini siler.
 *
 * Her kayıt YENİ bir UUID alır ve eski dosya aynı çağrıda silinir. Bu iki
 * kural birlikte önemli: görsel adresi içerikle eşleştiği için sunucu onu
 * "değişmez" olarak önbelleğe aldırıyor (bkz. app/api/gorsel). Aynı ad yeniden
 * kullanılsaydı ziyaretçiler eski görseli görmeye devam ederdi; eski dosya
 * silinmeseydi her değişimde `data/` büyürdü.
 */
export async function saveHeroImage(
  file: File,
  previousPath?: string | null,
): Promise<{ path: string; size: number }> {
  if (file.size === 0) {
    throw new UploadError("Görsel boş görünüyor.");
  }
  if (file.size > MAX_HERO_BYTES) {
    throw new UploadError(
      `Görsel çok büyük (en fazla ${MAX_HERO_BYTES / 1024 / 1024} MB). Panelden yüklerseniz otomatik küçültülür.`,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) {
    throw new UploadError("Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz.");
  }

  const relative = `${HERO_DIR}/${generateFileId()}.${type}`;
  const absolute = heroAbsolutePath(relative);
  if (!absolute) throw new UploadError("Görsel kaydedilemedi.");

  await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
  await fs.promises.writeFile(absolute, bytes);

  if (previousPath) await deleteHeroImage(previousPath);

  return { path: relative, size: bytes.length };
}

/** Hero görselini siler; yol geçersizse ya da dosya yoksa sessizce geçer. */
export async function deleteHeroImage(relative: string): Promise<void> {
  const absolute = heroAbsolutePath(relative);
  if (!absolute) return;
  try {
    await fs.promises.unlink(absolute);
  } catch {
    // Dosya zaten yok.
  }
}

/**
 * Bir görsel isteğinin sunulup sunulmayacağına karar verir.
 *
 * Üç bağımsız koruma, hepsi birden:
 *   1. her yol parçası yalnızca güvenli karakterlerden oluşur, `..` olamaz;
 *   2. birleşik yol `_gorsel/<uuid>.<uzantı>` desenine birebir uyar;
 *   3. yol, ayarlarda KAYITLI olan hero görseli olmalı.
 * Üçüncüsü asıl koruma: rota "bu klasördeki her şeyi" değil, yalnızca bir
 * yöneticinin yayımladığı görseli sunar. Eskiden kalmış bir dosya bile
 * sunulmaz.
 *
 * Saf fonksiyon: testlerden doğrudan çağrılabilsin diye ayarı okumaz,
 * kayıtlı yolu parametre olarak alır.
 */
export function resolveHeroRequest(
  segments: readonly string[],
  storedPath: string,
): { absolute: string; type: ImageType } | null {
  if (segments.length === 0) return null;
  if (segments.some((part) => part === ".." || part === "." || !/^[A-Za-z0-9._-]+$/.test(part))) {
    return null;
  }

  const relative = segments.join("/");
  if (!HERO_PATH_PATTERN.test(relative)) return null;
  if (relative !== storedPath) return null;

  const absolute = heroAbsolutePath(relative);
  if (!absolute) return null;

  const type = relative.slice(relative.lastIndexOf(".") + 1) as ImageType;
  return { absolute, type };
}
