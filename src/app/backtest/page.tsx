"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Race {
  raceId: string;
  venue: string;
  raceNo: number;
  label: string;
  isPast: boolean;
}

interface FinisherRow { pos: number; num: string; name: string; }
interface FukushoPayout { num: string; name: string; payout: number; }

interface RaceResult {
  top3: FinisherRow[];
  fukusho: FukushoPayout[];
  rawFinish: string;
}

interface AIPick {
  horseName: string;
  horseNum: string; // extracted from AI text
  rawText: string;
}

type RaceStatus = "idle" | "loading" | "done" | "error";

interface RaceRow {
  race: Race;
  status: RaceStatus;
  result?: RaceResult;
  aiPick?: AIPick;
  errorMsg?: string;
  predictError?: string; // reason AI prediction failed
  skip?: boolean;        // true = AI recommended skipping this race
  hit?: boolean;         // true = AI pick placed (top3)
  payout?: number;       // actual fukusho payout for AI pick (undefined = unknown)
  profit?: number;       // net profit (undefined = unknown payout)
}

function getJSTDateStr(offset = 0): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000 + offset * 86400000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
}

// AI出力から馬番を抽出（セクションの先頭にある "X番 馬名" のみを対象）
// 説明文中の「1番人気」「3番手」などは誤検出しないよう先頭限定
function extractHorseNum(sectionText: string): string {
  // スキップ推奨の場合は馬番なしとして扱う
  if (/^[\s*]*スキップ/.test(sectionText)) return "";

  const m =
    // 先頭の "X番 カタカナ/漢字" パターン（最も確実）
    sectionText.match(/^[\s*]*(\d{1,2})番\s*[\u30A0-\u30FF\u4E00-\u9FFF]/) ||
    // 先頭の "X番" + 何らかの文字
    sectionText.match(/^[\s*【]*(\d{1,2})番[^0-9目人気]/);
  return m ? m[1] : "";
}

// スキップ推奨かどうかを判定
function isSkipRecommended(prediction: string): boolean {
  const judgement = prediction.match(/【推奨判定】([^\n]*)/)?.[1] ?? "";
  return judgement.includes("スキップ") || judgement.includes("skip");
}

// AI予想から複勝推奨セクションを抽出
function extractAIPick(prediction: string, mode: "fukusho" | "standard"): AIPick {
  let section: string;
  if (mode === "fukusho") {
    // 【複勝推奨】セクションが存在する場合のみ抽出。全文フォールバックは行わない
    const sectionMatch = prediction.match(/【複勝推奨】([\s\S]*?)(?=【|$)/);
    if (!sectionMatch) {
      return { horseName: "", horseNum: "", rawText: prediction.slice(0, 300) };
    }
    section = sectionMatch[1].trim();
  } else {
    // 通常モード: 本命(◎) を抽出
    const sectionMatch =
      prediction.match(/【本命[（(◎)）】][^】]*】([\s\S]*?)(?=【|$)/) ||
      prediction.match(/本命[（(◎)）\s]*([^\n]{0,80})/);
    if (!sectionMatch) {
      return { horseName: "", horseNum: "", rawText: prediction.slice(0, 300) };
    }
    section = sectionMatch[1].trim();
  }
  const horseNum = extractHorseNum(section);
  const nameM = section.match(/\d{1,2}番\s*([\u30A0-\u30FF\u4E00-\u9FFF\u3040-\u309F]{2,15})/);
  const horseName = nameM ? nameM[1] : "不明";
  return { horseName, horseNum, rawText: section };
}

function StatusBadge({ status }: { status: RaceStatus }) {
  if (status === "loading") return <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">分析中...</span>;
  if (status === "error") return <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">エラー</span>;
  return null;
}

function HitBadge({ hit, profit, skip }: { hit: boolean; profit?: number; skip?: boolean }) {
  if (skip) {
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">― 推奨なし</span>;
  }
  if (hit) {
    if (profit === undefined) {
      return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ 的中（払戻不明）</span>;
    }
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${profit >= 0 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
        ✓ 的中 {profit >= 0 ? `+¥${profit.toLocaleString()}` : `±¥0`}
      </span>
    );
  }
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">✗ 外れ -¥1,000</span>;
}

