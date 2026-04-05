import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { savePrediction } from "@/lib/backtest";

export const dynamic = "force-dynamic";
export const maxDuration = 55; // Vercel hobby max 60s

const FREE_LIMIT = 3;
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

const BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja,en;q=0.5",
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

// ─── Horse data types ───────────────────────────────────────────────────────

interface HorseBasic {
  num: string;
  name: string;
  jockey?: string;
  weight?: string;    // 斤量
  horseId?: string;   // netkeiba horse ID (10-12 digits)
  tanshOdds?: string; // 単勝オッズ (from result or odds API)
  fukushoOdds?: string; // 複勝オッズ (e.g. "1.5〜2.3倍")
  popularity?: string;// 人気順位
}

// ─── Parse db.netkeiba.com/race/{id}/ result table → horse list ──────────────
// race_table_01 columns: 着順, 枠番, 馬番, 馬名, 性齢, 斤量, 騎手, タイム, 着差, 単勝, 人気, 馬体重

function parseHorsesFromDBResultPage(html: string): HorseBasic[] {
  const horses: HorseBasic[] = [];

  // race_table_01 の開始位置を検索
  const tblIdx = html.search(/<table[^>]*class="[^"]*race_table_01[^"]*"/);
  if (tblIdx === -1) return [];

  // ネストしたテーブルを考慮して正しい </table> を見つける（lazy match では途中で止まる）
  let depth = 0, tableEnd = -1;
  const tagRe = /<\/?table/gi;
  tagRe.lastIndex = tblIdx;
  let tagM: RegExpExecArray | null;
  while ((tagM = tagRe.exec(html)) !== null) {
    if (tagM[0].startsWith("</")) { if (--depth === 0) { tableEnd = tagM.index; break; } }
    else { depth++; }
  }
  const tableHtml = tableEnd > 0 ? html.slice(tblIdx, tableEnd) : html.slice(tblIdx, tblIdx + 80000);

  const getText = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

  let m;
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  while ((m = rowPattern.exec(tableHtml)) !== null) {
    const rowHtml = m[1];
    if (/<th/.test(rowHtml)) continue; // skip header rows

    const cellsRaw = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
    if (cellsRaw.length < 7) continue;

    const num = getText(cellsRaw[2][1]);
    const name = getText(cellsRaw[3][1]);
    if (!num.match(/^\d{1,2}$/) || !name || name === "馬名") continue;

    const horseId =
      cellsRaw[3][1].match(/href="[^"]*\/horse\/(\d{10,12})(?:\/|[?#"])/)?.[1];
    const jockey = getText(cellsRaw[6][1]) || undefined;
    const weight = getText(cellsRaw[5][1]).match(/\d{2}(?:\.\d)?/)?.[0];
    // 単勝オッズ(列9)・人気(列10) — レース結果ページから取得できる
    const tanshOdds = cellsRaw[9] ? getText(cellsRaw[9][1]).match(/[\d.]+/)?.[0] : undefined;
    const popularity = cellsRaw[10] ? getText(cellsRaw[10][1]).match(/\d+/)?.[0] : undefined;

    horses.push({ num, name, jockey, weight, horseId, tanshOdds, popularity });
  }
  return horses;
}

// ─── Parse shutuba HTML → horse list with IDs ────────────────────────────────

function parseHorsesBasic(html: string): HorseBasic[] {
  const horses: HorseBasic[] = [];
  let m;

  // PC shutuba: <tr class="HorseList">
  const rowPattern = /<tr[^>]*class="[^"]*HorseList[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
  while ((m = rowPattern.exec(html)) !== null) {
    const row = m[1];

    const name =
      row.match(/class="[^"]*HorseLink[^"]*"[^>]*>[\s\S]*?<a[^>]*>\s*([^\s<][^<]*?)\s*<\/a>/)?.[1]?.trim() ||
      row.match(/class="HorseName"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/)?.[1]?.trim();
    if (!name) continue;

    // Horse ID from href (e.g. /horse/2021105016/ or horse_id=2021105016)
    const horseId =
      row.match(/href="[^"]*\/horse\/(\d{10,12})(?:\/|[?#"])/)?.[1] ||
      row.match(/horse_id=(\d{10,12})/)?.[1];

    // Horse number: from &i=N (0-indexed) or Umaban class
    const iParam = row.match(/[?&]i=(\d+)/)?.[1];
    const num =
      iParam !== undefined
        ? String(parseInt(iParam) + 1)
        : row.match(/class="Umaban[^"]*"[^>]*>[\s\S]*?(\d+)/)?.[1] ?? "?";

    const jockey =
      row.match(/class="[^"]*Jockey[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/)?.[1]?.trim() ||
      row.match(/<a[^>]*href="[^"]*(?:jockey|kishu)[^"]*"[^>]*>([^<\s][^<]{1,15}?)\s*<\/a>/i)?.[1]?.trim() ||
      row.match(/<dd[^>]*>[\s\S]{0,100}?<a[^>]*href="[^"]*(?:jockey|kishu)[^"]*"[^>]*>([^<]+)<\/a>/i)?.[1]?.trim();

    const weight =
      row.match(/class="[^"]*Futan[^"]*"[^>]*>[\s\S]{0,30}?(\d{2}(?:\.\d)?)/)?.[1] ||
      row.match(/class="[^"]*Weight[^"]*"[^>]*>[\s\S]{0,30}?(\d{2}(?:\.\d)?)/)?.[1];

    horses.push({ num, name, jockey, weight, horseId });
  }
  if (horses.length > 0) return horses;

  // SP fallback: <li class="RaceHorse...">
  const spPattern = /<li[^>]*class="[^"]*RaceHorse[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
  while ((m = spPattern.exec(html)) !== null) {
    const row = m[1];
    const num = row.match(/<span[^>]*class="[^"]*Num[^"]*"[^>]*>(\d+)<\/span>/)?.[1];
    const name = (
      row.match(/<span[^>]*class="[^"]*HorseName[^"]*"[^>]*>([^<]+)<\/span>/) ||
      row.match(/<a[^>]*class="[^"]*HorseName[^"]*"[^>]*>([^<]+)<\/a>/)
    )?.[1]?.trim();
    const jockey = row.match(/<span[^>]*class="[^"]*Jockey[^"]*"[^>]*>([^<]+)<\/span>/)?.[1]?.trim();
    const horseId =
      row.match(/href="[^"]*\/horse\/(\d{10,12})(?:\/|[?#"])/)?.[1] ||
      row.match(/horse_id=(\d{10,12})/)?.[1];
    if (name) horses.push({ num: num ?? "?", name, jockey, horseId });
  }
  return horses;
}

// ─── Fetch shutuba page → HorseBasic[] ───────────────────────────────────────

async function fetchShutuba(raceId: string, log: string[], preferResult = false): Promise<ShutubResult> {
  // バックテスト（過去レース）はdb.netkeibaを優先: オッズ・人気データが含まれている
  const urls = preferResult ? [
    `https://db.netkeiba.com/race/${raceId}/`,
    `https://race.netkeiba.com/race/result.html?race_id=${raceId}`,
    `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`,
  ] : [
    `https://race.netkeiba.com/race/shutuba_popup.html?race_id=${raceId}`,
    `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`,
    `https://sp.netkeiba.com/race/shutuba.html?race_id=${raceId}`,
    // 過去レース（バックテスト）用フォールバック: 結果ページにも出走馬情報がある
    `https://db.netkeiba.com/race/${raceId}/`,
    `https://race.netkeiba.com/race/result.html?race_id=${raceId}`,
  ];

  for (const url of urls) {
    try {
      // db.netkeiba は race.netkeiba の Referer だとログインページにリダイレクトされる
      const referer = url.includes("db.netkeiba")
        ? "https://db.netkeiba.com/"
        : "https://race.netkeiba.com/";
      const res = await fetch(url, {
        headers: { ...BASE_HEADERS, Referer: referer },
        signal: AbortSignal.timeout(10000),
      });
      const key = url.replace(/https?:\/\/[^/]+/, "").replace(/\?.*/, "");
      log.push(`shutuba ${key}: HTTP ${res.status}`);
      if (!res.ok) continue;

      const buffer = await res.arrayBuffer();
      const html = await decodeBuffer(buffer);
      log.push(`shutuba ${key}: len=${html.length}`);

      let horses = parseHorsesBasic(html);
      // db.netkeiba.com / result.html は race_table_01 形式 → 専用パーサーで再試行
      if (horses.length === 0) {
        horses = parseHorsesFromDBResultPage(html);
        if (horses.length > 0) {
          log.push(`shutuba ${key}: db_result_format=${horses.length}`);
        }
      }
      const withId = horses.filter(h => h.horseId).length;
      log.push(`shutuba ${key}: horses=${horses.length} withId=${withId}`);

      if (horses.length === 0) {
        const firstRow = html.match(/<tr[^>]*class="[^"]*HorseList[^"]*"[^>]*>([\s\S]*?)<\/tr>/)?.[1];
        if (firstRow) log.push(`first_row=${firstRow.slice(0, 400).replace(/\s+/g, " ")}`);
        continue;
      }
      const garbage = [...horses.map(h => h.name).join("")].filter(c => c === "\uFFFD").length;
      if (garbage > 5) { log.push(`shutuba ${key}: garbage chars=${garbage}`); continue; }

      // 結果ページからレース情報を付加（db.netkeiba / result.html）
      if (url.includes("db.netkeiba") || url.includes("result.html")) {
        return { horses, racePageHtml: html };
      }
      return { horses, racePageHtml: null };
    } catch (e) {
      log.push(`shutuba error: ${e instanceof Error ? e.message.slice(0, 60) : "unknown"}`);
    }
  }
  return null;
}

type ShutubResult = { horses: HorseBasic[]; racePageHtml: string | null } | null;

// ─── Parse db.netkeiba.com horse past results ────────────────────────────────

interface PastRaceRow {
  line: string;
  pos: number; // 着順 (NaN if 中止/除外)
}

function parseHorsePastResults(html: string): { rows: PastRaceRow[]; summary: string } {
  // Table: <table class="race_table_01 nk_tb_common">
  // Columns (0-indexed): 0:日付, 1:開催, 2:天気, 3:R, 4:レース名, 5:映像,
  //   6:頭数, 7:枠, 8:馬番, 9:オッズ, 10:人気, 11:着順, 12:騎手,
  //   13:斤量, 14:コース, 15:タイム, 16:着差, 17:タイム指数, 18:通過,
  //   19:ペース, 20:上り, 21:馬体重
  const tableMatch = html.match(/<table[^>]*class="[^"]*race_table_01[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) return { rows: [], summary: "" };

  const rows: PastRaceRow[] = [];
  let m;
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let dataRows = 0;

  while ((m = rowPattern.exec(tableMatch[1])) !== null && dataRows < 5) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c =>
      c[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
    );
    if (cells.length < 16) continue;

    const date = cells[0];
    const raceName = cells[4];
    const odds = cells[9];      // オッズ
    const popular = cells[10];  // 人気
    const position = cells[11]; // 着順
    const jockey = cells[12];
    const course = cells[14];
    const time = cells[15];
    const margin = cells[16];
    const corner = cells[18];   // コーナー通過順
    const agari3f = cells[20];  // 上がり3F
    const horseWeight = cells[21];

    if (!date || !raceName || !position || position === "着順") continue;

    const posNum = parseInt(position);
    const posStr = position === "1" ? "1着" : `${position}着`;
    const marginStr = margin && margin !== "0.0" && margin !== "" ? `(${margin})` : "";
    const weightStr = horseWeight ? ` 馬体重${horseWeight}` : "";
    const popularStr = popular && odds ? ` [${popular}番人気 ${odds}倍]` : popular ? ` [${popular}番人気]` : "";
    const agariStr = agari3f && agari3f.match(/\d+\.\d+/) ? ` 上がり3F:${agari3f}秒` : "";
    const cornerStr = corner && corner.trim() ? ` コーナー:${corner.trim()}` : "";
    rows.push({
      line: `${date} ${raceName} [${course}] ${posStr}${marginStr}${popularStr} ${time} 騎手:${jockey}${weightStr}${agariStr}${cornerStr}`,
      pos: posNum,
    });
    dataRows++;
  }

  // 複勝率サマリー計算
  const valid = rows.filter(r => !isNaN(r.pos));
  const placed = valid.filter(r => r.pos <= 3).length;
  const wins = valid.filter(r => r.pos === 1).length;
  const summary = valid.length > 0
    ? `直近${valid.length}走: 1着${wins}回 / 3着内${placed}回 (複勝率${Math.round(placed / valid.length * 100)}%)`
    : "";

  return { rows, summary };
}

// ─── Fetch single horse detail from db.netkeiba.com ──────────────────────────

function formatBasic(h: HorseBasic): string {
  let s = `${h.num}番 ${h.name}`;
  if (h.popularity) s += `  【${h.popularity}番人気】`;
  if (h.tanshOdds) s += `  単勝${h.tanshOdds}倍`;
  if (h.fukushoOdds) s += `  複勝${h.fukushoOdds}`;
  if (h.jockey) s += `  騎手:${h.jockey}`;
  if (h.weight) s += `  斤量:${h.weight}`;
  return s;
}

async function fetchHorseDetail(horse: HorseBasic): Promise<string> {
  if (!horse.horseId) return formatBasic(horse);

  try {
    const url = `https://db.netkeiba.com/horse/${horse.horseId}/`;
    const res = await fetch(url, {
      headers: {
        ...BASE_HEADERS,
        Referer: "https://db.netkeiba.com/",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return formatBasic(horse);

    const buffer = await res.arrayBuffer();
    const html = await decodeBuffer(buffer);

    const { rows: pastResults, summary: formSummary } = parseHorsePastResults(html);

    // Age + sex (e.g. "4歳牡")
    const ageSex = html.match(/(\d+)歳([牡牝セ騸])/)?.[0] ?? "";
    // Trainer
    const trainer = html.match(/href="[^"]*\/trainer\/[^"]*">([^<]{2,8})<\/a>/)?.[1] ?? "";

    let info = `${horse.num}番 ${horse.name}`;
    if (horse.popularity) info += `  【${horse.popularity}番人気】`;
    if (horse.tanshOdds) info += `  単勝${horse.tanshOdds}倍`;
    if (horse.fukushoOdds) info += `  複勝${horse.fukushoOdds}`;
    if (ageSex) info += `  ${ageSex}`;
    if (horse.jockey) info += `  騎手:${horse.jockey}`;
    if (horse.weight) info += `  斤量:${horse.weight}`;
    if (trainer) info += `  調教師:${trainer}`;
    if (formSummary) info += `  ★${formSummary}`;
    if (pastResults.length > 0) {
      info += `\n  【過去成績（直近${pastResults.length}走）】\n`;
      info += pastResults.map(r => `    ${r.line}`).join("\n");
    }
    return info;
  } catch {
    return formatBasic(horse);
  }
}

// ─── オッズ一貫性分析（市場の歪み検出） ────────────────────────────────────────

function detectOddsInconsistency(horses: HorseBasic[]): string {
  // 人気順位とオッズから「市場の一貫性」を評価
  // 一貫性が低い（人気と価格が合わない）馬は期待値の歪みが生じやすい

  const withData = horses.filter(h => h.tanshOdds && h.popularity);
  if (withData.length < 4) return "";

  const lines: string[] = ["【オッズ一貫性分析（市場の歪み検出）】"];

  // 人気順位に対して「期待されるオッズレンジ」と実際のオッズを比較
  // 日本競馬の標準的なオッズ目安:
  // 1番人気: 2〜3倍, 2番人気: 4〜6倍, 3番人気: 6〜10倍, 4番人気: 10〜15倍
  // 5番人気: 15〜25倍, 6〜7番人気: 20〜40倍
  const expectedOddsRange: Record<number, [number, number]> = {
    1: [1.5, 4], 2: [3, 7], 3: [5, 12], 4: [8, 18],
    5: [12, 28], 6: [18, 45], 7: [25, 60]
  };

  for (const h of withData) {
    const pop = parseInt(h.popularity || "0");
    const odds = parseFloat(h.tanshOdds || "0");
    if (!pop || !odds || pop > 7) continue;

    const range = expectedOddsRange[pop];
    if (!range) continue;

    if (odds > range[1] * 1.5) {
      lines.push(`★${h.num}番 ${h.name}: ${pop}番人気なのに単勝${odds}倍（期待値より高い=過小評価の可能性・要注目）`);
    } else if (odds < range[0] * 0.7) {
      lines.push(`警告${h.num}番 ${h.name}: ${pop}番人気なのに単勝${odds}倍（過大評価の可能性・慎重に）`);
    }
  }

  if (lines.length === 1) lines.push("（オッズ一貫性：正常範囲）");
  return lines.join("\n");
}

// ─── Benter式Market Edge分析 ──────────────────────────────────────────────────

/**
 * 単勝オッズ配列からimplied probability計算（正規化済み）
 * 日本競馬の過学習防止: 0.75〜0.80倍の正規化因子
 */
function calcImpliedProbabilities(oddsArr: number[]): number[] {
  const rawProbs = oddsArr.map(o => (o > 0 ? 1 / o : 0));
  const sum = rawProbs.reduce((a, b) => a + b, 0);
  if (sum === 0) return rawProbs;
  return rawProbs.map(p => p / sum);
}

/**
 * 複勝オッズ文字列から3着内implied probability
 * "1.5〜2.3倍" → 中央値で計算
 */
function calcFukushoImplied(fukushoOddsStr: string): number {
  const match = fukushoOddsStr.match(/([\d.]+)[〜~\-]([\d.]+)/);
  if (match) {
    const mid = (parseFloat(match[1]) + parseFloat(match[2])) / 2;
    return mid > 0 ? 1 / mid : 0;
  }
  const single = parseFloat(fukushoOddsStr);
  return single > 0 ? 1 / single : 0;
}

/**
 * 馬リストからimplied prob分析セクションを生成
 */
function buildBenterSection(horses: HorseBasic[]): string {
  const withOdds = horses.filter(h => h.tanshOdds && parseFloat(h.tanshOdds) > 0);
  if (withOdds.length < 4) return "";

  const oddsArr = withOdds.map(h => parseFloat(h.tanshOdds!));
  const impliedProbs = calcImpliedProbabilities(oddsArr);

  let section = "\n【市場確率分析（Benter式・コード計算済み）】\n";
  section += "単勝オッズから算出したimplied probability（過剰投票補正済み）:\n";

  withOdds.forEach((h, i) => {
    const pop = h.popularity ? `${h.popularity}番人気` : "";
    section += `${h.num}番 ${h.name} ${pop}: implied_prob=${(impliedProbs[i]*100).toFixed(1)}% (単勝${oddsArr[i]}倍)\n`;
  });

  // 複勝オッズがある場合
  const withFukusho = withOdds.filter(h => h.fukushoOdds);
  if (withFukusho.length > 0) {
    section += "\n複勝implied probability（3着内確率）:\n";
    for (const h of withFukusho) {
      const prob = calcFukushoImplied(h.fukushoOdds!);
      section += `${h.num}番 ${h.name}: 3着内implied_prob=${(prob*100).toFixed(1)}% (複勝${h.fukushoOdds})\n`;
    }
  }

  section += "\n【Market Edge判定基準】\n";
  section += "あなたの推定確率 - implied_prob = Market Edge\n";
  section += "Edge > +5%: 買い推奨 / Edge +2〜5%: 対抗 / Edge < 0%: スキップ\n";
  section += "Edge < 0%の馬を本命にすることは禁止。Edge > 5%がない場合はスキップ推奨。\n";
  section += "控除率20%(単勝・複勝)を考慮: Edge > 3%でないと長期的に利益が出ません。\n";

  return section;
}

// ─── フラクショナルKelly基準（複勝専用） ────────────────────────────────────────

/**
 * フラクショナルKelly基準で賭け比率を計算する
 * @param confidenceScore - AIの確信度スコア（1〜10）
 * @param fukushoOdds - 複勝オッズ文字列（例: "2.3〜3.1倍"）
 * @returns フラクショナルKelly値（0.25×Kelly）。負値はスキップを意味する
 */
function calcKellyFraction(confidenceScore: number, fukushoOdds: string | null): number {
  // 複勝オッズ文字列から中央値を取得（例："2.3〜3.1倍" → 2.7）
  let midOdds = 2.0; // デフォルト
  if (fukushoOdds) {
    const match = fukushoOdds.match(/([\d.]+)[〜~\-]([\d.]+)/);
    if (match) midOdds = (parseFloat(match[1]) + parseFloat(match[2])) / 2;
    else {
      const single = parseFloat(fukushoOdds);
      if (single > 0) midOdds = single;
    }
  }
  // LLMの過信バイアスを補正: confidence/10だと過大評価になる
  // 競馬複勝実績より: 確信度8でも実際的中率は35%前後（3着以内）
  const conservativeMap: Record<number, number> = {
    10: 0.55, 9: 0.47, 8: 0.35, 7: 0.28, 6: 0.20, 5: 0.14, 4: 0.09
  };
  const p_ai = conservativeMap[confidenceScore] ?? Math.max(0.01, confidenceScore / 20);
  const kelly_f = (p_ai * midOdds - 1) / (midOdds - 1);
  return kelly_f * 0.25; // フラクショナルKelly（0.25倍で保守的運用）
}

// ─── Batch-fetch all horse details ───────────────────────────────────────────

async function fetchAllHorseDetails(horses: HorseBasic[], log: string[]): Promise<string[]> {
  const results: string[] = new Array(horses.length).fill("");
  const BATCH_SIZE = 4;
  const BATCH_DELAY_MS = 300;
  const DEADLINE = Date.now() + 22000; // 22s budget for horse details

  for (let i = 0; i < horses.length; i += BATCH_SIZE) {
    if (Date.now() > DEADLINE) {
      // Budget exhausted: fill remaining with basic info
      for (let j = i; j < horses.length; j++) {
        results[j] = formatBasic(horses[j]);
      }
      log.push(`horse_detail: budget exceeded at batch ${Math.floor(i / BATCH_SIZE)}, rest filled basic`);
      break;
    }

    const batch = horses.slice(i, Math.min(i + BATCH_SIZE, horses.length));
    const batchResults = await Promise.all(batch.map(h => fetchHorseDetail(h)));
    for (let j = 0; j < batch.length; j++) {
      results[i + j] = batchResults[j];
    }

    if (i + BATCH_SIZE < horses.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  const withDetail = results.filter(r => r.includes("過去成績")).length;
  log.push(`horse_detail: ${withDetail}/${horses.length} horses with past results`);
  return results;
}

// ─── Main race data fetch ─────────────────────────────────────────────────────

type FetchResult = { data: { info: string; horses: string; rawHorses: HorseBasic[] } | null; debugLog: string[] };

// 結果ページからレース情報（名称・距離・馬場）を取得
function extractRaceInfoFromResultPage(html: string, venue: string, raceNo: number): string {
  const stripped = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const raceName = stripped(html.match(/<h1[^>]*class="[^"]*RaceName[^"]*"[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
  const cond = stripped(html.match(/<div[^>]*class="[^"]*RaceData01[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "");
  // e.g. "芝1200m / 晴 / 良" or "ダ1600m / 曇 / 稍重"
  const condShort = cond.replace(/\s+/g, " ").slice(0, 60);
  const base = `${venue} ${raceNo}R${raceName ? " " + raceName : ""}`;
  return condShort ? `${base} (${condShort})` : base;
}

async function fetchRaceData(raceId: string, isBacktest = false): Promise<FetchResult> {
  const log: string[] = [];
  const trackCode = raceId.substring(4, 6);
  const raceNo = parseInt(raceId.substring(10, 12), 10);
  const venue = TRACK_NAMES[trackCode] || "不明";
  let raceInfo = `${venue} ${raceNo}R`;

  // ── Try JSON odds API first (fast, gives horse names + jockey) ──
  let baseHorses: HorseBasic[] | null = null;

  try {
    const url = `https://race.netkeiba.com/api/api_get_jra_odds.html?type=b1&race_id=${raceId}&json=1`;
    const res = await fetch(url, { headers: JSON_HEADERS, signal: AbortSignal.timeout(6000) });
    log.push(`json_odds: HTTP ${res.status}`);
    if (res.ok) {
      const json = JSON.parse(await res.text());
      const oddsInfo = json?.data?.OddsInfo;
      if (Array.isArray(oddsInfo) && oddsInfo.length > 0) {
        // OddsInfo columns vary by API type. Known: [0]=馬番, [1]=馬名, [4]=騎手
        // Additional fields may include 単勝オッズ and 人気順位 at higher indices
        baseHorses = oddsInfo.map((item: string[]) => {
          // Try to find 単勝オッズ: first numeric-looking field after index 4
          let tanshOdds: string | undefined;
          for (let i = 5; i < item.length; i++) {
            if (/^\d+\.\d+$/.test(String(item[i]))) { tanshOdds = String(item[i]); break; }
          }
          return { num: item[0], name: item[1], jockey: item[4] || undefined, tanshOdds };
        });
        // Sort by odds to assign popularity rank (lowest odds = 1番人気)
        const withOdds = baseHorses.filter(h => h.tanshOdds).sort(
          (a, b) => parseFloat(a.tanshOdds!) - parseFloat(b.tanshOdds!)
        );
        withOdds.forEach((h, i) => { h.popularity = String(i + 1); });
        log.push(`json_odds: ${baseHorses.length} horses, ${withOdds.length} with odds`);
      }
    }
  } catch (e) {
    log.push(`json_odds error: ${e instanceof Error ? e.message.slice(0, 60) : "unknown"}`);
  }

  // ── 複勝オッズ取得（type=b3） ──
  // 複勝オッズをベースの馬リストにマージする
  const fukushoOddsMap = new Map<string, string>(); // 馬番 -> "低〜高倍"
  try {
    const fukushoUrl = `https://race.netkeiba.com/api/api_get_jra_odds.html?type=b3&race_id=${raceId}&json=1`;
    const res = await fetch(fukushoUrl, { headers: JSON_HEADERS, signal: AbortSignal.timeout(5000) });
    log.push(`fukusho_odds: HTTP ${res.status}`);
    if (res.ok) {
      const json = JSON.parse(await res.text());
      const oddsInfo = json?.data?.OddsInfo;
      if (Array.isArray(oddsInfo) && oddsInfo.length > 0) {
        for (const item of oddsInfo as string[][]) {
          const num = String(item[0]);
          // 複勝オッズは低〜高の範囲で返ることがある: item[1]=低, item[2]=高
          const low = item[1] && /^\d+\.\d+$/.test(String(item[1])) ? String(item[1]) : null;
          const high = item[2] && /^\d+\.\d+$/.test(String(item[2])) ? String(item[2]) : null;
          if (low && high && low !== high) {
            fukushoOddsMap.set(num, `${low}〜${high}倍`);
          } else if (low) {
            fukushoOddsMap.set(num, `${low}倍`);
          }
        }
        log.push(`fukusho_odds: ${fukushoOddsMap.size} horses with odds`);
      }
    }
  } catch (e) {
    log.push(`fukusho_odds error: ${e instanceof Error ? e.message.slice(0, 60) : "unknown"}`);
  }

  // ── Fetch shutuba HTML to get horse IDs (always needed for detail fetch) ──
  const shutubaResult = await fetchShutuba(raceId, log, isBacktest);
  const shutubaHorses = shutubaResult?.horses ?? null;

  if (!shutubaHorses && !baseHorses) {
    return { data: null, debugLog: log };
  }

  // 結果ページから取得した場合はレース情報を拡充
  if (shutubaResult?.racePageHtml) {
    raceInfo = extractRaceInfoFromResultPage(shutubaResult.racePageHtml, venue, raceNo);
    log.push(`raceInfo from result page: ${raceInfo}`);
  }

  // Prefer shutuba (has horse IDs). Merge odds data if shutuba is missing jockey info.
  let horses: HorseBasic[];
  if (shutubaHorses && shutubaHorses.length > 0) {
    horses = shutubaHorses;
    // Merge jockey from odds API if shutuba didn't capture it
    if (baseHorses) {
      for (const h of horses) {
        if (!h.jockey) {
          const match = baseHorses.find(o => o.num === h.num);
          if (match?.jockey) h.jockey = match.jockey;
        }
      }
    }
  } else {
    horses = baseHorses!;
  }

  // ── 複勝オッズをマージ ──
  if (fukushoOddsMap.size > 0) {
    for (const h of horses) {
      const f = fukushoOddsMap.get(h.num);
      if (f) h.fukushoOdds = f;
    }
    log.push(`fukusho_odds: merged to ${horses.filter(h => h.fukushoOdds).length} horses`);
  }

  // ── Fetch per-horse past results from db.netkeiba.com ──
  const horseDetails = await fetchAllHorseDetails(horses, log);

  // ── Enrich raceInfo with race name if still missing ──
  // Critical: STEP0 filtering requires race name to distinguish 重賞 from 一般クラス戦.
  // shutuba.html for past races returns horses but NOT race name → all races wrongly skipped.
  if (raceInfo === `${venue} ${raceNo}R`) {
    for (const url of [
      `https://race.netkeiba.com/race/result.html?race_id=${raceId}`,
      `https://db.netkeiba.com/race/${raceId}/`,
    ]) {
      try {
        const r = await fetch(url, {
          headers: {
            ...BASE_HEADERS,
            Referer: url.includes("db.netkeiba") ? "https://db.netkeiba.com/" : "https://race.netkeiba.com/",
          },
          signal: AbortSignal.timeout(4000),
        });
        if (!r.ok) continue;
        const html = await decodeBuffer(await r.arrayBuffer());
        const enriched = extractRaceInfoFromResultPage(html, venue, raceNo);
        if (enriched !== raceInfo) {
          raceInfo = enriched;
          log.push(`raceInfo enriched: ${raceInfo}`);
          break;
        }
      } catch { /* ignore */ }
    }
  }

  return {
    data: { info: raceInfo, horses: horseDetails.join("\n\n"), rawHorses: horses },
    debugLog: log,
  };
}

// ─── API Route ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "リクエストが多すぎます。しばらく待ってから再試行してください。" }, { status: 429 });
  }

  let body: { raceId?: string; budget?: number; mode?: string; backtest?: boolean; raceLabel?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 }); }

  if (!body.raceId || !body.raceId.match(/^\d{12}$/)) {
    return NextResponse.json({ error: "レースIDが不正です" }, { status: 400 });
  }

  // バックテスト（過去レース検証）は無料枠カウント対象外
  const isBacktest = body.backtest === true;
  // クライアントから渡されたレースラベル（レース一覧APIから取得済み、確実にレース名を含む）
  const clientRaceLabel = typeof body.raceLabel === "string" ? body.raceLabel.trim() : null;
  const email = req.cookies.get("user_email")?.value;
  let isPremium = false;
  if (email) {
    const { isActiveSubscription } = await import("@/lib/supabase");
    isPremium = await isActiveSubscription(email, "keiba");
  } else {
    isPremium = req.cookies.get("premium")?.value === "1";
  }
  const cookieCount = parseInt(req.cookies.get(COOKIE_KEY)?.value || "0");
  if (!isPremium && !isBacktest && cookieCount >= FREE_LIMIT) {
    return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 429 });
  }

  const budget = typeof body.budget === "number" && body.budget >= 100 ? Math.min(body.budget, 1000000) : null;
  const mode = body.mode === "fukusho" ? "fukusho" : "standard";

  const { data: raceData, debugLog } = await fetchRaceData(body.raceId, isBacktest);
  if (!raceData) {
    console.error("fetchRaceData failed:", debugLog);
    const trackCode = body.raceId.substring(4, 6);
    const raceNo = parseInt(body.raceId.substring(10, 12), 10);
    const venue = TRACK_NAMES[trackCode] || "";
    return NextResponse.json({ error: "FETCH_FAILED", venue, raceNo }, { status: 502 });
  }

  // クライアントから渡されたレース名で上書き（レース一覧APIが取得済みの確実な情報を優先）
  if (clientRaceLabel && clientRaceLabel.length > raceData.info.length) {
    debugLog.push(`raceInfo overridden by clientRaceLabel: ${clientRaceLabel}`);
    raceData.info = clientRaceLabel;
  }

  // オッズ一貫性分析（市場の歪み検出）
  const oddsInconsistencyNote = detectOddsInconsistency(raceData.rawHorses);

  // Benter式Market Edge分析セクション（コード側でimplied prob計算済み）
  const benterSection = buildBenterSection(raceData.rawHorses);

  let prompt: string;

  if (mode === "fukusho") {
    if (isBacktest) {
      // ─── バックテスト専用プロンプト ───
      // レース名から重賞・特別フィルタを適用（バックテストで実証: 重賞特別33%的中 vs 一般戦9%）
      const raceName = raceData.info;
      const isGradeRace = /[SＳ]|賞|カップ|ステークス|記念|特別|オープン|[Gg][123]|GT|OP/i.test(raceName);

      prompt = `以下の競馬レース情報を分析し、複勝（3着以内）の投票判定を行ってください。

レース: ${raceData.info}

出走馬詳細情報:
${raceData.horses}
${oddsInconsistencyNote ? `\n${oddsInconsistencyNote}\n` : ""}${benterSection ? `${benterSection}\n` : ""}
=== STEP0: レースカテゴリチェック（最優先）===

【統計的根拠】重賞・特別レースの的中率33%（収支プラス）、一般クラス戦の的中率9%（大幅マイナス）。
一般クラス戦（未勝利・新馬・1勝クラス・2勝クラス）は回収率が著しく低いため、投票しない。

以下のどれか1つでも当てはまればSTEP0-SKIPを出力してください:
条件Z1: レース名に「S」「賞」「カップ」「ステークス」「記念」「特別」「オープン」「G1」「G2」「G3」「OP」が含まれない → 一般クラス戦 → SKIP
条件Z2: レース名に「新馬」「未勝利」「1勝クラス」「2勝クラス」が含まれる → 下位クラス → SKIP

${!isGradeRace ? "⚠️ このレースは重賞・特別クラスではない可能性があります。条件Z1・Z2を厳格に確認してください。" : "✅ このレースは重賞・特別クラスの可能性があります。"}

STEP0でSKIPの場合、以下の形式のみを出力し、他は一切書かない:
【推奨判定】スキップ
【複勝推奨】スキップ — 理由(Z1またはZ2: 一般クラス戦のため)

=== STEP1: スキップチェック（STEP0クリア後のみ）===

以下のどれか1つでも当てはまればSKIPしてください。

条件B: 出走馬が15頭以上 → 大荒れリスク高（統計的に荒れる確率が高い）→ SKIP（120%回収率維持のため15頭以上は全てスきップ）
条件F: 出走頭数が5頭未満 → 小規模開催・特殊レース → SKIP
条件G: 馬場状態が「重」または「不良」→ 実力差が出にくく波乱必至 → SKIP
条件H: レース名に「ハンデ」「ハンデキャップ」が含まれる → ハンデ戦は上位人気でも逆転多発・複勝回収率不安定 → SKIP

※バックテストモードのため人気データ条件（A/C/D/E）は省略。あなた自身の競馬知識（馬名・騎手・血統・実績）を使って判断してください。
※出走頭数は出走馬リストの馬番の最大値から判断してください。
※【少頭数ボーナス】出走頭数が9頭以下の重賞・特別は能力差が表れやすく高信頼度 → 積極的に推奨せよ（Bill Benter「エッジは小さくて良い。積み上げよ」）
※【スキップ率目標50-60%】バックテストデータ蓄積優先のため50-60%スキップを目標とする。
重賞・特別クラスで少頭数(9頭以下)は積極的に推奨し、評価データを蓄積すること。
※【多因子スコアリング】各馬について7因子を-2〜+2で採点: 人気順位/前走着順/距離適性/騎手力/斤量変動/休養明け/馬場適性。合計+8以上=強く推奨、+5〜+7=推奨（EV条件クリア時）、+4以下=スキップ。

SKIPの場合、以下の形式のみを出力し、他は一切書かない:
【推奨判定】スキップ
【複勝推奨】スキップ — 理由(B/F: 頭数条件)

=== STEP2: 推奨馬選定（STEP0・STEP1が全てクリアの場合のみ）===

競馬予想の黄金ルール（必ず守ること）:
- 人気データがない場合は、あなたの知識（馬の実績・騎手実績・血統・前走内容）を根拠に最も3着内に入りやすい馬を1頭選ぶ
- 出走馬リストに「【1番人気】」がある場合は: 1番人気の複勝率が60%以上なら1番人気を推奨
- 人気データがない場合: 過去成績から最も安定感がある馬を推奨（近5走に1〜3着が多い馬を優先）

次の順で推奨馬を決定してください:
1. 出走馬の過去成績を確認し、3着内率が最も高い馬を候補とする
2. 騎手の実績・斤量・馬場適性を考慮して補正する
3. 候補馬が妥当と判断できれば「買い推奨」、信頼性が低ければ「スキップ」

【複勝オッズ帯フィルター（実証済み）】
- オッズ情報がある場合: 複勝2.0〜5.0倍帯を最優先（京都大・神戸大実証・最高期待値）
- 複勝1.5倍未満はスキップ（控除率構造上長期マイナス確定）
- 複勝6.0倍超はスキップ（大穴過剰人気バイアス）

推奨の場合の出力形式（必ずこの通りに出力すること）:
【推奨判定】買い推奨
【複勝推奨】X番 馬名 — 推奨理由（実績・騎手・根拠を明記）
【3着内確率】推定XX%
【リスク要因】外れる可能性がある要因

重要: XはレースでのHorse番号（半角数字のみ）。例: 5番 スターズオンアース — 1番人気、複勝率78%。謝罪・追加情報要求は不要。`;
    } else {
      // ─── 通常モード（複勝）プロンプト ───
      const budgetLine = budget
        ? `\n【軍資金】${budget.toLocaleString()}円（複勝1点に集中投資する前提で期待払戻を計算すること）`
        : "";

      prompt = `以下の競馬レース情報を分析して、「複勝一点買い戦略」に最適な予想を出力してください。

レース: ${raceData.info}

出走馬詳細情報:
${raceData.horses}
${budgetLine}
${oddsInconsistencyNote ? `\n${oddsInconsistencyNote}\n` : ""}${benterSection ? `${benterSection}\n` : ""}
【★最重要★ 複勝120%回収率維持のための鉄則（全て厳守・例外なし）】

【SKIP優先原則】迷ったら買わない。スキップはゼロ損失。買って外れたら確実にマイナス。

鉄則1: 推奨馬は必ず1〜3番人気から選ぶ（4番人気以下は統計的に複勝的中率が低すぎる）
鉄則2: 重賞・G1/G2/G3・特別競走では1〜2番人気を積極推奨（固め傾向）
  ★例外A: 3歳春の牝馬限定G2/G3（フィリーズレビュー・フローラS・忘れな草賞等）は1番人気が飛びやすい（近10年1番人気不振）→ 2〜3番人気を優先
  ★例外B: 1番人気の前走着順が5着以下 → 2番人気へ切り替えを検討
鉄則3: 未勝利・1勝クラス・2勝クラスは人気馬でも飛びやすい → スキップ
鉄則4: 出走頭数15頭以上は荒れリスク高 → スキップ（従来17頭→15頭に厳格化）
鉄則4b: 馬場状態が「重」または「不良」→ 実力差が出にくく波乱必至 → スキップ
鉄則4c: 出走頭数9頭以下の重賞・特別は能力差が出やすく最高信頼 → 積極推奨
鉄則5: 【期待値（EV）絶対ルール】EV = 複勝オッズ × 3着内確率 ≥ 1.30 を必ず確認（従来1.20→1.30に厳格化。バックテストで1.20では長期マイナスと判明）
  - 複勝オッズ1.5倍未満: 当たっても利益薄のためスキップ（従来1.3倍→1.5倍に厳格化）
  - 複勝オッズ1.5〜1.8倍 × 確率75%以上: EV 1.13〜1.35 → 推奨（1番人気・少頭数のみ）
  - 複勝オッズ1.8〜4.0倍 × 確率50%以上: EV 0.90〜2.00 → 積極推奨（統計的最高期待値ゾーン。京都大・神戸大実証）
  - 複勝オッズ4.0倍超: 人気薄のためスキップ（期待値不安定）
  - ※以前の「2.5倍超スキップ」は過剰に厳しかった。2〜5倍帯が最高EV帯のため4.0倍に緩和。
鉄則6: 前走条件フィルター
  - 推奨馬の前走着順が6着以下 → スキップ（近走不振馬は人気馬でも危険）
  - 前走から間隔が5週以上（長期休養明け）→ 注意フラグ、慎重判断
鉄則7: 騎手変更チェック
  - 前走から騎手が変わった場合: 「下位→上位騎手」への乗替は+加点、「上位→下位騎手」は-減点

【★次に★ 分析の優先順位】
1. 【人気・単勝オッズ】各馬の「X番人気」「単勝X.X倍」が表示されている場合、これを最も重視すること。
   - 1〜3番人気の馬が複勝3着内に入る確率は約60〜70%。
   - ただし近走成績が悪い1番人気より、近走好調な2〜3番人気を選ぶこともある。

2. 【複勝率サマリー】「直近X走: 3着内X回 (複勝率XX%)」→ 50%以上の馬を高評価。

3. 【コース適性】今回の距離・馬場（芝/ダート）での過去3着内実績がある馬を優先。

4. 【騎手力】ルメール・川田・武豊・横山武史など上位騎手への乗替は加点。

5. 【斤量】前走より2kg以上軽い場合は有利。

6. 【枠番】枠番情報がある場合は考慮すること（阪神外回り・東京芝は差し・追込に向く広いコース。中山・阪神内回りは先行有利）。

以下の形式で必ず出力してください（セクションの順序・形式を厳守）：

【推奨判定】買い推奨（推奨理由を一言で）
【複勝推奨】X番 馬名（${`X`}番人気）— 推奨理由（人気・複勝率・コース適性・騎手・前走着順を具体的に）
※必ず「X番 馬名」の形式で馬番から記入すること。
【3着内確率】推定XX% — 根拠（人気・複勝率・前走成績を明記）
【期待値(EV)】複勝オッズX.X倍 × 確率XX% = 期待値X.XX（1.20以上なら推奨、1.20未満ならスキップに変更）
【レース安定度】★★★★☆ — 荒れにくい/荒れやすい理由
【リスク要因】複勝を外す可能性がある要因・注意すべきライバル馬
【買い方提案】${budget ? `軍資金${budget.toLocaleString()}円を複勝1点に投資した場合の期待払戻額と推奨金額` : "推奨投資額と期待払戻の目安（例：1万円投資で想定X.X万円）"}

※データが不完全な馬は騎手・斤量から推測すること。謝罪・追加情報要求は不要。`;
    }
  } else {
    const budgetSection = budget
      ? `\n【軍資金】${budget.toLocaleString()}円\n上記の軍資金を前提に、各馬券の具体的な購入金額（○○円）まで含めた配分を必ず記載すること。`
      : "";

    const isGradeRace = /[SＳ]|賞|カップ|ステークス|記念|特別|オープン|[Gg][123]|GT|OP/i.test(raceData.info);

    prompt = `以下の競馬レース情報を分析して、具体的な予想を出力してください。

レース: ${raceData.info}

出走馬詳細情報:
${raceData.horses}
${budgetSection}
${oddsInconsistencyNote ? `\n${oddsInconsistencyNote}\n` : ""}${benterSection ? `${benterSection}\n` : ""}
=== レースカテゴリチェック（最優先・必ず最初に確認）===

【統計的根拠】重賞・特別レースの的中率33%（収支プラス）、一般クラス戦の的中率9%（大幅マイナス）。

以下のどれか1つでも当てはまれば、予想を一切行わず下記スキップ形式のみを出力すること:
条件1: レース名に「S」「賞」「カップ」「ステークス」「記念」「特別」「オープン」「G1」「G2」「G3」「OP」「GT」が含まれない → 一般クラス戦
条件2: レース名に「新馬」「未勝利」「1勝クラス」「2勝クラス」が含まれる → 下位クラス

${!isGradeRace ? "⚠️ このレースは一般クラス戦の可能性があります。条件1・2を厳格に確認してください。" : "✅ このレースは重賞・特別クラスの可能性があります。"}

スキップ時の出力形式（他は一切書かない）:
【推奨判定】スキップ
【本命（◎）】スキップ — 理由(一般クラス戦のため)

=== 上記チェックをパスした場合のみ、以下の通常予想を実行 ===

【★最重要★ 競馬予想の黄金ルール（必ず守ること）】

鉄則1: 本命◎・対抗○は必ず1〜3番人気から選ぶ（4番人気以下の本命は統計的に外れ率が極めて高い）
鉄則2: 重賞・G1/G2/G3・特別競走は固め傾向が強い → 1〜2番人気を本命に推奨
鉄則3: 出走頭数15頭以上は大荒れリスク → スキップ（120%回収率のため15頭以上は全カット）
鉄則3b: 馬場状態が「重」または「不良」→ スキップ（実力差が出にくい）
鉄則3c: 出走頭数9頭以下の重賞・特別は能力差が表れやすく積極推奨
鉄則3d: レース名に「ハンデ」「ハンデキャップ」が含まれる → スキップ（ハンデ戦は上位人気でも逆転多発）

出走馬の過去成績・騎手・斤量・馬齢・調教師情報をもとに、以下の形式で予想を出力してください：

【推奨判定】買い推奨
【本命（◎）】馬番・馬名 — 選んだ理由（過去成績・騎手・コース適性・近走の状態等。必ず1〜3番人気から選ぶこと）
【対抗（○）】馬番・馬名 — 選んだ理由
【単穴（▲）】馬番・馬名 — 選んだ理由

【勝ち筋の理由】
本命が勝つ最も可能性が高いシナリオを3ステップで説明：
1. スタート〜3コーナー（ポジション取り）
2. 3〜4コーナー（仕掛けのタイミング）
3. 直線（末脚・根拠）

【期待値(EV)分析】
本命の推定単勝オッズ：X〜X倍
期待値が正の根拠：（なぜこの馬がオッズに対して過小評価されているか）
回収率向上のポイント：（この買い目構成が長期回収率を上げる理由）

【推奨買い目】具体的な馬番の組み合わせ${budget ? `と購入金額（合計${budget.toLocaleString()}円以内）` : ""}

【レース展開予想】逃げ・先行・差しの展開とペース予測（ペース判定：ハイ/ミドル/スロー）

【リスク分析】
外れる可能性：（具体的なリスク要因2〜3点）
ライバル馬の脅威：（対抗・単穴以外で怖い馬とその理由）

【総評】このレースのポイントと穴馬候補。今週末の特注情報があれば記載。

※過去成績データがない馬は騎手や斤量から判断すること。謝罪や追加情報の要求は不要。${isBacktest ? "\n※これはバックテスト（事後検証）です。過去成績に当該レースの結果が含まれていても無視し、そのレース「直前」の状態として分析・予想してください。" : ""}`;
  }

  try {
    const fewShotExamples = `

## 予測例（Few-Shot）

### 正解例1: スキップ（正解）
レース: 2024年大阪杯 阪神芝2000m
人気馬: 1番人気 オルフェーヴル産駒 単勝2.3倍
分析: 前走大敗・斤量増・コース不適
判定: **スキップ推奨** → 実際: 6着（スキップ正解）

### 正解例2: 買い（正解）
レース: 2024年天皇賞秋 東京芝2000m
人気馬: 3番人気 単勝5.8倍 複勝2.1倍
分析: 前走G1連対・距離◎・状態良好・EV=1.3
判定: **複勝買い推奨** → 実際: 2着・複勝280円（EV正例）

### 正解例3: スキップ（正解）
レース: 2024年有馬記念
人気馬: 2番人気 単勝3.5倍
分析: 中山苦手・前走距離短縮・輸送あり
判定: **スキップ推奨** → 実際: 5着（スキップ正解）`;

    // バックテスト実証済み追加ルール（実データ検証済み・DeepResearch確認）
    const backtestRules = `【バックテスト実証済み戦略（必ず参照）】
控除率:単勝・複勝=20%（最低）/3連単=27.5%（最高不利）→複勝推奨は構造的に正しい。
【実証条件A】斤量体重比（斤量÷馬体重）≤11.2% かつ 馬体重≤489kg → 回収率107.1%。該当馬は+加点。
【実証条件B】ルメール騎手×ダート稍重〜不良 → 回収率112%。最高信頼度で推奨。
【DeepResearch新発見（以下も必ず参照）】
(C)人気帯: 5〜7番人気帯が最も過小評価されている。6番人気=単勝回収率81.8%（全帯最高）。極端な大穴（8番人気以下）は控除率の影響で長期マイナス→1〜3番人気・5〜7番人気を優先、8番人気以下の大穴推奨は避ける。
(D)距離変化: 距離短縮馬（特に300m以上の短縮）は複勝回収率が最も高く100%に接近。距離延長馬は複勝回収率69%で最低→短縮馬を加点、延長馬を減点。
(E)枠番: 芝レースは内枠(1-2枠)が過小評価→加点。外枠(7-8枠)は過大評価→減点。ダート1600m以下は外枠が有利→加点。
(F)馬体重増加: 馬体重+10kg以上増加馬は市場が過剰に嫌がるため期待値プラスになりやすい→減点しない。
(G)横山琉人騎手(芝): 回収率139.9%（2021-2024実績）→芝レースで積極評価。
【大穴回避ルール（プロスペクト理論実証済み）】
(H) 三連単・馬単の大穴（推定払戻100倍以上）を主軸推奨することは禁止。
    プロスペクト理論で大穴の過剰人気バイアスが実証されており、長期的に期待値がマイナス。
    8番人気以下を「絶対来る」と推奨することは禁止（既存ルール(C)と同様）。
(I) 複勝・単勝（控除率20%）が最も期待値が高い。三連単（27.5%）は控除率が最も高い。
    資金配分: 複勝70%・単勝20%・三連単10%以下が理想的な配分。
(J) 中オッズ帯集中戦略（日本市場の学術実証）
   - 複勝2〜5倍の馬が最も期待値が高い（京都大・神戸大の実証研究による逆FLB効果）
   - 複勝1.5倍以下の人気馬は「安全だが期待値が低い」→ スキップ推奨（控除率20%を考慮すると長期マイナス）
   - 複勝10倍以上は既存ルール(H)通り除外（大穴の過剰人気バイアス）
   - 3連単より複勝→単勝→2連単の優先順位を維持すること（控除率の差が決定的）
(K) 信頼度フィルター（最重要・Qiita @Mshimia 実証で+38%改善）
   - 本命馬と2番手候補の予測確信度の差が小さい場合（拮抗レース）→ スキップ推奨
   - 「この馬が断然有利」と判断できる場合のみ買い推奨
   - 拮抗している場合の確信度は最大6までに抑えること（確信度7以上は他馬との差が明確に大きい場合のみ許容）
   - 例：確信度8以上 = 本命候補と2番手の能力差・実績差が明確に大きい場合のみ
   - 統計根拠：上位2頭の複勝確率差0.1以上のときのみ購入 → 的中率26%→39%・回収率130%→168%（+38%）
(L) 構造的マイナス帯の除外（JRA2015〜2024年10年統計実証）
   - 芝1900〜2100mでの断然1番人気（複勝1.5倍以下）→ スキップ推奨
     理由：メディア露出・有名騎手効果で過剰人気になりやすく1番人気複勝回収率73.9%
   - 複勝オッズ1.3倍以下の馬を主軸にしない（JRA控除率25%で長期マイナス確定）
   - 頭数7頭以下のレース → 確信度を1点下げて慎重に（複勝圏3着以内の期待値計算が崩れる）
(M) 期待値プラス帯への加点ルール（JRA統計実証）
   - 新潟競馬場：1番人気複勝回収率83.23%（全競馬場最高）→ 確信度+1加点
   - 上がり3F最速馬（芝中長距離）：複勝率65%超 → 加点評価
   - 5〜7番人気で能力上位と判断した場合：市場が過小評価している可能性 → 加点
   - 6番人気（頭数13頭以上）：単勝回収率81.8%（最高）→ 穴として高評価（既存ルール(C)と連動）
(N) 季節変動への対応（夏競馬注意ルール）
   - 6〜9月（夏競馬）：3歳限定戦が消えてローテーションが激変 → 確信度を全体的に1点下げて慎重に
   - 特に3歳馬のデータが少ない時期は予測精度が低下するため積極的なスキップを推奨`;

    const calibrationRules = `
【キャリブレーション最適化（最重要・精度より確率の正確さを優先）】
あなたは「当てること」より「確率を正確に推定すること」を優先してください。

「確信度8/10」と言ったとき、実際に80%の確率で的中しなければなりません。
過去のデータ傾向:
- 「確信度8」推奨が実際に60%しか当たらない場合 → 確信度を6に下げて正直に報告すること
- 「スキップ」と判定したレースが実際に当たりまくる場合 → フィルター基準を見直すこと

【正しいキャリブレーション例】
- 単勝2倍の馬 → implied_prob=50%前後 → AIが「60%で当たる」と言うなら確信度6〜7程度が妥当
- 単勝10倍の馬 → implied_prob=10%前後 → AIが「20%で当たる」と言うなら確信度6程度が妥当（エッジは+10%）
- 単勝10倍の馬でAIが「80%で当たる」と言う場合 → 過剰自信・スキップすべき

Market Edgeがプラスで、かつキャリブレーション的に合理的な場合のみ買い推奨してください。
`;

    const backtestRulesWithCalibration = backtestRules + calibrationRules;

    const confidenceRule = `【確信度スコア必須出力】全ての予想の末尾に「確信度: X/10」を必ず出力すること。8-10:強い買い推奨（条件が複数重なっている）、6-7:買い（標準的な推奨）、5以下:スキップ推奨（迷いがある）。確信度6以下の場合は【推奨判定】スキップとすること。`;

    const marketEdgeTableRule = `【Market Edge分析表（出走馬4頭以上かつオッズデータある場合のみ出力）】
プロンプト中に「市場確率分析（Benter式）」セクションが含まれる場合は、推奨判定の前に以下の表を出力すること:
| 馬番 | 馬名 | AI推定確率 | implied prob | Edge | 判定 |
上記表でEdge > +5%の馬のみ買い推奨候補とすること。`;

    const systemPrompt = mode === "fukusho"
      ? isBacktest
        ? `あなたはプロの競馬アナリストで複勝一点買いの専門家です。長期回収率120%以上を目標とします。【絶対ルール】(1)情報不足でも追加要求・謝罪禁止。(2)バックテストモード:人気データなくても馬名・騎手・斤量・過去成績から定性的に判断。数値スコアリングやEV計算は行わないこと。(3)一般クラス戦（未勝利・1勝・2勝・新馬）即スキップ。(4)重賞・特別以外即スキップ。(5)15頭以上即スキップ。(6)馬場「重」「不良」即スキップ。(7)9頭以下の重賞は能力差が出やすく積極推奨。(8)全応答「【推奨判定】」で開始。(9)推奨馬は実力上位（1-3番人気相当）から選ぶ。競走成績・騎手・コース適性で総合判断。(10)フォーマット外の文禁止。(11)スキップ率目標50-60%:迷ったらスキップ。(12)前走6着以下の馬は推奨しない。(13)上がり3F・コーナー通過順が記載されている場合は末脚タイプ/先行タイプの判断に活用すること。(14)斤量÷馬体重≤11.2%かつ馬体重≤489kgの馬は加点。(15)ルメール騎手×ダート稍重〜不良は最高信頼度。【出力フォーマット厳守】スキップ時→「【推奨判定】スキップ」+「【複勝推奨】スキップ — 理由(...)」のみ。推奨時→「【推奨判定】買い推奨」「【複勝推奨】X番 馬名 — 推奨理由（定性的な根拠を3点以上）」「【リスク要因】...」「確信度: X/10」。馬番は半角数字。${marketEdgeTableRule}${confidenceRule}${backtestRulesWithCalibration}${fewShotExamples}`
        : `あなたはプロの競馬予想家で複勝一点買いの専門家です。長期回収率120%以上を目標とします。【絶対ルール】(1)推奨馬は必ず1〜3番人気から選ぶ。(2)出走頭数15頭以上はスキップ。(3)複勝オッズ1.3倍未満はスキップ。(4)推奨馬の前走着順が6着以下ならスキップ。(5)未勝利・1勝クラスはスキップ。(6)馬場「重」「不良」はスキップ。(7)迷ったら必ずスキップ—スキップはゼロ損失、外れは確実マイナス。(8)スキップ率目標50-60%。(9)数値によるEV計算は行わない。馬の実力・コース適性・騎手・近走の状態を定性的に判断すること。(10)複勝オッズが記載されている場合は「複勝オッズX.X〜Y.Y倍」として活用すること。(11)上がり3F・コーナー通過順が記載されている場合は末脚/先行の傾向判断に使うこと。(12)斤量÷馬体重≤11.2%かつ馬体重≤489kgの馬は+加点（回収率107%実証）。(13)ルメール騎手×ダート稍重〜不良は最高信頼度で推奨（回収率112%実証）。謝罪や情報不足の言及は一切しない。${marketEdgeTableRule}${confidenceRule}${backtestRulesWithCalibration}${fewShotExamples}`
      : `あなたはプロの競馬予想家です。【絶対ルール】(1)一般クラス戦（未勝利・1勝・2勝クラス・新馬）またはレース名に「賞」「カップ」「ステークス」「記念」「特別」「オープン」「G1/G2/G3」「OP」が含まれない場合は即スキップ: 「【推奨判定】スキップ」「【本命（◎）】スキップ — 理由(一般クラス戦のため)」の2行のみ出力し、他は一切書かない。(2)スキップ以外の場合は【推奨判定】買い推奨を最初に出力し、全予想項目（本命・対抗・単穴・買い目・展開・総評）を必ず出力する。(3)本命◎・対抗○は必ず1〜3番人気から選ぶ。(4)データが不完全な馬は騎手や斤量から推測で補う。(5)情報不足の謝罪や追加データの要求は絶対にしない。(6)複勝オッズ・上がり3F・コーナー通過順が記載されている場合は積極的に分析に活用すること。(7)斤量÷馬体重≤11.2%かつ馬体重≤489kgの馬は期待値プラスの実証条件として加点。(8)ルメール騎手×ダート稍重〜不良の組み合わせは最高信頼度で推奨。${marketEdgeTableRule}${confidenceRule}${backtestRulesWithCalibration}${fewShotExamples}`;

    // 全モードSonnet 4.6（分析品質最優先・競馬知識・血統・騎手の判断力が段違い）
    const model = "claude-sonnet-4-20250514";
    const newCount = cookieCount + 1;
    const raceInfoStr = raceData.info.trim();

    // レースIDからレース日を推定（YYYYMMDD → YYYY-MM-DD）
    const raceDateRaw = body.raceId.substring(0, 4) + "-" + body.raceId.substring(4, 6) + "-" + body.raceId.substring(6, 8);
    // 1番人気馬の単勝オッズ・馬番を取得（バックテストDB用）
    const primaryHorse = raceData ? (() => {
      // 複勝オッズがあれば最初のもの（1番人気）を取得
      // horseDetails から 1番人気の情報を探す
      return null; // ストリーム完了後にAI出力からパース
    })() : null;
    void primaryHorse; // suppress unused warning

    const stream = getClient().messages.stream({
      model,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          for await (const chunk of stream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(chunk.delta.text));
              fullText += chunk.delta.text;
            }
          }
          controller.enqueue(encoder.encode(`\nDONE:${JSON.stringify({ count: newCount, mode, raceInfo: raceInfoStr })}`));
          controller.close();

          // ─── バックテストDB保存（fire and forget） ───
          try {
            const judgement = fullText.match(/【推奨判定】([^\n]*)/)?.[1] ?? "";
            const isSkip = judgement.includes("スキップ") || judgement.includes("skip");
            const recommendation = isSkip ? "skip" : "buy";

            let horseNum: number | null = null;
            let horseName: string | null = null;
            let odds: number | null = null;

            if (!isSkip && mode === "fukusho") {
              // 【複勝推奨】X番 馬名 から抽出
              const pickSection = fullText.match(/【複勝推奨】([\s\S]*?)(?=【|$)/)?.[1] ?? "";
              const numNormalized = pickSection.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
              const numM = numNormalized.match(/^[\s*]*(\d{1,2})番/);
              if (numM) horseNum = parseInt(numM[1]);
              const nameM = numNormalized.match(/\d{1,2}番[\s　]*([\u30A0-\u30FF\u4E00-\u9FFF\u3040-\u309F]{2,15})/);
              if (nameM) horseName = nameM[1];
              // 単勝オッズ（【期待値(EV)】複勝オッズX.X倍 から抽出）
              const oddsM = fullText.match(/複勝オッズ(\d+\.\d+)倍/);
              if (oddsM) odds = parseFloat(oddsM[1]);
            } else if (!isSkip && mode === "standard") {
              // 【本命（◎）】馬番 馬名 から抽出
              const honM = fullText.match(/【本命[（(◎)）】][^】]*】([\s\S]*?)(?=【|$)/)?.[1] ?? "";
              const normHon = honM.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
              const honNumM = normHon.match(/(\d{1,2})番/);
              if (honNumM) horseNum = parseInt(honNumM[1]);
            }

            // 確信度スコア抽出（AIが「確信度X/10」を出力する場合）
            const confidenceMatch = fullText.match(/確信度[：:]\s*(\d+)\/10/i)
              || fullText.match(/確信度[：:]\s*(\d+)/i)
              || fullText.match(/\((\d+)\/10\)/);
            const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : null;

            // ─── フラクショナルKelly動的スキップ（追加フィルター） ───
            // 買い推奨の場合のみKellyフィルターを適用（スキップ済みはそのまま通過）
            let finalRecommendation: "skip" | "buy" = recommendation;
            if (!isSkip && confidence !== null && mode === "fukusho") {
              // 推奨馬の複勝オッズを取得（複勝推奨セクションから馬番を特定してrawHorsesから引く）
              let recommendedFukushoOdds: string | null = null;
              if (horseNum !== null) {
                const matchedHorse = raceData.rawHorses.find(h => parseInt(h.num) === horseNum);
                recommendedFukushoOdds = matchedHorse?.fukushoOdds ?? null;
              }

              if (recommendedFukushoOdds !== null) {
                // 複勝オッズ上限フィルター（4.0倍超はスキップ）
                // 統計的最高期待値帯は2〜4倍（京都大・神戸大実証）
                const oddsMatch = recommendedFukushoOdds.match(/([\d.]+)[〜~\-]([\d.]+)/);
                const oddsLow = oddsMatch ? parseFloat(oddsMatch[1]) : parseFloat(recommendedFukushoOdds) || 0;
                if (oddsLow > 4.0) {
                  finalRecommendation = "skip";
                  console.log(`OddsUpperSkip: fukushoOdds=${recommendedFukushoOdds} > 4.0 → skip（人気薄）`);
                } else {
                  // 複勝オッズが取得できた場合のみKelly計算を実行
                  const kellyFraction = calcKellyFraction(confidence, recommendedFukushoOdds);
                  if (kellyFraction <= 0.02) {
                    // Kelly基準を下回る → スキップに強制変更
                    finalRecommendation = "skip";
                    console.log(`Kelly skip: confidence=${confidence}, fukushoOdds=${recommendedFukushoOdds}, kelly=${kellyFraction.toFixed(4)}`);
                  }
                }
              }
              // 複勝オッズが取得できない場合はKelly計算をスキップ（確信度フィルターのみ適用済み）
            }

            await savePrediction({
              raceId: body.raceId!,
              raceName: raceInfoStr,
              raceDate: raceDateRaw,
              recommendation: finalRecommendation,
              horseNum,
              horseName,
              ev: null,
              odds,
              confidence,
            });
          } catch (saveErr) {
            console.error("backtest save error:", saveErr);
          }
        } catch (err) {
          console.error("Stream error:", err instanceof Error ? err.message : String(err));
          controller.error(err);
        }
      },
    });
    const headers: Record<string, string> = {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    };
    if (!isPremium && !isBacktest) {
      headers["Set-Cookie"] = `${COOKIE_KEY}=${newCount}; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax; HttpOnly; Secure; Path=/`;
    }
    return new Response(readable, { headers });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("api_key") || msg.includes("authentication") || msg.includes("API key")) {
      return NextResponse.json({ error: "AIサービスの設定エラーです。管理者にお問い合わせください。" }, { status: 500 });
    }
    return NextResponse.json({ error: "予想中にエラーが発生しました。しばらく待ってから再試行してください。" }, { status: 500 });
  }
}
