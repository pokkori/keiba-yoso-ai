#!/usr/bin/env node
/**
 * DR2026-04-10 フィルター変更のインパクト分析
 * 実際のカラム: ev, odds, hit, return_amount, confidence, horse_popularity
 */

import { Client } from 'pg';

const PG_CONFIG = {
  host: 'db.oufnfbecjkwfekpyszye.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'rPPu22Z#.@dd9!a',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
};

async function main() {
  const client = new Client(PG_CONFIG);
  await client.connect();

  // confidence分布確認
  const { rows: confDist } = await client.query(`
    SELECT confidence, COUNT(*) as cnt
    FROM keiba_prediction_logs
    WHERE recommendation='buy' AND hit IS NOT NULL
    GROUP BY confidence ORDER BY confidence
  `);
  console.log('confidence分布:', confDist.map(r => `${r.confidence}:${r.cnt}`).join(', '));

  // 全体データ取得
  const { rows } = await client.query(`
    SELECT ev, odds, hit, return_amount, confidence, horse_popularity
    FROM keiba_prediction_logs
    WHERE recommendation = 'buy'
      AND hit IS NOT NULL
      AND ev IS NOT NULL
      AND odds IS NOT NULL
  `);

  await client.end();

  console.log(`\n評価済み買い推奨データ: ${rows.length}件`);

  const BET = 100;
  let oldTotal = 0, oldHit = 0, oldRevenue = 0;
  let newTotal = 0, newHit = 0, newRevenue = 0;
  let removedByEV = 0, removedByOdds = 0;

  for (const row of rows) {
    const ev = parseFloat(row.ev);
    const odds = parseFloat(row.odds);
    const isHit = row.hit === true;
    const payout = isHit ? parseFloat(row.return_amount || 0) : 0;
    const impliedProb = Math.min(0.95, Math.max(0.05, 1 / (odds * 3)));

    // OLD: 全件 (EV>=1.30ですでにフィルター済み想定)
    oldTotal++;
    if (isHit) oldHit++;
    oldRevenue += payout;

    // NEW フィルター
    if (ev < 1.35) { removedByEV++; continue; }
    if (odds < 2.0 && impliedProb > 0.4) { removedByOdds++; continue; }

    newTotal++;
    if (isHit) newHit++;
    newRevenue += payout;
  }

  const oldROI = ((oldRevenue / (oldTotal * BET)) * 100).toFixed(1);
  const newROI = newTotal > 0 ? ((newRevenue / (newTotal * BET)) * 100).toFixed(1) : '0.0';
  const oldHitRate = (oldHit / oldTotal * 100).toFixed(1);
  const newHitRate = newTotal > 0 ? (newHit / newTotal * 100).toFixed(1) : '0.0';

  console.log('\n=== フィルター変更インパクト分析 ===\n');
  console.log('[OLD フィルター: EV>=1.30]');
  console.log(`  件数: ${oldTotal} / 的中: ${oldHit} / 的中率: ${oldHitRate}%`);
  console.log(`  投資: ${(oldTotal * BET).toLocaleString()}円 / 回収: ${oldRevenue.toLocaleString()}円`);
  console.log(`  ROI: ${oldROI}%`);

  console.log('\n[NEW フィルター: EV>=1.35 + 過剰人気除外]');
  console.log(`  件数: ${newTotal} / 的中: ${newHit} / 的中率: ${newHitRate}%`);
  console.log(`  投資: ${(newTotal * BET).toLocaleString()}円 / 回収: ${newRevenue.toLocaleString()}円`);
  console.log(`  ROI: ${newROI}%`);

  console.log('\n[除外内訳]');
  console.log(`  EV<1.35で除外: ${removedByEV}件`);
  console.log(`  過剰人気(odds<2.0)除外: ${removedByOdds}件`);
  const totalRemoved = removedByEV + removedByOdds;
  console.log(`  合計除外: ${totalRemoved}件 (${(totalRemoved / oldTotal * 100).toFixed(1)}%削減)`);

  const roiDiff = parseFloat(newROI) - parseFloat(oldROI);
  console.log(`\n改善効果: ${oldROI}% → ${newROI}% (${roiDiff >= 0 ? '+' : ''}${roiDiff.toFixed(1)}pp)`);
  console.log('\n※ totalScore>=3・頭数最適化フィルターは次回バックテスト実行後に反映');
}

main().catch(console.error);
