"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function Confetti() {
  const [particles, setParticles] = useState<{ id: number; left: number; delay: number; color: string; size: number }[]>([]);

  useEffect(() => {
    const colors = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#3b82f6", "#a855f7"];
    const ps = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 6,
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
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-in forwards;
        }
      `}</style>
    </div>
  );
}

function SuccessContent() {
  const [showConfetti, setShowConfetti] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
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
          <div className="text-7xl mb-4">🏆</div>
          <h1 className="text-3xl font-black text-green-800 mb-2">プレミアム会員へようこそ！</h1>
          <p className="text-gray-500">AI競馬予想のフル機能が解放されました</p>
        </div>

        {/* Premium Benefits */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-green-800 mb-3 text-sm">あなたの特典</h2>
          <ul className="space-y-2 text-sm text-green-900">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">&#10003;</span>
              全レースAI予想が無制限
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">&#10003;</span>
              複勝モードで堅実な予想も
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">&#10003;</span>
              6タブ詳細分析（展開予想・穴馬・買い目まで）
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">&#10003;</span>
              G1カレンダーで年間レース計画
            </li>
          </ul>
        </div>

        {/* 3-Step Guide */}
        <div className="space-y-4 mb-8">
          <h2 className="font-bold text-gray-800 text-center text-sm">まずはこの3ステップ</h2>

          <Link href="/predict" aria-label="今週末のレースをAIで予想する" className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-green-400 hover:shadow-md transition-all group">
            <div className="w-10 h-10 bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-green-600">1</div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-sm">今週末のレースを予想する</p>
              <p className="text-xs text-gray-400">レース情報を入力してAI予想を生成</p>
            </div>
            <span className="text-gray-300 group-hover:text-green-600 transition-colors">&rarr;</span>
          </Link>

          <Link href="/predict" aria-label="複勝モードで堅実な予想をする" className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-green-400 hover:shadow-md transition-all group">
            <div className="w-10 h-10 bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-green-600">2</div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-sm">複勝モードを試してみる</p>
              <p className="text-xs text-gray-400">堅実に当てたい方におすすめ</p>
            </div>
            <span className="text-gray-300 group-hover:text-green-600 transition-colors">&rarr;</span>
          </Link>

          <Link href="/calendar" aria-label="G1カレンダーで年間レース日程を確認する" className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-green-400 hover:shadow-md transition-all group">
            <div className="w-10 h-10 bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-green-600">3</div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-sm">G1カレンダーをチェック</p>
              <p className="text-xs text-gray-400">年間の大レースを確認して準備</p>
            </div>
            <span className="text-gray-300 group-hover:text-green-600 transition-colors">&rarr;</span>
          </Link>
        </div>

        {/* X Share Button */}
        <div className="mb-6 text-center">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("競馬予想AIで今日のレースを予想しました！ #競馬予想AI #競馬 #競馬予想 https://keiba-yoso-ai.vercel.app")}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="競馬予想AIの予想結果をXにシェアする"
            className="text-xs px-3 py-1.5 rounded-lg bg-black hover:bg-gray-800 text-white font-medium transition-colors inline-block"
          >
            Xでシェア
          </a>
        </div>

        {/* Bookmark Prompt */}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400 mb-1">ご感想をお聞かせください（30秒）</p>
          <a href="mailto:support@pokkorilab.com?subject=%E3%81%94%E6%84%9F%E6%83%B3&body=%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E5%90%8D%EF%BC%9A%0A%E6%84%9F%E6%83%B3%EF%BC%9A" aria-label="競馬予想AIへのご感想をメールで送る" className="text-xs text-blue-500 underline hover:text-blue-700">感想を送る →</a>
        </div>
        <div className="text-center bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">毎週末の予想にすぐアクセス</p>
          <p className="text-sm font-bold text-gray-700">このサイトをブックマークしておきましょう</p>
        </div>
      </div>
    </>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12">
      <Suspense fallback={<div className="text-gray-400">読み込み中...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
