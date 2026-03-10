#!/usr/bin/env tsx
/**
 * バックテスト CLI スクリプト
 * Usage:
 *   npx tsx scripts/backtest.ts [YYYYMMDD] [fukusho|standard]
 *
 * 環境変数:
 *   BASE_URL  ... 呼び出し先のベースURL（デフォルト: http://localhost:3000）
 *                 例: BASE_URL=https://your-app.vercel.app npx tsx scripts/backtest.ts 20250308
 */

const date = process.argv[2] ?? (() => {
  const d = new Date();
  d.setTime(d.getTime() + 9 * 60 * 60 * 1000); // JST
  return d.toISOString().slice(0, 10).replace(/-/g, "");
})();

const mode = (process.argv[3] ?? "fukusho") as "fukusho" | "standard";
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

interface Race {
  raceId: string;
  venue: string;
  raceNo: number;
  label: string;
  isPast: boolean;
}

interface FinisherRow { pos: number; num: string; name: string; }
interface FukushoPayout { num: string; name: string; payout: number; }
interface RaceResultData {
  top3: FinisherRow[];
  fukusho: FukushoPayout[];
}

function extractHorseNum(text: string): string {
  if (/^[\s*]*スキップ/.test(text)) return "";
  // 先頭マッチ（優先）
  const m =
    text.match(/^[\s*]*(\d{1,2})番\s*[\u30A0-\u30FF\u4E00-\u9FFF]/) ||
    text.match(/^[\s*【]*(\d{1,2})番[^0-9目人気]/);
  if (m) return m[1];
  // フォールバック: テキスト内の任意位置から馬番を探す
  const fb = text.match(/(\d{1,2})番\s*[\u30A0-\u30FF\u4E00-\u9FFF]/);
  return fb ? fb[1] : "";
}

function extractAIPick(prediction: string, mode: "fukusho" | "standard"): { horseNum: string; horseName: string } {
  let section = "";
  if (mode === "fukusho") {
    const m = prediction.match(/【複勝推奨】([\s\S]*?)(?=【|$)/);
    section = m?.[1]?.trim() ?? "";
  } else {
    const m =
      prediction.match(/【本命[（(◎)）】][^】]*】([\s\S]*?)(?=【|$)/) ||
      prediction.match(/本命[（(◎)）\s]*([^\n]{0,80})/);
    section = m?.[1]?.trim() ?? "";
  }
  const src = section || prediction;
  const horseNum = extractHorseNum(src);
  const nameM = src.match(/\d{1,2}番\s*([\u30A0-\u30FF\u4E00-\u9FFF\u3040-\u309F]{2,15})/);
  return { horseNum, horseName: nameM?.[1] ?? "不明" };
}

