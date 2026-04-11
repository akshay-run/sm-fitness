import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports — SM FITNESS",
  description: "Revenue and membership reports",
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
