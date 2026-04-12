import type { Metadata } from "next";
import Link from "next/link";
import { loadDashboardHome } from "@/lib/queries/dashboardHome";
import { formatAmountINR, formatDateLongIST, formatDateShortIST } from "@/lib/uiFormat";
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
          <p className="mt-1 text-sm text-slate-500">Today (IST): {formatDateLongIST(today)}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/members/new"
            className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
          >
            Add member
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatCard icon="👥" tint="status-neutral" label="Total members" value={String(totalMembers)} />
        <StatCard icon="✅" tint="status-success" label="Active members" value={String(activeMembers)} />
        <StatCard
          icon="⚠️"
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
            icon="🔔"
            tint="status-warning"
            label="Expiring in 7d"
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
                          className="status-success rounded px-2 py-1 text-xs"
                        >
                          WA
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
                          className="status-info rounded px-2 py-1 text-xs"
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
                  All memberships are current - no renewals due this week!
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
                Open payments
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
                    <div className="col-span-4 truncate font-medium">{p.member_name}</div>
                    <div className="col-span-3">{formatAmountINR(Number(p.amount ?? 0))}</div>
                    <div className="col-span-2 uppercase text-zinc-700">{p.payment_mode}</div>
                    <div className="col-span-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/payments/${p.id}`} className="text-sm font-medium underline">
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
                          className="status-success rounded px-2 py-1 text-xs"
                        >
                          WA
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-8 text-center text-sm text-slate-500">
                  <div className="mb-1 text-lg">💳</div>
                  No payments recorded yet.
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
  icon: string;
  tint: string;
  pulse?: boolean;
}) {
  return (
    <div className="card-surface rounded-2xl border border-zinc-200 p-4">
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
