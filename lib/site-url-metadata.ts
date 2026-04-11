import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Open Graph / Twitter: use the **incoming request host** first (Vercel / Cloudflare
 * forward headers) so `og:image` matches what crawlers fetch (`usepay.me` vs `www` vs `*.vercel.app`).
 * Server-only — do not import from client components.
 */
export async function getSiteUrlForMetadata(): Promise<string> {
  try {
    const h = await headers();
    const hostRaw =
      h.get("x-forwarded-host")?.split(",")[0]?.trim() ?? h.get("host")?.trim() ?? null;
    if (hostRaw) {
      let proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
      if (!proto) {
        proto =
          hostRaw.includes("localhost") || hostRaw.startsWith("127.") ? "http" : "https";
      }
      return `${proto}://${hostRaw}`;
    }
  } catch {
    /* build / static */
  }

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  return getSiteUrl();
}

export async function absoluteUrlForMetadata(path: string): Promise<string> {
  const base = (await getSiteUrlForMetadata()).replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
