"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Props = {
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", short: "DB" },
  { href: "/members", label: "Members", short: "MB" },
  { href: "/payments", label: "Payments", short: "PY" },
  { href: "/reports", label: "Reports", short: "RP" },
  { href: "/settings", label: "Settings", short: "ST" },
] as const;

function itemClass(isActive: boolean, collapsed: boolean) {
  return [
    "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
    collapsed ? "justify-center" : "justify-start gap-3",
    isActive
      ? "bg-zinc-900 text-white"
      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
  ].join(" ");
}

export function DashboardSidebar({ children }: Props) {
  const pathname = usePathname();
  const supabase = createSupabaseBrowserClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-[#F4F6F8]">
      <aside
        className={[
          "hidden border-r border-zinc-200 bg-white transition-all duration-200 md:flex md:flex-col",
          collapsed ? "md:w-20" : "md:w-64",
        ].join(" ")}
      >
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-3">
          {!collapsed ? <span className="text-sm font-semibold text-[#1A1A2E]">SM FITNESS</span> : null}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? ">>" : "<<"}
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass(isActive, collapsed)}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="text-xs font-semibold">{item.short}</span>
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-200 p-3">
          <button
            type="button"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-14 items-center border-b border-zinc-200 bg-white px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700"
            aria-label="Open navigation menu"
          >
            Menu
          </button>
          <span className="ml-3 text-sm font-semibold text-zinc-900">SM FITNESS</span>
        </div>

        <main className="flex-1 overflow-x-hidden pb-16 md:pb-0">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-zinc-200 bg-white p-3 shadow-xl">
            <div className="mb-3 flex items-center justify-between border-b border-zinc-200 pb-3">
              <span className="text-sm font-semibold text-zinc-900">SM FITNESS</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
                aria-label="Close navigation menu"
              >
                Close
              </button>
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={itemClass(isActive, false)}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="text-xs font-semibold">{item.short}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
              >
                Logout
              </button>
            </nav>
          </aside>
        </div>
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white md:hidden">
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map((item, idx) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const icon =
              idx === 0
                ? "🏠"
                : idx === 1
                  ? "👥"
                  : idx === 2
                    ? "💳"
                    : idx === 3
                      ? "📊"
                      : "⚙️";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-[11px]",
                  isActive ? "text-[#1A1A2E] font-semibold" : "text-slate-500",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