async function startCheckout(plan: string) {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

export default function BacktestPage() {
  const [date, setDate] = useState(getJSTDateStr());
  const [betMode, setBetMode] = useState<"fukusho" | "standard">("fukusho");
  const [races, setRaces] = useState<Race[]>([]);
  const [racesLoading, setRacesLoading] = useState(false);
  const [rows, setRows] = useState<RaceRow[]>([]);
  const [runningAll, setRunningAll] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status").then(r => r.json()).then(d => setIsPremium(d.isPremium));
  }, []);

  // モード変更時にリセット
  useEffect(() => {
    setRows(prev => prev.map(r => ({ race: r.race, status: "idle" as RaceStatus })));
  }, [betMode]);

  // レース一覧を取得
  useEffect(() => {
    if (!date) return;
    setRaces([]);
    setRows([]);
    setRacesLoading(true);
    const dateStr = date.replace(/-/g, "");
    fetch(`/api/races?date=${dateStr}`)
      .then(r => r.json())
      .then(data => {
        if (data.races) {
          const pastRaces = data.races.filter((r: Race) => r.isPast);
          setRaces(pastRaces);
          setRows(pastRaces.map((race: Race) => ({ race, status: "idle" as RaceStatus })));
        }
      })
      .catch(() => {})
      .finally(() => setRacesLoading(false));
  }, [date]);

  // 1レース分析
  async function analyzeRace(idx: number) {
    const row = rows[idx];
    if (!row || row.status === "loading") return;

    setRows(prev => prev.map((r, i) => i === idx ? { ...r, status: "loading" } : r));

    try {
      // バックテストはカウント対象外なのでプレミアム不要
      const apiMode = betMode === "fukusho" ? "fukusho" : "standard";
      const fetches: Promise<Response>[] = [
        fetch(`/api/result?raceId=${row.race.raceId}`),
        fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raceId: row.race.raceId, mode: apiMode, backtest: true }),
        }),
      ];

      const [resultRes, predictRes] = await Promise.all(fetches);
      const resultData = resultRes.ok ? await resultRes.json() : null;
      const predictData = predictRes ? (predictRes.status === 429 ? { error: "LIMIT_REACHED" } : await predictRes.json()) : null;

      const result: RaceResult | undefined = resultData?.top3 ? resultData : undefined;
      const rawPrediction: string | undefined = predictData?.prediction;
      const predictError: string | undefined = !rawPrediction
        ? (predictData?.error === "FETCH_FAILED"
          ? `レースデータ取得失敗（${predictData.venue ?? ""}${predictData.raceNo ?? ""}R）`
          : predictData?.error ?? "AI予想API失敗")
        : undefined;
      // まず馬推奨を抽出し、推奨馬がいる場合はスキップ扱いにしない
      const aiPickRaw = rawPrediction ? extractAIPick(rawPrediction, betMode) : undefined;
      const hasHorsePick = !!aiPickRaw?.horseNum;
      // スキップ = AIがスキップ推奨 かつ 推奨馬なし（矛盾を防ぐ）
      const skip = betMode === "fukusho" && rawPrediction
        ? isSkipRecommended(rawPrediction) && !hasHorsePick
        : false;
      // スキップでなければ aiPick を保持（horseNum が空でも rawText 表示のため）
      const aiPick = !skip ? aiPickRaw : undefined;

      let hit: boolean | undefined;
      let payout: number | undefined;
      let profit: number | undefined;

      if (!skip && aiPick && result && aiPick.horseNum) {
        const finisher = result.top3.find(f => f.num === aiPick.horseNum);
        hit = !!finisher;
        if (hit) {
          const payoutInfo = result.fukusho.find(f => f.num === aiPick.horseNum);
          payout = payoutInfo?.payout;
          profit = payout !== undefined ? Math.round((payout / 100) * 1000 - 1000) : undefined;
        } else {
          profit = -1000;
        }
      }

      const errorMsg = !result ? "結果データ取得失敗" : undefined;

      setRows(prev => prev.map((r, i) => i === idx
        ? { ...r, status: result ? "done" : "error", result, aiPick, skip, hit, payout, profit, errorMsg, predictError }
        : r));
    } catch (e) {
      setRows(prev => prev.map((r, i) => i === idx
        ? { ...r, status: "error", errorMsg: e instanceof Error ? e.message : "エラー" }
        : r));
    }
  }

  // 全レース順番に分析（Vercelタイムアウト回避のため逐次）
  async function analyzeAll() {
    setRunningAll(true);
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].status === "done") continue;
      await analyzeRace(i);
      await new Promise(r => setTimeout(r, 500));
    }
    setRunningAll(false);
  }

  // 集計（スキップ推奨レースはP&L対象外）
  const doneRows = rows.filter(r => r.status === "done");
  const bettingRows = doneRows.filter(r => !r.skip && r.hit !== undefined);
  const skipCount = doneRows.filter(r => r.skip).length;
  const hitCount = bettingRows.filter(r => r.hit).length;
  // profit undefined（払戻不明）の的中は +0 として計算
  const totalProfit = bettingRows.reduce((acc, r) =>
    acc + (r.profit !== undefined ? r.profit : r.hit ? 0 : -1000), 0);
  const totalBet = bettingRows.length * 1000;
  const roi = totalBet > 0 ? Math.round((totalProfit / totalBet) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-green-200 bg-green-900">
        <Link href="/" className="text-xl font-bold text-white">🏇 競馬予想AI</Link>
        <div className="flex items-center gap-4">
          <Link href="/predict" className="text-sm text-green-300 hover:text-white">予想する</Link>
          <Link href="/tracker" className="text-sm text-green-300 hover:text-white">回収率管理</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold text-gray-900 mb-1">📊 バックテスト</h1>
        <p className="text-sm text-gray-500 mb-3">AI予想と実際の結果を照合します（¥1,000/レース想定）</p>

        {/* モード切替 */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setBetMode("fukusho")}
            className={`text-sm px-4 py-2 rounded-xl font-bold transition-colors ${betMode === "fukusho" ? "bg-amber-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-amber-50"}`}>
            🎯 複勝モード
          </button>
          <button
            onClick={() => setBetMode("standard")}
            className={`text-sm px-4 py-2 rounded-xl font-bold transition-colors ${betMode === "standard" ? "bg-green-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-green-50"}`}>
            🏆 通常モード（本命◎）
          </button>
        </div>

        {/* 日付選択 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">開催日</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                max={getJSTDateStr()}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setDate(getJSTDateStr(-1))}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg">昨日</button>
              <button onClick={() => setDate(getJSTDateStr())}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg">今日</button>
            </div>
          </div>
        </div>

        {/* 集計サマリー */}
        {doneRows.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: "ベット", value: `${bettingRows.length}R`, color: "text-gray-800" },
              { label: "的中", value: `${hitCount}R`, color: "text-green-700" },
              { label: "的中率", value: bettingRows.length > 0 ? `${Math.round((hitCount / bettingRows.length) * 100)}%` : "-", color: bettingRows.length > 0 && hitCount / bettingRows.length >= 0.7 ? "text-green-700" : "text-red-600" },
              { label: "収支", value: `${totalProfit >= 0 ? "+" : ""}¥${totalProfit.toLocaleString()}`, color: totalProfit >= 0 ? "text-green-700" : "text-red-600" },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                <div className="text-xs text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>
        )}
        {doneRows.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2 mb-5 text-xs text-gray-500 flex justify-between">
            <span>投資総額: ¥{totalBet.toLocaleString()}</span>
            <span>回収率: {roi >= 0 ? "+" : ""}{roi}%</span>
            <span>{skipCount > 0 ? `スキップ${skipCount}R含む` : `複勝¥1,000×${bettingRows.length}R`}</span>
          </div>
        )}

        {/* レース一覧 */}
        {racesLoading ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <span className="animate-spin inline-block mr-2">⟳</span>レース一覧を取得中...
          </div>
        ) : races.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">
            この日の発走済みレースが見つかりません
          </div>
        ) : (
          <>
<div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">発走済み {races.length}レース</p>
              <button
                onClick={analyzeAll}
                disabled={runningAll || rows.every(r => r.status === "done")}
                className="text-sm bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl font-bold transition-colors">
                {runningAll ? (
                  <span className="flex items-center gap-1.5"><span className="animate-spin">⟳</span>取得中...</span>
                ) : "全レース一括分析"}
              </button>
            </div>

            <div className="space-y-3">
              {rows.map((row, idx) => (
                <div key={row.race.raceId}
                  className={`bg-white rounded-xl border p-4 shadow-sm transition-colors ${row.hit === true ? "border-green-300" : row.hit === false ? "border-red-200" : "border-gray-200"}`}>

                  {/* レースヘッダー */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-gray-800">{row.race.label}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={row.status} />
                      {row.status === "done" && (row.skip || row.hit !== undefined) && (
                        <HitBadge hit={row.hit ?? false} profit={row.profit} skip={row.skip} />
                      )}
                      {row.status === "idle" && (
                        <button onClick={() => analyzeRace(idx)}
                          className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg font-bold">
                          🎯 AI分析
                        </button>
                      )}
                      {row.status === "error" && (
                        <button onClick={() => analyzeRace(idx)}
                          className="text-xs bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded-lg">
                          再試行
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 結果表示 */}
                  {row.status === "done" && (
                    <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                      {/* AI予想 */}
                      <div className={`rounded-lg p-3 ${row.skip ? "bg-gray-50" : betMode === "fukusho" ? "bg-amber-50" : "bg-blue-50"}`}>
                        <div className={`font-bold mb-1 ${row.skip ? "text-gray-500" : betMode === "fukusho" ? "text-amber-800" : "text-blue-800"}`}>
                          {betMode === "fukusho" ? "🎯 AI複勝推奨" : "🏆 AI本命（◎）"}
                        </div>
                        {row.skip ? (
                          <span className="text-gray-400 text-xs">このレースはスキップ推奨（ベット対象外）</span>
                        ) : row.aiPick?.horseNum ? (
                          <div>
                            <span className="text-gray-800 font-medium">{row.aiPick.horseNum}番 {row.aiPick.horseName}</span>
                            <p className="text-gray-500 mt-1 leading-snug line-clamp-3">{row.aiPick.rawText}</p>
                          </div>
                        ) : row.aiPick?.rawText ? (
                          // 馬番抽出失敗 — AI予想テキストをそのまま表示
                          <p className="text-gray-500 text-xs leading-snug line-clamp-4">{row.aiPick.rawText}</p>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            {row.predictError ?? "AI予想の取得に失敗しました"}
                          </span>
                        )}
                      </div>

                      {/* 実際の結果 */}
                      <div className={`rounded-lg p-3 ${row.hit ? "bg-green-50" : "bg-gray-50"}`}>
                        <div className="font-bold text-gray-700 mb-1">📋 実際の結果</div>
                        {row.result?.top3.length ? (
                          <div className="space-y-0.5">
                            {row.result.top3.map(f => {
                              const isAIPick = !row.skip && f.num === row.aiPick?.horseNum;
                              const payout = row.result?.fukusho.find(p => p.num === f.num)?.payout;
                              return (
                                <div key={f.pos}
                                  className={`flex items-center justify-between ${isAIPick ? "font-bold text-green-700" : "text-gray-600"}`}>
                                  <span>{f.pos}着 {f.num}番 {f.name} {isAIPick ? "← AI推奨" : ""}</span>
                                  {payout !== undefined ? <span className="text-gray-500">¥{payout}</span> : isAIPick && row.hit ? <span className="text-gray-400 text-xs">払戻不明</span> : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400">結果未取得</span>
                        )}
                        {row.hit && row.payout ? (
                          <div className="mt-2 font-bold text-green-700">
                            複勝¥{row.payout} → +¥{row.profit?.toLocaleString()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {row.status === "error" && (
                    <p className="text-xs text-red-500 mt-1">{row.errorMsg}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <footer className="text-center py-6 text-xs text-gray-400 border-t mt-8 space-x-4">
        <a href="/legal" className="hover:text-gray-600">特定商取引法に基づく表記</a>
        <a href="/privacy" className="hover:text-gray-600">プライバシーポリシー</a>
      </footer>
    </div>
  );
}
