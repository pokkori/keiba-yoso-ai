import { getSupabaseAdmin } from "./supabase";

export interface PredictionLog {
  id: string;
  raceId: string;
  raceName: string;
  raceDate: string; // YYYY-MM-DD
  recommendation: "buy" | "skip";
  horseNum: number | null;
  horseName: string | null;
  ev: number | null; // 期待値
  odds: number | null;
  createdAt: string;
  // 翌日更新
  actualPos: number | null;
  hit: boolean | null; // 複勝圏内（3着以内）かどうか
  returnAmount: number | null; // 払い戻し金額（100円購入時）
  updatedAt: string | null;
}

export interface BacktestStats {
  totalPredictions: number;
  buyCount: number;
  skipCount: number;
  hitCount: number; // buy且つhit=true
  hitRate: number; // hitCount / buyCount
  hitRateLow: number; // ウィルソン区間 下限
  hitRateHigh: number; // ウィルソン区間 上限
  totalReturn: number; // sum(returnAmount)
  totalInvested: number; // buyCount * 100
  recoveryRate: number; // totalReturn / totalInvested * 100
  period: { from: string; to: string };
}

// ウィルソン区間計算（95%CI）
function wilsonInterval(hits: number, total: number): { low: number; high: number } {
  if (total === 0) return { low: 0, high: 0 };
  const z = 1.96;
  const p = hits / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) /
    denominator;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
}

export async function savePrediction(
  log: Omit<
    PredictionLog,
    "id" | "createdAt" | "actualPos" | "hit" | "returnAmount" | "updatedAt"
  >
): Promise<string> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("keiba_prediction_logs")
      .insert({
        race_id: log.raceId,
        race_name: log.raceName,
        race_date: log.raceDate,
        recommendation: log.recommendation,
        horse_num: log.horseNum,
        horse_name: log.horseName,
        ev: log.ev,
        odds: log.odds,
      })
      .select("id")
      .single();
    if (error) {
      console.error("savePrediction error:", error.message);
      return "";
    }
    return String(data.id);
  } catch (e) {
    console.error("savePrediction exception:", e);
    return "";
  }
}

export async function updatePredictionResult(
  id: string,
  actualPos: number,
  returnAmount: number
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("keiba_prediction_logs")
      .update({
        actual_pos: actualPos,
        hit: actualPos <= 3,
        return_amount: returnAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) console.error("updatePredictionResult error:", error.message);
  } catch (e) {
    console.error("updatePredictionResult exception:", e);
  }
}

export async function getPredictionLogs(): Promise<PredictionLog[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("keiba_prediction_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return [];
    return (data ?? []).map(
      (row: {
        id: string;
        race_id: string;
        race_name: string;
        race_date: string;
        recommendation: string;
        horse_num: number | null;
        horse_name: string | null;
        ev: number | null;
        odds: number | null;
        created_at: string;
        actual_pos: number | null;
        hit: boolean | null;
        return_amount: number | null;
        updated_at: string | null;
      }) => ({
        id: String(row.id),
        raceId: row.race_id,
        raceName: row.race_name,
        raceDate: row.race_date,
        recommendation: row.recommendation as "buy" | "skip",
        horseNum: row.horse_num,
        horseName: row.horse_name,
        ev: row.ev,
        odds: row.odds,
        createdAt: row.created_at,
        actualPos: row.actual_pos,
        hit: row.hit,
        returnAmount: row.return_amount,
        updatedAt: row.updated_at,
      })
    );
  } catch {
    return [];
  }
}

export async function getBacktestStats(): Promise<BacktestStats> {
  const logs = await getPredictionLogs();
  const buyLogs = logs.filter((l) => l.recommendation === "buy");
  const completedBuy = buyLogs.filter((l) => l.hit !== null);
  const hitLogs = completedBuy.filter((l) => l.hit === true);
  const totalReturn = hitLogs.reduce((s, l) => s + (l.returnAmount ?? 0), 0);
  const { low, high } = wilsonInterval(hitLogs.length, completedBuy.length);
  const dates = logs.map((l) => l.raceDate).sort();
  return {
    totalPredictions: logs.length,
    buyCount: buyLogs.length,
    skipCount: logs.filter((l) => l.recommendation === "skip").length,
    hitCount: hitLogs.length,
    hitRate:
      completedBuy.length > 0 ? hitLogs.length / completedBuy.length : 0,
    hitRateLow: low,
    hitRateHigh: high,
    totalReturn,
    totalInvested: completedBuy.length * 100,
    recoveryRate:
      completedBuy.length > 0
        ? (totalReturn / (completedBuy.length * 100)) * 100
        : 0,
    period: {
      from: dates[0] ?? "-",
      to: dates[dates.length - 1] ?? "-",
    },
  };
}
