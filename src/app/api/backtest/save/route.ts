import { NextRequest, NextResponse } from "next/server";
import { savePrediction } from "@/lib/backtest";

export const dynamic = "force-dynamic";

// POST /api/backtest/save
// body: { raceId, raceName, raceDate, recommendation, horseNum, horseName, ev, odds,
//         actualPos?, hit?, returnAmount? }
// 認証不要（サーバーサイドから内部的に呼び出す想定）
export async function POST(req: NextRequest) {
  let body: {
    raceId?: string;
    raceName?: string;
    raceDate?: string;
    recommendation?: string;
    horseNum?: number | null;
    horseName?: string | null;
    ev?: number | null;
    odds?: number | null;
    // バックテスト用: 予想と結果を同時保存
    actualPos?: number | null;
    hit?: boolean | null;
    returnAmount?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.raceId || !body.recommendation) {
    return NextResponse.json({ error: "raceId and recommendation are required" }, { status: 400 });
  }
  if (body.recommendation !== "buy" && body.recommendation !== "skip") {
    return NextResponse.json({ error: "recommendation must be buy or skip" }, { status: 400 });
  }

  const id = await savePrediction({
    raceId: body.raceId,
    raceName: body.raceName ?? "",
    raceDate: body.raceDate ?? new Date().toISOString().slice(0, 10),
    recommendation: body.recommendation as "buy" | "skip",
    horseNum: body.horseNum ?? null,
    horseName: body.horseName ?? null,
    ev: body.ev ?? null,
    odds: body.odds ?? null,
    actualPos: body.actualPos ?? null,
    hit: body.hit ?? null,
    returnAmount: body.returnAmount ?? null,
  });

  return NextResponse.json({ id });
}
