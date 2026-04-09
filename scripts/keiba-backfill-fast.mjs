/**
 * keiba-backfill-fast.mjs
 *
 * 2023-2025年の重賞・特別レースを netkeiba からスクレイピングし、
 * 全出走馬の複勝バックテスト結果を keiba_prediction_logs に投入する。
 *
 * データフロー:
 *   1. netkeiba 開催一覧ページから過去レースの race_id を収集
 *   2. 各レースの結果ページから出走馬・着順・複勝払戻を取得
 *   3. AI予測ロジックを模倣して buy/skip を決定（バイアス除去版）
 *      - 重賞・特別以外: 全馬skip（一般クラスはAIが即スキップするため）
 *      - 15頭以上: 全馬skip（AIの絶対ルール）
 *      - 6番人気以上: skip（大穴バイアス大）
 *      - 単勝7.0倍未満: skip（複勝2.5倍未満≒控除率に負ける過剰人気帯）
 *      - 単勝13.0倍超: skip（大穴過剰人気バイアス帯）
 *   DR2026-04-09: 単勝7-13倍特化（市場過小評価ゾーン・複勝2.5-5.0倍帯）
 *   4. 結果（hit/return_amount/actual_pos/ev）も同時に設定
 *
 * 旧版からの変更点（2026-04-09）:
 *   - 旧版は全馬をbuyで挿入 → バックテストが「全馬買い」になりROIが歪む
 *   - 修正版はAI予測の絶対ルールを再現して正確なバックテストを実現
 *
 * 使い方:
 *   node scripts/keiba-backfill-fast.mjs            # 2023-2025 全重賞
 *   node scripts/keiba-backfill-fast.mjs --dry-run  # DBを更新せず動作確認
 *   node scripts/keiba-backfill-fast.mjs --limit=50 # 50件のレースで停止
 *   node scripts/keiba-backfill-fast.mjs --year=2024 # 特定年のみ
 *
 * pgモジュール: d:/99_Webアプリ/競馬予想AI/node_modules/pg
 */

import { createRequire } from "module";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";

const require = createRequire(import.meta.url);
const { Client, Pool } = require("pg");

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── .env.local 読み込み ─────────────────────────────────────────────────────
const envPath = resolve(__dirname, "../.env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── 引数解析 ────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");
const REPLACE_ZERO = process.argv.includes("--replace-zero"); // return_amount=0の既存データを上書き
const limitArg = process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]
  || (process.argv.includes("--limit") ? process.argv[process.argv.indexOf("--limit") + 1] : null);
const MAX_RACE_LIMIT = limitArg ? parseInt(limitArg, 10) : Infinity;
const yearArg = process.argv.find((a) => a.startsWith("--year="))?.split("=")[1];
const TARGET_YEARS = yearArg ? [parseInt(yearArg, 10)] : [2023, 2024, 2025];

if (DRY_RUN) console.log("[dry-run] DBを更新しません");
if (REPLACE_ZERO) console.log("[replace-zero] return_amount=0の既存データを上書きします");
if (MAX_RACE_LIMIT < Infinity) console.log(`[limit] 最大 ${MAX_RACE_LIMIT} レースで停止`);
console.log(`[対象年] ${TARGET_YEARS.join(", ")}`);

// ── Supabase pg接続設定 ─────────────────────────────────────────────────────
const PG_CONFIG = {
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
};

// ── 定数 ────────────────────────────────────────────────────────────────────
const PARALLEL_RACES = 8;    // レース単位並列数
const SLEEP_NORMAL_MS = 300; // 通常待機（netkeiba礼儀）
const SLEEP_429_MS = 8000;   // 429エラー時待機
const MAX_RETRY = 3;         // 最大リトライ回数

// ── 対象会場（小倉=10, 札幌=01 を除外） ─────────────────────────────────────
// netkeiba venue code: 01=札幌 02=函館 03=福島 04=新潟 05=東京 06=中山 07=中京 08=京都 09=阪神 10=小倉
const SKIP_VENUE_CODES = ["01", "10"];
const ALL_VENUE_CODES = ["02","03","04","05","06","07","08","09"];

