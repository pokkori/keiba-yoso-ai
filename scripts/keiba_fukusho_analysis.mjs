import { Client } from "pg";

const PG_CONFIG = {
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
};

const client = new Client(PG_CONFIG);
await client.connect();

console.log("=== ハンデ戦×重馬場 複勝分析 ===");
const { rows: r1 } = await client.query(`
  SELECT
    bet_type,
    COUNT(*) FILTER (WHERE recommendation='buy') AS buy_cnt,
    COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt,
    COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_cnt,
    SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return,
    COUNT(*) * 100 AS total_invested
  FROM keiba_prediction_logs
  WHERE
    raw_input::text ILIKE '%ハンデ%'
    AND (raw_input::text ILIKE '%重%' OR raw_input::text ILIKE '%不良%')
    AND recommendation='buy'
  GROUP BY bet_type
`);
console.table(r1);

console.log("\n=== 複勝オッズ帯別 回収率 ===");
const { rows: r2 } = await client.query(`
  SELECT
    CASE
      WHEN return_amount >= 400 AND return_amount < 500 THEN '4.0-5.0倍'
      WHEN return_amount >= 300 AND return_amount < 400 THEN '3.0-4.0倍'
      WHEN return_amount >= 200 AND return_amount < 300 THEN '2.0-3.0倍'
      WHEN return_amount >= 500 THEN '5.0倍以上'
      ELSE '2.0倍未満'
    END AS odds_range,
    COUNT(*) AS cnt,
    SUM(return_amount) AS total_return,
    COUNT(*) * 100 AS total_invested,
    ROUND(SUM(return_amount)::numeric / NULLIF(COUNT(*) * 100, 0) * 100, 1) AS roi_pct
  FROM keiba_prediction_logs
  WHERE recommendation='buy' AND hit=true AND bet_type ILIKE '%複勝%'
  GROUP BY 1
  ORDER BY 1
`);
console.table(r2);

console.log("\n=== 全体の賭け種別内訳 ===");
const { rows: r3 } = await client.query(`
  SELECT bet_type, COUNT(*) AS cnt,
    COUNT(*) FILTER (WHERE hit=true) AS hits,
    ROUND(COUNT(*) FILTER (WHERE hit=true)::numeric / NULLIF(COUNT(*),0)*100,1) AS hit_rate,
    SUM(return_amount) FILTER (WHERE hit=true) AS total_return,
    COUNT(*) * 100 AS total_invested,
    ROUND(SUM(return_amount) FILTER (WHERE hit=true)::numeric / NULLIF(COUNT(*)*100,0)*100,1) AS roi
  FROM keiba_prediction_logs
  WHERE recommendation='buy' AND hit IS NOT NULL
  GROUP BY bet_type
  ORDER BY cnt DESC
`);
console.table(r3);

console.log("\n=== ハンデ戦データあるか確認 ===");
const { rows: r4 } = await client.query(`
  SELECT COUNT(*) FROM keiba_prediction_logs WHERE raw_input::text ILIKE '%ハンデ%'
`);
console.log("ハンデ戦件数:", r4[0].count);

const { rows: r5 } = await client.query(`
  SELECT COUNT(*) FROM keiba_prediction_logs WHERE raw_input IS NOT NULL
`);
console.log("raw_input有り件数:", r5[0].count);

await client.end();
