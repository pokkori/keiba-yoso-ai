import pg from 'pg';
const { Client } = pg;
const client = new Client({
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432, database: "postgres", user: "postgres",
  password: "rPPu22Z#.@dd9!a", ssl: { rejectUnauthorized: false }
});
await client.connect();

// 競艇: 会場×オッズ帯×R番号の最適な組み合わせ
// 1.2-1.5 conf_ok帯の会場別ROI（最も件数多い帯）
const r1 = await client.query(`
  SELECT venue,
    count(*) as cnt,
    round(avg(CASE WHEN return_amount > 0 THEN 1.0 ELSE 0 END)*100,1) as hit_rate,
    round(sum(return_amount)::numeric / (count(*)*100) * 100, 1) as roi
  FROM boat_prediction_logs
  WHERE recommendation='buy' AND confidence IS NOT NULL AND odds BETWEEN 1.2 AND 1.5
  GROUP BY venue HAVING count(*) >= 20
  ORDER BY roi DESC
`);
console.log('=== 競艇 1.2-1.5倍 conf_ok 会場別ROI ===');
r1.rows.forEach(r => console.log(`${r.venue}: ${r.cnt}件 ${r.hit_rate}% ROI${r.roi}%`));

// R番号別ROI（全体）
const r2 = await client.query(`
  WITH rno AS (
    SELECT *, 
      CAST(SUBSTRING(SPLIT_PART(race_id, '-', 4), 2) AS INTEGER) as race_num
    FROM boat_prediction_logs
    WHERE recommendation='buy' AND race_id ~ '^boatv'
  )
  SELECT race_num,
    count(*) as cnt,
    round(avg(CASE WHEN return_amount > 0 THEN 1.0 ELSE 0 END)*100,1) as hit_rate,
    round(sum(return_amount)::numeric / (count(*)*100) * 100, 1) as roi
  FROM rno
  WHERE race_num BETWEEN 1 AND 12
  GROUP BY race_num
  ORDER BY race_num
`);
console.log('\n=== 競艇 R番号別ROI ===');
r2.rows.forEach(r => console.log(`R${r.race_num}: ${r.cnt}件 ${r.hit_rate}% ROI${r.roi}%`));

// confidence=16帯の詳細 venue別
const r3 = await client.query(`
  SELECT venue, 
    count(*) as cnt,
    round(avg(CASE WHEN return_amount > 0 THEN 1.0 ELSE 0 END)*100,1) as hit_rate,
    round(sum(return_amount)::numeric / (count(*)*100) * 100, 1) as roi
  FROM boat_prediction_logs
  WHERE recommendation='buy' AND confidence=16
  GROUP BY venue HAVING count(*) >= 10
  ORDER BY roi DESC LIMIT 15
`);
console.log('\n=== 競艇 confidence=16 会場別ROI ===');
r3.rows.forEach(r => console.log(`${r.venue}: ${r.cnt}件 ${r.hit_rate}% ROI${r.roi}%`));

// 競輪: confidence=3 詳細分析
const k1 = await client.query(`
  SELECT 
    CASE
      WHEN race_id ~ '^keirinv'
        THEN CAST(SUBSTRING(race_id FROM '([0-9]{4})$') AS INTEGER)
      WHEN race_id ~ '-R?[0-9]+$'
        THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
      ELSE NULL
    END AS rno,
    count(*) as cnt,
    round(avg(CASE WHEN hit=true THEN 1.0 ELSE 0 END)*100,1) as hit_rate,
    round(sum(return_amount)::numeric / (count(*)*600) * 100, 1) as roi
  FROM keirin_prediction_logs
  WHERE recommendation='buy' AND confidence=3
    AND race_id ~ '^(keirinv|[a-z].*-2026-)'
    AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
  GROUP BY rno
  HAVING count(*) >= 20
  ORDER BY rno
`);
console.log('\n=== 競輪 confidence=3 R番号別ROI ===');
k1.rows.forEach(r => console.log(`R${r.rno}: ${r.cnt}件 ${r.hit_rate}% ROI${r.roi}%`));

await client.end();
