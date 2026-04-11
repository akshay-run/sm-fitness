import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { SWRegister } from "@/components/pwa/SWRegister";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SM FITNESS",
  description: "Admin-only gym management system",
  manifest: "/manifest.json",
  applicationName: "SM FITNESS",
};

export const viewport: Viewport = {
  themeColor: "#1A1A2E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SWRegister />
        <InstallPrompt />
        <Toaster richColors position="top-center" />
        {children}
      </body>
    </html>
  );
}
