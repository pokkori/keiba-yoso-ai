import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja,en;q=0.5",
  "Referer": "https://race.netkeiba.com/",
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

export interface FinisherRow {
  pos: number;
  num: string;
  name: string;
}

export interface FukushoPayout {
  num: string;
  name: string;
  payout: number; // 100円単位 → e.g. 140 = ¥140
}

export interface RaceResultData {
  raceId: string;
  top3: FinisherRow[];
  fukusho: FukushoPayout[];
  rawFinish: string; // debug
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function parseResultHtml(html: string, raceId: string): RaceResultData {
  const top3: FinisherRow[] = [];
  const fukusho: FukushoPayout[] = [];

  // ── 着順テーブルをパース ──────────────────────────────────────
  // netkeibaの結果テーブルは <table class="RaceTable"> 内の
  // <tr class="HorseList"> or <tr class="Oops"> 等
  const tableM = html.match(/<table[^>]*class="[^"]*RaceTable[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  const tableHtml = tableM ? tableM[1] : html;

  const rowPattern = /<tr[^>]*class="[^"]*HorseList[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
  let rowM: RegExpExecArray | null;
  while ((rowM = rowPattern.exec(tableHtml)) !== null) {
    const cells = [...rowM[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => stripTags(c[1]));
    if (cells.length < 5) continue;

    // 着順は最初の数値セル
    const posCell = cells.find(c => /^\d{1,2}$/.test(c.trim()));
    const pos = posCell ? parseInt(posCell) : NaN;
    if (isNaN(pos) || pos > 3) continue;

    // 馬番は1〜2桁の数値、着順と別のもの
    const numCell = cells.filter(c => /^\d{1,2}$/.test(c.trim()) && c !== posCell)[0] ?? "";

    // 馬名: カタカナ/漢字交じり、3文字以上
    const nameCell = cells.find(c => /^[\u30A0-\u30FF\u4E00-\u9FFF\u3040-\u309F][\s\S]{2,20}$/.test(c.trim())) ?? "";

    if (numCell && nameCell) {
      top3.push({ pos, num: numCell.trim(), name: nameCell.trim() });
    }
  }
  top3.sort((a, b) => a.pos - b.pos);

  // ── 複勝払戻テーブルをパース ─────────────────────────────────
  const rawPayoutSection =
    html.match(/複勝([\s\S]*?)(?:枠連|馬連|馬単|三連複|三連単|ワイド)/)?.[1] ??
    html.match(/複勝([\s\S]{0,600}?)$/)?.[1] ?? "";
  const payoutText = stripTags(rawPayoutSection).replace(/\s+/g, " ").trim();

  if (payoutText) {
    // Try 1: "馬番 払戻金" ペアパターン（例: "5 140" "3 200"）
    const pairPat = /\b(\d{1,2})\b\s+(\d{3,5})\b/g;
    const seenNums = new Set<string>();
    let pm: RegExpExecArray | null;
    while ((pm = pairPat.exec(payoutText)) !== null) {
      const num = pm[1];
      const amt = parseInt(pm[2]);
      const numI = parseInt(num);
      if (numI >= 1 && numI <= 18 && amt >= 100 && amt <= 99999 && !seenNums.has(num)) {
        seenNums.add(num);
        const fin = top3.find(f => f.num === num);
        fukusho.push({ num, name: fin?.name ?? "不明", payout: amt });
        if (fukusho.length >= 3) break;
      }
    }

    // Try 2: 馬番と金額を別々に取り出して順番で対応付け
    if (fukusho.length === 0) {
      const nums = [...payoutText.matchAll(/\b(\d{1,2})\b/g)]
        .map(m => m[1]).filter(n => { const i = parseInt(n); return i >= 1 && i <= 18; });
      const amts = [...payoutText.matchAll(/\b(\d{3,5})\b/g)]
        .map(m => parseInt(m[1])).filter(n => n >= 100 && n <= 99999);
      const uniqNums = [...new Set(nums)];
      for (let i = 0; i < Math.min(3, uniqNums.length, amts.length); i++) {
        const fin = top3.find(f => f.num === uniqNums[i]);
        fukusho.push({ num: uniqNums[i], name: fin?.name ?? "不明", payout: amts[i] });
      }
    }
  }

  // Fallback: top3馬番に紐づく「XXX円」をページ全体から探す
  if (fukusho.length === 0 && top3.length > 0) {
    for (const f of top3.slice(0, 3)) {
      const m = html.match(new RegExp(`[^\\d]${f.num}[^\\d][\\s\\S]{0,80}?(\\d{3,5})円`));
      if (m) {
        const amt = parseInt(m[1]);
        if (amt >= 100 && amt <= 99999) fukusho.push({ num: f.num, name: f.name, payout: amt });
      }
    }
  }

  // Final fallback: ページ全体の 複勝らしい金額を top3 順に割り当て
  if (fukusho.length === 0 && top3.length > 0) {
    const allAmts = [...html.matchAll(/(\d{3,5})円/g)]
      .map(m => parseInt(m[1])).filter(n => n >= 100 && n <= 9900).slice(0, 3);
    top3.slice(0, allAmts.length).forEach((f, i) => {
      fukusho.push({ num: f.num, name: f.name, payout: allAmts[i] });
    });
  }

  return {
    raceId,
    top3: top3.slice(0, 3),
    fukusho,
    rawFinish: top3.map(f => `${f.pos}着 ${f.num}番 ${f.name}`).join(" / "),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raceId = searchParams.get("raceId");

  if (!raceId || !raceId.match(/^\d{12}$/)) {
    return NextResponse.json({ error: "raceId が不正です" }, { status: 400 });
  }

  const urls = [
    `https://race.netkeiba.com/race/result.html?race_id=${raceId}`,
    `https://db.netkeiba.com/race/${raceId}/`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const html = await decodeBuffer(await res.arrayBuffer());

      // 結果が存在するかチェック（発走前はテーブルがない）
      if (!html.includes("HorseList") && !html.includes("RaceTable")) continue;

      const data = parseResultHtml(html, raceId);
      if (data.top3.length === 0) continue;

      return NextResponse.json(data);
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "結果データを取得できませんでした。レースが終了していないか、対象外の開催かもしれません。" }, { status: 404 });
}
