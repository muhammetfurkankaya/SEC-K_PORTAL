import type { ReactNode } from "react";
import { HeroParallax } from "./HeroParallax";

export type HeroTone = "photo" | "brand" | "flat";
export type HeroSize = "sm" | "md" | "lg" | "full";
export type EyebrowPlace = "ustte" | "altta" | "gizli";
export type HeroMotion = "paralaks" | "perde" | "alttan" | "yanlar" | "yok";

/**
 * Yazı giriş hareketlerinin sınıfları (app/globals.css → .hm-*).
 * Statik tablo: Tailwind çalışma anında birleştirilen sınıfı göremez.
 */
const MOTION: Record<
  HeroMotion,
  { title: string; eyebrow: string; eyebrowText: string; line: string; desc: string }
> = {
  // Paralaks girişte alttan gelir; asıl hareketi kaydırırken (HeroParallax).
  paralaks: {
    title: "hm-rise hm-d1",
    eyebrow: "hm-rise hm-d2",
    eyebrowText: "",
    line: "",
    desc: "hm-rise hm-d3",
  },
  alttan: {
    title: "hm-rise hm-d1",
    eyebrow: "hm-rise hm-d2",
    eyebrowText: "",
    line: "",
    desc: "hm-rise hm-d3",
  },
  yanlar: { title: "hm-left", eyebrow: "hm-pop", eyebrowText: "", line: "", desc: "hm-right" },
  perde: { title: "", eyebrow: "", eyebrowText: "hm-track", line: "hm-line", desc: "hm-soft" },
  yok: { title: "", eyebrow: "", eyebrowText: "", line: "", desc: "" },
};

type PageHeroProps = {
  /**
   * Hero'nun altı hangi renge aksın: arama bandının koyusuna ("deep") ya da
   * sayfa zeminine ("surface"). Kırmızı ayırıcı
   * çizginin yerine yumuşak geçiş.
   */
  fadeTo?: "deep" | "surface";
  /** Yazının giriş hareketi (ayar: hero_motion). */
  motion?: HeroMotion;
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
  /** Ayarlardan gelen punto + renk sınıfları. */
  titleClass?: string;
  eyebrowClass?: string;
  descriptionClass?: string;
  imageSrc?: string | null;
  /** Yüklenirken anında boyanan, satır içi gömülü küçük bulanık kare. */
  blurDataUrl?: string | null;
  scrim?: "normal" | "strong";
  /** Fotoğrafın hangi kısmı görünsün. */
  focal?: "ust" | "orta" | "alt";
  /** Başlığın altındaki eylem alanı (ör. sayaç, düğme). */
  children?: ReactNode;
};

/**
 * Yükseklik kademeleri.
 *
 * Fotoğraflı hero'nun üstünde saydam menü duruyor (~7.5rem, HeaderFrame);
 * kademeler bu payı ve alttaki geçiş gradyanını içeriyor, yazı ikisinin
 * arasında kalıyor.
 */
const MIN_HEIGHT: Record<HeroSize, string> = {
  sm: "min-h-[21rem] sm:min-h-[23rem]",
  md: "min-h-[25rem] sm:min-h-[28rem] lg:min-h-[31rem]",
  lg: "min-h-[29rem] sm:min-h-[33rem] lg:min-h-[37rem]",
  // Görselin kendi oranı (16:9): masaüstünde fotoğraf kırpılmadan bütünüyle
  // görünür. Dar ekranda bu oran başlığa yetmeyeceği için sabit bir yükseklik
  // var; orada fotoğraf yanlardan kırpılır. (Oran ve alt sınır aynı anda
  // verilmemeli: tarayıcı alt sınırı genişliğe aktarır, sayfa yana taşar.)
  full: "min-h-[34rem] lg:aspect-[16/9] lg:min-h-0",
};

/** Kadraj: fotoğrafın dikeyde hangi bölümü görünsün. */
const FOCAL_POSITION = {
  ust: "object-[center_18%]",
  orta: "object-[center_38%]",
  alt: "object-[center_72%]",
} as const;

