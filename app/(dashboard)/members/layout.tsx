import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Members — SM FITNESS",
  description: "Member directory",
};

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
