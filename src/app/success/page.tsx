"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function Confetti() {
  const [particles, setParticles] = useState<{ id: number; left: number; delay: number; color: string; size: number; shape: string }[]>([]);

  useEffect(() => {
    const colors = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#3b82f6", "#a855f7", "#FFD700"];
    const shapes = ["circle", "square", "triangle"];
    const ps = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    }));
    setParticles(ps);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.left}%`,
            top: -20,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === "circle" ? "50%" : p.shape === "triangle" ? "0" : "2px",
            clipPath: p.shape === "triangle" ? "polygon(50% 0%, 0% 100%, 100% 100%)" : undefined,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          50% { opacity: 0.9; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3.5s ease-in forwards;
        }
      `}</style>
    </div>
  );
}

/* Inline SVG: Trophy icon */
function TrophySvg() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 mx-auto" aria-hidden="true">
      <defs>
        <linearGradient id="trophy-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="38" fill="url(#trophy-grad)" opacity="0.15" />
      <path d="M28 20h24v6c0 8-5 16-12 18-7-2-12-10-12-18v-6z" fill="url(#trophy-grad)" />
      <path d="M22 20c-4 0-6 4-6 8s2 8 6 8c1 0 2-0.5 3-1v-15h-3z" fill="#FFD700" opacity="0.7" />
      <path d="M58 20c4 0 6 4 6 8s-2 8-6 8c-1 0-2-0.5-3-1v-15h3z" fill="#FFD700" opacity="0.7" />
      <rect x="34" y="44" width="12" height="6" rx="1" fill="#DAA520" />
      <rect x="30" y="50" width="20" height="6" rx="2" fill="#B8860B" />
      <circle cx="40" cy="32" r="4" fill="#FFF8DC" opacity="0.8" />
    </svg>
  );
}

