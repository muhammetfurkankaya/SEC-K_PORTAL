"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveCoverAction } from "@/app/admin/(panel)/bultenler/actions";
import { renderCoverJpeg } from "@/lib/pdfjs-client";

/**
 * Kapak görseli olmayan bültenler için toplu üretim.
 *
 * Kapaklar yeni yüklemede kendiliğinden üretiliyor; bu kutu, özellik
 * gelmeden önce yüklenmiş bültenler içindir. Her PDF bu tarayıcıda indirilip
 * ilk sayfası çizilir ve sunucuya küçük bir JPEG olarak gönderilir — sunucu
 * görüntü işlemez.
 */
export function CoverBackfill({ missing }: { missing: { id: number; label: string }[] }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);

  if (missing.length === 0) return null;

  async function run(): Promise<void> {
    setRunning(true);
    setDone(0);
    setFailed([]);
    const errors: string[] = [];

    for (const item of missing) {
      try {
        const blob = await renderCoverJpeg(`/api/dosya/${item.id}`);
        const formData = new FormData();
        formData.set("id", String(item.id));
        formData.set("kapak", blob, "kapak.jpg");
        const result = await saveCoverAction(formData);
        if (!result.ok) errors.push(item.label);
      } catch {
        errors.push(item.label);
      }
      setDone((count) => count + 1);
    }

    setFailed(errors);
    setRunning(false);
    router.refresh();
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-brand border border-line bg-surface px-4 py-3">
      <div className="text-sm text-ink">
        <p>
          <span className="font-semibold">{missing.length} bültenin</span> kapak görseli yok. Ana
          sayfada "Yalnızca kart" görünümünde PDF'in ilk sayfası kapak olarak gösterilir.
        </p>
        {running ? (
          <p className="tnum mt-1 text-xs text-ink-faint">
            Hazırlanıyor… {done} / {missing.length}
          </p>
        ) : failed.length > 0 ? (
          <p className="mt-1 text-xs text-accent-ink">Üretilemeyenler: {failed.join(", ")}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => void run()}
        disabled={running}
        className="rounded-brand border border-line-strong bg-surface-3 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-tfs-red disabled:opacity-60"
      >
        {running ? "Oluşturuluyor…" : "Kapakları oluştur"}
      </button>
    </div>
  );
}
