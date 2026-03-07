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

const FEATURES = [
  {
    icon: "📋",
    title: "リアル出走表データで予想",
    desc: "netkeiba から出走馬・騎手・過去成績を自動取得。AIが実際のデータを分析して本命◎・対抗○・単穴▲を提案。",
  },
  {
    icon: "🎯",
    title: "軍資金別の買い目配分",
    desc: "「今日の軍資金3,000円」と入力するだけで、三連複・馬連・単勝の具体的な購入金額まで提案。",
  },
  {
    icon: "📊",
    title: "回収率トラッキング",
    desc: "投資額・回収額を記録して累計回収率を自動計算。どの条件で勝てているか可視化できる。",
  },
  {
    icon: "⚡",
    title: "30秒で予想完了",
    desc: "レースを選んでボタンを押すだけ。データ取得からAI分析まで全自動。難しい操作は一切不要。",
  },
];

const VOICES = [
  { text: "G1の前に使ってみたら本命が飛んで単穴が来た。AIが指摘してた穴馬だったので感謝。", name: "40代・会社員" },
  { text: "毎週土日に全レース予想するのは無理だけど、これなら気になったレースをすぐ調べられる。", name: "30代・競馬歴5年" },
  { text: "軍資金入力で具体的な金額が出るのが便利。自分で配分考えるのが一番難しかった。", name: "50代・週末競馬ファン" },
];

const PLANS = [
  {
    name: "無料",
    price: "0",
    unit: "",
    features: ["1レース予想（お試し）", "基本分析のみ"],
    cta: "無料で試す",
    stripeKey: null,
    href: "/predict",
    highlight: false,
  },
  {
    name: "ベーシック",
    price: "980",
    unit: "/月",
    features: ["全レース予想（毎週無制限）", "本命・対抗・単穴を明示", "軍資金別買い目提案", "回収率トラッキング"],
    cta: "始める",
    stripeKey: "basic",
    href: null,
    highlight: false,
  },
  {
    name: "プロ",
    price: "2,980",
    unit: "/月",
    features: ["ベーシック全機能", "重賞G1の詳細特別分析", "過去5走の詳細成績分析", "展開・ペース予測"],
    cta: "今すぐ始める",
    stripeKey: "pro",
    href: null,
    highlight: true,
  },
  {
    name: "年間プロ",
    price: "19,800",
    unit: "/年",
    badge: "2ヶ月分お得",
    features: ["プロ全機能", "年間¥15,960お得", "優先サポート"],
    cta: "年間で申し込む",
    stripeKey: "annual",
    href: null,
    highlight: false,
  },
];

