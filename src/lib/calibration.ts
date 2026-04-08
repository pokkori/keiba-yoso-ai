/**
 * 確率キャリブレーション モジュール
 *
 * LLMの確信度スコア(1-10)を、実際の的中率に補正する
 * 手法: Isotonic Regression（PAVA アルゴリズム）
 *
 * 使い方:
 *   1. scripts/update-calibration.mjs でSupabaseから集計してJSONを更新
 *   2. getCalibrationTable() でロード（ファイルキャッシュ済み）
 *   3. getCalibratedProb(confidence) でKelly計算に使う補正確率を取得
 */

import fs from "fs";
import path from "path";

// ---------- 型定義 ----------

export interface CalibrationPoint {
  confidence: number;       // 1〜10
  sampleCount: number;      // サンプル数
  actualHitRate: number;    // 実際の的中率 (0〜1)
  calibratedProb: number;   // Isotonic Regressionで補正済み (0〜1)
}

export interface CalibrationTable {
  updatedAt: string;        // ISO 8601
  sport: "boat" | "keiba" | "keirin";
  minSamplesForCalibration: number;
  points: CalibrationPoint[];
}

// ---------- PAVA (Pool Adjacent Violators Algorithm) ----------

export function runPAVA(
  data: Array<{ x: number; y: number; w: number }>
): number[] {
  if (data.length === 0) return [];
  if (data.length === 1) return [data[0].y];

  interface Block {
    sumWy: number;
    sumW: number;
    mean: number;
    indices: number[];
  }

  const blocks: Block[] = data.map((d, i) => ({
    sumWy: d.y * d.w,
    sumW: d.w,
    mean: d.y,
    indices: [i],
  }));

  let i = 0;
  while (i < blocks.length - 1) {
    if (blocks[i].mean > blocks[i + 1].mean) {
      const merged: Block = {
        sumWy: blocks[i].sumWy + blocks[i + 1].sumWy,
        sumW: blocks[i].sumW + blocks[i + 1].sumW,
        mean: 0,
        indices: [...blocks[i].indices, ...blocks[i + 1].indices],
      };
      merged.mean = merged.sumWy / merged.sumW;
      blocks.splice(i, 2, merged);
      if (i > 0) i--;
    } else {
      i++;
    }
  }

  const result = new Array(data.length).fill(0);
  for (const block of blocks) {
    for (const idx of block.indices) {
      result[idx] = block.mean;
    }
  }

  return result;
}

// ---------- キャリブレーションテーブル構築 ----------

export interface RawAggregation {
  confidence: number;
  sample_count: number;
  actual_hit_rate: number;
}

export function buildCalibrationTable(
  raw: RawAggregation[],
  sport: "boat" | "keiba" | "keirin",
  minSamples = 30
): CalibrationTable {
  const sorted = [...raw]
    .filter((r) => r.sample_count >= minSamples)
    .sort((a, b) => a.confidence - b.confidence);

  if (sorted.length === 0) {
    return {
      updatedAt: new Date().toISOString(),
      sport,
      minSamplesForCalibration: minSamples,
      points: [],
    };
  }

  const pavaInput = sorted.map((r) => ({
    x: r.confidence,
    y: r.actual_hit_rate,
    w: r.sample_count,
  }));
  const calibrated = runPAVA(pavaInput);

  const points: CalibrationPoint[] = sorted.map((r, i) => ({
    confidence: r.confidence,
    sampleCount: r.sample_count,
    actualHitRate: r.actual_hit_rate,
    calibratedProb: Math.max(0.01, Math.min(0.99, calibrated[i])),
  }));

  return {
    updatedAt: new Date().toISOString(),
    sport,
    minSamplesForCalibration: minSamples,
    points,
  };
}

// ---------- テーブル読み込み + ルックアップ ----------

const CALIBRATION_DIR = path.join(process.cwd(), "public", "calibration");

let _cache: Map<string, CalibrationTable> = new Map();

export function getCalibrationTable(
  sport: "boat" | "keiba" | "keirin"
): CalibrationTable | null {
  const cached = _cache.get(sport);
  if (cached) return cached;

  const filePath = path.join(CALIBRATION_DIR, `${sport}.json`);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const table: CalibrationTable = JSON.parse(raw);
    _cache.set(sport, table);
    return table;
  } catch {
    return null;
  }
}

export function clearCalibrationCache(): void {
  _cache = new Map();
}

export function getCalibratedProb(
  confidence: number,
  sport: "boat" | "keiba" | "keirin"
): number {
  const table = getCalibrationTable(sport);

  if (!table || table.points.length === 0) {
    // LLMの過信バイアスを補正: confidence/10だと過大評価になるため半分に抑える
    // 競輪実績データ(200R)より: 確信度8でも実際的中率は35%程度
    const conservativeMap: Record<number, number> = {
      10: 0.50, 9: 0.42, 8: 0.35, 7: 0.28, 6: 0.20, 5: 0.15, 4: 0.10
    };
    return conservativeMap[confidence] ?? Math.max(0.01, Math.min(0.99, confidence / 20));
  }

  const points = table.points;

  const exact = points.find((p) => p.confidence === confidence);
  if (exact) return exact.calibratedProb;

  if (confidence <= points[0].confidence) return points[0].calibratedProb;
  if (confidence >= points[points.length - 1].confidence) {
    return points[points.length - 1].calibratedProb;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const lo = points[i];
    const hi = points[i + 1];
    if (confidence >= lo.confidence && confidence <= hi.confidence) {
      const t = (confidence - lo.confidence) / (hi.confidence - lo.confidence);
      return lo.calibratedProb + t * (hi.calibratedProb - lo.calibratedProb);
    }
  }

  return confidence / 10;
}

export function calcCalibratedKelly(
  confidence: number,
  odds: number,
  sport: "boat" | "keiba" | "keirin",
  fraction = 0.25
): number {
  if (!odds || odds <= 1) return -1;

  const p = getCalibratedProb(confidence, sport);
  const kelly = (p * odds - 1) / (odds - 1);
  return kelly * fraction;
}
