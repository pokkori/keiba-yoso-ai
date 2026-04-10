import pg from 'pg';
const { Client } = pg;
const client = new Client({
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432, database: "postgres", user: "postgres",
  password: "rPPu22Z#.@dd9!a", ssl: { rejectUnauthorized: false }
});
await client.connect();

// 競輪: confidenceとevの充足状況
const k1 = await client.query(`
  SELECT 
    count(*) FILTER(WHERE confidence IS NOT NULL) as conf_count,
    count(*) FILTER(WHERE ev IS NOT NULL) as ev_count,
    count(*) FILTER(WHERE odds IS NOT NULL) as odds_count,
    count(*) FILTER(WHERE hit IS NOT NULL) as hit_count,
    count(*) as total,
    race_date::date >= '2026-01-01' as recent
  FROM keirin_prediction_logs 
  WHERE recommendation='buy'
  GROUP BY race_date::date >= '2026-01-01'
`);
console.log('=== 競輪 ===', k1.rows);

// 競輪 最近のデータ
const k2 = await client.query(`
  SELECT race_date, confidence, ev, odds, hit, return_amount
  FROM keirin_prediction_logs 
  WHERE recommendation='buy' AND race_date >= '2026-01-01'
  ORDER BY race_date DESC LIMIT 5
`);
console.log('競輪最新5件:', k2.rows);

// 競艇: confidenceの分布
const b1 = await client.query(`
  SELECT 
    count(*) FILTER(WHERE confidence IS NOT NULL) as conf_count,
    count(*) FILTER(WHERE hit IS NOT NULL AND actual_rank IS NOT NULL) as hit_count,
    count(*) FILTER(WHERE return_amount > 0) as win_count,
    min(race_date), max(race_date), count(*) as total
  FROM boat_prediction_logs 
  WHERE recommendation='buy'
`);
console.log('=== 競艇 ===', b1.rows);

// 競艇 confidenceの分布
const b2 = await client.query(`
  SELECT confidence, count(*), 
    round(avg(CASE WHEN return_amount > 0 THEN 1.0 ELSE 0 END)*100, 1) as hit_rate
  FROM boat_prediction_logs 
  WHERE recommendation='buy' AND confidence IS NOT NULL
  GROUP BY confidence ORDER BY confidence
`);
console.log('競艇 confidence別的中率:', b2.rows);

// 競艇 odds帯別
const b3 = await client.query(`
  SELECT 
    CASE 
      WHEN odds < 1.2 THEN '<1.2'
      WHEN odds < 1.5 THEN '1.2-1.5'
      WHEN odds < 2.0 THEN '1.5-2.0'
      ELSE '2.0+'
    END as odds_band,
    count(*),
    round(avg(CASE WHEN return_amount > 0 THEN 1.0 ELSE 0 END)*100, 1) as hit_rate,
    round(avg(return_amount) * avg(CASE WHEN return_amount > 0 THEN 1.0 ELSE 0 END) / 100, 3) as roi
  FROM boat_prediction_logs 
  WHERE recommendation='buy' AND odds IS NOT NULL
  GROUP BY odds_band ORDER BY odds_band
`);
console.log('競艇 オッズ帯別:', b3.rows);

await client.end();
