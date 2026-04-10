import { Client } from "pg";

const PG_CONFIG = {
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false },
};

async function finalAnalysis() {
  const client = new Client(PG_CONFIG);
  try {
    await client.connect();
    console.log("✓ Connected to Supabase\n");

    // 競輪 Q1: race_name×race_idパターン確認してからROI分析
    const race_id_sample = await client.query(`
      SELECT DISTINCT race_id, race_name 
      FROM keirin_prediction_logs 
      LIMIT 10;
    `);
    console.log("=== 競輪 race_id Format Sample ===");
    race_id_sample.rows.forEach(r => {
      console.log(`  race_id="${r.race_id}" → race_name="${r.race_name}"`);
    });

    // Q1: venue×race_id別ROI分析
    console.log("\n=== 競輪 Q1: Venue×Race番号別 ROI>=150% (n>=30) 候補 ===");
    const q1_keirin = await client.query(`
      SELECT 
        race_id,
        race_name,
        COUNT(*) AS n,
        COUNT(*) FILTER (WHERE hit=true) AS hits,
        ROUND(100.0 * COUNT(*) FILTER (WHERE hit=true) / COUNT(*), 1) AS hit_rate,
        ROUND(100.0 * COALESCE(SUM(return_amount) FILTER (WHERE hit=true), 0) / (COUNT(*) * 100), 1) AS roi_pct
      FROM keirin_prediction_logs
      WHERE recommendation='buy' AND race_id NOT LIKE '%test%'
      GROUP BY race_id, race_name
      HAVING COUNT(*) >= 30
        AND ROUND(100.0 * COALESCE(SUM(return_amount) FILTER (WHERE hit=true), 0) / (COUNT(*) * 100), 1) >= 150
      ORDER BY roi_pct DESC
      LIMIT 30;
    `);
    
    console.log("High-ROI races (ROI>=150%, n>=30):");
    q1_keirin.rows.forEach(row => {
      console.log(`  ${row.race_name}: ROI=${row.roi_pct}% (n=${row.n}, hits=${row.hits}, rate=${row.hit_rate}%)`);
    });

    // 統計: 全体スキップ率
    console.log("\n=== 競輪 Q3: スキップ率分析 ===");
    const stats_keirin = await client.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE recommendation='buy') AS buy_count,
        COUNT(*) FILTER (WHERE recommendation='skip') AS skip_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE recommendation='skip') / COUNT(*), 1) AS skip_rate_pct
      FROM keirin_prediction_logs
      WHERE race_id NOT LIKE '%test%';
    `);
    
    const s = stats_keirin.rows[0];
    console.log(`  Total: ${s.total}`);
    console.log(`  Buy: ${s.buy_count}, Skip: ${s.skip_count}`);
    console.log(`  Current skip rate: ${s.skip_rate_pct}%`);
    const target_skip_rate = 70;
    const skip_reduction_needed = s.skip_count - Math.round(s.total * target_skip_rate / 100);
    console.log(`  Target skip rate: ${target_skip_rate}%`);
    console.log(`  Need to ALLOW: ${skip_reduction_needed} races (${(skip_reduction_needed / s.total * 100).toFixed(1)}%)`);

    // Q2: R11/R12高ROI例外
    console.log("\n=== 競輪 Q2: R11/R12でも高ROIの例外会場 ===");
    const q2_keirin = await client.query(`
      SELECT 
        race_id,
        race_name,
        COUNT(*) AS n,
        COUNT(*) FILTER (WHERE hit=true) AS hits,
        ROUND(100.0 * COUNT(*) FILTER (WHERE hit=true) / COUNT(*), 1) AS hit_rate,
        ROUND(100.0 * COALESCE(SUM(return_amount) FILTER (WHERE hit=true), 0) / (COUNT(*) * 100), 1) AS roi_pct
      FROM keirin_prediction_logs
      WHERE recommendation='buy' 
        AND race_id NOT LIKE '%test%'
        AND (race_id LIKE '%-R11' OR race_id LIKE '%-R12')
      GROUP BY race_id, race_name
      HAVING COUNT(*) >= 10
      ORDER BY roi_pct DESC;
    `);
    
    if (q2_keirin.rows.length === 0) {
      console.log("  （R11/R12でのデータなし）");
    } else {
      q2_keirin.rows.forEach(row => {
        console.log(`  ${row.race_name}: ROI=${row.roi_pct}% (n=${row.n}, hits=${row.hits})`);
      });
    }

    // 競艇分析
    console.log("\n\n=== 競艇 Q4-5: オッズ帯別ROI ===");
    const q4_boat = await client.query(`
      SELECT 
        CASE 
          WHEN odds IS NULL THEN 'null'
          WHEN odds < 1.3 THEN '<1.3倍'
          WHEN odds < 2.5 THEN '1.3-2.5倍(current)'
          WHEN odds < 3.5 THEN '2.5-3.5倍(Q4拡張案)'
          ELSE '>=3.5倍'
        END AS odds_band,
        COUNT(*) AS n,
        COUNT(*) FILTER (WHERE hit=true) AS hits,
        ROUND(100.0 * COUNT(*) FILTER (WHERE hit=true) / COUNT(*), 1) AS hit_rate,
        ROUND(100.0 * COALESCE(SUM(return_amount) FILTER (WHERE hit=true), 0) / (COUNT(*) * 100), 1) AS roi_pct
      FROM boatrace_prediction_logs
      WHERE recommendation='buy' AND race_id NOT LIKE '%test%'
      GROUP BY 1
      ORDER BY 
        CASE 
          WHEN odds IS NULL THEN 0
          WHEN odds < 1.3 THEN 1
          WHEN odds < 2.5 THEN 2
          WHEN odds < 3.5 THEN 3
          ELSE 4
        END;
    `);
    
    console.log("Boat race ROI by odds band:");
    q4_boat.rows.forEach(row => {
      console.log(`  ${row.odds_band}: ROI=${row.roi_pct}% (hit_rate=${row.hit_rate}%, n=${row.n})`);
    });

    // 競艇 統計
    console.log("\n=== 競艇 統計 ===");
    const stats_boat = await client.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE recommendation='skip') AS skip_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE recommendation='skip') / COUNT(*), 1) AS skip_rate_pct
      FROM boatrace_prediction_logs
      WHERE race_id NOT LIKE '%test%';
    `);
    
    const sb = stats_boat.rows[0];
    console.log(`  Current skip rate: ${sb.skip_rate_pct}%`);

  } catch (err) {
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
  } finally {
    await client.end();
  }
}

finalAnalysis();
