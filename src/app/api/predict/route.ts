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

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://sp.netkeiba.com/",
};

async function decodeBuffer(buffer: ArrayBuffer): Promise<string> {
  const sniff = new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, 2000));
  const cs = (sniff.match(/charset=["']?\s*([a-zA-Z0-9_-]+)/i)?.[1] || "utf-8")
    .toLowerCase().replace(/[_-]/g, "");
  if (cs === "eucjp" || cs === "xeucjp") return new TextDecoder("euc-jp").decode(buffer);
  if (cs === "shiftjis" || cs === "xsjis" || cs === "sjis" || cs === "windows31j")
    return new TextDecoder("shift_jis").decode(buffer);
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function parseHorses(html: string): string[] {
  const horseLines: string[] = [];

  // PC版: class="HorseList"の<tr>行をパース
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
  if (horseLines.length > 0) return horseLines;

  // SP版: class="HorseInfo"等 (sp.netkeiba.com)
  const spPattern = /<li[^>]*class="[^"]*RaceHorse[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
  while ((rowMatch = spPattern.exec(html)) !== null) {
    const row = rowMatch[1];
    const numMatch = row.match(/<span[^>]*class="[^"]*Num[^"]*"[^>]*>(\d+)<\/span>/);
    const nameMatch = row.match(/<span[^>]*class="[^"]*HorseName[^"]*"[^>]*>([^<]+)<\/span>/) ||
                      row.match(/<a[^>]*class="[^"]*HorseName[^"]*"[^>]*>([^<]+)<\/a>/);
    const jockeyMatch = row.match(/<span[^>]*class="[^"]*Jockey[^"]*"[^>]*>([^<]+)<\/span>/);
    if (nameMatch) {
      const num = numMatch ? numMatch[1] : "?";
      const name = nameMatch[1].trim();
      const jockey = jockeyMatch ? jockeyMatch[1].trim() : "不明";
      horseLines.push(`${num}番 ${name}  騎手:${jockey}`);
    }
  }
  if (horseLines.length > 0) return horseLines;

  // 汎用フォールバック: data-horse-num等
  const genericPattern = /data-horse-num="(\d+)"[^>]*>[\s\S]{0,500}?<[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/[^>]+>/gi;
  while ((rowMatch = genericPattern.exec(html)) !== null) {
    horseLines.push(`${rowMatch[1]}番 ${rowMatch[2].trim()}`);
  }

  return horseLines;
}

async function fetchRaceData(raceId: string): Promise<{ info: string; horses: string } | null> {
  const trackCode = raceId.substring(4, 6);
  const raceNo = parseInt(raceId.substring(10, 12), 10);
  const venue = TRACK_NAMES[trackCode] || "不明";

  // 試すURLリスト（SP版を優先 → PC版 → ポップアップ版）
  const urls = [
    `https://sp.netkeiba.com/race/shutuba.html?race_id=${raceId}`,
    `https://sp.netkeiba.com/race/card.html?race_id=${raceId}`,
    `https://race.netkeiba.com/race/shutuba_popup.html?race_id=${raceId}`,
    `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;

      const buffer = await res.arrayBuffer();
      const html = await decodeBuffer(buffer);

      // レース名抽出
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const raceName = titleMatch
        ? titleMatch[1].replace(/\s*[-|].*$/, "").trim()
        : "";

      const horseLines = parseHorses(html);
      if (horseLines.length === 0) continue;

      // 文字化けチェック
      const combined = horseLines.join("");
      const garbageCount = [...combined].filter(c => c === "\uFFFD" || c === "?").length;
      if (garbageCount > 5) continue;

      return {
        info: `${venue} ${raceNo}R${raceName ? ` ${raceName}` : ""}`,
        horses: horseLines.join("\n"),
      };
    } catch {
      continue;
    }
  }

  return null;
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
      // 出走表取得失敗 → 手動入力へ誘導
      const trackCode = body.raceId.substring(4, 6);
      const raceNo = parseInt(body.raceId.substring(10, 12), 10);
      const venue = TRACK_NAMES[trackCode] || "";
      return NextResponse.json(
        { error: "FETCH_FAILED", venue, raceNo },
        { status: 502 }
      );
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

    // Claudeが拒否・謝罪した場合はカウントしない
    const isRefusal = prediction.length < 300 && (
      prediction.includes("申し訳") ||
      prediction.includes("予想提供ができません") ||
      prediction.includes("判読できない") ||
      prediction.includes("データが不完全")
    );
    if (isRefusal) {
      return NextResponse.json(
        { error: "レースデータが正しく取得できませんでした。別のレースを選択するか、しばらく待ってから再試行してください。" },
        { status: 422 }
      );
    }

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
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("api_key") || msg.includes("authentication") || msg.includes("API key")) {
      return NextResponse.json({ error: "AIサービスの設定エラーです。管理者にお問い合わせください。" }, { status: 500 });
    }
    return NextResponse.json({ error: "予想中にエラーが発生しました。しばらく待ってから再試行してください。" }, { status: 500 });
  }
}
