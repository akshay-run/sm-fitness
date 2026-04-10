import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/members"),
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signOut: vi.fn(async () => ({})),
    },
  }),
}));

describe("DashboardSidebar", () => {
  it("marks active nav item with aria-current", async () => {
    const { DashboardSidebar } = await import("@/components/navigation/DashboardSidebar");
    render(
      <DashboardSidebar>
        <div>content</div>
      </DashboardSidebar>
    );

    const membersLinks = screen.getAllByRole("link", { name: /members/i });
    expect(membersLinks.some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
  }, 20000);
});

