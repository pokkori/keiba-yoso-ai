"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const FREE_LIMIT = 1;
const STORAGE_KEY = "keiba_predict_count";

async function startCheckout(plan: string) {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

const venues = ["札幌", "函館", "福島", "新潟", "東京", "中山", "中京", "京都", "阪神", "小倉"];
const raceClasses = ["新馬", "未勝利", "1勝クラス", "2勝クラス", "3勝クラス", "オープン", "重賞"];

export default function PredictPage() {
  const [venue, setVenue] = useState("東京");
  const [raceNo, setRaceNo] = useState("11");
  const [raceClass, setRaceClass] = useState("重賞");
  const [surface, setSurface] = useState("芝");
  const [distance, setDistance] = useState("2000");
  const [horses, setHorses] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status").then((r) => r.json()).then((d) => setIsPremium(d.isPremium));
    setUsageCount(Number(localStorage.getItem(STORAGE_KEY) || "0"));
  }, []);

  const handleSubmit = async () => {
    if (!horses.trim()) {
      setError("出走馬情報を入力してください");
      return;
    }
    if (!isPremium && usageCount >= FREE_LIMIT) {
      setShowPaywall(true);
      return;
    }
    setLoading(true);
    setError("");
    setResult("");

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue, raceNo, raceClass, surface, distance, horses }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.prediction);
      const next = usageCount + 1;
      setUsageCount(next);
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

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
              プロプランで続ける（¥5,980/月）
            </button>
            <button
              onClick={() => startCheckout("basic")}
              className="w-full border border-green-300 text-green-700 py-2 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors mb-3"
            >
              ベーシックプラン（¥2,980/月）
            </button>
            <button onClick={() => setShowPaywall(false)} className="text-xs text-gray-400 hover:text-gray-600">
              閉じる
            </button>
          </div>
        </div>
      )}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-green-200 bg-green-900">
        <Link href="/" className="text-xl font-bold text-white">🏇 競馬予想AI</Link>
      </nav>

      <div className="max-w-2xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">レース予想</h1>

        {/* レース情報 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">開催場</label>
            <select
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-green-500"
            >
              {venues.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">レース番号</label>
            <select
              value={raceNo}
              onChange={(e) => setRaceNo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-green-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">クラス</label>
            <select
              value={raceClass}
              onChange={(e) => setRaceClass(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-green-500"
            >
              {raceClasses.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">コース</label>
            <div className="flex gap-2">
              <select
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-green-500"
              >
                <option>芝</option>
                <option>ダート</option>
              </select>
              <input
                type="text"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="距離(m)"
                className="flex-1 border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* 出走馬情報 */}
        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">
            出走馬情報（馬名・騎手・オッズ等を自由に入力）
          </label>
          <textarea
            value={horses}
            onChange={(e) => setHorses(e.target.value)}
            placeholder={"例：\n1番 ディープインパクト 武豊 2.3倍 前走1着\n2番 オルフェーヴル 福永 4.5倍 前走2着\n..."}
            className="w-full h-40 border border-gray-300 rounded-xl p-4 font-mono text-sm focus:outline-none focus:border-green-500"
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl text-lg transition-colors"
        >
          {loading ? "🤖 AI分析中..." : "🏇 予想する"}
        </button>

        {/* 予想結果 */}
        {result && (
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-2xl">
            <h2 className="text-lg font-bold text-green-800 mb-4">🏆 AI予想結果</h2>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}
