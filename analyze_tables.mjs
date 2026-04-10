import { Client } from "pg";

const PG_CONFIG = {
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false },
};

async function analyzeTables() {
  const client = new Client(PG_CONFIG);
  try {
    await client.connect();

    // スキーマ確認
    const keirin_schema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='keirin_prediction_logs' 
      ORDER BY ordinal_position;
    `);
    console.log("=== keirin_prediction_logs Schema ===");
    keirin_schema.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // サンプルデータ確認（race_name形式）
    const keirin_sample = await client.query(`
      SELECT race_name, race_no, venue_name 
      FROM keirin_prediction_logs 
      LIMIT 5;
    `);
    console.log("\n=== keirin_prediction_logs Sample (race_name format) ===");
    keirin_sample.rows.forEach(r => {
      console.log(`  race_name="${r.race_name}" | race_no=${r.race_no} | venue="${r.venue_name}"`);
    });

    const boatrace_schema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='boatrace_prediction_logs' 
      ORDER BY ordinal_position;
    `);
    console.log("\n=== boatrace_prediction_logs Schema ===");
    boatrace_schema.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    const boatrace_sample = await client.query(`
      SELECT race_name, race_no, venue_name, odds
      FROM boatrace_prediction_logs 
      LIMIT 5;
    `);
    console.log("\n=== boatrace_prediction_logs Sample ===");
    boatrace_sample.rows.forEach(r => {
      console.log(`  race_name="${r.race_name}" | race_no=${r.race_no} | venue="${r.venue_name}" | odds=${r.odds}`);
    });

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

analyzeTables();
