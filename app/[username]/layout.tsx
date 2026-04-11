import type { Metadata } from "next";
import { OG_SITE } from "@/lib/og-assets";
import { createServerSupabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/site-url";
import { absoluteUrlForMetadata } from "@/lib/site-url-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const safe = username.toLowerCase();

  let title = `@${safe}`;
  let description = `Pay.Me profile · @${safe}`;
  let ogImageUrl = await absoluteUrlForMetadata(OG_SITE.path);
  let useBrandedOgDimensions = true;

  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("display_name, bio, avatar_url")
      .eq("username", safe)
      .maybeSingle();

    if (data) {
      const dn = data.display_name?.trim();
      if (dn) title = `${dn} (@${safe})`;
      if (data.bio?.trim()) description = data.bio.trim().slice(0, 200);
      const av = data.avatar_url?.trim();
      if (av) {
        useBrandedOgDimensions = false;
        ogImageUrl = av.startsWith("http")
          ? av
          : absoluteUrl(av.startsWith("/") ? av : `/${av}`);
      }
    }
  } catch {
    /* fallbacks above */
  }

  const ogTitle = `${title} · Pay.Me`;
  const pagePath = `/${encodeURIComponent(username)}`;

  const ogImages = useBrandedOgDimensions
    ? [
        {
          url: ogImageUrl,
          width: OG_SITE.width,
          height: OG_SITE.height,
          alt: "Pay.Me",
          type: "image/png" as const,
        },
      ]
    : [{ url: ogImageUrl, alt: title }];

  return {
    title,
    description,
    alternates: {
      canonical: pagePath,
    },
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      url: await absoluteUrlForMetadata(pagePath),
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function UsernameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