// ── 重賞・特別フィルターキーワード ──────────────────────────────────────────
const GRADED_KEYWORDS = [
  "Ｇ１","Ｇ２","Ｇ３","G1","G2","G3",
  "賞","カップ","ステークス","記念","特別",
  "ＯＰ","OP","オープン","OPEN",
  "（G","(G",
];

function isGradedRace(raceName) {
  if (!raceName) return false;
  return GRADED_KEYWORDS.some((kw) => raceName.includes(kw));
}

// ── ユーティリティ ──────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/** EUC-JP / Shift-JIS 対応デコード */
async function decodeBuffer(buffer) {
  const sniff = new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, 2000));
  const cs = (sniff.match(/charset=["']?\s*([a-zA-Z0-9_-]+)/i)?.[1] || "utf-8")
    .toLowerCase().replace(/[_-]/g, "");
  if (cs === "eucjp" || cs === "xeucjp")
    return new TextDecoder("euc-jp").decode(buffer);
  if (cs === "shiftjis" || cs === "xsjis" || cs === "sjis" || cs === "windows31j")
    return new TextDecoder("shift_jis").decode(buffer);
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://db.netkeiba.com/",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

/** fetch with retry (429対応) */
async function fetchWithRetry(url, retries = MAX_RETRY) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.status === 429) {
        console.warn(`[429] ${url.slice(0, 80)} → ${SLEEP_429_MS}ms待機`);
        await sleep(SLEEP_429_MS);
        continue;
      }
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return await decodeBuffer(buf);
    } catch (e) {
      if (i < retries - 1) {
        await sleep(2000);
        continue;
      }
      return null;
    }
  }
  return null;
}

// ── 開催一覧ページから race_id リストを取得 ──────────────────────────────────
/**
 * netkeiba の開催スケジュールページからレースIDを収集する
 * URL例: https://db.netkeiba.com/?pid=race_list&word=&track_id[]=06&grade[]=1&grade[]=2&grade[]=3&grade[]=5&start_year=2023&start_mon=1&end_year=2023&end_mon=12&jyo[]=&sort=date&list=100
 */
async function fetchRaceIdsByYear(year) {
  const raceIds = [];

  // 重賞のみ: grade=1(G1) 2(G2) 3(G3) 5(OP/L)
  // 一度に100件取得
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `https://db.netkeiba.com/?pid=race_list&word=&grade%5B%5D=1&grade%5B%5D=2&grade%5B%5D=3&grade%5B%5D=5&start_year=${year}&start_mon=1&end_year=${year}&end_mon=12&sort=date&list=100&page=${page}`;
    const html = await fetchWithRetry(url);
    await sleep(SLEEP_NORMAL_MS);

    if (!html) {
      console.warn(`[warn] 開催一覧取得失敗 year=${year} page=${page}`);
      break;
    }

    // レースIDを抽出: href="/race/XXXXXXXXXXXXXX/"
    const matches = html.matchAll(/href="\/race\/(\d{12})\/?"/g);
    let count = 0;
    for (const m of matches) {
      const raceId = m[1];
      if (!raceIds.includes(raceId)) {
        raceIds.push(raceId);
        count++;
      }
    }

    if (count === 0) {
      hasMore = false;
    } else {
      // 次ページあるか確認
      if (!html.includes(`page=${page + 1}`)) hasMore = false;
      else page++;
    }
  }

  return raceIds;
}

// ── レース結果ページから全出走馬の情報を取得 ──────────────────────────────────
/**
 * netkeibaのJRA公式APIから複勝オッズの下限を取得する
 * URL: https://race.netkeiba.com/api/api_get_jra_odds.html?race_id={id}&type=1
 * レスポンス: { status:"result", data:{ odds:{ "1":{tansh}, "2":{fukusho:[下限,上限,人気]} } } }
 * 動作確認: 2021年以降の全過去レースでアクセス可能（UTF-8 JSON）
 * @returns {Map<number, number>} horseNum → 複勝オッズ下限（例: 2.5 = 2.5倍）
 */
