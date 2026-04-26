import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { PlansManager } from "./PlansManager";

function renderWithQuery(ui: JSX.Element) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("PlansManager", () => {
  beforeEach(() => {
    global.fetch = jest.fn(
      () =>
        Promise.resolve({
          ok: true,
          json: async () => ({ plans: [] }),
        } as Response)
    ) as jest.Mock;
  });

  it("shows duration label and full-width add plan button", () => {
    renderWithQuery(<PlansManager initialPlans={[]} />);
    expect(screen.getByText("Duration (months)")).toBeInTheDocument();
    const add = screen.getByRole("button", { name: "Add plan" });
    expect(add.className).toContain("w-full");
  });

  it("uses singular/plural month labels and activation actions", () => {
    renderWithQuery(
      <PlansManager
        initialPlans={[
          {
            id: "p1",
            name: "Monthly",
            duration_months: 1,
            default_price: 1000,
            is_active: true,
          },
          {
            id: "p2",
            name: "Quarterly",
            duration_months: 3,
            default_price: 2500,
            is_active: false,
          },
        ]}
      />
    );

    expect(screen.getAllByText("1 month").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3 months").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Deactivate" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Activate" }).length).toBeGreaterThan(0);
  });
});
