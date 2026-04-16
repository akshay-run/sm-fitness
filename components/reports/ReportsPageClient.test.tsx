import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";

jest.mock("jspdf", () => ({
  jsPDF: jest.fn(() => ({})),
}));

jest.mock("jspdf-autotable", () => jest.fn());

import { ReportsPageClient, type SummaryJson } from "./ReportsPageClient";

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("ReportsPageClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async () => new Response(JSON.stringify({ gym_name: "SM FITNESS" }), { status: 200 })) as jest.Mock;
  });

  it("renders payment rows with member, mobile and plan values", () => {
    const summary: SummaryJson = {
      scope: "this_month",
      period: { startIST: "2026-04-01", endIST: "2026-05-01" },
      summary: { payment_count: 1, cash_total: 0, upi_total: 700, grand_total: 700, new_members: 1 },
      payments: [
        {
          id: "p1",
          member_name: "Nono",
          member_mobile: "9317171811",
          payment_date: "2026-04-15",
          plan_name: "Monthly",
          amount: 700,
          mode: "upi",
        },
      ],
      plan_breakdown: [{ plan_id: "plan-1", plan_name: "Monthly", revenue: 700, payment_count: 1, member_count: 1 }],
      member_growth: [{ month: "2026-04", total_members: 1 }],
    };

    renderWithClient(<ReportsPageClient initialSummary={summary} initialGymName="SM FITNESS" />);

    expect(screen.getByText("Nono")).toBeInTheDocument();
    expect(screen.getByText("9317171811")).toBeInTheDocument();
    expect(screen.getAllByText("Monthly").length).toBeGreaterThan(0);
  });

  it("renders empty state when no payment data is present", () => {
    const summary: SummaryJson = {
      scope: "this_month",
      period: { startIST: "2026-04-01", endIST: "2026-05-01" },
      summary: { payment_count: 0, cash_total: 0, upi_total: 0, grand_total: 0, new_members: 0 },
      payments: [],
      plan_breakdown: [],
      member_growth: [],
    };

    renderWithClient(<ReportsPageClient initialSummary={summary} initialGymName="SM FITNESS" />);
    expect(screen.getByText("No payment data for this period.")).toBeInTheDocument();
  });
});
