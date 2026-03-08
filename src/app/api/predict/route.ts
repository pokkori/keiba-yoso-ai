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
  weight?: string;   // 斤量
  horseId?: string;  // netkeiba horse ID (10-12 digits)
}

// ─── Parse db.netkeiba.com/race/{id}/ result table → horse list ──────────────
// race_table_01 columns: 着順, 枠番, 馬番, 馬名, 性齢, 斤量, 騎手, タイム, 着差, 単勝, 人気, 馬体重

function parseHorsesFromDBResultPage(html: string): HorseBasic[] {
  const horses: HorseBasic[] = [];
  const tableMatch = html.match(/<table[^>]*class="[^"]*race_table_01[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) return [];

  const getText = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

  let m;
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  while ((m = rowPattern.exec(tableMatch[1])) !== null) {
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

    horses.push({ num, name, jockey, weight, horseId });
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

async function fetchShutuba(raceId: string, log: string[]): Promise<ShutubResult> {
  const urls = [
    `https://race.netkeiba.com/race/shutuba_popup.html?race_id=${raceId}`,
    `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`,
    `https://sp.netkeiba.com/race/shutuba.html?race_id=${raceId}`,
    // 過去レース（バックテスト）用フォールバック: 結果ページにも出走馬情報がある
    `https://db.netkeiba.com/race/${raceId}/`,
    `https://race.netkeiba.com/race/result.html?race_id=${raceId}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { ...BASE_HEADERS, Referer: "https://race.netkeiba.com/" },
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

function parseHorsePastResults(html: string): string[] {
  // Table: <table class="race_table_01 nk_tb_common">
  // Columns (0-indexed): 0:日付, 1:開催, 2:天気, 3:R, 4:レース名, 5:映像,
  //   6:頭数, 7:枠, 8:馬番, 9:オッズ, 10:人気, 11:着順, 12:騎手,
  //   13:斤量, 14:コース, 15:タイム, 16:着差, 17:タイム指数, 18:通過,
  //   19:ペース, 20:上り, 21:馬体重
  const tableMatch = html.match(/<table[^>]*class="[^"]*race_table_01[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) return [];

  const results: string[] = [];
  let m;
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let dataRows = 0;

  while ((m = rowPattern.exec(tableMatch[1])) !== null && dataRows < 5) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c =>
      c[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
    );
    if (cells.length < 16) continue; // skip header or incomplete rows

    const date = cells[0];
    const raceName = cells[4];
    const position = cells[11]; // 着順
    const jockey = cells[12];
    const course = cells[14];   // e.g. "芝1600" "ダ1200"
    const time = cells[15];
    const margin = cells[16];   // 着差
    const horseWeight = cells[21]; // 馬体重

    if (!date || !raceName || !position || position === "着順") continue;

    const posStr = position === "1" ? "1着" : `${position}着`;
    const marginStr = margin && margin !== "0.0" && margin !== "" ? `(${margin})` : "";
    const weightStr = horseWeight ? ` 馬体重${horseWeight}` : "";
    results.push(`${date} ${raceName} [${course}] ${posStr}${marginStr} ${time} 騎手:${jockey}${weightStr}`);
    dataRows++;
  }
  return results;
}

// ─── Fetch single horse detail from db.netkeiba.com ──────────────────────────

function formatBasic(h: HorseBasic): string {
  let s = `${h.num}番 ${h.name}`;
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

    const pastResults = parseHorsePastResults(html);

    // Age + sex (e.g. "4歳牡")
    const ageSex = html.match(/(\d+)歳([牡牝セ騸])/)?.[0] ?? "";
    // Trainer
    const trainer = html.match(/href="[^"]*\/trainer\/[^"]*">([^<]{2,8})<\/a>/)?.[1] ?? "";

    let info = `${horse.num}番 ${horse.name}`;
    if (ageSex) info += `  ${ageSex}`;
    if (horse.jockey) info += `  騎手:${horse.jockey}`;
    if (horse.weight) info += `  斤量:${horse.weight}`;
    if (trainer) info += `  調教師:${trainer}`;
    if (pastResults.length > 0) {
      info += `\n  【過去成績（直近${pastResults.length}走）】\n`;
      info += pastResults.map(r => `    ${r}`).join("\n");
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

async function fetchRaceData(raceId: string): Promise<FetchResult> {
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
        baseHorses = oddsInfo.map((item: string[]) => ({
          num: item[0],
          name: item[1],
          jockey: item[4] || undefined,
        }));
        log.push(`json_odds: ${baseHorses.length} horses`);
      }
    }
  } catch (e) {
    log.push(`json_odds error: ${e instanceof Error ? e.message.slice(0, 60) : "unknown"}`);
  }

  // ── Fetch shutuba HTML to get horse IDs (always needed for detail fetch) ──
  const shutubaResult = await fetchShutuba(raceId, log);
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

  let body: { raceId?: string; budget?: number; mode?: string; backtest?: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 }); }

  if (!body.raceId || !body.raceId.match(/^\d{12}$/)) {
    return NextResponse.json({ error: "レースIDが不正です" }, { status: 400 });
  }

  // バックテスト（過去レース検証）は無料枠カウント対象外
  const isBacktest = body.backtest === true;
  const isPremium = req.cookies.get("stripe_premium")?.value === "1";
  const cookieCount = parseInt(req.cookies.get(COOKIE_KEY)?.value || "0");
  if (!isPremium && !isBacktest && cookieCount >= FREE_LIMIT) {
    return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 429 });
  }

  const budget = typeof body.budget === "number" && body.budget >= 100 ? Math.min(body.budget, 1000000) : null;
  const mode = body.mode === "fukusho" ? "fukusho" : "standard";

  const { data: raceData, debugLog } = await fetchRaceData(body.raceId);
  if (!raceData) {
    console.error("fetchRaceData failed:", debugLog);
    const trackCode = body.raceId.substring(4, 6);
    const raceNo = parseInt(body.raceId.substring(10, 12), 10);
    const venue = TRACK_NAMES[trackCode] || "";
    return NextResponse.json({ error: "FETCH_FAILED", venue, raceNo, debugLog }, { status: 502 });
  }

  let prompt: string;

  if (mode === "fukusho") {
    const budgetLine = budget
      ? `\n【軍資金】${budget.toLocaleString()}円（複勝1点に集中投資する前提で期待払戻を計算すること）`
      : "";

    prompt = `以下の競馬レース情報を分析して、「複勝一点買い戦略」に最適な予想を出力してください。

レース: ${raceData.info}

出走馬詳細情報:
${raceData.horses}
${budgetLine}

【戦略の前提：期待値重視の複勝一点買い】
・目標オッズ：複勝2.0〜4.0倍（このゾーンを必ず狙う）
・1番人気は複勝1.8倍未満になりがちなので原則外す
・2〜4番人気の中でアンダーバリューな馬（市場が過小評価）を探す
・近走好調 + 今回の距離・馬場・騎手が好条件の馬を最優先

【推奨する馬の条件（多く満たすほど良い）】
・前走3着以内、または2走前以内に3着以内で今走条件改善
・今回斤量が前走以下、または有力騎手への乗替
・距離・馬場・コース適性がデータで裏付けられる
・想定複勝払戻が2.0倍以上（1.8倍未満の馬は候補から外す）

以下の形式で必ず出力してください（セクションの順序・形式を厳守）：

【推奨判定】買い推奨 or スキップ推奨（理由を一言で）
【複勝推奨】X番 馬名（想定人気：〇番人気）— 推奨理由（近走成績・騎手・適性・なぜアンダーバリューかを具体的に）
※買い推奨の場合は必ず「X番 馬名」の形式で馬番から記入すること。スキップ推奨の場合はこの行を省略可。
【期待値評価】複勝オッズ想定X.X〜X.X倍 / 3着内確率推定XX% → 期待値X.X（1.0以上が買い）
【レース安定度】★★★★☆ — 荒れにくい/荒れやすい理由
【リスク要因】複勝を外す可能性がある要因・注意すべきライバル馬
【買い方提案】${budget ? `軍資金${budget.toLocaleString()}円を複勝1点に投資した場合の期待払戻額と推奨金額` : "推奨投資額と期待払戻の目安（例：1万円投資で想定X.X万円）"}

【推奨判定】スキップ基準（1つでも当てはまればスキップ推奨）：
・最有力馬の複勝オッズが1.8倍未満（旨味なし）
・レース安定度★★☆☆☆以下（極端に荒れやすい）
・出走頭数7頭以下
・期待値が1.0未満の馬しか見当たらない場合

スキップ推奨の場合は【複勝推奨】以降の項目は省略可。

※データが不完全な馬は騎手・斤量から推測すること。謝罪・追加情報要求は不要。`;
  } else {
    const budgetSection = budget
      ? `\n【軍資金】${budget.toLocaleString()}円\n上記の軍資金を前提に、各馬券の具体的な購入金額（○○円）まで含めた配分を必ず記載すること。`
      : "";

    prompt = `以下の競馬レース情報を分析して、具体的な予想を出力してください。

レース: ${raceData.info}

出走馬詳細情報:
${raceData.horses}
${budgetSection}
上記の出走馬の過去成績・騎手・斤量・馬齢・調教師情報をもとに、以下の形式で予想を出力してください：

【本命（◎）】馬番・馬名 — 選んだ理由（過去成績・騎手・コース適性・近走の状態等）
【対抗（○）】馬番・馬名 — 選んだ理由
【単穴（▲）】馬番・馬名 — 選んだ理由
【推奨買い目】具体的な馬番の組み合わせ${budget ? `と購入金額（合計${budget.toLocaleString()}円以内）` : ""}
【レース展開予想】逃げ・先行・差しの展開とペース予測
【総評】このレースのポイントと穴馬候補

※過去成績データがない馬は騎手や斤量から判断すること。謝罪や追加情報の要求は不要。`;
  }

  try {
    const systemPrompt = mode === "fukusho"
      ? "あなたはプロの競馬予想家で「期待値重視の複勝一点買い」の専門家です。目標は長期的にプラス収支を出すこと。複勝オッズ2.0〜4.0倍のアンダーバリュー馬を探し出し、期待値（EV）が1.0を超えるレース・馬にのみ投資します。1番人気・低オッズ馬は原則推奨しません。レースの期待値評価・スキップ判断・推奨理由を必ず出力します。謝罪や情報不足の言及は一切しません。"
      : "あなたはプロの競馬予想家です。提供された出走馬の過去成績・騎手・斤量・馬齢・調教師情報を精密に分析し、必ず具体的な予想を出力してください。データが不完全な馬があっても推測で補い、全ての予想項目（本命・対抗・単穴・買い目・展開・総評）を必ず出力します。情報不足の謝罪や追加データの要求は絶対にしません。";

    const message = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const prediction = message.content[0].type === "text" ? message.content[0].text : "";

    const hasRequiredSections = mode === "fukusho"
      ? prediction.includes("複勝推奨") || prediction.includes("レース安定度")
      : prediction.includes("本命") || prediction.includes("◎") || prediction.includes("買い目");
    const isRefusal = !hasRequiredSections && (
      prediction.includes("申し訳") ||
      prediction.includes("予想提供ができません") ||
      prediction.includes("情報が不足") ||
      prediction.includes("必要な情報") ||
      prediction.includes("判読できない")
    );
    if (isRefusal) {
      return NextResponse.json(
        { error: "レースデータが正しく取得できませんでした。別のレースを選択するか、しばらく待ってから再試行してください。" },
        { status: 422 }
      );
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
