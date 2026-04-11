import { describe, it, expect } from "vitest";
import { formatAmountINR, formatDateShortIST } from "../lib/uiFormat";

describe("uiFormat", () => {
  describe("formatAmountINR", () => {
    it("formats thousands correctly", () => {
      expect(formatAmountINR(1500)).toContain("1,500");
    });

    it("formats lakhs correctly", () => {
      expect(formatAmountINR(150000)).toContain("1,50,000");
    });
    
    it("handles strings", () => {
      expect(formatAmountINR("2500")).toContain("2,500");
    });

    it("handles zero", () => {
      expect(formatAmountINR(0)).toContain("0");
    });
  });

  describe("formatDateShortIST", () => {
    it("formats standard YYYY-MM-DD", () => {
      expect(formatDateShortIST("2025-02-15")).toBe("15 Feb 2025");
    });

    it("formats Date object", () => {
      const date = new Date("2025-02-15T00:00:00+05:30");
      expect(formatDateShortIST(date)).toBe("15 Feb 2025");
    });
  });
});
