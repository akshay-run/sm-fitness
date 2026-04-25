import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { loadDashboardHome } from "@/lib/queries/dashboardHome";
import { IST_TZ, parseISTDate } from "@/lib/dateUtils";
import { formatAmountINR, formatDateShortIST } from "@/lib/uiFormat";
import {
  membershipRenewalReminderMessage,
  receiptMessage,
  smsLink,
  whatsappLink,
} from "@/lib/messageTemplates";
import { BulkRenewalReminders } from "@/components/dashboard/BulkRenewalReminders";
import { RevenueMiniChart } from "@/components/dashboard/RevenueMiniChart";

export const metadata: Metadata = {
  title: "Dashboard — SM FITNESS",
  description: "Gym overview and renewals",
};

export default async function DashboardHome() {
  const {
    today,
    totalMembers,
    activeMembers,
    expiredMemberships,
    expiringSoonMemberships,
    thisMonthRevenue,
    lastMonthRevenue,
    trendUp,
    upcomingRows,
    recentRows,
    revenueLast6,
    gymBrand,
  } = await loadDashboardHome();

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A2E]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Today is {formatInTimeZone(parseISTDate(today), IST_TZ, "EEEE, d MMMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/members/new"
            className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
          >
            <span className="whitespace-nowrap">New Member</span>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatCard icon={<UsersIcon className="h-4 w-4" />} tint="status-neutral" label="Total members" value={String(totalMembers)} />
        <StatCard icon={<CheckCircleIcon className="h-4 w-4" />} tint="status-success" label="Active members" value={String(activeMembers)} />
        <StatCard
          icon={<AlertTriangleIcon className="h-4 w-4" />}
          tint="status-danger"
          label="Expired"
          value={String(expiredMemberships)}
          pulse={expiredMemberships > 0}
        />
        <Link
          href="/members?expiring_within_days=7"
          className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <StatCard
            icon={<BellIcon className="h-4 w-4" />}
            tint="status-warning"
            label="Expiring Soon"
            value={String(expiringSoonMemberships)}
            pulse={expiringSoonMemberships > 0}
          />
        </Link>
      </div>

      <div className="card-surface mt-4 rounded-2xl border border-zinc-200 p-5">
        <div className="text-sm font-semibold text-[#1A1A2E]">Revenue</div>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">This month</div>
            <div className="text-2xl font-semibold text-[#1A1A2E]">{formatAmountINR(thisMonthRevenue)}</div>
          </div>
          <div className={trendUp ? "text-green-700" : "text-red-700"}>{trendUp ? "↗" : "↘"}</div>
        </div>
        <div className="mt-1 text-sm text-slate-500">Last month {formatAmountINR(lastMonthRevenue)}</div>
        <RevenueMiniChart data={revenueLast6} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="card-surface rounded-2xl border border-zinc-200 p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#1A1A2E]">Upcoming renewals (7 days)</div>
              <Link
                href="/members?expiring_within_days=7"
                className="text-sm font-medium underline underline-offset-4"
              >
                View all
              </Link>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
              <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
                <div className="col-span-5">Member</div>
                <div className="col-span-3">Plan</div>
                <div className="col-span-2">Expiry</div>
                <div className="col-span-2 text-right">Action</div>
              </div>
              {upcomingRows.length ? (
                upcomingRows.map((r) => (
                  <div
                    key={r.membership_id}
                    className="grid grid-cols-12 gap-2 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
                  >
                    <div className="col-span-5">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-xs text-zinc-500">{r.mobile}</div>
                    </div>
                    <div className="col-span-3 text-zinc-700">{r.plan_name}</div>
                    <div className="col-span-2 text-zinc-700">{formatDateShortIST(r.end_date)}</div>
                    <div className="col-span-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={whatsappLink(
                            r.mobile,
                            membershipRenewalReminderMessage({
                              memberName: r.full_name,
                              expiryDate: formatDateShortIST(r.end_date),
                              gymName: gymBrand,
                            })
                          )}
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 hover:bg-green-100"
                          aria-label="Send WhatsApp reminder"
                          title="Send WhatsApp reminder"
                        >
                          <WhatsAppGlyph className="h-4 w-4" />
                        </a>
                        <a
                          href={smsLink(
                            r.mobile,
                            membershipRenewalReminderMessage({
                              memberName: r.full_name,
                              expiryDate: formatDateShortIST(r.end_date),
                              gymName: gymBrand,
                            })
                          )}
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 hover:bg-zinc-50"
                        >
                          SMS
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-8 text-center text-sm text-slate-500">
                  <div className="mb-1 text-lg">🎉</div>
                  All memberships are current — nothing expiring this week 🎉
                </div>
              )}
            </div>
            <BulkRenewalReminders
              rows={upcomingRows.map((r) => ({
                mobile: r.mobile,
                full_name: r.full_name,
                end_date: r.end_date,
              }))}
              gymName={gymBrand}
            />
          </div>
        </div>

        <div>
          <div className="card-surface rounded-2xl border border-zinc-200 p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#1A1A2E]">Recent payments</div>
              <Link href="/payments" className="text-sm font-medium underline underline-offset-4">
                Payments
              </Link>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
              <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
                <div className="col-span-4">Member</div>
                <div className="col-span-3">Amount</div>
                <div className="col-span-2">Mode</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>
              {recentRows.length ? (
                recentRows.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 gap-2 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
                  >
                    <div className="col-span-4 truncate font-medium">{memberDisplayName(p.member_name)}</div>
                    <div className="col-span-3">{formatAmountINR(Number(p.amount ?? 0))}</div>
                    <div className="col-span-2 uppercase text-zinc-700">{p.payment_mode}</div>
                    <div className="col-span-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/payments/${p.id}`}
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sm font-medium underline underline-offset-4"
                        >
                          →
                        </Link>
                        <a
                          href={whatsappLink(
                            p.member_mobile,
                            receiptMessage({
                              name: p.member_name,
                              receiptNo: p.receipt_number,
                              plan: p.plan_name,
                              startDate: p.start_date !== "-" ? formatDateShortIST(p.start_date) : "-",
                              endDate: p.end_date !== "-" ? formatDateShortIST(p.end_date) : "-",
                              amount: Number(p.amount ?? 0),
                              mode: p.payment_mode.toUpperCase(),
                            })
                          )}
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 hover:bg-green-100"
                          aria-label="Send receipt on WhatsApp"
                          title="Send receipt on WhatsApp"
                        >
                          <WhatsAppGlyph className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-8 text-center text-sm text-slate-500">
                  <div className="mb-1 text-lg">💳</div>
                  No payments recorded yet. Add a member and start a membership.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tint,
  pulse,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tint: string;
  pulse?: boolean;
}) {
  return (
    <div className="card-surface rounded-2xl border border-zinc-200 p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <span className={`rounded px-2 py-1 text-xs ${tint}`}>{icon}</span>
      </div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight text-[#1A1A2E] ${pulse ? "animate-pulse" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6" />
      <path d="M23 11h-6" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="m10.3 3.2-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function memberDisplayName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "Member";
  const first = trimmed.split(/\s+/)[0] ?? "";
  if (first) return first;
  return trimmed.slice(0, 1).toUpperCase();
}
