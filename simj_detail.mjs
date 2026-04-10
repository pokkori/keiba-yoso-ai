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

  // SIM-Jの実KPI DB（buy/skipが混在する全件）から
  // 3981件はすべてrecommendation='buy'? skip=0を確認
  const { rows: [tot] } = await client.query(
    "SELECT COUNT(*) AS total," +
    " COUNT(*) FILTER (WHERE recommendation='buy') AS buy_cnt," +
    " COUNT(*) FILTER (WHERE recommendation='skip') AS skip_cnt" +
    " FROM keirin_prediction_logs WHERE race_date >= '2026-01-01'"
  );
  console.log("=== SIM-J実データ（2026年以降）===");
  console.log("  total:", tot.total, " buy:", tot.buy_cnt, " skip:", tot.skip_cnt);

  // R番号別 詳細（2026年以降・buy全件）
  const { rows: byR } = await client.query(
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
    "   COUNT(*) AS cnt," +
    "   COUNT(*) FILTER (WHERE hit=true) AS hit_cnt," +
    "   ROUND(100.0 * SUM(return_amount) FILTER (WHERE hit=true) / (COUNT(*)*100), 1) AS roi" +
    " FROM keirin_prediction_logs" +
    " WHERE race_date >= '2026-01-01' AND recommendation='buy'" +
    " GROUP BY rno ORDER BY rno"
  );
  console.log("\n=== R番号別 ROI（2026年全BUY・gambling-kpiと同じ母集団）===");
  byR.forEach(r => {
    const skip = [1,7,8,10,11,12].includes(r.rno) ? " [SKIP対象]" : " [ALLOW]";
    console.log("  R" + r.rno + ": n=" + r.cnt + "  hit=" + r.hit_cnt + "  ROI=" + r.roi + "%" + skip);
  });

  // 会場別ROI (n>=10)
  const { rows: byVenue } = await client.query(
    "SELECT race_name AS vr," +
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
    "   COUNT(*) AS cnt," +
    "   COUNT(*) FILTER (WHERE hit=true) AS hit_cnt," +
    "   ROUND(100.0 * SUM(return_amount) FILTER (WHERE hit=true) / (COUNT(*)*100), 1) AS roi" +
    " FROM keirin_prediction_logs" +
    " WHERE race_date >= '2026-01-01' AND recommendation='buy'" +
    " GROUP BY vr, rno" +
    " HAVING COUNT(*) >= 15" +
    " ORDER BY roi DESC LIMIT 50"
  );
  console.log("\n=== venue×R別 ROI Top50 (n>=15, 2026年BUY) ===");
  byVenue.forEach(r => {
    const inSkipList = [1,7,8,10,11,12].includes(r.rno) ? " ***SKIP帯***" : "";
    console.log("  " + r.vr + ": n=" + r.cnt + "  hit=" + r.hit_cnt + "  ROI=" + r.roi + "%" + inSkipList);
  });

  // SKIP帯(R1,7,8,10,11,12)の中でROI>100%の会場（例外追加候補）
  const { rows: skipExcept } = await client.query(
    "SELECT race_name AS vr," +
    "   CASE" +
    "     WHEN race_name LIKE '%1R' THEN 1" +
    "     WHEN race_name LIKE '%7R' THEN 7" +
    "     WHEN race_name LIKE '%8R' THEN 8" +
    "     WHEN race_name LIKE '%10R' THEN 10" +
    "     WHEN race_name LIKE '%11R' THEN 11" +
    "     WHEN race_name LIKE '%12R' THEN 12" +
    "   END AS rno," +
    "   COUNT(*) AS cnt," +
    "   COUNT(*) FILTER (WHERE hit=true) AS hit_cnt," +
    "   ROUND(100.0 * SUM(return_amount) FILTER (WHERE hit=true) / (COUNT(*)*100), 1) AS roi" +
    " FROM keirin_prediction_logs" +
    " WHERE race_date >= '2026-01-01' AND recommendation='buy'" +
    "   AND (race_name LIKE '%1R' OR race_name LIKE '%7R' OR race_name LIKE '%8R'" +
    "     OR race_name LIKE '%10R' OR race_name LIKE '%11R' OR race_name LIKE '%12R')" +
    " GROUP BY vr, rno" +
    " HAVING COUNT(*) >= 10" +
    "   AND ROUND(100.0 * SUM(return_amount) FILTER (WHERE hit=true) / (COUNT(*)*100), 1) > 100" +
    " ORDER BY roi DESC"
  );
  console.log("\n=== SKIP帯でROI>100%の例外候補 (n>=10) ===");
  if (skipExcept.length === 0) console.log("  （なし）");
  else skipExcept.forEach(r =>
    console.log("  " + r.vr + ": n=" + r.cnt + "  hit=" + r.hit_cnt + "  ROI=" + r.roi + "%"));

  // SKIP_RACE対象外(R2-6,9)でROI>150%かつALLOWED_VENUES外の会場
  const ALLOWED = ["和歌山","宇都宮","熊本","久留米","小松島","四日市","静岡","取手","立川","川崎","大宮"];
  const placeholders = ALLOWED.map((_, i) => "$" + (i+1)).join(",");
  // まず全ALLOW帯の会場×R列
  const { rows: notAllowed } = await client.query(
    "SELECT race_name AS vr," +
    "   CASE" +
    "     WHEN race_name LIKE '%2R' THEN 2" +
    "     WHEN race_name LIKE '%3R' THEN 3" +
    "     WHEN race_name LIKE '%4R' THEN 4" +
    "     WHEN race_name LIKE '%5R' THEN 5" +
    "     WHEN race_name LIKE '%6R' THEN 6" +
    "     WHEN race_name LIKE '%9R' THEN 9" +
    "   END AS rno," +
    "   COUNT(*) AS cnt," +
    "   COUNT(*) FILTER (WHERE hit=true) AS hit_cnt," +
    "   ROUND(100.0 * SUM(return_amount) FILTER (WHERE hit=true) / (COUNT(*)*100), 1) AS roi" +
    " FROM keirin_prediction_logs" +
    " WHERE race_date >= '2026-01-01' AND recommendation='buy'" +
    "   AND (race_name LIKE '%2R' OR race_name LIKE '%3R' OR race_name LIKE '%4R'" +
    "     OR race_name LIKE '%5R' OR race_name LIKE '%6R' OR race_name LIKE '%9R')" +
    " GROUP BY vr, rno" +
    " HAVING COUNT(*) >= 15" +
    "   AND ROUND(100.0 * SUM(return_amount) FILTER (WHERE hit=true) / (COUNT(*)*100), 1) >= 130" +
    " ORDER BY roi DESC LIMIT 30"
  );
  console.log("\n=== ALLOW帯(R2-6,9)でROI>=130%の全会場×R（n>=15）===");
  console.log("  ※ALLOWED_VENUESに既に入ってるもの含む");
  notAllowed.forEach(r =>
    console.log("  " + r.vr + " R" + r.rno + ": n=" + r.cnt + "  hit=" + r.hit_cnt + "  ROI=" + r.roi + "%"));

  await client.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
