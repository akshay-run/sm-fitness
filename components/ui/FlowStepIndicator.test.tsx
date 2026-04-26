import { render, screen } from "@testing-library/react";
import { FlowSteps } from "./FlowSteps";

describe("FlowSteps", () => {
  const steps = ["Member info", "Membership plan", "Payment"];
  const short = ["Info", "Plan", "Pay"];

  it("renders 3 short labels", () => {
    render(<FlowSteps steps={steps} shortLabels={short} currentStep={2} />);
    expect(screen.getByText("Info")).toBeInTheDocument();
    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("Pay")).toBeInTheDocument();
  });

  it("shows completed and current step indicators", () => {
    render(<FlowSteps steps={steps} shortLabels={short} currentStep={2} />);
    expect(screen.getByText("✓")).toBeInTheDocument();
    const current = screen.getByText("2");
    expect(current).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("falls back to full labels when shortLabels not provided", () => {
    render(<FlowSteps steps={steps} currentStep={1} />);
    expect(screen.getAllByText("Member info").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Membership plan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Payment").length).toBeGreaterThan(0);
  });
});