const FAQS = [
  { q: "予想は毎週使えますか？", a: "はい。ベーシック・プロプランは毎週土日の全レースが無制限で使えます。JRA全開催（最大3場×12R）に対応。" },
  { q: "必ず当たりますか？", a: "AIも100%の的中を保証することはできません。競馬の楽しみ方として活用いただき、余裕資金でお楽しみください。" },
  { q: "どのくらいのデータを使いますか？", a: "出走馬の直近5走の成績、騎手情報、斤量、調教師などをリアルタイムで取得して分析します。" },
  { q: "いつでも解約できますか？", a: "Stripeの自動更新サブスクリプションです。マイページから次回更新日前にいつでも解約できます。" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-green-200 bg-green-900 sticky top-0 z-10">
        <span className="text-xl font-bold text-white">🏇 競馬予想AI</span>
        <div className="flex items-center gap-4">
          <Link href="/predict" className="text-sm text-green-200 hover:text-white">予想する</Link>
          <Link href="/tracker" className="text-sm text-green-200 hover:text-white">回収率管理</Link>
          <Link href="/predict"
            className="bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-4 py-1.5 rounded-full text-sm transition-colors">
            無料で試す
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center py-20 px-6 bg-gradient-to-br from-green-900 to-green-700 text-white">
        <p className="text-xs font-bold text-green-300 mb-4 tracking-widest uppercase">リアルデータ × AI分析</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          netkeiba の出走馬データを<br />
          <span className="text-yellow-400">AIが30秒で分析</span>
        </h1>
        <p className="text-lg text-green-200 mb-4 max-w-xl mx-auto">
          本命◎・対抗○・単穴▲・推奨買い目・展開予想まで<br />
          ワンクリックで完全網羅。毎週土日・全レース対応。
        </p>
        <p className="text-green-300 text-sm mb-8">G1・重賞・平場レースすべて対応</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link href="/predict"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-4 px-10 rounded-full text-lg transition-colors">
            無料で予想を見る →
          </Link>
          <button onClick={() => startCheckout("pro")}
            className="inline-block border-2 border-white/50 hover:border-white text-white font-bold py-4 px-8 rounded-full text-base transition-colors">
            プロプラン ¥2,980/月
          </button>
        </div>
        <p className="text-green-400 text-sm mt-4">登録不要・カード不要・今すぐ体験</p>
      </section>

      {/* Stats */}
      <section className="py-10 px-6 bg-green-800 text-white">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            { num: "JRA全場", label: "全競馬場に対応" },
            { num: "30秒", label: "AI分析完了まで" },
            { num: "直近5走", label: "全馬の成績を分析" },
          ].map(s => (
            <div key={s.label}>
              <div className="text-2xl md:text-3xl font-bold text-yellow-400">{s.num}</div>
              <div className="text-green-300 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">なぜ競馬予想AIが選ばれるのか</h2>
        <p className="text-center text-gray-500 text-sm mb-12">自分で予想する手間なし。データ収集もAI分析も全自動。</p>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-green-200 transition-colors bg-white shadow-sm">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 bg-green-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">使い方は3ステップ</h2>
          <div className="space-y-6">
            {[
              { step: "1", title: "開催日・レースを選ぶ", desc: "今日の日付を選ぶと開催レースが自動表示。気になるレースをクリック。" },
              { step: "2", title: "「予想する」を押すだけ", desc: "ボタンを押すと出走馬データを自動取得。AIが30秒で分析を完了。" },
              { step: "3", title: "買い目を確認・投票", desc: "本命・対抗・単穴と推奨買い目が一覧表示。JRA公式サイトで馬券購入へ。" },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">{s.step}</div>
                <div>
                  <h3 className="font-bold text-gray-900">{s.title}</h3>
                  <p className="text-gray-600 text-sm mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/predict"
              className="inline-block bg-green-700 hover:bg-green-800 text-white font-bold py-4 px-10 rounded-full text-base transition-colors">
              今すぐ無料で試す →
            </Link>
          </div>
        </div>
      </section>

      {/* Voices */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">ユーザーの声</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {VOICES.map((v, i) => (
            <div key={i} className="bg-green-50 border border-green-100 rounded-2xl p-5">
              <p className="text-gray-700 text-sm leading-relaxed mb-4">「{v.text}」</p>
              <p className="text-xs text-gray-500 font-medium">— {v.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6 bg-green-50" id="pricing">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">料金プラン</h2>
        <p className="text-center text-gray-500 text-sm mb-12">いつでも解約OK・次回更新前に停止可能</p>
        <div className="grid md:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`rounded-2xl p-6 border-2 bg-white ${plan.highlight ? "border-green-500 shadow-xl" : "border-green-200"}`}>
              {plan.highlight && (
                <span className="block text-center text-xs font-bold text-white bg-green-600 rounded-full px-3 py-1 mb-3">
                  人気No.1
                </span>
              )}
              {"badge" in plan && plan.badge && (
                <span className="block text-center text-xs font-bold text-yellow-700 bg-yellow-100 rounded-full px-3 py-1 mb-3">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-green-600">¥{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.unit}</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-2 mb-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>{feat}
                  </li>
                ))}
              </ul>
              {plan.stripeKey ? (
                <button onClick={() => startCheckout(plan.stripeKey!)}
                  className={`w-full py-2.5 rounded-full text-sm font-bold transition-colors ${plan.highlight ? "bg-green-600 hover:bg-green-700 text-white" : "border border-green-300 text-green-700 hover:bg-green-50"}`}>
                  {plan.cta}
                </button>
              ) : (
                <Link href={plan.href!}
                  className="block text-center py-2.5 rounded-full text-sm font-bold border border-green-300 text-green-700 hover:bg-green-50 transition-colors">
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">よくある質問</h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <div key={faq.q} className="border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-2 text-sm">Q. {faq.q}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">A. {faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 bg-green-900 text-white text-center">
        <h2 className="text-2xl font-bold mb-3">今週の競馬、AIと一緒に楽しもう</h2>
        <p className="text-green-200 text-sm mb-8">無料1回から。登録不要でいますぐ体験できます。</p>
        <Link href="/predict"
          className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-4 px-12 rounded-full text-lg transition-colors">
          無料で予想を見る →
        </Link>
      </section>

      <footer className="text-center py-8 text-sm text-gray-400 border-t space-x-4">
        <a href="/legal" className="hover:text-gray-600">特定商取引法に基づく表記</a>
        <a href="/privacy" className="hover:text-gray-600">プライバシーポリシー</a>
        <span>© 2025 競馬予想AI</span>
      </footer>
    </div>
  );
}
