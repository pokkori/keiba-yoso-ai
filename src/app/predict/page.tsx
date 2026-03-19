"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import KomojuButton from "@/components/KomojuButton";
import { track } from '@vercel/analytics';

const FREE_LIMIT = 2;
const STORAGE_KEY = "keiba_predict_count";
const FAVORITES_KEY = "keiba_favorites";
const MAX_FAVORITES = 10;

const POPULAR_HORSES = [
  "イクイノックス",
  "ドウデュース",
  "リバティアイランド",
  "ソールオリエンス",
  "タスティエーラ",
  "ジャスティンパレス",
];

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


function HitModal({ raceInfo, sections, isFukusho, onClose }: { raceInfo: string; sections: PredictionSection[]; isFukusho?: boolean; onClose: () => void }) {
  const honmeSec = sections.find(s => s.title.includes("本命") || s.title.includes("複勝推奨"));
  const honmeHorse = honmeSec?.content.match(/^([^\n（(【\s]{1,12})/)?.[1] ?? "";
  const shareText = [
    `🎊【的中報告】${raceInfo}`,
    honmeHorse ? `${isFukusho ? "🎯複勝推奨" : "◎本命"}: ${honmeHorse} が的中！` : "的中しました！",
    "競馬予想AIを使ってみた → https://keiba-yoso-ai.vercel.app",
    isFukusho ? "#競馬複勝的中 #競馬AI" : "#競馬的中 #競馬予想AI #G1",
  ].filter(Boolean).join("\n");

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="text-6xl mb-4 animate-bounce">🎊</div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">的中おめでとう！</h2>
        <p className="text-gray-600 text-sm mb-6">
          {raceInfo && <span className="block font-bold text-green-700 mb-1">{raceInfo}</span>}
          {honmeHorse && <span className="text-lg font-bold text-gray-900">{honmeHorse}</span>}
          {honmeHorse && <span className="text-gray-600 block text-sm mt-1">が{isFukusho ? "複勝" : ""}的中！Xでシェアしよう</span>}
        </p>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-xl mb-3 transition-colors"
        >
          𝕏 的中をシェアする
        </a>
        <button onClick={onClose} className="text-gray-400 text-sm hover:text-gray-600">閉じる</button>
      </div>
    </div>
  );
}

