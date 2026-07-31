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
}
