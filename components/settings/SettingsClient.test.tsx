import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { SettingsClient } from "./SettingsClient";

describe("SettingsClient hydration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(
      () =>
        new Promise<Response>(() => {
          // Keep pending to verify initialData-driven render.
        })
    ) as jest.Mock;
  });

  it("renders initial settings values immediately from server-provided props", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <SettingsClient
          initialSettings={{
            gym_name: "SM FITNESS",
            address: "Gym street",
            phone: "9999999999",
            upi_id: "sm@upi",
            backup_email: "backup@example.com",
            whatsapp_group_link: "https://chat.whatsapp.com/example",
            logo_signed_url: null,
            upi_qr_signed_url: null,
            logo_path: null,
            upi_qr_path: null,
          }}
        />
      </QueryClientProvider>
    );

    expect(screen.getByDisplayValue("SM FITNESS")).toBeInTheDocument();
    expect(screen.getByDisplayValue("backup@example.com")).toBeInTheDocument();
  });
});
