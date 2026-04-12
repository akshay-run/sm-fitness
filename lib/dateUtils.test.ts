import {
  addDaysIST,
  addMonthsIST,
  formatISTDate,
  monthBoundsIST,
  parseISTDate,
  previousMonthBoundsIST,
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
});

