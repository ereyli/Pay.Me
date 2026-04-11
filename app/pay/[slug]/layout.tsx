import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/site-url";

const OG_PAYMENT_PATH = "/og-payment.png";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let title = "Pay";
  let description = "Pay with stablecoin on Pay.Me.";

  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from("payment_requests")
      .select("title, amount_usdc")
      .eq("slug", slug)
      .maybeSingle();
    if (data?.title?.trim()) {
      title = data.title.trim();
    }
    if (data) {
      const amt = data.amount_usdc;
      if (amt != null && String(amt).length) {
        description = `${title} — ${amt} · Pay with stablecoin on Pay.Me.`;
      } else {
        description = `${title} — Pay with stablecoin on Pay.Me.`;
      }
    }
  } catch {
    /* fallback */
  }

  const ogTitle = `${title} · Pay.Me`;
  const ogPayment = absoluteUrl(OG_PAYMENT_PATH);
  const pageUrl = absoluteUrl(`/pay/${encodeURIComponent(slug)}`);

  return {
    title,
    description,
    alternates: {
      canonical: `/pay/${encodeURIComponent(slug)}`,
    },
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      url: pageUrl,
      images: [
        {
          url: ogPayment,
          width: 1200,
          height: 630,
          alt: "Pay.Me payment",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [{ url: ogPayment, alt: "Pay.Me payment" }],
    },
  };
}

export default function PaySlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
