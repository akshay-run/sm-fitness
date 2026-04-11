const shortDateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const longDateFmt = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

const amountFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatDateShortIST(input: string | Date) {
  const d = normalizeDateInput(input);
  return shortDateFmt.format(d);
}

export function formatDateLongIST(input: string | Date) {
  const d = normalizeDateInput(input);
  return longDateFmt.format(d);
}

export function formatDateTimeIST(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  return dateTimeFmt.format(d);
}

export function formatAmountINR(value: number | string) {
  return amountFmt.format(Number(value || 0));
}

/**
 * INR formatted with ASCII-only prefix for PDF generators (jsPDF Helvetica)
 * that do not embed Unicode fonts — avoids garbled rupee symbols.
 */
export function formatAmountPdfINR(value: number | string): string {
  const n = Number(value || 0);
  const s = n.toLocaleString("en-IN", { maximumFractionDigits: 0, minimumFractionDigits: 0 });
  return `₹${s}`;
}

/** Title case for display/PDF (ASCII letters). */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function normalizeDateInput(input: string | Date) {
  if (input instanceof Date) return input;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(`${input}T00:00:00+05:30`);
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return new Date("1970-01-01T00:00:00+05:30");
  }
  return parsed;
}

