"use client";

import Link from "next/link";

async function startCheckout(plan: string) {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

const features = [
  { icon: "🤖", title: "AI全レース分析", desc: "JRA全開催レースをAIがリアルタイム分析。本命・対抗・単穴を即提案。" },
  { icon: "📊", title: "回収率トラッキング", desc: "投資額・回収額を記録して累計回収率を自動計算。成績を可視化。" },
  { icon: "📈", title: "レース展開予想", desc: "逃げ・先行・差し・追い込みの展開を分析して買い目を最適化。" },
];

const plans = [
  {
    name: "無料",
    price: "0",
    features: ["週1レース予想閲覧", "基本分析のみ"],
    cta: "無料で試す",
    stripeKey: null,
    href: "/predict",
    highlight: false,
  },
  {
    name: "ベーシック",
    price: "980",
    features: ["全レース予想", "推奨馬券提示", "軍資金別買い目提案"],
    cta: "始める",
    stripeKey: "basic",
    href: null,
    highlight: false,
  },
  {
    name: "プロ",
    price: "2,980",
    features: ["全レース予想", "推奨馬券提示", "軍資金別買い目提案", "過去成績分析", "重賞特別分析"],
    cta: "おすすめ",
    stripeKey: "pro",
    href: null,
    highlight: true,
  },
  {
    name: "年間プラン",
    price: "19,800",
    features: ["プロ全機能", "2ヶ月分お得", "優先サポート"],
    cta: "お得",
    stripeKey: "annual",
    href: null,
    highlight: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* ナビゲーション */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-green-200 bg-green-900">
        <span className="text-xl font-bold text-white">🏇 競馬予想AI</span>
        <div className="flex gap-4">
          <Link href="/predict" className="text-sm text-green-200 hover:text-white">予想する</Link>
          <Link href="/tracker" className="text-sm text-green-200 hover:text-white">回収率管理</Link>
          <Link href="/pricing" className="text-sm text-green-200 hover:text-white">料金</Link>
        </div>
      </nav>

      {/* ヒーローセクション */}
      <section className="text-center py-20 px-6 bg-gradient-to-br from-green-900 to-green-700 text-white">
        <p className="text-sm font-semibold text-green-300 mb-3 tracking-widest uppercase">AI Horse Racing Prediction</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          AIが導く、<br />
          <span className="text-yellow-400">勝利への道</span>
        </h1>
        <p className="text-lg text-green-200 mb-8 max-w-xl mx-auto">
          最新AIが全レースのデータを分析。<br />
          本命・対抗・買い目を即座に提案します。
        </p>
        <Link
          href="/predict"
          className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-4 px-10 rounded-full text-lg transition-colors"
        >
          無料で予想を見る
        </Link>
        <p className="text-sm text-green-400 mt-4">登録不要・今すぐ体験</p>
      </section>

      {/* 特徴 */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">3つの強み</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="text-center p-6 rounded-2xl bg-green-50 border border-green-100">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 料金プラン */}
      <section className="py-16 px-6 bg-green-50">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">料金プラン</h2>
        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 border-2 bg-white ${
                plan.highlight
                  ? "border-green-500 shadow-lg scale-105"
                  : "border-green-200"
              }`}
            >
              {plan.highlight && (
                <span className="block text-center text-xs font-bold text-white bg-green-600 rounded-full px-3 py-1 mb-3">
                  人気No.1
                </span>
              )}
              <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-green-600">¥{plan.price}</span>
                {plan.price !== "0" && plan.name !== "年間プラン" && (
                  <span className="text-gray-500 text-sm">/月</span>
                )}
                {plan.name === "年間プラン" && (
                  <span className="text-gray-500 text-sm">/年</span>
                )}
              </div>
              <ul className="text-sm text-gray-600 space-y-2 mb-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {feat}
                  </li>
                ))}
              </ul>
              {plan.stripeKey ? (
                <button
                  onClick={() => startCheckout(plan.stripeKey!)}
                  className={`w-full py-2 rounded-full text-sm font-bold transition-colors ${
                    plan.highlight
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "border border-green-300 text-green-700 hover:bg-green-50"
                  }`}
                >
                  {plan.cta}
                </button>
              ) : (
                <Link
                  href={plan.href!}
                  className="block text-center py-2 rounded-full text-sm font-bold border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* フッター */}
      <footer className="text-center py-8 text-sm text-gray-400 border-t">
        © 2025 競馬予想AI. All rights reserved.
      </footer>
    </div>
  );
}
