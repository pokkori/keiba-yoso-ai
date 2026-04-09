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

    // SIM-8: 9-13倍 × 12頭以下（頭数フィルター追加）
    // ※ race_name等から頭数取得不可なためodd帯のみ
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

    // SIM-5: conf_null 1.2-2.5倍のみ（最高ROI帯特化）
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
    console.log("\n  ─── [SIM-5] conf=null 1.2-2.5倍特化（現行実装） ─");
    console.log(`  n=${fmt(s5.eval_f)} 的中率: ${pct(s5.hit_f, s5.eval_f)}  回収率: ${rr(s5.ret_f, parseInt(s5.eval_f) * 100)}`);

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
