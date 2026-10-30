"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-state";
import { removeHeroAction, uploadHeroAction } from "@/app/admin/(panel)/ayarlar/hero-actions";

/** Tarayıcıda küçültülecek en büyük genişlik. */
const MAX_WIDTH = 2000;
/** Bunun altındaki görseller geniş ekranda yumuşak görünür; uyarılır. */
const MIN_RECOMMENDED_WIDTH = 1600;
/** lib/hero.ts'teki eşikle aynı: üstündeyse güçlü perde. */
const BRIGHT_THRESHOLD = 150;

type Prepared = {
  blob: Blob;
  previewUrl: string;
  blur: string;
  brightness: number;
  width: number;
  height: number;
  originalKb: number;
};

/**
 * Ana sayfa görseli seçici.
 *
 * SUNUCU GÖRSEL İŞLEYEMİYOR: paket `sharp` içermiyor (IIS paketinden bilerek
 * çıkarılıyor). Bu yüzden işin tamamı tarayıcıda yapılıyor:
 *   - görsel 2000 px genişliğe küçültülüp JPEG'e çevriliyor (~300-400 KB);
 *   - 20 px'lik bulanık bir kopya, sayfa açılırken fotoğraf inene kadar
 *     gösterilmek üzere çıkarılıyor (~600 bayt);
 *   - yazının oturacağı alt bandın parlaklığı ölçülüyor; parlak bir
 *     fotoğrafta beyaz yazının okunabilmesi için güçlü perde seçiliyor.
 * Sunucu yine de her şeyi baştan doğruluyor (bkz. lib/uploads.ts).
 *
 * Kendi <form>'u yok: büyük ayar formunun içinde duruyor ve formlar iç içe
 * olamaz. Sunucu eylemi doğrudan çağrılıyor; görsel "Yükle"ye basıldığı an
 * yayına giriyor, "Ayarları kaydet"i beklemiyor.
 */
