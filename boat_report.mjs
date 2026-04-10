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

  // スキーマ確認
  const { rows: schema } = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns" +
    " WHERE table_name='boat_prediction_logs' ORDER BY ordinal_position"
  );
  console.log("=== boat_prediction_logs スキーマ ===");
  schema.forEach(c => console.log("  " + c.column_name + ": " + c.data_type));

  // 全体集計
  const { rows: [bs] } = await client.query(
    "SELECT COUNT(*) AS total," +
    " COUNT(*) FILTER (WHERE recommendation='buy') AS buy_cnt," +
    " COUNT(*) FILTER (WHERE recommendation='skip') AS skip_cnt," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_cnt," +
    " SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return," +
    " MIN(race_date) AS from_date, MAX(race_date) AS to_date" +
    " FROM boat_prediction_logs WHERE race_id NOT LIKE '%test%'"
  );
  const inv = Number(bs.eval_cnt)*100;
  const roi = inv>0?(Number(bs.total_return)/inv*100).toFixed(1):'-';
  console.log("\n=== 競艇 全体 ===");
  console.log("  期間:", bs.from_date, "~", bs.to_date);
  console.log("  総件数:", bs.total, " buy:", bs.buy_cnt, " skip:", bs.skip_cnt);
  console.log("  スキップ率:", (Number(bs.skip_cnt)/Number(bs.total)*100).toFixed(1) + "%");
  console.log("  eval:", bs.eval_cnt, " hit:", bs.hit_cnt, " ROI:", roi + "%");

  // サンプル確認（oddsカラム有無）
  const { rows: samp } = await client.query(
    "SELECT race_name, race_id, recommendation, hit, return_amount, odds, confidence" +
    " FROM boat_prediction_logs LIMIT 5"
  );
  console.log("\n=== サンプル ===");
  samp.forEach(r => console.log("  " + JSON.stringify(r)));

  // オッズ帯別
  const { rows: oddsBand } = await client.query(
    "SELECT" +
    "   CASE" +
    "     WHEN odds IS NULL THEN 'null'" +
    "     WHEN odds < 1.3 THEN '<1.3'" +
    "     WHEN odds < 2.5 THEN '1.3-2.5(現行)'" +
    "     WHEN odds < 3.5 THEN '2.5-3.5(拡張案)'" +
    "     WHEN odds < 5.0 THEN '3.5-5.0'" +
    "     ELSE '5.0+'" +
    "   END AS band," +
    "   COUNT(*) FILTER (WHERE recommendation='buy') AS buy_n," +
    "   COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_n," +
    "   COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_n," +
    "   SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return" +
    " FROM boat_prediction_logs WHERE race_id NOT LIKE '%test%'" +
    " GROUP BY band ORDER BY band"
  );
  console.log("\n=== 競艇 オッズ帯別 ROI ===");
  oddsBand.forEach(r => {
    const inv2 = Number(r.eval_n)*100;
    const roi2 = inv2>0?(Number(r.total_return)/inv2*100).toFixed(1):'-';
    console.log("  [" + r.band + "] buy=" + r.buy_n + " eval=" + r.eval_n + " hit=" + r.hit_n + " ROI=" + roi2 + "%");
  });

  // R番号別
  const { rows: byRB } = await client.query(
    "SELECT" +
    "   CASE" +
    "     WHEN race_name LIKE '%1R' THEN 1" +
    "     WHEN race_name LIKE '%2R' THEN 2" +
    "     WHEN race_name LIKE '%3R' THEN 3" +
    "     WHEN race_name LIKE '%4R' THEN 4" +
    "     WHEN race_name LIKE '%5R' THEN 5" +
    "     WHEN race_name LIKE '%6R' THEN 6" +
    "     WHEN race_name LIKE '%7R' THEN 7" +
    "     WHEN race_name LIKE '%8R' THEN 8" +
    "     WHEN race_name LIKE '%9R' THEN 9" +
    "     WHEN race_name LIKE '%10R' THEN 10" +
    "     WHEN race_name LIKE '%11R' THEN 11" +
    "     WHEN race_name LIKE '%12R' THEN 12" +
    "   END AS rno," +
    "   COUNT(*) FILTER (WHERE recommendation='buy') AS buy_n," +
    "   COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_n," +
    "   COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_n," +
    "   SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return" +
    " FROM boat_prediction_logs WHERE race_id NOT LIKE '%test%'" +
    " GROUP BY rno" +
    " HAVING COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL)>=5" +
    " ORDER BY rno"
  );
  console.log("\n=== 競艇 R番号別 ROI ===");
  byRB.forEach(r => {
    const inv2 = Number(r.eval_n)*100;
    const roi2 = inv2>0?(Number(r.total_return)/inv2*100).toFixed(1):'-';
    console.log("  R" + r.rno + ": buy=" + r.buy_n + " eval=" + r.eval_n + " hit=" + r.hit_n + " ROI=" + roi2 + "%");
  });

  // 会場別 ROI (eval>=20)
  const { rows: venueB } = await client.query(
    "SELECT race_name," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_n," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_n," +
    " SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return" +
    " FROM boat_prediction_logs WHERE race_id NOT LIKE '%test%'" +
    " GROUP BY race_name" +
    " HAVING COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL)>=20" +
    " ORDER BY" +
    " (SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true)" +
    "  / (COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL)*100.0)) DESC" +
    " LIMIT 30"
  );
  console.log("\n=== 競艇 会場別 ROI Top30 (eval>=20) ===");
  venueB.forEach(r => {
    const inv2 = Number(r.eval_n)*100;
    const roi2 = inv2>0?(Number(r.total_return)/inv2*100).toFixed(1):'-';
    console.log("  " + r.race_name + ": eval=" + r.eval_n + " hit=" + r.hit_n + " ROI=" + roi2 + "%");
  });

  // conf帯別
  const { rows: confB } = await client.query(
    "SELECT confidence," +
    " COUNT(*) FILTER (WHERE recommendation='buy') AS buy_n," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_n," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_n," +
    " SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return" +
    " FROM boat_prediction_logs WHERE race_id NOT LIKE '%test%'" +
    " GROUP BY confidence ORDER BY confidence"
  );
  console.log("\n=== 競艇 conf別 ROI ===");
  confB.forEach(r => {
    const inv2 = Number(r.eval_n)*100;
    const roi2 = inv2>0?(Number(r.total_return)/inv2*100).toFixed(1):'-';
    console.log("  conf=" + r.confidence + ": buy=" + r.buy_n + " eval=" + r.eval_n + " hit=" + r.hit_n + " ROI=" + roi2 + "%");
  });

  await client.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