/* Inline SVG: Checkmark circle */
function CheckSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className || "w-4 h-4"} aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#16a34a" />
      <path d="M6 10l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SuccessContent() {
  const [showConfetti, setShowConfetti] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4500);
    // Komoju session verify
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      fetch(`/api/komoju/verify?session_id=${sessionId}`).catch(() => {});
    }
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {showConfetti && <Confetti />}
      <div className="max-w-lg w-full mx-auto px-4">
        {/* Welcome Header */}
        <div className="text-center mb-10">
          <div className="mb-4 animate-pulse">
            <TrophySvg />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-green-700 to-emerald-500 bg-clip-text text-transparent mb-2">
            プレミアム会員へようこそ!
          </h1>
          <p className="text-gray-500">AI競馬予想のフル機能が解放されました</p>
        </div>

        {/* Premium Benefits */}
        <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(34,197,94,0.25)" }} className="rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-green-800 mb-3 text-sm">あなたの特典</h2>
          <ul className="space-y-2 text-sm text-green-900">
            <li className="flex items-start gap-2">
              <CheckSvg className="w-4 h-4 mt-0.5 shrink-0" />
              全レースAI予想が無制限
            </li>
            <li className="flex items-start gap-2">
              <CheckSvg className="w-4 h-4 mt-0.5 shrink-0" />
              複勝モードで堅実な予想も
            </li>
            <li className="flex items-start gap-2">
              <CheckSvg className="w-4 h-4 mt-0.5 shrink-0" />
              6タブ詳細分析(展開予想・穴馬・買い目まで)
            </li>
            <li className="flex items-start gap-2">
              <CheckSvg className="w-4 h-4 mt-0.5 shrink-0" />
              G1カレンダーで年間レース計画
            </li>
          </ul>
        </div>

        {/* 3-Step Guide */}
        <div className="space-y-4 mb-8">
          <h2 className="font-bold text-gray-800 text-center text-sm">まずはこの3ステップ</h2>

          <Link href="/predict" aria-label="今週末のレースをAIで予想する" className="flex items-center gap-4 rounded-xl p-4 hover:shadow-md transition-all group" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-lg shadow-green-200/50 group-hover:scale-105 transition-transform" style={{ fontVariantNumeric: "tabular-nums" }}>1</div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-sm">今週末のレースを予想する</p>
              <p className="text-xs text-gray-400">レース情報を入力してAI予想を生成</p>
            </div>
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-gray-300 group-hover:text-green-600 transition-colors" aria-hidden="true"><path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </Link>

          <Link href="/predict" aria-label="複勝モードで堅実な予想をする" className="flex items-center gap-4 rounded-xl p-4 hover:shadow-md transition-all group" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-lg shadow-green-200/50 group-hover:scale-105 transition-transform" style={{ fontVariantNumeric: "tabular-nums" }}>2</div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-sm">複勝モードを試してみる</p>
              <p className="text-xs text-gray-400">堅実に当てたい方におすすめ</p>
            </div>
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-gray-300 group-hover:text-green-600 transition-colors" aria-hidden="true"><path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </Link>

          <Link href="/calendar" aria-label="G1カレンダーで年間レース日程を確認する" className="flex items-center gap-4 rounded-xl p-4 hover:shadow-md transition-all group" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-lg shadow-green-200/50 group-hover:scale-105 transition-transform" style={{ fontVariantNumeric: "tabular-nums" }}>3</div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-sm">G1カレンダーをチェック</p>
              <p className="text-xs text-gray-400">年間の大レースを確認して準備</p>
            </div>
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-gray-300 group-hover:text-green-600 transition-colors" aria-hidden="true"><path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </Link>
        </div>

        {/* 3競技セット会員向けクロスアクセス */}
        {searchParams.get('plan') === 'bundle' && searchParams.get('session_id') && (
          <div className="rounded-2xl p-5 mb-6 border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50">
            <h2 className="font-black text-yellow-800 text-sm text-center mb-2">3競技セット会員様へ</h2>
            <p className="text-xs text-gray-600 text-center mb-4">残り2サービスへのアクセスを解錠できます（同じブラウザでお開きください）</p>
            <div className="space-y-2">
              <a href={`https://keirin-yoso-ai.vercel.app/success?session_id=${searchParams.get('session_id')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl p-3 bg-blue-600 text-white hover:bg-blue-500 transition-colors">
                <span className="text-sm font-bold">競輪予想AIにアクセス</span>
                <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true"><path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </a>
              <a href={`https://boat-yoso-ai.vercel.app/success?session_id=${searchParams.get('session_id')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl p-3 bg-cyan-600 text-white hover:bg-cyan-500 transition-colors">
                <span className="text-sm font-bold">ボートレース予想AIにアクセス</span>
                <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true"><path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </a>
            </div>
          </div>
        )}

        {/* X Share Button */}
        <div className="mb-6 text-center">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("競馬予想AIで今日のレースを予想しました！ #競馬予想AI #競馬 #競馬予想 https://keiba-yoso-ai.vercel.app")}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="競馬予想AIの予想結果をXにシェアする"
            className="text-xs px-4 py-2 rounded-lg bg-black hover:bg-gray-800 text-white font-medium transition-colors inline-block min-h-[44px] flex items-center justify-center"
          >
            Xでシェア
          </a>
        </div>

        {/* Bookmark Prompt */}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400 mb-1">ご感想をお聞かせください(30秒)</p>
          <a href="mailto:support@pokkorilab.com?subject=%E3%81%94%E6%84%9F%E6%83%B3&body=%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E5%90%8D%EF%BC%9A%0A%E6%84%9F%E6%83%B3%EF%BC%9A" aria-label="競馬予想AIへのご感想をメールで送る" className="text-xs text-blue-500 underline hover:text-blue-700">感想を送る</a>
        </div>
        <div className="text-center rounded-xl p-4" style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <p className="text-xs text-gray-500 mb-1">毎週末の予想にすぐアクセス</p>
          <p className="text-sm font-bold text-gray-700">このサイトをブックマークしておきましょう</p>
        </div>
      </div>
    </>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12" style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 30%, #fefce8 70%, #ecfdf5 100%)" }}>
      <Suspense fallback={<div className="text-gray-400">読み込み中...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
