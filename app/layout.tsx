import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "pay.me — Create a payment link. Get paid in USDC.",
  description:
    "The simplest way to request USDC payments on Arc. Create a link, share it, get paid instantly.",
  openGraph: {
    title: "pay.me",
    description: "Create a payment link. Get paid in USDC.",
    siteName: "pay.me",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
