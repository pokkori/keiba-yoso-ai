import { Client } from "pg";

/**
 * 競輪・競艇スキップ率改善提案書作成
 * 
 * ユースケース:
 * - 現在のALLOWED_VENUES固定リストは9場
 * - SIM_J_EXTRA_COMBOSは10組
 * - スキップ率84.3% → 70%以下へ
 * 
 * 根拠データベース: keirin_prediction_logs (227K件、全R番号・全会場)
 */

const PG_CONFIG = {
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false },
};

async function proposal() {
  const client = new Client(PG_CONFIG);
  try {
    await client.connect();

    // ========== 提案1: 新ROI閾値カットライン決定 ==========
    console.log("======================================");
    console.log("【提案1】ROI 100% vs 150% vs 200%別のスキップ率シミュレーション");
    console.log("======================================\n");

    // 会場×R別に、複数ROI閾値での母数を計算
    const roi_simulation = await client.query(`
      WITH venue_race_stats AS (
        SELECT 
          race_name,
          COUNT(*) FILTER (WHERE recommendation='buy') AS buy_count,
          COUNT(*) FILTER (WHERE hit=true AND recommendation='buy') AS hits,
          ROUND(100.0 * COALESCE(SUM(return_amount) FILTER (WHERE hit=true AND recommendation='buy'), 0) / (COUNT(*) FILTER (WHERE recommendation='buy') * 100), 1) AS roi_pct
        FROM keirin_prediction_logs
        WHERE race_id NOT LIKE '%test%'
        GROUP BY race_name
        HAVING COUNT(*) FILTER (WHERE recommendation='buy') >= 50
      ),
      roi_classes AS (
        SELECT 
          roi_pct,
          COUNT(*) AS venue_race_count,
          SUM(buy_count) AS total_buy_races
        FROM venue_race_stats
        WHERE roi_pct >= 100
        GROUP BY 1
        ORDER BY 1 DESC
      )
      SELECT 
        CASE 
          WHEN roi_pct >= 200 THEN 'ROI>=200%'
          WHEN roi_pct >= 150 THEN 'ROI 150-200%'
          WHEN roi_pct >= 100 THEN 'ROI 100-150%'
          ELSE 'ROI<100%'
        END AS roi_band,
        COUNT(*) AS venue_race_count,
        SUM(buy_count) AS total_buy_races_in_band,
        ROUND(100.0 * SUM(buy_count) / (SELECT SUM(buy_count) FROM venue_race_stats WHERE roi_pct >= 100), 1) AS pct_of_quality_races
      FROM venue_race_stats
      WHERE roi_pct >= 100
      GROUP BY 1
      ORDER BY roi_band;
    `);

    console.log("品質別venue×Rの分布（n>=50, roi_pct>=100%）:");
    roi_simulation.rows.forEach(row => {
      console.log(`  ${row.roi_band}: ${row.venue_race_count}組み合わせ, ${row.total_buy_races_in_buy_races_in_band}件/${row.pct_of_quality_races}%`);
    });

    // ========== 提案2: 現在のALLOWED_VENUES (9場) vs 新候補 ==========
    console.log("\n======================================");
    console.log("【提案2】ALLOWED_VENUES拡張候補（ROI>=120%, n>=50）");
    console.log("======================================\n");

    const new_venues = await client.query(`
      SELECT 
        race_name,
        COUNT(*) FILTER (WHERE recommendation='buy') AS buy_count,
        COUNT(*) FILTER (WHERE hit=true AND recommendation='buy') AS hits,
        ROUND(100.0 * COUNT(*) FILTER (WHERE hit=true AND recommendation='buy') / COUNT(*) FILTER (WHERE recommendation='buy'), 1) AS hit_rate,
        ROUND(100.0 * COALESCE(SUM(return_amount) FILTER (WHERE hit=true AND recommendation='buy'), 0) / (COUNT(*) FILTER (WHERE recommendation='buy') * 100), 1) AS roi_pct
      FROM keirin_prediction_logs
      WHERE race_id NOT LIKE '%test%'
      GROUP BY race_name
      HAVING COUNT(*) FILTER (WHERE recommendation='buy') >= 50
        AND ROUND(100.0 * COALESCE(SUM(return_amount) FILTER (WHERE hit=true AND recommendation='buy'), 0) / (COUNT(*) FILTER (WHERE recommendation='buy') * 100), 1) >= 120
      ORDER BY roi_pct DESC;
    `);

    console.log("Currently strong venues (ROI>=120%, n>=50):");
    new_venues.rows.slice(0, 30).forEach(row => {
      console.log(`  ${row.race_name}: ROI=${row.roi_pct}%, hit_rate=${row.hit_rate}%, n=${row.buy_count}`);
    });

    // ========== 提案3: R11/R12の会場別ROI ==========
    console.log("\n======================================");
    console.log("【提案3】R11/R12での高ROI会場（例外追加候補）");
    console.log("======================================\n");

    const r11_r12 = await client.query(`
      SELECT 
        race_name,
        COUNT(*) FILTER (WHERE recommendation='buy') AS buy_count,
        COUNT(*) FILTER (WHERE hit=true AND recommendation='buy') AS hits,
        ROUND(100.0 * COUNT(*) FILTER (WHERE hit=true AND recommendation='buy') / COUNT(*) FILTER (WHERE recommendation='buy'), 1) AS hit_rate,
        ROUND(100.0 * COALESCE(SUM(return_amount) FILTER (WHERE hit=true AND recommendation='buy'), 0) / (COUNT(*) FILTER (WHERE recommendation='buy') * 100), 1) AS roi_pct
      FROM keirin_prediction_logs
      WHERE race_id NOT LIKE '%test%'
        AND (race_name LIKE '%11R' OR race_name LIKE '%12R')
      GROUP BY race_name
      HAVING COUNT(*) FILTER (WHERE recommendation='buy') >= 20
      ORDER BY roi_pct DESC;
    `);

    console.log("R11/R12 high-ROI venues (ROI threshold by ROI level):");
    r11_r12.rows.forEach(row => {
      const roi_threshold = row.roi_pct >= 150 ? '✓ ALLOW' : row.roi_pct >= 120 ? '△ Consider' : '✗ Skip';
      console.log(`  ${row.race_name}: ROI=${row.roi_pct}% [${roi_threshold}], n=${row.buy_count}`);
    });

    // ========== スキップ率計算 ==========
    console.log("\n======================================");
    console.log("【Q3 回答】スキップ率改善シミュレーション");
    console.log("======================================\n");

    const overall_stats = await client.query(`
      SELECT 
        COUNT(*) AS total_predictions,
        COUNT(*) FILTER (WHERE recommendation='buy') AS buy_count,
        COUNT(*) FILTER (WHERE recommendation='skip') AS skip_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE recommendation='skip') / COUNT(*), 1) AS current_skip_rate_pct
      FROM keirin_prediction_logs
      WHERE race_id NOT LIKE '%test%';
    `);

    const stats = overall_stats.rows[0];
    const current_skip_rate = parseFloat(stats.current_skip_rate_pct);
    
    console.log(`現在：total=${stats.total_predictions}, buy=${stats.buy_count}, skip=${stats.skip_count}`);
    console.log(`現在のスキップ率: ${current_skip_rate}%`);
    console.log(`\nNote: これは「バックテストDB（227K件）」の全体スキップ率`);
    console.log(`      ユーザー向けの実予想（SIM-J/SIM-L）のスキップ率は別途計算が必要`);

    console.log(`\n目標スキップ率: 70% （現状から ${current_skip_rate - 70 > 0 ? (current_skip_rate - 70).toFixed(1) : '既に達成'}% ${current_skip_rate > 70 ? '削減が必要' : '以下'}）`);

    if (current_skip_rate < 70) {
      console.log(`\n★重要：現在のバックテストDBのスキップ率は ${current_skip_rate}% で既に70%より低い。`);
      console.log(`  ユーザー向けの実予想ロジック（SIM-J:R2-R6積極買い など）では`);
      console.log(`  スキップ率84.3% というのは妥当な数字と考えられます。`);
      console.log(`  改善戦略は「スキップ率低下」ではなく「ROI維持しながら対象拡大」です。`);
    }

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

proposal();
