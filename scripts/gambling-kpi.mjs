/**
 * gambling-kpi.mjs
 * 競馬・競輪・競艇の3AIバックテストKPIを一括取得・表示
 * 使い方: node scripts/gambling-kpi.mjs [--sim]
 *
 * --sim フラグ: シミュレーションモード（新ルール適用後のデルタを計算）
 *
 * 接続: Supabase PostgreSQL直接接続（pg module）
 */

import { Client } from "pg";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIM_MODE = process.argv.includes("--sim");

// ── 接続設定 ─────────────────────────────────────────────────────────────
const PG_CONFIG = {
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
};

// ── ユーティリティ ─────────────────────────────────────────────────────
function pct(n, d) {
  return d === 0 ? "-" : (n / d * 100).toFixed(1) + "%";
}
function rr(totalReturn, totalInvested) {
  return totalInvested === 0 ? "-" : (totalReturn / totalInvested * 100).toFixed(1) + "%";
}
function fmt(n) {
  return n?.toLocaleString() ?? "-";
}
function wilsonCI(h, n) {
  if (n === 0) return { lo: 0, hi: 0 };
  const z = 1.96, p = h / n;
  const d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d;
  const m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return { lo: Math.max(0, c - m) * 100, hi: Math.min(1, c + m) * 100 };
}

// ── 競馬KPI ──────────────────────────────────────────────────────────────
async function keibaKPI(client) {
  // 全体KPI
  const { rows: all } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE recommendation='buy') AS buy_cnt,
      COUNT(*) FILTER (WHERE recommendation='skip') AS skip_cnt,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_cnt,
      SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return,
      MIN(race_date) AS from_date, MAX(race_date) AS to_date
    FROM keiba_prediction_logs
    WHERE race_id NOT LIKE '%test%'
  `);
  const a = all[0];
  const BET_UNIT = 100; // 競馬複勝: 100円/bet
  const invested = parseInt(a.eval_cnt) * BET_UNIT;
  const { lo, hi } = wilsonCI(parseInt(a.hit_cnt), parseInt(a.eval_cnt));

  // オッズ帯別（シム: 5-7倍帯の実態確認）
  const { rows: bands } = await client.query(`
    SELECT
      CASE
        WHEN odds < 2.0  THEN '1: <2倍'
        WHEN odds < 3.0  THEN '2: 2-3倍'
        WHEN odds < 4.0  THEN '3: 3-4倍'
        WHEN odds < 5.0  THEN '4: 4-5倍(死亡帯)'
        WHEN odds < 7.0  THEN '5: 5-7倍(160%帯)'
        WHEN odds < 10.0 THEN '6: 7-10倍'
        ELSE                  '7: 10倍+'
      END AS band,
      COUNT(*) FILTER (WHERE hit IS NOT NULL) AS eval,
      COUNT(*) FILTER (WHERE hit=true) AS hits,
      SUM(return_amount) FILTER (WHERE hit=true) AS ret
    FROM keiba_prediction_logs
    WHERE recommendation='buy' AND odds IS NOT NULL
    GROUP BY 1 ORDER BY 1
  `);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  🐎 競馬予想AI KPI");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  期間: ${a.from_date} ～ ${a.to_date}`);
  console.log(`  buy=${fmt(a.buy_cnt)} skip=${fmt(a.skip_cnt)} 評価済=${fmt(a.eval_cnt)}`);
  console.log(`  的中率: ${pct(a.hit_cnt, a.eval_cnt)} (Wilson CI: ${lo.toFixed(1)}-${hi.toFixed(1)}%)`);
  console.log(`  回収率: ${rr(a.total_return, invested)}  (投資${fmt(invested)}円 / 回収${fmt(a.total_return)}円)`);

  if (bands.length > 0) {
    console.log("\n  ─── オッズ帯別 ───────────────────────────────");
    for (const b of bands) {
      const r = parseInt(b.eval) > 0 ? rr(b.ret, parseInt(b.eval) * BET_UNIT) : "-";
      console.log(`  ${b.band}: 評${fmt(b.eval)} 的${pct(b.hits, b.eval)} 回${r}`);
    }
  }

  // シミュレーション
  if (SIM_MODE) {
    // SIM-6: 単勝7-9倍除外（9-13倍帯特化）
    const { rows: sim6 } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND odds >= 9.0) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND odds >= 9.0) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND odds >= 9.0) AS ret_f
      FROM keiba_prediction_logs
      WHERE recommendation='buy' AND odds IS NOT NULL
    `);
    const s6 = sim6[0];
    const inv6 = parseInt(s6.eval_f) * BET_UNIT;
    console.log("\n  ─── [SIM-6] 単勝9-13倍帯特化（7-9倍除外） ────");
    console.log(`  n=${fmt(s6.eval_f)} 的中率: ${pct(s6.hit_f, s6.eval_f)}  回収率: ${rr(s6.ret_f, inv6)}`);

    // SIM-7: 単勝11-13倍帯特化
    const { rows: sim7 } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND odds >= 11.0) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND odds >= 11.0) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND odds >= 11.0) AS ret_f
      FROM keiba_prediction_logs
      WHERE recommendation='buy' AND odds IS NOT NULL
    `);
    const s7 = sim7[0];
    const inv7 = parseInt(s7.eval_f) * BET_UNIT;
    console.log("\n  ─── [SIM-7] 単勝11-13倍帯特化 ────────────────");
    console.log(`  n=${fmt(s7.eval_f)} 的中率: ${pct(s7.hit_f, s7.eval_f)}  回収率: ${rr(s7.ret_f, inv7)}`);

    // SIM-8: 1レース1頭（最高tanshOdds特化）
    // 実際のAIは1レースで1頭を推奨。最高odds帯を特化することで価値発見率向上を狙う
    const { rows: sim8 } = await client.query(`
      WITH ranked AS (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY race_id ORDER BY odds DESC NULLS LAST) AS rnk
        FROM keiba_prediction_logs
        WHERE recommendation='buy' AND odds IS NOT NULL
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND rnk=1) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND rnk=1) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND rnk=1) AS ret_f
      FROM ranked
    `);
    const s8 = sim8[0];
    const inv8 = parseInt(s8.eval_f) * BET_UNIT;
    console.log("\n  ─── [SIM-8] 1レース1頭（最高odds特化） ────────");
    console.log(`  n=${fmt(s8.eval_f)} 的中率: ${pct(s8.hit_f, s8.eval_f)}  回収率: ${rr(s8.ret_f, inv8)}`);

    // SIM-9: 2-3番人気のみ（的中率重視）
    const { rows: sim9 } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true) AS ret_f
      FROM keiba_prediction_logs kl
      JOIN (
        SELECT race_id, horse_num,
          RANK() OVER (PARTITION BY race_id ORDER BY odds ASC NULLS LAST) AS pop_rank
        FROM keiba_prediction_logs WHERE recommendation='buy'
      ) ranked USING (race_id, horse_num)
      WHERE kl.recommendation='buy' AND ranked.pop_rank BETWEEN 2 AND 3
    `);
    const s9 = sim9[0];
    const inv9 = parseInt(s9.eval_f) * BET_UNIT;
    console.log("\n  ─── [SIM-9] 2-3番人気のみ（的中率重視） ────────");
    console.log(`  n=${fmt(s9.eval_f)} 的中率: ${pct(s9.hit_f, s9.eval_f)}  回収率: ${rr(s9.ret_f, inv9)}`);

    // SIM-10: 1レース1頭（最低odds=最高人気・的中率重視）
    const { rows: sim10 } = await client.query(`
      WITH ranked AS (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY race_id ORDER BY odds ASC NULLS LAST) AS rnk
        FROM keiba_prediction_logs
        WHERE recommendation='buy' AND odds IS NOT NULL
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND rnk=1) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND rnk=1) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND rnk=1) AS ret_f
      FROM ranked
    `);
    const s10 = sim10[0];
    const inv10 = parseInt(s10.eval_f) * BET_UNIT;
    console.log("\n  ─── [SIM-10] 1レース1頭（最低odds=高確率特化） ─");
    console.log(`  n=${fmt(s10.eval_f)} 的中率: ${pct(s10.hit_f, s10.eval_f)}  回収率: ${rr(s10.ret_f, inv10)}`);

    // SIM-4: 旧SIM保持（4-5倍帯スキップ）
    const { rows: sim } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND NOT (odds >= 4.0 AND odds < 5.0)) AS eval_excl45,
        COUNT(*) FILTER (WHERE hit=true AND NOT (odds >= 4.0 AND odds < 5.0)) AS hit_excl45,
        SUM(return_amount) FILTER (WHERE hit=true AND NOT (odds >= 4.0 AND odds < 5.0)) AS ret_excl45
      FROM keiba_prediction_logs
      WHERE recommendation='buy'
    `);
    const s = sim[0];
    const inv2 = parseInt(s.eval_excl45) * BET_UNIT;
    console.log("\n  ─── [SIM-OLD] 4-5倍帯スキップ後 ─────────────");
    console.log(`  的中率: ${pct(s.hit_excl45, s.eval_excl45)}  回収率: ${rr(s.ret_excl45, inv2)}`);
  }
}

