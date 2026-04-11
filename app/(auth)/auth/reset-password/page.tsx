"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase";

function ResetPasswordInner() {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const code =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("code") : null;
      try {
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) {
            if (!cancelled) {
              setError(exErr.message);
              setCheckingSession(false);
            }
            return;
          }
          window.history.replaceState(null, "", "/auth/reset-password");
        }

        await Promise.resolve();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;
        if (!session) {
          setError("Invalid or expired reset link. Request a new one from the login page.");
        } else {
          setSessionReady(true);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not verify reset link.");
        }
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      toast.success("Password updated successfully");
      router.replace("/");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-600">Verifying reset link…</p>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Reset password</h1>
        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <p className="mt-4 text-center text-sm text-zinc-600">
          <Link href="/forgot-password" className="font-medium underline underline-offset-4">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Set new password</h1>
      <p className="mt-1 text-sm text-zinc-600">Choose a new password for your account.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="rp-pw1">
            New password
          </label>
          <input
            id="rp-pw1"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="rp-pw2">
            Confirm password
          </label>
          <input
            id="rp-pw2"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            disabled={loading}
          />
        </div>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-600">Loading…</p>
          </div>
        }
      >
        <ResetPasswordInner />
      </Suspense>
    </div>
  );
}
