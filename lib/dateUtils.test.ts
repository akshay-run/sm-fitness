import {
  addDaysIST,
  addMonthsIST,
  formatISTDate,
  getDaysRemaining,
  getMembershipStatusFromEndDate,
  monthBoundsIST,
  parseISTDate,
  previousMonthBoundsIST,
  reportScopeBounds,
  thisQuarterBoundsIST,
  lastQuarterBoundsIST,
} from "@/lib/dateUtils";

describe("dateUtils", () => {
  it("parses and formats IST date consistently", () => {
    const d = parseISTDate("2026-01-15");
    expect(formatISTDate(d)).toBe("2026-01-15");
  });

  it("adds days in IST correctly", () => {
    expect(addDaysIST("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("adds months for membership duration", () => {
    expect(addMonthsIST("2026-01-01", 1)).toBe("2026-02-01");
    expect(addMonthsIST("2026-01-01", 12)).toBe("2027-01-01");
    // Jan 31 + 1 month → Feb 28 (date-fns addMonths)
    expect(addMonthsIST("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsIST("2026-01-31", 3)).toBe("2026-04-30");
  });

  it("returns this and previous month bounds", () => {
    const fixed = new Date("2026-04-20T10:00:00+05:30");
    const thisM = monthBoundsIST(fixed);
    const prevM = previousMonthBoundsIST(fixed);

    expect(thisM.startIST.startsWith("2026-04-01T00:00:00")).toBe(true);
    expect(thisM.endIST.startsWith("2026-05-01T00:00:00")).toBe(true);
    expect(prevM.startIST.startsWith("2026-03-01T00:00:00")).toBe(true);
    expect(prevM.endIST.startsWith("2026-04-01T00:00:00")).toBe(true);
  });

  it("getDaysRemaining returns correct signed values", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-25T12:00:00+05:30"));
    expect(getDaysRemaining("2026-04-25")).toBe(0);
    expect(getDaysRemaining("2026-04-26")).toBe(1);
    expect(getDaysRemaining("2026-05-02")).toBe(7);
    expect(getDaysRemaining("2026-04-24")).toBe(-1);
    jest.useRealTimers();
  });

  it("getMembershipStatusFromEndDate applies expiring window", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-25T12:00:00+05:30"));
    expect(getMembershipStatusFromEndDate(null)).toBe("no-plan");
    expect(getMembershipStatusFromEndDate("2026-04-24")).toBe("expired");
    expect(getMembershipStatusFromEndDate("2026-04-25")).toBe("expiring");
    expect(getMembershipStatusFromEndDate("2026-05-02")).toBe("expiring");
    expect(getMembershipStatusFromEndDate("2026-05-03")).toBe("active");
    jest.useRealTimers();
  });

  it("reportScopeBounds returns inclusive start + exclusive end in IST", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-25T12:00:00+05:30"));
    const r = reportScopeBounds("this_month");
    expect(r.startIST?.startsWith("2026-04-01T00:00:00")).toBe(true);
    expect(r.endIST?.startsWith("2026-05-01T00:00:00")).toBe(true);
    jest.useRealTimers();
  });

  it("quarter bounds are stable and exclusive end", () => {
    const fixed = new Date("2026-04-20T10:00:00+05:30");
    const thisQ = thisQuarterBoundsIST(fixed);
    const lastQ = lastQuarterBoundsIST(fixed);
    expect(thisQ.startIST.startsWith("2026-04-01T00:00:00")).toBe(true);
    expect(thisQ.endIST.startsWith("2026-07-01T00:00:00")).toBe(true);
    expect(lastQ.endIST.startsWith("2026-04-01T00:00:00")).toBe(true);
  });
});

