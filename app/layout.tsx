import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();
const defaultOgImage = absoluteUrl("/payme-logo.jpg");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Pay.Me",
  title: {
    default: "Pay.Me",
    template: "%s · Pay.Me",
  },
  description:
    "The simplest way to request USDC payments on Arc. Create a link, share it, get paid instantly.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Pay.Me",
    description: "Create a payment link. Get paid in USDC.",
    siteName: "Pay.Me",
    type: "website",
    locale: "en_US",
    url: "/",
    images: [
      {
        url: defaultOgImage,
        width: 1184,
        height: 864,
        alt: "Pay.Me",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pay.Me",
    description: "Create a payment link. Get paid in USDC.",
    images: {
      url: defaultOgImage,
      alt: "Pay.Me",
    },
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
