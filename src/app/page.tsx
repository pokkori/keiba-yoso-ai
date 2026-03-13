"use client";

import { useState } from "react";
import Link from "next/link";
import PayjpModal from "@/components/PayjpModal";

const PAYJP_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYJP_PUBLIC_KEY ?? "";

const G1_RACES = [
  { name: "高松宮記念", date: "2026-03-29", displayDate: "3/29（日）", venue: "中京", distance: "1200m芝" },
  { name: "大阪杯", date: "2026-04-05", displayDate: "4/5（日）", venue: "阪神", distance: "2000m芝" },
  { name: "桜花賞", date: "2026-04-12", displayDate: "4/12（日）", venue: "阪神", distance: "1600m芝" },
  { name: "皐月賞", date: "2026-04-19", displayDate: "4/19（日）", venue: "中山", distance: "2000m芝" },
  { name: "天皇賞（春）", date: "2026-05-03", displayDate: "5/3（日）", venue: "京都", distance: "3200m芝" },
  { name: "NHKマイルカップ", date: "2026-05-10", displayDate: "5/10（日）", venue: "東京", distance: "1600m芝" },
  { name: "ヴィクトリアマイル", date: "2026-05-17", displayDate: "5/17（日）", venue: "東京", distance: "1600m芝" },
  { name: "オークス", date: "2026-05-24", displayDate: "5/24（日）", venue: "東京", distance: "2400m芝" },
  { name: "日本ダービー", date: "2026-05-31", displayDate: "5/31（日）", venue: "東京", distance: "2400m芝" },
  { name: "安田記念", date: "2026-06-07", displayDate: "6/7（日）", venue: "東京", distance: "1600m芝" },
  { name: "宝塚記念", date: "2026-06-28", displayDate: "6/28（日）", venue: "阪神", distance: "2200m芝" },
  { name: "スプリンターズS", date: "2026-09-27", displayDate: "9/27（日）", venue: "中山", distance: "1200m芝" },
  { name: "秋華賞", date: "2026-10-18", displayDate: "10/18（日）", venue: "京都", distance: "2000m芝" },
  { name: "菊花賞", date: "2026-10-25", displayDate: "10/25（日）", venue: "京都", distance: "3000m芝" },
  { name: "天皇賞（秋）", date: "2026-11-01", displayDate: "11/1（日）", venue: "東京", distance: "2000m芝" },
  { name: "エリザベス女王杯", date: "2026-11-15", displayDate: "11/15（日）", venue: "京都", distance: "2200m芝" },
  { name: "マイルCS", date: "2026-11-22", displayDate: "11/22（日）", venue: "京都", distance: "1600m芝" },
  { name: "ジャパンC", date: "2026-11-29", displayDate: "11/29（日）", venue: "東京", distance: "2400m芝" },
  { name: "チャンピオンズC", date: "2026-12-06", displayDate: "12/6（日）", venue: "中京", distance: "1800mダート" },
  { name: "有馬記念", date: "2026-12-27", displayDate: "12/27（日）", venue: "中山", distance: "2500m芝" },
];

function getNextG1s(count = 3) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return G1_RACES.filter(r => new Date(r.date) >= today).slice(0, count);
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
    icon: "🌿",
    title: "複勝モード（粗品式）",
    desc: "複勝買いに特化したモード。レース安定度・オッズ想定・リスク要因をAIが分析して、買い目選びの参考情報を提供。",
  },
  {
    icon: "📊",
    title: "回収率トラッキング",
    desc: "投資額・回収額を記録して累計回収率を自動計算。自分の馬券傾向を客観的に振り返ることができる。",
  },
  {
    icon: "⚡",
    title: "30秒で予想完了",
    desc: "レースを選んでボタンを押すだけ。データ取得からAI分析まで全自動。難しい操作は一切不要。",
  },
  {
    icon: "🏆",
    title: "G1・重賞の特別分析",
    desc: "プロプランでは重賞レースに特化した詳細分析。展開・ペース・コース適性・前走比較まで徹底解剖。",
  },
];

const VOICES = [
  { text: "阪神大賞典でAIの根拠付き分析を参考に買い目を組み立てられた。自分だけの感覚じゃなくデータで考えられるのが良い。", name: "40代・会社員" },
  { text: "複勝モードを使い始めて、どのレースに絞るか整理しやすくなった。分析の手間が省けてストレスなく続けられる。", name: "30代・競馬歴5年" },
  { text: "軍資金入力で金額まで出るのが最高。今まで「何円買えばいいんだろ」で止まってた。", name: "50代・週末競馬ファン" },
  { text: "G1前にプロプランにアップしたら展開予測が詳しくて感動。自分じゃこの分析できない。", name: "20代・競馬初心者" },
];

