import fs from "node:fs";
import { NextResponse } from "next/server";
import { getPublishedBulletin } from "@/lib/db/queries/bulletins";
import { coverAbsolutePath, coverVersion } from "@/lib/uploads";

/**
 * Bülten kapak görselini (PDF'in ilk sayfası) sunar.
 *
 *   /api/kapak/12?v=<pdf-adı>
 *
 * Dosya yolu istekten DEĞİL, yalnızca veritabanındaki file_path'ten türetilir;
 * yayında olmayan bültenin kapağı sunulmaz. `v` güncel PDF'in adıyla
 * eşleşiyorsa adres içerikle birebir bağlı demektir ve görsel uzun süre
 * önbelleğe alınabilir: PDF değişirse adres de değişir.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bulletinId = Number(id);
  if (!Number.isInteger(bulletinId) || bulletinId <= 0) {
    return new NextResponse("Geçersiz bülten numarası", { status: 400 });
  }

  const bulletin = getPublishedBulletin(bulletinId);
  const absolute = bulletin ? coverAbsolutePath(bulletin.file_path) : null;
  if (!bulletin || !absolute) return new NextResponse("Bulunamadı", { status: 404 });

  let file: Buffer;
  try {
    file = await fs.promises.readFile(absolute);
  } catch {
    return new NextResponse("Kapak görseli yok", { status: 404 });
  }

  const version = coverVersion(bulletin.file_path);
  const pinned = new URL(request.url).searchParams.get("v") === version;

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(file.length),
      "Cache-Control": pinned ? "public, max-age=31536000, immutable" : "public, max-age=300",
      ETag: `"${version}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