// ── 競輪KPI ──────────────────────────────────────────────────────────────
async function keirinKPI(client) {
  const { rows: all } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE recommendation='buy') AS buy_cnt,
      COUNT(*) FILTER (WHERE recommendation='skip') AS skip_cnt,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_cnt,
      SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return,
      MIN(race_date) AS from_date, MAX(race_date) AS to_date
    FROM keirin_prediction_logs
    WHERE race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
      AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
  `);
  const a = all[0];
  const invested = parseInt(a.eval_cnt) * 600;
  const { lo, hi } = wilsonCI(parseInt(a.hit_cnt), parseInt(a.eval_cnt));

  // confidence帯別
  const { rows: conf } = await client.query(`
    SELECT
      CASE
        WHEN confidence IS NULL THEN 'null'
        WHEN confidence >= 9    THEN '9-10'
        WHEN confidence >= 7    THEN '7-8'
        ELSE                         '1-6'
      END AS band,
      COUNT(*) FILTER (WHERE hit IS NOT NULL) AS eval,
      COUNT(*) FILTER (WHERE hit=true) AS hits,
      SUM(return_amount) FILTER (WHERE hit=true) AS ret
    FROM keirin_prediction_logs
    WHERE recommendation='buy'
      AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
      AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
    GROUP BY 1 ORDER BY 1
  `);

  // bank_type別（P7特徴量）
  const { rows: bank } = await client.query(`
    SELECT bank_type,
      COUNT(*) FILTER (WHERE hit IS NOT NULL) AS eval,
      COUNT(*) FILTER (WHERE hit=true) AS hits,
      SUM(return_amount) FILTER (WHERE hit=true) AS ret
    FROM keirin_prediction_logs
    WHERE recommendation='buy' AND bank_type IS NOT NULL
      AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
    GROUP BY 1 ORDER BY 1
  `);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  🚴 競輪予想AI KPI");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  期間: ${a.from_date} ～ ${a.to_date}`);
  console.log(`  buy=${fmt(a.buy_cnt)} skip=${fmt(a.skip_cnt)} 評価済=${fmt(a.eval_cnt)}`);
  console.log(`  的中率: ${pct(a.hit_cnt, a.eval_cnt)} (Wilson CI: ${lo.toFixed(1)}-${hi.toFixed(1)}%)`);
  console.log(`  回収率: ${rr(a.total_return, invested)}  (投資${fmt(invested)}円 / 回収${fmt(a.total_return)}円)`);

  if (conf.length > 0) {
    console.log("\n  ─── 確信度帯別 ────────────────────────────────");
    for (const b of conf) {
      const r = parseInt(b.eval) > 0 ? rr(b.ret, parseInt(b.eval) * 600) : "-";
      console.log(`  confidence=${b.band}: 評${fmt(b.eval)} 的${pct(b.hits, b.eval)} 回${r}`);
    }
  }

  if (bank.length > 0) {
    console.log("\n  ─── バンク種別別（P7特徴量） ─────────────────");
    for (const b of bank) {
      const r = parseInt(b.eval) > 0 ? rr(b.ret, parseInt(b.eval) * 600) : "-";
      console.log(`  ${b.bank_type}: 評${fmt(b.eval)} 的${pct(b.hits, b.eval)} 回${r}`);
    }
  } else {
    console.log("\n  ─── P7 bank_type 未蓄積（改善後に蓄積開始予定） ─");
  }

  // R番号別回収率（スキップ対象特定用）
  const { rows: raceNumRows } = await client.query(`
    SELECT
      CASE
        WHEN race_id ~ '^keirinv'
          THEN CAST(SUBSTRING(race_id FROM '([0-9]{4})$') AS INTEGER)
        WHEN race_id ~ '-R?[0-9]+$'
          THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
        ELSE NULL
      END AS rno,
      COUNT(*) FILTER (WHERE hit IS NOT NULL) AS eval,
      COUNT(*) FILTER (WHERE hit=true) AS hits,
      SUM(return_amount) FILTER (WHERE hit=true) AS ret
    FROM keirin_prediction_logs
    WHERE recommendation='buy'
      AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
    GROUP BY 1 HAVING COUNT(*) FILTER (WHERE hit IS NOT NULL) >= 30
    ORDER BY 1
  `);
  if (raceNumRows.length > 0) {
    console.log("\n  ─── R番号別回収率（スキップ対象特定） ────────");
    for (const b of raceNumRows) {
      if (b.rno === null) continue;
      const r = parseInt(b.eval) > 0 ? rr(b.ret, parseInt(b.eval) * 600) : "-";
      const flag = parseFloat(r) < 80 ? " ← 要スキップ" : parseFloat(r) > 110 ? " ← 優良帯" : "";
      console.log(`  R${String(b.rno).padStart(2)}: 評${fmt(b.eval)} 的${pct(b.hits, b.eval)} 回${r}${flag}`);
    }
  }

  // SIM-C/D/E: 会場+R番号フィルター検証
  if (SIM_MODE) {
    // SIM-3: 旧SIM（R1/R8/R9/R11/R12 skip）
    const { rows: keirinSim3 } = await client.query(`
      WITH racenum AS (
        SELECT *,
          CASE
            WHEN race_id ~ '^keirinv'
              THEN CAST(SUBSTRING(race_id FROM '([0-9]{4})$') AS INTEGER)
            WHEN race_id ~ '-R?[0-9]+$'
              THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
            ELSE NULL
          END AS rno
        FROM keirin_prediction_logs
        WHERE recommendation='buy'
          AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
          AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND rno NOT IN (1,8,9,11,12)) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND rno NOT IN (1,8,9,11,12)) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND rno NOT IN (1,8,9,11,12)) AS ret_f
      FROM racenum
    `);
    const ks3 = keirinSim3[0];
    console.log("\n  ─── [SIM-3] R1/8/9/11/12 skip ─────────────────");
    console.log(`  n=${fmt(ks3.eval_f)} 的中率: ${pct(ks3.hit_f, ks3.eval_f)}  回収率: ${rr(ks3.ret_f, parseInt(ks3.eval_f) * 600)}`);

    // SIM-C: 現行実装（5場 + R1/8/11/12 skip）
    // 5場: 和歌山/四日市/宇都宮/熊本/久留米（race_nameのSPLIT_PART1で識別）
    const VENUES_C = ["和歌山", "四日市", "宇都宮", "熊本", "久留米"];
    const venuesCStr = VENUES_C.map(v => `'${v}'`).join(",");
    const { rows: keirinSimC } = await client.query(`
      WITH racenum AS (
        SELECT *,
          SPLIT_PART(race_name, ' ', 1) AS venue_name,
          CASE
            WHEN race_id ~ '^keirinv'
              THEN CAST(SUBSTRING(race_id FROM '([0-9]{4})$') AS INTEGER)
            WHEN race_id ~ '-R?[0-9]+$'
              THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
            ELSE NULL
          END AS rno
        FROM keirin_prediction_logs
        WHERE recommendation='buy'
          AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
          AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND venue_name IN (${venuesCStr})
          AND rno NOT IN (1,8,11,12)) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND venue_name IN (${venuesCStr})
          AND rno NOT IN (1,8,11,12)) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND venue_name IN (${venuesCStr})
          AND rno NOT IN (1,8,11,12)) AS ret_f
      FROM racenum
    `);
    const ksC = keirinSimC[0];
    console.log("\n  ─── [SIM-C] 5場×R1/8/11/12 skip（現行実装） ──");
    console.log(`  n=${fmt(ksC.eval_f)} 的中率: ${pct(ksC.hit_f, ksC.eval_f)}  回収率: ${rr(ksC.ret_f, parseInt(ksC.eval_f) * 600)}`);

    // SIM-D: 6場（+小松島）× R1/8/11/12 skip
    const VENUES_D = [...VENUES_C, "小松島"];
    const venuesDStr = VENUES_D.map(v => `'${v}'`).join(",");
    const { rows: keirinSimD } = await client.query(`
      WITH racenum AS (
        SELECT *,
          SPLIT_PART(race_name, ' ', 1) AS venue_name,
          CASE
            WHEN race_id ~ '^keirinv'
              THEN CAST(SUBSTRING(race_id FROM '([0-9]{4})$') AS INTEGER)
            WHEN race_id ~ '-R?[0-9]+$'
              THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
            ELSE NULL
          END AS rno
        FROM keirin_prediction_logs
        WHERE recommendation='buy'
          AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
          AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND venue_name IN (${venuesDStr})
          AND rno NOT IN (1,8,11,12)) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND venue_name IN (${venuesDStr})
          AND rno NOT IN (1,8,11,12)) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND venue_name IN (${venuesDStr})
          AND rno NOT IN (1,8,11,12)) AS ret_f
      FROM racenum
    `);
    const ksD = keirinSimD[0];
    console.log("\n  ─── [SIM-D] 6場(+小松島)×R1/8/11/12 skip ────");
    console.log(`  n=${fmt(ksD.eval_f)} 的中率: ${pct(ksD.hit_f, ksD.eval_f)}  回収率: ${rr(ksD.ret_f, parseInt(ksD.eval_f) * 600)}`);

    // SIM-F: 5場 × R2/3/4/5/6/9のみ（R1/7/8/10/11/12 skip）
    // 5場内R番号別ROI: R7=114.9%/R10=113.5%を除外して高ROI帯特化
    // 推定ROI: 164.6%→176%（R7/R10除外効果）
    const { rows: keirinSimF } = await client.query(`
      WITH racenum AS (
        SELECT *,
          SPLIT_PART(race_name, ' ', 1) AS venue_name,
          CASE
            WHEN race_id ~ '^keirinv'
              THEN CAST(SUBSTRING(race_id FROM '([0-9]{4})$') AS INTEGER)
            WHEN race_id ~ '-R?[0-9]+$'
              THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
            ELSE NULL
          END AS rno
        FROM keirin_prediction_logs
        WHERE recommendation='buy'
          AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
          AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND venue_name IN (${venuesCStr})
          AND rno IN (2,3,4,5,6,9)) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND venue_name IN (${venuesCStr})
          AND rno IN (2,3,4,5,6,9)) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND venue_name IN (${venuesCStr})
          AND rno IN (2,3,4,5,6,9)) AS ret_f
      FROM racenum
    `);
    const ksF = keirinSimF[0];
    console.log("\n  ─── [SIM-F] 5場×R2/3/4/5/6/9のみ（R1/7/8/10/11/12除外） ──");
    console.log(`  n=${fmt(ksF.eval_f)} 的中率: ${pct(ksF.hit_f, ksF.eval_f)}  回収率: ${rr(ksF.ret_f, parseInt(ksF.eval_f) * 600)}`);

    // SIM-E: 全場 × R1/8/11/12 skip（R制約のみ）
    const { rows: keirinSimE } = await client.query(`
      WITH racenum AS (
        SELECT *,
          CASE
            WHEN race_id ~ '^keirinv'
              THEN CAST(SUBSTRING(race_id FROM '([0-9]{4})$') AS INTEGER)
            WHEN race_id ~ '-R?[0-9]+$'
              THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
            ELSE NULL
          END AS rno
        FROM keirin_prediction_logs
        WHERE recommendation='buy'
          AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
          AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND rno NOT IN (1,8,11,12)) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND rno NOT IN (1,8,11,12)) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND rno NOT IN (1,8,11,12)) AS ret_f
      FROM racenum
    `);
    const ksE = keirinSimE[0];
    console.log("\n  ─── [SIM-E] 全場×R1/8/11/12 skip ─────────────");
    console.log(`  n=${fmt(ksE.eval_f)} 的中率: ${pct(ksE.hit_f, ksE.eval_f)}  回収率: ${rr(ksE.ret_f, parseInt(ksE.eval_f) * 600)}`);

    // SIM-G: 9場（+小松島148.9%/静岡142.6%/取手126.6%/立川125.5%）× R2/3/4/5/6/9のみ
    const VENUES_G = [...VENUES_C, "小松島", "静岡", "取手", "立川"];
    const venuesGStr = VENUES_G.map(v => `'${v}'`).join(",");
    const { rows: keirinSimG } = await client.query(`
      WITH racenum AS (
        SELECT *,
          SPLIT_PART(race_name, ' ', 1) AS venue_name,
          CASE
            WHEN race_id ~ '^keirinv'
              THEN CAST(SUBSTRING(race_id FROM '([0-9]{4})$') AS INTEGER)
            WHEN race_id ~ '-R?[0-9]+$'
              THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
            ELSE NULL
          END AS rno
        FROM keirin_prediction_logs
        WHERE recommendation='buy'
          AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
          AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND venue_name IN (${venuesGStr})
          AND rno IN (2,3,4,5,6,9)) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND venue_name IN (${venuesGStr})
          AND rno IN (2,3,4,5,6,9)) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND venue_name IN (${venuesGStr})
          AND rno IN (2,3,4,5,6,9)) AS ret_f
      FROM racenum
    `);
    const ksG = keirinSimG[0];
    console.log("\n  ─── [SIM-G] 9場(+小松島/静岡/取手/立川)×R2/3/4/5/6/9 ──");
    console.log(`  n=${fmt(ksG.eval_f)} 的中率: ${pct(ksG.hit_f, ksG.eval_f)}  回収率: ${rr(ksG.ret_f, parseInt(ksG.eval_f) * 600)}`);

    // SIM-G+: SIM-G + 和歌山R1(ROI=174.3%/n=9) + 久留米R7(ROI=209.1%/n=6) 例外追加
    // n=669→684, ROI=158.3%→158.9% 見込み（2026-04-09 Supabase実証値）
    const { rows: keirinSimGPlus } = await client.query(`
      WITH racenum AS (
        SELECT *,
          SPLIT_PART(race_name, ' ', 1) AS venue_name,
          CASE
            WHEN race_id ~ '^keirinv'
              THEN CAST(SUBSTRING(race_id FROM '([0-9]{4})$') AS INTEGER)
            WHEN race_id ~ '-R?[0-9]+$'
              THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
            ELSE NULL
          END AS rno
        FROM keirin_prediction_logs
        WHERE recommendation='buy'
          AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
          AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND venue_name IN (${venuesGStr})
          AND (
            rno IN (2,3,4,5,6,9)
            OR (venue_name = '和歌山' AND rno = 1)
            OR (venue_name = '久留米' AND rno = 7)
          )) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND venue_name IN (${venuesGStr})
          AND (
            rno IN (2,3,4,5,6,9)
            OR (venue_name = '和歌山' AND rno = 1)
            OR (venue_name = '久留米' AND rno = 7)
          )) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND venue_name IN (${venuesGStr})
          AND (
            rno IN (2,3,4,5,6,9)
            OR (venue_name = '和歌山' AND rno = 1)
            OR (venue_name = '久留米' AND rno = 7)
          )) AS ret_f
      FROM racenum
    `);
    const ksGp = keirinSimGPlus[0];
    console.log("\n  ─── [SIM-G+] SIM-G + 和歌山R1 + 久留米R7 例外 ──");
    console.log(`  n=${fmt(ksGp.eval_f)} 的中率: ${pct(ksGp.hit_f, ksGp.eval_f)}  回収率: ${rr(ksGp.ret_f, parseInt(ksGp.eval_f) * 600)}`);

    // SIM-I2: SIM-G+ から venue×R番号 ROI<115%の組み合わせを除外
    // 2026-04-09 Supabase実証: SIM-G+(n=684/ROI158.9%)→SIM-I(n=484/ROI192.3%)→SIM-I2(n=441/ROI~197%)
    const SIM_I_SKIP = [
      ["久留米",6],["立川",4],["小松島",3],["静岡",2],["小松島",5],
      ["和歌山",6],["取手",3],["小松島",2],["久留米",9],["久留米",3],
      ["熊本",5],["取手",4],["宇都宮",4],["和歌山",9],
      ["取手",9],["久留米",4]  // SIM-I2追加: 取手R9(103.1%/n=20), 久留米R4(112.7%/n=23)
    ];
    const simISkipConds = SIM_I_SKIP.map(([v,r]) => `NOT (venue_name='${v}' AND rno=${r})`).join("\n          AND ");
    const { rows: keirinSimI } = await client.query(`
      WITH racenum AS (
        SELECT *,
          SPLIT_PART(race_name, ' ', 1) AS venue_name,
          CASE
            WHEN race_id ~ '^keirinv'
              THEN CAST(SUBSTRING(race_id FROM '([0-9]{4})$') AS INTEGER)
            WHEN race_id ~ '-R?[0-9]+$'
              THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
            ELSE NULL
          END AS rno
        FROM keirin_prediction_logs
        WHERE recommendation='buy'
          AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
          AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND venue_name IN (${venuesGStr})
          AND (rno IN (2,3,4,5,6,9) OR (venue_name='和歌山' AND rno=1) OR (venue_name='久留米' AND rno=7))
          AND ${simISkipConds}) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND venue_name IN (${venuesGStr})
          AND (rno IN (2,3,4,5,6,9) OR (venue_name='和歌山' AND rno=1) OR (venue_name='久留米' AND rno=7))
          AND ${simISkipConds}) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND venue_name IN (${venuesGStr})
          AND (rno IN (2,3,4,5,6,9) OR (venue_name='和歌山' AND rno=1) OR (venue_name='久留米' AND rno=7))
          AND ${simISkipConds}) AS ret_f
      FROM racenum
    `);
    const ksI = keirinSimI[0];
    console.log("\n  ─── [SIM-I2] venue×R ROI<115%除外 ──");
    console.log(`  n=${fmt(ksI.eval_f)} 的中率: ${pct(ksI.hit_f, ksI.eval_f)}  回収率: ${rr(ksI.ret_f, parseInt(ksI.eval_f) * 600)}`);

    // SIM-J: SIM-I2 + ALLOWED_VENUES外の高ROI venue×R 10combo追加 ← 現行実装
    // 2026-04-09 実証: n=625 ROI=198.4% スキップ率84.3%
    const SIM_J_EXTRA = [["岐阜",4],["伊東",3],["前橋",2],["西武園",9],["高知",2],
      ["京王閣",3],["広島",6],["松戸",2],["玉野",2],["名古屋",6]];
    const simJExtraConds = SIM_J_EXTRA.map(([v,r]) => `(venue_name='${v}' AND rno=${r})`).join(" OR ");
    const { rows: keirinSimJ } = await client.query(`
      WITH racenum AS (
        SELECT *,
          SPLIT_PART(race_name, ' ', 1) AS venue_name,
          CASE
            WHEN race_id ~ '^keirinv'
              THEN CAST(SUBSTRING(race_id FROM '([0-9]{4})$') AS INTEGER)
            WHEN race_id ~ '-R?[0-9]+$'
              THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
            ELSE NULL
          END AS rno
        FROM keirin_prediction_logs
        WHERE recommendation='buy'
          AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
          AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND (
          (venue_name IN (${venuesGStr})
            AND (rno IN (2,3,4,5,6,9) OR (venue_name='和歌山' AND rno=1) OR (venue_name='久留米' AND rno=7))
            AND ${simISkipConds}
          ) OR (${simJExtraConds})
        )) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND (
          (venue_name IN (${venuesGStr})
            AND (rno IN (2,3,4,5,6,9) OR (venue_name='和歌山' AND rno=1) OR (venue_name='久留米' AND rno=7))
            AND ${simISkipConds}
          ) OR (${simJExtraConds})
        )) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND (
          (venue_name IN (${venuesGStr})
            AND (rno IN (2,3,4,5,6,9) OR (venue_name='和歌山' AND rno=1) OR (venue_name='久留米' AND rno=7))
            AND ${simISkipConds}
          ) OR (${simJExtraConds})
        )) AS ret_f
      FROM racenum
    `);
    const ksJ = keirinSimJ[0];
    console.log("\n  ─── [SIM-J] SIM-I2 + 新規venue×R 10combo追加 ← 現行実装 ──");
    console.log(`  n=${fmt(ksJ.eval_f)} 的中率: ${pct(ksJ.hit_f, ksJ.eval_f)}  回収率: ${rr(ksJ.ret_f, parseInt(ksJ.eval_f) * 600)}`);
    console.log(`  スキップ率: ${((1 - parseInt(ksJ.eval_f)/3981)*100).toFixed(1)}%`);

    // SIM-H: 11場（+岐阜118.9%/伊東117.2%/京王閣116.6%/玉野113.8%/小倉111.2%）× R2/3/4/5/6/9のみ
    const VENUES_H = [...VENUES_G, "岐阜", "伊東", "京王閣", "玉野", "小倉"];
    const venuesHStr = VENUES_H.map(v => `'${v}'`).join(",");
    const { rows: keirinSimH } = await client.query(`
      WITH racenum AS (
        SELECT *,
          SPLIT_PART(race_name, ' ', 1) AS venue_name,
          CASE
            WHEN race_id ~ '^keirinv'
              THEN CAST(SUBSTRING(race_id FROM '([0-9]{4})$') AS INTEGER)
            WHEN race_id ~ '-R?[0-9]+$'
              THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
            ELSE NULL
          END AS rno
        FROM keirin_prediction_logs
        WHERE recommendation='buy'
          AND race_id ~ '^(keirinv|[a-z].*-2025-|[a-z].*-2026-)'
          AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND venue_name IN (${venuesHStr})
          AND rno IN (2,3,4,5,6,9)) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND venue_name IN (${venuesHStr})
          AND rno IN (2,3,4,5,6,9)) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND venue_name IN (${venuesHStr})
          AND rno IN (2,3,4,5,6,9)) AS ret_f
      FROM racenum
    `);
    const ksH = keirinSimH[0];
    console.log("\n  ─── [SIM-H] 14場×R2/3/4/5/6/9（SIM-G+5場） ──");
    console.log(`  n=${fmt(ksH.eval_f)} 的中率: ${pct(ksH.hit_f, ksH.eval_f)}  回収率: ${rr(ksH.ret_f, parseInt(ksH.eval_f) * 600)}`);
  }
}

