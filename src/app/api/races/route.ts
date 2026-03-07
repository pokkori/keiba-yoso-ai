import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TRACK_NAMES: Record<string, string> = {
  "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
  "05": "東京", "06": "中山", "07": "中京", "08": "京都",
  "09": "阪神", "10": "小倉",
};

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://race.netkeiba.com/",
  "Origin": "https://race.netkeiba.com",
};

function getTodayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function extractRaces(html: string): Array<{ raceId: string; raceName: string; startTime?: string }> {
  const seen = new Set<string>();
  const results: Array<{ raceId: string; raceName: string; startTime?: string }> = [];

  const pattern = /race_id=(\d{12})/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const raceId = match[1];
    if (seen.has(raceId)) continue;
    seen.add(raceId);

    // race_idの前後500文字からレース名・発走時刻を探す
    const ctx = html.substring(Math.max(0, match.index - 300), match.index + 400);

    // クラス名から: RaceName, ItemTitle, race_name 等
    const classMatch = ctx.match(/class="[^"]*(?:RaceName|ItemTitle|RaceTitle|race_name|RaceList_ItemTitle)[^"]*"[^>]*>\s*([^<\s][^<]{0,30}?)\s*<\//i);
    // 重賞・特別競走名パターン
    const titleMatch = ctx.match(/title="([^"]{2,30}(?:賞|ステークス|カップ|特別|記念|ハンデ|ダービー|オークス|皐月|菊花|天皇|ジャパン|スプリント|マイル|牝馬)[^"]*)"/i);
    // テキストノード内のレース名（2文字以上の日本語）
    const textMatch = ctx.match(/>([^\s<]{2,20}(?:賞|ステークス|カップ|特別|記念|ダービー|オークス|皐月|菊花|天皇|マイル|スプリント))</);

    const raceName = (classMatch?.[1] || titleMatch?.[1] || textMatch?.[1] || "").trim();

    // 発走時刻: "15:35" or "15:35発走" の形式
    const timeMatch = ctx.match(/(\d{1,2}:\d{2})(?:発走)?/);
    const startTime = timeMatch?.[1];

    results.push({ raceId, raceName, startTime });
  }

  // 追加パターン（data属性など）
  const extra = [
    /"race_id"\s*:\s*"(\d{12})"/g,
    /data-race-id="(\d{12})"/g,
  ];
  for (const p of extra) {
    let m;
    while ((m = p.exec(html)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        results.push({ raceId: m[1], raceName: "" });
      }
    }
  }

  return results;
}

async function decodeResponse(res: Response): Promise<string> {
  const buffer = await res.arrayBuffer();
  // 最初の2KBでcharset宣言を確認
  const sniff = new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, 2000));
  const charsetMatch = sniff.match(/charset=["']?\s*([a-zA-Z0-9_-]+)/i);
  const cs = (charsetMatch?.[1] || "utf-8").toLowerCase().replace(/[_-]/g, "");
  if (cs === "eucjp" || cs === "xeucjp") return new TextDecoder("euc-jp").decode(buffer);
  if (cs === "shiftjis" || cs === "xsjis" || cs === "sjis" || cs === "windows31j")
    return new TextDecoder("shift_jis").decode(buffer);
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await decodeResponse(res);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") || getTodayJST();

  // 複数URLを順に試す
  const urls = [
    `https://race.netkeiba.com/top/race_list_sub.html?kaisai_date=${dateStr}`,
    `https://race.netkeiba.com/top/race_list.html?kaisai_date=${dateStr}`,
    `https://sp.netkeiba.com/?pid=race_top&kaisai_date=${dateStr}`,
    `https://race.netkeiba.com/`,
  ];

  for (const url of urls) {
    const html = await tryFetch(url);
    if (!html) continue;

    const extracted = extractRaces(html);
    if (extracted.length === 0) continue;

    const races = extracted
      .map(({ raceId, raceName, startTime }) => {
        const trackCode = raceId.substring(4, 6);
        const raceNo = parseInt(raceId.substring(10, 12), 10);
        const venue = TRACK_NAMES[trackCode] || "不明";
        const timeLabel = startTime ? ` ${startTime}` : "";
        const label = raceName
          ? `${venue} ${raceNo}R${timeLabel}  ${raceName}`
          : `${venue} ${raceNo}R${timeLabel}`;
        return { raceId, venue, raceNo, raceName, startTime, label };
      })
      .sort((a, b) => a.raceId.localeCompare(b.raceId) || a.raceNo - b.raceNo);

    return NextResponse.json({ races, date: dateStr });
  }

  // 全て失敗 → フォールバック用に空を返す
  return NextResponse.json({ races: [], date: dateStr, fallback: true });
}
