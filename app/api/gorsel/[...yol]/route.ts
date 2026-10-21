import fs from "node:fs";
import { NextResponse } from "next/server";
import { getRawSettings } from "@/lib/db/queries/settings";
import { IMAGE_CONTENT_TYPES, resolveHeroRequest } from "@/lib/uploads";

/**
 * Panelden yüklenen ana sayfa görselini sunar.
 *
 *   /api/gorsel/_gorsel/<uuid>.jpg
 *
 * Görseller `data/` altında, `public/` dışında duruyor: çalışan bir
 * standalone sunucu, derlemeden sonra public/'e eklenen dosyaları görmez ve
 * IIS altında public/ klasörü uygulama havuzuna yazılabilir değil.
 *
 * Önbellek: adres UUID ile içerikle eşleşiyor — görsel değişince adres de
 * değişiyor (bkz. saveHeroImage). Bu yüzden tarayıcıya "bu dosya hiç
 * değişmez" denebiliyor; tekrar eden ziyaretlerde sayfanın en ağır öğesi
 * hiç indirilmiyor.
 */
export async function GET(request: Request, { params }: { params: Promise<{ yol: string[] }> }) {
  const { yol } = await params;
  const target = resolveHeroRequest(yol, getRawSettings().home_hero_path);
  if (!target) {
    return new NextResponse("Görsel bulunamadı", { status: 404 });
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(target.absolute);
    if (!stat.isFile()) throw new Error("dosya değil");
  } catch {
    return new NextResponse("Görsel bulunamadı", { status: 404 });
  }

  const etag = `"${Math.trunc(stat.mtimeMs).toString(36)}-${stat.size.toString(36)}"`;
  const headers = {
    "Content-Type": IMAGE_CONTENT_TYPES[target.type],
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  };

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers });
  }

  const file = await fs.promises.readFile(target.absolute);
  return new NextResponse(new Uint8Array(file), {
    headers: { ...headers, "Content-Length": String(stat.size) },
  });
}
