import Link from "next/link";
import { ArrowRight, Link2, Shield, Zap } from "lucide-react";
import { EurcCoin, UsdcCoin } from "@/components/brand/usdc-coin";
import { PayMeLogo } from "@/components/brand/payme-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LandingStats } from "@/components/landing/landing-stats";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <PayMeLogo heightPx={36} priority />
          <span className="text-xl font-semibold">Pay.Me</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="text-sm font-medium text-primary hover:underline"
          >
            Open App →
          </Link>
        </div>
      </header>

      {/* Hero + features (narrow); stats full width below */}
      <main className="flex-1 flex flex-col items-center px-6 py-16 w-full">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto w-full">
          <div className="mx-auto mb-6 flex items-center justify-center">
            <PayMeLogo heightPx={112} priority className="drop-shadow-lg" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Create a payment link.{" "}
            <span className="text-primary">Get paid in USDC &amp; EURC.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            The simplest way to request stablecoin payments on Arc. Share a link, get paid instantly.
          </p>

          <Link
            href="/create"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-4 rounded-2xl text-lg transition-all active:scale-95 shadow-lg shadow-primary/25"
          >
            Create Payment Link
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href="/dashboard"
            className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Go to dashboard →
          </Link>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full text-left">
            {[
            {
              icon: <Zap className="w-5 h-5 text-primary" />,
              title: "Instant payments",
              desc: "Sub-second finality on Arc network",
            },
            {
              icon: <Shield className="w-5 h-5 text-primary" />,
              title: "Secure & verified",
              desc: "Every payment verified on-chain",
            },
            {
              icon: <Link2 className="w-5 h-5 text-primary" />,
              title: "Simple links",
              desc: "Share anywhere, pay from any wallet",
            },
            ].map((f) => (
              <div key={f.title} className="bg-card rounded-2xl p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <LandingStats />
      </main>

      <footer className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <span>Powered by Arc Testnet</span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1">
          <UsdcCoin size={16} />
          <EurcCoin size={16} />
          <span className="ml-0.5">stablecoin payments</span>
        </span>
      </footer>
    </div>
  );
}
