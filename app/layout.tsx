import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { OG_SITE } from "@/lib/og-assets";
import { absoluteUrlForMetadata, getSiteUrlForMetadata } from "@/lib/site-url-metadata";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrlForMetadata();
  const defaultOgImage = await absoluteUrlForMetadata(OG_SITE.path);

  return {
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
          width: OG_SITE.width,
          height: OG_SITE.height,
          alt: "Pay.Me",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Pay.Me",
      description: "Create a payment link. Get paid in USDC.",
      images: [defaultOgImage],
    },
  };
}

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