async function fetchFukushoOddsFromAPI(raceId) {
  const url = `https://race.netkeiba.com/api/api_get_jra_odds.html?race_id=${raceId}&type=1`;
  const oddsMap = new Map();
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": HEADERS["User-Agent"],
        "Referer": "https://race.netkeiba.com/",
        "Accept": "application/json, */*",
      },
    });
    if (!res.ok) return oddsMap;
    const json = await res.json();
    if (json.status !== "result") return oddsMap;
    // 複勝データ: data.odds["2"] または data["2"]（旧形式互換）
    const fukushoData = json?.data?.odds?.["2"] ?? json?.data?.["2"] ?? {};
    for (const [key, val] of Object.entries(fukushoData)) {
      // キーは2桁ゼロパディング("01","02"...): parseInt で馬番取得
      const num = parseInt(key, 10);
      // val = [下限オッズ文字列, 上限オッズ文字列, 人気順位文字列]
      const low = parseFloat(String(val[0] ?? ""));
      if (!isNaN(num) && num > 0 && !isNaN(low) && low > 0) {
        oddsMap.set(num, low);
      }
    }
  } catch {
    // APIエラーは無視（下限なしで処理継続）
  }
  return oddsMap;
}

/**
 * @returns {Array<{horseNum, horseName, actualPos, tanshOdds, fukushoReturn}>}
 */
