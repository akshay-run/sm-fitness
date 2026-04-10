import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/members"),
}));

describe("DashboardSidebar", () => {
  it("marks active nav item with aria-current", async () => {
    const { DashboardSidebar } = await import("@/components/navigation/DashboardSidebar");
    render(
      <DashboardSidebar>
        <div>content</div>
      </DashboardSidebar>
    );

    const membersLink = screen.getByRole("link", { name: /members/i });
    expect(membersLink).toHaveAttribute("aria-current", "page");
  });
});

