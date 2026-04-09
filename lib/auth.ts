import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase";

type RequireUserResult =
  | { user: null; error: string }
  | { user: NonNullable<Awaited<ReturnType<ReturnType<typeof createSupabaseServerClient>["auth"]["getUser"]>>["data"]["user"]>; error: null };

export async function requireUser() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient({
    cookies: {
      getAll() {
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...(options ?? {}) });
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error) return { user: null, error: error.message } satisfies RequireUserResult;
  if (!data.user)
    return { user: null, error: "Unauthorized" } satisfies RequireUserResult;

  const { data: adminRow, error: adminError } = await supabase
    .from("admins")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (adminError) {
    return { user: null, error: "Admin verification failed" } satisfies RequireUserResult;
  }
  if (!adminRow) {
    return { user: null, error: "Admin access required" } satisfies RequireUserResult;
  }

  return { user: data.user, error: null } satisfies RequireUserResult;
}

export const requireAdminUser = requireUser;

