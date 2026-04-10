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

  // 全体集計
  const { rows: [ks] } = await client.query(
    "SELECT COUNT(*) AS total," +
    " COUNT(*) FILTER (WHERE recommendation='buy') AS buy_cnt," +
    " COUNT(*) FILTER (WHERE recommendation='skip') AS skip_cnt," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_cnt," +
    " SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return," +
    " MIN(race_date) AS from_date, MAX(race_date) AS to_date" +
    " FROM keirin_prediction_logs WHERE race_id NOT LIKE '%test%'"
  );
  const kInvested = Number(ks.eval_cnt) * 100;
  const kROI = kInvested > 0 ? (Number(ks.total_return) / kInvested * 100).toFixed(1) : '-';
  console.log("=== 競輪 全体 ===");
  console.log("  期間:", ks.from_date, "~", ks.to_date);
  console.log("  総件数:", ks.total, " buy:", ks.buy_cnt, " skip:", ks.skip_cnt);
  console.log("  スキップ率:", (Number(ks.skip_cnt)/Number(ks.total)*100).toFixed(1) + "%");
  console.log("  eval:", ks.eval_cnt, " hit:", ks.hit_cnt, " ROI:", kROI + "%");

  // R番号別
  const { rows: byR } = await client.query(
    "SELECT" +
    " CASE" +
    "   WHEN race_name LIKE '%1R' THEN 1" +
    "   WHEN race_name LIKE '%2R' THEN 2" +
    "   WHEN race_name LIKE '%3R' THEN 3" +
    "   WHEN race_name LIKE '%4R' THEN 4" +
    "   WHEN race_name LIKE '%5R' THEN 5" +
    "   WHEN race_name LIKE '%6R' THEN 6" +
    "   WHEN race_name LIKE '%7R' THEN 7" +
    "   WHEN race_name LIKE '%8R' THEN 8" +
    "   WHEN race_name LIKE '%9R' THEN 9" +
    "   WHEN race_name LIKE '%10R' THEN 10" +
    "   WHEN race_name LIKE '%11R' THEN 11" +
    "   WHEN race_name LIKE '%12R' THEN 12" +
    " END AS rno," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_cnt," +
    " SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return" +
    " FROM keirin_prediction_logs WHERE race_id NOT LIKE '%test%'" +
    " GROUP BY rno HAVING COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL)>=10" +
    " ORDER BY rno"
  );
  console.log("\n=== 競輪 R番号別 ROI ===");
  byR.forEach(r => {
    const inv = Number(r.eval_cnt)*100;
    const roi = inv>0?(Number(r.total_return)/inv*100).toFixed(1):'-';
    console.log("  R" + r.rno + ": eval=" + r.eval_cnt + "  hit=" + r.hit_cnt + "  ROI=" + roi + "%");
  });

  // venue×R別 Top40
  const { rows: vr } = await client.query(
    "SELECT race_name," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_cnt," +
    " SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return" +
    " FROM keirin_prediction_logs WHERE race_id NOT LIKE '%test%'" +
    " GROUP BY race_name" +
    " HAVING COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL)>=10" +
    "   AND SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) IS NOT NULL" +
    " ORDER BY (SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true)" +
    "  / (COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL)*100.0)) DESC" +
    " LIMIT 40"
  );
  console.log("\n=== 競輪 race_name別 ROI Top40 ===");
  vr.forEach(r => {
    const inv = Number(r.eval_cnt)*100;
    const roi = inv>0?(Number(r.total_return)/inv*100).toFixed(1):'-';
    console.log("  " + r.race_name + ": eval=" + r.eval_cnt + "  hit=" + r.hit_cnt + "  ROI=" + roi + "%");
  });

  // R11/R12 別
  const { rows: r1112 } = await client.query(
    "SELECT race_name," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL) AS eval_cnt," +
    " COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit_cnt," +
    " SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS total_return" +
    " FROM keirin_prediction_logs WHERE race_id NOT LIKE '%test%'" +
    "   AND (race_name LIKE '%11R' OR race_name LIKE '%12R')" +
    " GROUP BY race_name" +
    " HAVING COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL)>=5" +
    " ORDER BY (SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true)" +
    "  / (COUNT(*) FILTER (WHERE recommendation='buy' AND hit IS NOT NULL)*100.0)) DESC" +
    " LIMIT 30"
  );
  console.log("\n=== 競輪 R11/R12 ROI Top30 ===");
  r1112.forEach(r => {
    const inv = Number(r.eval_cnt)*100;
    const roi = inv>0?(Number(r.total_return)/inv*100).toFixed(1):'-';
    console.log("  " + r.race_name + ": eval=" + r.eval_cnt + "  hit=" + r.hit_cnt + "  ROI=" + roi + "%");
  });

  // 競艇テーブル確認
  const { rows: tbl } = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public'"
  );
  console.log("\n=== 全テーブル一覧 ===");
  tbl.forEach(t => console.log("  " + t.tablename));

  await client.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
