import { formatInTimeZone } from "date-fns-tz";
import { addDays, addMonths, startOfMonth } from "date-fns";

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

