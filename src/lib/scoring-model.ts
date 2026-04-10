/**
 * 競馬予想 統計スコアリングシステム
 * Bill Benter (1994) のロジスティック回帰原理を応用した
 * LLM補完型の確率推定モデル
 *
 * 目標: 複勝86.4% → 150%超
 *
 * 戦略:
 * 1. netkeiba無料データから7つの数値特徴量を抽出
 * 2. ロジスティック回帰式（軽量版）で3着内確率を計算
 * 3. LLMの定性評価と組み合わせて最終判定
 * 4. Market Edge（推定確率 - implied_prob）で投資判定
 */

/**
 * 馬の基本スコアリング用データ構造
 */
export interface HorseScoreData {
  num: string;
  name: string;
  jockey: string;
  weight: number; // 斤量
  horseWeight: number; // 馬体重
  fukushoOdds: number; // 複勝オッズ（下限値）

  // 過去成績（直近5走）
  recentRuns: {
    position: number; // 着順（1-3=連対・3着以内、4+はそれ以上）
    distance: number; // 距離
    surface: 'turf' | 'dirt'; // 芝/ダート
    timeIndex?: number; // 速度指数（netkeiba）
    agariTime?: number; // 上がり（秒）
  }[];

  // コース適性
  courseHistory?: {
    surface: 'turf' | 'dirt';
    distance: number;
    topThreeCount: number;
    totalRuns: number;
  }[];
}

/**
 * 計算済みスコア（出力）
 */
export interface CalculatedScore {
  horseNum: string;
  horseName: string;

  // 個別因子スコア（-2 ~ +2）
  popularityScore: number;
  recentFormScore: number;
  distanceAdaptScore: number;
  courseAdaptScore: number;
  jockeyScore: number;
  weightChangeScore: number;
  agariScore: number; // 上がり（末脚）指標

  totalScore: number; // 合計スコア

  // 確率推定
  impliedProb: number; // オッズからの逆算確率（20% / (複勝オッズ×3）
  estimatedProb: number; // モデル推定の3着内確率
  marketEdge: number; // estimatedProb - impliedProb（+12%以上で投資対象）

  // EV判定
  expectedValue: number; // 複勝オッズ × estimatedProb
  recommendBuy: boolean; // EV ≥ 1.30 かつ Market Edge ≥ +12%
}

/**
 * Main: スコアリング計算
 */
export function calculateHorseScore(
  data: HorseScoreData,
  raceContext: {
    totalHorses: number;
    surface: 'turf' | 'dirt';
    distance: number;
    isGradeRace: boolean;
  }
): CalculatedScore {
  // ─── 因子1: 人気スコア（1番人気=+1.5、以降-0.3/rank） ───
  const impliedProb = calculateImpliedProb(data.fukushoOdds);
  const popularityScore = impliedProb > 0.35 ? 1.5 : impliedProb > 0.25 ? 1.0 : 0.5;

  // ─── 因子2: 近走成績スコア（過去5走の3着内率） ───
  const recentTopThreeCount = data.recentRuns.filter(r => r.position <= 3).length;
  const recentFormScore = mapToScore(recentTopThreeCount / Math.max(data.recentRuns.length, 1), 0.6, 0.2);

  // ─── 因子3: 距離適性スコア ───
  const courseHist = data.courseHistory?.find(
    c => c.surface === raceContext.surface &&
        Math.abs(c.distance - raceContext.distance) <= 400
  );
  const distanceAdaptScore = courseHist
    ? mapToScore(courseHist.topThreeCount / Math.max(courseHist.totalRuns, 1), 0.55, 0.15)
    : -1.0; // 未経験は-1

  // ─── 因子4: 同コース実績スコア ───
  const sameCourseDist = data.recentRuns.filter(
    r => r.surface === raceContext.surface && Math.abs(r.distance - raceContext.distance) <= 200
  );
  const courseAdaptScore = sameCourseDist.length > 0 ? 1.0 : -0.5;

  // ─── 因子5: 騎手スコア（高評価騎手の乗替時はボーナス） ───
  const topJockeys = ['ルメール', '川田', '武豊', '横山武史', '北村友一'];
  const jockeyScore = topJockeys.some(j => data.jockey.includes(j)) ? 1.0 : 0.3;

  // ─── 因子6: 斤量変動スコア（前走との増減） ───
  // 簡略版: 複雑な前走比較がない場合は0.0
  const weightChangeScore = 0.0; // LLMで別途評価

  // ─── 因子7: 上がり（末脚）スコア ───
  const latestRun = data.recentRuns[0];
  const agariScore = latestRun?.agariTime && latestRun.agariTime < 37.0
    ? 1.5  // 上がり良好
    : latestRun?.agariTime && latestRun.agariTime > 40.0
    ? -1.0 // 上がり不良
    : 0.0;

  // ─── 合計スコア（-2 ~ +8） ───
  const totalScore =
    popularityScore +
    recentFormScore +
    distanceAdaptScore +
    courseAdaptScore +
    jockeyScore +
    weightChangeScore +
    agariScore;

  // ─── ロジスティック回帰（簡略版） ───
  // logit(p) = -2.0 + 0.45 × totalScore + 0.3 × courseAdaptScore + 0.25 × recentFormScore
  const logit =
    -2.0 +
    0.45 * totalScore +
    0.3 * courseAdaptScore +
    0.25 * recentFormScore +
    (raceContext.totalHorses >= 8 && raceContext.totalHorses <= 12 ? 0.5 : 0.0) + // 最適頭数ボーナス(8-12頭)
    (raceContext.totalHorses < 8 ? -0.3 : 0.0); // 7頭以下はペナルティ

  const estimatedProb = 1 / (1 + Math.exp(-logit)); // sigmoid

  // ─── Market Edge 計算 ───
  const marketEdge = estimatedProb - impliedProb;

  // ─── EV 判定 ───
  const expectedValue = data.fukushoOdds * estimatedProb;
  // DR2026-04-10: EV閾値1.35に引き上げ・totalScore>=3(中〜高確信度)フィルター追加
  const recommendBuy =
    expectedValue >= 1.35 &&        // EV閾値引き上げ: 1.30→1.35（+3〜8% ROI期待）
    marketEdge >= 0.12 &&           // +12%以上
    totalScore >= 3 &&              // confidence>=7相当（中〜高確信度のみ）
    !(data.fukushoOdds < 2.0 && impliedProb > 0.4); // 過剰人気除外

  return {
    horseNum: data.num,
    horseName: data.name,
    popularityScore,
    recentFormScore,
    distanceAdaptScore,
    courseAdaptScore,
    jockeyScore,
    weightChangeScore,
    agariScore,
    totalScore,
    impliedProb,
    estimatedProb: Math.max(0, Math.min(1, estimatedProb)), // clamp to [0,1]
    marketEdge,
    expectedValue,
    recommendBuy,
  };
}

