/**
 * keiba-backfill-fast.mjs
 *
 * 2023-2025年の重賞・特別レースを netkeiba からスクレイピングし、
 * 全出走馬の複勝バックテスト結果を keiba_prediction_logs に投入する。
 *
 * データフロー:
 *   1. netkeiba 開催一覧ページから過去レースの race_id を収集
 *   2. 各レースの結果ページから出走馬・着順・複勝払戻を取得
 *   3. 全馬を recommendation='buy' として prediction_logs に挿入
 *   4. 結果（hit/return_amount/actual_pos）も同時に設定
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
const limitArg = process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]
  || (process.argv.includes("--limit") ? process.argv[process.argv.indexOf("--limit") + 1] : null);
const MAX_RACE_LIMIT = limitArg ? parseInt(limitArg, 10) : Infinity;
const yearArg = process.argv.find((a) => a.startsWith("--year="))?.split("=")[1];
const TARGET_YEARS = yearArg ? [parseInt(yearArg, 10)] : [2023, 2024, 2025];

if (DRY_RUN) console.log("[dry-run] DBを更新しません");
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
  const fukushoMap = {}; // horseNum → returnAmount

  // pay_block テーブルから複勝を探す
  const payBlockMatch = html.match(
    /<table[^>]+class=["'][^"']*pay_block[^"']*["'][^>]*>([\s\S]*?)<\/table>/i
  );
  if (payBlockMatch) {
    const rows = payBlockMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];
    for (const row of rows) {
      if (/複勝/.test(row)) {
        const numMatches = row.match(/(\d+)番/g) ?? [];
        const amtMatches = row.match(/[¥￥]?([\d,]+)円?/g) ?? [];
        for (let i = 0; i < numMatches.length; i++) {
          const num = parseInt(numMatches[i].replace("番", ""), 10);
          if (i < amtMatches.length) {
            const amt = parseInt(amtMatches[i].replace(/[¥￥,円]/g, ""), 10);
            if (amt >= 100) fukushoMap[num] = amt;
          }
        }
        break;
      }
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

      // 単勝オッズ（10列目前後）
      let tanshOdds = null;
      if (tds.length >= 10) {
        const oddsText = getText(tds[9]);
        if (/[\d.]+/.test(oddsText)) tanshOdds = parseFloat(oddsText);
      }

      horses.push({
        horseNum,
        horseName: nameText,
        actualPos,
        tanshOdds,
        fukushoReturn: fukushoMap[horseNum] || 0,
      });
    }
  }

  if (horses.length === 0) return null;

  return { raceName, raceDate, horses };
}

// ── DB: 既存race_idを確認（重複挿入防止） ──────────────────────────────────
async function getExistingRaceIds(client, raceIds) {
  if (raceIds.length === 0) return new Set();
  const res = await client.query(
    `SELECT DISTINCT race_id FROM keiba_prediction_logs WHERE race_id = ANY($1)`,
    [raceIds]
  );
  return new Set(res.rows.map((r) => r.race_id));
}

// ── DB: レース結果を一括挿入 ────────────────────────────────────────────────
async function insertRaceResults(client, raceId, raceName, raceDate, horses) {
  if (horses.length === 0) return 0;

  // 複勝圏内（3着以内）のみ買い推奨として挿入（バックテスト用）
  // 全馬挿入して、実際の着順から hit を決定する
  const values = horses.map((h) => {
    const hit = h.actualPos > 0 ? h.actualPos <= 3 : h.fukushoReturn > 0;
    return [
      raceId,
      raceName,
      raceDate,
      "buy",          // 全馬をbuyとして記録
      h.horseNum,
      h.horseName,
      null,           // ev（期待値）は後続解析で計算
      h.tanshOdds,    // odds
      null,           // confidence
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
