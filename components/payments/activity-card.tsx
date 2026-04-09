import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Payment, PaymentRequest } from "@/types/database";

interface ActivityItem {
  id: string;
  type: "received";
  title: string;
  amount: string;
  payer_wallet: string;
  date: string;
  status: Payment["status"];
}

interface ActivityCardProps {
  item: ActivityItem;
}

export function ActivityCard({ item }: ActivityCardProps) {
  const isReceived = item.type === "received";

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-[#10B981]/10 text-[#10B981]">
          <ArrowDownLeft className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{item.title}</h3>
          <div className="text-sm text-muted-foreground truncate">
            from {item.payer_wallet.slice(0, 6)}...{item.payer_wallet.slice(-4)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {new Date(item.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-lg font-bold text-[#10B981]">
            +${item.amount}
          </div>
          {item.status === "submitted" && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F59E0B]/10 text-[#F59E0B]">
              Pending
            </span>
          )}
          {item.status === "confirmed" && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#10B981]/10 text-[#10B981]">
              Confirmed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
