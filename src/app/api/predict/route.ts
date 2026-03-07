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

const HTML_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja,en;q=0.5",
  "Referer": "https://sp.netkeiba.com/",
};

const JSON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept": "application/json, text/javascript, */*",
  "Accept-Language": "ja,en;q=0.5",
  "Referer": "https://race.netkeiba.com/",
  "X-Requested-With": "XMLHttpRequest",
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

function parseHorsesFromHtml(html: string): string[] {
  const lines: string[] = [];
  let m;

  // PC版: class="HorseList" の <tr> 行
  const pcPattern = /<tr[^>]*class="[^"]*HorseList[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
  while ((m = pcPattern.exec(html)) !== null) {
    const row = m[1];
    const num = row.match(/class="Umaban[^"]*"[^>]*><span>(\d+)<\/span>/)?.[1];
    const name = row.match(/class="HorseName"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/)?.[1]?.trim();
    const jockey = row.match(/class="Jockey"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/)?.[1]?.trim();
    const weight = row.match(/class="Futan[^"]*"[^>]*><span>([^<]+)<\/span>/)?.[1]?.trim();
    if (name) lines.push(`${num ?? "?"}番 ${name}  騎手:${jockey ?? "不明"}${weight ? ` 斤量${weight}kg` : ""}`);
  }
  if (lines.length > 0) return lines;

  // SP版: <li class="RaceHorse..."> 要素
  const spPattern = /<li[^>]*class="[^"]*RaceHorse[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
  while ((m = spPattern.exec(html)) !== null) {
    const row = m[1];
    const num = row.match(/<span[^>]*class="[^"]*Num[^"]*"[^>]*>(\d+)<\/span>/)?.[1];
    const name = (row.match(/<span[^>]*class="[^"]*HorseName[^"]*"[^>]*>([^<]+)<\/span>/) ||
                  row.match(/<a[^>]*class="[^"]*HorseName[^"]*"[^>]*>([^<]+)<\/a>/))?.[1]?.trim();
    const jockey = row.match(/<span[^>]*class="[^"]*Jockey[^"]*"[^>]*>([^<]+)<\/span>/)?.[1]?.trim();
    if (name) lines.push(`${num ?? "?"}番 ${name}  騎手:${jockey ?? "不明"}`);
  }
  return lines;
}

type FetchResult = { data: { info: string; horses: string } | null; debugLog: string[] };

async function fetchRaceData(raceId: string): Promise<FetchResult> {
  const log: string[] = [];
  const trackCode = raceId.substring(4, 6);
  const raceNo = parseInt(raceId.substring(10, 12), 10);
  const venue = TRACK_NAMES[trackCode] || "不明";

  // ── Strategy 1: netkeiba JSON odds API (b1=単勝) ──
  // このエンドポイントはAJAX用なのでHTMLページより軽量でブロックされにくい
  const jsonApiUrls = [
    `https://race.netkeiba.com/api/api_get_jra_odds.html?type=b1&race_id=${raceId}&json=1`,
    `https://race.netkeiba.com/api/api_get_shutuba_table.html?race_id=${raceId}&json=1`,
  ];
  for (const url of jsonApiUrls) {
    try {
      const res = await fetch(url, { headers: JSON_HEADERS, signal: AbortSignal.timeout(8000) });
      const key = url.includes("shutuba_table") ? "json_shutuba" : "json_odds";
      log.push(`${key}: HTTP ${res.status}`);
      if (!res.ok) continue;
      const text = await res.text();
      log.push(`${key}: len=${text.length} preview=${text.slice(0, 120).replace(/\n/g, " ")}`);
      const json = JSON.parse(text);

      // 単勝オッズ形式: data.OddsInfo = [[num, name, odds, popular, jockey?], ...]
      const oddsInfo = json?.data?.OddsInfo;
      if (Array.isArray(oddsInfo) && oddsInfo.length > 0) {
        const lines = oddsInfo.map((item: string[]) =>
          `${item[0]}番 ${item[1]}${item[4] ? `  騎手:${item[4]}` : ""}  単勝:${item[2]}倍`
        );
        log.push(`${key}: horses=${lines.length}`);
        return { data: { info: `${venue} ${raceNo}R`, horses: lines.join("\n") }, debugLog: log };
      }

      // 出走表形式の可能性: data.HorseList = [{HorseNum, HorseName, JockeyName}, ...]
      const horseList = json?.data?.HorseList || json?.data?.horses;
      if (Array.isArray(horseList) && horseList.length > 0) {
        const lines = horseList.map((h: Record<string, string>) =>
          `${h.HorseNum ?? h.num ?? "?"}番 ${h.HorseName ?? h.name ?? "不明"}  騎手:${h.JockeyName ?? h.jockey ?? "不明"}`
        );
        log.push(`${key}: horses=${lines.length}`);
        return { data: { info: `${venue} ${raceNo}R`, horses: lines.join("\n") }, debugLog: log };
      }
    } catch (e) {
      log.push(`json_api error: ${e instanceof Error ? e.message.slice(0, 60) : "unknown"}`);
    }
  }

  // ── Strategy 2: HTML pages ──
  const htmlUrls = [
    `https://sp.netkeiba.com/race/shutuba.html?race_id=${raceId}`,
    `https://race.netkeiba.com/race/shutuba_popup.html?race_id=${raceId}`,
    `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`,
  ];
  for (const url of htmlUrls) {
    try {
      const res = await fetch(url, { headers: HTML_HEADERS, signal: AbortSignal.timeout(10000) });
      const key = url.replace(/https?:\/\/[^/]+/, "").replace(/\?.*/, "");
      log.push(`${key}: HTTP ${res.status}`);
      if (!res.ok) continue;

      const buffer = await res.arrayBuffer();
      const html = await decodeBuffer(buffer);
      log.push(`${key}: len=${html.length}`);

      const raceName = html.match(/<title>([^<]+)<\/title>/)?.[1]?.replace(/\s*[-|].*$/, "").trim() ?? "";
      const horseLines = parseHorsesFromHtml(html);
      log.push(`${key}: horses=${horseLines.length}`);
      if (horseLines.length === 0) {
        // 診断: クラス名の存在確認
        log.push(`${key}: hasHorseList=${html.includes("HorseList")} hasUmaban=${html.includes("Umaban")}`);
        // <tr class="..."> のクラス名サンプル
        const trClasses = [...html.matchAll(/<tr[^>]+class="([^"]+)"/g)].slice(0, 8).map(m => m[1]);
        if (trClasses.length > 0) log.push(`${key}: tr_classes=${trClasses.join("|").slice(0, 300)}`);
        // 出走馬テキスト周辺
        const idx = html.indexOf("出走馬");
        if (idx >= 0) log.push(`${key}: 出走馬_ctx=${html.slice(idx, idx + 150).replace(/\s+/g, " ")}`);
        // <script>内にJSON形式のデータがないか
        const scriptData = html.match(/<script[^>]*>[\s\S]{0,50}(?:HorseList|horseList|horse_list)([\s\S]{0,200})/i);
        if (scriptData) log.push(`${key}: script_horse=${scriptData[0].slice(0, 200).replace(/\s+/g, " ")}`);
        continue;
      }

      const garbage = [...horseLines.join("")].filter(c => c === "\uFFFD" || c === "?").length;
      if (garbage > 5) { log.push(`${key}: too many garbage chars (${garbage})`); continue; }

      return {
        data: { info: `${venue} ${raceNo}R${raceName ? ` ${raceName}` : ""}`, horses: horseLines.join("\n") },
        debugLog: log,
      };
    } catch (e) {
      log.push(`html error: ${e instanceof Error ? e.message.slice(0, 60) : "unknown"}`);
    }
  }

  return { data: null, debugLog: log };
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

  let body: { raceId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 }); }

  let promptInfo = "";
  let promptHorses = "";

  if (body.raceId) {
    // 自動取得モード
    if (!body.raceId.match(/^\d{12}$/)) {
      return NextResponse.json({ error: "レースIDが不正です" }, { status: 400 });
    }
    const { data: raceData, debugLog } = await fetchRaceData(body.raceId);
    if (!raceData) {
      console.error("fetchRaceData failed:", debugLog);
      const trackCode = body.raceId.substring(4, 6);
      const raceNo = parseInt(body.raceId.substring(10, 12), 10);
      const venue = TRACK_NAMES[trackCode] || "";
      return NextResponse.json(
        { error: "FETCH_FAILED", venue, raceNo, debugLog },
        { status: 502 }
      );
    }
    promptInfo = raceData.info;
    promptHorses = raceData.horses;
  } else {
    return NextResponse.json({ error: "raceIdが必要です" }, { status: 400 });
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
