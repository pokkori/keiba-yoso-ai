"use client";
import Link from "next/link";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center px-4">
      <div className="flex justify-center mb-4"><svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
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
