import { formatAmountINR, formatDateLongIST, formatDateShortIST } from "@/lib/uiFormat";

describe("uiFormat helpers", () => {
  it("formats date-only input as short IST date", () => {
    expect(formatDateShortIST("2026-04-10")).toBe("10 Apr 2026");
  });

  it("formats timestamp input without invalid date", () => {
    expect(formatDateShortIST("2026-04-10T05:30:00.000Z")).toContain("Apr");
  });

  it("formats long IST date", () => {
    expect(formatDateLongIST("2026-04-10")).toContain("April");
  });

  it("formats INR with comma grouping", () => {
    expect(formatAmountINR(1800)).toBe("₹1,800");
  });
});

