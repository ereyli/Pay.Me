"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "usdcme_landing_stats_animated_v1";

const STATS = [
  { end: 24891, label: "Payments settled", suffix: "+" },
  { end: 15620, label: "Links shared", suffix: "+" },
  { end: 892, label: "Wallets on Arc", suffix: "+" },
] as const;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/** Matches common EU-style grouping (e.g. 24.891) in the design reference. */
function formatStat(n: number) {
  return n.toLocaleString("de-DE");
}

export function LandingStats() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  /** User has already seen the full animation (persisted). */
  const [skipAnimation, setSkipAnimation] = useState(true);
  const [inView, setInView] = useState(false);
  const [values, setValues] = useState<number[]>(() => STATS.map(() => 0));

  // Read preferences + whether we should ever animate
  useEffect(() => {
    const w = typeof window !== "undefined" ? window : null;
    if (!w) return;

    const done = !!localStorage.getItem(STORAGE_KEY);
    const reduceMotion = w.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion && !done) {
      localStorage.setItem(STORAGE_KEY, "1");
    }

    const skip = done || reduceMotion;
    setSkipAnimation(skip);
    setValues(skip ? STATS.map((s) => s.end) : STATS.map(() => 0));
    setReady(true);
  }, []);

  // When animation may run, start observing — first time section is visible
  useEffect(() => {
    if (!ready || skipAnimation) return;
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ready, skipAnimation]);

  // Count-up while in view (runs once per “first visit” session storage is set at end)
  useEffect(() => {
    if (!ready || skipAnimation || !inView) return;

    const durationMs = 2400;
    const staggerMs = 320;
    const start = performance.now();

    const frame = (now: number) => {
      const next = STATS.map((stat, i) => {
        const t0 = start + i * staggerMs;
        const elapsed = now - t0;
        if (elapsed <= 0) return 0;
        const t = Math.min(elapsed / durationMs, 1);
        return Math.round(easeOutCubic(t) * stat.end);
      });

      setValues(next);

      const lastStart = start + (STATS.length - 1) * staggerMs;
      const finished = now >= lastStart + durationMs;

      if (finished) {
        setValues(STATS.map((s) => s.end));
        localStorage.setItem(STORAGE_KEY, "1");
        return;
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, skipAnimation, inView]);

  return (
    <section
      ref={containerRef}
      className="w-full max-w-3xl mx-auto mt-20 mb-4 px-1"
      aria-label="Platform statistics"
    >
      {!ready ? (
        <div
          className="grid grid-cols-3 gap-3 sm:gap-4 h-28 rounded-2xl bg-muted/30 animate-pulse"
          aria-hidden
        />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-card px-2 py-4 sm:py-5 shadow-sm"
            >
              <div className="text-2xl sm:text-3xl font-bold tabular-nums text-primary tracking-tight">
                {formatStat(values[i] ?? 0)}
                <span className="text-primary">{stat.suffix}</span>
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground mt-1.5 leading-snug px-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
