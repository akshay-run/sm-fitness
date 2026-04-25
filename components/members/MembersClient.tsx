"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDateShortIST } from "@/lib/uiFormat";
import {
  getLatestNonCancelledMembership,
  getMembershipDaysLeft,
  getMembershipStatus,
  type MemberTabId,
  type MemberWithMemberships,
  type MembershipStatus,
} from "@/lib/members/memberStatus";
import {
  membershipRenewalReminderMessage,
  reminderMessage,
  smsLink,
  whatsappLink,
} from "@/lib/messageTemplates";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export type MemberWithSignedPhoto = MemberWithMemberships & {
  photo_signed_url: string | null;
};

const TAB_LABELS: { id: MemberTabId; short: string }[] = [
  { id: "all", short: "All" },
  { id: "active", short: "Active" },
  { id: "expired", short: "Expired" },
  { id: "deactivated", short: "Archived" },
];

function toDisplayMembershipStatus(s: MembershipStatus): "active" | "expiring" | "expired" | "none" {
  if (s === "active") return "active";
  if (s === "expiring_soon") return "expiring";
  if (s === "expired") return "expired";
  return "none";
}

function normalizeSearch(s: string) {
  return s.toLowerCase().replace(/\s/g, "");
}

function reminderForMember(args: {
  full_name: string;
  membership_end_date: string | null;
  membership_days_left: number | null;
  membership_status: "active" | "expiring" | "expired" | "none";
  gymName: string;
}) {
  const end = args.membership_end_date ? formatDateShortIST(args.membership_end_date) : "";
  if (!end) {
    return reminderMessage({
      name: args.full_name,
      endDate: "",
      daysLeft: args.membership_days_left ?? 0,
    });
  }
  if (args.membership_status === "expired" || (args.membership_days_left ?? 0) <= 0) {
    return reminderMessage({
      name: args.full_name,
      endDate: end,
      daysLeft: 0,
    });
  }
  return membershipRenewalReminderMessage({
    memberName: args.full_name,
    expiryDate: end,
    gymName: args.gymName,
  });
}

