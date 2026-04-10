import pg from 'pg';
const { Client } = pg;
const client = new Client({
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432, database: "postgres", user: "postgres",
  password: "rPPu22Z#.@dd9!a", ssl: { rejectUnauthorized: false }
});
await client.connect();

for (const tbl of ['keiba_prediction_logs', 'keirin_prediction_logs', 'boat_prediction_logs']) {
  const r = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='${tbl}' ORDER BY ordinal_position`);
  console.log(`\n=== ${tbl} ===`);
  r.rows.forEach(x => console.log(`  ${x.column_name}: ${x.data_type}`));
  const s = await client.query(`SELECT * FROM ${tbl} WHERE recommendation='buy' LIMIT 1`);
  if (s.rows.length > 0) console.log('サンプル:', JSON.stringify(s.rows[0], null, 2));
  const cnt = await client.query(`SELECT recommendation, count(*) FROM ${tbl} GROUP BY recommendation`);
  console.log('件数:', cnt.rows);
}

await client.end();
