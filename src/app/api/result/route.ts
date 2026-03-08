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

function parseTop3(html: string): FinisherRow[] {
  const top3: FinisherRow[] = [];

  // ── race.netkeiba.com: <tr class="HorseList"> ──
  const tableM = html.match(/<table[^>]*class="[^"]*RaceTable[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  const tableHtml = tableM ? tableM[1] : html;

  const rowPattern = /<tr[^>]*class="[^"]*HorseList[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
  let rowM: RegExpExecArray | null;
  while ((rowM = rowPattern.exec(tableHtml)) !== null) {
    const cells = [...rowM[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => stripTags(c[1]));
    if (cells.length < 5) continue;
    const posCell = cells.find(c => /^\d{1,2}$/.test(c.trim()));
    const pos = posCell ? parseInt(posCell) : NaN;
    if (isNaN(pos) || pos > 3) continue;
    const numCell = cells.filter(c => /^\d{1,2}$/.test(c.trim()) && c !== posCell)[0] ?? "";
    const nameCell = cells.find(c => /^[\u30A0-\u30FF\u4E00-\u9FFF\u3040-\u309F][\s\S]{2,20}$/.test(c.trim())) ?? "";
    if (numCell && nameCell) top3.push({ pos, num: numCell.trim(), name: nameCell.trim() });
  }
  if (top3.length > 0) { top3.sort((a, b) => a.pos - b.pos); return top3; }

  // ── db.netkeiba.com: race_table_01 形式 ──
  const dbTableM = html.match(/<table[^>]*class="[^"]*race_table_01[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  if (dbTableM) {
    const dbRowPat = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let dr: RegExpExecArray | null;
    while ((dr = dbRowPat.exec(dbTableM[1])) !== null) {
      if (/<th/.test(dr[1])) continue;
      const cells = [...dr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c =>
        c[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
      );
      if (cells.length < 7) continue;
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

function parseFukushoPayout(html: string, top3: FinisherRow[]): FukushoPayout[] {
  const fukusho: FukushoPayout[] = [];

  // ── Method 1: UmaNum + Payout span（race.netkeiba.com の標準形式）──
  // 複勝セクション（単勝の次、枠連の前）を特定してから抽出
  const fukushoBlockM =
    html.match(/class="[^"]*Pay_Fukusho[^"]*"[^>]*>([\s\S]*?)(?=class="[^"]*Pay_|$)/) ||
    html.match(/複勝[\s\S]{0,100}<\/(?:dt|th)>([\s\S]*?)(?=<(?:dt|th)|枠連|馬連|ワイド|$)/);

  const searchHtml = fukushoBlockM ? fukushoBlockM[1] : html;

  // <span class="UmaNum">X</span> と <span class="Payout">XXX</span> のペアを探す
  // netkeibaでは <li> 内に馬番→払戻の順で並ぶ
  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/g;
  let liM: RegExpExecArray | null;
  while ((liM = liPattern.exec(searchHtml)) !== null && fukusho.length < 3) {
    const liHtml = liM[1];
    const umaNum = liHtml.match(/<span[^>]*class="[^"]*UmaNum[^"]*"[^>]*>(\d{1,2})<\/span>/)?.[1];
    const payoutRaw = liHtml.match(/<span[^>]*class="[^"]*Payout[^"]*"[^>]*>([\d,]+)<\/span>/)?.[1];
    if (umaNum && payoutRaw) {
      const payout = parseInt(payoutRaw.replace(/,/g, ""));
      if (payout >= 100) {
        const fin = top3.find(f => f.num === umaNum);
        fukusho.push({ num: umaNum, name: fin?.name ?? "不明", payout });
      }
    }
  }
  if (fukusho.length > 0) return fukusho;

  // ── Method 2: Payout_Detail_Table の td セル内の馬番・払戻 ──
  // 複勝行: <th>複勝</th><td>馬番リスト</td><td>払戻リスト</td>
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

  // ── Method 4: テキストベースの汎用パース（カンマ除去対応）──
  const rawSection =
    html.match(/複勝([\s\S]*?)(?:枠連|馬連|馬単|三連複|三連単|ワイド)/)?.[1] ??
    html.match(/複勝([\s\S]{0,800}?)$/)?.[1] ?? "";
  if (rawSection) {
    // カンマを除去してから stripTags
    const payoutText = stripTags(rawSection.replace(/,/g, "")).replace(/\s+/g, " ").trim();
    const seenNums = new Set<string>();
    const pairPat = /\b(\d{1,2})\b\s+(\d{3,5})\b/g;
    let pm: RegExpExecArray | null;
    while ((pm = pairPat.exec(payoutText)) !== null && fukusho.length < 3) {
      const num = pm[1]; const amt = parseInt(pm[2]);
      const numI = parseInt(num);
      if (numI >= 1 && numI <= 18 && amt >= 100 && amt <= 99999 && !seenNums.has(num)) {
        seenNums.add(num);
        const fin = top3.find(f => f.num === num);
        fukusho.push({ num, name: fin?.name ?? "不明", payout: amt });
      }
    }
  }
  if (fukusho.length > 0) return fukusho;

  // ── Method 5: 各 top3 馬番の近くにある金額をページ全体から探す ──
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
