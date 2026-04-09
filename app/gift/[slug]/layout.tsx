import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase";

const OG_GIFT = "/og-gift.png";

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

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      images: [
        {
          url: OG_GIFT,
          width: 1200,
          height: 630,
          alt: "Pay.Me gift",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [OG_GIFT],
    },
  };
}

export default function GiftSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
