import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 55; // Vercel hobby max 60s

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
    const horseWeight = cells[21];

    if (!date || !raceName || !position || position === "着順") continue;

    const posNum = parseInt(position);
    const posStr = position === "1" ? "1着" : `${position}着`;
    const marginStr = margin && margin !== "0.0" && margin !== "" ? `(${margin})` : "";
    const weightStr = horseWeight ? ` 馬体重${horseWeight}` : "";
    const popularStr = popular && odds ? ` [${popular}番人気 ${odds}倍]` : popular ? ` [${popular}番人気]` : "";
    rows.push({
      line: `${date} ${raceName} [${course}] ${posStr}${marginStr}${popularStr} ${time} 騎手:${jockey}${weightStr}`,
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

type FetchResult = { data: { info: string; horses: string } | null; debugLog: string[] };

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
    data: { info: raceInfo, horses: horseDetails.join("\n\n") },
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
    isPremium = req.cookies.get("stripe_premium")?.value === "1";
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
    return NextResponse.json({ error: "FETCH_FAILED", venue, raceNo, debugLog }, { status: 502 });
  }

  // クライアントから渡されたレース名で上書き（レース一覧APIが取得済みの確実な情報を優先）
  if (clientRaceLabel && clientRaceLabel.length > raceData.info.length) {
    debugLog.push(`raceInfo overridden by clientRaceLabel: ${clientRaceLabel}`);
    raceData.info = clientRaceLabel;
  }

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

条件A: 出走馬のリストに「【1番人気】」が存在しない → 人気情報なし → SKIP
条件B: 出走馬が13頭以上 → 大荒れリスク高（荒れる確率が統計的に高い）→ SKIP
条件C: 「【1番人気】」の馬の単勝オッズが3.0倍超 → 混戦 → SKIP
条件D: 「【1番人気】」の馬のサマリー「複勝率XX%」が30%以下 → 1番人気不振 → SKIP
条件E: 「【1番人気】」または「【2番人気】」の馬の直近3走に5着以下が2回以上含まれる → 調子落ち → SKIP
条件F: 出走頭数が5頭未満 → 小規模開催・特殊レース → SKIP

SKIPの場合、以下の形式のみを出力し、他は一切書かない:
【推奨判定】スキップ
【複勝推奨】スキップ — 理由(A/B/C/D/E/Fのどれか)

=== STEP2: 推奨馬選定（STEP0・STEP1が全てクリアの場合のみ）===

競馬予想の黄金ルール（必ず守ること）:
- 推奨馬は必ず1〜3番人気から選ぶ（それ以外は統計的に的中率が極めて低い）
- 1番人気の複勝率60%以上: 1番人気馬を推奨
- 1番人気の複勝率30〜60% かつ 2番人気の複勝率60%以上: 2番人気馬を推奨
- 3番人気以下は最終手段（1番人気・2番人気の複勝率がともに30%未満の場合のみ検討、通常はSKIP推奨）
- 4番人気以下は絶対に推奨しない → SKIP

次の順で推奨馬を決定してください:
- 1番人気馬の複勝率が60%以上 → 1番人気馬を推奨
- 1番人気馬の複勝率が30〜60% かつ 2番人気馬の複勝率が60%以上 → 2番人気馬を推奨
- どちらも当てはまらない → STEP1に戻りSKIPを出力

推奨の場合の出力形式（必ずこの通りに出力すること）:
【推奨判定】買い推奨
【複勝推奨】X番 馬名 — 推奨理由（人気順位・複勝率を明記）
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

【★最重要★ 競馬予想の黄金ルール（必ず守ること）】

鉄則1: 推奨馬は必ず1〜3番人気から選ぶ（4番人気以下は統計的に複勝的中率が低すぎる）
鉄則2: 重賞・G1/G2/G3・特別競走では1〜2番人気を積極的に推奨（固め傾向）
鉄則3: 未勝利・1勝クラス・2勝クラスは人気馬でも飛びやすい → できればスキップ推奨
鉄則4: 出走頭数13頭以上は荒れやすい → スキップ推奨
鉄則5: 複勝オッズ帯の最適化（バックテスト実績に基づく）:
  - 1.1倍以下: スキップ（当たっても利益が出ない）
  - 1.2〜1.6倍: 積極推奨（最も安定した回収帯）
  - 1.7〜2.0倍: 条件付き推奨（推奨馬の複勝率65%以上の場合のみ）
  - 2.0倍超: スキップ（人気薄で的中率が不安定）

【★次に★ 分析の優先順位】
1. 【人気・単勝オッズ】各馬の「X番人気」「単勝X.X倍」が表示されている場合、これを最も重視すること。
   - 1〜3番人気の馬が複勝3着内に入る確率は約60〜70%。
   - ただし近走成績が悪い1番人気より、近走好調な2〜3番人気を選ぶこともある。

2. 【複勝率サマリー】「直近X走: 3着内X回 (複勝率XX%)」→ 50%以上の馬を高評価。

3. 【コース適性】今回の距離・馬場（芝/ダート）での過去3着内実績がある馬を優先。

4. 【騎手力】ルメール・川田・武豊・横山武史など上位騎手への乗替は加点。

5. 【斤量】前走より2kg以上軽い場合は有利。

以下の形式で必ず出力してください（セクションの順序・形式を厳守）：

【推奨判定】買い推奨（推奨理由を一言で）
【複勝推奨】X番 馬名（${`X`}番人気）— 推奨理由（人気・複勝率・コース適性・騎手を具体的に）
※必ず「X番 馬名」の形式で馬番から記入すること。
【3着内確率】推定XX% — 根拠（人気・複勝率を明記）
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
鉄則3: 出走頭数13頭以上のレースは荒れやすい → 人気馬に絞り、配当は低く想定すること

出走馬の過去成績・騎手・斤量・馬齢・調教師情報をもとに、以下の形式で予想を出力してください：

【推奨判定】買い推奨
【本命（◎）】馬番・馬名 — 選んだ理由（過去成績・騎手・コース適性・近走の状態等。必ず1〜3番人気から選ぶこと）
【対抗（○）】馬番・馬名 — 選んだ理由
【単穴（▲）】馬番・馬名 — 選んだ理由
【推奨買い目】具体的な馬番の組み合わせ${budget ? `と購入金額（合計${budget.toLocaleString()}円以内）` : ""}
【レース展開予想】逃げ・先行・差しの展開とペース予測
【総評】このレースのポイントと穴馬候補

※過去成績データがない馬は騎手や斤量から判断すること。謝罪や追加情報の要求は不要。${isBacktest ? "\n※これはバックテスト（事後検証）です。過去成績に当該レースの結果が含まれていても無視し、そのレース「直前」の状態として分析・予想してください。" : ""}`;
  }

  try {
    const systemPrompt = mode === "fukusho"
      ? isBacktest
        ? "あなたはプロの競馬アナリストで、回収率最大化の専門家です。【絶対ルール】(1)情報が不足していても追加情報を要求したり謝罪したりしてはいけない。代わりに必ず「【推奨判定】スキップ」「【複勝推奨】スキップ — 理由(情報不足)」のフォーマットで返すこと。(2)出走馬に「【1番人気】」の記載がなければ即スキップ。(3)一般クラス戦（未勝利・1勝・2勝クラス・新馬）は即スキップ。(4)重賞・特別クラス以外（レース名に「S」「賞」「カップ」「ステークス」「記念」「特別」「オープン」「G1」「G2」「G3」「OP」が含まれない）は即スキップ。(5)出走頭数13頭以上は荒れるリスクが高いため即スキップ。(6)全ての応答は必ず「【推奨判定】」で始めること。(7)推奨馬は必ず1〜3番人気から選ぶこと。(8)フォーマット以外の説明文・前置き・謝罪は絶対に付け加えない。【出力フォーマット厳守】出力は必ず以下のどちらか1パターンのみ: スキップ時→「【推奨判定】スキップ（理由: [Z1/Z2/A/B/C/D/E/F]）」の1行と「【複勝推奨】スキップ — 理由(...)」の1行のみ。推奨時→「【推奨判定】買い推奨」「【複勝推奨】X番 馬名 — 推奨理由（人気順位・複勝率を明記）」「【3着内確率】推定XX%」「【リスク要因】...」の形式。馬番は必ず半角数字。上記以外の形式は絶対に使わないこと。"
        : "あなたはプロの競馬予想家で複勝一点買いの専門家です。提供された出走馬の過去成績・騎手・斤量・コース適性を分析し、最も複勝（3着内）に入る可能性が高い馬を推奨します。【黄金ルール】推奨馬は必ず1〜3番人気から選ぶこと。重賞・特別競走は1〜2番人気を積極推奨。未勝利・1勝クラスは軽視、13頭以上は荒れやすい。謝罪や情報不足の言及は一切しません。"
      : "あなたはプロの競馬予想家です。【絶対ルール】(1)一般クラス戦（未勝利・1勝・2勝クラス・新馬）またはレース名に「賞」「カップ」「ステークス」「記念」「特別」「オープン」「G1/G2/G3」「OP」が含まれない場合は即スキップ: 「【推奨判定】スキップ」「【本命（◎）】スキップ — 理由(一般クラス戦のため)」の2行のみ出力し、他は一切書かない。(2)スキップ以外の場合は【推奨判定】買い推奨を最初に出力し、全予想項目（本命・対抗・単穴・買い目・展開・総評）を必ず出力する。(3)本命◎・対抗○は必ず1〜3番人気から選ぶ。(4)データが不完全な馬は騎手や斤量から推測で補う。(5)情報不足の謝罪や追加データの要求は絶対にしない。";

    const message = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const prediction = message.content[0].type === "text" ? message.content[0].text : "";

    // バックテストはAIが何を返しても予想テキストとして返す（拒否チェックなし）
    if (!isBacktest) {
      const hasRequiredSections = mode === "fukusho"
        ? prediction.includes("複勝推奨") || prediction.includes("レース安定度")
        : prediction.includes("本命") || prediction.includes("◎") || prediction.includes("買い目");
      // 明示的な全拒否のみ弾く（部分的な謝罪・情報不足言及は許容）
      const isHardRefusal = !hasRequiredSections && (
        prediction.includes("予想提供ができません") ||
        prediction.includes("判読できない") ||
        (prediction.includes("申し訳") && prediction.length < 200)
      );
      if (isHardRefusal) {
        return NextResponse.json(
          { error: "レースデータが正しく取得できませんでした。別のレースを選択するか、しばらく待ってから再試行してください。" },
          { status: 422 }
        );
      }
    }

    const newCount = cookieCount + 1;
    const response = NextResponse.json({
      prediction,
      raceInfo: raceData.info.trim(),
      count: newCount,
      mode,
      debugLog, // remove this line once stable
    });

    if (!isPremium && !isBacktest) {
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
