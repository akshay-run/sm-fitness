import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { addDaysIST, monthBoundsIST, previousMonthBoundsIST, todayISTDateString } from "@/lib/dateUtils";

type UpcomingRow = {
  membership_id: string;
  member_id: string;
  full_name: string;
  mobile: string;
  plan_name: string;
  end_date: string;
};

type PaymentAmountRow = { amount: number | string | null };
type RecentPaymentRow = {
  id: string;
  amount: number | string | null;
  payment_mode: string;
  receipt_number: string;
};

export default async function DashboardHome() {
  const supabaseAdmin = createSupabaseAdminClient();

  const today = todayISTDateString();
  const in7 = addDaysIST(today, 7);

  const [{ count: totalMembers }, { count: activeMembers }] = await Promise.all([
    supabaseAdmin.from("members").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const [{ count: expiredMemberships }, { count: expiringSoonMemberships }] = await Promise.all([
    supabaseAdmin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .lt("end_date", today)
      .neq("status", "cancelled"),
    supabaseAdmin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .gte("end_date", today)
      .lte("end_date", in7)
      .neq("status", "cancelled"),
  ]);

  const { startIST: thisMonthStart, endIST: thisMonthEnd } = monthBoundsIST();
  const { startIST: lastMonthStart, endIST: lastMonthEnd } = previousMonthBoundsIST();

  const [thisMonthPayments, lastMonthPayments] = await Promise.all([
    supabaseAdmin
      .from("payments")
      .select("amount")
      .gte("payment_date", thisMonthStart)
      .lt("payment_date", thisMonthEnd),
    supabaseAdmin
      .from("payments")
      .select("amount")
      .gte("payment_date", lastMonthStart)
      .lt("payment_date", lastMonthEnd),
  ]);

  const thisMonthRevenue =
    (thisMonthPayments.data as PaymentAmountRow[] | null)?.reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0
    ) ?? 0;
  const lastMonthRevenue =
    (lastMonthPayments.data as PaymentAmountRow[] | null)?.reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0
    ) ?? 0;

  const { data: upcoming } = await supabaseAdmin
    .from("memberships")
    .select("id, member_id, plan_id, end_date")
    .gte("end_date", today)
    .lte("end_date", in7)
    .neq("status", "cancelled")
    .order("end_date", { ascending: true })
    .limit(10);

  const upcomingRows: UpcomingRow[] = [];
  for (const m of upcoming ?? []) {
    const [{ data: member }, { data: plan }] = await Promise.all([
      supabaseAdmin
        .from("members")
        .select("id, full_name, mobile")
        .eq("id", m.member_id)
        .single(),
      supabaseAdmin.from("plans").select("name").eq("id", m.plan_id).single(),
    ]);
    if (!member) continue;
    upcomingRows.push({
      membership_id: m.id,
      member_id: member.id,
      full_name: member.full_name,
      mobile: member.mobile,
      plan_name: plan?.name ?? "Plan",
      end_date: String(m.end_date),
    });
  }

  const { data: recentPayments } = await supabaseAdmin
    .from("payments")
    .select("id, amount, payment_mode, receipt_number, payment_date, member_id")
    .order("payment_date", { ascending: false })
    .limit(10);

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600">Today (IST): {today}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/members/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Add member
          </Link>
          <Link
            href="/members"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
          >
            View members
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total members" value={String(totalMembers ?? 0)} />
        <StatCard label="Active members" value={String(activeMembers ?? 0)} />
        <StatCard label="Expired memberships" value={String(expiredMemberships ?? 0)} />
        <StatCard label="Expiring in 7 days" value={String(expiringSoonMemberships ?? 0)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold text-zinc-900">Revenue</div>
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              <div className="flex items-center justify-between">
                <span>This month</span>
                <span className="font-semibold text-zinc-900">₹{thisMonthRevenue.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last month</span>
                <span className="font-semibold text-zinc-900">₹{lastMonthRevenue.toFixed(0)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Based on payments recorded (IST month boundary).
            </p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">Upcoming renewals (7 days)</div>
              <Link href="/members" className="text-sm font-medium underline underline-offset-4">
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
                    <div className="col-span-2 text-zinc-700">{r.end_date}</div>
                    <div className="col-span-2 text-right">
                      <Link
                        href={`/memberships/new?memberId=${r.member_id}`}
                        className="text-sm font-medium underline underline-offset-4"
                      >
                        Renew
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-6 text-sm text-zinc-600">No renewals due in next 7 days.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">Recent payments</div>
          <Link href="/payments" className="text-sm font-medium underline underline-offset-4">
            Open payments
          </Link>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
          <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
            <div className="col-span-5">Receipt</div>
            <div className="col-span-2">Mode</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-3 text-right">Open</div>
          </div>
          {recentPayments?.length ? (
            (recentPayments as RecentPaymentRow[]).map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-12 gap-2 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
              >
                <div className="col-span-5 font-medium">{p.receipt_number}</div>
                <div className="col-span-2 uppercase text-zinc-700">{p.payment_mode}</div>
                <div className="col-span-2">₹{Number(p.amount ?? 0).toFixed(0)}</div>
                <div className="col-span-3 text-right">
                  <Link
                    href={`/payments/${p.id}`}
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-6 text-sm text-zinc-600">No payments yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="text-xs font-medium text-zinc-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
        {value}
      </div>
    </div>
  );
}

