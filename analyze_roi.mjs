import { createClient } from './node_modules/@supabase/supabase-js/dist/index.mjs';

const supabase = createClient(
  'https://oufnfbecjkwfekpyszye.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Zm5mYmVjamt3ZmVrcHlzenllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk0ODA5MSwiZXhwIjoyMDg2NTI0MDkxfQ.vCoiA8HYM7pHDKnvbkYZkNG_y492RJPNXDwJNp_B3fk'
);

async function fetchAll() {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('keiba_prediction_logs')
      .select('id, odds, hit, return_amount, ev, confidence, race_date, horse_popularity, race_grade, race_type, track_type, distance, field_condition')
      .eq('recommendation', 'buy')
      .not('hit', 'is', null)
      .gte('race_date', '2025-01-01')
      .range(from, from + pageSize - 1);
    if (error) { console.error('ERROR:', error.message); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function roi(items) {
  const returns = items.filter(r => r.hit).reduce((s, r) => s + parseFloat(r.return_amount || 0), 0);
  return items.length > 0 ? (returns / (items.length * 100) * 100).toFixed(1) : '0.0';
}

function hitPct(items) {
  const hits = items.filter(r => r.hit).length;
  return items.length > 0 ? (hits / items.length * 100).toFixed(0) + '%' : '0%';
}

async function main() {
  const all = await fetchAll();
  console.log('=== 全データ件数 ===', all.length);
  if (all.length === 0) { console.log('データなし'); return; }

  // 1. オッズ帯別ROI
  const oddsBands = {};
  all.forEach(r => {
    const odds = parseFloat(r.odds);
    if (isNaN(odds)) return;
    const band = Math.floor(odds);
    if (band < 1 || band > 30) return;
    if (!oddsBands[band]) oddsBands[band] = [];
    oddsBands[band].push(r);
  });
  console.log('\n=== オッズ帯別ROI ===');
  Object.entries(oddsBands).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).forEach(([band, items]) => {
    console.log(`  odds${band}倍台: n=${items.length}, hit=${hitPct(items)}, ROI=${roi(items)}%`);
  });

  // 2. 人気別ROI
  const popGroups = { '1-3番人気': [], '4-6番人気': [], '7-9番人気': [], '10番人気以下': [] };
  all.forEach(r => {
    const pop = parseInt(r.horse_popularity);
    if (!pop || isNaN(pop)) return;
    const key = pop <= 3 ? '1-3番人気' : pop <= 6 ? '4-6番人気' : pop <= 9 ? '7-9番人気' : '10番人気以下';
    popGroups[key].push(r);
  });
  console.log('\n=== 人気別ROI ===');
  Object.entries(popGroups).forEach(([band, items]) => {
    if (items.length === 0) return;
    console.log(`  ${band}: n=${items.length}, hit=${hitPct(items)}, ROI=${roi(items)}%`);
  });

  // 3. EV別ROI
  const evGroups = { 'ev<1.0': [], 'ev1.0-1.3': [], 'ev1.3-1.5': [], 'ev1.5-2.0': [], 'ev2.0+': [] };
  all.forEach(r => {
    const ev = parseFloat(r.ev);
    if (isNaN(ev)) return;
    const key = ev < 1.0 ? 'ev<1.0' : ev < 1.3 ? 'ev1.0-1.3' : ev < 1.5 ? 'ev1.3-1.5' : ev < 2.0 ? 'ev1.5-2.0' : 'ev2.0+';
    evGroups[key].push(r);
  });
  console.log('\n=== EV別ROI ===');
  Object.entries(evGroups).forEach(([band, items]) => {
    if (items.length === 0) return;
    console.log(`  ${band}: n=${items.length}, hit=${hitPct(items)}, ROI=${roi(items)}%`);
  });

  // 4. 月別ROI
  const mMap = {};
  all.forEach(r => {
    const m = r.race_date.slice(0, 7);
    if (!mMap[m]) mMap[m] = [];
    mMap[m].push(r);
  });
  console.log('\n=== 月別ROI ===');
  Object.entries(mMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([m, items]) => {
    console.log(`  ${m}: n=${items.length}, ROI=${roi(items)}%`);
  });

  // 5. グレード別ROI
  const gMap = {};
  all.forEach(r => {
    const g = r.race_grade || 'unknown';
    if (!gMap[g]) gMap[g] = [];
    gMap[g].push(r);
  });
  console.log('\n=== グレード別ROI ===');
  Object.entries(gMap).sort((a, b) => parseFloat(roi(b[1])) - parseFloat(roi(a[1]))).forEach(([g, items]) => {
    console.log(`  ${g}: n=${items.length}, hit=${hitPct(items)}, ROI=${roi(items)}%`);
  });

  // 6. race_type別ROI
  const rtMap = {};
  all.forEach(r => {
    const rt = r.race_type || 'unknown';
    if (!rtMap[rt]) rtMap[rt] = [];
    rtMap[rt].push(r);
  });
  console.log('\n=== race_type別ROI ===');
  Object.entries(rtMap).forEach(([rt, items]) => {
    console.log(`  ${rt}: n=${items.length}, hit=${hitPct(items)}, ROI=${roi(items)}%`);
  });

  // 7. データ欠損確認
  const total = all.length;
  console.log('\n=== データ欠損確認 ===');
  console.log(`  total: ${total}`);
  console.log(`  track_type: ${all.filter(r => r.track_type).length}/${total}`);
  console.log(`  distance: ${all.filter(r => r.distance).length}/${total}`);
  console.log(`  field_condition: ${all.filter(r => r.field_condition).length}/${total}`);
  console.log(`  confidence: ${all.filter(r => r.confidence !== null).length}/${total}`);
  console.log(`  horse_popularity: ${all.filter(r => r.horse_popularity !== null).length}/${total}`);
  console.log(`  ev: ${all.filter(r => r.ev !== null).length}/${total}`);

  // 8. EV分布
  const evs = all.filter(r => r.ev !== null).map(r => parseFloat(r.ev)).sort((a, b) => a - b);
  if (evs.length > 0) {
    const avg = evs.reduce((s, v) => s + v, 0) / evs.length;
    const median = evs[Math.floor(evs.length / 2)];
    console.log(`\nEV統計: avg=${avg.toFixed(3)}, median=${median.toFixed(3)}, min=${evs[0].toFixed(2)}, max=${evs[evs.length - 1].toFixed(2)}, n=${evs.length}`);
  }

  // 9. フィルター組み合わせ分析（高価値ゾーン探索）
  console.log('\n=== フィルター組み合わせ分析 ===');

  const filters = [
    { label: 'ev>=1.5 & odds3-10', fn: r => parseFloat(r.ev) >= 1.5 && parseFloat(r.odds) >= 3 && parseFloat(r.odds) <= 10 },
    { label: 'ev>=1.5 & odds2-15', fn: r => parseFloat(r.ev) >= 1.5 && parseFloat(r.odds) >= 2 && parseFloat(r.odds) <= 15 },
    { label: 'ev>=1.3 & pop3-8', fn: r => parseFloat(r.ev) >= 1.3 && parseInt(r.horse_popularity) >= 3 && parseInt(r.horse_popularity) <= 8 },
    { label: 'ev>=1.5 & pop3-8', fn: r => parseFloat(r.ev) >= 1.5 && parseInt(r.horse_popularity) >= 3 && parseInt(r.horse_popularity) <= 8 },
    { label: 'G1/G2/G3のみ', fn: r => ['G1', 'G2', 'G3'].includes(r.race_grade) },
    { label: 'ev>=1.5 & G1-3', fn: r => parseFloat(r.ev) >= 1.5 && ['G1', 'G2', 'G3'].includes(r.race_grade) },
    { label: 'ev>=2.0', fn: r => parseFloat(r.ev) >= 2.0 },
    { label: 'pop1-5 & odds3-8', fn: r => parseInt(r.horse_popularity) >= 1 && parseInt(r.horse_popularity) <= 5 && parseFloat(r.odds) >= 3 && parseFloat(r.odds) <= 8 },
    { label: 'odds3-8のみ', fn: r => parseFloat(r.odds) >= 3 && parseFloat(r.odds) <= 8 },
  ];

  filters.forEach(({ label, fn }) => {
    const items = all.filter(fn);
    if (items.length === 0) { console.log(`  [${label}]: データなし`); return; }
    console.log(`  [${label}]: n=${items.length}, hit=${hitPct(items)}, ROI=${roi(items)}%`);
  });

  // 10. EV閾値スキャン
  console.log('\n=== EV閾値スキャン（買い条件の最適化） ===');
  [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.0].forEach(threshold => {
    const items = all.filter(r => parseFloat(r.ev) >= threshold);
    if (items.length === 0) return;
    console.log(`  ev>=${threshold.toFixed(1)}: n=${items.length}, ROI=${roi(items)}%`);
  });
}

main().catch(e => console.error('FATAL:', e.message));
