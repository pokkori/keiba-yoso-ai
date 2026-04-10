import { Client } from "pg";

const PG_CONFIG = {
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false },
};

async function analyzeKeirinBoatrace() {
  const client = new Client(PG_CONFIG);
  try {
    await client.connect();
    console.log("✓ Connected to Supabase");

    // Q1: 競輪 venue×R番号別 ROI>=150%, n>=30 候補
    console.log("\n=== 競輪 Q1: Venue×R番号別候補分析（ROI>=150%, n>=30）===");
    const q1 = await client.query(`
      WITH race_data AS (
        SELECT 
          SUBSTRING(race_name FROM 1 FOR 4) AS venue,
          CAST(SUBSTRING(race_name FROM 6 FOR 2) AS INTEGER) AS race_no,
          COUNT(*) AS n,
          COUNT(*) FILTER (WHERE hit=true) AS hits,
          SUM(return_amount) FILTER (WHERE hit=true)::NUMERIC AS total_return,
          COUNT(*) FILTER (WHERE return_amount IS NOT NULL)::NUMERIC * 100 AS total_invested
        FROM keirin_prediction_logs
        WHERE recommendation='buy' AND race_name NOT LIKE '%test%'
        GROUP BY SUBSTRING(race_name FROM 1 FOR 4), CAST(SUBSTRING(race_name FROM 6 FOR 2) AS INTEGER)
      )
      SELECT 
        venue,
        race_no,
        n,
        hits,
        ROUND(100.0 * hits / n, 1) AS hit_rate_pct,
        ROUND(100.0 * total_return / total_invested, 1) AS roi_pct,
        total_invested::INTEGER,
        total_return::INTEGER
      FROM race_data
      WHERE n >= 30 
        AND total_invested > 0
      ORDER BY roi_pct DESC
      LIMIT 50;
    `);
    
    console.log("Top ROI candidates (n>=30):");
    q1.rows.slice(0, 20).forEach(row => {
      console.log(`  ${row.venue} R${row.race_no}: ROI=${row.roi_pct}% (n=${row.n}, hits=${row.hits})`);
    });

    // Q3: スキップ率現状・新ルール影響計算
    console.log("\n=== 競輪 Q3: スキップ率改善分析 ===");
    const q3 = await client.query(`
      SELECT 
        recommendation,
        COUNT(*) AS count
      FROM keirin_prediction_logs
      WHERE race_name NOT LIKE '%test%'
      GROUP BY recommendation
    `);
    
    let total_keirin = 0, skipped_keirin = 0;
    q3.rows.forEach(row => {
      total_keirin += parseInt(row.count);
      if (row.recommendation === 'skip') skipped_keirin = parseInt(row.count);
      console.log(`  ${row.recommendation}: ${row.count}`);
    });

    const skipRate = skipped_keirin / total_keirin * 100;
    console.log(`\n  現状スキップ率: ${skipRate.toFixed(1)}%`);
    console.log(`  目標スキップ率: 70%`);
    console.log(`  差: ${(skipRate - 70).toFixed(1)}%`);
    const needed = Math.ceil((skipRate - 70) / 100 * total_keirin);
    console.log(`  必要なALLOW追加: ${needed} 件（現在のskip数 ${skipped_keirin}→${(skipped_keirin - needed)}に削減）`);

    // Q2: R11/R12特例の回収率
    console.log("\n=== 競輪 Q2: R11/R12でも高ROIの会場特定 ===");
    const q2 = await client.query(`
      WITH race_data AS (
        SELECT 
          SUBSTRING(race_name FROM 1 FOR 4) AS venue,
          CAST(SUBSTRING(race_name FROM 6 FOR 2) AS INTEGER) AS race_no,
          COUNT(*) FILTER (WHERE hit=true) AS hits,
          COUNT(*) AS n,
          SUM(return_amount) FILTER (WHERE hit=true)::NUMERIC AS total_return,
          COUNT(*) FILTER (WHERE return_amount IS NOT NULL)::NUMERIC * 100 AS total_invested
        FROM keirin_prediction_logs
        WHERE (CAST(SUBSTRING(race_name FROM 6 FOR 2) AS INTEGER) IN (11, 12))
          AND recommendation='buy'
          AND race_name NOT LIKE '%test%'
        GROUP BY venue, CAST(SUBSTRING(race_name FROM 6 FOR 2) AS INTEGER)
      )
      SELECT 
        venue,
        race_no,
        n,
        hits,
        ROUND(100.0 * hits / n, 1) AS hit_rate_pct,
        ROUND(100.0 * total_return / total_invested, 1) AS roi_pct
      FROM race_data
      WHERE n >= 10 AND total_invested > 0
      ORDER BY roi_pct DESC;
    `);
    
    console.log("R11/R12 での高ROI会場:");
    if (q2.rows.length === 0) {
      console.log("  （データなし）");
    } else {
      q2.rows.forEach(row => {
        console.log(`  ${row.venue} R${row.race_no}: ROI=${row.roi_pct}% (n=${row.n}, hits=${row.hits})`);
      });
    }

    // 競艇
    console.log("\n\n=== 競艇 Q4-6: 分析 ===");
    const boatQ4 = await client.query(`
      WITH odds_analysis AS (
        SELECT 
          CASE 
            WHEN odds < 1.3 THEN '1.0-1.3倍'
            WHEN odds < 2.5 THEN '1.3-2.5倍(conf=null許可帯)'
            WHEN odds < 3.5 THEN '2.5-3.5倍(Q4拡張候補)'
            ELSE '3.5倍以上'
          END AS odds_band,
          COUNT(*) AS total_raced,
          COUNT(*) FILTER (WHERE hit=true) AS hits,
          ROUND(100.0 * COUNT(*) FILTER (WHERE hit=true) / COUNT(*), 1) AS hit_rate_pct,
          SUM(return_amount) FILTER (WHERE hit=true)::NUMERIC AS total_return,
          COUNT(*) FILTER (WHERE return_amount IS NOT NULL)::NUMERIC * 100 AS total_invested,
          ROUND(100.0 * SUM(return_amount) FILTER (WHERE hit=true) / (COUNT(*) FILTER (WHERE return_amount IS NOT NULL) * 100), 1) AS roi_pct
        FROM boatrace_prediction_logs
        WHERE recommendation='buy' AND race_name NOT LIKE '%test%'
        GROUP BY 1
      )
      SELECT * FROM odds_analysis
      ORDER BY odds_band;
    `);

    console.log("Q4: オッズ帯別ROI分析（control群vs拡張候補）");
    boatQ4.rows.forEach(row => {
      console.log(`  ${row.odds_band}: ${row.roi_pct}% (hit=${row.hit_rate_pct}%, n=${row.total_raced})`);
    });

    const boatQ5 = await client.query(`
      WITH venue_data AS (
        SELECT 
          SUBSTRING(race_name FROM 1 FOR 4) AS venue,
          COUNT(*) FILTER (WHERE hit=true) AS hits,
          COUNT(*) AS n,
          SUM(return_amount) FILTER (WHERE hit=true)::NUMERIC AS total_return,
          COUNT(*) FILTER (WHERE return_amount IS NOT NULL)::NUMERIC * 100 AS total_invested
        FROM boatrace_prediction_logs
        WHERE recommendation='buy' AND race_name NOT LIKE '%test%'
          AND SUBSTRING(race_name FROM 1 FOR 4) IN ('浜名湖', '常滑')
        GROUP BY SUBSTRING(race_name FROM 1 FOR 4)
      )
      SELECT 
        venue,
        n,
        hits,
        ROUND(100.0 * hits / n, 1) AS hit_rate_pct,
        ROUND(100.0 * total_return / total_invested, 1) AS roi_pct
      FROM venue_data
      WHERE n > 0;
    `);

    console.log("\nQ5: 浜名湖・常滑の詳細（除外判断用）");
    boatQ5.rows.forEach(row => {
      console.log(`  ${row.venue}: ROI=${row.roi_pct}% (n=${row.n}, hits=${row.hits})`);
    });

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

analyzeKeirinBoatrace();
