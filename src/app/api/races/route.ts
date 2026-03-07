import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TRACK_NAMES: Record<string, string> = {
  "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
  "05": "東京", "06": "中山", "07": "中京", "08": "京都",
  "09": "阪神", "10": "小倉",
};

function getTodayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") || getTodayJST();

  try {
    const res = await fetch(
      `https://race.netkeiba.com/top/race_list.html?kaisai_date=${dateStr}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en;q=0.5",
          "Referer": "https://race.netkeiba.com/",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ races: [], date: dateStr, error: "データ取得失敗" });
    }

    const html = await res.text();

    // race_id は12桁数字
    const raceIds = new Set<string>();
    const pattern = /race_id=(\d{12})/g;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      raceIds.add(match[1]);
    }

    const races = Array.from(raceIds)
      .map((id) => {
        const trackCode = id.substring(4, 6);
        const raceNo = parseInt(id.substring(10, 12), 10);
        const venue = TRACK_NAMES[trackCode] || "不明";
        return { raceId: id, venue, raceNo, label: `${venue} ${raceNo}R` };
      })
      .sort((a, b) => a.raceId.localeCompare(b.raceId) || a.raceNo - b.raceNo);

    return NextResponse.json({ races, date: dateStr });
  } catch {
    return NextResponse.json({ races: [], date: dateStr, error: "データ取得失敗" });
  }
}
