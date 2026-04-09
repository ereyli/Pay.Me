"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { shortenAddress } from "@/lib/token";

type PublicProfile = {
  wallet_address: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  tip_jar_slug: string | null;
  links: string[] | null;
};

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/profiles/by-username/${encodeURIComponent(username)}`)
      .then(async (r) => {
        if (!r.ok) return null;
        const j = await r.json();
        return j.profile as PublicProfile;
      })
      .then((p) => setProfile(p))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Profile not found</h1>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">{profile.display_name || `@${profile.username}`}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{shortenAddress(profile.wallet_address)}</p>
          </div>

          {profile.bio && <p className="text-sm leading-relaxed">{profile.bio}</p>}

          <div className="space-y-2">
            {profile.tip_jar_slug && (
              <Link
                href={`/pay/${profile.tip_jar_slug}`}
                className="block h-12 rounded-2xl cta-primary text-primary-foreground text-center text-sm font-semibold leading-[3rem]"
              >
                Tip jar
              </Link>
            )}

            {(profile.links ?? []).map((item) => (
              <a
                key={item}
                href={item}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 rounded-xl border border-border/60 bg-card flex items-center justify-between px-4 text-sm"
              >
                <span className="truncate">{item}</span>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
