import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payments — SM FITNESS",
  description: "Payments and receipts",
};

export default function PaymentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
