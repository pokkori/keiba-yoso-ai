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
  weightPrevDiff?: number; // 前走比体重変化（kg）。増加=正、減少=負

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
    allHorsesOdds?: number[]; // 同レース全馬の複勝オッズ（分散コスト判定用）
  }
): CalculatedScore {
  // ─── 因子1: 人気スコア（1番人気=+1.5、以降-0.3/rank） ───
  const impliedProb = calculateImpliedProb(data.fukushoOdds, raceContext.totalHorses);
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

  // ─── 因子5: 騎手スコア（ROI実績ベースマップ） ───
  // DR2026-04-10: ルメール/武豊は過剰人気でEV低下。穴騎手（横山琉人等）が実ROI高
  const jockeyROIMap: Record<string, number> = {
    '横山琉人': 1.2, '小林脩斗': 1.2, '藤岡康太': 1.0,
    '川田': 0.8, '横山武史': 0.8, '北村友一': 0.8,
    'ルメール': 0.5, '武豊': 0.5,
  };
  const matchedJockey = Object.keys(jockeyROIMap).find(k => data.jockey.includes(k));
  const jockeyScore = matchedJockey ? jockeyROIMap[matchedJockey] : 0.3;

  // ─── 因子6: 斤量/馬体重比スコア（DR2026-04-10実装） ───
  // 軽量比率（斤量/馬体重）が低いほど相対的に有利
  const weightRatio = data.horseWeight > 0 ? data.weight / data.horseWeight : null;
  const weightChangeScore = weightRatio !== null
    ? weightRatio < 0.29 ? 0.5   // 軽量帯（有利: 斤量/馬体重<29%）
    : weightRatio > 0.33 ? -0.5  // 重量帯（不利: 斤量/馬体重>33%）
    : 0.0
    : 0.0;

  // ─── 因子7: 上がり（末脚）スコア（直近3走平均に拡張）───
  const recent3 = data.recentRuns.slice(0, 3).filter(r => r.agariTime != null);
  const avgAgari = recent3.length > 0
    ? recent3.reduce((s, r) => s + r.agariTime!, 0) / recent3.length : null;
  const agariTrend = recent3.length >= 2
    ? recent3[0].agariTime! - recent3[recent3.length - 1].agariTime! : 0; // マイナス=改善傾向
  const agariScore =
    avgAgari != null && avgAgari < 36.5 ? 1.5 + (agariTrend < -1.0 ? 0.5 : 0)
    : avgAgari != null && avgAgari < 37.5 ? 1.0 + (agariTrend < -1.0 ? 0.3 : 0)
    : avgAgari != null && avgAgari > 40.0 ? -1.0
    : avgAgari != null && avgAgari > 39.0 ? -0.5
    : 0.0;

  // ─── 因子8: 前走比馬体重変化スコア ───
  const bodyWeightChangeScore =
    data.weightPrevDiff != null && Math.abs(data.weightPrevDiff) >= 10 ? -0.8
    : data.weightPrevDiff != null && Math.abs(data.weightPrevDiff) >= 6 ? -0.4
    : 0.0;

  // ─── 合計スコア（-2 ~ +8） ───
  const totalScore =
    popularityScore +
    recentFormScore +
    distanceAdaptScore +
    courseAdaptScore +
    jockeyScore +
    weightChangeScore +
    agariScore +
    bodyWeightChangeScore;

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

  // ─── EV 判定（DR2026-04-10 帯別EV閾値 + totalScore 3→4 強化） ───
  const expectedValue = data.fukushoOdds * estimatedProb;
  // オッズ帯別EV閾値（DR2026-05-01: 20-50倍帯フィルター追加）
  // 20-50倍帯: 市場の過小評価ゾーン → 期待値正になりやすいため閾値緩和
  // 7-10倍帯: 人気薄ゾーン → EV閾値引き上げ（偽陽性抑制）
  // その他: 標準閾値1.35
  const isHighValueZone = data.fukushoOdds >= 20.0 && data.fukushoOdds <= 50.0;
  const evThreshold = isHighValueZone ? 1.25
    : (data.fukushoOdds >= 7.0 && data.fukushoOdds <= 10.0) ? 1.45
    : 1.35;
  // 7-10倍帯の分散コスト: 同レースに7-10倍帯馬が3頭以上いる場合はスキップ
  const midRangeCrowding = raceContext.allHorsesOdds != null &&
    data.fukushoOdds >= 7.0 && data.fukushoOdds <= 10.0 &&
    raceContext.allHorsesOdds.filter(o => o >= 7.0 && o <= 10.0).length >= 3;
  // 5倍未満の過剰人気除外（旧: 2倍未満 → 拡張: 5倍未満かつimpliedProb>0.3）
  const overPopular = data.fukushoOdds < 5.0 && impliedProb > 0.3;
  const recommendBuy =
    expectedValue >= evThreshold &&  // 帯別閾値: 20-50倍→1.25、7-10倍→1.45、他→1.35
    marketEdge >= 0.08 &&            // Market Edge +8%以上（implied_probバグ修正後再調整）
    totalScore >= 3 &&               // 4→3に戻し（スキップ率-15pt目標。implied_probバグで過剰フィルタ発生）
    raceContext.totalHorses >= 8 && raceContext.totalHorses <= 12 && // 最適頭数帯ハードフィルター
    !overPopular &&                  // 5倍未満の過剰人気除外（拡張）
    !midRangeCrowding; // 7-10倍帯が3頭以上の場合は分散コストでスキップ

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
 * 控除率20%を考慮: prob = 0.8 / (odds × (totalHorses/3))
 * 旧実装 1/(odds×3) は totalHorses依存を無視した過大評価（最大40%誤差）
 */
function calculateImpliedProb(fukushoOdds: number, totalHorses: number): number {
  const baseProb = 0.8 / (fukushoOdds * (totalHorses / 3));
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
      // DR2026-04-10(v2): 救済閾値5→6に引き上げ（偽陽性抑制・死亡帯スキップ強化）
      if (score.totalScore >= 6 && score.expectedValue >= 1.45) {
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