async function fetchRaceFullResult(raceId) {
  const url = `https://db.netkeiba.com/race/${raceId}/`;
  const html = await fetchWithRetry(url);
  if (!html) return null;

  // レース日付取得（HTML本文から優先取得）
  let raceDate = "";
  const dateMatch = html.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (dateMatch) {
    raceDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
  }
  if (!raceDate) {
    // フォールバック: meta description や他パターン
    const dateMatch2 = html.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch2) raceDate = `${dateMatch2[1]}-${dateMatch2[2]}-${dateMatch2[3]}`;
  }

  // レース名取得: titleタグから「レース名｜日付 | ...」形式で抽出
  let raceName = "";
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    // "有馬記念｜2023年12月24日 | 競馬データベース - netkeiba" → "有馬記念"
    raceName = titleMatch[1].split(/[｜|]/)[0].replace(/\s+/g, " ").trim();
  }

  // ── 複勝払い戻しテーブル解析 ──
  // HTML構造: <dl class="pay_block"> > <table class="pay_table_01">
  //   <tr><th class="fuku">複勝</th><td>10<br />3<br />2</td><td class="txt_r">210<br />340<br />1,120</td>...</tr>
  const fukushoMap = {}; // horseNum → returnAmount

  // pay_table_01 テーブルを全て取得
  const payTables = html.matchAll(
    /<table[^>]+class=["'][^"']*pay_table_01[^"']*["'][^>]*>([\s\S]*?)<\/table>/gi
  );
  outer: for (const payTableMatch of payTables) {
    const rows = payTableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];
    for (const row of rows) {
      // <th class="fuku"> で複勝行を識別
      if (!/<th[^>]+class=["'][^"']*fuku[^"']*["']/.test(row)) continue;

      // <td> を順番に取得（1番目=馬番、2番目=払戻金額）
      const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
      if (tds.length < 2) break;

      // tdのテキストを取得（<br />区切りで複数値）
      const getTexts = (td) =>
        (td.match(/<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .trim()
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);

      const numTexts = getTexts(tds[0]); // 馬番リスト
      const amtTexts = getTexts(tds[1]); // 払戻金額リスト

      for (let i = 0; i < numTexts.length; i++) {
        const num = parseInt(numTexts[i].replace(/[^\d]/g, ""), 10);
        if (isNaN(num) || num <= 0) continue;
        if (i < amtTexts.length) {
          const amt = parseInt(amtTexts[i].replace(/[^\d]/g, ""), 10);
          if (!isNaN(amt) && amt >= 100) fukushoMap[num] = amt;
        }
      }
      break outer;
    }
  }

  // ── 着順テーブル解析 ──
  const horses = [];

  const tableMatch = html.match(
    /<table[^>]+class=["'][^"']*race_table_01[^"']*["'][^>]*>([\s\S]*?)<\/table>/i
  );
  if (tableMatch) {
    const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];
    for (const row of rows) {
      const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
      if (tds.length < 4) continue;

      const getText = (td) => (td?.match(/<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "")
        .replace(/<[^>]+>/g, "").trim();

      const posText = getText(tds[0]);
      const numText = getText(tds[2]); // 馬番は3列目（0-indexed: 枠番, 馬番...）
      const nameText = getText(tds[3]); // 馬名は4列目

      // 馬番が数字でない行はスキップ
      if (!/^\d+$/.test(numText)) continue;
      if (!/^\d+$/.test(posText) && posText !== "") continue;

      const horseNum = parseInt(numText, 10);
      const actualPos = /^\d+$/.test(posText) ? parseInt(posText, 10) : 0;

      // 単勝オッズ・人気（db.netkeiba.com 実際の列配置）
      // 0:着順 1:枠番 2:馬番 3:馬名 4:性齢 5:斤量 6:騎手 7:タイム 8:着差
      // 9-13:映像/misc 14:通過順 15:上り3F 16:単勝オッズ 17:人気 18:馬体重
      let tanshOdds = null;
      let popularityFromTable = null;
      if (tds.length >= 17) {
        const oddsText = getText(tds[16]);
        if (/^[\d.]+$/.test(oddsText)) tanshOdds = parseFloat(oddsText);
        const popText = getText(tds[17]);
        if (/^\d+$/.test(popText)) popularityFromTable = parseInt(popText, 10);
      }

      horses.push({
        horseNum,
        horseName: nameText,
        actualPos,
        tanshOdds,
        popularityFromTable,
        fukushoReturn: fukushoMap[horseNum] || 0,
      });
    }
  }

  if (horses.length === 0) return null;

  // 複勝オッズAPIから事前オッズ（レース結果確定前）を取得
  // 注意: db.netkeibaのレース結果ページは確定後データのため払戻金は取得できるが
  //       事前オッズはSP APIから別途取得する必要がある
  const fukushoOddsMap = await fetchFukushoOddsFromAPI(raceId);
  await sleep(SLEEP_NORMAL_MS);

  // 各馬に複勝オッズ下限を付与
  for (const h of horses) {
    h.fukushoOddsLow = fukushoOddsMap.get(h.horseNum) ?? null;
  }

  return { raceName, raceDate, horses };
}

// ── DB: 既存race_idを確認（重複挿入防止） ──────────────────────────────────
async function getExistingRaceIds(client, raceIds) {
  if (raceIds.length === 0) return new Set();
  let query;
  if (REPLACE_ZERO) {
    // --replace-zero モード: return_amount>0のデータがある race_id のみ既存扱い
    // return_amount=0のみのrace_idは再処理対象とする
    query = `
      SELECT DISTINCT race_id FROM keiba_prediction_logs
      WHERE race_id = ANY($1)
      AND race_id IN (
        SELECT race_id FROM keiba_prediction_logs
        WHERE race_id = ANY($1) AND return_amount > 0
      )
    `;
  } else {
    query = `SELECT DISTINCT race_id FROM keiba_prediction_logs WHERE race_id = ANY($1)`;
  }
  const res = await client.query(query, [raceIds]);
  return new Set(res.rows.map((r) => r.race_id));
}

// ── AI予測ロジック模倣: バックテスト用 buy/skip 判定 ─────────────────────────
/**
 * 実際の predict API が使う判断基準を模倣する（route.ts の絶対ルールを再現）。
 *
 * 実際のAIプロンプト（route.ts 1392行付近）から抽出した絶対ルール:
 *   - 一般クラス戦（未勝利・1勝・2勝・新馬）→ 即スキップ
 *   - 重賞・特別以外 → 即スキップ
 *   - 出走頭数15頭以上 → スキップ
 *   - 複勝オッズ2.0倍未満（単勝≒5倍以下）→ スキップ
 *   - 前走6着以下の馬 → スキップ（バックフィルでは前走情報がないため省略）
 *
 * 実績データ分析から判明したオッズ帯別ROI（76件サンプル）:
 *   2-3倍: ROI 210% / 3-4倍: ROI 112% / 5-7倍: ROI 185%
 *   4-5倍（死亡帯）: ROI 36.7% / 7-10倍×重賞: ROI 232%
 *   7-10倍×低グレード: ROI 0%
 *
 * 人気判定:
 *   出走馬中の相対的な単勝オッズ順位で 1-3番人気相当かどうかを判断する。
 *   tanshOdds が全馬中上位3位以内 → 人気馬フラグ
 *
 * @param {object} h         - 1頭分データ { horseNum, horseName, tanshOdds, fukushoReturn, fukushoOddsLow }
 * @param {number} totalHorses - レース頭数
 * @param {boolean} isGraded   - 重賞・OP かどうか
 * @param {number} popularityRank - 人気順位（単勝オッズ昇順での順位、1始まり）
 * @returns {{ recommendation: 'buy'|'skip', ev: number|null }}
 */
function simulateAIPrediction(h, totalHorses, isGraded, popularityRank) {
  const tansh = h.tanshOdds;

  // ルール1: 重賞・特別以外はスキップ（呼び出し元で isGraded チェック済みだが念のため）
  if (!isGraded) {
    return { recommendation: "skip", ev: null };
  }

  // ルール2: 15頭以上はスキップ
  if (totalHorses >= 15) {
    return { recommendation: "skip", ev: null };
  }

  // ルール3: オッズ不明の場合 → 人気順位が計算不能のため skip
  // （以前は暫定 buy にしていたが、不正データが大量発生したため修正: 2026-04-09）
  if (!tansh || tansh <= 0) {
    return { recommendation: "skip", ev: null };
  }

  // ルール4: 2-5番人気から選ぶ（DR2026-04-09更新・人気縛り緩和）
  //   route.tsプロンプト更新: 「2〜6番人気で条件を満たす馬を積極推奨」
  //   1番人気は単勝7倍未満が多くルール5で除外される
  //   6番人気以上は大穴帯でバイアス大きいため5番人気まで
  if (popularityRank > 5) {
    return { recommendation: "skip", ev: null };
  }

  // ルール5: 過剰人気スキップ（DR2026-04-09更新）
  //   単勝7.0倍未満 ≈ 複勝2.5倍未満 → 控除率25%に負ける数学的不利ゾーン
  //   DR確定: 1番人気複勝回収率73.9% / 複勝1.51倍平均は期待値マイナス
  //   単勝7-13倍帯が市場過小評価ゾーン（DR: 複勝2.5-5.0倍特化推奨）
  if (tansh < 7.0) {
    return { recommendation: "skip", ev: null };
  }

  // ルール6: 大穴帯スキップ（DR2026-04-09更新）
  //   単勝13倍超 ≈ 複勝5倍超 → 大穴過剰人気バイアス帯
  if (tansh > 13.0) {
    return { recommendation: "skip", ev: null };
  }

  // ルール7: 複勝オッズ下限フィルター（DR2026-04-09実装）
  //   複勝下限2.5倍未満 → 控除率20%に対して利益余地が薄い帯
  //   DR推定: 複勝下限2.5倍以上特化でROI 93%→105-120%改善見込み
  //   API取得失敗時（null）は単勝オッズで代替判断（7-13倍帯ならおおむね複勝2.5-5倍帯）
  if (h.fukushoOddsLow !== null && h.fukushoOddsLow < 2.5) {
    return { recommendation: "skip", ev: null };
  }

  // EV計算（参考値として保存）
  //   バックフィルでは複勝オッズが不明なため単勝から推定
  //   実績: return_amount ≈ odds × 100（oddsがそのまま複勝払戻倍率）
  //   → odds カラム値 = 単勝オッズ ≈ 複勝オッズの約1倍（同値に見える）
  //   NOTE: 実DBでは odds = tanshOdds(単勝) として格納されているが、
  //          return_amount/100 ≈ odds と一致しているのは偶然ではなく
  //          「バックフィルでtanshOddsをoddsに入れているから」
  //   モデル推定確率: 1-3番人気 × 重賞 × ≤14頭
  //   1番人気 ≈ 34% / 2番人気 ≈ 26% / 3番人気 ≈ 20%
  const estimatedProb =
    popularityRank === 1 ? 0.34 :
    popularityRank === 2 ? 0.26 :
    0.20; // 3番人気

  // 複勝オッズ推定: 単勝オッズとほぼ同じ（バックフィルの挙動から）
  const estimatedFukushoOdds = tansh;
  const ev = Math.round(estimatedFukushoOdds * estimatedProb * 100) / 100;

  return {
    recommendation: "buy",
    ev,
  };
}

// ── DB: レース結果を一括挿入 ────────────────────────────────────────────────
async function insertRaceResults(client, raceId, raceName, raceDate, horses) {
  if (horses.length === 0) return 0;

  // --replace-zero モードの場合、return_amount=0の旧データを先に削除
  if (REPLACE_ZERO) {
    await client.query(
      `DELETE FROM keiba_prediction_logs WHERE race_id = $1 AND return_amount = 0`,
      [raceId]
    );
  }

  const totalHorses = horses.length;
  const isGraded = isGradedRace(raceName);

  // 人気順位を単勝オッズ昇順で算出（同オッズは同順位）
  // tanshOdds が null の馬は最後尾扱い
  const sortedByOdds = [...horses]
    .filter(h => h.tanshOdds != null && h.tanshOdds > 0)
    .sort((a, b) => a.tanshOdds - b.tanshOdds);
  const popularityMap = new Map();
  sortedByOdds.forEach((h, idx) => {
    // 同一オッズは同順位（先着優先の簡易処理）
    if (!popularityMap.has(h.horseNum)) {
      popularityMap.set(h.horseNum, idx + 1);
    }
  });

  // AI予測ロジックを模倣して buy/skip を決定（バイアス除去版）
  const values = horses.map((h) => {
    const hit = h.actualPos > 0 ? h.actualPos <= 3 : h.fukushoReturn > 0;
    // テーブルから直接取得した人気順位を優先（より正確）、なければオッズ順で推計
    const popularityRank = h.popularityFromTable ?? popularityMap.get(h.horseNum) ?? 999;
    const { recommendation, ev } = simulateAIPrediction(h, totalHorses, isGraded, popularityRank);

    return [
      raceId,
      raceName,
      raceDate,
      recommendation,  // buy/skip をAI模倣ロジックで決定
      h.horseNum,
      h.horseName,
      ev,              // EV を記録
      h.tanshOdds,     // 単勝オッズ
      null,            // confidence（現行AIでは未使用）
      h.actualPos > 0 ? h.actualPos : null,
      hit,
      h.fukushoReturn,
    ];
  });

  let count = 0;
  for (const v of values) {
    try {
      await client.query(
        `INSERT INTO keiba_prediction_logs
         (race_id, race_name, race_date, recommendation, horse_num, horse_name, ev, odds, confidence, actual_pos, hit, return_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT DO NOTHING`,
        v
      );
      count++;
    } catch (e) {
      // 個別エラーは無視して継続
    }
  }
  return count;
}

// ── 1レース処理 ────────────────────────────────────────────────────────────
async function processRace(client, raceId, stats) {
  // 会場コードチェック（小倉=10, 札幌=01）
  const venueCode = raceId.slice(4, 6);
  if (SKIP_VENUE_CODES.includes(venueCode)) {
    stats.skippedVenue++;
    return;
  }

  const result = await fetchRaceFullResult(raceId);
  await sleep(SLEEP_NORMAL_MS);

  if (!result) {
    stats.fetchFailed++;
    return;
  }

  const { raceName, raceDate, horses } = result;

  // 重賞・特別フィルター
  if (!isGradedRace(raceName)) {
    stats.filteredOut++;
    return;
  }

  if (DRY_RUN) {
    console.log(
      `[dry-run] race=${raceId} name="${raceName}" date=${raceDate} horses=${horses.length}件`
    );
    stats.racesProcessed++;
    stats.horsesInserted += horses.length;
    return;
  }

  // 既存チェック
  const existing = await getExistingRaceIds(client, [raceId]);
  if (existing.has(raceId)) {
    stats.alreadyExists++;
    return;
  }

  const inserted = await insertRaceResults(client, raceId, raceName, raceDate, horses);
  stats.racesProcessed++;
  stats.horsesInserted += inserted;
}

// ── 進捗表示 ────────────────────────────────────────────────────────────────
function printProgress(stats, totalRaces) {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(0);
  process.stdout.write(
    `\r[進捗] ${stats.totalScanned}/${totalRaces}レース | 処理済:${stats.racesProcessed} 馬投入:${stats.horsesInserted} スキップ:${stats.skippedVenue} フィルタ:${stats.filteredOut} 既存:${stats.alreadyExists} 失敗:${stats.fetchFailed} | ${elapsed}s   `
  );
}

// ── メイン ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== keiba-backfill-fast 開始 ===");
  console.log(`開始時刻: ${new Date().toISOString()}`);
  console.log(`並列数: ${PARALLEL_RACES} | 通常待機: ${SLEEP_NORMAL_MS}ms | 429待機: ${SLEEP_429_MS}ms`);

  // Pool を使って並列クエリを安全に処理
  const client = new Pool({ ...PG_CONFIG, max: 10 });
  // 接続確認
  await client.query("SELECT 1");
  console.log("[db] Supabase接続OK");

  // ── 全対象年のrace_idを収集 ──────────────────────────────────────────────
  const allRaceIds = [];
  for (const year of TARGET_YEARS) {
    console.log(`\n[収集] ${year}年の重賞レース一覧を取得中...`);
    const ids = await fetchRaceIdsByYear(year);
    console.log(`[収集] ${year}年: ${ids.length} 件`);
    allRaceIds.push(...ids);
  }

  console.log(`\n総対象race_id: ${allRaceIds.length} 件`);

  // limitがあれば絞る
  const targetRaceIds = MAX_RACE_LIMIT < Infinity
    ? allRaceIds.slice(0, MAX_RACE_LIMIT)
    : allRaceIds;

  if (targetRaceIds.length === 0) {
    console.log("処理対象なし。終了します。");
    await client.end();
    return;
  }

  const totalRaces = targetRaceIds.length;
  const estimatedMin = Math.ceil((totalRaces / PARALLEL_RACES) * (SLEEP_NORMAL_MS / 1000) / 60);
  console.log(`処理対象: ${totalRaces} 件 | 推定: 約${estimatedMin}分\n`);

  const stats = {
    totalScanned: 0,
    racesProcessed: 0,
    horsesInserted: 0,
    skippedVenue: 0,
    filteredOut: 0,
    alreadyExists: 0,
    fetchFailed: 0,
    startTime: Date.now(),
  };

  // ── 8並列でチャンク処理 ──────────────────────────────────────────────────
  for (let i = 0; i < targetRaceIds.length; i += PARALLEL_RACES) {
    const chunk = targetRaceIds.slice(i, i + PARALLEL_RACES);

    await Promise.all(
      chunk.map(async (raceId) => {
        await processRace(client, raceId, stats);
        stats.totalScanned++;
      })
    );

    printProgress(stats, totalRaces);

    // 50レースごとにマイルストーン表示
    if (stats.totalScanned % 50 === 0) {
      process.stdout.write("\n");
      console.log(
        `[milestone] ${stats.totalScanned}/${totalRaces}レース完了 | 馬投入: ${stats.horsesInserted}件`
      );
    }
  }

  process.stdout.write("\n");
  await client.end(); // Pool を終了

  console.log("\n=== keiba-backfill-fast 完了 ===");
  console.log(`終了時刻: ${new Date().toISOString()}`);
  console.log(`スキャン: ${stats.totalScanned} レース`);
  console.log(`処理済み: ${stats.racesProcessed} レース`);
  console.log(`馬データ投入: ${stats.horsesInserted} 件`);
  console.log(`会場スキップ: ${stats.skippedVenue} 件`);
  console.log(`フィルタ除外: ${stats.filteredOut} 件`);
  console.log(`既存スキップ: ${stats.alreadyExists} 件`);
  console.log(`取得失敗: ${stats.fetchFailed} 件`);
  console.log(`\n[完了] keiba_prediction_logs の新規レコード: ${stats.horsesInserted} 件`);
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
