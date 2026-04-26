import {
  membershipRenewalReminderMessage,
  welcomeMemberWhatsAppMessage,
  whatsappLink,
} from "@/lib/messageTemplates";

describe("messageTemplates", () => {
  it("membershipRenewalReminderMessage includes member and expiry", () => {
    const msg = membershipRenewalReminderMessage({
      memberName: "Test User",
      expiryDate: "11 May 2026",
      gymName: "SM FITNESS",
    });
    expect(msg).toContain("Test");
    expect(msg).toContain("11 May 2026");
    expect(msg).toContain("SM FITNESS");
  });

  it("welcomeMemberWhatsAppMessage omits group block when link missing", () => {
    const msg = welcomeMemberWhatsAppMessage({
      fullName: "Ganesh",
      memberCode: "GYM-014",
      mobile: "9876543210",
      planName: "Quarterly",
      startDate: "12 Apr 2026",
      endDate: "12 Jul 2026",
    });
    expect(msg).toContain("Ganesh");
    expect(msg).toContain("GYM-014");
    expect(msg).not.toContain("Join our WhatsApp group");
  });

  it("welcomeMemberWhatsAppMessage includes group link when set", () => {
    const msg = welcomeMemberWhatsAppMessage({
      fullName: "Ganesh",
      memberCode: "GYM-014",
      mobile: "9876543210",
      planName: "Quarterly",
      startDate: "12 Apr 2026",
      endDate: "12 Jul 2026",
      whatsappGroupLink: "https://chat.whatsapp.com/abc",
    });
    expect(msg).toContain("Join our WhatsApp group");
    expect(msg).toContain("https://chat.whatsapp.com/abc");
  });

  it("whatsappLink encodes message", () => {
    const url = whatsappLink("9876543210", "Hello\nWorld");
    expect(url).toContain("wa.me/919876543210");
    expect(decodeURIComponent(url.split("text=")[1] ?? "")).toContain("Hello");
  });
});
