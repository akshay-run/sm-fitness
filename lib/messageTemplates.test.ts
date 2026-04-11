import { describe, expect, it } from "vitest";
import { membershipRenewalReminderMessage, whatsappLink } from "@/lib/messageTemplates";

describe("messageTemplates", () => {
  it("membershipRenewalReminderMessage includes member and expiry", () => {
    const msg = membershipRenewalReminderMessage({
      memberName: "Test User",
      expiryDate: "11 May 2026",
      gymName: "SM FITNESS",
    });
    expect(msg).toContain("Test User");
    expect(msg).toContain("11 May 2026");
    expect(msg).toContain("SM FITNESS");
  });

  it("whatsappLink encodes message", () => {
    const url = whatsappLink("9876543210", "Hello\nWorld");
    expect(url).toContain("wa.me/919876543210");
    expect(decodeURIComponent(url.split("text=")[1] ?? "")).toContain("Hello");
  });
});
