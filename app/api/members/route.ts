import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createMemberSchema } from "@/lib/validations/member.schema";
import { getNextMemberCode } from "@/lib/memberCode";
import { hasSentEmail, sendAndLog } from "@/lib/email";
import { renderWelcomeEmail } from "@/components/email/WelcomeEmail";
import { internalServerError } from "@/lib/apiError";

const listQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  is_active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    is_active: url.searchParams.get("is_active") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { q, page, pageSize, is_active } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabaseAdmin = createSupabaseAdminClient();

  let query = supabaseAdmin
    .from("members")
    .select(
      "id, member_code, full_name, mobile, email, photo_url, is_active, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (typeof is_active === "boolean") query = query.eq("is_active", is_active);
  if (q && q.trim()) {
    const qq = q.trim();
    query = query.or(`full_name.ilike.%${qq}%,mobile.ilike.%${qq}%`);
  }

  const { data, error: dbError, count } = await query.range(from, to);
  if (dbError) return internalServerError("Failed to load members");

  return NextResponse.json({
    items: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
  });
}

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  let member_code: string;
  try {
    member_code = await getNextMemberCode(supabaseAdmin);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unable to generate member code";
    return NextResponse.json(
      {
        error:
          "Member code generator is not configured. Ensure next_member_code() RPC and member_code_counter seed row exist.",
        details: msg,
      },
      { status: 503 }
    );
  }

  const insertPayload = {
    member_code,
    full_name: parsed.data.full_name,
    mobile: parsed.data.mobile,
    email: parsed.data.email ? parsed.data.email : null,
    date_of_birth: parsed.data.date_of_birth ? parsed.data.date_of_birth : null,
    gender: parsed.data.gender ?? null,
    address: parsed.data.address ? parsed.data.address : null,
    emergency_contact_name: parsed.data.emergency_contact_name
      ? parsed.data.emergency_contact_name
      : null,
    emergency_contact_phone: parsed.data.emergency_contact_phone
      ? parsed.data.emergency_contact_phone
      : null,
    notes: parsed.data.notes ? parsed.data.notes : null,
    is_active: true,
  };

  const { data, error: dbError } = await supabaseAdmin
    .from("members")
    .insert(insertPayload)
    .select("id, member_code, full_name, email")
    .single();

  if (dbError) return internalServerError("Failed to create member");

  // Welcome email (optional if email exists), duplicate-prevented via email_logs.
  if (data.email) {
    const already = await hasSentEmail({
      supabaseAdmin,
      member_id: data.id,
      type: "welcome",
    });
    if (!already) {
      const gymName = process.env.NEXT_PUBLIC_GYM_NAME || "SM FITNESS";
      const html = renderWelcomeEmail({
        gymName,
        memberName: data.full_name,
        memberCode: data.member_code,
      });
      await sendAndLog({
        supabaseAdmin,
        member_id: data.id,
        type: "welcome",
        to: data.email,
        subject: `Welcome to ${gymName}`,
        html,
      });
    }
  }

  return NextResponse.json({ id: data.id, member_code: data.member_code }, { status: 201 });
}

