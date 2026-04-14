"use client";

import { useEffect, useState } from "react";
import { Copy, Check, LogOut, ExternalLink, Save, Pencil, ShieldCheck, Star } from "lucide-react";
import { useAccount, useDisconnect, useBalance } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import { UsdcCoin } from "@/components/brand/usdc-coin";
import { StablecoinMark } from "@/components/brand/stablecoin-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLayout } from "@/components/layout/app-layout";
import { USDC_ADDRESS, EURC_ADDRESS } from "@/lib/chain";
import { shortenAddress } from "@/lib/token";
import { arcTestnet } from "@/lib/chain";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [origin, setOrigin] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [tipJarSlug, setTipJarSlug] = useState("");
  const [linksText, setLinksText] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [trustSummary, setTrustSummary] = useState<{
    averageScore: number | null;
    reputationCount: number;
    validationCount: number;
    validationTags: string[];
    isTrusted: boolean;
  } | null>(null);

  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_ADDRESS,
    chainId: arcTestnet.id,
  });

  const { data: eurcBalance } = useBalance({
    address,
    token: EURC_ADDRESS,
    chainId: arcTestnet.id,
  });

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    toast.success("Address copied!");
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const loadProfile = async (wallet: string) => {
    const res = await fetch(`/api/profiles/by-wallet/${wallet.toLowerCase()}`);
    const data = await res.json();
    if (!data.profile) {
      setHasSavedProfile(false);
      setIsEditingProfile(true);
      return;
    }
    setUsername(data.profile.username || "");
    setDisplayName(data.profile.display_name || "");
    setBio(data.profile.bio || "");
    setTipJarSlug(data.profile.tip_jar_slug || "");
    setLinksText((data.profile.links || []).join("\n"));
    setHasSavedProfile(true);
    setIsEditingProfile(false);
  };

  useEffect(() => {
    if (!address) return;
    loadProfile(address).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    fetch("/api/trust/summary")
      .then((r) => r.json())
      .then((data) => setTrustSummary(data))
      .catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    if (!address) return;
    if (usernameError) {
      toast.error(usernameError);
      return;
    }
    setSaving(true);
    try {
      const links = linksText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      const res = await fetch(`/api/profiles/by-wallet/${address.toLowerCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          displayName,
          bio,
          tipJarSlug,
          links,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Profile updated");
      setHasSavedProfile(true);
      setIsEditingProfile(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = username ? `${origin}/${username}` : "";
  const usernameError =
    username && !/^[a-z0-9-]{3,24}$/.test(username)
      ? "Username only accepts English lowercase letters (a-z), numbers (0-9), and hyphen (-). Example: firat-1"
      : "";

  const copyPublicUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopiedPublic(true);
    setTimeout(() => setCopiedPublic(false), 1600);
  };

  if (!isConnected) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 flex justify-center">
              <UsdcCoin size={72} />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Connect your wallet</h2>
            <p className="text-muted-foreground mb-8">Connect to view your profile</p>
            <ConnectButton />
          </div>
        </div>
      </AppLayout>
    );
  }

  const initials = address ? address.slice(2, 4).toUpperCase() : "?";

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-1">Profile</h1>
          <p className="text-muted-foreground">Manage your account and settings</p>
          <div className="mt-3 md:hidden inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Dark mode</span>
            <ThemeToggle />
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2775CA] to-[#1A5FA0] flex items-center justify-center text-white text-3xl font-bold mb-4">
              {initials}
            </div>
            <h2 className="text-2xl font-semibold mb-1">{shortenAddress(address!)}</h2>
            <div className="text-primary font-medium text-sm">Arc Testnet</div>
            {trustSummary && (
              <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified by Pay.Me Agent
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium">
                  <Star className="w-3.5 h-3.5 text-primary" />
                  Agent reputation: {trustSummary.averageScore ?? "—"}
                </div>
              </div>
            )}
          </div>

          {/* Stablecoin balances (ERC-20 interface) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="bg-gradient-to-br from-[#2775CA] to-[#1A5FA0] rounded-2xl p-5 text-white text-center">
              <div className="flex items-center justify-center gap-2 text-sm opacity-90 mb-1">
                <UsdcCoin size={20} className="ring-2 ring-white/35" />
                <span>USDC</span>
              </div>
              <div className="text-3xl font-bold tabular-nums">
                {usdcBalance
                  ? parseFloat(usdcBalance.formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : "—"}
              </div>
              <div className="text-xs opacity-80 mt-1">ERC-20 balance</div>
            </div>
            <div className="bg-gradient-to-br from-[#003399] to-[#001a4d] rounded-2xl p-5 text-white text-center">
              <div className="flex items-center justify-center gap-2 text-sm opacity-90 mb-1">
                <StablecoinMark symbol="EURC" size={20} />
                <span>EURC</span>
              </div>
              <div className="text-3xl font-bold tabular-nums">
                {eurcBalance
                  ? parseFloat(eurcBalance.formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : "—"}
              </div>
              <div className="text-xs opacity-80 mt-1">Euro stablecoin</div>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Wallet Address</div>
            <div className="bg-elevated rounded-2xl p-4 flex items-center gap-3">
              <div className="flex-1 text-sm font-mono truncate text-foreground">
                {address}
              </div>
              <button
                onClick={handleCopyAddress}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-card transition-colors"
              >
                {copiedAddress ? (
                  <Check className="w-4 h-4 text-[#10B981]" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
            <a
              href={`https://testnet.arcscan.app/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              View on ArcScan
            </a>
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Creator profile</h3>
              <p className="text-sm text-muted-foreground">Public page: pay.me/{username || "your-name"}</p>
            </div>
            {hasSavedProfile && !isEditingProfile && (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="h-10 px-3 rounded-xl border border-border text-sm font-medium inline-flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit profile
              </button>
            )}
          </div>

          {!isEditingProfile && hasSavedProfile ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border px-4 py-3">
                <div className="text-xs text-muted-foreground">Username</div>
                <div className="text-sm font-medium">{username || "-"}</div>
              </div>
              <div className="rounded-2xl border border-border px-4 py-3">
                <div className="text-xs text-muted-foreground">Display name</div>
                <div className="text-sm font-medium">{displayName || "-"}</div>
              </div>
              <div className="rounded-2xl border border-border px-4 py-3">
                <div className="text-xs text-muted-foreground">Bio</div>
                <div className="text-sm">{bio || "-"}</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {publicUrl && (
                  <button
                    type="button"
                    onClick={copyPublicUrl}
                    className="h-11 px-4 rounded-2xl border border-border text-sm font-medium inline-flex items-center justify-center gap-2"
                  >
                    {copiedPublic ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
                    {copiedPublic ? "Copied" : "Copy public URL"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  placeholder="firat"
                  className="w-full h-12 rounded-2xl border border-border px-4 bg-card text-sm"
                />
                {usernameError && <p className="text-xs text-red-500">{usernameError}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Firat"
                  className="w-full h-12 rounded-2xl border border-border px-4 bg-card text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Designer • Creator • Coffee lover"
                  className="w-full rounded-2xl border border-border px-4 py-3 bg-card text-sm resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tip jar slug (optional)</label>
                <input
                  value={tipJarSlug}
                  onChange={(e) => setTipJarSlug(e.target.value)}
                  placeholder="your-tip-link-slug"
                  className="w-full h-12 rounded-2xl border border-border px-4 bg-card text-sm"
                />
                <p className="text-xs text-muted-foreground">People tap Tip jar &rarr; /pay/your-tip-link-slug</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pinned links (one per line)</label>
                <textarea
                  value={linksText}
                  onChange={(e) => setLinksText(e.target.value)}
                  rows={4}
                  placeholder="https://x.com/...\nhttps://youtube.com/..."
                  className="w-full rounded-2xl border border-border px-4 py-3 bg-card text-sm"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={saving || Boolean(usernameError)}
                  onClick={handleSaveProfile}
                  className="h-12 px-4 rounded-2xl cta-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save profile"}
                </button>
                {hasSavedProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="h-12 px-4 rounded-2xl border border-border text-sm font-medium"
                  >
                    Cancel
                  </button>
                )}
                {publicUrl && (
                  <button
                    type="button"
                    onClick={copyPublicUrl}
                    className="h-12 px-4 rounded-2xl border border-border text-sm font-medium inline-flex items-center justify-center gap-2"
                  >
                    {copiedPublic ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
                    {copiedPublic ? "Copied" : "Copy public URL"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions Card */}
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold mb-4">Network</h3>

          <div className="bg-elevated rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Arc Testnet</div>
                <div className="text-sm text-muted-foreground">Chain ID: 5042002</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-xs text-[#10B981] font-medium">Active</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-muted" />

          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between py-3 hover:text-primary transition-colors"
          >
            <div>
              <div className="font-medium">Get testnet USDC &amp; EURC</div>
              <div className="text-sm text-muted-foreground">Circle faucet — select Arc and token</div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>

          <div className="h-px bg-muted" />

          <button
            onClick={() => disconnect()}
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 h-14 rounded-2xl font-medium flex items-center gap-3 px-4 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Disconnect Wallet
          </button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>pay.me v1.0.0</p>
          <p className="mt-1">Built on Arc Testnet</p>
        </div>
      </div>
    </AppLayout>
  );
}
