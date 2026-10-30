"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  Alert,
  Checkbox,
  Field,
  Select,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/ui/form";
import { IDLE, type ActionState } from "@/lib/action-state";
import { formatFileSize } from "@/lib/format";
import { CoverPagePicker, type CoverStatus } from "@/components/admin/CoverPagePicker";
import type { BulletinWithCategory, CategoryWithCount } from "@/lib/types";

type BulletinFormProps = {
  categories: CategoryWithCount[];
  /** Doldurulmuşsa düzenleme kipinde çalışır. */
  bulletin?: BulletinWithCategory;
  /** Düzenlemede mevcut kapak görselinin adresi (yoksa null). */
  currentCoverUrl?: string | null;
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  maxUploadBytes: number;
};

/**
 * Bülten yükleme / düzenleme formu.
 *
 * Yeni kayıt ve düzenleme aynı bileşeni kullanır; tek fark PDF alanının
 * düzenleme kipinde zorunlu olmaması (dosya değiştirilmek istenmezse boş
 * bırakılır).
 */
export function BulletinForm({
  categories,
  bulletin,
  currentCoverUrl = null,
  action,
  maxUploadBytes,
}: BulletinFormProps) {
  const [state, formAction] = useActionState(action, IDLE);
  const isEdit = Boolean(bulletin);

  // Kapak görseli: PDF'in seçilen sayfası (varsayılan ilk) tarayıcıda küçük
  // bir JPEG'e çevrilir ve formla birlikte gönderilir (sunucuda görüntü
  // işleme yok). Kaynak: yeni seçilen dosya ya da düzenlemede mevcut PDF.
  const [pdfSource, setPdfSource] = useState<ArrayBuffer | string | null>(null);
  const [cover, setCover] = useState<{ blob: Blob; page: number } | null>(null);
  const [coverStatus, setCoverStatus] = useState<CoverStatus | "bos">("bos");

  async function handleFile(file: File | undefined): Promise<void> {
    setCover(null);
    if (!file) {
      setPdfSource(null);
      setCoverStatus("bos");
      return;
    }
    setCoverStatus("hazirlaniyor");
    setPdfSource(await file.arrayBuffer());
  }

  // Kayıt başarılı olunca seçici kapanır; aynı kapak bir daha gönderilmez.
  useEffect(() => {
    if (!state.ok) return;
    setPdfSource(null);
    setCover(null);
    setCoverStatus("bos");
  }, [state]);

  function submit(formData: FormData) {
    if (cover) formData.set("kapak", cover.blob, "kapak.jpg");
    return formAction(formData);
  }
  const errors = state.fieldErrors ?? {};

  // Yeni bültende varsayılan tarih bugün olsun.
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={submit} className="space-y-5">
      {bulletin ? <input type="hidden" name="id" value={bulletin.id} /> : null}

      {state.message ? <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Sekme" htmlFor="category_id" required hint="Bültenin görüneceği bölüm.">
          <Select
            id="category_id"
            name="category_id"
            defaultValue={bulletin?.category_id ?? categories[0]?.id ?? ""}
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.is_active ? "" : " (pasif)"}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Bülten numarası"
          htmlFor="bulletin_no"
          required
          hint={errors.bulletin_no ?? "Örn. SEÇ-K-2026-01"}
        >
          <TextInput
            id="bulletin_no"
            name="bulletin_no"
            defaultValue={bulletin?.bulletin_no ?? ""}
            maxLength={60}
            required
          />
        </Field>
      </div>

      <Field label="Konu" htmlFor="subject" required hint={errors.subject}>
        <TextInput
          id="subject"
          name="subject"
          defaultValue={bulletin?.subject ?? ""}
          maxLength={300}
          required
        />
      </Field>

      <Field
        label="Açıklama"
        htmlFor="description"
        hint="İsteğe bağlı. Bülten görüntüleme sayfasında gösterilir."
      >
        <TextArea
          id="description"
          name="description"
          rows={3}
          defaultValue={bulletin?.description ?? ""}
          maxLength={2000}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Yayım tarihi" htmlFor="published_date" required hint={errors.published_date}>
          <TextInput
            id="published_date"
            name="published_date"
            type="date"
            defaultValue={bulletin?.published_date ?? today}
            required
          />
        </Field>

        <Field
          label={isEdit ? "PDF dosyası (değiştirmek için seçin)" : "PDF dosyası"}
          htmlFor="file"
          required={!isEdit}
          hint={
            errors.file ??
            `En fazla ${Math.floor(maxUploadBytes / 1024 / 1024)} MB. ${
              isEdit ? "Boş bırakırsanız mevcut dosya korunur." : ""
            }`
          }
        >
          <TextInput
            id="file"
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            required={!isEdit}
            onChange={(event) => void handleFile(event.target.files?.[0])}
            className="file:mr-3 file:rounded-brand file:border-0 file:bg-tfs-dark file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
          />
        </Field>
      </div>

      {isEdit && !pdfSource ? (
        <div className="flex items-center gap-3 rounded-brand border border-tfs-grey bg-tfs-grey-20 p-3">
          {currentCoverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- küçük kapak görseli */
            <img
              src={currentCoverUrl}
              alt="Mevcut kapak"
              className="aspect-[1/1.414] w-16 border border-tfs-grey bg-white object-cover object-top shadow-sm"
            />
          ) : null}
          <div className="min-w-0 flex-1 text-xs text-tfs-dark-80">
            <p className="font-semibold text-tfs-dark">Kapak görseli</p>
            <p>
              {currentCoverUrl
                ? "Ana sayfadaki kapaklı kartta bu görsel görünüyor."
                : "Bu bültenin kapak görseli yok; kartta yazılı kapak görünüyor."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => bulletin && setPdfSource(`/api/dosya/${bulletin.id}`)}
            className="shrink-0 rounded-brand border border-tfs-grey bg-white px-3 py-1.5 text-xs font-semibold text-tfs-dark transition-colors hover:border-tfs-red hover:text-tfs-red"
          >
            {currentCoverUrl ? "Kapak sayfasını değiştir" : "Kapak sayfası seç"}
          </button>
        </div>
      ) : null}

      {pdfSource ? (
        <CoverPagePicker source={pdfSource} onCover={setCover} onStatus={setCoverStatus} />
      ) : null}

      {bulletin ? (
        <p className="rounded-brand bg-tfs-grey-20 px-3 py-2 text-xs text-tfs-dark-60">
          Mevcut dosya: <span className="text-tfs-dark">{bulletin.file_name}</span> ·{" "}
          {formatFileSize(bulletin.file_size)} ·{" "}
          <a
            href={`/api/dosya/${bulletin.id}`}
            target="_blank"
            rel="noopener"
            className="font-semibold text-tfs-red hover:underline"
          >
            görüntüle ↗
          </a>
        </p>
      ) : null}

      <Checkbox
        name="is_published"
        label="Yayında (portalda görünür)"
        defaultChecked={bulletin ? Boolean(bulletin.is_published) : true}
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-tfs-grey pt-4">
        {/* Kapak hazırlanırken (genelde bir saniyeden kısa) gönderilmesin;
            yoksa bülten kapaksız kaydedilir. */}
        <SubmitButton
          pendingLabel={isEdit ? "Kaydediliyor…" : "Yükleniyor…"}
          disabled={coverStatus === "hazirlaniyor"}
        >
          {isEdit ? "Değişiklikleri kaydet" : "Bülteni yayımla"}
        </SubmitButton>
        <Link
          href="/admin/bultenler"
          className="rounded-brand border border-tfs-grey bg-white px-4 py-2 text-sm font-semibold text-tfs-dark transition-colors hover:border-tfs-dark-20"
        >
          Vazgeç
        </Link>
      </div>
    </form>
  );
}
