"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type MemberListItem = {
  id: string;
  member_code: string;
  full_name: string;
  mobile: string;
  email: string | null;
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

  function navigate(next: { q?: string; page?: number; is_active?: string }) {
    const sp = new URLSearchParams();
    const nq = next.q ?? q;
    const np = next.page ?? page;
    const ns = next.is_active ?? is_active;
    if (nq) sp.set("q", nq);
    sp.set("page", String(Math.max(1, np)));
    sp.set("is_active", ns);
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Members</h1>
          <p className="mt-1 text-sm text-zinc-600">Search by name or mobile. Never hard delete.</p>
        </div>
        <Link
          href="/members/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add member
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <form
          className="flex w-full gap-2 sm:max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: inputQ, page: 1 });
          }}
        >
          <input
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            placeholder="Search name or mobile"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Search
          </button>
        </form>

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

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-600">
          <div className="col-span-5">Member</div>
          <div className="col-span-3">Mobile</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-1 text-right">View</div>
        </div>
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-600">Loading...</div>
        ) : error ? (
          <div className="px-4 py-6 text-sm text-red-700">{error}</div>
        ) : data.items.length ? (
          data.items.map((m) => (
            <div
              key={m.id}
              className="grid grid-cols-12 gap-2 px-4 py-3 text-sm text-zinc-900 hover:bg-zinc-50"
            >
              <div className="col-span-5">
                <div className="font-medium">{m.full_name}</div>
                <div className="text-xs text-zinc-500">{m.member_code}</div>
              </div>
              <div className="col-span-3">{m.mobile}</div>
              <div className="col-span-3 truncate text-zinc-600">{m.email ?? "—"}</div>
              <div className="col-span-1 text-right">
                <Link
                  href={`/members/${m.id}`}
                  className="text-sm font-medium text-zinc-900 underline underline-offset-4"
                >
                  Open
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-10 text-center text-sm text-zinc-600">No members found.</div>
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

