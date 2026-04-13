/** Display-only Indian mobile: up to 10 digits with space after 5th. */
export function formatMobileDisplay(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return digits;
}

/** Format stored 10-digit mobile for input display. */
export function formatInitialMobile(mobile: string | undefined): string {
  const d = (mobile ?? "").replace(/\D/g, "").slice(0, 10);
  return d.length === 10 ? formatMobileDisplay(d) : mobile ?? "";
}

export function hasNonDigitExceptSpace(value: string): boolean {
  return /[^\d\s]/.test(value);
}
