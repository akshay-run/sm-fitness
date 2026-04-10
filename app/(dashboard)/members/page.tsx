"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDateShortIST } from "@/lib/uiFormat";
import { reminderMessage, smsLink, whatsappLink } from "@/lib/messageTemplates";

type MemberListItem = {
  id: string;
  member_code: string;
  full_name: string;
  mobile: string;
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
};

export default function MembersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const is_active = searchParams.get("is_active") ?? "true";

  const [inputQ, setInputQ] = useState(q);
  const [data, setData] = useState<MemberListResponse>({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputQ(q);
  }, [q]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(Math.max(1, page)));
    sp.set("pageSize", "20");
    if (q) sp.set("q", q);
    if (is_active) sp.set("is_active", is_active);
    return sp.toString();
  }, [q, page, is_active]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/members?${queryString}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!cancelled) setError(json?.error ?? "Failed to load members");
      } else if (!cancelled) {
        setData({
          items: json.items ?? [],
          page: json.page ?? 1,
          pageSize: json.pageSize ?? 20,
          total: json.total ?? 0,
        });
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const totalPages = Math.max(1, Math.ceil((data.total ?? 0) / (data.pageSize ?? 20)));

  const navigate = useCallback((next: { q?: string; page?: number; is_active?: string }) => {
    const sp = new URLSearchParams();
    const nq = next.q ?? q;
    const np = next.page ?? page;
    const ns = next.is_active ?? is_active;
    if (nq) sp.set("q", nq);
    sp.set("page", String(Math.max(1, np)));
    sp.set("is_active", ns);
    router.push(`${pathname}?${sp.toString()}`);
  }, [is_active, page, pathname, q, router]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (inputQ !== q) {
        navigate({ q: inputQ, page: 1 });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [inputQ, navigate, q]);

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Members</h1>
          <p className="mt-1 text-sm text-slate-500">Search by name or mobile</p>
        </div>
        <Link
          href="/members/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add member
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xl">
          <label htmlFor="members-search" className="sr-only">
            Search members by name or mobile
          </label>
          <input
            id="members-search"
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            placeholder="Search name or mobile"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate({ is_active: "true", page: 1 })}
            className={[
              "rounded-lg px-3 py-2 text-sm",
              is_active !== "false"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 hover:bg-zinc-50",
            ].join(" ")}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => navigate({ is_active: "false", page: 1 })}
            className={[
              "rounded-lg px-3 py-2 text-sm",
              is_active === "false"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 hover:bg-zinc-50",
            ].join(" ")}
          >
            Inactive
          </button>
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
        ) : data.items.length ? (
          data.items.map((m) => (
            <div key={m.id} className="card-surface rounded-xl border border-zinc-200 p-4">
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
                    <div className="text-sm text-slate-500">{m.member_code} · {m.mobile}</div>
                    <div className="text-xs text-slate-500">
                      {(m.membership_plan_name ?? "No plan")} ·{" "}
                      {m.membership_end_date ? formatDateShortIST(m.membership_end_date) : "No expiry"}
                    </div>
                  </div>
                </div>
                <StatusBadge status={m.membership_status ?? "none"} daysLeft={m.membership_days_left ?? null} />
              </div>

              <div className="mt-3 flex items-center justify-between">
                {m.membership_status === "active" || m.membership_status === "expiring" ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={whatsappLink(
                        m.mobile,
                        reminderMessage({
                          name: m.full_name,
                          endDate: m.membership_end_date ? formatDateShortIST(m.membership_end_date) : "",
                          daysLeft: m.membership_days_left ?? 0,
                        })
                      )}
                      className="status-success rounded px-2 py-1 text-xs"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={smsLink(
                        m.mobile,
                        reminderMessage({
                          name: m.full_name,
                          endDate: m.membership_end_date ? formatDateShortIST(m.membership_end_date) : "",
                          daysLeft: m.membership_days_left ?? 0,
                        })
                      )}
                      className="status-info rounded px-2 py-1 text-xs"
                    >
                      SMS
                    </a>
                  </div>
                ) : (
                  <Link href={`/memberships/new?memberId=${m.id}`} className="rounded-lg border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50">
                    Renew
                  </Link>
                )}
                <Link href={`/members/${m.id}`} className="text-sm font-medium text-[#1A1A2E] underline">
                  Open →
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-slate-500">No members found.</div>
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
  if (status === "active") return <span className="status-success rounded px-2 py-1 text-xs">Active</span>;
  if (status === "expiring")
    return <span className="status-warning rounded px-2 py-1 text-xs">Expires in {daysLeft ?? 0} days</span>;
  if (status === "expired") return <span className="status-danger rounded px-2 py-1 text-xs">Expired</span>;
  return <span className="status-neutral rounded px-2 py-1 text-xs">No membership</span>;
}

