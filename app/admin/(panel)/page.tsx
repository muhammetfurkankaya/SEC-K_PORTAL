import Link from "next/link";
import type { Metadata } from "next";
import { AdminHeading, Panel, StatTile } from "@/components/admin/AdminHeading";
import { countBulletins, listRecentBulletins } from "@/lib/db/queries/bulletins";
import { listAllCategories } from "@/lib/db/queries/categories";
import { countSurveys, listSurveys } from "@/lib/db/queries/surveys";
import { listRecentAudit } from "@/lib/db/queries/audit";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yönetim Paneli" };

export default function AdminDashboard() {
  const bulletins = countBulletins();
  const categories = listAllCategories();
  const surveys = countSurveys();
  const recent = listRecentBulletins(5);
  const recentSurveys = listSurveys().slice(0, 5);
  const audit = listRecentAudit(8);

  return (
    <>
      <AdminHeading
        title="Yönetim Paneli"
        description="Bültenleri yayımlayın, sekmeleri düzenleyin ve anket sonuçlarını inceleyin."
      >
        <Link
          href="/admin/bultenler/yeni"
          className="rounded-brand bg-tfs-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-tfs-dark"
        >
          + Bülten yükle
        </Link>
      </AdminHeading>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Bülten"
          value={formatNumber(bulletins.total)}
          hint={`${formatNumber(bulletins.published)} yayımda`}
        />
        <StatTile
          label="Sekme"
          value={formatNumber(categories.length)}
          hint={`${formatNumber(categories.filter((c) => c.is_active).length)} aktif`}
        />
        <StatTile
          label="Anket"
          value={formatNumber(surveys.total)}
          hint={`${formatNumber(surveys.active)} açık`}
        />
        <StatTile label="Anket cevabı" value={formatNumber(surveys.responses)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Son Yüklenen Bültenler"
          action={
            <Link href="/admin/bultenler" className="text-xs font-semibold text-tfs-red hover:underline">
              Tümü →
            </Link>
          }
        >
          {recent.length === 0 ? (
            <EmptyRow>Henüz bülten yüklenmedi.</EmptyRow>
          ) : (
            <ul className="divide-y divide-tfs-grey-40">
              {recent.map((bulletin) => (
                <li key={bulletin.id} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="font-mono text-xs font-semibold text-tfs-red">
                      {bulletin.bulletin_no}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-tfs-dark">
                      {bulletin.subject}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-tfs-dark-60">
                    {formatDate(bulletin.published_date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Anketler"
          action={
            <Link href="/admin/anketler" className="text-xs font-semibold text-tfs-red hover:underline">
              Tümü →
            </Link>
          }
        >
          {recentSurveys.length === 0 ? (
            <EmptyRow>Henüz anket oluşturulmadı.</EmptyRow>
          ) : (
            <ul className="divide-y divide-tfs-grey-40">
              {recentSurveys.map((survey) => (
                <li key={survey.id} className="flex items-baseline justify-between gap-3 py-2">
                  <Link
                    href={`/admin/anketler/${survey.id}/analiz`}
                    className="min-w-0 truncate text-sm text-tfs-dark hover:text-tfs-red"
                  >
                    {survey.title}
                  </Link>
                  <span className="shrink-0 text-xs text-tfs-dark-60">
                    {formatNumber(survey.response_count)} cevap
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Son İşlemler">
          {audit.length === 0 ? (
            <EmptyRow>Henüz işlem kaydı yok.</EmptyRow>
          ) : (
            <ul className="divide-y divide-tfs-grey-40">
              {audit.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                  <span className="font-mono text-xs text-tfs-red">{entry.action}</span>
                  <span className="text-sm text-tfs-dark">{entry.detail ?? "—"}</span>
                  <span className="ml-auto text-xs text-tfs-dark-60">
                    {entry.username ?? "—"} · {formatDateTime(entry.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-sm font-light text-tfs-dark-60">{children}</p>;
}
