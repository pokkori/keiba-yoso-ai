#!/usr/bin/env node

/**
 * 競馬予想KPI集計スクリプト（改善版）
 *
 * 目標: 86.4% → 150%超への改善を測定
 *
 * 指標:
 * 1. 全体回収率（既存）
 * 2. Market Edge帯別の回収率分布（新規）
 * 3. オッズバンド別の回収率（新規）- 堅軸2-3倍 vs 妙味5-7倍
 * 4. 少頭数重賞の回収率（新規） - 9頭以下の高信頼性レース
 * 5. スキップ成功率（既存改善）
 *
 * 実行: node scripts/keiba-kpi-enhanced.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase env vars not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface BacktestRecord {
  id: string;
  race_id: string;
  horse_num: string;
  horse_name: string;
  race_info: string;
  recommendation: string; // '買い推奨' | 'スキップ'
  predicted_prob: number; // 推定3着内確率
  actual_result: string; // '3着以内' | '4着以下'
  fukusho_odds: number;
  fukusho_payout: number | null; // null = 外れ
  bet_amount: number;
  created_at: string;
}

interface KPIMetrics {
  totalBets: number;
  totalHits: number;
  hitRate: number;
  totalInvest: number;
  totalRevenue: number;
  recoveryRate: number;

  // Market Edge別
  edgeDistribution: {
    [key: string]: {
      count: number;
      hits: number;
      revenue: number;
      recoveryRate: number;
    };
  };

  // オッズバンド別
  oddsBandDistribution: {
    [key: string]: {
      count: number;
      hits: number;
      revenue: number;
      recoveryRate: number;
    };
  };

  // 少頭数重賞
  smallFieldGradeRaces: {
    count: number;
    hits: number;
    recoveryRate: number;
  };

  // スキップ成功率
  skipAccuracy: {
    totalSkipped: number;
    correctSkips: number; // 外れたレース数
    accuracy: number; // 正解率
  };

  // 月別トレンド
  monthlyTrend: {
    [key: string]: {
      recoveryRate: number;
      count: number;
    };
  };
}

async function fetchBacktestData(): Promise<BacktestRecord[]> {
  const { data, error } = await supabase
    .from('backtest_predictions')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Supabase fetch error:', error);
    return [];
  }

  return data || [];
}

function categorizeMarketEdge(edge: number): string {
  if (edge < 0.12) return 'edge_below_12';
  if (edge < 0.20) return 'edge_12_20';
  if (edge < 0.30) return 'edge_20_30';
  return 'edge_above_30';
}

function categorizeOddsBand(odds: number): string {
  if (odds < 2.0) return 'tight_below_2';
  if (odds < 3.0) return 'tight_2_3';
  if (odds < 5.0) return 'neutral_3_5';
  if (odds < 7.0) return 'wide_5_7';
  return 'wide_above_7';
}

function isSmallFieldGrade(raceInfo: string, totalHorses: number): boolean {
  const isGrade = /G1|G2|G3|重賞|特別|S|ステークス/i.test(raceInfo);
  return isGrade && totalHorses <= 9;
}

function calculateMetrics(records: BacktestRecord[]): KPIMetrics {
  const metrics: KPIMetrics = {
    totalBets: records.length,
    totalHits: 0,
    hitRate: 0,
    totalInvest: 0,
    totalRevenue: 0,
    recoveryRate: 0,
    edgeDistribution: {},
    oddsBandDistribution: {},
    smallFieldGradeRaces: {
      count: 0,
      hits: 0,
      recoveryRate: 0,
    },
    skipAccuracy: {
      totalSkipped: 0,
      correctSkips: 0,
      accuracy: 0,
    },
    monthlyTrend: {},
  };

  for (const record of records) {
    const isHit = record.actual_result === '3着以内';
    const revenue = record.fukusho_payout || 0;
    const invested = record.bet_amount;

    metrics.totalInvest += invested;
    metrics.totalRevenue += revenue;

    // 的中判定
    if (isHit) {
      metrics.totalHits++;
    }

    // スキップ判定
    if (record.recommendation === 'スキップ') {
      metrics.skipAccuracy.totalSkipped++;
      if (record.actual_result === '4着以下') {
        metrics.skipAccuracy.correctSkips++;
      }
    }

    // Market Edge分布（記録にあれば）
    // ※実装: DB に market_edge を追加して保存する必要あり
    const edgeKey = 'edge_12_20'; // 仮
    if (!metrics.edgeDistribution[edgeKey]) {
      metrics.edgeDistribution[edgeKey] = {
        count: 0,
        hits: 0,
        revenue: 0,
        recoveryRate: 0,
      };
    }
    metrics.edgeDistribution[edgeKey].count++;
    metrics.edgeDistribution[edgeKey].revenue += revenue;
    if (isHit) {
      metrics.edgeDistribution[edgeKey].hits++;
    }

    // オッズバンド分布
    const oddsBand = categorizeOddsBand(record.fukusho_odds);
    if (!metrics.oddsBandDistribution[oddsBand]) {
      metrics.oddsBandDistribution[oddsBand] = {
        count: 0,
        hits: 0,
        revenue: 0,
        recoveryRate: 0,
      };
    }
    metrics.oddsBandDistribution[oddsBand].count++;
    metrics.oddsBandDistribution[oddsBand].revenue += revenue;
    if (isHit) {
      metrics.oddsBandDistribution[oddsBand].hits++;
    }

    // 少頭数重賞（仮: 実装時に totalHorses を追加）
    // if (isSmallFieldGrade(record.race_info, 9)) {
    //   metrics.smallFieldGradeRaces.count++;
    //   if (isHit) {
    //     metrics.smallFieldGradeRaces.hits++;
    //   }
    // }

    // 月別トレンド
    const monthKey = new Date(record.created_at).toISOString().slice(0, 7);
    if (!metrics.monthlyTrend[monthKey]) {
      metrics.monthlyTrend[monthKey] = { recoveryRate: 0, count: 0 };
    }
    metrics.monthlyTrend[monthKey].count++;
  }

  // 計算
  metrics.hitRate = metrics.totalBets > 0 ? metrics.totalHits / metrics.totalBets : 0;
  metrics.recoveryRate =
    metrics.totalInvest > 0 ? metrics.totalRevenue / metrics.totalInvest : 0;

  // オッズバンド別の回収率
  for (const key in metrics.oddsBandDistribution) {
    const band = metrics.oddsBandDistribution[key];
    band.recoveryRate = band.count > 0 ? band.revenue / (band.count * 100) : 0; // 100円bet仮定
  }

  // Market Edge別の回収率
  for (const key in metrics.edgeDistribution) {
    const edge = metrics.edgeDistribution[key];
    edge.recoveryRate = edge.count > 0 ? edge.revenue / (edge.count * 100) : 0;
  }

  // 少頭数重賞の回収率
  metrics.smallFieldGradeRaces.recoveryRate =
    metrics.smallFieldGradeRaces.count > 0
      ? metrics.smallFieldGradeRaces.hits / metrics.smallFieldGradeRaces.count
      : 0;

  // スキップ精度
  metrics.skipAccuracy.accuracy =
    metrics.skipAccuracy.totalSkipped > 0
      ? metrics.skipAccuracy.correctSkips / metrics.skipAccuracy.totalSkipped
      : 0;

  return metrics;
}

function printReport(metrics: KPIMetrics) {
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('         競馬予想KPI 改善版（2026-04-08）');
  console.log('═'.repeat(80));

  console.log('\n【基本指標】');
  console.log(`  総投票数: ${metrics.totalBets}件`);
  console.log(`  的中数: ${metrics.totalHits}件`);
  console.log(`  的中率: ${(metrics.hitRate * 100).toFixed(1)}%`);
  console.log(`  総投資: ${metrics.totalInvest.toFixed(0)}円`);
  console.log(`  総払戻: ${metrics.totalRevenue.toFixed(0)}円`);
  console.log(
    `  \x1b[1m回収率: ${(metrics.recoveryRate * 100).toFixed(1)}%\x1b[0m ${
      metrics.recoveryRate >= 1.5 ? '✅ 目標達成！' : '🎯 150%を目指す'
    }`
  );

  console.log('\n【新指標1: Market Edge帯別の回収率】');
  console.log('  ⚠ Edge帯は DB に market_edge を保存後に計測可能');
  for (const [key, data] of Object.entries(metrics.edgeDistribution)) {
    console.log(
      `    ${key}: ${data.count}件, 的中率${(data.hits / data.count * 100).toFixed(1)}%, 回収率${(data.recoveryRate * 100).toFixed(1)}%`
    );
  }

  console.log('\n【新指標2: オッズバンド別の回収率（バイモーダル戦略）】');
  const tight2_3 = metrics.oddsBandDistribution['tight_2_3'];
  const wide5_7 = metrics.oddsBandDistribution['wide_5_7'];
  console.log(`  堅軸帯（2-3倍）:`);
  if (tight2_3) {
    console.log(
      `    ${tight2_3.count}件, 回収率${(tight2_3.recoveryRate * 100).toFixed(1)}% ${
        tight2_3.recoveryRate >= 1.8 ? '✅ 180%超達成' : ''
      }`
    );
  } else {
    console.log(`    データ不足`);
  }

  console.log(`  妙味帯（5-7倍）:`);
  if (wide5_7) {
    console.log(
      `    ${wide5_7.count}件, 回収率${(wide5_7.recoveryRate * 100).toFixed(1)}% ${
        wide5_7.recoveryRate >= 1.6 ? '✅ 160%超達成' : ''
      }`
    );
  } else {
    console.log(`    データ不足`);
  }

  console.log('\n【新指標3: 少頭数重賞（9頭以下）の信頼度】');
  console.log(`  件数: ${metrics.smallFieldGradeRaces.count}件`);
  console.log(`  的中率: ${(metrics.smallFieldGradeRaces.recoveryRate * 100).toFixed(1)}%`);

  console.log('\n【新指標4: スキップ精度（FP削減効果）】');
  console.log(`  総スキップ件数: ${metrics.skipAccuracy.totalSkipped}件`);
  console.log(`  正解スキップ（実際に外れた）: ${metrics.skipAccuracy.correctSkips}件`);
  console.log(
    `  スキップ精度: ${(metrics.skipAccuracy.accuracy * 100).toFixed(1)}% ${
      metrics.skipAccuracy.accuracy >= 0.8 ? '✅ 優秀' : ''
    }`
  );

  console.log('\n【月別トレンド】');
  for (const [month, trend] of Object.entries(metrics.monthlyTrend).sort()) {
    console.log(
      `  ${month}: ${(trend.recoveryRate * 100).toFixed(1)}% (${trend.count}件)`
    );
  }

  console.log('\n' + '═'.repeat(80));
  console.log('【改善施策の優先度】');
  console.log('1. Market Edge +20-30% 帯を最優先（最高EVゾーン）');
  console.log('2. 堅軸2-3倍帯と妙味5-7倍帯に集中（死亡帯3-5倍を回避）');
  console.log('3. 少頭数重賞（9頭以下）は積極買い');
  console.log('4. スキップ精度>80% を維持（余計な負け取り減少）');
  console.log('═'.repeat(80));
}

async function main() {
  console.log('データ取得中...');
  const records = await fetchBacktestData();

  if (records.length === 0) {
    console.log('バックテストデータがありません');
    return;
  }

  console.log(`${records.length}件のデータを集計中...`);
  const metrics = calculateMetrics(records);
  printReport(metrics);

  // JSON出力も保存
  const outputPath = path.join(process.cwd(), 'keiba-kpi-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
  console.log(`\nレポートを保存: ${outputPath}`);
}

main().catch(console.error);
