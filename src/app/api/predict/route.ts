import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FREE_LIMIT = 1;
const COOKIE_KEY = "keiba_predict_count";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const rateLimit = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "リクエストが多すぎます。しばらく待ってから再試行してください。" }, { status: 429 });
  }

  const isPremium = req.cookies.get("stripe_premium")?.value === "1";
  const cookieCount = parseInt(req.cookies.get(COOKIE_KEY)?.value || "0");

  if (!isPremium && cookieCount >= FREE_LIMIT) {
    return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 429 });
  }

  let body: { venue?: string; raceNo?: string; raceClass?: string; surface?: string; distance?: string; horses?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 }); }

  const { venue, raceNo, raceClass, surface, distance, horses } = body;
  if (!horses?.trim()) return NextResponse.json({ error: "出走馬情報を入力してください" }, { status: 400 });
  if (horses.length > 3000) return NextResponse.json({ error: "出走馬情報が長すぎます（3000文字以内）" }, { status: 400 });

  const prompt = `以下の競馬レース情報を分析して、予想を提供してください。

開催場: ${venue}
レース: ${raceNo}R
クラス: ${raceClass}
コース: ${surface}${distance}m
出走馬情報:
${horses}

以下の形式で回答してください：
【本命（◎）】馬名と選んだ理由
【対抗（○）】馬名と選んだ理由
【単穴（▲）】馬名と選んだ理由
【推奨買い目】馬券種別と組み合わせ（例：馬連1-3、三連複1-3-5）
【レース展開予想】逃げ・先行・差しの展開予測
【注意点】荒れる可能性や注意すべき馬`;

  try {
    const message = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: "あなたは20年以上の経験を持つ競馬予想のプロフェッショナルです。データに基づいた分析と独自の視点で、的中率の高い予想を提供します。",
      messages: [{ role: "user", content: prompt }],
    });

    const prediction = message.content[0].type === "text" ? message.content[0].text : "";
    const newCount = cookieCount + 1;
    const res = NextResponse.json({ prediction, count: newCount });

    if (!isPremium) {
      res.cookies.set(COOKIE_KEY, String(newCount), {
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        httpOnly: true,
        secure: true,
      });
    }
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "予想中にエラーが発生しました。しばらく待ってから再試行してください。" }, { status: 500 });
  }
}
