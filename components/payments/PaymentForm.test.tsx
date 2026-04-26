import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PaymentForm } from "./PaymentForm";

jest.mock("@/components/payments/UPIQRModal", () => ({
  UPIQRModal: ({ open }: { open: boolean }) => (open ? <div>UPI QR Modal</div> : null),
}));

describe("PaymentForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_UPI_ID = "";
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/settings")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ gym_name: "SM FITNESS", upi_id: null, upi_qr_signed_url: null }),
        } as Response);
      }
      if (url.includes("/api/payments")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "pay_1" }),
        } as Response);
      }
      return Promise.resolve({ ok: false, json: async () => ({}) } as Response);
    }) as jest.Mock;
  });

  it("defaults to Cash and shows Record Payment label", () => {
    render(<PaymentForm membershipId="m1" amount={700} memberName="Rahul" onCreated={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Cash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record Payment" })).toBeInTheDocument();
  });

  it("submits cash payment and calls onCreated", async () => {
    const onCreated = jest.fn();
    render(<PaymentForm membershipId="m1" amount={700} memberName="Rahul" onCreated={onCreated} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Record Payment" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("pay_1"));
  });

  it("shows UPI config hint and confirm label in UPI mode", async () => {
    render(<PaymentForm membershipId="m1" amount={700} memberName="Rahul" onCreated={jest.fn()} />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByRole("button", { name: "UPI (QR)" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm payment" }));
    expect(await screen.findByText("Configure UPI ID or upload a UPI QR in Settings.")).toBeInTheDocument();
  });

  it("does not show config error when UPI is configured", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ gym_name: "SM FITNESS", upi_id: "sm@upi", upi_qr_signed_url: null }),
      } as Response)
    );
    render(<PaymentForm membershipId="m1" amount={700} memberName="Rahul" onCreated={jest.fn()} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "UPI (QR)" }));
    expect(await screen.findByText("UPI QR Modal")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm payment" }));
    expect(screen.queryByText("Configure UPI ID or upload a UPI QR in Settings.")).toBeNull();
  });

  it("shows API error message on failure", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ gym_name: "SM FITNESS", upi_id: "gym@upi", upi_qr_signed_url: null }),
      } as Response)
    ).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({ error: "Failed to record payment" }),
      } as Response)
    );

    render(<PaymentForm membershipId="m1" amount={700} memberName="Rahul" onCreated={jest.fn()} />);
    fireEvent.submit(screen.getByRole("button", { name: "Record Payment" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Failed to record payment")).toBeInTheDocument();
    });
  });
});
