import pg from 'pg';
const { Client } = pg;
const client = new Client({
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432, database: "postgres", user: "postgres",
  password: "rPPu22Z#.@dd9!a", ssl: { rejectUnauthorized: false }
});
await client.connect();
const r = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
console.log('テーブル一覧:', r.rows.map(x=>x.table_name).join(', '));
await client.end();
