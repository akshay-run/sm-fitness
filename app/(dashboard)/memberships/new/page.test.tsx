import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewMembershipPage from "./page";

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "memberId" ? "member-1" : null),
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

jest.mock("@/components/ui/FlowSteps", () => ({
  FlowSteps: () => <div>Flow Steps</div>,
}));

jest.mock("@/components/memberships/MembershipForm", () => ({
  MembershipForm: ({
    onCreated,
  }: {
    onCreated: (created: { id: string; start_date: string; end_date: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onCreated({
          id: "membership-1",
          start_date: "2026-04-15",
          end_date: "2026-05-15",
        })
      }
    >
      Save membership
    </button>
  ),
}));

describe("NewMembershipPage flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ plans: [{ id: "plan-1", name: "Monthly", duration_months: 1 }] }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ member: { full_name: "New User" }, latest_active_end_date: null }), {
          status: 200,
        })
      ) as jest.Mock;
  });

  it("routes to payment step after membership create without forced refresh", async () => {
    const user = userEvent.setup();
    render(<NewMembershipPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save membership" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Save membership" }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/payments?membershipId=membership-1&flow=new_member");
    });
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
  });
});
