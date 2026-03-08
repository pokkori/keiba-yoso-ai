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

type PredictionSection = { title: string; icon: string; content: string };

function parsePredict(text: string): PredictionSection[] {
  const defs = [
    { key: "本命", icon: "◎", label: "本命（◎）" },
    { key: "対抗", icon: "○", label: "対抗（○）" },
    { key: "単穴", icon: "▲", label: "単穴（▲）" },
    { key: "買い目", icon: "🎯", label: "推奨買い目" },
    { key: "展開", icon: "📊", label: "レース展開予想" },
    { key: "総評", icon: "💡", label: "総評" },
  ];

  const sections: PredictionSection[] = [];
  const parts = text.split(/(?=【[^】]+】)/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const matched = defs.find(d => trimmed.startsWith(`【${d.key}`) || trimmed.includes(`【${d.key}`));
    if (matched) {
      const content = trimmed.replace(/^【[^】]+】/, "").trim();
      sections.push({ title: matched.label, icon: matched.icon, content });
    }
  }
  if (sections.length < 2) {
    return [{ title: "AI予想結果", icon: "🏇", content: text }];
  }
  return sections;
}

function parseFukusho(text: string): PredictionSection[] {
  const defs = [
    { key: "複勝推奨", icon: "🎯", label: "複勝推奨馬" },
    { key: "レース安定度", icon: "⭐", label: "レース安定度" },
    { key: "複勝オッズ想定", icon: "💴", label: "複勝オッズ想定" },
    { key: "リスク要因", icon: "⚠️", label: "リスク要因" },
    { key: "買い方提案", icon: "💡", label: "買い方提案" },
  ];

  const sections: PredictionSection[] = [];
  const parts = text.split(/(?=【[^】]+】)/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const matched = defs.find(d => trimmed.startsWith(`【${d.key}`));
    if (matched) {
      const content = trimmed.replace(/^【[^】]+】/, "").trim();
      sections.push({ title: matched.label, icon: matched.icon, content });
    }
  }
  if (sections.length < 2) {
    return [{ title: "複勝予想結果", icon: "🎯", content: text }];
  }
  return sections;
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

function PredictionCard({ sections, raceInfo, rawText, isFukusho }: { sections: PredictionSection[]; raceInfo: string; rawText: string; isFukusho?: boolean }) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopy = (text: string, all?: boolean) => {
    navigator.clipboard.writeText(text);
    if (all) { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2000); }
    else { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const current = sections[activeTab];

  const accent = isFukusho ? "amber" : "green";
  const headerBg = isFukusho ? "bg-amber-600" : "bg-green-800";
  const tabBg = isFukusho ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200";
  const tabActive = isFukusho ? "border-amber-600 text-amber-800 bg-white" : "border-green-700 text-green-800 bg-white";
  const titleColor = isFukusho ? "text-amber-800" : "text-green-800";
  const copyBg = isFukusho ? "bg-amber-50 hover:bg-amber-100 text-amber-700" : "bg-green-50 hover:bg-green-100 text-green-700";
  const headerIcon = isFukusho ? "🎯" : "🏆";
  const headerLabel = isFukusho ? "複勝予想結果" : "AI予想結果";
  void accent;

  return (
    <div className={`mt-8 rounded-2xl border ${isFukusho ? "border-amber-200" : "border-green-200"} overflow-hidden`}>
      {/* Header */}
      <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}>
        <span className="text-white font-bold text-sm">{headerIcon} {raceInfo} {headerLabel}</span>
        <button onClick={() => handleCopy(rawText, true)}
          className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
          {copiedAll ? "✓ コピー済み" : "全文コピー"}
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex overflow-x-auto border-b ${tabBg}`}>
        {sections.map((s, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`flex items-center gap-1 px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === i ? tabActive : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <span>{s.icon}</span>
            <span className="hidden sm:inline">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-sm font-bold ${titleColor}`}>{current.icon} {current.title}</span>
          <button onClick={() => handleCopy(current.content)}
            className={`text-xs ${copyBg} px-3 py-1 rounded-lg font-medium transition-colors`}>
            {copied ? "✓ コピー" : "コピー"}
          </button>
        </div>
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">{current.content}</p>
      </div>
    </div>
  );
}

export default function PredictPage() {
  const [date, setDate] = useState(() => {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
  });
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState("");
  const [racesLoading, setRacesLoading] = useState(false);
  const [budget, setBudget] = useState("");
  const [mode, setMode] = useState<"standard" | "fukusho">("standard");

  const [rawResult, setRawResult] = useState("");
  const [sections, setSections] = useState<PredictionSection[]>([]);
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
    setRawResult("");
    setSections([]);
    setRacesLoading(true);

    const dateStr = date.replace(/-/g, "");
    fetch(`/api/races?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.races && data.races.length > 0) {
          setRaces(data.races);
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
    if (!isPremium && usageCount >= FREE_LIMIT) { setShowPaywall(true); return; }
    if (!selectedRaceId) { setError("レースを選択してください"); return; }

    setLoading(true);
    setError("");
    setRawResult("");
    setSections([]);
    setRaceInfo("");

    try {
      const budgetNum = budget ? parseInt(budget.replace(/,/g, ""), 10) : undefined;
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId: selectedRaceId, budget: budgetNum, mode }),
      });
      if (res.status === 429) { setShowPaywall(true); return; }
      const data = await res.json();

      if (res.status === 502 && data.error === "FETCH_FAILED") {
        setError("出走表の自動取得ができませんでした。時間をおいてから別のレースを選択してください。");
        return;
      }
      if (data.error) throw new Error(data.error);

      setRawResult(data.prediction);
      setSections(data.mode === "fukusho" ? parseFukusho(data.prediction) : parsePredict(data.prediction));
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
  const shareText = rawResult ? `${shareLabel}をAIが予想！🏇\n#競馬予想AI #競馬\nhttps://keiba-yoso-ai.vercel.app` : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {showPaywall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">🏇</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">無料枠を使い切りました</h2>
            <p className="text-gray-500 text-sm mb-1">
              毎週土日・全レース無制限に使えます
            </p>
            <ul className="text-xs text-gray-400 text-left mb-6 space-y-1.5 mt-3">
              <li>✓ 全レース予想（1日20〜30レース）</li>
              <li>✓ 本命・対抗・単穴・買い目を明示</li>
              <li>✓ 軍資金別の具体的な配分提案</li>
              <li>✓ 回収率トラッキングで成績可視化</li>
              <li>✓ 重賞G1の特別詳細分析（プロプラン）</li>
            </ul>
            <button onClick={() => startCheckout("pro")}
              className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white py-3 rounded-xl font-bold hover:from-green-800 hover:to-green-700 transition-all mb-3">
              プロプランで続ける（¥2,980/月）
            </button>
            <button onClick={() => startCheckout("basic")}
              className="w-full border border-green-300 text-green-700 py-2 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors mb-3">
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
        <div className="flex items-center gap-4">
          <Link href="/tracker" className="text-sm text-green-300 hover:text-white">回収率管理</Link>
          <Link href="/backtest" className="text-sm text-green-300 hover:text-white">的中検証</Link>
          {isPremium ? (
            <span className="text-xs bg-yellow-400 text-green-900 font-bold px-3 py-1 rounded-full">PRO</span>
          ) : (
            <span className="text-green-300 text-xs">無料残り {Math.max(0, FREE_LIMIT - usageCount)} 回</span>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto py-10 px-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-6">🏇 レース予想</h1>

          {/* 日付選択 */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">開催日</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:border-green-500 bg-gray-50" />
          </div>

          {racesLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
              <span className="animate-spin inline-block">⟳</span> レース一覧を取得中...
            </div>
          ) : (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">レース選択</label>
              {races.length > 0 ? (
                <select value={selectedRaceId}
                  onChange={(e) => { setSelectedRaceId(e.target.value); setRawResult(""); setSections([]); setError(""); }}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:border-green-500 bg-gray-50">
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
                <p className="text-gray-400 text-sm py-2 bg-gray-50 rounded-xl px-3">レースが見つかりませんでした（土日のみ開催）</p>
              )}
            </div>
          )}

          {/* 予想モード */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">予想モード</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("standard")}
                className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${mode === "standard" ? "bg-green-700 text-white border-green-700" : "bg-white text-gray-500 border-gray-200 hover:border-green-300"}`}>
                🏇 スタンダード
                <span className="block text-xs font-normal mt-0.5">{mode === "standard" ? "◎○▲ + 買い目" : "◎○▲ + 買い目"}</span>
              </button>
              <button
                onClick={() => setMode("fukusho")}
                className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${mode === "fukusho" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-500 border-gray-200 hover:border-amber-300"}`}>
                🎯 複勝モード
                <span className="block text-xs font-normal mt-0.5">{mode === "fukusho" ? "粗品式・堅実戦略" : "粗品式・堅実戦略"}</span>
              </button>
            </div>
            {mode === "fukusho" && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                💡 複勝は3着以内で的中。的中率80〜90%の堅実戦略。オッズ1.1〜1.6倍を狙います。
              </p>
            )}
          </div>

          {/* 軍資金 */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              軍資金（任意）
              <span className="ml-2 text-xs text-gray-400 font-normal">入力すると具体的な購入金額を提案</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
              <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
                placeholder="例: 3000" min={100} max={1000000}
                className="w-full border border-gray-300 rounded-xl pl-8 pr-16 py-3 focus:outline-none focus:border-green-500 bg-gray-50" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">円</span>
            </div>
          </div>

          {racePast && (
            <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
              このレースはすでに発走済みです。別のレースを選択してください。
            </div>
          )}

          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button onClick={handlePredict}
            disabled={loading || racePast || (!selectedRaceId && !racesLoading)}
            className={`w-full disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-base transition-colors ${mode === "fukusho" ? "bg-amber-500 hover:bg-amber-600" : "bg-green-700 hover:bg-green-800"}`}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span>
                出走馬データ取得 & AI分析中...（20〜40秒）
              </span>
            ) : mode === "fukusho" ? "🎯 複勝推奨馬を分析する" : "🏇 このレースを予想する"}
          </button>

          {!isPremium && (
            <p className="text-center text-xs text-gray-400 mt-3">
              無料 {FREE_LIMIT} 回 → <button onClick={() => setShowPaywall(true)} className="text-green-600 font-medium hover:underline">プレミアムで全レース無制限</button>
            </p>
          )}
        </div>

        {/* 予想結果 */}
        {sections.length > 0 && (
          <>
            <PredictionCard sections={sections} raceInfo={raceInfo} rawText={rawResult} isFukusho={mode === "fukusho"} />

            <div className="mt-4 flex gap-3">
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors">
                𝕏 でシェア
              </a>
              <a href={`https://line.me/R/msg/text/?${encodeURIComponent(`${shareLabel}をAIが予想！🏇 #競馬予想AI https://keiba-yoso-ai.vercel.app`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#06C755] text-white text-sm font-bold rounded-xl hover:bg-[#05b04c] transition-colors">
                LINE でシェア
              </a>
              <Link href="/tracker"
                className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 text-sm font-bold rounded-xl hover:bg-green-100 transition-colors border border-green-200">
                📊 結果を記録
              </Link>
            </div>

            {!isPremium && (
              <div className="mt-5 bg-gradient-to-r from-green-800 to-green-700 rounded-2xl p-5 text-white text-center">
                <p className="font-bold mb-1">毎週全レース予想したい方へ</p>
                <p className="text-green-200 text-xs mb-4">土日毎週20〜30レースが全部使い放題。¥980/月から。</p>
                <button onClick={() => startCheckout("basic")}
                  className="bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-2.5 px-8 rounded-full text-sm transition-colors">
                  ベーシック ¥980/月 で始める
                </button>
              </div>
            )}
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
