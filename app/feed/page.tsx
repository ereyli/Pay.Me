"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";

type FeedItem = {
  id: string;
  kind: "payment_sent" | "request_completed" | "gift_claimed" | "gift_pool_claimed";
  message: string;
  subtext?: string;
  createdAt: string;
};

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feed")
      .then((r) => r.json())
      .then((j) => setItems((j.items as FeedItem[]) || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Feed</h1>
          <p className="text-sm text-muted-foreground">Live anonymous activity flow (last 20 events).</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            No feed events yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.slice(0, 20).map((item) => (
              <li key={item.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="text-sm font-medium">{item.message}</div>
                {item.subtext && <div className="text-xs text-muted-foreground mt-1">{item.subtext}</div>}
                <div className="text-[11px] text-muted-foreground mt-2">
                  {new Date(item.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
