export type PaymentRequestStatus = "pending" | "paid" | "expired" | "cancelled";
export type PaymentStatus = "submitted" | "confirmed" | "failed";
export type AgentStatus = "draft" | "registered" | "disabled";
export type ReputationEventStatus = "pending" | "confirmed" | "failed";
export type ValidationEventStatus = "pending" | "confirmed" | "failed";

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
      erc8004_agents: {
        Row: {
          id: string;
          slug: string;
          name: string;
          kind: string;
          status: AgentStatus;
          description: string | null;
          owner_wallet: string;
          validator_wallet: string;
          identity_registry: string;
          reputation_registry: string;
          validation_registry: string;
          metadata_uri: string | null;
          metadata_json: Record<string, unknown> | null;
          agent_token_id: string | null;
          register_tx_hash: string | null;
          chain_id: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          kind: string;
          status?: AgentStatus;
          description?: string | null;
          owner_wallet: string;
          validator_wallet: string;
          identity_registry: string;
          reputation_registry: string;
          validation_registry: string;
          metadata_uri?: string | null;
          metadata_json?: Record<string, unknown> | null;
          agent_token_id?: string | null;
          register_tx_hash?: string | null;
          chain_id: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["erc8004_agents"]["Insert"]>;
      };
      erc8004_reputation_events: {
        Row: {
          id: string;
          agent_slug: string;
          agent_token_id: string;
          payment_request_id: string | null;
          payment_tx_hash: string | null;
          reputation_tx_hash: string | null;
          score: number;
          tag: string;
          feedback_type: number;
          comment: string | null;
          feedback_hash: string | null;
          status: ReputationEventStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_slug: string;
          agent_token_id: string;
          payment_request_id?: string | null;
          payment_tx_hash?: string | null;
          reputation_tx_hash?: string | null;
          score: number;
          tag: string;
          feedback_type?: number;
          comment?: string | null;
          feedback_hash?: string | null;
          status?: ReputationEventStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["erc8004_reputation_events"]["Insert"]>;
      };
      erc8004_validation_events: {
        Row: {
          id: string;
          agent_slug: string;
          agent_token_id: string;
          payment_request_id: string | null;
          payment_tx_hash: string | null;
          request_hash: string;
          request_tx_hash: string | null;
          response_tx_hash: string | null;
          tag: string;
          response: number;
          status: ValidationEventStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_slug: string;
          agent_token_id: string;
          payment_request_id?: string | null;
          payment_tx_hash?: string | null;
          request_hash: string;
          request_tx_hash?: string | null;
          response_tx_hash?: string | null;
          tag: string;
          response?: number;
          status?: ValidationEventStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["erc8004_validation_events"]["Insert"]>;
      };
    };
  };
}

export type PaymentRequest = Database["public"]["Tables"]["payment_requests"]["Row"];
export type GiftCampaign = Database["public"]["Tables"]["gift_campaigns"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Erc8004Agent = Database["public"]["Tables"]["erc8004_agents"]["Row"];
export type Erc8004ReputationEvent =
  Database["public"]["Tables"]["erc8004_reputation_events"]["Row"];
export type Erc8004ValidationEvent =
  Database["public"]["Tables"]["erc8004_validation_events"]["Row"];