export function MembersClient(props: {
  initialMembers: MemberWithSignedPhoto[];
  initialTab: MemberTabId;
  initialQuery: string;
  initialExpiringWithinDays: number | null;
  gymName: string;
}) {
  const [members, setMembers] = useState<MemberWithSignedPhoto[]>(props.initialMembers);
  const [activeTab, setActiveTab] = useState<MemberTabId>(props.initialTab);
  const [searchQuery, setSearchQuery] = useState<string>(props.initialQuery);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  const [expiringWithinDays, setExpiringWithinDays] = useState<number | null>(
    props.initialExpiringWithinDays
  );

  const [restoreTarget, setRestoreTarget] = useState<MemberWithSignedPhoto | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<MemberWithSignedPhoto | null>(null);

  const computed = useMemo(() => {
    const now = new Date();
    const m = members.map((row) => {
      const latest = getLatestNonCancelledMembership(row.memberships);
      const membership_end_date = latest?.end_date ? String(latest.end_date) : null;
      const membership_plan_name = latest?.plans?.[0]?.name ?? null;
      const status = getMembershipStatus(row, now);
      const daysLeft = getMembershipDaysLeft(row, now);
      return {
        ...row,
        membership_end_date,
        membership_plan_name,
        membership_status: toDisplayMembershipStatus(status),
        membership_days_left: daysLeft,
        derived_status: status,
      };
    });
    return m;
  }, [members]);

  const counts = useMemo(() => {
    const allActive = computed.filter((m) => m.is_active);
    const active = allActive.filter((m) => m.derived_status === "active" || m.derived_status === "expiring_soon");
    const expired = allActive.filter((m) => m.derived_status === "expired" || m.derived_status === "no_membership");
    const deactivated = computed.filter((m) => !m.is_active);
    return {
      all: allActive.length,
      active: active.length,
      expired: expired.length,
      deactivated: deactivated.length,
    };
  }, [computed]);

  const filteredMembers = useMemo(() => {
    const now = new Date();
    let list = computed;

    // Expiring-within filter (deep link from dashboard)
    if (expiringWithinDays != null) {
      list = list.filter((m) => {
        if (!m.is_active) return false;
        const daysLeft = getMembershipDaysLeft(m, now);
        return daysLeft != null && daysLeft >= 0 && daysLeft <= expiringWithinDays;
      });
    }

    // Tab filter
    switch (activeTab) {
      case "all":
        list = list.filter((m) => m.is_active);
        break;
      case "active":
        list = list.filter(
          (m) =>
            m.is_active && (m.derived_status === "active" || m.derived_status === "expiring_soon")
        );
        break;
      case "expired":
        list = list.filter(
          (m) =>
            m.is_active && (m.derived_status === "expired" || m.derived_status === "no_membership")
        );
        break;
      case "deactivated":
        list = list.filter((m) => !m.is_active);
        break;
    }

    // Search filter
    const q = searchQuery.trim();
    if (q) {
      const nq = normalizeSearch(q);
      list = list.filter((m) => {
        const name = normalizeSearch(m.full_name ?? "");
        const mobile = normalizeSearch(m.mobile ?? "");
        const code = normalizeSearch(m.member_code ?? "");
        return name.includes(nq) || mobile.includes(nq) || code.includes(nq);
      });
    }

    return list;
  }, [activeTab, computed, expiringWithinDays, searchQuery]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredMembers.length / pageSize)),
    [filteredMembers.length, pageSize]
  );

  const visibleMembers = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize;
    return filteredMembers.slice(from, to);
  }, [filteredMembers, page, pageSize, totalPages]);

  function emptyListMessage() {
    if (activeTab === "deactivated") {
      return "No archived members. All your members are currently active 🎉";
    }
    if (searchQuery.trim()) {
      return "No members match your search. Try a different name or number.";
    }
    return "No members yet. Tap 'New Member' to add your first one.";
  }

  async function handleRestore(member: MemberWithSignedPhoto) {
    // Optimistic update
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, is_active: true } : m)));

    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Could not restore member. Please try again.");
      toast.success(`${member.full_name} is back in your active list`);
      setActiveTab("all");
      setPage(1);
    } catch (e: unknown) {
      // Revert on failure (fallback to initial snapshot)
      setMembers(props.initialMembers);
      toast.error(e instanceof Error ? e.message : "Could not restore member. Please try again.");
    }
  }

  async function handleArchive(member: MemberWithSignedPhoto) {
    // Optimistic update
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, is_active: false } : m)));

    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Could not archive member. Please try again.");
      toast.success(`${member.full_name} has been archived`);
      setActiveTab("deactivated");
      setPage(1);
    } catch (e: unknown) {
      setMembers(props.initialMembers);
      toast.error(e instanceof Error ? e.message : "Could not archive member. Please try again.");
    }
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
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. Rahul or 98765..."
            className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
          {TAB_LABELS.map(({ id, short }) => {
            const count =
              id === "all"
                ? counts.all
                : id === "active"
                  ? counts.active
                  : id === "expired"
                    ? counts.expired
                    : counts.deactivated;
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setExpiringWithinDays(null);
                  setPage(1);
                }}
                className={[
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
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

      {expiringWithinDays != null ? (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <div>Showing members expiring within {expiringWithinDays} days</div>
          <button
            type="button"
            className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium hover:bg-amber-100/40"
            onClick={() => setExpiringWithinDays(null)}
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            {emptyListMessage()}
          </div>
        ) : (
          visibleMembers.map((m) => (
            <div key={m.id} className="card-surface rounded-xl border border-zinc-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {m.photo_signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photo_signed_url} alt={m.full_name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {getInitials(m.full_name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#1A1A2E]">{m.full_name}</div>
                    <div className="text-sm text-slate-500">
                      {m.member_code} · {m.mobile}
                    </div>
                    <div className="text-xs text-slate-500">
                      {m.membership_plan_name
                        ? `${m.membership_plan_name} · ${m.membership_end_date ? formatDateShortIST(m.membership_end_date) : "No expiry"}`
                        : "No membership"}
                    </div>
                  </div>
                </div>
                <StatusBadge status={m.membership_status ?? "none"} daysLeft={m.membership_days_left ?? null} />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {activeTab === "deactivated" ? (
                    <button
                      type="button"
                      onClick={() => setRestoreTarget(m)}
                      className="rounded-lg border border-green-600 bg-white px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-50"
                    >
                      Restore member
                    </button>
                  ) : (
                    <>
                      {(m.membership_status === "active" || m.membership_status === "expiring") && (
                        <>
                          <a
                            href={whatsappLink(
                              m.mobile,
                              reminderForMember({
                                full_name: m.full_name,
                                membership_end_date: m.membership_end_date,
                                membership_days_left: m.membership_days_left,
                                membership_status: m.membership_status ?? "none",
                                gymName: props.gymName,
                              })
                            )}
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 hover:bg-zinc-50"
                          >
                            WhatsApp
                          </a>
                          <a
                            href={smsLink(
                              m.mobile,
                              reminderForMember({
                                full_name: m.full_name,
                                membership_end_date: m.membership_end_date,
                                membership_days_left: m.membership_days_left,
                                membership_status: m.membership_status ?? "none",
                                gymName: props.gymName,
                              })
                            )}
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 hover:bg-zinc-50"
                          >
                            SMS
                          </a>
                        </>
                      )}
                      {m.membership_status !== "active" && m.membership_status !== "expiring" ? (
                        <Link
                          href={`/memberships/new?memberId=${m.id}`}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50"
                        >
                          Renew
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setArchiveTarget(m)}
                        className="inline-flex min-h-[36px] items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Archive
                      </button>
                    </>
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
        )}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-zinc-700">
        <div>
          Page {Math.min(page, totalPages)} of {totalPages} • Total {filteredMembers.length}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={[
              "rounded-lg border border-zinc-200 px-3 py-2",
              page <= 1 ? "opacity-50" : "hover:bg-zinc-50",
            ].join(" ")}
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={[
              "rounded-lg border border-zinc-200 px-3 py-2",
              page >= totalPages ? "opacity-50" : "hover:bg-zinc-50",
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
          if (t) void handleRestore(t);
        }}
      />

      <ConfirmDialog
        open={archiveTarget != null}
        title={archiveTarget ? `Archive ${archiveTarget.full_name}?` : ""}
        description={
          archiveTarget
            ? `${archiveTarget.full_name} will be moved to the Archived tab.\nYou can restore them anytime.`
            : undefined
        }
        cancelText="Not now"
        confirmText="Yes, archive"
        confirmTone="danger"
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => {
          const t = archiveTarget;
          setArchiveTarget(null);
          if (t) void handleArchive(t);
        }}
      />
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "M";
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${second}`.toUpperCase();
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

