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

    // SIM-K2/SIM-L: SIM-I2 + 15combo追加 + R10解禁 ← 現行実装（2026-04-09）
    // SIM-K: 川崎R9(203.5%/n=63)・大宮R11(163.7%/n=91)追加
    // SIM-K2: 西武園R7(245.7%/n=18)・岸和田R1(239.1%/n=12)・前橋R11(191.2%/n=12)追加
    // SIM-L: R10をSKIP_RACE_NUMSから除外（116.6%/n=217 > 全体108.8%）
    const SIM_J_EXTRA = [
      ["岐阜",4],["伊東",3],["前橋",2],["西武園",9],["高知",2],
      ["京王閣",3],["広島",6],["松戸",2],["玉野",2],["名古屋",6],
      // SIM-K追加
      ["川崎",9],["大宮",11],
      // SIM-K2追加
      ["西武園",7],["岸和田",1],["前橋",11],
    ];
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
            AND (rno IN (2,3,4,5,6,9,10) OR (venue_name='和歌山' AND rno=1) OR (venue_name='久留米' AND rno=7))
            AND ${simISkipConds}
          ) OR (${simJExtraConds})
        )) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND (
          (venue_name IN (${venuesGStr})
            AND (rno IN (2,3,4,5,6,9,10) OR (venue_name='和歌山' AND rno=1) OR (venue_name='久留米' AND rno=7))
            AND ${simISkipConds}
          ) OR (${simJExtraConds})
        )) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND (
          (venue_name IN (${venuesGStr})
            AND (rno IN (2,3,4,5,6,9,10) OR (venue_name='和歌山' AND rno=1) OR (venue_name='久留米' AND rno=7))
            AND ${simISkipConds}
          ) OR (${simJExtraConds})
        )) AS ret_f
      FROM racenum
    `);
    const ksJ = keirinSimJ[0];
    console.log("\n  ─── [SIM-K2/L] 現行実装（15combo+R10解禁） ──");
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
// [修正履歴]
// 2026-04-09: venue形式が "福岡(22)" 形式のため REGEXP_REPLACE で括弧除去対応
//             race_id形式が "A_2026-04-03_S22_R05" (大文字R) のため '_R([0-9]+)$' 対応
//             旧 SPLIT_PART(race_id,'-',4) / SUBSTRING(race_id FROM 'r([0-9]+)') は削除
async function boatKPI(client) {
  // venue名クリーン化ヘルパー: "福岡(22)" → "福岡"（括弧+番号を除去）
  // race_id R番号抽出: "_R([0-9]+)$" (大文字R、末尾固定)
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

  // 直近30日会場別（venue名を REGEXP_REPLACE でクリーン化）
  // venue形式: "福岡(22)" → [(][0-9]+[)]$ で括弧+番号を除去
  const { rows: venue } = await client.query(`
    WITH cleaned AS (
      SELECT
        REGEXP_REPLACE(venue, '[(][0-9]+[)]$', '') AS venue_clean,
        recommendation, hit, return_amount
      FROM boat_prediction_logs
      WHERE race_date >= CURRENT_DATE - INTERVAL '30 days'
        AND venue IS NOT NULL AND venue != ''
    )
    SELECT venue_clean AS venue,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hits,
      SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS ret
    FROM cleaned
    GROUP BY venue_clean
    HAVING COUNT(*) FILTER (WHERE recommendation='buy') >= 5
    ORDER BY
      SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true)::float
      / NULLIF(COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL), 0) DESC
    LIMIT 10
  `);

  // 全期間 会場別ROI（スキップ対象特定）
  const { rows: venueAll } = await client.query(`
    WITH cleaned AS (
      SELECT
        REGEXP_REPLACE(venue, '[(][0-9]+[)]$', '') AS venue_clean,
        recommendation, hit, return_amount,
        CAST(SUBSTRING(race_id FROM '_R([0-9]+)$') AS INTEGER) AS rno
      FROM boat_prediction_logs
    )
    SELECT venue_clean,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hits,
      ROUND(
        SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true)::numeric
        / NULLIF(COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL), 0)
        / 100 * 100, 1
      ) AS roi
    FROM cleaned
    GROUP BY venue_clean
    HAVING COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) >= 10
    ORDER BY roi DESC
  `);

  // R番号別ROI（race_id末尾 _R{N} から抽出）
  const { rows: rnoRows } = await client.query(`
    WITH cleaned AS (
      SELECT
        CAST(SUBSTRING(race_id FROM '_R([0-9]+)$') AS INTEGER) AS rno,
        recommendation, hit, return_amount
      FROM boat_prediction_logs
    )
    SELECT rno,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hits,
      ROUND(
        SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true)::numeric
        / NULLIF(COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL), 0)
        / 100 * 100, 1
      ) AS roi
    FROM cleaned
    WHERE rno IS NOT NULL
    GROUP BY rno
    HAVING COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) >= 5
    ORDER BY rno
  `);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  競艇予想AI KPI");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  期間: ${a.from_date} ～ ${a.to_date}`);
  console.log(`  buy=${fmt(a.buy_cnt)} skip=${fmt(a.skip_cnt)} 評価済=${fmt(a.eval_cnt)}`);
  console.log(`  的中率: ${pct(a.hit_cnt, a.eval_cnt)} (Wilson CI: ${lo.toFixed(1)}-${hi.toFixed(1)}%)`);
  console.log(`  回収率: ${rr(a.total_return, invested)}  (投資${fmt(invested)}円 / 回収${fmt(a.total_return)}円)`);

  if (venue.length > 0) {
    console.log("\n  ─── 直近30日 会場別ROI（的中率降順TOP10） ──────");
    for (const v of venue) {
      const r = parseInt(v.eval) > 0 ? rr(v.ret, parseInt(v.eval) * 100) : "-";
      console.log(`  ${(v.venue + "　　").slice(0, 6)}: 評${String(fmt(v.eval)).padStart(3)} 的${pct(v.hits, v.eval).padStart(6)} 回${r}`);
    }
  }

  if (venueAll.length > 0) {
    console.log("\n  ─── 全期間 会場別ROI ────────────────────────────");
    for (const v of venueAll) {
      const flag = parseFloat(v.roi) < 100 ? " ← スキップ候補" : parseFloat(v.roi) >= 130 ? " ← 高ROI" : "";
      console.log(`  ${(v.venue_clean + "　　").slice(0, 6)}: 評${String(fmt(v.eval)).padStart(4)} 的${pct(v.hits, v.eval).padStart(6)} 回${v.roi}%${flag}`);
    }
  }

  if (rnoRows.length > 0) {
    console.log("\n  ─── R番号別ROI ──────────────────────────────────");
    for (const r of rnoRows) {
      const flag = parseFloat(r.roi) < 80 ? " ← 要スキップ" : parseFloat(r.roi) >= 130 ? " ← 優良帯" : "";
      console.log(`  R${String(r.rno).padStart(2)}: 評${String(fmt(r.eval)).padStart(4)} 的${pct(r.hits, r.eval).padStart(6)} 回${r.roi}%${flag}`);
    }
  }

  // シミュレーション: 各フィルター組み合わせ効果
  // 注意: venue名は "福岡(22)" 形式のため REGEXP_REPLACE で括弧除去してから比較
  if (SIM_MODE) {
    // venue名クリーン化 + R番号抽出を共通CTEで定義
    // venue形式: "福岡(22)" → REGEXP_REPLACE で "福岡" に変換
    // 正規表現: [(][0-9]+[)]$ （[] エスケープで括弧をリテラルマッチ）
    const baseCTE = `
      WITH cleaned AS (
        SELECT *,
          REGEXP_REPLACE(venue, '[(][0-9]+[)]$', '') AS venue_clean,
          CAST(SUBSTRING(race_id FROM '_R([0-9]+)$') AS INTEGER) AS rno
        FROM boat_prediction_logs
        WHERE recommendation = 'buy'
      )
    `;

    // 総件数取得（スキップ率計算用）
    const { rows: totalRows } = await client.query(`SELECT COUNT(*) AS n FROM boat_prediction_logs WHERE recommendation='buy'`);
    const totalBuy = parseInt(totalRows[0].n);

    const TOP5 = ["丸亀", "蒲郡", "唐津", "多摩川", "児島", "若松", "福岡", "尼崎", "三国"];
    const top5Str = TOP5.map(v => `'${v}'`).join(",");

    // SIM-1: 非TOP9×conf=null スキップ
    const { rows: sim1 } = await client.query(`
      ${baseCTE}
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND NOT (confidence IS NULL AND venue_clean NOT IN (${top5Str}))) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND NOT (confidence IS NULL AND venue_clean NOT IN (${top5Str}))) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND NOT (confidence IS NULL AND venue_clean NOT IN (${top5Str}))) AS ret_f
      FROM cleaned
    `);
    const s1 = sim1[0];
    console.log("\n  ─── [SIM-1] 非TOP9×conf=null スキップ後 ─");
    console.log(`  n=${fmt(s1.eval_f)} 的中率: ${pct(s1.hit_f, s1.eval_f)}  回収率: ${rr(s1.ret_f, parseInt(s1.eval_f) * 100)}`);

    // SIM-2: SIM-1 + R番号フィルター (R7/R9 スキップ: 実績ROI<100%)
    const { rows: sim2 } = await client.query(`
      ${baseCTE}
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND NOT (confidence IS NULL AND venue_clean NOT IN (${top5Str}))
          AND rno IS NOT NULL
          AND rno NOT IN (7, 9)
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND NOT (confidence IS NULL AND venue_clean NOT IN (${top5Str}))
          AND rno IS NOT NULL
          AND rno NOT IN (7, 9)
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND NOT (confidence IS NULL AND venue_clean NOT IN (${top5Str}))
          AND rno IS NOT NULL
          AND rno NOT IN (7, 9)
        ) AS ret_f
      FROM cleaned
    `);
    const s2 = sim2[0];
    console.log("\n  ─── [SIM-2] +R7/R9スキップ後 ─────────");
    console.log(`  n=${fmt(s2.eval_f)} 的中率: ${pct(s2.hit_f, s2.eval_f)}  回収率: ${rr(s2.ret_f, parseInt(s2.eval_f) * 100)}`);

    // SIM-3: 高ROI会場のみ（徳山141%/三国138%/桐生129%/宮島129%）
    const HIGH_ROI_VENUES = ["徳山", "三国", "桐生", "宮島", "平和島", "戸田", "常滑", "福岡", "大村", "津", "児島"];
    const highVenStr = HIGH_ROI_VENUES.map(v => `'${v}'`).join(",");
    const { rows: sim3 } = await client.query(`
      ${baseCTE}
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND venue_clean IN (${highVenStr})) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND venue_clean IN (${highVenStr})) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND venue_clean IN (${highVenStr})) AS ret_f
      FROM cleaned
    `);
    const s3 = sim3[0];
    const skip3 = ((1 - parseInt(s3.eval_f) / totalBuy) * 100).toFixed(1);
    console.log("\n  ─── [SIM-3] 高ROI11会場のみ（徳山/三国/桐生/宮島等） ──");
    console.log(`  n=${fmt(s3.eval_f)} 的中率: ${pct(s3.hit_f, s3.eval_f)}  回収率: ${rr(s3.ret_f, parseInt(s3.eval_f) * 100)}  スキップ率: ${skip3}%`);

    // SIM-4: 高ROI会場 + 低ROI R番号スキップ（ROI<80%: R7/R9）
    const { rows: sim4 } = await client.query(`
      ${baseCTE}
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND venue_clean IN (${highVenStr})
          AND rno NOT IN (7, 9)
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND venue_clean IN (${highVenStr})
          AND rno NOT IN (7, 9)
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND venue_clean IN (${highVenStr})
          AND rno NOT IN (7, 9)
        ) AS ret_f
      FROM cleaned
    `);
    const s4 = sim4[0];
    const skip4 = ((1 - parseInt(s4.eval_f) / totalBuy) * 100).toFixed(1);
    console.log("\n  ─── [SIM-4] 高ROI11会場+R7/R9スキップ ──");
    console.log(`  n=${fmt(s4.eval_f)} 的中率: ${pct(s4.hit_f, s4.eval_f)}  回収率: ${rr(s4.ret_f, parseInt(s4.eval_f) * 100)}  スキップ率: ${skip4}%`);

    // SIM-5: 会場×R番号 ROI<80%の組み合わせをスキップ（Supabase実証値から導出）
    // ROI<80%スキップ対象（n>=5）: 多摩川R3/住之江R7/津R4/福岡R7/丸亀R3/三国R9/徳山R8/多摩川R8/住之江R8/尼崎R2
    const SKIP_VENUE_R = [
      ["多摩川",3],["住之江",7],["津",4],["福岡",7],["丸亀",3],
      ["三国",9],["徳山",8],["多摩川",8],["住之江",8],["尼崎",2],
      ["桐生",6],["下関",9],["浜名湖",1],["津",7],["蒲郡",8],
      ["常滑",5],["宮島",9],["尼崎",4],["三国",10],["丸亀",9],
      ["下関",10],["芦屋",3],["児島",10],["福岡",2],["丸亀",7],
      ["住之江",2],["徳山",9],["唐津",7],["大村",2],["芦屋",6],
      ["下関",8],["大村",4],["宮島",10],["三国",12],["下関",1],
      ["三国",3],["下関",6],["多摩川",4],["平和島",5],["浜名湖",6],
      ["児島",4],["尼崎",7],["常滑",11],["児島",6],["徳山",5],
      ["大村",6],["唐津",6],["桐生",3],["浜名湖",8],["大村",3],
      ["多摩川",9],["桐生",11],["尼崎",6],["福岡",1],["大村",1],
      ["宮島",11],["平和島",5],["宮島",6],["蒲郡",9],["尼崎",5],["戸田",4],
    ];
    const skipConds = SKIP_VENUE_R.map(([v,r]) =>
      `NOT (venue_clean='${v}' AND rno=${r})`).join("\n          AND ");
    const { rows: sim5 } = await client.query(`
      ${baseCTE}
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND ${skipConds}
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND ${skipConds}
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND ${skipConds}
        ) AS ret_f
      FROM cleaned
    `);
    const s5 = sim5[0];
    const skip5 = ((1 - parseInt(s5.eval_f) / totalBuy) * 100).toFixed(1);
    console.log("\n  ─── [SIM-5] ROI<80%の会場×R組み合わせを全スキップ ──");
    console.log(`  n=${fmt(s5.eval_f)} 的中率: ${pct(s5.hit_f, s5.eval_f)}  回収率: ${rr(s5.ret_f, parseInt(s5.eval_f) * 100)}  スキップ率: ${skip5}%`);

    // SIM-6: 高ROI11会場 + ROI<80%venue×Rスキップ（複合最強）
    const { rows: sim6 } = await client.query(`
      ${baseCTE}
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND venue_clean IN (${highVenStr})
          AND ${skipConds}
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND venue_clean IN (${highVenStr})
          AND ${skipConds}
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND venue_clean IN (${highVenStr})
          AND ${skipConds}
        ) AS ret_f
      FROM cleaned
    `);
    const s6 = sim6[0];
    const skip6 = ((1 - parseInt(s6.eval_f) / totalBuy) * 100).toFixed(1);
    console.log("\n  ─── [SIM-6] 高ROI11会場 + ROI<80%venue×Rスキップ（複合） ──");
    console.log(`  n=${fmt(s6.eval_f)} 的中率: ${pct(s6.hit_f, s6.eval_f)}  回収率: ${rr(s6.ret_f, parseInt(s6.eval_f) * 100)}  スキップ率: ${skip6}%`);

    // SIM-7: 高ROI11会場のみ + R6/R11特化（ROI>=130%帯）
    const { rows: sim7 } = await client.query(`
      ${baseCTE}
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL
          AND venue_clean IN (${highVenStr})
          AND rno IN (4, 6, 11)
        ) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true
          AND venue_clean IN (${highVenStr})
          AND rno IN (4, 6, 11)
        ) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true
          AND venue_clean IN (${highVenStr})
          AND rno IN (4, 6, 11)
        ) AS ret_f
      FROM cleaned
    `);
    const s7 = sim7[0];
    const skip7 = ((1 - parseInt(s7.eval_f) / totalBuy) * 100).toFixed(1);
    console.log("\n  ─── [SIM-7] 高ROI11会場 × R4/R6/R11特化（ROI130%+帯） ──");
    console.log(`  n=${fmt(s7.eval_f)} 的中率: ${pct(s7.hit_f, s7.eval_f)}  回収率: ${rr(s7.ret_f, parseInt(s7.eval_f) * 100)}  スキップ率: ${skip7}%`);

    // SIM-8: Supabase実証高ROI venue×R TOP組み合わせ特化
    // TOP ROI: 三国R6(431%)/宮島R3(292%)/常滑R4(289%)/大村R8(287%)/三国R11(258%)/宮島R4(257%)
    //          徳山R11(254%)/福岡R3(253%)/桐生R1(250%)/平和島R8(230%)
    const TOP_COMBOS = [
      ["三国",6],["宮島",3],["常滑",4],["大村",8],["三国",11],["宮島",4],
      ["徳山",11],["福岡",3],["桐生",1],["平和島",8],["徳山",3],["徳山",6],
      ["桐生",7],["丸亀",4],["浜名湖",2],["大村",10],["下関",4],["住之江",1],
      ["丸亀",5],["平和島",6],["福岡",6],["住之江",6],["児島",3],["住之江",4],
      ["津",6],["多摩川",6],["大村",11],["三国",5],["三国",8],["徳山",1],
    ];
    const topComboConds = TOP_COMBOS.map(([v,r]) =>
      `(venue_clean='${v}' AND rno=${r})`).join(" OR ");
    const { rows: sim8 } = await client.query(`
      ${baseCTE}
      SELECT
        COUNT(*) FILTER (WHERE hit IS NOT NULL AND (${topComboConds})) AS eval_f,
        COUNT(*) FILTER (WHERE hit=true AND (${topComboConds})) AS hit_f,
        SUM(return_amount) FILTER (WHERE hit=true AND (${topComboConds})) AS ret_f
      FROM cleaned
    `);
    const s8 = sim8[0];
    const skip8 = ((1 - parseInt(s8.eval_f) / totalBuy) * 100).toFixed(1);
    console.log("\n  ─── [SIM-8] Supabase高ROI venue×R TOP30特化 ──");
    console.log(`  n=${fmt(s8.eval_f)} 的中率: ${pct(s8.hit_f, s8.eval_f)}  回収率: ${rr(s8.ret_f, parseInt(s8.eval_f) * 100)}  スキップ率: ${skip8}%`);
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
