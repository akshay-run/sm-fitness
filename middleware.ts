import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/login")) return NextResponse.next();
  if (pathname.startsWith("/api/cron")) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(req, res);
  const { data } = await supabase.auth.getUser();

  if (data.user) return res;

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)",
  ],
};