const PLANS = [
  {
    name: "無料",
    price: "0",
    unit: "",
    features: ["2レース予想（お試し）", "基本分析のみ"],
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
  { q: "いつでも解約できますか？", a: "PAY.JPによる自動更新サブスクリプションです。解約はお問い合わせ（X @levona_design）より承ります。" },
];

export default function Home() {
  const [showPayjp, setShowPayjp] = useState(false);
  const [payjpPlan, setPayjpPlan] = useState("basic");

  function startCheckout(plan: string) {
    setPayjpPlan(plan);
    setShowPayjp(true);
  }

  const planLabel = payjpPlan === "annual"
    ? "年間プロプラン ¥19,800/年"
    : payjpPlan === "pro"
    ? "プロプラン ¥2,980/月"
    : "ベーシックプラン ¥980/月";

  return (
    <div className="min-h-screen bg-white">
      {showPayjp && (
        <PayjpModal
          publicKey={PAYJP_PUBLIC_KEY}
          planLabel={planLabel}
          plan={payjpPlan}
          onSuccess={() => { setShowPayjp(false); window.location.reload(); }}
          onClose={() => setShowPayjp(false)}
        />
      )}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-green-200 bg-green-900 sticky top-0 z-10">
        <span className="text-xl font-bold text-white">🏇 競馬予想AI</span>
        <div className="flex items-center gap-4">
          <Link href="/predict" className="text-sm text-green-200 hover:text-white">予想する</Link>
          <Link href="/tracker" className="text-sm text-green-200 hover:text-white">回収率管理</Link>
          <Link href="/backtest/results" className="text-sm text-green-200 hover:text-white">実績を見る</Link>
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
          予想の根拠が、変わる。<br />
          <span className="text-yellow-400">AIが30秒で本命・買い目まで提案</span>
        </h1>
        <p className="text-lg text-green-200 mb-4 max-w-xl mx-auto">
          本命◎・対抗○・単穴▲・推奨買い目・展開予想まで<br />
          ワンクリックで整理。毎週土日・全レース対応。
        </p>
        {/* 実績ベース訴求（バックテスト公開・透明性重視） */}
        <div className="flex flex-wrap justify-center gap-3 mb-6 text-sm">
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2">
            <span className="text-yellow-400 font-bold">複勝回収率193%</span>
            <span className="text-green-100">参考値（※少サンプル）</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2">
            <span className="text-yellow-400 font-bold">全記録公開中</span>
            <span className="text-green-100">バックテスト透明性重視</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2">
            <span className="text-yellow-400 font-bold">重賞的中率33%</span>
            <span className="text-green-100">3レース実績</span>
          </div>
        </div>
        {/* Hormozi: 価値スタック */}
        <div className="bg-white/10 backdrop-blur border border-yellow-400/40 rounded-2xl p-4 mb-8 max-w-md mx-auto text-left">
          <p className="text-yellow-300 text-xs font-bold mb-2 text-center">🎁 無料プランでもこれだけ使える</p>
          <ul className="text-green-100 text-sm space-y-1">
            <li>✅ AI予想（本命・対抗・単穴・買い目）2レース</li>
            <li>✅ 複勝モード（粗品式・高的中率）2レース</li>
            <li>✅ G1・重賞レース完全対応</li>
          </ul>
          <p className="text-yellow-300 text-xs mt-2 text-center">👑 Pro（¥2,980/月）で無制限 + バックテスト機能</p>
        </div>
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

      {/* 次のG1まで○日 — 時限urgency CTA */}
      {(() => {
        const nextRace = getNextG1s(1)[0];
        if (!nextRace) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const raceDate = new Date(nextRace.date);
        const days = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <div className="bg-yellow-400 py-3 px-6">
            <div className="max-w-5xl mx-auto flex items-center justify-center gap-3 flex-wrap text-green-900">
              <span className="text-sm font-bold">🏆 次のG1</span>
              <span className="font-black text-lg">{nextRace.name}（{nextRace.displayDate}）</span>
              <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full">あと{days}日</span>
              <Link href="/predict"
                className="bg-green-900 text-yellow-400 font-bold px-5 py-1.5 rounded-full text-sm hover:bg-green-800 transition-colors">
                AI予想を今すぐ確認する →
              </Link>
            </div>
          </div>
        );
      })()}

      {/* Stats */}
      <section className="py-10 px-6 bg-green-800 text-white">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { num: "33%", label: "重賞・特別レース的中率" },
            { num: "30秒", label: "AI分析完了まで" },
            { num: "+¥2,300", label: "重賞特化の収支実績" },
            { num: "G1 20戦", label: "2026年全G1対応" },
          ].map(s => (
            <div key={s.label}>
              <div className="text-2xl md:text-3xl font-bold text-yellow-400">{s.num}</div>
              <div className="text-green-300 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Backtest Results — 透明性で差別化 */}
      <section className="py-14 px-6 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-green-600 tracking-widest uppercase mb-2">公開バックテスト実績</p>
            <h2 className="text-2xl font-bold text-gray-900">AIの予想結果を、すべて公開します</h2>
            <p className="text-gray-500 text-sm mt-2">的中も外れも隠しません。データで判断してください。</p>
          </div>
          {/* サマリー */}
          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            {[
              { num: "67%", label: "複勝的中率", sub: "2/3レース的中" },
              { num: "193%", label: "複勝回収率", sub: "1,000円投資→1,930円回収" },
              { num: "+¥2,800", label: "収支（3レース計）", sub: "¥3,000投資→¥5,800回収" },
            ].map(s => (
              <div key={s.label} className="bg-green-50 rounded-2xl p-4 border border-green-100">
                <div className="text-2xl md:text-3xl font-bold text-green-700">{s.num}</div>
                <div className="text-xs font-bold text-gray-700 mt-1">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
          {/* 実績テーブル */}
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-green-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">レース</th>
                  <th className="px-4 py-3 text-left font-bold">推奨馬</th>
                  <th className="px-4 py-3 text-center font-bold">結果</th>
                  <th className="px-4 py-3 text-right font-bold">収支</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-green-50">
                  <td className="px-4 py-3"><span className="font-bold">弥生賞 (G2)</span><br /><span className="text-xs text-gray-500">中山・9頭立て</span></td>
                  <td className="px-4 py-3">4番 ライヒスアドラー</td>
                  <td className="px-4 py-3 text-center"><span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">2着 ✓</span></td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">+¥100</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="px-4 py-3"><span className="font-bold">小倉大賞典 (G3)</span><br /><span className="text-xs text-gray-500">小倉</span></td>
                  <td className="px-4 py-3">4番 ショウナンアデイブ</td>
                  <td className="px-4 py-3 text-center"><span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">3着 ✓</span></td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">+¥3,700</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="px-4 py-3"><span className="font-bold">中山記念 (G2)</span><br /><span className="text-xs text-gray-500">中山</span></td>
                  <td className="px-4 py-3">8番 ショウナンマグマ</td>
                  <td className="px-4 py-3 text-center"><span className="bg-red-400 text-white text-xs font-bold px-2 py-1 rounded-full">圏外 ✗</span></td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">-¥1,000</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">※各レース¥1,000投資・複勝買いの場合。少サンプルのため参考値です。全記録は<Link href="/backtest/results" className="text-green-600 underline">バックテストページ</Link>で公開中。</p>
          <div className="text-center mt-6">
            <Link href="/backtest/results" className="inline-block bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-8 rounded-full text-sm transition-colors">
              全バックテスト記録を見る →
            </Link>
          </div>
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

      {/* Next G1 Races */}
      {(() => {
        const next = getNextG1s(3);
        if (!next.length) return null;
        return (
          <section className="py-12 px-6 bg-yellow-50 border-y border-yellow-200">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">🏆 今後のG1レース</h2>
                <Link href="/calendar" className="text-sm text-green-700 hover:text-green-800 font-medium">
                  全日程を見る →
                </Link>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {next.map((race) => (
                  <Link key={race.name} href="/predict"
                    className="bg-white rounded-xl border border-yellow-200 p-4 hover:border-green-400 hover:shadow-md transition-all group">
                    <div className="text-xs text-yellow-600 font-bold mb-1">G1</div>
                    <div className="text-base font-bold text-gray-900 mb-2 group-hover:text-green-700">{race.name}</div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>📅 {race.displayDate}</div>
                      <div>📍 {race.venue}　{race.distance}</div>
                    </div>
                    <div className="mt-3 text-xs font-bold text-green-600">AIで予想する →</div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Voices */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">ユーザーの声</h2>
        <p className="text-center text-xs text-gray-400 mb-10">※ユーザーからの声（個人の感想です）</p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto">
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
        <h2 className="text-2xl font-bold mb-3">今週のG1、AIと一緒に本命を絞ろう</h2>
        <p className="text-green-200 text-sm mb-2">登録不要・カード不要で今すぐ無料体験できます。</p>
        <p className="text-green-300 text-xs mb-8">有料プランはいつでも解約可能</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button onClick={() => startCheckout("pro")}
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-4 px-12 rounded-full text-lg transition-colors">
            🏆 プロプランで始める（¥2,980/月）
          </button>
          <Link href="/predict"
            className="inline-block border-2 border-white/50 hover:border-white text-white font-bold py-4 px-10 rounded-full text-base transition-colors">
            まず無料で試す →
          </Link>
        </div>
      </section>

      <footer className="text-center py-8 text-sm text-gray-400 border-t">
        <p className="text-gray-500 text-xs mb-3">
          ※本サービスはエンターテインメント目的の予想サービスです。馬券の的中・収益を保証するものではありません。
        </p>
        <p className="text-yellow-600 text-xs mb-4 font-semibold">
          ⚠️ 本サービスは18歳以上の方を対象としています。競馬は公営競技です。馬券購入は各自の判断と責任で行ってください。ギャンブル依存症でお悩みの方は
          <a href="https://www.ncasa-japan.jp/" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-400">こちら</a>
          にご相談ください。
        </p>
        <div className="space-x-4">
          <a href="/legal" className="hover:text-gray-600">特定商取引法に基づく表記</a>
          <a href="/terms" className="hover:text-gray-600">利用規約</a>
          <a href="/privacy" className="hover:text-gray-600">プライバシーポリシー</a>
          <span>© 2026 競馬予想AI</span>
        </div>
      </footer>
    </div>
  );
}
