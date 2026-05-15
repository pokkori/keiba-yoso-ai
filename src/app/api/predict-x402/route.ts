/**
 * x402-protected prediction endpoint for AI agents / programmatic access
 * Payment: $0.05 USDC on Base Mainnet per prediction
 * Protocol: https://x402.org
 */
import { NextRequest, NextResponse } from "next/server";
import { X402_ROUTE_CONFIG } from "@/lib/x402Server";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

const innerHandler = async (req: NextRequest): Promise<NextResponse> => {
  const baseUrl =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const resp = await fetch(`${baseUrl}/api/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-X402-Internal": process.env.X402_INTERNAL_SECRET ?? "",
      "X-Forwarded-For": req.headers.get("x-forwarded-for") ?? "x402-agent",
    },
    body: JSON.stringify(body),
  });

  return new NextResponse(resp.body, {
    status: resp.status,
    headers: {
      "Content-Type": resp.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-cache",
      "X-X402-Served": "1",
    },
  });
};

// x402 wrap at request-time to avoid build-time facilitator connection
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { withX402 } = await import("@x402/next");
    const { getX402Server } = await import("@/lib/x402Server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = withX402(innerHandler as any, X402_ROUTE_CONFIG as any, getX402Server() as any);
    return wrapped(req) as Promise<NextResponse>;
  } catch {
    // x402 unavailable - fallback to direct handler
    return innerHandler(req);
  }
}
