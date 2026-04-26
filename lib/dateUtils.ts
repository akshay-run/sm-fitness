import { formatInTimeZone } from "date-fns-tz";
import { addDays, addMonths, startOfMonth, startOfQuarter, subQuarters } from "date-fns";

export const IST_TZ = "Asia/Kolkata";

export function todayISTDateString() {
  return formatInTimeZone(new Date(), IST_TZ, "yyyy-MM-dd");
}

export function parseISTDate(dateString: string) {
  // Interpret a DATE column value as IST midnight.
  return new Date(`${dateString}T00:00:00+05:30`);
}

export function formatISTDate(date: Date) {
  return formatInTimeZone(date, IST_TZ, "yyyy-MM-dd");
}

export function addDaysIST(dateString: string, days: number) {
  return formatISTDate(addDays(parseISTDate(dateString), days));
}

export function addMonthsIST(dateString: string, months: number) {
  return formatISTDate(addMonths(parseISTDate(dateString), months));
}

export function monthBoundsIST(date = new Date()) {
  // Returns ISO strings with +05:30 offset for Supabase timestamptz filtering.
  const istNow = new Date(formatInTimeZone(date, IST_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"));
  const start = startOfMonth(istNow);
  const startIST = formatInTimeZone(start, IST_TZ, "yyyy-MM-dd'T'00:00:00XXX");
  const nextMonth = addMonths(start, 1);
  const endIST = formatInTimeZone(nextMonth, IST_TZ, "yyyy-MM-dd'T'00:00:00XXX");
  return { startIST, endIST };
}

export function previousMonthBoundsIST(date = new Date()) {
  const { startIST } = monthBoundsIST(date);
  const prevStart = addMonths(new Date(startIST), -1);
  const prevStartIST = formatInTimeZone(prevStart, IST_TZ, "yyyy-MM-dd'T'00:00:00XXX");
  const prevEndIST = startIST;
  return { startIST: prevStartIST, endIST: prevEndIST };
}

/** Exclusive end: first instant of next quarter (IST). */
export function thisQuarterBoundsIST(date = new Date()) {
  const istNow = new Date(formatInTimeZone(date, IST_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"));
  const q0 = startOfQuarter(istNow);
  const q1 = addMonths(q0, 3);
  return {
    startIST: formatInTimeZone(q0, IST_TZ, "yyyy-MM-dd'T'00:00:00XXX"),
    endIST: formatInTimeZone(q1, IST_TZ, "yyyy-MM-dd'T'00:00:00XXX"),
  };
}

export function lastQuarterBoundsIST(date = new Date()) {
  const shifted = subQuarters(
    new Date(formatInTimeZone(date, IST_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX")),
    1
  );
  const q0 = startOfQuarter(shifted);
  const q1 = addMonths(q0, 3);
  return {
    startIST: formatInTimeZone(q0, IST_TZ, "yyyy-MM-dd'T'00:00:00XXX"),
    endIST: formatInTimeZone(q1, IST_TZ, "yyyy-MM-dd'T'00:00:00XXX"),
  };
}

export type ReportScope =
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "all_time";

export function reportScopeBounds(scope: ReportScope): {
  startIST: string | null;
  endIST: string | null;
} {
  if (scope === "all_time") return { startIST: null, endIST: null };
  if (scope === "this_month") {
    const { startIST, endIST } = monthBoundsIST();
    return { startIST, endIST };
  }
  if (scope === "last_month") {
    const { startIST, endIST } = previousMonthBoundsIST();
    return { startIST, endIST };
  }
  if (scope === "this_quarter") {
    const { startIST, endIST } = thisQuarterBoundsIST();
    return { startIST, endIST };
  }
  if (scope === "last_quarter") {
    const { startIST, endIST } = lastQuarterBoundsIST();
    return { startIST, endIST };
  }
  return { startIST: null, endIST: null };
}

export function getDaysRemaining(endDate: string): number {
  const today = todayISTDateString();
  const endMs = new Date(`${endDate}T00:00:00+05:30`).getTime();
  const todayMs = new Date(`${today}T00:00:00+05:30`).getTime();
  return Math.ceil((endMs - todayMs) / (1000 * 60 * 60 * 24));
}

export function getMembershipStatusFromEndDate(
  endDate: string | null
): "active" | "expiring" | "expired" | "no-plan" {
  if (!endDate) return "no-plan";
  const daysRemaining = getDaysRemaining(endDate);
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 7) return "expiring";
  return "active";
}

