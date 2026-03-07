import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FREE_LIMIT = 1;
const COOKIE_KEY = "keiba_predict_count";

const TRACK_NAMES: Record<string, string> = {
  "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
  "05": "東京", "06": "中山", "07": "中京", "08": "京都",
  "09": "阪神", "10": "小倉",
};

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

async function fetchRaceData(raceId: string): Promise<{ info: string; horses: string } | null> {
  try {
    const res = await fetch(
      `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "ja,en;q=0.5",
          "Referer": "https://race.netkeiba.com/",
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return null;
    const html = await res.text();

    const trackCode = raceId.substring(4, 6);
    const raceNo = parseInt(raceId.substring(10, 12), 10);
    const venue = TRACK_NAMES[trackCode] || "不明";

    // レース名をtitleから抽出
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const raceName = titleMatch
      ? titleMatch[1].replace(/\s*[-|].*$/, "").trim()
      : "";

    // 出走馬テーブルをパース
    const horseLines: string[] = [];
    const rowPattern = /<tr[^>]*class="[^"]*HorseList[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    let rowMatch;
    while ((rowMatch = rowPattern.exec(html)) !== null) {
      const row = rowMatch[1];
      const numMatch = row.match(/class="Umaban[^"]*"[^>]*><span>(\d+)<\/span>/);
      const nameMatch = row.match(/class="HorseName"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
      const jockeyMatch = row.match(/class="Jockey"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
      const weightMatch = row.match(/class="Futan[^"]*"[^>]*><span>([^<]+)<\/span>/);
      if (nameMatch) {
        const num = numMatch ? numMatch[1] : "?";
        const name = nameMatch[1].trim();
        const jockey = jockeyMatch ? jockeyMatch[1].trim() : "不明";
        const weight = weightMatch ? ` 斤量${weightMatch[1].trim()}kg` : "";
        horseLines.push(`${num}番 ${name}  騎手:${jockey}${weight}`);
      }
    }

    if (horseLines.length === 0) return null;

    return {
      info: `${venue} ${raceNo}R${raceName ? ` ${raceName}` : ""}`,
      horses: horseLines.join("\n"),
    };
  } catch {
    return null;
  }
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

  let body: {
    raceId?: string;
    // 手動入力モード
    venue?: string; raceNo?: string; raceClass?: string;
    surface?: string; distance?: string; horses?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 }); }

  let promptInfo = "";
  let promptHorses = "";

  if (body.raceId) {
    // 自動取得モード
    if (!body.raceId.match(/^\d{12}$/)) {
      return NextResponse.json({ error: "レースIDが不正です" }, { status: 400 });
    }
    const raceData = await fetchRaceData(body.raceId);
    if (!raceData) {
      return NextResponse.json({ error: "レースデータの取得に失敗しました。しばらく経ってから再試行してください。" }, { status: 502 });
    }
    promptInfo = raceData.info;
    promptHorses = raceData.horses;
  } else {
    // 手動入力モード
    const { venue, raceNo, raceClass, surface, distance, horses } = body;
    if (!horses?.trim()) {
      return NextResponse.json({ error: "出走馬情報を入力してください" }, { status: 400 });
    }
    if (horses.length > 3000) {
      return NextResponse.json({ error: "出走馬情報が長すぎます（3000文字以内）" }, { status: 400 });
    }
    promptInfo = `${venue || ""} ${raceNo || ""}R ${raceClass || ""} ${surface || ""}${distance || ""}m`;
    promptHorses = horses;
  }

  const prompt = `以下の競馬レース情報を分析して、予想を提供してください。

レース: ${promptInfo}
出走馬情報:
${promptHorses}

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
    const response = NextResponse.json({ prediction, raceInfo: promptInfo.trim(), count: newCount });

    if (!isPremium) {
      response.cookies.set(COOKIE_KEY, String(newCount), {
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        httpOnly: true,
        secure: true,
      });
    }
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "予想中にエラーが発生しました。しばらく待ってから再試行してください。" }, { status: 500 });
  }
}
