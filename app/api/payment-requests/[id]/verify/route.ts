import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi, decodeEventLog } from "viem";
import { createServerSupabase } from "@/lib/supabase";
import { verifyPaymentSchema } from "@/types/validation";
import { arcTestnet, getStablecoinByAddress } from "@/lib/chain";
import { getPayRouterAddress, PAY_ROUTER_ABI } from "@/lib/pay-router";
import { parseUSDC } from "@/lib/token";

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network"),
});

const TRANSFER_EVENT_ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _idParam } = await params;

  try {
    const body = await req.json();
    const parsed = verifyPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { txHash, paymentRequestId, payerWallet, payerMessage } = parsed.data;
    const supabase = createServerSupabase();

    // Check for duplicate payment recording (idempotent)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status")
      .eq("tx_hash", txHash)
      .single();

    if (existingPayment?.status === "confirmed") {
      return NextResponse.json({ success: true, duplicate: true });
    }

    // Fetch the payment request
    const { data: request, error: requestError } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("id", paymentRequestId)
      .single();

    if (requestError || !request) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    if (request.status === "paid") {
      return NextResponse.json({ success: true, alreadyPaid: true });
    }

    if (request.status === "expired" || request.status === "cancelled") {
      return NextResponse.json({ error: `Payment request is ${request.status}` }, { status: 400 });
    }

    // Check expiry
    if (request.expires_at && new Date(request.expires_at) < new Date()) {
      await supabase
        .from("payment_requests")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", paymentRequestId);
      return NextResponse.json({ error: "Payment request has expired" }, { status: 400 });
    }

    // Fetch and verify transaction on-chain
    let receipt;
    try {
      receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    } catch {
      return NextResponse.json({ error: "Transaction not found on Arc testnet" }, { status: 400 });
    }

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 400 });
    }

    const expectedToken = getStablecoinByAddress(request.token_address);
    const tokenAddrLower = expectedToken.address.toLowerCase();
    const expectedNet = parseUSDC(request.amount_usdc);
    const routerAddr = getPayRouterAddress();

    let valid = false;

    // 1) PayRouter.Paid (approve + pay flow) — match token, payer, recipient, net (must match fixed gross→net math)
    if (routerAddr) {
      const routerLower = routerAddr.toLowerCase();
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== routerLower) continue;
        try {
          const decoded = decodeEventLog({
            abi: PAY_ROUTER_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName !== "Paid") continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const a = decoded.args as any;
          const tokenOk = a.token?.toLowerCase?.() === tokenAddrLower;
          const payerOk = a.payer?.toLowerCase?.() === payerWallet.toLowerCase();
          const recvOk = a.recipient?.toLowerCase?.() === request.recipient_wallet.toLowerCase();
          const netOk = a.netAmount === expectedNet;
          if (tokenOk && payerOk && recvOk && netOk) {
            valid = true;
            break;
          }
        } catch {
          // not a Paid log
        }
      }
    }

    // 2) Direct ERC-20 transfer (legacy)
    if (!valid) {
      const transferLogs = receipt.logs.filter((log) => log.address.toLowerCase() === tokenAddrLower);

      if (transferLogs.length === 0) {
        return NextResponse.json(
          {
            error: `No ${expectedToken.symbol} transfer or PayRouter payment found in this transaction`,
          },
          { status: 400 }
        );
      }

      for (const log of transferLogs) {
        try {
          const decoded = decodeEventLog({
            abi: TRANSFER_EVENT_ABI,
            data: log.data,
            topics: log.topics,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args = decoded.args as any;
          const toMatch = args.to?.toLowerCase() === request.recipient_wallet.toLowerCase();
          const fromMatch = args.from?.toLowerCase() === payerWallet.toLowerCase();
          const amountMatch = args.value === expectedNet;

          if (toMatch && fromMatch && amountMatch) {
            valid = true;
            break;
          }
        } catch {
          // skip undecodable logs
        }
      }
    }

    if (!valid) {
      return NextResponse.json(
        {
          error:
            "Payment verification failed: on-chain transfer does not match this payment link",
        },
        { status: 400 }
      );
    }

    // Record the payment — upsert to handle retries
    const { error: paymentError } = await supabase.from("payments").upsert(
      {
        payment_request_id: paymentRequestId,
        payer_wallet: payerWallet.toLowerCase(),
        payer_message: payerMessage?.trim() ? payerMessage.trim() : null,
        recipient_wallet: request.recipient_wallet,
        amount_usdc: request.amount_usdc,
        token_address: tokenAddrLower,
        tx_hash: txHash,
        chain_id: arcTestnet.id,
        block_number: receipt.blockNumber.toString(),
        status: "confirmed",
        paid_at: new Date().toISOString(),
      },
      { onConflict: "tx_hash" }
    );

    if (paymentError) {
      console.error("Payment recording error:", paymentError);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    // Mark the request as paid
    const { error: updateError } = await supabase
      .from("payment_requests")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", paymentRequestId);

    if (updateError) {
      console.error("Update status error:", updateError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify payment error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
