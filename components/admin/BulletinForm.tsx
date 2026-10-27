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
import { renderCoverJpeg } from "@/lib/pdfjs-client";
import type { BulletinWithCategory, CategoryWithCount } from "@/lib/types";

type BulletinFormProps = {
  categories: CategoryWithCount[];
  /** Doldurulmuşsa düzenleme kipinde çalışır. */
  bulletin?: BulletinWithCategory;
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
export function BulletinForm({ categories, bulletin, action, maxUploadBytes }: BulletinFormProps) {
  const [state, formAction] = useActionState(action, IDLE);
  const isEdit = Boolean(bulletin);

  // Kapak görseli: PDF seçilince ilk sayfası tarayıcıda küçük bir JPEG'e
  // çevrilir ve formla birlikte gönderilir (sunucuda görüntü işleme yok).
  const [cover, setCover] = useState<{ blob: Blob; url: string } | null>(null);
  const [coverStatus, setCoverStatus] = useState<"bos" | "hazirlaniyor" | "hazir" | "hata">("bos");

  useEffect(() => () => (cover ? URL.revokeObjectURL(cover.url) : undefined), [cover]);

  async function handleFile(file: File | undefined): Promise<void> {
    setCover(null);
    if (!file) return setCoverStatus("bos");
    setCoverStatus("hazirlaniyor");
    try {
      const blob = await renderCoverJpeg(await file.arrayBuffer());
      setCover({ blob, url: URL.createObjectURL(blob) });
      setCoverStatus("hazir");
    } catch {
      setCoverStatus("hata");
    }
  }

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

      {coverStatus !== "bos" ? (
        <div className="flex items-center gap-3 rounded-brand border border-tfs-grey bg-tfs-grey-20 p-3">
          {cover ? (
            /* eslint-disable-next-line @next/next/no-img-element -- yerel önizleme */
            <img
              src={cover.url}
              alt="Kapak önizlemesi"
              className="h-24 w-auto border border-tfs-grey bg-white shadow-sm"
            />
          ) : null}
          <p className="text-xs text-tfs-dark-80">
            {coverStatus === "hazirlaniyor"
              ? "Kapak görseli hazırlanıyor…"
              : coverStatus === "hazir"
                ? "Kapak görseli hazır — ana sayfadaki kartlarda PDF'in ilk sayfası olarak görünecek."
                : "Kapak görseli üretilemedi; bülten yine kaydedilir, kartta yazılı kapak görünür."}
          </p>
        </div>
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
