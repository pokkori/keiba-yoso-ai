import { Client } from "pg";
const client = new Client({
  host: "db.oufnfbecjkwfekpyszye.supabase.co", port: 5432,
  database: "postgres", user: "postgres", password: "rPPu22Z#.@dd9!a",
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
});
await client.connect();

const sql = `
  WITH parsed AS (
    SELECT 
      REGEXP_REPLACE(race_name, '[0-9]+R.*', '') as venue,
      CAST(SUBSTRING(race_name FROM '[0-9]+(?=R)') AS INT) as rno,
      return_amount
    FROM keirin_prediction_logs
    WHERE recommendation='buy' AND return_amount IS NOT NULL
      AND race_name ~ '.+[0-9]+R'
  )
  SELECT 
    venue, rno,
    COUNT(*) as n,
    COUNT(*) FILTER (WHERE return_amount > 0) as wins,
    ROUND(SUM(return_amount) * 100.0 / NULLIF(COUNT(*) * 100, 0), 0) as roi
  FROM parsed
  WHERE rno BETWEEN 1 AND 12
  GROUP BY venue, rno
  HAVING COUNT(*) >= 30
  ORDER BY roi DESC NULLS LAST
  LIMIT 30
`;
const { rows } = await client.query(sql);
rows.forEach(r => console.log(r.venue + " R" + r.rno + ": n=" + r.n + " wins=" + r.wins + " roi=" + r.roi + "%"));
await client.end();