const TITLE_SIZE: Record<HeroSize, string> = {
  sm: "text-[1.75rem] sm:text-[2.25rem]",
  md: "text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem]",
  lg: "text-[2.25rem] sm:text-[3.25rem] lg:text-[4rem]",
  full: "text-[2.5rem] sm:text-[3.75rem] lg:text-[4.75rem]",
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
  titleClass = "",
  eyebrowClass = "",
  descriptionClass = "",
  imageSrc,
  blurDataUrl,
  scrim = "normal",
  focal = "orta",
  fadeTo = "surface",
  motion = "yok",
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
        titleClass={titleClass}
        eyebrowClass={eyebrowClass}
      >
        {children}
      </FlatHeader>
    );
  }

  const centered = align === "orta";
  // Üst menü fotoğrafın üzerinde saydam duruyor (HeaderFrame); metin
  // menünün altında kalmasın diye üstten boşluk bırakılıyor. Tam ekranda
  // metin dikeyde ortalanıyor, diğer kademelerde alta yaslı.
  const full = size === "full";
  const showEyebrow = Boolean(eyebrow) && eyebrowPlace !== "gizli";

  const m = MOTION[motion];

  // Perde açılışında kırmızı çizgiler ortadan dışa doğru uzar: soldaki
  // sağdan, sağdaki soldan büyür.
  const eyebrowNode = showEyebrow ? (
    <p
      className={`hero-ink flex items-center gap-2.5 font-semibold tracking-[0.18em] uppercase ${
        m.eyebrow
      } ${eyebrowClass || "text-[0.6875rem] text-tfs-grey"} ${centered ? "justify-center" : ""} ${
        eyebrowPlace === "altta" ? "mt-4" : ""
      }`}
    >
      <span aria-hidden="true" className={`h-px w-6 bg-tfs-red ${m.line ? "hm-line-l" : ""}`} />
      <span className={m.eyebrowText}>{eyebrow}</span>
      {centered ? (
        <span aria-hidden="true" className={`h-px w-6 bg-tfs-red ${m.line ? "hm-line-r" : ""}`} />
      ) : null}
    </p>
  ) : null;

  return (
    <section
      className={`relative isolate overflow-hidden bg-tfs-dark print-hidden ${
        full ? `flex ${MIN_HEIGHT.full}` : ""
      }`}
    >
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
          data-paralaks="gorsel"
          className={`hero-zoom absolute inset-0 size-full object-cover ${FOCAL_POSITION[focal]}`}
        />
      ) : (
        <div aria-hidden="true" data-paralaks="gorsel" className="hero-brand absolute inset-0" />
      )}

      {/* Menünün okunması için üstte ayrı bir koyu geçiş — fotoğrafsız
          gradyanda da (orada da menü aynı yerde). */}
      <div aria-hidden="true" className="hero-scrim-top absolute inset-0" />

      {resolvedTone === "photo" ? (
        <div
          aria-hidden="true"
          className={`absolute inset-0 ${
            full
              ? scrim === "strong"
                ? "hero-scrim-center-strong"
                : "hero-scrim-center"
              : scrim === "strong"
                ? "hero-scrim-strong"
                : "hero-scrim"
          }`}
        />
      ) : null}

      {/* Üst boşluk: tek satırlık menü geniş ekranda (≥1280 px) 4.5rem,
          daha dar ekranda sekmeler alt satırda (~6.5rem). */}
      <div
        data-paralaks="metin"
        className={`relative mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8 ${
          full
            ? "justify-center pt-36 pb-24 xl:pt-28"
            : `justify-end pt-36 pb-20 sm:pb-24 xl:pt-28 ${MIN_HEIGHT[size]}`
        } ${centered ? "items-center text-center" : ""}`}
      >
        {eyebrowPlace === "ustte" ? eyebrowNode : null}

        <h1
          className={`hero-ink tracking-[-0.02em] leading-[1.06] ${m.title} ${
            full ? "font-bold" : "font-semibold"
          } ${titleClass || `${TITLE_SIZE[size]} text-white`} ${
            eyebrowPlace === "ustte" && showEyebrow ? "mt-3" : ""
          } ${centered ? "max-w-[22ch]" : "max-w-[18ch]"}`}
        >
          {/* Perde açılışı: başlık görünmez bir çizginin arkasından çıkar. */}
          {motion === "perde" ? (
            <span className="hm-mask">
              <span>{title}</span>
            </span>
          ) : (
            title
          )}
        </h1>

        {eyebrowPlace === "altta" ? eyebrowNode : null}

        {description ? (
          <p
            className={`hero-ink mt-4 max-w-[46ch] leading-relaxed font-light ${m.desc} ${
              descriptionClass || "text-base text-white/85 sm:text-lg"
            } ${centered ? "mx-auto" : ""}`}
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

      {motion === "paralaks" ? <HeroParallax /> : null}

      {/* Alt kenar: sert bir çizgi yerine bir sonraki bandın rengine akış.
          Yazı bu geçişin üstünde kalıyor (alt boşluk geçişten büyük). */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-b from-transparent sm:h-24 ${
          fadeTo === "deep" ? "to-tfs-deep" : "to-surface"
        }`}
      />
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
  titleClass = "",
  eyebrowClass = "",
  children,
}: {
  title: string;
  eyebrow?: string | null;
  eyebrowPlace?: EyebrowPlace;
  description?: string | null;
  titleClass?: string;
  eyebrowClass?: string;
  children?: ReactNode;
}) {
  const showEyebrow = Boolean(eyebrow) && eyebrowPlace !== "gizli";

  const eyebrowNode = showEyebrow ? (
    <p
      className={`font-semibold tracking-[0.16em] uppercase ${
        eyebrowClass || "text-[0.6875rem] text-accent-ink"
      } ${eyebrowPlace === "altta" ? "mt-2" : ""}`}
    >
      {eyebrow}
    </p>
  ) : null;

  return (
    <div className="border-b border-line bg-surface-2 print-hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-9 sm:px-6 sm:py-11 lg:px-8">
        <div className="brand-bar pl-4">
          {eyebrowPlace === "ustte" ? eyebrowNode : null}
          <h1
            className={`font-semibold tracking-[-0.015em] ${
              titleClass || "text-[1.75rem] text-ink sm:text-[2.25rem]"
            } ${eyebrowPlace === "ustte" && showEyebrow ? "mt-1.5" : ""}`}
          >
            {title}
          </h1>
          {eyebrowPlace === "altta" ? eyebrowNode : null}
          {description ? (
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed font-light text-ink-soft">
              {description}
            </p>
          ) : null}
        </div>
        {children ? <div className="flex items-center gap-2">{children}</div> : null}
      </div>
    </div>
  );
}
