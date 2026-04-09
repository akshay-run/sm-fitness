import { createBrowserClient } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return { url, anonKey };
}

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}

export function createSupabaseServerClient({
  cookies,
}: {
  cookies: {
    getAll(): Array<{ name: string; value: string }>;
    setAll(
      cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>
    ): void;
  };
}) {
  const { url, anonKey } = getSupabaseEnv();
  return createServerClient(url, anonKey, { cookies: cookies as never });
}

export function createSupabaseMiddlewareClient(
  req: NextRequest,
  res: NextResponse
) {
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });
}

