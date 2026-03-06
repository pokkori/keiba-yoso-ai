"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const params = useSearchParams();

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (sessionId) {
      fetch(`/api/stripe/verify?session_id=${sessionId}`);
    }
  }, [params]);

  return (
    <div className="text-center">
      <div className="text-6xl mb-6">🏆</div>
      <h1 className="text-3xl font-bold text-green-800 mb-4">ご登録ありがとうございます！</h1>
      <p className="text-gray-500 mb-8">プランが有効になりました。さっそく予想を始めましょう。</p>
      <Link href="/predict" className="inline-block bg-green-700 hover:bg-green-800 text-white font-bold py-4 px-10 rounded-full transition-colors">
        予想を始める
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Suspense fallback={<div className="text-gray-400">読み込み中...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
