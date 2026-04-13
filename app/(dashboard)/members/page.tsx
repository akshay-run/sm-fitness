import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { MembersClient, type MemberWithSignedPhoto } from "@/components/members/MembersClient";
import type { MemberTabId, MemberWithMemberships } from "@/lib/members/memberStatus";

type MemberMembershipRow = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  fee_charged: number | string | null;
  status: string | null;
  plans:
    | {
        id: string;
        name: string;
        duration_months: number | null;
      }[]
    | null;
};

type MemberRow = Omit<MemberWithMemberships, "memberships"> & {
  memberships: MemberMembershipRow[] | null;
};

function parseInitialTab(raw: string | undefined): MemberTabId {
  if (raw === "active") return "active";
  if (raw === "expired") return "expired";
  if (raw === "deactivated") return "deactivated";
  return "all";
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const tab = parseInitialTab(typeof sp.tab === "string" ? sp.tab : undefined);
  const expiringWithinDays =
    typeof sp.expiring_within_days === "string" && sp.expiring_within_days.trim()
      ? Number(sp.expiring_within_days)
      : null;

  const gymName = process.env.NEXT_PUBLIC_GYM_NAME ?? "SM FITNESS";
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: allMembers, error } = await supabaseAdmin
    .from("members")
    .select(
      `
      id,
      full_name,
      member_code,
      mobile,
      email,
      is_active,
      welcome_wa_sent,
      photo_url,
      created_at,
      memberships (
        id,
        start_date,
        end_date,
        fee_charged,
        status,
        plans ( id, name, duration_months )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load members
        </div>
      </div>
    );
  }

  const bucket = process.env.SUPABASE_MEMBER_PHOTO_BUCKET || "sm-fitness-member-photo";

  const signedMembers: MemberWithSignedPhoto[] = await Promise.all(
    ((allMembers ?? []) as MemberRow[]).map(async (m) => {
      let photo_signed_url: string | null = null;
      if (m.photo_url) {
        const { data: signed } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(String(m.photo_url), 60 * 60);
        photo_signed_url = signed?.signedUrl ?? null;
      }
      return { ...(m as unknown as MemberWithMemberships), photo_signed_url };
    })
  );

  return (
    <MembersClient
      initialMembers={signedMembers}
      initialTab={tab}
      initialQuery={q}
      initialExpiringWithinDays={Number.isFinite(expiringWithinDays) ? expiringWithinDays : null}
      gymName={gymName}
    />
  );
}
