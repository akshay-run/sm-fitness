import { render, screen } from "@testing-library/react";
import { AvatarFallback } from "./AvatarFallback";

describe("AvatarFallback", () => {
  it("renders initials for missing photo", () => {
    render(<AvatarFallback name="Rahul Sharma" />);
    expect(screen.getByText("RS")).toBeInTheDocument();
  });

  it("renders default initial when name is empty", () => {
    render(<AvatarFallback name="   " />);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("renders image when photoUrl exists", () => {
    render(<AvatarFallback name="Rahul Sharma" photoUrl="https://img.example/a.png" />);
    const img = screen.getByRole("img", { name: "Rahul Sharma" });
    expect(img).toBeInTheDocument();
  });
});
