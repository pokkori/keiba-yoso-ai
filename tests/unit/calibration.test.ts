import { describe, it, expect } from "vitest";
import { runPAVA, buildCalibrationTable, getCalibratedProb, calcCalibratedKelly } from "../../src/lib/calibration";

describe("runPAVA（Isotonic Regression）", () => {
  it("単調増加データはそのまま返す", () => {
    const data = [
      { x: 1, y: 0.2, w: 10 },
      { x: 2, y: 0.4, w: 10 },
      { x: 3, y: 0.6, w: 10 },
    ];
    const result = runPAVA(data);
    expect(result[0]).toBeCloseTo(0.2);
    expect(result[1]).toBeCloseTo(0.4);
    expect(result[2]).toBeCloseTo(0.6);
  });

  it("単調減少データは全て加重平均にフラット化", () => {
    const data = [
      { x: 1, y: 0.6, w: 1 },
      { x: 2, y: 0.3, w: 1 },
    ];
    const result = runPAVA(data);
    expect(result[0]).toBeCloseTo(0.45);
    expect(result[1]).toBeCloseTo(0.45);
  });

  it("空配列は空配列を返す", () => {
    expect(runPAVA([])).toHaveLength(0);
  });

  it("要素1つはそのまま返す", () => {
    const result = runPAVA([{ x: 1, y: 0.5, w: 5 }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeCloseTo(0.5);
  });

  it("加重平均が正しく計算される（重み考慮）", () => {
    const data = [
      { x: 1, y: 0.8, w: 1 },
      { x: 2, y: 0.2, w: 3 },
    ];
    const result = runPAVA(data);
    expect(result[0]).toBeCloseTo(0.35);
    expect(result[1]).toBeCloseTo(0.35);
  });
});

describe("buildCalibrationTable", () => {
  it("サンプル数不足の点は除外される（デフォルト最小30）", () => {
    const rawData = [
      { confidence: 5, sample_count: 5, actual_hit_rate: 0.2 },
      { confidence: 7, sample_count: 50, actual_hit_rate: 0.4 },
      { confidence: 9, sample_count: 60, actual_hit_rate: 0.6 },
    ];
    const table = buildCalibrationTable(rawData, "keiba");
    expect(table.points.length).toBe(2);
    expect(table.sport).toBe("keiba");
  });

  it("全データがサンプル不足なら空テーブルを返す", () => {
    const table = buildCalibrationTable(
      [{ confidence: 5, sample_count: 5, actual_hit_rate: 0.3 }],
      "keiba"
    );
    expect(table.points).toHaveLength(0);
  });

  it("的中率が単調増加に補正される（PAVA適用）", () => {
    const rawData = [
      { confidence: 5, sample_count: 50, actual_hit_rate: 0.30 },
      { confidence: 8, sample_count: 50, actual_hit_rate: 0.20 }, // 逆転
      { confidence: 10, sample_count: 50, actual_hit_rate: 0.50 },
    ];
    const table = buildCalibrationTable(rawData, "keiba");
    const probs = table.points.map((p) => p.calibratedProb);
    for (let i = 1; i < probs.length; i++) {
      expect(probs[i]).toBeGreaterThanOrEqual(probs[i - 1] - 0.001);
    }
  });
});

describe("calcCalibratedKelly", () => {
  it("オッズ1.0以下はフラクション-1を返す（賭け禁止）", () => {
    expect(calcCalibratedKelly(8, 1.0, "keiba")).toBe(-1);
    expect(calcCalibratedKelly(8, 0.9, "keiba")).toBe(-1);
  });

  it("オッズ未指定（0）はフラクション-1を返す", () => {
    expect(calcCalibratedKelly(8, 0, "keiba")).toBe(-1);
  });

  it("戻り値は有限値（負のKelly=負のEV）", () => {
    const result = calcCalibratedKelly(7, 3.5, "keiba");
    expect(isFinite(result)).toBe(true);
  });

  it("fractionパラメータで賭け比率を制御できる", () => {
    const full = calcCalibratedKelly(9, 5.0, "keiba", 1.0);
    const quarter = calcCalibratedKelly(9, 5.0, "keiba", 0.25);
    if (full > 0 && quarter > 0) {
      expect(quarter).toBeCloseTo(full * 0.25, 5);
    }
  });
});