/**
 * 複勝オッズから逆算した implied probability
 * 複勝は3着までなので: implied_prob ≈ 20% / (fukusho_odds × 3)
 * 実際には市場効率で調整が必要だが、簡略版では上記で推定
 */
function calculateImpliedProb(fukushoOdds: number): number {
  // 複勝の控除率は約20%
  // 3着までのペイアウト確率 ≈ 1 / (オッズ × 3)
  // ただしオッズは幅があるため、下限値を使用
  const baseProb = 1 / (fukushoOdds * 3);
  return Math.min(0.95, Math.max(0.05, baseProb));
}

/**
 * 性能値をスコア（-2 ~ +2）にマッピング
 * performanceRatio: 0.0 ~ 1.0 の性能値（例: 3着内率）
 */
function mapToScore(
  performanceRatio: number,
  positiveThreshold: number = 0.6,
  negativeThreshold: number = 0.2
): number {
  if (performanceRatio >= positiveThreshold) {
    return 1.0 + (performanceRatio - positiveThreshold) * 5; // +1.0 ~ +2.0
  }
  if (performanceRatio >= negativeThreshold) {
    return (performanceRatio - negativeThreshold) / (positiveThreshold - negativeThreshold) - 0.5; // -0.5 ~ +1.0
  }
  return -1.0 - (negativeThreshold - performanceRatio) * 5; // -2.0 ~ -1.0
}

/**
 * 複数馬のスコアリング結果から、
 * Market Edge + EV で投資対象を自動選別
 */
export function filterInvestmentCandidates(
  allScores: CalculatedScore[],
  raceContext: {
    totalHorses: number;
    oddsBand?: 'tight' | 'wide'; // 堅軸帯 vs 妙味帯
  }
): CalculatedScore[] {
  return allScores.filter(score => {
    // 条件A: Market Edge ≥ +12%
    if (score.marketEdge < 0.12) return false;

    // 条件B: EV ≥ 1.35（DR2026-04-10引き上げ）
    if (score.expectedValue < 1.35) return false;

    // 条件C: オッズ帯別フィルター
    const odds = score.impliedProb > 0 ? 1 / (score.impliedProb * 3) : 0;
    if (raceContext.oddsBand === 'tight' && odds < 2.0) return false; // 2.0倍未満は過剰人気
    if (raceContext.oddsBand === 'wide' && odds > 7.0) return false; // 7.0倍超は信頼度不足

    return true;
  });
}

/**
 * 回収率向上施策：バイモーダル戦略
 * 複勝2-3倍帯（的中率重視）と5-7倍帯（期待値重視）に分ける
 */
export function getOptimalOddsBand(
  allScores: CalculatedScore[]
): {
  tight: CalculatedScore[]; // 2.0～3.0倍
  wide: CalculatedScore[]; // 5.0～7.0倍
  avoid: CalculatedScore[]; // 3.0～5.0倍（死亡帯）
} {
  const tight: CalculatedScore[] = [];
  const wide: CalculatedScore[] = [];
  const avoid: CalculatedScore[] = [];

  for (const score of allScores) {
    const odds = score.impliedProb > 0 ? 1 / (score.impliedProb * 3) : 0;

    if (odds >= 2.0 && odds < 3.0) {
      tight.push(score);
    } else if (odds >= 5.0 && odds < 7.0) {
      wide.push(score);
    } else if (odds >= 3.0 && odds < 5.0) {
      // DR2026-04-10: 高確信度(totalScore>=5)の場合は死亡帯を救済してtightに格上げ
      if (score.totalScore >= 5 && score.expectedValue >= 1.40) {
        tight.push(score);
      } else {
        avoid.push(score);
      }
    }
  }

  return { tight, wide, avoid };
}

/**
 * Kelly 分率による最適賭け金配分
 * Kelly Criterion: f = (p × b - q) / b
 * where p = 推定勝率, q = 1-p, b = オッズ-1
 */
export function getKellyFraction(
  estimatedProb: number,
  odds: number,
  maxFraction: number = 0.25 // 安全弁: 最大25%
): number {
  const b = odds - 1;
  const q = 1 - estimatedProb;
  const kelly = (estimatedProb * b - q) / b;

  // 安全弁: 計算結果が高すぎる場合は制限
  return Math.min(maxFraction, Math.max(0, kelly));
}
