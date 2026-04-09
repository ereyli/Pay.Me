# pay.me

> Create a payment link. Get paid in USDC.

A production-quality payment link app built on Arc Testnet using direct USDC transfers. No custom contracts — just clean, fast stablecoin payments.

## Features

- **Create payment links** — title, amount, description, expiry, custom slug
- **Public payment pages** — `/pay/[slug]` — shareable, mobile-friendly
- **Wallet connect** — RainbowKit with Arc Testnet support
- **USDC transfer** — direct ERC-20 transfer, no escrow contracts
- **On-chain verification** — backend verifies tx hash, recipient, and amount
- **Dashboard** — view all links, filter by status (paid/pending/expired)
- **Activity log** — all confirmed payments
- **Wrong network detection** — one-click switch to Arc Testnet

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4 |
| Wallet | wagmi v2, viem, RainbowKit |
| Backend | Next.js Route Handlers |
| Database | Supabase (Postgres) |
| Validation | Zod, react-hook-form |
| Contracts | Solidity 0.8.24, Foundry, OpenZeppelin v5 |

## Smart contracts (`contracts/`)

`PayRouter` pulls ERC-20 from the payer (`transferFrom`), deducts a configurable **fee in basis points** (max 10%), and forwards the rest to the recipient. Only **owner-whitelisted** tokens (e.g. Arc USDC + EURC) are accepted. The payer must **approve** the router before `pay`.

```bash
cd contracts
forge build
```

Deploy `PayRouter` yourself (Arc testnet or other); when you have the deployed address, add it to the app env (e.g. `NEXT_PUBLIC_PAY_ROUTER_ADDRESS`) so the UI can call `approve` + `pay`. Until then the app uses **direct** `transfer` to the recipient.

## Arc Testnet Config

| Parameter | Value |
|---|---|
| Network | Arc Testnet |
| Chain ID | 5042002 |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| USDC Contract | `0x3600000000000000000000000000000000000000` |
| Faucet | `https://faucet.circle.com` |

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd pay-me
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the SQL editor and run the contents of `supabase/schema.sql`
3. If you already ran an **older** version of `schema.sql` that allowed public INSERT/UPDATE on `payment_requests` / `payments`, run `supabase/rls-hardening.sql` once to remove those policies (writes stay allowed via the **service role** in API routes only).
4. Copy your project URL and keys

**Checklist after SQL**

| Item | Why |
|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser reads (pay page, dashboard lists) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — never commit or expose; used by `/api/payment-requests/*` |
| WalletConnect project ID | RainbowKit modal |
| Run `rls-hardening.sql` if you started from permissive policies | Stops random clients from inserting/updating rows with the anon key |

**Known MVP tradeoff:** `SELECT` on `payments` is still open (`using (true)`) so the activity query works from the client. Tightening this (e.g. only rows where `recipient_wallet` matches) needs a signed session or a small API route — fine to defer.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-id
```

Get a WalletConnect Project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com) (free).

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How It Works

### Payment Flow

1. **Creator** visits `/create`, connects wallet, fills form → gets a shareable link like `pay.me/pay/abc123`
2. **Payer** opens the link, connects wallet, clicks "Pay X USDC"
3. **Frontend** calls USDC `transfer(recipient, amount)` via wagmi
4. **After tx confirmed**, frontend POSTs `{ txHash, payerWallet, paymentRequestId }` to `/api/payment-requests/[id]/verify`
5. **Backend** verifies on-chain:
   - Transaction exists and succeeded
   - Transfer event has correct `to` (recipient), `from` (payer), `value` (amount)
   - Marks request as `paid` in Supabase

### Payment Verification (Critical)

The verification route (`app/api/payment-requests/[id]/verify/route.ts`) does the following checks:

- Fetches tx receipt from Arc RPC
- Confirms `receipt.status === "success"`
- Finds `Transfer` event from USDC contract address in the logs
- Decodes the event and compares: recipient wallet, payer wallet, USDC amount (in bigint/6 decimals)
- Uses upsert with `tx_hash` unique constraint to prevent duplicate recording
- Marks request as `paid` atomically

### Token Amount Handling

All amounts are handled as `bigint` with 6 decimal places (USDC ERC-20 standard):

```typescript
// Human readable "10.5" → bigint 10500000n
parseUSDC("10.5") // → 10500000n

// bigint 10500000n → "10.5"
formatUSDC(10500000n) // → "10.5"
```

Never use `parseFloat` or `Number()` for token amounts.

## Project Structure

```
pay-me/
├── app/
│   ├── page.tsx              # Landing page
│   ├── dashboard/
│   │   ├── page.tsx          # Dashboard overview
│   │   └── links/
│   │       ├── page.tsx      # All payment links
│   │       └── [id]/page.tsx # Link detail
│   ├── create/page.tsx       # Create payment link
│   ├── pay/[slug]/page.tsx   # Public payment page
│   ├── activity/page.tsx     # Payment history
│   ├── profile/page.tsx      # Profile & settings
│   └── api/
│       └── payment-requests/
│           ├── create/route.ts
│           └── [id]/
│               ├── route.ts
│               └── verify/route.ts
├── components/
│   ├── providers.tsx          # wagmi + RainbowKit + TanStack
│   ├── layout/
│   │   ├── app-layout.tsx
│   │   ├── top-nav.tsx
│   │   └── bottom-nav.tsx
│   └── payments/
│       ├── payment-card.tsx
│       ├── stats-card.tsx
│       └── activity-card.tsx
├── lib/
│   ├── chain.ts              # Arc testnet config + USDC ABI
│   ├── token.ts              # USDC amount parsing/formatting
│   ├── supabase.ts           # Supabase client
│   ├── wagmi-config.ts       # wagmi + RainbowKit config
│   └── utils.ts              # cn(), generateSlug(), etc.
├── types/
│   ├── database.ts           # Supabase table types
│   └── validation.ts         # Zod schemas
└── supabase/
    └── schema.sql            # Database schema
```

## Security Notes

- Never trust frontend payment status — always verify on-chain via backend
- Amounts use `bigint` throughout to prevent floating-point errors
- Duplicate payments prevented via unique `tx_hash` constraint
- Slug uniqueness enforced at DB level and in API
- Expired links checked at verification time
