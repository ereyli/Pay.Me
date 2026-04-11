import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/site-url";

const FALLBACK_OG_PATH = "/payme-logo.jpg";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const safe = username.toLowerCase();

  let title = `@${safe}`;
  let description = `Pay.Me profile · @${safe}`;
  let ogImageUrl = absoluteUrl(FALLBACK_OG_PATH);
  let useLogoDimensions = true;

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
        useLogoDimensions = false;
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

  const ogImages = useLogoDimensions
    ? [
        {
          url: ogImageUrl,
          width: 1184,
          height: 864,
          alt: "Pay.Me",
          type: "image/jpeg" as const,
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
      url: absoluteUrl(pagePath),
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: ogImages,
    },
  };
}

export default function UsernameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
