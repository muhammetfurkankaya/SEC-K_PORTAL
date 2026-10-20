import type { ReactNode } from "react";

export type HeroTone = "photo" | "brand" | "flat";
export type HeroSize = "sm" | "md" | "lg";
export type EyebrowPlace = "ustte" | "altta" | "gizli";

type PageHeroProps = {
  title: string;
  /** Başlığın üstünde ya da altında duran küçük etiket. */
  eyebrow?: string | null;
  eyebrowPlace?: EyebrowPlace;
  description?: string | null;
  /**
   * photo: fotoğraflı koyu hero · brand: fotoğrafsız marka gradyanı ·
   * flat: açık gri sade başlık bandı (bülten sekmeleri, arama, anketler).
   */
  tone?: HeroTone;
  size?: HeroSize;
  align?: "sol" | "orta";
  imageSrc?: string | null;
  /** Yüklenirken anında boyanan, satır içi gömülü küçük bulanık kare. */
  blurDataUrl?: string | null;
  scrim?: "normal" | "strong";
  /** Başlığın altındaki eylem alanı (ör. sayaç, düğme). */
  children?: ReactNode;
};

const MIN_HEIGHT: Record<HeroSize, string> = {
  sm: "min-h-[13rem] sm:min-h-[15rem]",
  md: "min-h-[17rem] sm:min-h-[20rem] lg:min-h-[23rem]",
  lg: "min-h-[20rem] sm:min-h-[24rem] lg:min-h-[28rem]",
};

const TITLE_SIZE: Record<HeroSize, string> = {
  sm: "text-[1.75rem] sm:text-[2.25rem]",
  md: "text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem]",
  lg: "text-[2.25rem] sm:text-[3.25rem] lg:text-[4rem]",
};

/**
 * Sayfa başlığı — portalın tek başlık bileşeni.
 *
 * ÖNEMLİ: koyu tonlar (photo/brand) GECE MODUNDA DA KOYUDUR. Bu yüzden
 * burada bilerek `text-white` ve sabit hex gradyanlar kullanılıyor; anlamsal
 * token'lara (`text-ink`, `bg-surface`) çevrilmemeli, aksi halde açık temada
 * fotoğrafın üstüne koyu yazı düşer.
 *
 * Fotoğraf katmanı `absolute inset-0 object-cover` ile akış dışındadır:
 * görsel ne zaman gelirse gelsin düzen kaymaz (CLS sıfır). Bu sayede
 * next/image gerekmiyor — paket sharp içermediği için zaten kullanılamazdı.
 */
