import { Client } from "pg";
const PG_CONFIG = {
  host: "db.oufnfbecjkwfekpyszye.supabase.co", port: 5432,
  database: "postgres", user: "postgres", password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
};
const client = new Client(PG_CONFIG);
await client.connect();

const { rows } = await client.query(`
  SELECT race_name, race_date, recommendation, player_num, player_name, odds, confidence, ev, hit, return_amount, created_at
  FROM keirin_prediction_logs
  WHERE race_date::date = CURRENT_DATE
  ORDER BY created_at ASC
`);
console.log(`今日(${new Date().toLocaleDateString('ja-JP')})の競輪予想: ${rows.length}件`);
rows.forEach(r => {
  const status = r.hit === null ? '未確定' : (r.hit ? `的中(${r.return_amount}円)` : '外れ');
  console.log(`  [${r.recommendation}] ${r.race_name} #${r.player_num}${r.player_name} オッズ:${r.odds} conf:${r.confidence} ev:${r.ev} → ${status}`);
});

// 今日のbuy件数と時間帯
const { rows: buys } = await client.query(`
  SELECT COUNT(*) as total,
    COUNT(*) FILTER (WHERE recommendation='buy') as buys,
    COUNT(*) FILTER (WHERE recommendation='skip') as skips,
    MIN(created_at) as first, MAX(created_at) as last
  FROM keirin_prediction_logs
  WHERE race_date::date = CURRENT_DATE
`);
if (buys[0]) {
  const b = buys[0];
  console.log(`\n集計: 全${b.total}件 buy=${b.buys}件 skip=${b.skips}件`);
  console.log(`最初: ${b.first} 最後: ${b.last}`);
}
await client.end();
