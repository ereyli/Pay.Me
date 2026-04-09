export type PaymentRequestStatus = "pending" | "paid" | "expired" | "cancelled";
export type PaymentStatus = "submitted" | "confirmed" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          wallet_address: string | null;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          links: string[] | null;
          tip_jar_slug: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_address?: string | null;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          links?: string[] | null;
          tip_jar_slug?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      payment_requests: {
        Row: {
          id: string;
          user_id: string | null;
          recipient_wallet: string;
          slug: string;
          title: string;
          description: string | null;
          amount_usdc: string;
          token_address: string | null;
          status: PaymentRequestStatus;
          expires_at: string | null;
          allow_partial_payment: boolean;
          success_redirect_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          recipient_wallet: string;
          slug: string;
          title: string;
          description?: string | null;
          amount_usdc: string;
          token_address?: string;
          status?: PaymentRequestStatus;
          expires_at?: string | null;
          allow_partial_payment?: boolean;
          success_redirect_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payment_requests"]["Insert"]>;
      };
      gift_campaigns: {
        Row: {
          id: string;
          slug: string;
          campaign_id: string;
          creator_wallet: string;
          token_address: string;
          amount_per_claim: string;
          max_claims: number;
          chain_id: number;
          fund_tx_hash: string;
          title: string | null;
          view_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          campaign_id: string;
          creator_wallet: string;
          token_address: string;
          amount_per_claim: string;
          max_claims: number;
          chain_id: number;
          fund_tx_hash: string;
          title?: string | null;
          view_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gift_campaigns"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          payment_request_id: string;
          payer_wallet: string;
          payer_message: string | null;
          recipient_wallet: string;
          amount_usdc: string;
          token_address: string | null;
          tx_hash: string;
          chain_id: number;
          block_number: string | null;
          status: PaymentStatus;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_request_id: string;
          payer_wallet: string;
          payer_message?: string | null;
          recipient_wallet: string;
          amount_usdc: string;
          token_address?: string;
          tx_hash: string;
          chain_id: number;
          block_number?: string | null;
          status?: PaymentStatus;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
    };
  };
}

export type PaymentRequest = Database["public"]["Tables"]["payment_requests"]["Row"];
export type GiftCampaign = Database["public"]["Tables"]["gift_campaigns"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