export function PageHero({
  title,
  eyebrow,
  eyebrowPlace = "ustte",
  description,
  tone,
  size = "md",
  align = "sol",
  imageSrc,
  blurDataUrl,
  scrim = "normal",
  children,
}: PageHeroProps) {
  const resolvedTone: HeroTone = tone ?? (imageSrc ? "photo" : "brand");

  if (resolvedTone === "flat") {
    return (
      <FlatHeader
        title={title}
        eyebrow={eyebrow}
        eyebrowPlace={eyebrowPlace}
        description={description}
      >
        {children}
      </FlatHeader>
    );
  }

  const centered = align === "orta";
  const showEyebrow = Boolean(eyebrow) && eyebrowPlace !== "gizli";

  const eyebrowNode = showEyebrow ? (
    <p
      className={`hero-ink hero-rise flex items-center gap-2.5 text-[0.6875rem] font-semibold tracking-[0.18em] text-tfs-grey uppercase ${
        centered ? "justify-center" : ""
      } ${eyebrowPlace === "altta" ? "mt-4 hero-rise-3" : ""}`}
    >
      <span aria-hidden="true" className="h-px w-6 bg-tfs-red" />
      {eyebrow}
      {centered ? <span aria-hidden="true" className="h-px w-6 bg-tfs-red" /> : null}
    </p>
  ) : null;

  return (
    <section className="relative isolate overflow-hidden bg-tfs-dark print-hidden">
      {/* Bulanık yer tutucu: fotoğraf inerken boş koyu kare yerine
          kompozisyonun soluk bir izi görünür. */}
      {blurDataUrl ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl saturate-[0.9]"
          style={{ backgroundImage: `url("${blurDataUrl}")` }}
        />
      ) : null}

      {resolvedTone === "photo" && imageSrc ? (
        /* eslint-disable-next-line @next/next/no-img-element -- paket sharp
           içermiyor; görsel akış dışında olduğu için optimizasyon gerekmiyor */
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
          className="hero-zoom absolute inset-0 size-full object-cover object-[center_38%]"
        />
      ) : (
        <div aria-hidden="true" className="hero-brand absolute inset-0" />
      )}

      {resolvedTone === "photo" ? (
        <div
          aria-hidden="true"
          className={`absolute inset-0 ${scrim === "strong" ? "hero-scrim-strong" : "hero-scrim"}`}
        />
      ) : null}

      <div
        className={`relative mx-auto flex w-full max-w-7xl flex-col justify-end px-4 pt-24 pb-10 sm:px-6 sm:pt-32 sm:pb-14 lg:px-8 ${MIN_HEIGHT[size]} ${
          centered ? "items-center text-center" : ""
        }`}
      >
        {eyebrowPlace === "ustte" ? eyebrowNode : null}

        <h1
          className={`hero-ink hero-rise hero-rise-2 font-semibold tracking-[-0.02em] text-white ${TITLE_SIZE[size]} leading-[1.06] ${
            eyebrowPlace === "ustte" && showEyebrow ? "mt-3" : ""
          } ${centered ? "max-w-[22ch]" : "max-w-[18ch]"}`}
        >
          {title}
        </h1>

        {eyebrowPlace === "altta" ? eyebrowNode : null}

        {description ? (
          <p
            className={`hero-ink hero-rise hero-rise-3 mt-4 max-w-[46ch] text-base leading-relaxed font-light text-white/85 sm:text-lg ${
              centered ? "mx-auto" : ""
            }`}
          >
            {description}
          </p>
        ) : null}

        {children ? (
          <div
            className={`mt-7 flex flex-wrap items-center gap-3 ${centered ? "justify-center" : ""}`}
          >
            {children}
          </div>
        ) : null}
      </div>

      <div aria-hidden="true" className="brand-seam absolute inset-x-0 bottom-0" />
    </section>
  );
}

/**
 * Fotoğrafsız sade başlık bandı — bülten sekmeleri, arama ve anketler.
 *
 * Eski PageHeader'ın yerine geçer: aynı açık gri zemin ve kırmızı dikey
 * çubuk, ama tipografisi güçlendirilmiş ve üst etiketin konumu seçilebilir.
 */
function FlatHeader({
  title,
  eyebrow,
  eyebrowPlace = "ustte",
  description,
  children,
}: {
  title: string;
  eyebrow?: string | null;
  eyebrowPlace?: EyebrowPlace;
  description?: string | null;
  children?: ReactNode;
}) {
  const showEyebrow = Boolean(eyebrow) && eyebrowPlace !== "gizli";

  const eyebrowNode = showEyebrow ? (
    <p
      className={`text-[0.6875rem] font-semibold tracking-[0.16em] text-tfs-red uppercase ${
        eyebrowPlace === "altta" ? "mt-2" : ""
      }`}
    >
      {eyebrow}
    </p>
  ) : null;

  return (
    <div className="border-b border-tfs-grey bg-tfs-grey-20 print-hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-9 sm:px-6 sm:py-11 lg:px-8">
        <div className="brand-bar pl-4">
          {eyebrowPlace === "ustte" ? eyebrowNode : null}
          <h1
            className={`text-[1.75rem] font-semibold tracking-[-0.015em] text-tfs-dark sm:text-[2.25rem] ${
              eyebrowPlace === "ustte" && showEyebrow ? "mt-1.5" : ""
            }`}
          >
            {title}
          </h1>
          {eyebrowPlace === "altta" ? eyebrowNode : null}
          {description ? (
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed font-light text-tfs-dark-80">
              {description}
            </p>
          ) : null}
        </div>
        {children ? <div className="flex items-center gap-2">{children}</div> : null}
      </div>
    </div>
  );
}
