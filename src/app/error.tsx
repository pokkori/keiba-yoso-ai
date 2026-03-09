"use client";
import Link from "next/link";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center px-4">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold text-white mb-2">エラーが発生しました</h1>
      <p className="text-gray-400 mb-8">しばらく時間をおいてから再度お試しください。</p>
      <div className="flex gap-4">
        <button onClick={reset} className="bg-yellow-600 px-6 py-3 rounded-full font-bold text-white">
          再試行
        </button>
        <Link href="/" className="bg-gray-600 px-6 py-3 rounded-full font-bold text-white">
          トップに戻る
        </Link>
      </div>
    </main>
  );
}
