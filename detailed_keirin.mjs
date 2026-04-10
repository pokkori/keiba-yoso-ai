import { Client } from "pg";

const PG_CONFIG = {
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false },
};

async function detailedAnalysis() {
  const client = new Client(PG_CONFIG);
  try {
    await client.connect();
    console.log("✓ Supabase connected\n");

    // 全体的な buy vs skip の回収率比較
    console.log("=== 競輪: Buy vs Skip の回収率差 ===");
    const comparison = await client.query(`
      SELECT 
        recommendation,
        COUNT(*) AS n,
        COUNT(*) FILTER (WHERE hit=true) AS hits,
        ROUND(100.0 * COUNT(*) FILTER (WHERE hit=true) / COUNT(*), 2) AS hit_rate_pct,
        ROUND(100.0 * COALESCE(SUM(return_amount) FILTER (WHERE hit=true), 0) / (COUNT(*) * 100), 1) AS roi_pct,
        ROUND(AVG(odds) FILTER (WHERE odds > 0), 2) AS avg_odds
      FROM keirin_prediction_logs
      WHERE race_id NOT LIKE '%test%'
      GROUP BY recommendation;
    `);
    comparison.rows.forEach(row => {
      console.log(`${row.recommendation}: n=${row.n}, hit_rate=${row.hit_rate_pct}%, ROI=${row.roi_pct}%, avg_odds=${row.avg_odds}`);
    });

    // buy数が膨大な理由を調べる: race_idの種類分析
    console.log("\n=== 競輪: 買い多発の根本原因（どのrace_idパターンで大量にbuyしている？）===");
    const buy_sources = await client.query(`
      SELECT 
        SUBSTRING(race_id, 1, 10) AS race_id_prefix,
        COUNT(*) AS buy_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE hit=true) / COUNT(*), 1) AS hit_rate_pct,
        ROUND(100.0 * COALESCE(SUM(return_amount) FILTER (WHERE hit=true), 0) / (COUNT(*) * 100), 1) AS roi_pct
      FROM keirin_prediction_logs
      WHERE recommendation='buy' AND race_id NOT LIKE '%test%'
      GROUP BY SUBSTRING(race_id, 1, 10)
      ORDER BY buy_count DESC
      LIMIT 20;
    `);
    console.log("Top buy sources:");
    buy_sources.rows.forEach(row => {
      console.log(`  ${row.race_id_prefix}: ${row.buy_count} 件 (hit_rate=${row.hit_rate_pct}%, ROI=${row.roi_pct}%)`);
    });

    // 会場別に全体ROIを確認
    console.log("\n=== 競輪: 会場別の全体ROI（予測対象全部含む）===");
    const venues = await client.query(`
      SELECT 
        race_name,
        COUNT(*) AS n,
        COUNT(*) FILTER (WHERE recommendation='buy') AS buy_n,
        COUNT(*) FILTER (WHERE hit=true AND recommendation='buy') AS hits,
        ROUND(100.0 * COUNT(*) FILTER (WHERE hit=true AND recommendation='buy') / COUNT(*) FILTER (WHERE recommendation='buy'), 1) AS buy_hit_rate_pct,
        ROUND(100.0 * COALESCE(SUM(return_amount) FILTER (WHERE hit=true AND recommendation='buy'), 0) / (COUNT(*) FILTER (WHERE recommendation='buy') * 100), 1) AS buy_roi_pct
      FROM keirin_prediction_logs
      WHERE race_id NOT LIKE '%test%'
      GROUP BY race_name
      HAVING COUNT(*) > 100
      ORDER BY buy_roi_pct DESC
      LIMIT 30;
    `);
    console.log("Top venues by buy ROI:");
    venues.rows.slice(0, 20).forEach(row => {
      console.log(`  ${row.race_name}: n=${row.n}, buy=${row.buy_n}, hits=${row.hits}, buy_ROI=${row.buy_roi_pct}%`);
    });

    // R番号別の全体ROI
    console.log("\n=== 競輪: R番号別ROI ===");
    const raceNos = await client.query(`
      SELECT 
        CASE 
          WHEN race_name LIKE '%1R' THEN 1
          WHEN race_name LIKE '%2R' THEN 2
          WHEN race_name LIKE '%3R' THEN 3
          WHEN race_name LIKE '%4R' THEN 4
          WHEN race_name LIKE '%5R' THEN 5
          WHEN race_name LIKE '%6R' THEN 6
          WHEN race_name LIKE '%7R' THEN 7
          WHEN race_name LIKE '%8R' THEN 8
          WHEN race_name LIKE '%9R' THEN 9
          WHEN race_name LIKE '%10R' THEN 10
          WHEN race_name LIKE '%11R' THEN 11
          WHEN race_name LIKE '%12R' THEN 12
        END AS race_no,
        COUNT(*) AS n,
        COUNT(*) FILTER (WHERE recommendation='buy') AS buy_n,
        COUNT(*) FILTER (WHERE hit=true AND recommendation='buy') AS hits,
        ROUND(100.0 * COUNT(*) FILTER (WHERE hit=true AND recommendation='buy') / COUNT(*) FILTER (WHERE recommendation='buy'), 1) AS buy_hit_rate,
        ROUND(100.0 * COALESCE(SUM(return_amount) FILTER (WHERE hit=true AND recommendation='buy'), 0) / (COUNT(*) FILTER (WHERE recommendation='buy') * 100), 1) AS buy_roi_pct
      FROM keirin_prediction_logs
      WHERE race_id NOT LIKE '%test%'
      GROUP BY race_no
      ORDER BY race_no;
    `);
    raceNos.rows.forEach(row => {
      if (row.race_no) {
        console.log(`  R${row.race_no}: n=${row.n}, buy=${row.buy_n}, hits=${row.hits}, buy_ROI=${row.buy_roi_pct}%`);
      }
    });

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

detailedAnalysis();
