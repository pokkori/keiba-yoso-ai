"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const FREE_LIMIT = 1;
const STORAGE_KEY = "keiba_predict_count";

interface Race {
  raceId: string;
  venue: string;
  raceNo: number;
  label: string;
  startTime?: string;
  isPast: boolean;
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

function getTodayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function PredictPage() {
  const [date, setDate] = useState(getTodayJST());
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState("");
  const [racesLoading, setRacesLoading] = useState(false);
  const [budget, setBudget] = useState("");

  const [result, setResult] = useState("");
  const [raceInfo, setRaceInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status").then((r) => r.json()).then((d) => setIsPremium(d.isPremium));
    setUsageCount(Number(localStorage.getItem(STORAGE_KEY) || "0"));
  }, []);

  useEffect(() => {
    if (!date) return;
    setRaces([]);
    setSelectedRaceId("");
    setResult("");
    setRacesLoading(true);

    const dateStr = date.replace(/-/g, "");
    fetch(`/api/races?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.races && data.races.length > 0) {
          setRaces(data.races);
          // 最初の未発走レースを選択、なければ先頭
          const upcoming = data.races.find((r: Race) => !r.isPast);
          setSelectedRaceId((upcoming ?? data.races[0]).raceId);
        }
      })
      .catch(() => {})
      .finally(() => setRacesLoading(false));
  }, [date]);

  const selectedRace = races.find((r) => r.raceId === selectedRaceId);
  const racePast = selectedRace?.isPast ?? false;

  const handlePredict = async () => {
    if (racePast) return;

    if (!isPremium && usageCount >= FREE_LIMIT) {
      setShowPaywall(true);
      return;
    }

    if (!selectedRaceId) {
      setError("レースを選択してください");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    setRaceInfo("");

    try {
      const budgetNum = budget ? parseInt(budget.replace(/,/g, ""), 10) : undefined;
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId: selectedRaceId, budget: budgetNum }),
      });
      if (res.status === 429) { setShowPaywall(true); return; }
      const data = await res.json();

      if (res.status === 502 && data.error === "FETCH_FAILED") {
        setError("出走表の自動取得ができませんでした。時間をおいてから別のレースを選択してください。");
        return;
      }

      if (data.error) throw new Error(data.error);
      setResult(data.prediction);
      setRaceInfo(data.raceInfo || "");
      const next = data.count ?? usageCount + 1;
      setUsageCount(next);
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const venueGroups = races.reduce<Record<string, Race[]>>((acc, race) => {
    if (!acc[race.venue]) acc[race.venue] = [];
    acc[race.venue].push(race);
    return acc;
  }, {});

  const shareLabel = raceInfo || "競馬";

  return (
    <div className="min-h-screen bg-white">
      {showPaywall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">無料枠を使い切りました</h2>
            <p className="text-gray-500 text-sm mb-6">
              無料プランは1レース予想まで。<br />
              プレミアムプランで全レース無制限に使えます。
            </p>
            <button
              onClick={() => startCheckout("pro")}
              className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white py-3 rounded-xl font-bold hover:from-green-800 hover:to-green-700 transition-all mb-3"
            >
              プロプランで続ける（¥2,980/月）
            </button>
            <button
              onClick={() => startCheckout("basic")}
              className="w-full border border-green-300 text-green-700 py-2 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors mb-3"
            >
              ベーシックプラン（¥980/月）
            </button>
            <button onClick={() => setShowPaywall(false)} className="text-xs text-gray-400 hover:text-gray-600">
              閉じる
            </button>
          </div>
        </div>
      )}

      <nav className="flex items-center justify-between px-6 py-4 border-b border-green-200 bg-green-900">
        <Link href="/" className="text-xl font-bold text-white">🏇 競馬予想AI</Link>
        {!isPremium && (
          <span className="text-green-300 text-xs">無料残り {Math.max(0, FREE_LIMIT - usageCount)} 回</span>
        )}
      </nav>

      <div className="max-w-2xl mx-auto py-10 px-6">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">レース予想</h1>

        {/* 日付選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-600 mb-1">開催日</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-green-500"
          />
        </div>

        {racesLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
            <span className="animate-spin inline-block">⟳</span> レース一覧を取得中...
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-1">レース選択</label>
            {races.length > 0 ? (
              <select
                value={selectedRaceId}
                onChange={(e) => { setSelectedRaceId(e.target.value); setResult(""); setError(""); }}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-green-500 bg-white"
              >
                {Object.entries(venueGroups).map(([venue, venueRaces]) => (
                  <optgroup key={venue} label={`── ${venue} ──`}>
                    {venueRaces.map((r) => (
                      <option key={r.raceId} value={r.raceId}>
                        {r.isPast ? `[発走済] ${r.label}` : r.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <p className="text-gray-400 text-sm py-2">レースが見つかりませんでした</p>
            )}
          </div>
        )}

        {/* 軍資金入力 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            軍資金（任意）
            <span className="ml-2 text-xs text-gray-400">入力すると具体的な購入金額を提案します</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="例: 3000"
              min={100}
              max={1000000}
              className="w-full border border-gray-300 rounded-lg pl-8 pr-16 py-3 focus:outline-none focus:border-green-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">円</span>
          </div>
        </div>

        {/* 発走済み警告 */}
        {racePast && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            このレースはすでに発走済みのため予想できません。別のレースを選択してください。
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          onClick={handlePredict}
          disabled={loading || racePast || (!selectedRaceId && !racesLoading)}
          className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-colors"
        >
          {loading ? "🤖 出走馬データ取得 & AI分析中..." : "🏇 このレースを予想する"}
        </button>

        {/* 予想結果 */}
        {result && (
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-2xl">
            {raceInfo && (
              <p className="text-xs text-green-700 font-semibold mb-3 bg-green-100 px-3 py-1 rounded-full inline-block">
                {raceInfo}
              </p>
            )}
            <h2 className="text-lg font-bold text-green-800 mb-4">🏆 AI予想結果</h2>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{result}</p>
            <div className="mt-4 flex gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareLabel}をAIが予想！🏇\n#競馬予想AI #競馬\nhttps://keiba-yoso-ai.vercel.app`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors"
              >
                𝕏 でシェア
              </a>
              <a
                href={`https://line.me/R/msg/text/?${encodeURIComponent(`${shareLabel}をAIが予想！🏇 #競馬予想AI https://keiba-yoso-ai.vercel.app`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#06C755] text-white text-sm font-bold rounded-lg hover:bg-[#05b04c] transition-colors"
              >
                LINE でシェア
              </a>
            </div>
          </div>
        )}
      </div>

      <footer className="text-center py-6 text-xs text-gray-400 border-t mt-8 space-x-4">
        <a href="/legal" className="hover:text-gray-600">特定商取引法に基づく表記</a>
        <a href="/privacy" className="hover:text-gray-600">プライバシーポリシー</a>
      </footer>
    </div>
  );
}
