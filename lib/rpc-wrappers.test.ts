import { getNextMemberCode } from "@/lib/memberCode";
import { getNextReceiptNumber } from "@/lib/receiptNumber";

describe("RPC wrappers", () => {
  it("returns member code from rpc", async () => {
    const supabaseMock = {
      rpc: async (name: string) => ({
        data: name === "next_member_code" ? "GYM-123" : null,
        error: null,
      }),
    };

    await expect(getNextMemberCode(supabaseMock as never)).resolves.toBe("GYM-123");
  });

  it("throws when member code rpc fails", async () => {
    const supabaseMock = {
      rpc: async () => ({
        data: null,
        error: { message: "rpc failed" },
      }),
    };

    await expect(getNextMemberCode(supabaseMock as never)).rejects.toThrow("rpc failed");
  });

  it("returns receipt number from rpc", async () => {
    const supabaseMock = {
      rpc: async (name: string) => ({
        data: name === "next_receipt_number" ? "RCP-2026-0001" : null,
        error: null,
      }),
    };

    await expect(getNextReceiptNumber(supabaseMock as never)).resolves.toBe(
      "RCP-2026-0001"
    );
  });
});

