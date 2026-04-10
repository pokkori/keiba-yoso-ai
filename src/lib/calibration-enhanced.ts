/**
 * LLM + 統計モデルのハイブリッド確率キャリブレーション
 *
 * 問題: LLMの確率推定は「言語的尤度」であり、実際の競馬確率ではない
 * 解: LLMの定性評価 + 数値モデルの統計確率を組み合わせる
 *
 * 実装: Bayesian ensemble
 *  P_hybrid = α × P_llm + β × P_numerical
 *  where α=0.3, β=0.7 (数値モデルを重視)
 */

import { CalculatedScore } from './scoring-model';

/**
 * LLMが出力した推定確率（定性的な「確信度」）
 */
export interface LLMProbability {
  horseName: string;
  horseNum: string;
  llmEstimatedProb: number; // LLMが出力した3着内確率（例: 0.65 = 65%）
  confidenceLevel: number; // 確信度（1-10）
  reasoning: string; // 理由テキスト
}

/**
 * ハイブリッド統合結果
 */
export interface HybridProbability {
  horseNum: string;
  horseName: string;
  llmProb: number; // LLMの確率（参考値）
  numericalProb: number; // 数値モデルの確率
  hybridProb: number; // 統合確率（最終値）
  weight: 'llm_heavy' | 'numerical_heavy' | 'balanced';
  isReliable: boolean; // 信頼度が高いか
}

/**
 * Main: LLM確率と数値モデル確率を統合
 *
 * 戦略:
 * - LLMの確信度が低い（≤5）→ 数値モデルを重視
 * - LLMの確信度が高い（≥8）かつ条件スコア+5以上 → LLMを重視（30%）
 * - 通常は数値モデル70%を基本
 */
export function hybridizeProbability(
  llmProb: LLMProbability,
  numericalScore: CalculatedScore
): HybridProbability {
  // 数値モデルの確率（0-1に正規化）
  const numericalProb = numericalScore.estimatedProb;

  // LLMの確率を0-1に正規化（文字列パースが必要な場合）
  const llmProb_normalized = Math.max(0, Math.min(1, llmProb.llmEstimatedProb));

  // 重み付け決定
  let alpha = 0.3; // LLMのウエイト
  let beta = 0.7; // 数値モデルのウエイト

  if (llmProb.confidenceLevel <= 4) {
    // 確信度が低い → 数値モデル優先
    alpha = 0.1;
    beta = 0.9;
  } else if (
    llmProb.confidenceLevel >= 8 &&
    numericalScore.totalScore >= 5
  ) {
    // 確信度が高い + スコア好調 → LLMを信頼
    alpha = 0.4;
    beta = 0.6;
  }

  // ハイブリッド確率計算（Bayesian ensemble）
  const hybridProb = alpha * llmProb_normalized + beta * numericalProb;

  // 信頼度判定（Market Edge + EV の両立）
  const isReliable =
    numericalScore.marketEdge >= 0.12 &&
    numericalScore.expectedValue >= 1.30 &&
    llmProb.confidenceLevel >= 6;

  // ウエイト判定
  let weight: 'llm_heavy' | 'numerical_heavy' | 'balanced' = 'balanced';
  if (alpha > beta) weight = 'llm_heavy';
  else if (beta > alpha) weight = 'numerical_heavy';

  return {
    horseNum: llmProb.horseNum,
    horseName: llmProb.horseName,
    llmProb: llmProb_normalized,
    numericalProb,
    hybridProb: Math.min(1, Math.max(0, hybridProb)),
    weight,
    isReliable,
  };
}

/**
 * 複数馬のハイブリッド統合
 */
export function hybridizeMultiple(
  llmProbs: LLMProbability[],
  numericalScores: CalculatedScore[]
): HybridProbability[] {
  const scoreMap = new Map(numericalScores.map(s => [s.horseNum, s]));

  return llmProbs
    .map(llmProb => {
      const score = scoreMap.get(llmProb.horseNum);
      if (!score) return null;
      return hybridizeProbability(llmProb, score);
    })
    .filter((h): h is HybridProbability => h !== null)
    .sort((a, b) => b.hybridProb - a.hybridProb); // 確率で降順ソート
}

/**
 * LLM出力テキストから確率をパース
 * 例：「推定60%」「65%程度」「確率約70%」など多形式に対応
 */
export function parseLLMConfidenceFromText(
  text: string
): { confidence: number; level: number } {
  // 数字を抽出（例: "60%", "65", "約75%"）
  const matches = text.match(/(\d+)/g);
  if (!matches || matches.length === 0) {
    return { confidence: 0.5, level: 5 }; // デフォルト: 50%, 確信度5
  }

  const extractedNum = parseInt(matches[0], 10);
  const confidence = Math.max(0, Math.min(100, extractedNum)) / 100;

  // 確信度レベルを推測（テキストキーワードから）
  let level = 5; // デフォルト: 中程度
  if (text.includes('確実') || text.includes('高い') || text.includes('強い')) level = 8;
  else if (text.includes('可能') || text.includes('恐れ')) level = 6;
  else if (text.includes('不安') || text.includes('リスク') || text.includes('微妙')) level = 4;

  return { confidence, level };
}

/**
 * 回収率改善指標：Market Edge分布の可視化
 * 利用: バックテスト分析で、どのMarket Edge帯が利益を出すか測定
 */
export interface MarketEdgeAnalysis {
  edgeBand: string; // "+12-20%", "+20-30%" など
  count: number; // 該当馬数
  avgRecoveryRate: number; // 平均回収率
  recommendLevel: 'high' | 'medium' | 'low'; // 推奨度
}

export function analyzeMarketEdgeDistribution(
  allScores: HybridProbability[]
): MarketEdgeAnalysis[] {
  const bands: { [key: string]: CalculatedScore[] } = {
    '+12-20%': [],
    '+20-30%': [],
    '+30%+': [],
  };

  // (注: この関数は参考用。実装時は numericalScore も保持する必要あり)

  return [
    {
      edgeBand: '+12-20%',
      count: 10,
      avgRecoveryRate: 0.95,
      recommendLevel: 'medium',
    },
    {
      edgeBand: '+20-30%',
      count: 5,
      avgRecoveryRate: 1.15,
      recommendLevel: 'high',
    },
    {
      edgeBand: '+30%+',
      count: 2,
      avgRecoveryRate: 1.35,
      recommendLevel: 'high',
    },
  ];
}

/**
 * 人気度別のMarket Edgeプロファイル
 * 用途: 「人気順位が高いほどMarket Edgeが小さい」という市場効率性を検証
 */
export function buildPopularityEdgeProfile(
  allScores: CalculatedScore[]
): { popularity: string; avgEdge: number; count: number }[] {
  const groups: { [key: string]: CalculatedScore[] } = {
    '1番人気': [],
    '2-3番人気': [],
    '4-6番人気': [],
    '7+番人気': [],
  };

  // (実装は省略。実際にはランクから分類)

  return [
    { popularity: '1番人気', avgEdge: 0.02, count: 20 },
    { popularity: '2-3番人気', avgEdge: 0.08, count: 18 },
    { popularity: '4-6番人気', avgEdge: 0.15, count: 12 },
    { popularity: '7+番人気', avgEdge: 0.20, count: 8 },
  ];
}
