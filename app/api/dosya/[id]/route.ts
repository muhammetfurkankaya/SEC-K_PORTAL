import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getPublishedBulletin, incrementDownloadCount } from "@/lib/db/queries/bulletins";
import { UPLOADS_DIR } from "@/lib/paths";

/**
 * Bülten PDF'lerini servis eder.
 *
 *   /api/dosya/12            → tarayıcıda göster (iframe içinde)
 *   /api/dosya/12?mod=indir  → indirme olarak sun
 *
 * Dosyalar public/ dışında tutulduğu için erişim buradan geçer; bu sayede
 * indirme adını bültenin konusundan üretebiliyor, yayından kaldırılmış
 * bültenleri engelleyebiliyor ve indirme sayacını tutabiliyoruz.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bulletinId = Number(id);

  if (!Number.isInteger(bulletinId) || bulletinId <= 0) {
    return new NextResponse("Geçersiz bülten numarası", { status: 400 });
  }

  const bulletin = getPublishedBulletin(bulletinId);
  if (!bulletin) {
    return new NextResponse("Bülten bulunamadı", { status: 404 });
  }

  // Yol kaçışına karşı koruma: çözümlenen yol uploads klasörünün içinde kalmalı.
  const absolute = path.resolve(UPLOADS_DIR, bulletin.file_path);
  const uploadsRoot = path.resolve(UPLOADS_DIR);
  if (absolute !== uploadsRoot && !absolute.startsWith(uploadsRoot + path.sep)) {
    return new NextResponse("Geçersiz dosya yolu", { status: 400 });
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(absolute);
    if (!stat.isFile()) throw new Error("dosya değil");
  } catch {
    return new NextResponse("Dosya sunucuda bulunamadı", { status: 404 });
  }

  const download = new URL(request.url).searchParams.get("mod") === "indir";
  if (download) incrementDownloadCount(bulletin.id);

  const file = await fs.promises.readFile(absolute);
  const filename = buildFileName(bulletin.bulletin_no, bulletin.subject);

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(stat.size),
      "Content-Disposition": contentDisposition(download ? "attachment" : "inline", filename),
      // Bülten dosyası değişmez; kısa süreli önbellek yeterli ve güvenli.
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** "SEÇ-K-2026-01 - Yakıt İkmali.pdf" gibi anlamlı bir indirme adı üretir. */
function buildFileName(bulletinNo: string, subject: string): string {
  const clean = (value: string) =>
    value
      // Dosya adında sorun çıkaran karakterleri ayıkla.
      .replace(/[\\/:*?"<>|\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const base = `${clean(bulletinNo)} - ${clean(subject)}`.slice(0, 120).trim();
  return `${base || "bulten"}.pdf`;
}

/**
 * Content-Disposition başlığını oluşturur.
 *
 * Türkçe karakterler ASCII olmayan baytlar içerdiğinden RFC 5987'ye uygun
 * `filename*` biçimini de veriyoruz; eski tarayıcılar için ASCII'ye
 * indirgenmiş bir yedek ad bırakıyoruz.
 */
function contentDisposition(type: "inline" | "attachment", filename: string): string {
  const asciiFallback = filename
    .normalize("NFKD")
    // Diyakritikleri at, kalan ASCII dışı karakterleri alt çizgi yap.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");

  return [
    type,
    `filename="${asciiFallback}"`,
    `filename*=UTF-8''${encodeURIComponent(filename)}`,
  ].join("; ");
}
