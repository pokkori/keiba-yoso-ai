import pkg from 'pg';
const { Client } = pkg;

console.log('スクリプト開始...');

const client = new Client({
  host: 'oufnfbecjkwfekpyszye.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Zm5mYmVjamt3ZmVrcHlzenllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk0ODA5MSwiZXhwIjoyMDg2NTI0MDkxfQ.vCoiA8HYM7pHDKnvbkYZkNG_y492RJPNXDwJNp_B3fk',
  ssl: { rejectUnauthorized: false }
});

const results = {};

try {
  console.log('Supabaseに接続中...');
  await client.connect();
  console.log('Supabase に接続成功\n');

  // === 1. ナイター vs 昼間 ROI比較 ===
  console.log('=== 1. ナイター vs 昼間 ROI比較 ===');
  const nightdayQuery = `
    SELECT
      CASE WHEN EXTRACT(hour FROM race_date) >= 17 THEN 'ナイター' ELSE '昼間' END as time_type,
      COUNT(*) as count,
      SUM(CASE WHEN hit IS TRUE THEN 1 ELSE 0 END) as win_count,
      ROUND(CAST(SUM(CASE WHEN hit IS TRUE THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0) * 100, 2) as hit_rate,
      ROUND(AVG(COALESCE(return_amount, 0)), 2) as avg_return,
      ROUND(CAST(SUM(COALESCE(return_amount, 0)) / NULLIF(COUNT(*) * 100, 0)) * 100, 2) as roi
    FROM boat_prediction_logs
    WHERE recommendation = 'buy'
      AND hit IS NOT NULL
      AND ((confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
       OR (confidence >= 10 AND venue NOT IN ('芦屋', '住之江') AND EXTRACT(month FROM race_date) NOT IN (4, 7, 10, 12)))
    GROUP BY time_type
    ORDER BY roi DESC;
  `;
  try {
    const nightdayRes = await client.query(nightdayQuery);
    results.nightVsDay = nightdayRes.rows;
    console.log(JSON.stringify(nightdayRes.rows, null, 2));
  } catch (e) {
    console.log('(スキップ) ナイター vs 昼間:', e.message);
  }
  console.log();

  // === 2. conf値別ROI ===
  console.log('=== 2. conf値別ROI ===');
  const confQuery = `
    SELECT
      CASE
        WHEN confidence IS NULL THEN 'null'
        WHEN confidence BETWEEN 1 AND 5 THEN '1-5'
        WHEN confidence BETWEEN 6 AND 10 THEN '6-10'
        WHEN confidence BETWEEN 11 AND 15 THEN '11-15'
        WHEN confidence BETWEEN 16 AND 20 THEN '16-20'
        ELSE '21+'
      END as conf_range,
      COUNT(*) as count,
      SUM(CASE WHEN hit IS TRUE THEN 1 ELSE 0 END) as win_count,
      ROUND(CAST(SUM(CASE WHEN hit IS TRUE THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0) * 100, 2) as hit_rate,
      ROUND(AVG(COALESCE(return_amount, 0)), 2) as avg_return,
      ROUND(CAST(SUM(COALESCE(return_amount, 0)) / NULLIF(COUNT(*) * 100, 0)) * 100, 2) as roi
    FROM boat_prediction_logs
    WHERE recommendation = 'buy'
      AND hit IS NOT NULL
      AND ((confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
       OR (confidence >= 10 AND venue NOT IN ('芦屋', '住之江') AND EXTRACT(month FROM race_date) NOT IN (4, 7, 10, 12)))
    GROUP BY conf_range
    ORDER BY
      CASE
        WHEN conf_range = 'null' THEN 0
        WHEN conf_range = '1-5' THEN 1
        WHEN conf_range = '6-10' THEN 2
        WHEN conf_range = '11-15' THEN 3
        WHEN conf_range = '16-20' THEN 4
        ELSE 5
      END;
  `;
  try {
    const confRes = await client.query(confQuery);
    results.confRange = confRes.rows;
    console.log(JSON.stringify(confRes.rows, null, 2));
  } catch (e) {
    console.log('(スキップ) conf値別ROI:', e.message);
  }
  console.log();

  // === 3. 直近30日 vs 30-90日前 vs 90日以上前 ROI比較 ===
  console.log('=== 3. データ鮮度別ROI比較 ===');
  const freshnessQuery = `
    SELECT
      CASE
        WHEN race_date >= CURRENT_DATE - INTERVAL '30 days' THEN '直近30日'
        WHEN race_date >= CURRENT_DATE - INTERVAL '90 days' THEN '30-90日前'
        ELSE '90日以上前'
      END as period,
      COUNT(*) as count,
      SUM(CASE WHEN hit IS TRUE THEN 1 ELSE 0 END) as win_count,
      ROUND(CAST(SUM(CASE WHEN hit IS TRUE THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0) * 100, 2) as hit_rate,
      ROUND(AVG(COALESCE(return_amount, 0)), 2) as avg_return,
      ROUND(CAST(SUM(COALESCE(return_amount, 0)) / NULLIF(COUNT(*) * 100, 0)) * 100, 2) as roi
    FROM boat_prediction_logs
    WHERE recommendation = 'buy'
      AND hit IS NOT NULL
      AND ((confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
       OR (confidence >= 10 AND venue NOT IN ('芦屋', '住之江') AND EXTRACT(month FROM race_date) NOT IN (4, 7, 10, 12)))
    GROUP BY period
    ORDER BY
      CASE
        WHEN period = '直近30日' THEN 1
        WHEN period = '30-90日前' THEN 2
        ELSE 3
      END;
  `;
  try {
    const freshnessRes = await client.query(freshnessQuery);
    results.freshness = freshnessRes.rows;
    console.log(JSON.stringify(freshnessRes.rows, null, 2));
  } catch (e) {
    console.log('(スキップ) データ鮮度別:', e.message);
  }
  console.log();

  // === 4. 月別ROI推移（過去12ヶ月） ===
  console.log('=== 4. 月別ROI推移（過去12ヶ月） ===');
  const monthlyQuery = `
    SELECT
      TO_CHAR(race_date, 'YYYY-MM') as month,
      COUNT(*) as count,
      SUM(CASE WHEN hit IS TRUE THEN 1 ELSE 0 END) as win_count,
      ROUND(CAST(SUM(CASE WHEN hit IS TRUE THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0) * 100, 2) as hit_rate,
      ROUND(AVG(COALESCE(return_amount, 0)), 2) as avg_return,
      ROUND(CAST(SUM(COALESCE(return_amount, 0)) / NULLIF(COUNT(*) * 100, 0)) * 100, 2) as roi
    FROM boat_prediction_logs
    WHERE recommendation = 'buy'
      AND hit IS NOT NULL
      AND race_date >= CURRENT_DATE - INTERVAL '12 months'
      AND ((confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
       OR (confidence >= 10 AND venue NOT IN ('芦屋', '住之江') AND EXTRACT(month FROM race_date) NOT IN (4, 7, 10, 12)))
    GROUP BY TO_CHAR(race_date, 'YYYY-MM')
    ORDER BY month DESC;
  `;
  try {
    const monthlyRes = await client.query(monthlyQuery);
    results.monthly = monthlyRes.rows;
    console.log(JSON.stringify(monthlyRes.rows, null, 2));
  } catch (e) {
    console.log('(スキップ) 月別ROI推移:', e.message);
  }
  console.log();

  // === 5. venue別ROI一覧（SIM-J対象、n>=20） ===
  console.log('=== 5. venue別ROI一覧（n>=20） ===');
  const venueQuery = `
    SELECT
      venue,
      COUNT(*) as count,
      SUM(CASE WHEN hit IS TRUE THEN 1 ELSE 0 END) as win_count,
      ROUND(CAST(SUM(CASE WHEN hit IS TRUE THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0) * 100, 2) as hit_rate,
      ROUND(AVG(COALESCE(return_amount, 0)), 2) as avg_return,
      ROUND(CAST(SUM(COALESCE(return_amount, 0)) / NULLIF(COUNT(*) * 100, 0)) * 100, 2) as roi
    FROM boat_prediction_logs
    WHERE recommendation = 'buy'
      AND hit IS NOT NULL
      AND ((confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
       OR (confidence >= 10 AND venue NOT IN ('芦屋', '住之江') AND EXTRACT(month FROM race_date) NOT IN (4, 7, 10, 12)))
    GROUP BY venue
    HAVING COUNT(*) >= 20
    ORDER BY roi DESC;
  `;
  try {
    const venueRes = await client.query(venueQuery);
    results.venue = venueRes.rows;
    console.log(JSON.stringify(venueRes.rows, null, 2));
  } catch (e) {
    console.log('(スキップ) venue別ROI:', e.message);
  }
  console.log();

  // === 追加分析：月別除外状況 ===
  console.log('=== 追加分析：除外月別パフォーマンス ===');
  const monthExclusionQuery = `
    SELECT
      EXTRACT(month FROM race_date)::int as month,
      COUNT(*) as count,
      SUM(CASE WHEN hit IS TRUE THEN 1 ELSE 0 END) as win_count,
      ROUND(CAST(SUM(CASE WHEN hit IS TRUE THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0) * 100, 2) as hit_rate,
      ROUND(CAST(SUM(COALESCE(return_amount, 0)) / NULLIF(COUNT(*) * 100, 0)) * 100, 2) as roi
    FROM boat_prediction_logs
    WHERE recommendation = 'buy'
      AND hit IS NOT NULL
      AND confidence >= 10 AND venue NOT IN ('芦屋', '住之江')
    GROUP BY EXTRACT(month FROM race_date)
    ORDER BY month;
  `;
  try {
    const monthExclusionRes = await client.query(monthExclusionQuery);
    results.monthExclusion = monthExclusionRes.rows;
    console.log(JSON.stringify(monthExclusionRes.rows, null, 2));
  } catch (e) {
    console.log('(スキップ) 月別除外状況:', e.message);
  }
  console.log();

  // === 最終結果をJSON出力 ===
  console.log('\n=== 最終結果 ===');
  console.log(JSON.stringify(results, null, 2));

} catch (error) {
  console.error('エラー詳細:', error);
  console.error('メッセージ:', error.message);
  if (error.code) console.error('エラーコード:', error.code);
  process.exit(1);
} finally {
  try {
    await client.end();
  } catch (e) {
    console.log('接続終了エラー:', e.message);
  }
}
