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
  hit?: boolean;         // true = AI pick placed (top3)
  payout?: number;       // actual fukusho payout for AI pick
  profit?: number;       // payout - 1000 (per ¥1,000 bet)
}

function getJSTDateStr(offset = 0): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000 + offset * 86400000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
}

// AI出力から馬番を抽出
function extractHorseNum(text: string): string {
  // 「複勝推奨】X番 馬名」パターン
  const m =
    text.match(/複勝推奨[】\s]*(\d{1,2})番/) ||
    text.match(/^(\d{1,2})番/) ||
    text.match(/(\d{1,2})番\s*[^\d]/);
  return m ? m[1] : "";
}

// AI予想から複勝推奨セクションを抽出
function extractAIPick(prediction: string): AIPick {
  const section = prediction.match(/【複勝推奨】([\s\S]*?)(?=【|$)/)?.[1]?.trim() ?? prediction;
  const horseNum = extractHorseNum(section);
  // 馬名を取得（「X番 馬名」の馬名部分）
  const nameM = section.match(/\d{1,2}番\s*([\u30A0-\u30FF\u4E00-\u9FFF\u3040-\u309F]{2,15})/);
  const horseName = nameM ? nameM[1] : "不明";
  return { horseName, horseNum, rawText: section };
}

function StatusBadge({ status }: { status: RaceStatus }) {
  if (status === "loading") return <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">分析中...</span>;
  if (status === "error") return <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">エラー</span>;
  return null;
}

function HitBadge({ hit, profit }: { hit: boolean; profit: number }) {
  if (hit) {
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${profit > 0 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
        ✓ 的中 {profit > 0 ? `+¥${profit}` : `¥${profit}`}
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
  const [races, setRaces] = useState<Race[]>([]);
  const [racesLoading, setRacesLoading] = useState(false);
  const [rows, setRows] = useState<RaceRow[]>([]);
  const [runningAll, setRunningAll] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status").then(r => r.json()).then(d => setIsPremium(d.isPremium));
  }, []);

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
      // 非プレミアムは結果のみ取得、プレミアムはAI+結果を並列取得
      const fetches: Promise<Response>[] = [fetch(`/api/result?raceId=${row.race.raceId}`)];
      if (isPremium) {
        fetches.push(fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raceId: row.race.raceId, mode: "fukusho" }),
        }));
      }

      const [resultRes, predictRes] = await Promise.all(fetches);
      const resultData = resultRes.ok ? await resultRes.json() : null;
      const predictData = predictRes ? (predictRes.status === 429 ? { error: "LIMIT_REACHED" } : await predictRes.json()) : null;

      const result: RaceResult | undefined = resultData?.top3 ? resultData : undefined;
      const aiPick = predictData?.prediction ? extractAIPick(predictData.prediction) : undefined;

      let hit: boolean | undefined;
      let payout: number | undefined;
      let profit: number | undefined;

      if (aiPick && result && aiPick.horseNum) {
        const finisher = result.top3.find(f => f.num === aiPick.horseNum);
        hit = !!finisher;
        if (hit) {
          const payoutInfo = result.fukusho.find(f => f.num === aiPick.horseNum);
          payout = payoutInfo?.payout ?? 0;
          profit = Math.round((payout / 100) * 1000 - 1000);
        } else {
          payout = 0;
          profit = -1000;
        }
      }

      const errorMsg = !result ? "結果データ取得失敗" : undefined;

      setRows(prev => prev.map((r, i) => i === idx
        ? { ...r, status: result ? "done" : "error", result, aiPick, hit, payout, profit, errorMsg }
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

  // 集計
  const doneRows = rows.filter(r => r.status === "done" && r.hit !== undefined);
  const hitCount = doneRows.filter(r => r.hit).length;
  const totalProfit = doneRows.reduce((acc, r) => acc + (r.profit ?? -1000), 0);
  const totalBet = doneRows.length * 1000;
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
        <p className="text-sm text-gray-500 mb-6">複勝モードのAI予想と実際の結果を照合します（¥1,000/レース想定）</p>

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
              { label: "分析済み", value: `${doneRows.length}R`, color: "text-gray-800" },
              { label: "的中", value: `${hitCount}R`, color: "text-green-700" },
              { label: "的中率", value: `${Math.round((hitCount / doneRows.length) * 100)}%`, color: hitCount / doneRows.length >= 0.7 ? "text-green-700" : "text-red-600" },
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
            <span>※ 複勝¥1,000×{doneRows.length}レース</span>
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
            {/* プレミアム促進バナー（非プレミアム向け） */}
            {!isPremium && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-amber-800">🎯 AI的中照合はプレミアム限定</p>
                  <p className="text-xs text-amber-600 mt-0.5">無料では実際の結果確認のみ。プレミアムでAI予想との照合・的中率・収支計算が使えます。</p>
                </div>
                <button onClick={() => startCheckout("basic")}
                  className="shrink-0 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-lg whitespace-nowrap">
                  ¥980/月で有効化
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">発走済み {races.length}レース</p>
              <button
                onClick={analyzeAll}
                disabled={runningAll || rows.every(r => r.status === "done")}
                className="text-sm bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl font-bold transition-colors">
                {runningAll ? (
                  <span className="flex items-center gap-1.5"><span className="animate-spin">⟳</span>取得中...</span>
                ) : isPremium ? "全レース一括分析" : "全レース結果を確認"}
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
                      {row.status === "done" && row.hit !== undefined && (
                        <HitBadge hit={row.hit} profit={row.profit ?? -1000} />
                      )}
                      {row.status === "idle" && (
                        <button onClick={() => analyzeRace(idx)}
                          className={`text-xs text-white px-3 py-1 rounded-lg font-bold ${isPremium ? "bg-amber-500 hover:bg-amber-600" : "bg-green-600 hover:bg-green-700"}`}>
                          {isPremium ? "🎯 AI分析" : "📋 結果確認"}
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
                    <div className={`grid gap-3 mt-2 text-xs ${isPremium ? "grid-cols-2" : "grid-cols-1"}`}>
                      {/* AI予想（プレミアムのみ） */}
                      {isPremium && (
                        <div className="bg-amber-50 rounded-lg p-3">
                          <div className="font-bold text-amber-800 mb-1">🎯 AI複勝推奨</div>
                          {row.aiPick?.horseNum ? (
                            <div>
                              <span className="text-gray-800 font-medium">{row.aiPick.horseNum}番 {row.aiPick.horseName}</span>
                              <p className="text-gray-500 mt-1 leading-snug line-clamp-3">{row.aiPick.rawText}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">AI予想の取得に失敗しました</span>
                          )}
                        </div>
                      )}

                      {/* 実際の結果 */}
                      <div className={`rounded-lg p-3 ${row.hit ? "bg-green-50" : "bg-gray-50"}`}>
                        <div className="font-bold text-gray-700 mb-1">📋 実際の結果</div>
                        {row.result?.top3.length ? (
                          <div className="space-y-0.5">
                            {row.result.top3.map(f => {
                              const isAIPick = f.num === row.aiPick?.horseNum;
                              const payout = row.result?.fukusho.find(p => p.num === f.num)?.payout;
                              return (
                                <div key={f.pos}
                                  className={`flex items-center justify-between ${isAIPick ? "font-bold text-green-700" : "text-gray-600"}`}>
                                  <span>{f.pos}着 {f.num}番 {f.name} {isAIPick ? "← AI推奨" : ""}</span>
                                  {payout ? <span className="text-gray-500">¥{payout}</span> : null}
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
