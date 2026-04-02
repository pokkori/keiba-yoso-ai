import { NextRequest, NextResponse } from "next/server";
import { updatePredictionResult } from "@/lib/backtest";

export const dynamic = "force-dynamic";

// POST /api/backtest/update
// body: { id, actualPos, returnAmount }
// 認証: Authorization: Bearer {CRON_SECRET}
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; actualPos?: number; returnAmount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id || body.actualPos === undefined || body.returnAmount === undefined) {
    return NextResponse.json(
      { error: "id, actualPos, returnAmount are required" },
      { status: 400 }
    );
  }

  await updatePredictionResult(body.id, body.actualPos, body.returnAmount);
  return NextResponse.json({ ok: true });
}
