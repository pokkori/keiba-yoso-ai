/**
 * Supabase REST API経由で競艇データ分析
 */

const SUPABASE_URL = 'https://oufnfbecjkwfekpyszye.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Zm5mYmVjamt3ZmVrcHlzenllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk0ODA5MSwiZXhwIjoyMDg2NTI0MDkxfQ.vCoiA8HYM7pHDKnvbkYZkNG_y492RJPNXDwJNp_B3fk';

async function fetchSupabase(query) {
  console.log('クエリ実行:', query.substring(0, 100) + '...\n');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_query`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql: query })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function analyzeBoatData() {
  const results = {};

  try {
    // === テーブル存在確認 ===
    console.log('=== 1. テーブル・カラム確認 ===');
    try {
      const testFetch = await fetch(
        `${SUPABASE_URL}/rest/v1/boat_prediction_logs?select=*&limit=1`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (testFetch.ok) {
        const data = await testFetch.json();
        console.log('テーブル存在確認: OK');
        if (data.length > 0) {
          console.log('サンプルレコードのカラム:', Object.keys(data[0]));
          console.log('サンプルレコード:', JSON.stringify(data[0], null, 2));
        }
      } else {
        console.log('テーブルアクセスエラー:', testFetch.status);
      }
    } catch (e) {
      console.log('テーブル確認失敗:', e.message);
    }
    console.log();

    // === 2. 基本統計 ===
    console.log('=== 2. 基本統計（全体） ===');
    try {
      const basicQuery = `
        SELECT
          COUNT(*) as total_count,
          COUNT(CASE WHEN recommendation = 'buy' THEN 1 END) as buy_count,
          COUNT(CASE WHEN hit IS TRUE THEN 1 END) as hit_count,
          COUNT(CASE WHEN hit IS NOT NULL THEN 1 END) as evaluated_count,
          MIN(race_date) as earliest_date,
          MAX(race_date) as latest_date,
          COUNT(DISTINCT venue) as unique_venues
        FROM boat_prediction_logs
      `;

      const basicRes = await fetch(
        `${SUPABASE_URL}/rest/v1/boat_prediction_logs?select=count()`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'count=exact'
          }
        }
      );

      if (basicRes.ok) {
        const count = basicRes.headers.get('content-range');
        console.log('総レコード数:', count || 'N/A');
        results.totalCount = count;
      }
    } catch (e) {
      console.log('基本統計エラー:', e.message);
    }
    console.log();

    // === 3. 会場一覧（n>=5） ===
    console.log('=== 3. 会場一覧（n>=5） ===');
    try {
      const venueRes = await fetch(
        `${SUPABASE_URL}/rest/v1/boat_prediction_logs?select=venue&distinct=true`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (venueRes.ok) {
        const venues = await venueRes.json();
        console.log('会場一覧:', venues.map(v => v.venue).filter(v => v).slice(0, 20));
        results.venues = venues.map(v => v.venue).filter(Boolean);
      }
    } catch (e) {
      console.log('会場一覧エラー:', e.message);
    }
    console.log();

    // === 4. confidence値の分布 ===
    console.log('=== 4. confidence値の分布 ===');
    try {
      const confRes = await fetch(
        `${SUPABASE_URL}/rest/v1/boat_prediction_logs?select=confidence&order=confidence`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (confRes.ok) {
        const logs = await confRes.json();
        const confValues = logs.map(l => l.confidence).filter(c => c !== null);
        const confDistribution = {};
        confValues.forEach(c => {
          confDistribution[c] = (confDistribution[c] || 0) + 1;
        });
        console.log('confidence分布 (最初の20個):',
          Object.entries(confDistribution)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .slice(0, 20)
        );
        results.confDistribution = confDistribution;
      }
    } catch (e) {
      console.log('confidence分布エラー:', e.message);
    }
    console.log();

    // === 5. odds値の分布 ===
    console.log('=== 5. odds値の分布 ===');
    try {
      const oddsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/boat_prediction_logs?select=odds&limit=1000`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (oddsRes.ok) {
        const logs = await oddsRes.json();
        const oddsValues = logs.map(l => l.odds).filter(o => o !== null && o !== 0);
        const avgOdds = oddsValues.length > 0
          ? (oddsValues.reduce((a, b) => a + b, 0) / oddsValues.length).toFixed(2)
          : 'N/A';
        const minOdds = oddsValues.length > 0 ? Math.min(...oddsValues).toFixed(2) : 'N/A';
        const maxOdds = oddsValues.length > 0 ? Math.max(...oddsValues).toFixed(2) : 'N/A';

        console.log('odds統計:');
        console.log('  平均:', avgOdds);
        console.log('  最小:', minOdds);
        console.log('  最大:', maxOdds);
        console.log('  サンプル数:', oddsValues.length);

        results.oddsStats = {
          avg: parseFloat(avgOdds),
          min: parseFloat(minOdds),
          max: parseFloat(maxOdds),
          count: oddsValues.length
        };
      }
    } catch (e) {
      console.log('odds分布エラー:', e.message);
    }
    console.log();

    // === 6. 日付範囲 ===
    console.log('=== 6. 日付範囲 ===');
    try {
      const dateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/boat_prediction_logs?select=race_date&order=race_date.asc&limit=1`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      const dateRes2 = await fetch(
        `${SUPABASE_URL}/rest/v1/boat_prediction_logs?select=race_date&order=race_date.desc&limit=1`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (dateRes.ok && dateRes2.ok) {
        const earliest = await dateRes.json();
        const latest = await dateRes2.json();
        console.log('最古日付:', earliest[0]?.race_date);
        console.log('最新日付:', latest[0]?.race_date);
        results.dateRange = {
          earliest: earliest[0]?.race_date,
          latest: latest[0]?.race_date
        };
      }
    } catch (e) {
      console.log('日付範囲エラー:', e.message);
    }
    console.log();

    // === 7. 推奨別集計 ===
    console.log('=== 7. 推奨別集計（recommendation） ===');
    try {
      const recRes = await fetch(
        `${SUPABASE_URL}/rest/v1/boat_prediction_logs?select=recommendation,count()&group_by=recommendation`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=representation'
          }
        }
      );

      if (recRes.ok) {
        const recs = await recRes.json();
        console.log('推奨別集計:', recs);
        results.recommendation = recs;
      }
    } catch (e) {
      console.log('推奨別集計エラー:', e.message);
    }
    console.log();

    // === 8. 結果（hit）別分布 ===
    console.log('=== 8. 結果（hit）別分布 ===');
    try {
      const hitRes = await fetch(
        `${SUPABASE_URL}/rest/v1/boat_prediction_logs?select=hit,count()&group_by=hit`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (hitRes.ok) {
        const hits = await hitRes.json();
        console.log('結果別集計:', hits);
        results.hit = hits;
      }
    } catch (e) {
      console.log('結果別分布エラー:', e.message);
    }
    console.log();

    console.log('\n=== 最終結果 ===');
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('処理エラー:', error.message);
    process.exit(1);
  }
}

// 実行
analyzeBoatData().catch(e => {
  console.error('予期しないエラー:', e);
  process.exit(1);
});
