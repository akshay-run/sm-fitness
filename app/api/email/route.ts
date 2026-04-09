import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { hasSentEmail, sendAndLog, type EmailType } from "@/lib/email";

const schema = z.object({
  member_id: z.string().uuid(),
  type: z.enum(["welcome", "receipt", "reminder_7d", "reminder_1d", "expired"]),
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  membership_id: z.string().uuid().optional(),
  allow_duplicate: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const type = parsed.data.type as EmailType;

  if (!parsed.data.allow_duplicate) {
    const already = await hasSentEmail({
      supabaseAdmin,
      member_id: parsed.data.member_id,
      type,
      membership_id: parsed.data.membership_id ?? null,
    });
    if (already) {
      return NextResponse.json({ skipped: true, reason: "duplicate_prevented" });
    }
  }

  const result = await sendAndLog({
    supabaseAdmin,
    member_id: parsed.data.member_id,
    type,
    to: parsed.data.to,
    subject: parsed.data.subject,
    html: parsed.data.html,
    membership_id: parsed.data.membership_id ?? null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

