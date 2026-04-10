import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Pay.Me",
  title: {
    default: "Pay.Me",
    template: "%s · Pay.Me",
  },
  description:
    "The simplest way to request USDC payments on Arc. Create a link, share it, get paid instantly.",
  openGraph: {
    title: "Pay.Me",
    description: "Create a payment link. Get paid in USDC.",
    siteName: "Pay.Me",
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
