import { Client } from "pg";
const PG_CONFIG = {
  host: "db.oufnfbecjkwfekpyszye.supabase.co", port: 5432,
  database: "postgres", user: "postgres", password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
};
const client = new Client(PG_CONFIG);
await client.connect();

// テーブル名確認
const { rows: tables } = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name LIKE '%boat%'
`);
console.log('boat系テーブル:', tables.map(r=>r.table_name).join(', '));

// カラム確認
const { rows: cols } = await client.query(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name='boat_prediction_logs' ORDER BY ordinal_position
`);
console.log('カラム:', cols.map(r=>r.column_name).join(', '));

// SIM-J対象の会場別ROI (n>=20)
const EXCLUDE_VENUES = ['芦屋', '住之江'];
const RESTORE_COMBOS = [['下関',7],['常滑',4],['常滑',12],['徳山',12],['津',10],['常滑',7],['下関',4],['大村',10],['大村',7]];
const SKIP_R = [4, 7, 10, 12];

const { rows: venueRows } = await client.query(`
  WITH base AS (
    SELECT 
      venue_name,
      CAST(NULLIF(REGEXP_REPLACE(race_no, '[^0-9]', '', 'g'), '') AS INT) as rno,
      hit, return_amount, odds, confidence
    FROM boat_prediction_logs
    WHERE recommendation = 'buy'
      AND race_id IS NOT NULL
  ),
  sim_j AS (
    SELECT *,
      CASE WHEN confidence IS NULL AND odds BETWEEN 1.5 AND 2.5 THEN 'sim5b'
           WHEN confidence IS NOT NULL AND confidence >= 10 
                AND venue_name NOT IN ('芦屋','住之江') THEN 'conf10'
           ELSE NULL END AS sim_type,
      (rno IN (4,7,10,12) AND NOT (
        (venue_name='下関' AND rno=7) OR (venue_name='常滑' AND rno=4) OR
        (venue_name='常滑' AND rno=12) OR (venue_name='徳山' AND rno=12) OR
        (venue_name='津' AND rno=10) OR (venue_name='常滑' AND rno=7) OR
        (venue_name='下関' AND rno=4) OR (venue_name='大村' AND rno=10) OR
        (venue_name='大村' AND rno=7)
      )) AS is_skip
    FROM base
  )
  SELECT 
    venue_name,
    COUNT(*) FILTER (WHERE hit IS NOT NULL AND sim_type IS NOT NULL AND NOT is_skip) as n,
    ROUND(SUM(return_amount) FILTER (WHERE hit=true AND sim_type IS NOT NULL AND NOT is_skip) * 100.0 / 
      NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL AND sim_type IS NOT NULL AND NOT is_skip) * 100, 0), 1) as roi,
    ROUND(100.0 * COUNT(*) FILTER (WHERE hit=true AND sim_type IS NOT NULL AND NOT is_skip) /
      NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL AND sim_type IS NOT NULL AND NOT is_skip), 0), 1) as hitrate
  FROM sim_j
  GROUP BY venue_name
  HAVING COUNT(*) FILTER (WHERE hit IS NOT NULL AND sim_type IS NOT NULL AND NOT is_skip) >= 20
  ORDER BY roi DESC NULLS LAST
`);
console.log('\n=== SIM-J対象 venue別ROI (n>=20) ===');
venueRows.forEach(r => console.log(`  ${r.venue_name}: n=${r.n} ROI=${r.roi}% hit=${r.hitrate}%`));

// 月別ROI (直近6ヶ月)
const { rows: monthRows } = await client.query(`
  SELECT 
    DATE_TRUNC('month', race_date::date) as month,
    COUNT(*) FILTER (WHERE hit IS NOT NULL) as n,
    ROUND(SUM(return_amount) FILTER (WHERE hit=true) * 100.0 / NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL) * 100, 0), 1) as roi
  FROM boat_prediction_logs
  WHERE recommendation='buy'
    AND (
      (confidence IS NULL AND odds BETWEEN 1.5 AND 2.5)
      OR (confidence IS NOT NULL AND confidence >= 10 AND venue_name NOT IN ('芦屋','住之江'))
    )
    AND NOT (CAST(NULLIF(REGEXP_REPLACE(race_no,'[^0-9]','','g'),'') AS INT) IN (4,7,10,12)
      AND NOT (
        (venue_name='下関' AND CAST(NULLIF(REGEXP_REPLACE(race_no,'[^0-9]','','g'),'') AS INT)=7) OR
        (venue_name='常滑' AND CAST(NULLIF(REGEXP_REPLACE(race_no,'[^0-9]','','g'),'') AS INT)=4) OR
        (venue_name='常滑' AND CAST(NULLIF(REGEXP_REPLACE(race_no,'[^0-9]','','g'),'') AS INT)=12) OR
        (venue_name='徳山' AND CAST(NULLIF(REGEXP_REPLACE(race_no,'[^0-9]','','g'),'') AS INT)=12) OR
        (venue_name='津' AND CAST(NULLIF(REGEXP_REPLACE(race_no,'[^0-9]','','g'),'') AS INT)=10) OR
        (venue_name='常滑' AND CAST(NULLIF(REGEXP_REPLACE(race_no,'[^0-9]','','g'),'') AS INT)=7) OR
        (venue_name='下関' AND CAST(NULLIF(REGEXP_REPLACE(race_no,'[^0-9]','','g'),'') AS INT)=4) OR
        (venue_name='大村' AND CAST(NULLIF(REGEXP_REPLACE(race_no,'[^0-9]','','g'),'') AS INT)=10) OR
        (venue_name='大村' AND CAST(NULLIF(REGEXP_REPLACE(race_no,'[^0-9]','','g'),'') AS INT)=7)
      )
    )
  GROUP BY 1
  ORDER BY 1 DESC
  LIMIT 8
`);
console.log('\n=== 月別ROI (SIM-J対象) ===');
monthRows.forEach(r => console.log(`  ${r.month?.toISOString()?.slice(0,7)}: n=${r.n} ROI=${r.roi}%`));

await client.end();