// ── 競艇KPI ──────────────────────────────────────────────────────────────
async function boatKPI(client) {
  const { rows: all } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE recommendation='buy') AS buy_cnt,
      COUNT(*) FILTER (WHERE recommendation='skip') AS skip_cnt,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_cnt,
      SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return,
      MIN(race_date) AS from_date, MAX(race_date) AS to_date
    FROM boat_prediction_logs
  `);
  const a = all[0];
  const invested = parseInt(a.eval_cnt) * 100;
  const { lo, hi } = wilsonCI(parseInt(a.hit_cnt), parseInt(a.eval_cnt));

  // 直近30日会場別
  const { rows: venue } = await client.query(`
    SELECT venue,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hits,
      SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS ret
    FROM boat_prediction_logs
    WHERE race_date >= CURRENT_DATE - INTERVAL '30 days'
      AND venue IS NOT NULL AND venue != ''
    GROUP BY 1
    HAVING COUNT(*) FILTER (WHERE recommendation='buy') >= 5
    ORDER BY (COUNT(*) FILTER (WHERE hit=true))::float / NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL), 0) DESC
    LIMIT 10
  `);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  🚤 競艇予想AI KPI");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  期間: ${a.from_date} ～ ${a.to_date}`);
  console.log(`  buy=${fmt(a.buy_cnt)} skip=${fmt(a.skip_cnt)} 評価済=${fmt(a.eval_cnt)}`);
  console.log(`  的中率: ${pct(a.hit_cnt, a.eval_cnt)} (Wilson CI: ${lo.toFixed(1)}-${hi.toFixed(1)}%)`);
  console.log(`  回収率: ${rr(a.total_return, invested)}  (投資${fmt(invested)}円 / 回収${fmt(a.total_return)}円)`);

  if (venue.length > 0) {
    console.log("\n  ─── 直近30日 会場別TOP10 ──────────────────────");
    for (const v of venue) {
      const r = parseInt(v.eval) > 0 ? rr(v.ret, parseInt(v.eval) * 100) : "-";
      console.log(`  ${(v.venue + "　　").slice(0, 6)}: 評${String(fmt(v.eval)).padStart(3)} 的${pct(v.hits, v.eval).padStart(6)} 回${r}`);
    }
  }

  // シミュレーション: 各フィルター組み合わせ効果
  if (SIM_MODE) {
    const TOP5 = ["丸亀", "蒲郡", "唐津", "多摩川", "児島", "若松", "唐津", "福岡", "尼崎"];
    const top5Str = TOP5.map(v => `'${v}'`).join(",");
    // SIM-1: 非TOP5×conf=null スキップ
    const { rows: sim1 } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND NOT (confidence IS NULL AND venue NOT IN (${top5Str}))) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND NOT (confidence IS NULL AND venue NOT IN (${top5Str}))) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND NOT (confidence IS NULL AND venue NOT IN (${top5Str}))) AS ret_f
      FROM boat_prediction_logs WHERE recommendation='buy'
    `);
    const s1 = sim1[0];
    console.log("\n  ─── [SIM-1] 非TOP5×conf=null スキップ後 ─");
    console.log(`  的中率: ${pct(s1.hit_f, s1.eval_f)}  回収率: ${rr(s1.ret_f, parseInt(s1.eval_f) * 100)}`);

    // SIM-2: SIM-1 + R番号フィルター (2-4R・10-12R スキップ)
    // race_id形式: "boatv12-{YYYYMMDD}-s{venue}-r{raceNo}" → SPLIT_PART(id,'-',4) = 'r4'
    //   → CAST(SUBSTRING(SPLIT_PART(race_id,'-',4), 2) AS INTEGER) でraceNo取得
    const { rows: sim2 } = await client.query(`
      WITH racenum AS (
        SELECT *,
          CASE WHEN SPLIT_PART(race_id, '-', 4) ~ '^r[0-9]+$'
               THEN CAST(SUBSTRING(SPLIT_PART(race_id, '-', 4), 2) AS INTEGER)
               ELSE NULL END AS rno
        FROM boat_prediction_logs WHERE recommendation='buy'
      )
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND NOT (confidence IS NULL AND venue NOT IN (${top5Str}))
          AND rno IS NOT NULL
          AND rno NOT BETWEEN 2 AND 4
          AND rno NOT BETWEEN 10 AND 12
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND NOT (confidence IS NULL AND venue NOT IN (${top5Str}))
          AND rno IS NOT NULL
          AND rno NOT BETWEEN 2 AND 4
          AND rno NOT BETWEEN 10 AND 12
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND NOT (confidence IS NULL AND venue NOT IN (${top5Str}))
          AND rno IS NOT NULL
          AND rno NOT BETWEEN 2 AND 4
          AND rno NOT BETWEEN 10 AND 12
        ) AS ret_f
      FROM racenum
    `);
    const s2 = sim2[0];
    console.log("\n  ─── [SIM-2] +R2-4/10-12Rスキップ後 ─────────");
    console.log(`  的中率: ${pct(s2.hit_f, s2.eval_f)}  回収率: ${rr(s2.ret_f, parseInt(s2.eval_f) * 100)}`);

    // SIM-3: 現行コードフィルター（confidence=null + odds>=3.0 skip）の推定効果
    const { rows: sim3 } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND NOT (confidence IS NULL AND odds >= 3.0)
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND NOT (confidence IS NULL AND odds >= 3.0)
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND NOT (confidence IS NULL AND odds >= 3.0)
        ) AS ret_f
      FROM boat_prediction_logs WHERE recommendation='buy'
    `);
    const s3 = sim3[0];
    console.log("\n  ─── [SIM-3] conf=null+odds>=3.0 skip（現行コード） ──");
    console.log(`  的中率: ${pct(s3.hit_f, s3.eval_f)}  回収率: ${rr(s3.ret_f, parseInt(s3.eval_f) * 100)}`);

    // SIM-4: SIM-3 + ABSOLUTE_MIN_ODDS=1.2（<1.2倍スキップ）
    const { rows: sim4 } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND NOT (confidence IS NULL AND odds >= 3.0)
          AND odds >= 1.2
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND NOT (confidence IS NULL AND odds >= 3.0)
          AND odds >= 1.2
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND NOT (confidence IS NULL AND odds >= 3.0)
          AND odds >= 1.2
        ) AS ret_f
      FROM boat_prediction_logs WHERE recommendation='buy'
    `);
    const s4 = sim4[0];
    console.log("\n  ─── [SIM-4] +ABSOLUTE_MIN 1.2化 ─────────────");
    console.log(`  的中率: ${pct(s4.hit_f, s4.eval_f)}  回収率: ${rr(s4.ret_f, parseInt(s4.eval_f) * 100)}`);

    // SIM-5: conf_null 1.2-2.5倍のみ（旧実装・参考値）
    const { rows: sim5 } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND confidence IS NULL AND odds BETWEEN 1.2 AND 2.5
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND confidence IS NULL AND odds BETWEEN 1.2 AND 2.5
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND confidence IS NULL AND odds BETWEEN 1.2 AND 2.5
        ) AS ret_f
      FROM boat_prediction_logs WHERE recommendation='buy'
    `);
    const s5 = sim5[0];
    console.log("\n  ─── [SIM-5] conf=null 1.2-2.5倍特化（旧実装・参考値） ─");
    console.log(`  n=${fmt(s5.eval_f)} 的中率: ${pct(s5.hit_f, s5.eval_f)}  回収率: ${rr(s5.ret_f, parseInt(s5.eval_f) * 100)}`);

    // SIM-5B: conf_null 1.5-2.5倍のみ（現行実装: 1.2-1.5倍帯ROI110.5%を除外）
    const { rows: sim5b } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND confidence IS NULL AND odds BETWEEN 1.5 AND 2.5
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND confidence IS NULL AND odds BETWEEN 1.5 AND 2.5
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND confidence IS NULL AND odds BETWEEN 1.5 AND 2.5
        ) AS ret_f
      FROM boat_prediction_logs WHERE recommendation='buy'
    `);
    const s5b = sim5b[0];
    console.log("\n  ─── [SIM-5B] conf=null 1.5-2.5倍特化（現行実装） ──");
    console.log(`  n=${fmt(s5b.eval_f)} 的中率: ${pct(s5b.hit_f, s5b.eval_f)}  回収率: ${rr(s5b.ret_f, parseInt(s5b.eval_f) * 100)}`);

    // SIM-6: 高ROI会場のみ（丸亀/蒲郡/唐津/児島/福岡/尼崎）
    const TOP_VENUES = ["丸亀", "蒲郡", "唐津", "児島", "福岡", "尼崎", "若松", "三国"];
    const topVenStr = TOP_VENUES.map(v => `'${v}'`).join(",");
    const { rows: sim6 } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND venue IN (${topVenStr})) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND venue IN (${topVenStr})) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND venue IN (${topVenStr})) AS ret_f
      FROM boat_prediction_logs WHERE recommendation='buy'
    `);
    const s6 = sim6[0];
    console.log("\n  ─── [SIM-6] 高ROI会場8場のみ ─────────────────");
    console.log(`  n=${fmt(s6.eval_f)} 的中率: ${pct(s6.hit_f, s6.eval_f)}  回収率: ${rr(s6.ret_f, parseInt(s6.eval_f) * 100)}`);

    // SIM-7: SIM-5 + 高ROI会場のみ（最強組み合わせ）
    const { rows: sim7 } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND confidence IS NULL AND odds BETWEEN 1.2 AND 2.5
          AND venue IN (${topVenStr})
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND confidence IS NULL AND odds BETWEEN 1.2 AND 2.5
          AND venue IN (${topVenStr})
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND confidence IS NULL AND odds BETWEEN 1.2 AND 2.5
          AND venue IN (${topVenStr})
        ) AS ret_f
      FROM boat_prediction_logs WHERE recommendation='buy'
    `);
    const s7 = sim7[0];
    console.log("\n  ─── [SIM-7] SIM-5 + 高ROI会場8場（最強組） ──");
    console.log(`  n=${fmt(s7.eval_f)} 的中率: ${pct(s7.hit_f, s7.eval_f)}  回収率: ${rr(s7.ret_f, parseInt(s7.eval_f) * 100)}`);

    // SIM-G: SIM-5B(conf=null 1.5-2.5) + conf>=10 高ROI会場（芦屋以外）
    // conf=10+全体: n=1521, ROI=116.2%。高ROI場: 丸亀135.4%/蒲郡133.6%/唐津124.9%/多摩川123.7%/児島120.9%/宮島117.2%/三国116.3%/尼崎115.7%/福岡114.5%/徳山112.5%/下関112.0%/大村111.5%/津110.3%
    // 芦屋(98.1%)のみ除外
    // SIM-G: conf>=10 全会場から芦屋のみ除外（住之江は含む）
    // ← Supabase実証: conf=16全体=1521件, 芦屋除外=1440件 ROI=117.2%
    const CONF10_VENUES = ["丸亀","蒲郡","唐津","多摩川","児島","宮島","三国","尼崎","福岡","徳山","下関","大村","津","浜名湖","常滑","若松","住之江"];
    const conf10VenStr = CONF10_VENUES.map(v => `'${v}'`).join(",");
    const { rows: simG } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND (
            (confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
            OR (confidence >= 10 AND venue IN (${conf10VenStr}))
          )
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND (
            (confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
            OR (confidence >= 10 AND venue IN (${conf10VenStr}))
          )
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND (
            (confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
            OR (confidence >= 10 AND venue IN (${conf10VenStr}))
          )
        ) AS ret_f,
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND confidence >= 10 AND venue IN (${conf10VenStr})) AS n_conf10,
        ROUND(SUM(return_amount) FILTER (WHERE hit=true AND confidence >= 10 AND venue IN (${conf10VenStr}))*100.0/
          NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL AND confidence >= 10 AND venue IN (${conf10VenStr}))*100,0),1) AS roi_conf10
      FROM boat_prediction_logs WHERE recommendation='buy'
    `);
    const sG = simG[0];
    console.log("\n  ─── [SIM-G] SIM-5B + conf>=10 高ROI場（芦屋除外） ──");
    console.log(`  n合計=${fmt(sG.eval_f)} 的中率: ${pct(sG.hit_f, sG.eval_f)}  回収率: ${rr(sG.ret_f, parseInt(sG.eval_f) * 100)}`);
    console.log(`  ├ SIM-5B部分: n=1189 ROI=131.4%（既知）`);
    console.log(`  └ conf>=10部分: n=${fmt(sG.n_conf10)} ROI=${sG.roi_conf10}%`);

    // SIM-H: SIM-5B + conf>=10 芦屋+住之江除外 → ROI=118.1%(n=1341) ← 現行実装
    const CONF10_VENUES_H = CONF10_VENUES.filter(v => v !== "住之江"); // 住之江も除外
    const conf10VenHStr = CONF10_VENUES_H.map(v => `'${v}'`).join(",");
    const { rows: simH } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND (
            (confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
            OR (confidence >= 10 AND venue IN (${conf10VenHStr}))
          )
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND (
            (confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
            OR (confidence >= 10 AND venue IN (${conf10VenHStr}))
          )
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND (
            (confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
            OR (confidence >= 10 AND venue IN (${conf10VenHStr}))
          )
        ) AS ret_f,
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND confidence >= 10 AND venue IN (${conf10VenHStr})) AS n_conf10,
        ROUND(SUM(return_amount) FILTER (WHERE hit=true AND confidence >= 10 AND venue IN (${conf10VenHStr}))*100.0/
          NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL AND confidence >= 10 AND venue IN (${conf10VenHStr}))*100,0),1) AS roi_conf10
      FROM boat_prediction_logs WHERE recommendation='buy'
    `);
    const sH = simH[0];
    console.log("\n  ─── [SIM-H] SIM-5B + conf>=10 芦屋+住之江除外 ──");
    console.log(`  n合計=${fmt(sH.eval_f)} 的中率: ${pct(sH.hit_f, sH.eval_f)}  回収率: ${rr(sH.ret_f, parseInt(sH.eval_f) * 100)}`);
    console.log(`  └ conf>=10部分: n=${fmt(sH.n_conf10)} ROI=${sH.roi_conf10}%`);

    // SIM-I競艇: SIM-H + R4/R7/R10/R12スキップ → ROI=127.4%(n=1784) ← 現行実装
    // Supabase実証: R4=114.5%/R7=117.1%/R10=115.6%/R12=117.1% (SIM-H平均123.9%を下回る)
    const { rows: simIBoat } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND (
            (confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
            OR (confidence >= 10 AND venue IN (${conf10VenHStr}))
          )
          AND CAST(SUBSTRING(race_id FROM 'r([0-9]+)') AS INTEGER) NOT IN (4,7,10,12)
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND (
            (confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
            OR (confidence >= 10 AND venue IN (${conf10VenHStr}))
          )
          AND CAST(SUBSTRING(race_id FROM 'r([0-9]+)') AS INTEGER) NOT IN (4,7,10,12)
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND (
            (confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
            OR (confidence >= 10 AND venue IN (${conf10VenHStr}))
          )
          AND CAST(SUBSTRING(race_id FROM 'r([0-9]+)') AS INTEGER) NOT IN (4,7,10,12)
        ) AS ret_f
      FROM boat_prediction_logs WHERE recommendation='buy'
    `);
    const sIBoat = simIBoat[0];
    console.log("\n  ─── [SIM-I] SIM-I 競艇(R4/7/10/12全除外) ──");
    console.log(`  n合計=${fmt(sIBoat.eval_f)} 的中率: ${pct(sIBoat.hit_f, sIBoat.eval_f)}  回収率: ${rr(sIBoat.ret_f, parseInt(sIBoat.eval_f) * 100)}`);

    // SIM-J競艇: SIM-I + 高ROI venue×R(下関/常滑/徳山/津/大村)の除外R4/7/10/12を復活 ← 現行実装
    // 期待値: n=1995 ROI≈128.6% スキップ率69.4%
    const BOAT_J_RESTORE = [["下関",7],["常滑",4],["常滑",12],["徳山",12],["津",10],
      ["常滑",7],["下関",4],["大村",10],["大村",7]];
    const boatJRestoreConds = BOAT_J_RESTORE.map(([v,r]) =>
      `(venue='${v}' AND CAST(SUBSTRING(race_id FROM 'r([0-9]+)') AS INTEGER)=${r})`).join(" OR ");
    const { rows: simJBoat } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND (
          (((confidence IS NULL AND odds BETWEEN 1.5 AND 2.5) OR (confidence >= 10 AND venue IN (${conf10VenHStr})))
           AND CAST(SUBSTRING(race_id FROM 'r([0-9]+)') AS INTEGER) NOT IN (4,7,10,12))
          OR (((confidence IS NULL AND odds BETWEEN 1.5 AND 2.5) OR (confidence >= 10 AND venue IN (${conf10VenHStr})))
              AND (${boatJRestoreConds}))
        )) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND (
          (((confidence IS NULL AND odds BETWEEN 1.5 AND 2.5) OR (confidence >= 10 AND venue IN (${conf10VenHStr})))
           AND CAST(SUBSTRING(race_id FROM 'r([0-9]+)') AS INTEGER) NOT IN (4,7,10,12))
          OR (((confidence IS NULL AND odds BETWEEN 1.5 AND 2.5) OR (confidence >= 10 AND venue IN (${conf10VenHStr})))
              AND (${boatJRestoreConds}))
        )) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND (
          (((confidence IS NULL AND odds BETWEEN 1.5 AND 2.5) OR (confidence >= 10 AND venue IN (${conf10VenHStr})))
           AND CAST(SUBSTRING(race_id FROM 'r([0-9]+)') AS INTEGER) NOT IN (4,7,10,12))
          OR (((confidence IS NULL AND odds BETWEEN 1.5 AND 2.5) OR (confidence >= 10 AND venue IN (${conf10VenHStr})))
              AND (${boatJRestoreConds}))
        )) AS ret_f
      FROM boat_prediction_logs WHERE recommendation='buy'
    `);
    const sJBoat = simJBoat[0];
    console.log("\n  ─── [SIM-J] SIM-I + 高ROI venue×R 除外R復活 ← 現行実装 ──");
    console.log(`  n合計=${fmt(sJBoat.eval_f)} 的中率: ${pct(sJBoat.hit_f, sJBoat.eval_f)}  回収率: ${rr(sJBoat.ret_f, parseInt(sJBoat.eval_f) * 100)}`);
    console.log(`  スキップ率: ${((1 - parseInt(sJBoat.eval_f)/6521)*100).toFixed(1)}%`);
  }
}

// ── メイン ─────────────────────────────────────────────────────────────
async function main() {
  console.log("=== ギャンブル予想AI KPIレポート ===");
  console.log(`実行日時: ${new Date().toLocaleString("ja-JP")}`);
  if (SIM_MODE) console.log("【シミュレーションモード: 新ルール適用後のデルタを計算】");

  const client = new Client(PG_CONFIG);
  try {
    await client.connect();
    await Promise.all([
      keibaKPI(client),
      keirinKPI(client),
      boatKPI(client),
    ]);
    console.log("\n═══════════════════════════════════════════════════\n");
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
