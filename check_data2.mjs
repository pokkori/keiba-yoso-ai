import pg from 'pg';
const { Client } = pg;
const client = new Client({
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432, database: "postgres", user: "postgres",
  password: "rPPu22Z#.@dd9!a", ssl: { rejectUnauthorized: false }
});
await client.connect();

// 競輪: EVが記録されたデータ状況+KPIスクリプトと同じ絞り込みを調査
const k1 = await client.query(`
  SELECT 
    race_date::date,
    count(*) FILTER(WHERE recommendation='buy') as buy,
    count(*) FILTER(WHERE recommendation='buy' AND hit IS NOT NULL) as buy_with_hit,
    count(*) FILTER(WHERE recommendation='buy' AND return_amount > 0) as wins,
    round(sum(CASE WHEN recommendation='buy' THEN return_amount ELSE 0 END)::numeric / 
          nullif(count(*) FILTER(WHERE recommendation='buy'),0) / 100 * 100, 1) as roi
  FROM keirin_prediction_logs
  WHERE race_date >= '2026-01-07'
  GROUP BY race_date::date
  ORDER BY race_date::date DESC
  LIMIT 15
`);
console.log('=== 競輪 直近レース別KPI ===');
k1.rows.forEach(r => console.log(`${r.race_date.toISOString().slice(0,10)}: buy=${r.buy} hit=${r.buy_with_hit} win=${r.wins} roi=${r.roi}%`));

// 競輪 confidence別の実績
const k2 = await client.query(`
  SELECT confidence, 
    count(*) as total,
    count(*) FILTER(WHERE hit=true) as wins,
    round(avg(CASE WHEN hit=true THEN 1.0 ELSE 0 END)*100,1) as hit_rate,
    round(sum(return_amount)::numeric / nullif(count(*),0) / 100 * 100, 1) as roi
  FROM keirin_prediction_logs
  WHERE recommendation='buy' AND race_date >= '2026-01-07' AND confidence IS NOT NULL
  GROUP BY confidence
  ORDER BY confidence DESC
`);
console.log('\n=== 競輪 confidence別実績 ===');
k2.rows.forEach(r => console.log(`conf=${r.confidence}: ${r.total}件 的中率${r.hit_rate}% ROI${r.roi}%`));

// 競艇 信頼度=16のみに絞ったROI改善試算
const b1 = await client.query(`
  SELECT 
    CASE 
      WHEN odds >= 2.0 THEN '>=2.0'
      WHEN odds >= 1.5 THEN '1.5-2.0'
      WHEN odds >= 1.2 THEN '1.2-1.5'
      ELSE '<1.2'
    END as band,
    count(*) as cnt,
    round(avg(CASE WHEN return_amount > 0 THEN 1.0 ELSE 0 END)*100,1) as hit_rate,
    round(sum(return_amount)::numeric / (count(*)*100) * 100, 1) as roi
  FROM boat_prediction_logs
  WHERE recommendation='buy' AND race_date >= '2025-10-15'
  GROUP BY band
  ORDER BY band
`);
console.log('\n=== 競艇 オッズ帯別ROI（全期間） ===');
b1.rows.forEach(r => console.log(`${r.band}: ${r.cnt}件 的中${r.hit_rate}% ROI${r.roi}%`));

// 競艇 2.0倍未満のみで回収率試算
const b2 = await client.query(`
  SELECT 
    count(*) as cnt,
    round(sum(return_amount)::numeric / (count(*)*100) * 100, 1) as roi,
    round(avg(CASE WHEN return_amount > 0 THEN 1.0 ELSE 0 END)*100,1) as hit_rate
  FROM boat_prediction_logs
  WHERE recommendation='buy' AND odds < 2.0
`);
console.log('\n=== 競艇 2.0倍未満のみのROI ===');
b2.rows.forEach(r => console.log(`${r.cnt}件 的中${r.hit_rate}% ROI${r.roi}%`));

// 競艇 1.5-2.0倍で会場別
const b3 = await client.query(`
  SELECT venue, count(*) as cnt,
    round(avg(CASE WHEN return_amount > 0 THEN 1.0 ELSE 0 END)*100,1) as hit_rate,
    round(sum(return_amount)::numeric / (count(*)*100) * 100, 1) as roi
  FROM boat_prediction_logs
  WHERE recommendation='buy' AND odds BETWEEN 1.5 AND 2.0
  GROUP BY venue HAVING count(*) >= 10
  ORDER BY roi DESC
  LIMIT 15
`);
console.log('\n=== 競艇 1.5-2.0倍帯 会場別ROI ===');
b3.rows.forEach(r => console.log(`${r.venue}: ${r.cnt}件 ${r.hit_rate}% ROI${r.roi}%`));

await client.end();
