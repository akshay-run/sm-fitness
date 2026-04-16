import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewMemberPage from "./page";

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    refresh: mockRefresh,
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

jest.mock("@/components/members/MemberForm", () => ({
  MemberForm: ({ onSubmit }: { onSubmit: (data: unknown) => Promise<void> }) => (
    <button
      type="button"
      onClick={() =>
        void onSubmit({
          full_name: "New User",
          mobile: "9876543210",
          email: "new@example.com",
          joining_date: "2026-04-15",
        })
      }
    >
      Save member
    </button>
  ),
}));

describe("NewMemberPage flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ id: "member-1" }), { status: 201 })
    ) as jest.Mock;
  });

  it("navigates to member profile after successful creation without forced refresh", async () => {
    const user = userEvent.setup();
    render(<NewMemberPage />);

    await user.click(screen.getByRole("button", { name: "Save member" }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/members/member-1");
    });
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
  });
});
