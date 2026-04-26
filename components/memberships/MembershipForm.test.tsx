import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MembershipForm } from "./MembershipForm";

describe("MembershipForm", () => {
  const plans = [
    { id: "550e8400-e29b-41d4-a716-446655440000", name: "Monthly", duration_months: 1, default_price: 1200 },
    { id: "550e8400-e29b-41d4-a716-446655440001", name: "Quarterly", duration_months: 3, default_price: 3000 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          id: "mem_1",
          start_date: "2026-04-01",
          end_date: "2026-05-01",
        }),
      } as Response)
    ) as jest.Mock;
  });

  it("renders plans and info banner", () => {
    render(
      <MembershipForm
        memberId="m1"
        plans={plans}
        latestActiveEndDate={null}
        onCreated={jest.fn()}
      />
    );
    expect(screen.getByLabelText("Plan")).toBeInTheDocument();
    expect(screen.getByText("Dates are auto-calculated based on existing active membership (if any).")).toBeInTheDocument();
  });

  it("shows high fee warning for large values", () => {
    render(
      <MembershipForm
        memberId="m1"
        plans={plans}
        latestActiveEndDate={null}
        onCreated={jest.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText("Fee charged"), { target: { value: "60000" } });
    expect(screen.getByText("That seems high — double-check the amount")).toBeInTheDocument();
  });

  it("submits and calls onCreated", async () => {
    const onCreated = jest.fn();
    render(
      <MembershipForm
        memberId="m1"
        plans={plans}
        latestActiveEndDate={null}
        onCreated={onCreated}
      />
    );
    fireEvent.change(screen.getByLabelText("Plan"), { target: { value: "550e8400-e29b-41d4-a716-446655440000" } });
    fireEvent.change(screen.getByLabelText("Fee charged"), { target: { value: "1500" } });
    fireEvent.click(screen.getByRole("button", { name: "Save membership" }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith({
        id: "mem_1",
        start_date: "2026-04-01",
        end_date: "2026-05-01",
      });
    });
  });

  it("shows API error message on failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed to create membership" }),
    } as Response);

    render(
      <MembershipForm
        memberId="m1"
        plans={plans}
        latestActiveEndDate={null}
        onCreated={jest.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText("Plan"), { target: { value: "550e8400-e29b-41d4-a716-446655440000" } });
    fireEvent.change(screen.getByLabelText("Fee charged"), { target: { value: "1500" } });
    fireEvent.click(screen.getByRole("button", { name: "Save membership" }));

    expect(await screen.findByText("Failed to create membership")).toBeInTheDocument();
  });
});
