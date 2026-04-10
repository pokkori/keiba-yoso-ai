import { Client } from "pg";

const PG_CONFIG = {
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false },
};

async function run() {
  const client = new Client(PG_CONFIG);
  await client.connect();

  // ===== 競輪 =====
  // 1. 全体集計
  const { rows: kStats } = await client.query(`
    SELECT
      COUNT(*)                                         AS total,
      COUNT(*) FILTER (WHERE recommendation='buy')    AS buy_cnt,
      COUNT(*) FILTER (WHERE recommendation='skip')   AS skip_cnt,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true)        AS hit_cnt,
      SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return,
      MIN(race_date) AS from_date,
      MAX(race_date) AS to_date
    FROM keirin_prediction_logs
    WHERE race_id NOT LIKE '%test%';
  `);
  console.log("=== 競輪 全体 ===");
  const ks = kStats[0];
  const kInvested = Number(ks.eval_cnt) * 100;
  const kROI = kInvested > 0 ? (Number(ks.total_return) / kInvested * 100).toFixed(1) : '-';
  console.log(`  期間: ${ks.from_date} ~ ${ks.to_date}`);
  console.log(`  総件数: ${ks.total}  buy: ${ks.buy_cnt}  skip: ${ks.skip_cnt}`);
  console.log(`  スキップ率: ${(Number(ks.skip_cnt)/Number(ks.total)*100).toFixed(1)}%`);
  console.log(`  評価済: ${ks.eval_cnt}  的中: ${ks.hit_cnt}`);
  console.log(`  的中率: ${(Number(ks.hit_cnt)/Number(ks.eval_cnt)*100).toFixed(1)}%  ROI: ${kROI}%`);

  // 2. R番号別 (evaluation済みのみ)
  const { rows: kByR } = await client.query(`
    SELECT
      CASE
        WHEN race_name ~ '\d+R$' THEN REGEXP_REPLACE(race_name, '^.*(\d+)R$', '\1')::int
      END AS race_no,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true)        AS hit_cnt,
      SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return
    FROM keirin_prediction_logs
    WHERE race_id NOT LIKE '%test%'
    GROUP BY race_no
    HAVING COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) >= 10
    ORDER BY race_no;
  `);
  console.log("\n=== 競輪 R番号別 ROI (eval>=10) ===");
  kByR.forEach(r => {
    const invested = Number(r.eval_cnt) * 100;
    const roi = invested > 0 ? (Number(r.total_return) / invested * 100).toFixed(1) : '-';
    console.log(`  R${r.race_no}: eval=${r.eval_cnt}  hit=${r.hit_cnt}  ROI=${roi}%`);
  });

  // 3. venue×R別 (eval>=10, ROI>=100 の上位)
  const { rows: kVR } = await client.query(`
    SELECT
      REGEXP_REPLACE(race_name, '\d+R$','') AS venue,
      REGEXP_REPLACE(race_name, '^.*?(\d+)R$','\1')::int AS race_no,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true)        AS hit_cnt,
      SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return
    FROM keirin_prediction_logs
    WHERE race_id NOT LIKE '%test%'
    GROUP BY venue, race_no
    HAVING COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) >= 10
      AND SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) IS NOT NULL
    ORDER BY (SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) /
              (COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) * 100.0)) DESC
    LIMIT 40;
  `);
  console.log("\n=== 競輪 venue×R別 ROI Top40 (eval>=10) ===");
  kVR.forEach(r => {
    const invested = Number(r.eval_cnt) * 100;
    const roi = invested > 0 ? (Number(r.total_return) / invested * 100).toFixed(1) : '-';
    console.log(`  ${r.venue}R${r.race_no}: eval=${r.eval_cnt}  hit=${r.hit_cnt}  ROI=${roi}%`);
  });

  // 4. R11/R12のみ venue別
  const { rows: kR1112 } = await client.query(`
    SELECT
      REGEXP_REPLACE(race_name, '\d+R$','') AS venue,
      REGEXP_REPLACE(race_name, '^.*?(\d+)R$','\1')::int AS race_no,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true)        AS hit_cnt,
      SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return
    FROM keirin_prediction_logs
    WHERE race_id NOT LIKE '%test%'
      AND race_name ~ '1[12]R$'
    GROUP BY venue, race_no
    HAVING COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) >= 5
    ORDER BY (SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) /
              (COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) * 100.0)) DESC
    LIMIT 30;
  `);
  console.log("\n=== 競輪 R11/R12 venue別 ROI (eval>=5) ===");
  kR1112.forEach(r => {
    const invested = Number(r.eval_cnt) * 100;
    const roi = invested > 0 ? (Number(r.total_return) / invested * 100).toFixed(1) : '-';
    console.log(`  ${r.venue}R${r.race_no}: eval=${r.eval_cnt}  hit=${r.hit_cnt}  ROI=${roi}%`);
  });

  // 5. 競艇テーブル存在確認
  const { rows: tables } = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%boat%';
  `);
  console.log("\n=== 競艇テーブル名 ===");
  tables.forEach(t => console.log(`  ${t.tablename}`));

  await client.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
