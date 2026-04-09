import { z } from "zod";

export const createPaymentRequestSchema = z.object({
  /** Defaults to USDC in API if omitted (older clients). */
  token: z.enum(["USDC", "EURC"]).optional(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be under 100 characters"),
  description: z.string().max(500, "Description must be under 500 characters").optional(),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n > 0;
    }, "Amount must be a positive number")
    .refine((v) => {
      const parts = v.split(".");
      return !parts[1] || parts[1].length <= 6;
    }, "Maximum 6 decimal places"),
  recipientWallet: z
    .string()
    .min(1, "Recipient wallet is required")
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  expiresAt: z.string().optional(),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(32, "Slug must be under 32 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens")
    .optional(),
});

export const verifyPaymentSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash"),
  paymentRequestId: z.string().uuid("Invalid payment request ID"),
  payerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid payer address"),
  payerMessage: z.string().max(160, "Message too long").optional(),
});

export const activateGiftCampaignSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(32, "Slug must be under 32 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  campaignId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid campaign id"),
  creatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  token: z.enum(["USDC", "EURC"]),
  amountPerClaim: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n > 0;
    }, "Amount must be a positive number")
    .refine((v) => {
      const parts = v.split(".");
      return !parts[1] || parts[1].length <= 6;
    }, "Maximum 6 decimal places"),
  maxClaims: z.coerce
    .number()
    .int()
    .min(1, "At least one gift")
    .max(100_000, "Too many claims for one link"),
  fundTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash"),
  title: z.string().max(100).optional(),
});

/** Form fields before funding tx (campaign id + tx added client-side). */
export const createGiftCampaignFormSchema = z.object({
  slug: activateGiftCampaignSchema.shape.slug,
  token: activateGiftCampaignSchema.shape.token,
  amountPerClaim: activateGiftCampaignSchema.shape.amountPerClaim,
  maxClaims: z.number().int().min(1, "At least one gift").max(100_000, "Too many claims for one link"),
  title: activateGiftCampaignSchema.shape.title,
});

export type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type ActivateGiftCampaignInput = z.infer<typeof activateGiftCampaignSchema>;
export type CreateGiftCampaignFormInput = z.infer<typeof createGiftCampaignFormSchema>;
