import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase";
import { absoluteUrlForMetadata } from "@/lib/site-url-metadata";

const OG_GIFT_PATH = "/og-gift.png";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let title = "Gift";
  let description = "Claim a stablecoin gift on Pay.Me.";

  try {
    const supabase = createServerSupabase();
    const { data } = await supabase.from("gift_campaigns").select("title").eq("slug", slug).maybeSingle();
    if (data?.title?.trim()) {
      title = data.title.trim();
      description = `${title} — claim on Pay.Me.`;
    }
  } catch {
    /* fallback */
  }

  const ogTitle = `${title} · Pay.Me`;
  const ogGift = await absoluteUrlForMetadata(OG_GIFT_PATH);
  const pageUrl = await absoluteUrlForMetadata(`/gift/${encodeURIComponent(slug)}`);

  return {
    title,
    description,
    alternates: {
      canonical: `/gift/${encodeURIComponent(slug)}`,
    },
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      url: pageUrl,
      images: [
        {
          url: ogGift,
          width: 1200,
          height: 630,
          alt: "Pay.Me gift",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogGift],
    },
  };
}

export default function GiftSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