// 信頼度バッジ（セクション内容の充実度から計算）
function ConfidenceBadge({ sections }: { sections: PredictionSection[] }) {
  const score = Math.min(95, Math.max(55,
    60 +
    (sections.length >= 5 ? 15 : sections.length * 3) +
    (sections.some(s => s.content.length > 200) ? 10 : 0) +
    (sections.some(s => s.title.includes("買い目")) ? 10 : 0)
  ));
  const color = score >= 80 ? "bg-green-100 text-green-800 border-green-300" :
                score >= 65 ? "bg-yellow-100 text-yellow-800 border-yellow-300" :
                "bg-gray-100 text-gray-700 border-gray-300";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${color}`}>
      🎯 信頼度 {score}%
    </span>
  );
}

function PredictionCard({ sections, raceInfo, rawText, isFukusho }: { sections: PredictionSection[]; raceInfo: string; rawText: string; isFukusho?: boolean }) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showHitModal, setShowHitModal] = useState(false);

  const handleCopy = (text: string, all?: boolean) => {
    navigator.clipboard.writeText(text);
    if (all) { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2000); }
    else { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  // X シェア用: 本命馬名を抽出
  const honmeSection = sections.find(s => s.title.includes("本命") || s.title.includes("複勝推奨"));
  const honmeHorse = honmeSection?.content.match(/^([^\n（(【\s]{1,12})/)?.[1] ?? "";
  const confidenceScore = Math.min(95, Math.max(55,
    60 +
    (sections.length >= 5 ? 15 : sections.length * 3) +
    (sections.some(s => s.content.length > 200) ? 10 : 0) +
    (sections.some(s => s.title.includes("買い目")) ? 10 : 0)
  ));
  const ogUrl = `https://keiba-yoso-ai.vercel.app/api/og?race=${encodeURIComponent(raceInfo)}&horse=${encodeURIComponent(honmeHorse)}&confidence=${confidenceScore}&mode=${isFukusho ? "fukusho" : "standard"}`;
  const shareText = [
    `【AI予想】${raceInfo}`,
    honmeHorse ? (isFukusho ? `🎯複勝推奨: ${honmeHorse}` : `◎本命: ${honmeHorse}`) : "",
    isFukusho ? "#競馬複勝予想 #競馬AI" : "#競馬予想AI #競馬 #G1",
    "https://keiba-yoso-ai.vercel.app/predict",
  ].filter(Boolean).join("\n");
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(ogUrl)}`;

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
      {showHitModal && (
        <HitModal raceInfo={raceInfo} sections={sections} isFukusho={isFukusho} onClose={() => setShowHitModal(false)} />
      )}
      {/* Header */}
      <div className={`${headerBg} px-4 py-3 flex items-center justify-between gap-2`}>
        <span className="text-white font-bold text-sm">{headerIcon} {raceInfo} {headerLabel}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={xShareUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap">
            🐦 Xでシェア
          </a>
          <button onClick={() => handleCopy(rawText, true)}
            className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap">
            {copiedAll ? "✓ コピー済み" : "全文コピー"}
          </button>
        </div>
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold ${titleColor}`}>{current.icon} {current.title}</span>
            {activeTab === 0 && <ConfidenceBadge sections={sections} />}
          </div>
          <button onClick={() => handleCopy(current.content)}
            className={`text-xs ${copyBg} px-3 py-1 rounded-lg font-medium transition-colors`}>
            {copied ? "✓ コピー" : "コピー"}
          </button>
        </div>
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">{current.content}</p>
        {/* 的中報告ボタン — 常時表示 */}
        {activeTab === 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowHitModal(true)}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              🎊 当たった！的中報告
            </button>
          </div>
        )}
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
  const [isSkipMsg, setIsSkipMsg] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPayjp, setShowPayjp] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState("basic");

  // お気に入り馬
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favInput, setFavInput] = useState("");
  const [showFavPanel, setShowFavPanel] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status").then((r) => r.json()).then((d) => setIsPremium(d.isPremium));
    setUsageCount(Number(localStorage.getItem(STORAGE_KEY) || "0"));
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      if (Array.isArray(saved)) setFavorites(saved);
    } catch { /* ignore */ }
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
          const eligible = data.races.filter((r: Race) => !/新馬|未勝利|1勝クラス|2勝クラス/.test(r.label));
          const pool = eligible.length > 0 ? eligible : data.races;
          const upcoming = pool.find((r: Race) => !r.isPast);
          setSelectedRaceId((upcoming ?? pool[0]).raceId);
        }
      })
      .catch(() => {})
      .finally(() => setRacesLoading(false));
  }, [date]);

  const selectedRace = races.find((r) => r.raceId === selectedRaceId);
  const racePast = selectedRace?.isPast ?? false;

  const handlePredict = async () => {
    if (racePast) return;
    if (!isPremium && usageCount >= FREE_LIMIT) { track('paywall_shown', { service: '競馬予想AI' }); setShowPaywall(true); return; }
    if (!selectedRaceId) { setError("レースを選択してください"); return; }

    track('ai_generated', { service: '競馬予想AI' });
    setLoading(true);
    setError("");
    setIsSkipMsg(false);
    setRawResult("");
    setSections([]);
    setRaceInfo("");

    try {
      const budgetNum = budget ? parseInt(budget.replace(/,/g, ""), 10) : undefined;
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId: selectedRaceId, budget: budgetNum, mode, raceLabel: selectedRace?.label }),
      });
      if (res.status === 429) { track('paywall_shown', { service: '競馬予想AI' }); setShowPaywall(true); return; }
      if (!res.body) throw new Error("レスポンスが空です");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let doneMetadata: { count?: number; mode?: string; raceInfo?: string } = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const doneIdx = chunk.indexOf("\nDONE:");
        if (doneIdx !== -1) {
          accumulated += chunk.slice(0, doneIdx);
          try { doneMetadata = JSON.parse(chunk.slice(doneIdx + 6)); } catch { /* ignore */ }
          break;
        }
        accumulated += chunk;
        setRawResult(accumulated);
      }

      // エラーチェック（JSONエラーレスポンスが返った場合）
      if (accumulated.startsWith("{") && accumulated.includes('"error"')) {
        try {
          const errData = JSON.parse(accumulated);
          if (errData.error === "FETCH_FAILED") {
            setError("出走表の自動取得ができませんでした。時間をおいてから別のレースを選択してください。");
            return;
          }
          throw new Error(errData.error);
        } catch (parseErr) {
          if (parseErr instanceof SyntaxError) { /* not JSON, continue */ }
          else throw parseErr;
        }
      }

      // スキップ推奨チェック（一般クラス戦など）
      const isSkip = /【推奨判定】スキップ/.test(accumulated);
      if (isSkip) {
        setIsSkipMsg(true);
        setError("このレースはスキップ推奨です。一般クラス戦は的中率9%で収支マイナスのため対象外。重賞・特別レースを選んでください。");
        setLoading(false);
        return;
      }
      setIsSkipMsg(false);
      const finalMode = doneMetadata.mode ?? mode;
      setRawResult(accumulated);
      setSections(finalMode === "fukusho" ? parseFukusho(accumulated) : parsePredict(accumulated));
      setRaceInfo(doneMetadata.raceInfo || "");
      const next = doneMetadata.count ?? usageCount + 1;
      setUsageCount(next);
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // スキップ推奨レースを事前判定（一般クラス戦は的中率が低いため対象外）
  function isSkipRace(label: string): boolean {
    return /新馬|未勝利|1勝クラス|2勝クラス/.test(label);
  }

  const eligibleRaces = races.filter((r) => !isSkipRace(r.label));
  const skippedCount = races.length - eligibleRaces.length;

  const addFavorite = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || favorites.includes(trimmed) || favorites.length >= MAX_FAVORITES) return;
    const next = [...favorites, trimmed];
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  };

  const removeFavorite = (name: string) => {
    const next = favorites.filter((f) => f !== name);
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  };

  const venueGroups = eligibleRaces.reduce<Record<string, Race[]>>((acc, race) => {
    if (!acc[race.venue]) acc[race.venue] = [];
    acc[race.venue].push(race);
    return acc;
  }, {});


  return (
    <div className="min-h-screen bg-gray-50">
      {showPaywall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center relative">
            <button onClick={() => setShowPaywall(false)} className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
            <div className="text-4xl mb-3">🏇</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">このまま終わらせますか？</h2>
            <p className="text-gray-500 text-sm mb-1">
              まだレースは続いています。全レース無制限でAIが予想します。
            </p>
            <ul className="text-xs text-gray-500 text-left mb-5 space-y-1.5 mt-3">
              <li>✓ 土日毎週20〜30レースが全部使い放題</li>
              <li>✓ G1前夜に「これが本命だ」と確信できる</li>
              <li>✓ 軍資金別の具体的な購入金額まで提案</li>
              <li>✓ 回収率トラッキングで自分の成績を可視化</li>
            </ul>
            <button onClick={() => { track('upgrade_click', { service: '競馬予想AI', plan: 'basic' }); setCheckoutPlan("basic"); setShowPayjp(true); setShowPaywall(false); }}
              className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white py-3 rounded-xl font-bold hover:from-green-800 hover:to-green-700 transition-all mb-2">
              ベーシックで続ける（¥980/月）
            </button>
            <button onClick={() => { track('upgrade_click', { service: '競馬予想AI', plan: 'pro' }); setCheckoutPlan("pro"); setShowPayjp(true); setShowPaywall(false); }}
              className="w-full border border-green-300 text-green-700 py-2 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors mb-1">
              G1・重賞の詳細分析も欲しい → プロプラン（¥2,980/月）
            </button>
            {/* 安心保証バッジ */}
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span>🔒</span>
                <span>SSL暗号化決済</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span>✅</span>
                <span>いつでもキャンセル可能</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span>💳</span>
                <span>PAY.JP安全決済</span>
              </div>
            </div>
            <p className="text-xs text-center text-slate-500 mt-2">
              ※ プレミアムプランはいつでもキャンセル可能です
            </p>
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
              {eligibleRaces.length > 0 ? (
                <>
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
                  {skippedCount > 0 && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      ※ 新馬・未勝利・1〜2勝クラス（{skippedCount}レース）は回収率が低いため対象外
                    </p>
                  )}
                </>
              ) : races.length > 0 ? (
                <p className="text-gray-400 text-sm py-2 bg-gray-50 rounded-xl px-3">本日は重賞・特別レースがありません（新馬・未勝利戦は対象外）</p>
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
                <span className="block text-xs font-normal mt-0.5">堅実戦略・的中重視</span>
              </button>
            </div>
            {mode === "fukusho" && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                💡 複勝は3着以内で的中。AIが安定レースを厳選してオッズ1.2〜1.6倍の堅実な複勝を推奨します。
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

          {/* お気に入り馬 */}
          <div className="mb-5">
            <button
              onClick={() => setShowFavPanel(!showFavPanel)}
              className="flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-900 transition-colors"
            >
              <span>⭐</span>
              <span>お気に入り馬</span>
              <span className="text-xs text-gray-400 ml-1">({favorites.length}/{MAX_FAVORITES})</span>
              <span className="text-xs text-gray-400">{showFavPanel ? "▲" : "▼"}</span>
            </button>
            {showFavPanel && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-4">
                {/* 人気馬プリセット */}
                <p className="text-xs font-bold text-green-700 mb-2">🏆 人気馬を追加</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {POPULAR_HORSES.map((horse) => (
                    <button
                      key={horse}
                      onClick={() => addFavorite(horse)}
                      disabled={favorites.includes(horse)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${favorites.includes(horse) ? "bg-green-100 text-green-400 border-green-200 cursor-default" : "bg-white text-green-700 border-green-300 hover:bg-green-100"}`}
                    >
                      {favorites.includes(horse) ? "✓ " : "+ "}{horse}
                    </button>
                  ))}
                </div>
                {/* 手動追加 */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={favInput}
                    onChange={(e) => setFavInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { addFavorite(favInput); setFavInput(""); } }}
                    placeholder="馬名を入力して追加..."
                    maxLength={20}
                    className="flex-1 border border-green-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500 bg-white"
                  />
                  <button
                    onClick={() => { addFavorite(favInput); setFavInput(""); }}
                    disabled={!favInput.trim() || favorites.length >= MAX_FAVORITES}
                    className="px-3 py-1.5 bg-green-700 text-white text-xs font-bold rounded-lg hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    追加
                  </button>
                </div>
                {/* 登録済みお気に入り一覧 */}
                {favorites.length > 0 ? (
                  <>
                    <p className="text-xs font-bold text-green-700 mb-1.5">⭐ 登録済み馬</p>
                    <div className="flex flex-wrap gap-1.5">
                      {favorites.map((horse) => (
                        <span key={horse} className="flex items-center gap-1 bg-green-700 text-white text-xs px-2.5 py-1 rounded-lg font-medium">
                          {horse}
                          <button onClick={() => removeFavorite(horse)} className="text-green-300 hover:text-white leading-none ml-0.5" aria-label="削除">×</button>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">※ お気に入り馬はメモとして保存されます。予想時に本命と照合しよう！</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">まだ登録がありません。気になる馬を追加しよう！</p>
                )}
              </div>
            )}
          </div>

          {racePast && (
            <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
              このレースはすでに発走済みです。別のレースを選択してください。
            </div>
          )}

          {error && (
            <div className={`text-sm mb-4 px-3 py-2 rounded-lg ${isSkipMsg ? "text-amber-700 bg-amber-50 border border-amber-200" : "text-red-500 bg-red-50"}`}>
              {isSkipMsg && <span className="font-bold mr-1">⏭ スキップ推奨:</span>}
              {error}
            </div>
          )}

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

        {/* ローディングステップ表示 */}
        {loading && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center mt-4">
            <div className="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-green-800 font-medium text-sm mb-1">AIが予想を生成中...</p>
            <p className="text-xs text-green-600">🏇 出走馬データ取得 → 📊 コース・馬場分析 → 🎯 本命馬選定 → 💡 買い目提案</p>
            <p className="text-xs text-gray-400 mt-1">通常20〜40秒かかります</p>
          </div>
        )}

        {/* 予想結果 */}
        {sections.length > 0 && (
          <>
            <PredictionCard sections={sections} raceInfo={raceInfo} rawText={rawResult} isFukusho={mode === "fukusho"} />

            {(() => {
              const shareLabel = raceInfo || "レース";
              const honmeSec = sections.find(s => s.title.includes("本命") || s.title.includes("複勝推奨"));
              const honmeHorse = honmeSec?.content.match(/^(\d+番[\s　]?\S{1,10})/)?.[1]?.trim() ?? honmeSec?.content.match(/^([^\n（(【\s]{1,12})/)?.[1] ?? "";
              const confScore = Math.min(95, Math.max(55,
                60 +
                (sections.length >= 5 ? 15 : sections.length * 3) +
                (sections.some(s => s.content.length > 200) ? 10 : 0) +
                (sections.some(s => s.title.includes("買い目")) ? 10 : 0)
              ));
              const ogImageUrl = `https://keiba-yoso-ai.vercel.app/api/og?race=${encodeURIComponent(shareLabel)}&horse=${encodeURIComponent(honmeHorse)}&confidence=${confScore}&mode=${mode === "fukusho" ? "fukusho" : "standard"}`;
              const shareText = [
                `【AI予想】${shareLabel}`,
                honmeHorse ? (mode === "fukusho" ? `🎯複勝推奨: ${honmeHorse}` : `◎本命: ${honmeHorse}`) : "",
                mode === "fukusho" ? "#競馬複勝予想 #競馬AI" : "#競馬予想AI #競馬 #G1",
                "https://keiba-yoso-ai.vercel.app/predict",
              ].filter(Boolean).join("\n");
              return (
                <>
                  <div className="mt-4 flex gap-3">
                    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(ogImageUrl)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors">
                      𝕏 でシェア
                    </a>
                    <a href={`https://line.me/R/msg/text/?${encodeURIComponent(`${shareLabel}をAIが予想！🏇 #競馬予想AI https://keiba-yoso-ai.vercel.app`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#06C755] text-white text-sm font-bold rounded-xl hover:bg-[#05b04c] transition-colors">
                      LINE でシェア
                    </a>
                    <Link href={`/tracker?race=${encodeURIComponent(shareLabel)}&date=${date}`}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 text-sm font-bold rounded-xl hover:bg-green-100 transition-colors border border-green-200">
                      📊 回収率に記録
                    </Link>
                  </div>
                  {/* 次のアクション3選 */}
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-green-800 mb-3">📋 次にやるべきこと3選</p>
                    <ol className="space-y-2">
                      {[
                        { icon: "🏇", text: "netkeiba・JRA公式で本命◎の馬番を確認して馬券購入する" },
                        { icon: "💰", text: "下の軍資金入力で具体的な購入金額・買い目を確認する" },
                        { icon: "📊", text: "レース後に回収率トラッカーで結果を記録する" },
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                          <span className="text-lg leading-none">{item.icon}</span>
                          <span>{i + 1}. {item.text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  {/* 購入サイトリンク（A8.net申請後URLを差し替え） */}
                  <div className="mt-4 bg-green-900 rounded-xl p-4">
                    <p className="text-xs font-bold text-green-200 mb-3">🏇 馬券購入はこちらから（公式サイト）</p>
                    <div className="grid grid-cols-3 gap-2">
                      {/* TODO: Replace href with A8.net affiliate URL after approval (netkeiba案件) */}
                      <a href="https://regist.netkeiba.com/" target="_blank" rel="noopener noreferrer sponsored"
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors">
                        🐴 netkeiba
                      </a>
                      {/* TODO: Replace href with A8.net affiliate URL after approval (JRA-VAN案件) */}
                      <a href="https://jra.jp/" target="_blank" rel="noopener noreferrer sponsored"
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors">
                        🎯 JRA公式
                      </a>
                      {/* TODO: Replace href with 楽天アフィリエイト URL (insId=s00000011623001) after setup */}
                      <a href="https://keiba.rakuten.co.jp/" target="_blank" rel="noopener noreferrer sponsored"
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors">
                        🛒 楽天競馬
                      </a>
                    </div>
                  </div>
                  {!isPremium && (
                    <div className="mt-5 bg-gradient-to-r from-green-800 to-green-700 rounded-2xl p-5 text-white text-center">
                      <p className="font-bold mb-1">次のレースも予想しますか？</p>
                      <p className="text-green-200 text-xs mb-4">土日毎週20〜30レースが全部使い放題。</p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <button onClick={() => { track('upgrade_click', { service: '競馬予想AI', plan: 'basic' }); setCheckoutPlan("basic"); setShowPayjp(true); }}
                          className="bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-2.5 px-6 rounded-full text-sm transition-colors">
                          次のレースへ → ¥980/月
                        </button>
                        <button onClick={() => { track('upgrade_click', { service: '競馬予想AI', plan: 'pro' }); setCheckoutPlan("pro"); setShowPayjp(true); }}
                          className="bg-white/15 hover:bg-white/25 text-white border border-white/30 font-bold py-2.5 px-6 rounded-full text-sm transition-colors">
                          G1詳細分析 → プロ ¥2,980/月
                        </button>
                      </div>
                      {/* 安心保証バッジ */}
                      <div className="flex items-center justify-center gap-4 mt-3">
                        <div className="flex items-center gap-1 text-xs text-green-300/70">
                          <span>🔒</span>
                          <span>SSL暗号化決済</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-green-300/70">
                          <span>✅</span>
                          <span>いつでもキャンセル可能</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-green-300/70">
                          <span>💳</span>
                          <span>PAY.JP安全決済</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-yellow-300 font-bold">
                          <span>🛡️</span>
                          <span>30日返金保証</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>

      <footer className="text-center py-6 text-xs text-gray-400 border-t mt-8 space-x-4">
        <a href="/legal" className="hover:text-gray-600">特定商取引法に基づく表記</a>
        <a href="/privacy" className="hover:text-gray-600">プライバシーポリシー</a>
      </footer>

      {showPayjp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl relative">
            <button onClick={() => setShowPayjp(false)} className="absolute top-3 right-3 text-gray-400 text-xl">✕</button>
            <div className="text-3xl mb-3 text-center">🏇</div>
            <h2 className="text-lg font-bold mb-2 text-center">競馬予想AIプレミアム</h2>
            <KomojuButton
              planId={checkoutPlan}
              planLabel={checkoutPlan === "pro" ? "プロプラン ¥2,980/月（税込）— G1・重賞の詳細分析付き" : "ベーシックプラン ¥980/月（税込）— 全レース無制限予想"}
              className="w-full bg-green-700 text-white font-bold py-3 rounded-xl hover:bg-green-800 disabled:opacity-50"
            />
            <button onClick={() => setShowPayjp(false)} className="text-xs text-gray-400 mt-2 block w-full text-center">閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
