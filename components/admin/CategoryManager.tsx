"use client";

import { useActionState } from "react";
import {
  createCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  updateCategoryAction,
} from "@/app/admin/(panel)/kategoriler/actions";
import { Alert, Checkbox, Field, SubmitButton, TextInput } from "@/components/ui/form";
import { IDLE } from "@/lib/action-state";
import { formatNumber } from "@/lib/format";
import type { CategoryWithCount } from "@/lib/types";

/**
 * Sekme yönetimi.
 *
 * Portal sekmeleri kodda sabit değil; buradan yeni sekme eklenebilir,
 * adı değiştirilebilir, sırası taşınabilir veya geçici olarak gizlenebilir.
 */
export function CategoryManager({ categories }: { categories: CategoryWithCount[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        {categories.length === 0 ? (
          <p className="rounded-brand border border-dashed border-tfs-grey bg-white px-4 py-10 text-center text-sm font-light text-tfs-dark-60">
            Henüz sekme yok. Sağdaki formdan ilk sekmeyi ekleyin.
          </p>
        ) : (
          categories.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
            />
          ))
        )}
      </div>

      <NewCategoryForm />
    </div>
  );
}

function CategoryRow({
  category,
  isFirst,
  isLast,
}: {
  category: CategoryWithCount;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [state, action] = useActionState(updateCategoryAction, IDLE);

  return (
    <div className="rounded-brand border border-tfs-grey bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[0.6875rem] text-tfs-dark-60">/{category.slug}</span>
        <span className="text-xs text-tfs-dark-60">
          {formatNumber(category.bulletin_count)} bülten
        </span>
      </div>

      {state.message ? (
        <div className="mb-3">
          <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert>
        </div>
      ) : null}

      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={category.id} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sekme adı" htmlFor={`name-${category.id}`} required>
            <TextInput
              id={`name-${category.id}`}
              name="name"
              defaultValue={category.name}
              maxLength={80}
              required
            />
          </Field>

          <Field label="Açıklama" htmlFor={`desc-${category.id}`}>
            <TextInput
              id={`desc-${category.id}`}
              name="description"
              defaultValue={category.description ?? ""}
              maxLength={300}
            />
          </Field>
        </div>

        <Checkbox
          name="is_active"
          label="Aktif (portalda sekme olarak görünür)"
          defaultChecked={Boolean(category.is_active)}
        />

        <div className="flex flex-wrap items-center gap-2 border-t border-tfs-grey-40 pt-3">
          <SubmitButton variant="secondary" pendingLabel="Kaydediliyor…">
            Kaydet
          </SubmitButton>
        </div>
      </form>

      {/* Sıralama ve silme ayrı formlar — yukarıdaki kaydetme ile karışmasın. */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <form action={moveCategoryAction}>
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="direction" value="up" />
          <SubmitButton
            variant="secondary"
            disabled={isFirst}
            className="!px-2.5 !py-1 !text-xs"
            aria-label="Yukarı taşı"
          >
            ↑ Yukarı
          </SubmitButton>
        </form>

        <form action={moveCategoryAction}>
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="direction" value="down" />
          <SubmitButton
            variant="secondary"
            disabled={isLast}
            className="!px-2.5 !py-1 !text-xs"
            aria-label="Aşağı taşı"
          >
            ↓ Aşağı
          </SubmitButton>
        </form>

        <form action={deleteCategoryAction} className="ml-auto">
          <input type="hidden" name="id" value={category.id} />
          <SubmitButton
            variant="danger"
            className="!px-2.5 !py-1 !text-xs"
            confirm={`"${category.name}" sekmesini silmek istediğinize emin misiniz?`}
          >
            Sil
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

function NewCategoryForm() {
  const [state, action] = useActionState(createCategoryAction, IDLE);

  return (
    <div className="lg:sticky lg:top-4 lg:self-start">
      <div className="rounded-brand border border-tfs-grey bg-white p-4">
        <h2 className="mb-3 text-xs font-semibold tracking-[0.12em] text-tfs-red uppercase">
          Yeni Sekme Ekle
        </h2>

        {state.message ? (
          <div className="mb-3">
            <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert>
          </div>
        ) : null}

        {/* key: başarılı eklemeden sonra alanlar temizlensin. */}
        <form action={action} key={state.ok ? state.message : "yeni"} className="space-y-3">
          <Field label="Sekme adı" htmlFor="new-name" required hint="Örn. ISG Bültenleri">
            <TextInput id="new-name" name="name" maxLength={80} required />
          </Field>

          <Field label="Açıklama" htmlFor="new-desc">
            <TextInput id="new-desc" name="description" maxLength={300} />
          </Field>

          <SubmitButton className="w-full" pendingLabel="Ekleniyor…">
            Sekme ekle
          </SubmitButton>
        </form>

        <p className="mt-3 text-[0.6875rem] font-light text-tfs-dark-60">
          Sekme adresi (slug) addan otomatik üretilir ve sonradan değişmez.
        </p>
      </div>
    </div>
  );
}
