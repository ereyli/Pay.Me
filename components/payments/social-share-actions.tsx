"use client";

import { Share2, Send, MessageCircle, Globe, Copy } from "lucide-react";
import { toast } from "sonner";

type SocialShareActionsProps = {
  url: string;
  text: string;
  title?: string;
};

export function SocialShareActions({ url, text, title = "Pay.Me" }: SocialShareActionsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const xHref = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const telegramHref = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, text, url });
    } catch {
      // user cancelled
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          type="button"
          onClick={handleNativeShare}
          className="h-10 rounded-xl border border-border bg-card text-sm font-medium inline-flex items-center justify-center gap-1.5"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 rounded-xl border border-border bg-card text-sm font-medium inline-flex items-center justify-center gap-1.5"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </a>
        <a
          href={xHref}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 rounded-xl border border-border bg-card text-sm font-medium inline-flex items-center justify-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          X
        </a>
        <a
          href={telegramHref}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 rounded-xl border border-border bg-card text-sm font-medium inline-flex items-center justify-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          Telegram
        </a>
        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 rounded-xl border border-border bg-card text-sm font-medium inline-flex items-center justify-center gap-1.5"
        >
          <Globe className="w-4 h-4" />
          Facebook
        </a>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="w-full h-10 rounded-xl border border-border bg-card text-sm font-medium inline-flex items-center justify-center gap-1.5"
      >
        <Copy className="w-4 h-4" />
        Copy link
      </button>
    </div>
  );
}
