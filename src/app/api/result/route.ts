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

// ─── parseTop3 ────────────────────────────────────────────────────────────────
// race.netkeiba.com result page HorseList column layout:
//   [0]着順, [1]枠番, [2]馬番, [3]馬名, [4]性齢, [5]斤量, [6]騎手, ...
//
// IMPORTANT: cells[1] is 枠番 (frame 1-8), cells[2] is 馬番 (horse 1-18).
// Old code incorrectly used cells[1] as horse number — fixed to use cells[2].

function parseTop3(html: string): FinisherRow[] {
  const top3: FinisherRow[] = [];

  // ── race.netkeiba.com: <tr class="HorseList"> ──
  const tableM = html.match(/<table[^>]*class="[^"]*RaceTable[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  const tableHtml = tableM ? tableM[1] : html;

  const rowPattern = /<tr[^>]*class="[^"]*HorseList[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
  let rowM: RegExpExecArray | null;
  while ((rowM = rowPattern.exec(tableHtml)) !== null) {
    const cells = [...rowM[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => stripTags(c[1]));
    if (cells.length < 4) continue;

    // cells[0] = 着順
    const pos = parseInt(cells[0]);
    if (isNaN(pos) || pos > 3) continue;

    // cells[1] = 枠番 (skip!), cells[2] = 馬番
    const num = cells[2];
    if (!/^\d{1,2}$/.test(num)) continue;

    // cells[3]以降でカタカナ/漢字の馬名を探す
    const name = cells.find((c, i) => i >= 3 && /^[\u30A0-\u30FF\u4E00-\u9FFF\u3040-\u309F]/.test(c)) ?? "";
    if (name) top3.push({ pos, num, name });
  }
  if (top3.length > 0) { top3.sort((a, b) => a.pos - b.pos); return top3; }

  // ── db.netkeiba.com: race_table_01 形式 ──
  // Column layout: [0]着順, [1]枠番, [2]馬番, [3]馬名, ...
  const dbTableM = html.match(/<table[^>]*class="[^"]*race_table_01[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  if (dbTableM) {
    const dbRowPat = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let dr: RegExpExecArray | null;
    while ((dr = dbRowPat.exec(dbTableM[1])) !== null) {
      if (/<th/.test(dr[1])) continue;
      const cells = [...dr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c =>
        c[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
      );
      if (cells.length < 4) continue;
      const pos = parseInt(cells[0]);
      if (isNaN(pos) || pos > 3) continue;
      const num = cells[2]; // 馬番
      const name = cells[3]; // 馬名
      if (/^\d{1,2}$/.test(num) && name) top3.push({ pos, num, name });
    }
  }
  top3.sort((a, b) => a.pos - b.pos);
  return top3;
}

// ─── parseFukushoPayout ───────────────────────────────────────────────────────
// race.netkeiba.com result page payout table structure:
//   <tr class="Fukusho">
//     <th>複勝</th>
//     <td class="Result"><div><span>10</span></div>...</td>   ← horse nums
//     <td class="Payout"><span>130円<br/>130円<br/>190円</span></td>  ← payouts
//   </tr>
//
// NOTE: class="Fukusho" is on <tr>, NOT <td>. Nums and payouts are in separate <td>s.

function parseFukushoPayout(html: string, top3: FinisherRow[]): FukushoPayout[] {
  const fukusho: FukushoPayout[] = [];

  // ── Method 1: <tr class="Fukusho"> (race.netkeiba.com) ──
  const fukushoRowM = html.match(/<tr[^>]*class="[^"]*Fukusho[^"]*"[^>]*>([\s\S]*?)<\/tr>/);
  if (fukushoRowM) {
    const rowHtml = fukushoRowM[1];

    // 馬番: <td class="Result"> 内の <span>X</span>（空 span は除外）
    const resultTd = rowHtml.match(/<td[^>]*class="[^"]*Result[^"]*"[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? "";
    const nums = [...resultTd.matchAll(/<span[^>]*>(\d{1,2})<\/span>/g)]
      .map(m => m[1])
      .filter(n => { const ni = parseInt(n); return ni >= 1 && ni <= 18; });

    // 払戻: <td class="Payout"> → "130円<br/>130円<br/>190円" → [130, 130, 190]
    const payoutTd = rowHtml.match(/<td[^>]*class="[^"]*Payout[^"]*"[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? "";
    const amts = payoutTd
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/,/g, "")
      .split(/[\n\s]+/)
      .map(s => parseInt(s))
      .filter(n => !isNaN(n) && n >= 100);

    nums.slice(0, 3).forEach((num, i) => {
      if (amts[i] !== undefined) {
        const fin = top3.find(f => f.num === num);
        fukusho.push({ num, name: fin?.name ?? "不明", payout: amts[i] });
      }
    });
    if (fukusho.length > 0) return fukusho;
  }

  // ── Method 2: <th>複勝</th><td>nums</td><td>payouts</td> （汎用 Payout_Detail_Table）──
  const pDetailM = html.match(/<th[^>]*>複勝<\/th>([\s\S]*?)(?=<th|$)/);
  if (pDetailM) {
    const tds = [...pDetailM[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1]);
    if (tds.length >= 2) {
      const nums = tds[0].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim()
        .split(/[\n\s]+/).filter(n => /^\d{1,2}$/.test(n));
      const amts = tds[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
        .replace(/,/g, "").trim().split(/[\n\s]+/)
        .map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 100);
      nums.slice(0, 3).forEach((num, i) => {
        if (amts[i]) {
          const fin = top3.find(f => f.num === num);
          fukusho.push({ num, name: fin?.name ?? "不明", payout: amts[i] });
        }
      });
    }
  }
  if (fukusho.length > 0) return fukusho;

  // ── Method 3: db.netkeiba.com の race_payback テーブル ──
  const paybackM = html.match(/<table[^>]*class="[^"]*race_payback[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  if (paybackM) {
    const rowPat = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let rm: RegExpExecArray | null;
    while ((rm = rowPat.exec(paybackM[1])) !== null) {
      if (!rm[1].includes("複勝")) continue;
      const tds = [...rm[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1]);
      if (tds.length < 2) continue;
      const nums = tds[0].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim()
        .split(/[\n\s]+/).filter(n => /^\d{1,2}$/.test(n));
      const amts = tds[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
        .replace(/,/g, "").trim().split(/[\n\s]+/)
        .map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 100);
      nums.slice(0, 3).forEach((num, i) => {
        if (amts[i]) {
          const fin = top3.find(f => f.num === num);
          fukusho.push({ num, name: fin?.name ?? "不明", payout: amts[i] });
        }
      });
      break;
    }
  }
  if (fukusho.length > 0) return fukusho;

  // ── Method 4: top3 の馬番を使って上位入着が確定している馬の払戻をページ全体から探す ──
  for (const f of top3.slice(0, 3)) {
    const m = html.replace(/,/g, "").match(
      new RegExp(`[^\\d]${f.num}[^\\d][\\s\\S]{0,100}?(\\d{3,5})円`)
    );
    if (m) {
      const amt = parseInt(m[1]);
      if (amt >= 100 && amt <= 99999) fukusho.push({ num: f.num, name: f.name, payout: amt });
    }
  }
  return fukusho;
}

function parseResultHtml(html: string, raceId: string): RaceResultData {
  const top3 = parseTop3(html);
  const fukusho = top3.length > 0 ? parseFukushoPayout(html, top3) : [];

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
      if (!html.includes("HorseList") && !html.includes("RaceTable") && !html.includes("race_table_01")) continue;

      const data = parseResultHtml(html, raceId);
      if (data.top3.length === 0) continue;

      return NextResponse.json(data);
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "結果データを取得できませんでした。レースが終了していないか、対象外の開催かもしれません。" }, { status: 404 });
}
