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
  // 払戻金テーブルは <table class="Payout_Detail_Table"> や
  // 「複勝」キーワードを含むセクション
  const payoutSection = html.match(/複勝([\s\S]*?)(?:枠連|馬連|馬単|三連|ワイド)/)?.[1] ?? "";

  // 馬番を探す: 1〜2桁の数字の羅列
  const horseNums = [...payoutSection.matchAll(/[>\s](\d{1,2})[<\s,・]/g)].map(m => m[1]);
  // 払戻金を探す: 3〜6桁の数字（¥マークや「円」付き、または単独3桁以上）
  const amounts = [...payoutSection.matchAll(/[\s,>](\d{3,6})[\s<,円]/g)].map(m => parseInt(m[1]));

  // 馬番と払戻金を対応付け（最大3件）
  for (let i = 0; i < Math.min(3, horseNums.length, amounts.length); i++) {
    const finisher = top3.find(f => f.num === horseNums[i]);
    fukusho.push({
      num: horseNums[i],
      name: finisher?.name ?? "不明",
      payout: amounts[i],
    });
  }

  // fallback: 払戻金テーブルが別形式の場合
  if (fukusho.length === 0 && top3.length > 0) {
    // 金額っぽい数値を探す
    const allAmounts = [...html.matchAll(/(\d{3,5})円/g)].map(m => parseInt(m[1]));
    // 100〜900の範囲が複勝らしい金額（1倍〜9倍）
    const likely = allAmounts.filter(n => n >= 100 && n <= 9000).slice(0, 3);
    top3.slice(0, likely.length).forEach((f, i) => {
      fukusho.push({ num: f.num, name: f.name, payout: likely[i] ?? 0 });
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
