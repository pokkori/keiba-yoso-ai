import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false }
});

await client.connect();

const r1 = await client.query(`
  SELECT table_name, column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name IN ('ai_keirin_backtest', 'ai_boatrace_backtest', 'ai_keiba_backtest')
  ORDER BY table_name, ordinal_position
`);
console.log('=== テーブルカラム ===');
for (const row of r1.rows) {
  console.log(`${row.table_name}: ${row.column_name} (${row.data_type})`);
}

const r2 = await client.query(`SELECT * FROM ai_keirin_backtest WHERE recommendation='buy' LIMIT 1`);
console.log('\n=== 競輪サンプル ===\n', JSON.stringify(r2.rows[0], null, 2));

const r3 = await client.query(`SELECT * FROM ai_boatrace_backtest WHERE recommendation='buy' LIMIT 1`);
console.log('\n=== 競艇サンプル ===\n', JSON.stringify(r3.rows[0], null, 2));

const r4 = await client.query(`SELECT * FROM ai_keiba_backtest WHERE recommendation='buy' LIMIT 1`);
console.log('\n=== 競馬サンプル ===\n', JSON.stringify(r4.rows[0], null, 2));

await client.end();