export function HeroImagePicker({
  currentSrc,
  uploaded,
  title,
  strongScrim,
}: {
  /** Şu an ana sayfada görünen görsel (yoksa marka gradyanı). */
  currentSrc: string | null;
  /** Görsel panelden mi yüklendi — "Kaldır" yalnızca o zaman anlamlı. */
  uploaded: boolean;
  /** Önizlemede gösterilecek gerçek başlık. */
  title: string;
  strongScrim: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionState | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pending, startTransition] = useTransition();

  // Önizleme adresi bırakılmazsa her seçimde bellek sızar.
  useEffect(() => {
    return () => {
      if (prepared) URL.revokeObjectURL(prepared.previewUrl);
    };
  }, [prepared]);

  async function handleFile(file: File | undefined): Promise<void> {
    setError(null);
    setResult(null);
    if (!file) return;

    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Yalnızca JPEG, PNG veya WebP görsel seçebilirsiniz.");
      return;
    }

    setPreparing(true);
    try {
      setPrepared(await prepareImage(file));
    } catch {
      setError("Görsel okunamadı. Başka bir dosya deneyin.");
    } finally {
      setPreparing(false);
    }
  }

  function upload(): void {
    if (!prepared) return;
    const data = new FormData();
    data.set("gorsel", new File([prepared.blob], "hero.jpg", { type: "image/jpeg" }));
    data.set("blur", prepared.blur);
    data.set("parlaklik", String(prepared.brightness));

    startTransition(async () => {
      const state = await uploadHeroAction(data);
      setResult(state);
      if (state.ok) {
        setPrepared(null);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      }
    });
  }

  function remove(): void {
    if (!window.confirm("Yüklenen görsel kaldırılsın mı? Ana sayfa paketle gelen görsele döner.")) {
      return;
    }
    startTransition(async () => {
      const state = await removeHeroAction();
      setResult(state);
      if (state.ok) router.refresh();
    });
  }

  const showing = prepared
    ? { src: prepared.previewUrl, strong: prepared.brightness > BRIGHT_THRESHOLD }
    : { src: currentSrc, strong: strongScrim };

  return (
    <div className="rounded-brand border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-2.5">
        <span className="text-xs font-semibold text-ink">
          {prepared ? "Yeni görsel — henüz yüklenmedi" : "Ana sayfa görseli"}
        </span>
        <span className="text-[0.6875rem] font-light text-ink-faint">
          {prepared
            ? `${prepared.width}×${prepared.height} px · ${Math.round(prepared.blob.size / 1024)} KB (aslı ${prepared.originalKb} KB)`
            : uploaded
              ? "Panelden yüklendi"
              : currentSrc
                ? "Paketle gelen görsel"
                : "Fotoğrafsız — marka gradyanı"}
        </span>
      </div>

      {/* Gerçek kompozisyon: aynı perde, aynı beyaz başlık. Yazının okunup
          okunmayacağı yüklemeden ÖNCE görülsün. */}
      {/* Ana sayfanın tam ekran düzeni: 16:9, menü fotoğrafın üstünde, başlık
          ortada. */}
      <div className="relative isolate aspect-[16/9] overflow-hidden bg-tfs-dark">
        {showing.src ? (
          /* eslint-disable-next-line @next/next/no-img-element -- önizleme */
          <img src={showing.src} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div aria-hidden="true" className="hero-brand absolute inset-0" />
        )}
        {showing.src ? (
          <div
            aria-hidden="true"
            className={`absolute inset-0 ${
              showing.strong ? "hero-scrim-center-strong" : "hero-scrim-center"
            }`}
          />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 flex gap-4 border-b border-white/15 px-4 py-2.5 text-[0.625rem] text-white/80"
        >
          <span className="border-b-2 border-tfs-red pb-1 font-semibold text-white">Ana Sayfa</span>
          <span>Bültenler</span>
          <span>Anketler</span>
        </div>
        <p className="hero-ink absolute inset-x-6 top-1/2 -translate-y-1/3 text-center text-[1.5rem] leading-[1.1] font-semibold tracking-[-0.02em] break-words text-white sm:text-[2.25rem]">
          {title}
        </p>
      </div>

      <div className="space-y-3 p-4">
        {error ? <Alert kind="error">{error}</Alert> : null}
        {result?.message ? (
          <Alert kind={result.ok ? "success" : "error"}>{result.message}</Alert>
        ) : null}

        {prepared && prepared.width < MIN_RECOMMENDED_WIDTH ? (
          <Alert kind="info">
            Bu görsel {prepared.width} px genişliğinde; geniş ekranlarda yumuşak görünebilir. En az
            1920×800 önerilir. Yine de yükleyebilirsiniz.
          </Alert>
        ) : null}

        {prepared && prepared.brightness > BRIGHT_THRESHOLD ? (
          <p className="text-[0.6875rem] font-light text-ink-faint">
            Görselin alt kısmı parlak; yazının okunması için perde otomatik olarak güçlendirildi.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {/* name YOK: dosya büyük ayar formuyla birlikte gönderilmesin. */}
          <label className="inline-flex cursor-pointer items-center rounded-brand border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-line-strong">
            {preparing ? "Hazırlanıyor…" : prepared ? "Başka görsel seç" : "Görsel seç"}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={preparing || pending}
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
          </label>

          {prepared ? (
            <>
              <button
                type="button"
                onClick={upload}
                disabled={pending}
                className="rounded-brand bg-tfs-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#a81a20] disabled:opacity-60"
              >
                {pending ? "Yükleniyor…" : "Yükle ve yayınla"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrepared(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                disabled={pending}
                className="px-2 py-2 text-sm text-ink-faint hover:text-ink"
              >
                Vazgeç
              </button>
            </>
          ) : uploaded ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded-brand border border-tfs-red px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-tfs-red hover:text-white disabled:opacity-60"
            >
              {pending ? "Kaldırılıyor…" : "Görseli kaldır"}
            </button>
          ) : null}
        </div>

        <p className="text-[0.6875rem] font-light text-ink-faint">
          JPEG, PNG veya WebP; en az 1920×800 önerilir. Görsel tarayıcınızda küçültülür,
          yüklediğiniz anda ana sayfada yayına girer — &ldquo;Ayarları kaydet&rdquo;e basmanız
          gerekmez.
        </p>
      </div>
    </div>
  );
}

/** Görseli küçültür, bulanık kopyasını ve alt bandın parlaklığını çıkarır. */
async function prepareImage(file: File): Promise<Prepared> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas yok");
  // Saydam PNG'ler JPEG'e çevrilirken siyaha dönmesin.
  ctx.fillStyle = "#1d252d";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.82),
  );

  // Küçük kopya: hem bulanık ön izleme hem parlaklık ölçümü için.
  const tiny = document.createElement("canvas");
  tiny.width = 24;
  tiny.height = Math.max(1, Math.round((24 * height) / width));
  const tctx = tiny.getContext("2d");
  if (!tctx) throw new Error("canvas yok");
  tctx.drawImage(bitmap, 0, 0, tiny.width, tiny.height);
  const blur = tiny.toDataURL("image/jpeg", 0.5);

  // Yazı hero'nun alt yarısında duruyor: o bandın ortalama parlaklığı.
  const bandTop = Math.floor(tiny.height * 0.55);
  const pixels = tctx.getImageData(0, bandTop, tiny.width, tiny.height - bandTop).data;
  let sum = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    sum += 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
  }
  const brightness = Math.round(sum / (pixels.length / 4 || 1));

  bitmap.close();

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    blur,
    brightness,
    width,
    height,
    originalKb: Math.round(file.size / 1024),
  };
}
