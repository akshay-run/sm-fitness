import { differenceInDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const MEMBER_TAB_IDS = ["all", "active", "expired", "deactivated"] as const;
export type MemberTabId = (typeof MEMBER_TAB_IDS)[number];

export type MembershipStatus =
  | "active"
  | "expiring_soon"
  | "expired"
  | "no_membership";

export type MemberMembershipPlan = {
  id: string;
  name: string;
  duration_months: number | null;
};

export type MemberMembership = {
  id?: string;
  start_date?: string | null;
  end_date?: string | null;
  fee_charged?: number | string | null;
  status?: string | null;
  plans?: MemberMembershipPlan[] | null;
};

export type MemberWithMemberships = {
  id: string;
  full_name: string;
  member_code: string;
  mobile: string;
  email: string | null;
  is_active: boolean;
  welcome_wa_sent: boolean | null;
  photo_url: string | null;
  created_at: string;
  memberships: MemberMembership[] | null;
};

export function getLatestNonCancelledMembership(
  memberships: MemberMembership[] | null | undefined
): MemberMembership | null {
  const eligible = (memberships ?? []).filter((m) => String(m.status ?? "") !== "cancelled");
  if (!eligible.length) return null;

  return eligible.reduce((a, b) => {
    const aEnd = String(a.end_date ?? "");
    const bEnd = String(b.end_date ?? "");
    return aEnd >= bEnd ? a : b;
  });
}

export function getMembershipStatus(
  member: { memberships: Array<{ end_date?: string | null; status?: string | null }> | null },
  now: Date = new Date()
): MembershipStatus {
  const todayIST = toZonedTime(now, "Asia/Kolkata");
  const latest = getLatestNonCancelledMembership(member.memberships);
  if (!latest?.end_date) return "no_membership";

  const endDate = new Date(String(latest.end_date));
  const daysLeft = differenceInDays(endDate, todayIST);

  if (daysLeft < 0) return "expired";
  if (daysLeft <= 7) return "expiring_soon";
  return "active";
}

export function getMembershipDaysLeft(
  member: { memberships: Array<{ end_date?: string | null; status?: string | null }> | null },
  now: Date = new Date()
): number | null {
  const todayIST = toZonedTime(now, "Asia/Kolkata");
  const latest = getLatestNonCancelledMembership(member.memberships);
  if (!latest?.end_date) return null;

  const endDate = new Date(String(latest.end_date));
  return differenceInDays(endDate, todayIST);
}

