"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;

      const { data: adminRow, error: adminError } = await supabase
        .from("admins")
        .select("id")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (adminError || !adminRow) {
        await supabase.auth.signOut();
        return;
      }

      router.replace(nextPath);
    })();
    return () => {
      cancelled = true;
    };
  }, [nextPath, router, supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword(
        {
          email: parsed.data.email,
          password: parsed.data.password,
        }
      );

      if (signInError) throw signInError;
      if (!data.user) throw new Error("Login failed. Please try again.");

      const { data: adminRow, error: adminError } = await supabase
        .from("admins")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();
      if (adminError) throw new Error("Unable to verify admin access.");
      if (!adminRow) {
        await supabase.auth.signOut();
        throw new Error(
          "This account is not authorized. Ask the owner to add your user in admins table."
        );
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to login. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            SM FITNESS Admin
          </h1>
          <p className="mt-1 text-sm text-zinc-600">Sign in to manage your gym.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-800" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-sm font-medium text-zinc-800"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

