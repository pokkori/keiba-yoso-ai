import { NextResponse } from "next/server";
import { getBacktestStats } from "@/lib/backtest";

export const dynamic = "force-dynamic";

// GET /api/backtest/stats
// 認証不要（公開統計）
export async function GET() {
  const stats = await getBacktestStats();
  return NextResponse.json(stats);
}
