import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";
import { AutoLogout } from "@/components/auth/AutoLogout";
import { DashboardSidebar } from "@/components/navigation/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent("/")}`);
  const { data: adminRow } = await supabase
    .from("admins")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!adminRow) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50">
      <AutoLogout />
      <DashboardSidebar>{children}</DashboardSidebar>
    </div>
  );
}

