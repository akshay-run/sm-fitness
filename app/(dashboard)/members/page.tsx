"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useOptimistic, useState, startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { formatDateShortIST } from "@/lib/uiFormat";
import {
  membershipRenewalReminderMessage,
  reminderMessage,
  smsLink,
  whatsappLink,
} from "@/lib/messageTemplates";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type MemberTab = "all" | "active_membership" | "expired" | "deactivated";

type MemberListItem = {
  id: string;
  member_code: string;
  full_name: string;
  mobile: string;
  is_active?: boolean;
  membership_plan_name?: string | null;
  membership_end_date?: string | null;
  membership_status?: "active" | "expiring" | "expired" | "none";
  membership_days_left?: number | null;
  photo_signed_url?: string | null;
};

type MemberListResponse = {
  items: MemberListItem[];
  page: number;
  pageSize: number;
  total: number;
  tab?: MemberTab;
  tabCounts?: {
    all: number;
    active_membership: number;
    expired: number;
    deactivated: number;
  };
};

const TAB_LABELS: { id: MemberTab; short: string }[] = [
  { id: "all", short: "All" },
  { id: "active_membership", short: "Active" },
  { id: "expired", short: "Expired" },
  { id: "deactivated", short: "Archived" },
];

export default function MembersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const tab = (searchParams.get("tab") ?? "all") as MemberTab;
  const expiring_within_days = searchParams.get("expiring_within_days");

  const [inputQ, setInputQ] = useState(q);
  const emptyData: MemberListResponse = {
    items: [],
    page: 1,
    pageSize: 25,
    total: 0,
    tabCounts: { all: 0, active_membership: 0, expired: 0, deactivated: 0 },
  };
  const [gymName, setGymName] = useState(process.env.NEXT_PUBLIC_GYM_NAME ?? "SM FITNESS");
  const [restoreTarget, setRestoreTarget] = useState<MemberListItem | null>(null);
  const [hiddenReactivateId, setHiddenReactivateId] = useOptimistic<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const json = await res.json();
        if (res.ok && json.gym_name && !cancelled) setGymName(String(json.gym_name));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setInputQ(q);
  }, [q]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(Math.max(1, page)));
    sp.set("pageSize", "25");
    sp.set("tab", tab);
    if (q) sp.set("q", q);
    if (expiring_within_days) sp.set("expiring_within_days", expiring_within_days);
    return sp.toString();
  }, [q, page, tab, expiring_within_days]);

  const {
    data: queryData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["members", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/members?${queryString}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to load members");
      return json as MemberListResponse;
    },
  });

  const data = queryData ?? emptyData;
  const error = queryError instanceof Error ? queryError.message : null;
  const tabCounts = data.tabCounts ?? emptyData.tabCounts!;

  const visibleMembers = useMemo(
    () => data.items.filter((m) => m.id !== hiddenReactivateId),
    [data.items, hiddenReactivateId]
  );

  const totalPages = Math.max(1, Math.ceil((data.total ?? 0) / (data.pageSize ?? 25)));

  function reminderForMember(m: MemberListItem) {
    const end = m.membership_end_date ? formatDateShortIST(m.membership_end_date) : "";
    if (!end) {
      return reminderMessage({
        name: m.full_name,
        endDate: "",
        daysLeft: m.membership_days_left ?? 0,
      });
    }
    if (m.membership_status === "expired" || (m.membership_days_left ?? 0) <= 0) {
      return reminderMessage({
        name: m.full_name,
        endDate: end,
        daysLeft: 0,
      });
    }
    return membershipRenewalReminderMessage({
      memberName: m.full_name,
      expiryDate: end,
      gymName,
    });
  }

  const navigate = useCallback(
    (next: {
      q?: string;
      page?: number;
      tab?: MemberTab;
      expiring_within_days?: string | null;
    }) => {
      const sp = new URLSearchParams();
      const nq = next.q ?? q;
      const np = next.page ?? page;
      const nt = next.tab ?? tab;
      const ne =
        next.expiring_within_days !== undefined ? next.expiring_within_days : expiring_within_days;
      if (nq) sp.set("q", nq);
      sp.set("page", String(Math.max(1, np)));
      sp.set("pageSize", "25");
      sp.set("tab", nt);
      if (ne) sp.set("expiring_within_days", ne);
      router.push(`${pathname}?${sp.toString()}`);
    },
    [expiring_within_days, q, page, pathname, router, tab]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (inputQ !== q) {
        navigate({ q: inputQ, page: 1 });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [inputQ, navigate, q]);

  async function reactivateMember(m: MemberListItem) {
    startTransition(() => {
      setHiddenReactivateId(m.id);
    });
    try {
      const res = await fetch(`/api/members/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        startTransition(() => {
          setHiddenReactivateId(null);
        });
        toast.error(json?.error ?? "Something went wrong. Please try again.");
        return;
      }
      startTransition(() => {
        setHiddenReactivateId(null);
      });
      toast.success(`${m.full_name} is back in your active list`);
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      navigate({ tab: "all", page: 1 });
    } catch {
      startTransition(() => {
        setHiddenReactivateId(null);
      });
      toast.error("Something went wrong. Please try again.");
    }
  }

  function emptyListMessage() {
    if (tab === "deactivated") {
      return "No archived members. All your members are currently active 🎉";
    }
    if (q.trim()) {
      return "No members match your search. Try a different name or number.";
    }
    return "No members yet. Tap 'New Member' to add your first one.";
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Members</h1>
          <p className="mt-1 text-sm text-slate-500">Find members by name or mobile number.</p>
        </div>
        <Link
          href="/members/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New Member
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative w-full sm:max-w-xl">
          <label htmlFor="members-search" className="sr-only">
            Search by name or mobile number
          </label>
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" strokeLinecap="round" />
          </svg>
          <input
            id="members-search"
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            placeholder="e.g. Rahul or 98765..."
            className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {TAB_LABELS.map(({ id, short }) => {
            const count =
              id === "all"
                ? tabCounts.all
                : id === "active_membership"
                  ? tabCounts.active_membership
                  : id === "expired"
                    ? tabCounts.expired
                    : tabCounts.deactivated;
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigate({ tab: id, page: 1, expiring_within_days: null })}
                className={[
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
                ].join(" ")}
              >
                {short} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <>
            <div className="h-24 animate-pulse rounded-xl bg-zinc-200/70" />
            <div className="h-24 animate-pulse rounded-xl bg-zinc-200/70" />
          </>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : data.items.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            {emptyListMessage()}
          </div>
        ) : visibleMembers.length ? (
          visibleMembers.map((m) => (
            <div key={m.id} className="card-surface rounded-xl border border-zinc-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {m.photo_signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photo_signed_url} alt={m.full_name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                      👤
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#1A1A2E]">{m.full_name}</div>
                    <div className="text-sm text-slate-500">
                      {m.member_code} · {m.mobile}
                    </div>
                    <div className="text-xs text-slate-500">
                      {m.membership_plan_name ?? "No plan"} ·{" "}
                      {m.membership_end_date ? formatDateShortIST(m.membership_end_date) : "No expiry"}
                    </div>
                  </div>
                </div>
                <StatusBadge status={m.membership_status ?? "none"} daysLeft={m.membership_days_left ?? null} />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {tab === "deactivated" ? (
                    <button
                      type="button"
                      onClick={() => setRestoreTarget(m)}
                      className="rounded-lg border border-green-600 bg-white px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-50"
                    >
                      Restore member
                    </button>
                  ) : m.membership_status === "active" || m.membership_status === "expiring" ? (
                    <>
                      <a
                        href={whatsappLink(m.mobile, reminderForMember(m))}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 hover:bg-zinc-50"
                      >
                        WhatsApp
                      </a>
                      <a
                        href={smsLink(m.mobile, reminderForMember(m))}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 hover:bg-zinc-50"
                      >
                        SMS
                      </a>
                    </>
                  ) : (
                    <Link
                      href={`/memberships/new?memberId=${m.id}`}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50"
                    >
                      Renew
                    </Link>
                  )}
                </div>
                <Link
                  href={`/members/${m.id}`}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sm font-medium text-[#1A1A2E] underline underline-offset-4"
                >
                  Open →
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Updating…
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-zinc-700">
        <div>
          Page {data.page} of {totalPages} • Total {data.total}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => navigate({ page: Math.max(1, data.page - 1) })}
            className={[
              "rounded-lg border border-zinc-200 px-3 py-2",
              data.page <= 1 ? "opacity-50" : "hover:bg-zinc-50",
            ].join(" ")}
          >
            Prev
          </button>
          <button
            type="button"
            disabled={data.page >= totalPages}
            onClick={() => navigate({ page: Math.min(totalPages, data.page + 1) })}
            className={[
              "rounded-lg border border-zinc-200 px-3 py-2",
              data.page >= totalPages ? "opacity-50" : "hover:bg-zinc-50",
            ].join(" ")}
          >
            Next
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={restoreTarget != null}
        title={restoreTarget ? `Restore ${restoreTarget.full_name}?` : ""}
        description={
          restoreTarget
            ? `${restoreTarget.full_name} will appear in the active members list\nand can be assigned a new membership.`
            : undefined
        }
        cancelText="Not now"
        confirmText="Yes, restore"
        confirmTone="success"
        onCancel={() => setRestoreTarget(null)}
        onConfirm={() => {
          const t = restoreTarget;
          setRestoreTarget(null);
          if (t) void reactivateMember(t);
        }}
      />
    </div>
  );
}

function StatusBadge({
  status,
  daysLeft,
}: {
  status: "active" | "expiring" | "expired" | "none";
  daysLeft: number | null;
}) {
  if (status === "active") return <span className="status-success rounded-md px-2 py-1 text-xs">Active</span>;
  if (status === "expiring")
    return (
      <span className="status-warning rounded-md px-2 py-1 text-xs">Expires in {daysLeft ?? 0} days</span>
    );
  if (status === "expired") return <span className="status-danger rounded-md px-2 py-1 text-xs">Expired</span>;
  return <span className="status-neutral rounded-md px-2 py-1 text-xs">No membership</span>;
}
