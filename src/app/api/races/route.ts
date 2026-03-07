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

function extractRaceIds(html: string): string[] {
  const raceIds = new Set<string>();
  // 複数パターンで12桁race_idを抽出
  const patterns = [
    /race_id=(\d{12})/g,
    /shutuba\.html\?[^"']*race_id=(\d{12})/g,
    /"race_id"\s*:\s*"(\d{12})"/g,
    /data-race-id="(\d{12})"/g,
    /\/race\/(\d{12})\//g,
  ];
  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(html)) !== null) {
      raceIds.add(match[1]);
    }
  }
  return Array.from(raceIds);
}

async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
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

    const ids = extractRaceIds(html);
    if (ids.length === 0) continue;

    const races = ids
      .map((id) => {
        const trackCode = id.substring(4, 6);
        const raceNo = parseInt(id.substring(10, 12), 10);
        const venue = TRACK_NAMES[trackCode] || "不明";
        return { raceId: id, venue, raceNo, label: `${venue} ${raceNo}R` };
      })
      .sort((a, b) => a.raceId.localeCompare(b.raceId) || a.raceNo - b.raceNo);

    return NextResponse.json({ races, date: dateStr });
  }

  // 全て失敗 → フォールバック用に空を返す
  return NextResponse.json({ races: [], date: dateStr, fallback: true });
}
