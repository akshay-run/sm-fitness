import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PaymentsPageClient } from "./PaymentsPageClient";

const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "membershipId") return "membership-1";
      if (key === "flow") return "new_member";
      if (key === "page") return "1";
      return null;
    },
    toString: () => "membershipId=membership-1&flow=new_member&page=1",
  }),
}));

jest.mock("./PaymentForm", () => ({
  PaymentForm: ({
    onCreated,
  }: {
    onCreated: (paymentId: string) => void;
  }) => (
    <button type="button" onClick={() => onCreated("payment-1")}>
      Confirm payment
    </button>
  ),
}));

describe("PaymentsPageClient flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async (url: RequestInfo | URL) => {
      const value = String(url);
      if (value.includes("/api/memberships/")) {
        return new Response(JSON.stringify({ membership: { member_id: "member-1", fee_charged: 700 } }), {
          status: 200,
        });
      }
      if (value.includes("/api/members/member-1")) {
        return new Response(JSON.stringify({ member: { full_name: "Nono" } }), { status: 200 });
      }
      return new Response(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 25 }), { status: 200 });
    }) as jest.Mock;
  });

  it("navigates to receipt page after payment create without forced refresh", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <PaymentsPageClient
          initialPayments={{ items: [], total: 0, page: 1, pageSize: 25 }}
        />
      </QueryClientProvider>
    );

    await user.click(screen.getByRole("button", { name: "Confirm payment" }));
    expect(mockReplace).toHaveBeenCalledWith("/payments/payment-1");
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
