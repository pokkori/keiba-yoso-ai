import { Client } from "pg";
const PG_CONFIG = {
  host: "db.oufnfbecjkwfekpyszye.supabase.co",
  port: 5432, database: "postgres", user: "postgres",
  password: "rPPu22Z#.@dd9!a", ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
};
function rr(ret, n, unit=600) { return n===0?"-":((ret/(n*unit))*100).toFixed(1)+"%"; }

async function run() {
  const client = new Client(PG_CONFIG);
  await client.connect();

  // ===== 競輪: 全会場×R番号クロス集計 =====
  console.log("\n===== 競輪: 全会場×R番号ROI（ROI>=130%のみ） =====");
  const { rows: keirinCross } = await client.query(`
    WITH base AS (
      SELECT *,
        SPLIT_PART(race_name, ' ', 1) AS venue_name,
        CASE
          WHEN race_id ~ '-R?[0-9]+$' THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
          ELSE NULL END AS rno
      FROM keirin_prediction_logs
      WHERE recommendation='buy'
        AND race_id ~ '^[a-z].*-202[56]-'
        AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
    )
    SELECT venue_name, rno,
      COUNT(*) FILTER (WHERE hit IS NOT NULL) AS n,
      SUM(return_amount) FILTER (WHERE hit=true) AS ret,
      ROUND(SUM(return_amount) FILTER (WHERE hit=true)*100.0/NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL)*600,0),1) AS roi
    FROM base
    WHERE venue_name IS NOT NULL AND venue_name != '' AND rno IS NOT NULL
    GROUP BY venue_name, rno
    HAVING COUNT(*) FILTER (WHERE hit IS NOT NULL) >= 5
      AND SUM(return_amount) FILTER (WHERE hit=true)*100.0/NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL)*600,0) >= 130
    ORDER BY roi DESC NULLS LAST
    LIMIT 50
  `);
  keirinCross.forEach(r => console.log(`${r.venue_name} R${r.rno}: n=${r.n} ROI=${r.roi}%`));

  // ===== 競輪: 全会場合計ROI（スキップ外の会場で高ROI場を探す） =====
  console.log("\n===== 競輪: 会場別ROI（n>=20、現5場以外） =====");
  const { rows: keirinVenue } = await client.query(`
    WITH base AS (
      SELECT *,
        SPLIT_PART(race_name, ' ', 1) AS venue_name,
        CASE
          WHEN race_id ~ '-R?[0-9]+$' THEN CAST(SUBSTRING(race_id FROM '-R?([0-9]+)$') AS INTEGER)
          ELSE NULL END AS rno
      FROM keirin_prediction_logs
      WHERE recommendation='buy'
        AND race_id ~ '^[a-z].*-202[56]-'
        AND race_id !~ '_(car[0-9]+|2tan|2fuku|3tan|3fu|3fuku|hukuren|tansho)$'
    )
    SELECT venue_name,
      COUNT(*) FILTER (WHERE hit IS NOT NULL AND rno NOT IN (1,7,8,10,11,12)) AS n,
      ROUND(SUM(return_amount) FILTER (WHERE hit=true AND rno NOT IN (1,7,8,10,11,12))*100.0/
        NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL AND rno NOT IN (1,7,8,10,11,12))*600,0),1) AS roi_simf
    FROM base
    WHERE venue_name IS NOT NULL AND venue_name != ''
    GROUP BY venue_name
    HAVING COUNT(*) FILTER (WHERE hit IS NOT NULL AND rno NOT IN (1,7,8,10,11,12)) >= 20
    ORDER BY roi_simf DESC NULLS LAST
  `);
  keirinVenue.forEach(r => console.log(`${r.venue_name}: n=${r.n} ROI(SIM-F条件)=${r.roi_simf}%`));

  // ===== 競艇: confidence別×odds帯クロス =====
  console.log("\n===== 競艇: confidence×odds帯ROI（n>=20、ROI>=110%） =====");
  const { rows: boatCross } = await client.query(`
    SELECT
      CASE WHEN confidence IS NULL THEN 'null'
           WHEN confidence >= 10 THEN '10'
           WHEN confidence >= 8 THEN '8-9'
           WHEN confidence >= 5 THEN '5-7'
           ELSE '1-4' END AS conf_band,
      CASE WHEN place_low < 1.0 THEN '<1.0'
           WHEN place_low < 1.5 THEN '1.0-1.5'
           WHEN place_low < 2.0 THEN '1.5-2.0'
           WHEN place_low < 2.5 THEN '2.0-2.5'
           WHEN place_low < 3.0 THEN '2.5-3.0'
           WHEN place_low < 4.0 THEN '3.0-4.0'
           ELSE '4.0+' END AS odds_band,
      COUNT(*) FILTER (WHERE hit IS NOT NULL) AS n,
      ROUND(SUM(return_amount) FILTER (WHERE hit=true)*100.0/NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL)*100,0),1) AS roi
    FROM boatrace_prediction_logs
    WHERE recommendation='buy'
    GROUP BY 1,2
    HAVING COUNT(*) FILTER (WHERE hit IS NOT NULL) >= 20
      AND SUM(return_amount) FILTER (WHERE hit=true)*100.0/NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL)*100,0) >= 110
    ORDER BY roi DESC NULLS LAST
    LIMIT 30
  `);
  boatCross.forEach(r => console.log(`conf=${r.conf_band} odds=${r.odds_band}: n=${r.n} ROI=${r.roi}%`));

  // ===== 競艇: venue別ROI（直近90日、n>=30） =====
  console.log("\n===== 競艇: venue別ROI（全データ、n>=100） =====");
  const { rows: boatVenue } = await client.query(`
    SELECT venue,
      COUNT(*) FILTER (WHERE hit IS NOT NULL) AS n,
      ROUND(SUM(return_amount) FILTER (WHERE hit=true)*100.0/NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL)*100,0),1) AS roi
    FROM boatrace_prediction_logs
    WHERE recommendation='buy' AND venue IS NOT NULL
    GROUP BY venue
    HAVING COUNT(*) FILTER (WHERE hit IS NOT NULL) >= 100
    ORDER BY roi DESC NULLS LAST
  `);
  boatVenue.forEach(r => console.log(`${r.venue}: n=${r.n} ROI=${r.roi}%`));

  // ===== 競馬: grade×track×odds帯クロス =====
  console.log("\n===== 競馬: race_type×odds帯ROI（n>=10、ROI>=85%） =====");
  const { rows: keibaCross } = await client.query(`
    SELECT
      CASE WHEN odds < 5.0 THEN '<5倍'
           WHEN odds < 7.0 THEN '5-7倍'
           WHEN odds < 10.0 THEN '7-10倍'
           WHEN odds < 13.0 THEN '10-13倍'
           WHEN odds < 20.0 THEN '13-20倍'
           ELSE '20倍+' END AS odds_band,
      COUNT(*) FILTER (WHERE hit IS NOT NULL) AS n,
      ROUND(COUNT(*) FILTER (WHERE hit=true)*100.0/NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL),0),1) AS hit_rate,
      ROUND(SUM(return_amount) FILTER (WHERE hit=true)*100.0/NULLIF(COUNT(*) FILTER (WHERE hit IS NOT NULL)*100,0),1) AS roi
    FROM keiba_prediction_logs
    WHERE recommendation='buy'
    GROUP BY 1
    HAVING COUNT(*) FILTER (WHERE hit IS NOT NULL) >= 10
    ORDER BY roi DESC NULLS LAST
  `);
  keibaCross.forEach(r => console.log(`odds=${r.odds_band}: n=${r.n} 的中=${r.hit_rate}% ROI=${r.roi}%`));

  // ===== 競馬: リアルタイム予測の詳細 =====
  console.log("\n===== 競馬: リアルタイム予測KPI =====");
  const { rows: keibaRT } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE recommendation='buy') AS buy,
      COUNT(*) FILTER (WHERE recommendation='buy' AND hit=true) AS hit,
      SUM(return_amount) FILTER (WHERE recommendation='buy' AND hit=true) AS ret,
      MIN(race_date) AS from_d, MAX(race_date) AS to_d
    FROM keiba_prediction_logs
    WHERE race_id NOT LIKE '%backfill%' AND race_id NOT LIKE '%test%'
      AND race_date >= '2025-10-01'
  `);
  const kr = keibaRT[0];
  console.log(`buy=${kr.buy} hit=${kr.hit} ret=${kr.ret} from=${kr.from_d} to=${kr.to_d}`);
  console.log(`ROI=${kr.buy > 0 ? (kr.ret/kr.buy/100*100).toFixed(1)+'%' : '-'}`);

  await client.end();
}
run().catch(e => { console.error("ERR:", e.message); process.exit(1); });