// ──────────────────────────────────────────────
async function main() {
  console.log(`\n🏇 バックテスト: ${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)} / ${mode}モード`);
  console.log(`BASE: ${BASE}\n`);

  // 1. レース一覧
  const racesRes = await fetch(`${BASE}/api/races?date=${date}`);
  if (!racesRes.ok) {
    console.error(`❌ レース一覧取得失敗 (HTTP ${racesRes.status})`);
    process.exit(1);
  }
  const racesData = await racesRes.json();
  const pastRaces: Race[] = (racesData.races ?? []).filter((r: Race) => r.isPast);

  if (pastRaces.length === 0) {
    console.log("発走済みレースが見つかりません。");
    process.exit(0);
  }
  console.log(`発走済み: ${pastRaces.length}レース\n`);

  let bets = 0, hits = 0, skips = 0, errors = 0, totalProfit = 0;
  const summary: string[] = [];

  for (const race of pastRaces) {
    process.stdout.write(`  ${race.label}... `);

    // 未勝利レースはデータ不足でAIが機能しないためスキップ
    if (race.label.includes("未勝利")) {
      skips++;
      process.stdout.write(`⏭ 未勝利（データ不足スキップ）\n`);
      summary.push(`${race.label}: スキップ（未勝利）`);
      continue;
    }

    // 2. predict + result を並列取得
    const [predictRes, resultRes] = await Promise.all([
      fetch(`${BASE}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId: race.raceId, mode, backtest: true }),
      }),
      fetch(`${BASE}/api/result?raceId=${race.raceId}`),
    ]);

    const predictData = predictRes.ok ? await predictRes.json() : null;
    const resultData: RaceResultData | null = resultRes.ok ? await resultRes.json() : null;

    const prediction: string | undefined = predictData?.prediction;

    if (!prediction) {
      errors++;
      const err = predictData?.error ?? `HTTP ${predictRes.status}`;
      process.stdout.write(`❌ AI予想失敗 (${err})\n`);
      summary.push(`${race.label}: AI失敗 (${err})`);
      continue;
    }

    // スキップ判定
    const isSkip = /【推奨判定】[^\n]*スキップ/.test(prediction);
    const pick = extractAIPick(prediction, mode);

    if (isSkip && !pick.horseNum) {
      skips++;
      process.stdout.write(`⏭  スキップ推奨\n`);
      summary.push(`${race.label}: スキップ`);
      continue;
    }

    if (!pick.horseNum) {
      errors++;
      process.stdout.write(`⚠️  馬番抽出失敗\n`);
      summary.push(`${race.label}: 馬番不明`);
      continue;
    }

    if (!resultData?.top3?.length) {
      errors++;
      process.stdout.write(`⚠️  結果未取得\n`);
      summary.push(`${race.label}: 結果未取得 (推奨:${pick.horseNum}番)`);
      continue;
    }

    bets++;

    // 的中判定（番号優先、名前フォールバック）
    const finisherByNum = resultData.top3.find(f => f.num === pick.horseNum);
    const finisherByName = !finisherByNum && pick.horseName !== "不明"
      ? resultData.top3.find(f =>
          f.name.includes(pick.horseName) || pick.horseName.includes(f.name)
        )
      : undefined;
    const actualFinisher = finisherByNum ?? finisherByName;
    const hit = !!actualFinisher;

    if (hit && actualFinisher) {
      hits++;
      const payoutInfo = resultData.fukusho.find(f => f.num === actualFinisher.num);
      const payout = payoutInfo?.payout;
      const profit = payout !== undefined ? Math.round((payout / 100) * 1000 - 1000) : 0;
      totalProfit += profit;
      const nameTag = finisherByName ? ` (名前マッチ)` : "";
      process.stdout.write(`✅ 的中! ${pick.horseNum}番${pick.horseName} → 複勝¥${payout ?? "不明"} (+¥${profit})${nameTag}\n`);
      summary.push(`${race.label}: ✅的中 ${pick.horseNum}番 複勝¥${payout ?? "不明"}`);
    } else {
      totalProfit -= 1000;
      const result3 = resultData.top3.map(f => `${f.pos}着${f.num}番`).join(", ");
      process.stdout.write(`❌ 外れ (推奨:${pick.horseNum}番${pick.horseName} / 結果:${result3})\n`);
      summary.push(`${race.label}: ❌外れ ${pick.horseNum}番`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  // 3. 集計
  const line = "─".repeat(55);
  console.log(`\n${line}`);
  console.log(`📊 バックテスト集計 (${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)} / ${mode})`);
  console.log(line);
  console.log(`  ベット: ${bets}R  的中: ${hits}R  スキップ: ${skips}R  エラー: ${errors}R`);
  if (bets > 0) {
    const hitRate = Math.round(hits / bets * 100);
    const roi = Math.round((totalProfit + bets * 1000) / (bets * 1000) * 100);
    console.log(`  的中率: ${hitRate}%`);
    console.log(`  収支: ${totalProfit >= 0 ? "+" : ""}¥${totalProfit.toLocaleString()}  回収率: ${roi}%`);
  }
  console.log(`${line}\n`);
  console.log("【レース別サマリー】");
  summary.forEach(s => console.log(`  ${s}`));
  console.log("");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
