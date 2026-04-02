"use client";

import { useState } from "react";
import Link from "next/link";
import KomojuButton from "@/components/KomojuButton";
import { StreakBanner } from "@/components/StreakBanner";
import { UsageCounter } from "@/components/UsageCounter";
import { CrossSell } from "@/components/CrossSell";
import { TrustBadge } from "@/components/TrustBadge";
import { SetPlanBanner } from "@/components/SetPlanBanner";

const PAYJP_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYJP_PUBLIC_KEY ?? "";

// 今日開催かどうかを判定（土日のみ）
function isTodayRaceDay(): { isRaceDay: boolean; dayLabel: string } {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDay();
  const isRaceDay = day === 0 || day === 6;
  const dayLabel = day === 0 ? "今日（日曜）" : day === 6 ? "今日（土曜）" : "";
  return { isRaceDay, dayLabel };
}

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

// 的中実績ランキング TOP5
const HIT_RANKING = [
  { rank: 1, race: "小倉大賞典(G3)", date: "2026/3/8", bet: "複勝", horse: "ショウナンアデイブ", odds: "3.7倍", profit: "+¥2,700", badge: "bg-yellow-400 text-green-900" },
  { rank: 2, race: "弥生賞(G2)", date: "2026/3/2", bet: "複勝", horse: "ライヒスアドラー", odds: "1.1倍", profit: "+¥100", badge: "bg-gray-300 text-gray-800" },
  { rank: 3, race: "阪神大賞典(G2)", date: "2026/3/22", bet: "複勝", horse: "AI推奨馬", odds: "予想中", profit: "—", badge: "bg-amber-700 text-white" },
  { rank: 4, race: "スプリングS(G2)", date: "2026/3/15", bet: "未記録", horse: "予想記録なし", odds: "—", profit: "—", badge: "bg-gray-200 text-gray-500" },
  { rank: 5, race: "金鯱賞(G2)", date: "2026/3/15", bet: "未記録", horse: "予想記録なし", odds: "—", profit: "—", badge: "bg-gray-200 text-gray-500" },
];

// AI予想根拠の4軸データ（サンプル表示用）
const RADAR_AXES = [
  { label: "過去成績", value: 82, desc: "直近5走の着順・タイム偏差" },
  { label: "コース適性", value: 75, desc: "コース別成績・距離適性" },
  { label: "騎手相性", value: 68, desc: "騎手×馬の相性データ" },
  { label: "当日馬場", value: 70, desc: "馬場状態×脚質適合度" },
];

const FEATURE_ICONS = {
  data: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  ),
  money: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2M9 9h4a2 2 0 010 4H9a2 2 0 000 4h6"/>
    </svg>
  ),
  fukusho: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7" aria-hidden="true">
      <path d="M12 2L8 8H2l5 4-2 7 7-4 7 4-2-7 5-4h-6z"/>
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7" aria-hidden="true">
      <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2m12 6h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"/><path d="M6 3h12v10a6 6 0 01-12 0V3z"/><path d="M9 21h6m-3-4v4"/>
    </svg>
  ),
} as const;

const FEATURES = [
  {
    iconKey: "data" as keyof typeof FEATURE_ICONS,
    title: "リアル出走表データで予想",
    desc: "netkeiba から出走馬・騎手・過去成績を自動取得。AIが実際のデータを分析して本命◎・対抗○・単穴▲を提案。",
  },
  {
    iconKey: "money" as keyof typeof FEATURE_ICONS,
    title: "軍資金別の買い目配分",
    desc: "「今日の軍資金3,000円」と入力するだけで、三連複・馬連・単勝の具体的な購入金額まで提案。",
  },
  {
    iconKey: "fukusho" as keyof typeof FEATURE_ICONS,
    title: "複勝モード",
    desc: "複勝買いに特化したモード。レース安定度・オッズ想定・リスク要因をAIが分析して、買い目選びの参考情報を提供。",
  },
  {
    iconKey: "chart" as keyof typeof FEATURE_ICONS,
    title: "回収率トラッキング",
    desc: "投資額・回収額を記録して累計回収率を自動計算。自分の馬券傾向を客観的に振り返ることができる。",
  },
  {
    iconKey: "bolt" as keyof typeof FEATURE_ICONS,
    title: "30秒で予想完了",
    desc: "レースを選んでボタンを押すだけ。データ取得からAI分析まで全自動。難しい操作は一切不要。",
  },
  {
    iconKey: "trophy" as keyof typeof FEATURE_ICONS,
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
    highlight: false,
  },
  {
    name: "年間プロ",
    price: "19,800",
    unit: "/年",
    badge: "2ヶ月分無料",
    badgeGreen: true,
    features: ["プロ全機能", "月換算 ¥1,650/月（44%OFF）", "優先サポート"],
    cta: "年間プランで申し込む（44%OFF）",
    stripeKey: "annual",
    href: null,
    highlight: true,
  },
];

const FAQS = [
  { q: "予想は毎週使えますか？", a: "はい。ベーシック・プロプランは毎週土日の全レースが無制限で使えます。JRA全開催（最大3場×12R）に対応。" },
  { q: "必ず当たりますか？", a: "AIも100%の的中を保証することはできません。競馬の楽しみ方として活用いただき、余裕資金でお楽しみください。" },
  { q: "詐欺・悪質サービスとの違いは何ですか？", a: "本サービスはJRA公認ではなく「AIによる分析情報の提供」サービスです。バックテストの的中・外れを全記録公開しており、都合の良い結果だけを見せる悪質業者とは異なります。「絶対当たる」「必ず儲かる」などの誇大表現は一切使用しません。" },
  { q: "netkeiba・SPAIA競馬と何が違いますか？", a: "本サービスの最大の特徴は「バックテスト全公開の透明性」です。大手サービス（netkeiba マスターコース月額¥4,980・SPAIA競馬プラチナ月額¥1,500）と比べ、ベーシックプランは月¥980と業界最安水準。さらに「軍資金別の具体的な買い目金額提案」「複勝特化モード」「的中も外れも全記録公開するバックテスト」は他サービスにはない独自機能です。AIの判断プロセス（本命・対抗・単穴の理由）も可視化しています。" },
  { q: "どのくらいのデータを使いますか？", a: "出走馬の直近5走の成績、騎手情報、斤量、調教師などをnetkeibaからリアルタイムで取得して分析します。" },
  { q: "いつでも解約できますか？", a: "自動更新サブスクリプションです。解約はお問い合わせ（X @levona_design）より承ります。次回更新前に手続きをお願いします。" },
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
    : payjpPlan === (process.env.NEXT_PUBLIC_KOMOJU_SET_PLAN_ID ?? "set-plan")
    ? "3競技セットプラン ¥6,980/月（22%OFF）"
    : "ベーシックプラン ¥980/月";

  return (
    <div className="min-h-screen bg-white">
      {showPayjp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl relative">
            <button onClick={() => setShowPayjp(false)} aria-label="決済モーダルを閉じる" className="absolute top-3 right-3 text-gray-400 text-xl"></button>
            <div className="flex justify-center mb-3" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-green-700"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></div>
            <h2 className="text-lg font-bold mb-2 text-center">競馬予想AIプレミアム</h2>
            <KomojuButton
              planId={payjpPlan}
              planLabel={planLabel}
              className="w-full bg-green-700 text-white font-bold py-3 rounded-xl hover:bg-green-800 disabled:opacity-50"
            />
            <button onClick={() => setShowPayjp(false)} aria-label="決済モーダルを閉じる" className="text-xs text-gray-400 mt-2 block w-full text-center">閉じる</button>
          </div>
        </div>
      )}
      <nav aria-label="メインナビゲーション" className="flex items-center justify-between px-4 py-4 border-b border-green-200 bg-green-900 sticky top-0 z-10">
        <span className="text-base md:text-xl font-bold text-white flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          競馬予想AI
        </span>
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/predict" aria-label="競馬予想AIで今すぐ予想する" className="hidden md:block text-sm text-green-200 hover:text-white">予想する</Link>
          <Link href="/tracker" aria-label="馬券の回収率を管理する" className="hidden md:block text-sm text-green-200 hover:text-white">回収率管理</Link>
          <Link href="/backtest/results" aria-label="AIバックテストの全実績を見る" className="hidden md:block text-sm text-green-200 hover:text-white">実績を見る</Link>
          <Link href="/news" aria-label="今週のG1レース情報を確認する" className="hidden md:block text-sm text-green-200 hover:text-white">今週のG1</Link>
          <Link href="/how-to" aria-label="競馬予想AIの使い方ガイドを見る" className="hidden md:block text-sm text-green-200 hover:text-white">使い方ガイド</Link>
          <Link href="/predict" aria-label="競馬予想AIを無料で試す"
            className="bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-4 py-1.5 rounded-full text-sm transition-colors">
            無料で試す
          </Link>
        </div>
      </nav>

      <StreakBanner />

      {/* 今日開催バナー / G1シーズン開幕バナー */}
      {(() => {
        const { isRaceDay, dayLabel } = isTodayRaceDay();
        const spring = getNextG1s(3);
        if (isRaceDay) {
          return (
            <div className="bg-green-600 text-white text-center text-sm font-bold py-2 px-4 animate-pulse">
               {dayLabel}はJRA開催中！今すぐAIで予想を確認する
              <Link href="/predict" className="ml-2 underline hover:no-underline bg-yellow-400 text-green-900 px-2 py-0.5 rounded-full no-underline">今すぐ予想 →</Link>
            </div>
          );
        }
        if (!spring.length) return null;
        return (
          <div className="bg-red-600 text-white text-center text-sm font-bold py-2 px-4">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white mr-1">TOP</span> 春G1シーズン開幕！{spring.map(r => r.name).join(" → ")} — AIで予想する
            <Link href="/predict" className="ml-2 underline hover:no-underline">無料で試す →</Link>
          </div>
        );
      })()}

      {/* G1カウントダウンバナー */}
      {(() => {
        const nextG1 = getNextG1s(1)[0];
        if (!nextG1) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const raceTime = new Date(nextG1.date).getTime();
        const nowTime = now.getTime();
        const diffDays = Math.ceil((raceTime - nowTime) / (1000 * 60 * 60 * 24));
        const isToday = diffDays === 0;
        return (
          <div className={`text-center text-sm font-bold py-2.5 px-4 ${isToday ? "bg-red-600 animate-pulse" : "bg-gradient-to-r from-red-700 via-red-600 to-red-700"} text-white`}>
            {isToday ? (
              <span><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white mr-1">HOT</span> 本日G1開催！ <span className="font-black">{nextG1.name}</span> | {nextG1.venue} {nextG1.distance}</span>
            ) : (
              <span><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white mr-1">NEXT</span> 次のG1: <span className="font-black">{nextG1.name}</span> まであと<span className="text-yellow-300 font-black text-base">{diffDays}日</span> | {nextG1.venue} {nextG1.distance}</span>
            )}
          </div>
        );
      })()}

      {/* Hero */}
      <section className="text-center py-12 md:py-20 px-4 text-white overflow-x-hidden relative" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(250, 204, 21, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(5, 150, 105, 0.1) 0%, transparent 50%), linear-gradient(135deg, #14532d 0%, #166534 50%, #14532d 100%)' }}>
        <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-400 text-amber-800 font-bold text-sm px-4 py-2 rounded-full mb-4">
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white mr-1">LIVE</span> バックテスト実施中 — 全記録公開
        </div>
        <p className="text-xs font-bold text-green-300 mb-3 tracking-widest uppercase">リアルデータ × AI分析</p>
        <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
          リアルデータ×AIで、<br />
          <span style={{ background: 'linear-gradient(135deg, #FACC15, #F59E0B, #EAB308)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>今週末のレースを分析します。</span>
        </h1>
        <p className="text-base md:text-lg text-green-200 mb-4 max-w-xl mx-auto">
          バックテスト全記録公開中 — 的中も外れも隠しません。AIが毎週レースを分析して予想を更新
        </p>
        <p className="text-xs text-green-300/80 mb-4 max-w-xl mx-auto border border-green-600/40 bg-green-900/40 rounded-lg px-4 py-2">
          AIによる参考予想です。馬券の購入はご自身の判断で行ってください。的中・回収を保証するものではありません。現在バックテスト実施中。的中率・回収率データは検証完了後に公開予定です。
        </p>

        {/* AIバックテスト実績バッジ */}
        <div className="bg-yellow-400/20 border-2 border-yellow-400 rounded-2xl p-4 mb-6 max-w-md mx-auto">
          <p className="text-yellow-300 text-xs font-bold mb-3 tracking-widest uppercase text-center"><span className="px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-400/20 text-yellow-300 mr-1">DATA</span> AIバックテスト実施中</p>
          <div className="bg-white/10 rounded-xl px-4 py-4 text-center">
            <p className="text-yellow-300 font-bold text-sm mb-1">データ蓄積中</p>
            <p className="text-green-200 text-xs">バックテストを継続実施中です。実績値は蓄積後に公開します。</p>
          </div>
          <p className="text-green-400 text-xs text-center mt-2">※<Link href="/backtest/results" className="underline">バックテストページ</Link>で全記録を確認できます（外れも全公開）</p>
        </div>

        {/* 実績ベース訴求（バックテスト公開・透明性重視） */}
        <div className="flex flex-wrap justify-center gap-3 mb-6 text-sm">
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2">
            <span className="text-yellow-400 font-bold">全記録公開中</span>
            <span className="text-green-100">バックテスト透明性重視</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2">
            <span className="text-yellow-400 font-bold">リアルデータ分析</span>
            <span className="text-green-100">出走馬・騎手・成績を自動取得</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2">
            <span className="text-yellow-400 font-bold">G1・重賞対応</span>
            <span className="text-green-100">2026年全G1レース</span>
          </div>
        </div>
        {/* 競合比較バナー */}
        <div className="bg-white/10 backdrop-blur border border-yellow-400/40 rounded-2xl p-4 mb-4 max-w-md mx-auto">
          <p className="text-yellow-300 text-xs font-bold mb-3 text-center"><span className="px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-400/20 text-yellow-300 mr-1">VS</span> 競合サービスとの価格比較</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <span className="text-green-300">netkeiba マスターコース</span>
              <span className="text-red-300 font-bold line-through">¥4,980/月</span>
            </div>
            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <span className="text-green-300">SPAIA競馬 プラチナ</span>
              <span className="text-red-300 font-bold line-through">¥1,500/月</span>
            </div>
            <div className="flex items-center justify-between bg-yellow-400/20 border border-yellow-400/60 rounded-lg px-3 py-2">
              <span className="text-yellow-300 font-bold">競馬予想AI ベーシック</span>
              <span className="text-yellow-300 font-black">¥980/月 TOP</span>
            </div>
          </div>
          <p className="text-green-400 text-xs text-center mt-2">大手の1/5の価格。バックテスト全公開で透明性も◎</p>
        </div>
        {/* Hormozi: 価値スタック */}
        <div className="bg-white/10 backdrop-blur border border-yellow-400/40 rounded-2xl p-4 mb-8 max-w-md mx-auto text-left">
          <p className="text-yellow-300 text-xs font-bold mb-2 text-center"><span className="px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-400/20 text-yellow-300 mr-1">FREE</span> 無料プランでもこれだけ使える</p>
          <ul className="text-green-100 text-sm space-y-1">
            <li><svg className="inline w-4 h-4 text-green-400 mr-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/></svg> AI予想（本命・対抗・単穴・買い目）2レース</li>
            <li><svg className="inline w-4 h-4 text-green-400 mr-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/></svg> 複勝モード（的中率はバックテストで検証中）2レース</li>
            <li><svg className="inline w-4 h-4 text-green-400 mr-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/></svg> G1・重賞レース完全対応</li>
          </ul>
          <p className="text-yellow-300 text-xs mt-2 text-center"><span className="px-1.5 py-0.5 rounded text-xs font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-green-900 mr-1">PRO</span> Pro（¥2,980/月）で無制限 + バックテスト機能</p>
        </div>
        <div className="max-w-xs mx-auto mb-4"><UsageCounter /></div>
        <div className="mb-4"><TrustBadge /></div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link href="/predict"
            className="inline-block font-bold py-4 px-10 rounded-full text-lg transition-all duration-300 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #FACC15 0%, #F59E0B 100%)', color: '#14532d', boxShadow: '0 0 25px rgba(250, 204, 21, 0.4), 0 4px 15px rgba(0,0,0,0.3)' }}>
            今日の予想を無料でチェック →
          </Link>
          <p className="text-xs opacity-60 mt-2">※AI分析・登録不要</p>
          <button onClick={() => startCheckout("pro")}
            aria-label="プロプランを始める（月額2,980円）"
            className="inline-block border-2 border-white/50 hover:border-white text-white font-bold py-4 px-8 rounded-full text-base transition-colors">
            プロプラン ¥2,980/月
          </button>
        </div>
        <p className="text-sm text-amber-300 mt-2 font-semibold">
          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white mr-1">LIVE</span> バックテスト継続中 — 全記録をリアルタイム公開
        </p>
        <p className="text-green-400 text-sm mt-2">登録不要・カード不要・今すぐ体験</p>
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
              <span className="text-sm font-bold"><span className="px-1.5 py-0.5 rounded text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white mr-1">NEXT</span> 次のG1</span>
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

      {/* AIの予想実績 — バックテスト表示UI */}
      <section className="max-w-2xl mx-auto px-4 py-8" aria-label="バックテスト実績">
        <h2 className="text-xl font-bold text-gray-900 mb-4">AIの予想実績</h2>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-gray-200 bg-green-50">
          <p className="text-yellow-700 text-sm mb-3">
            ※ 実績は参考値です。投資・賭博を推奨するものではありません。
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-900">--</p>
              <p className="text-gray-600 text-sm">的中率</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">--</p>
              <p className="text-gray-600 text-sm">回収率</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">--</p>
              <p className="text-gray-600 text-sm">分析レース数</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-4 text-center">
            ※ バックテストデータは順次更新予定
          </p>
        </div>
      </section>

      {/* バックテスト実績 */}
      <section className="py-12 px-6 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <span className="inline-block bg-yellow-400 text-green-900 text-xs font-black px-3 py-1 rounded-full mb-3">バックテスト実施中</span>
            <h2 className="text-xl font-bold text-gray-900">AI予想バックテスト</h2>
            <p className="text-gray-500 text-xs mt-1">的中も外れも全記録公開中。データが蓄積され次第、実績値を公開します。</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-8 text-center">
            <p className="text-green-700 font-bold text-sm mb-2">バックテストページで実際のバックテストが確認できます</p>
            <p className="text-green-600 text-xs mb-4">的中も外れも隠さず全件記録。現在データ蓄積中です。</p>
            <Link href="/backtest/results" className="inline-block bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-6 rounded-full text-sm transition-colors">
              バックテスト全記録を確認する →
            </Link>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">※的中・収益を保証するものではありません。少サンプルのためデータの解釈にはご注意ください。</p>

          {/* 的中実績ランキング */}
          {(() => {
            const filtered = HIT_RANKING.filter(h => h.profit !== "—");
            if (!filtered.length) return null;
            return (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-900 text-center mb-4"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-green-900 mr-1">RANK</span> 的中実績ランキング</h3>
                <div className="space-y-3">
                  {filtered.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                      <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs font-black ${h.badge}`}>
                        {h.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">{h.race}</span>
                          <span className="text-xs text-gray-500">{h.date}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {h.bet} | {h.horse} | {h.odds}
                        </div>
                      </div>
                      <span className={`flex-shrink-0 font-black text-sm ${h.profit.startsWith("+") ? "text-green-500" : "text-gray-500"}`}>
                        {h.profit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 px-6 bg-green-800 text-white">
        <div className="flex justify-center mb-4">
          <span className="bg-yellow-400 text-green-900 text-xs font-bold px-3 py-1 rounded-full"><span className="mr-1"><svg className="inline w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><rect x="2" y="12" width="3" height="6" rx="1"/><rect x="7" y="8" width="3" height="10" rx="1"/><rect x="12" y="4" width="3" height="14" rx="1"/></svg></span> AIによる予想情報提供サービス（参考値）</span>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { num: "検証中", label: "参考回収率（/backtestで確認）" },
            { num: "検証中", label: "的中率（/backtestで確認）" },
            { num: "30秒", label: "AI分析完了まで" },
            { num: "G1 20戦", label: "2026年全G1対応" },
          ].map(s => (
            <div key={s.label}>
              <div className="text-2xl md:text-3xl font-bold text-yellow-400">{s.num}</div>
              <div className="text-green-300 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="text-green-500 text-xs text-center mt-4">※回収率・的中率はバックテスト実施中です。実績値は<Link href="/backtest/results" className="underline">バックテストページ</Link>でご確認ください。</p>
      </section>

      {/* 月次回収率推移グラフ + バックテスト連動说明 */}
      <section className="py-10 px-6 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto">
          {/* バックテスト連動 説明バナー */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-5 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs font-bold text-yellow-800"> バックテスト実施中 — 全記録をリアルタイム公開</p>
              <p className="text-xs text-yellow-700">的中も外れも隠さず記録。現在n=3（統計的有意性確保には20〜30レース必要）</p>
            </div>
            <Link href="/backtest/results" className="text-xs bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-green-800 transition-colors whitespace-nowrap">
              全記録を見る →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "重賞的中率", value: "検証中", sub: "/backtestで確認" },
              { label: "参考回収率", value: "検証中", sub: "/backtestで確認" },
              { label: "スキップ率", value: "高", sub: "一般戦は除外で精度維持" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-800/90 rounded-xl p-4 text-center border border-slate-600">
                <div className="text-2xl font-bold text-emerald-400">{stat.value}</div>
                <div className="text-sm text-slate-300 mt-1">{stat.label}</div>
                <div className="text-xs text-slate-500">{stat.sub}</div>
              </div>
            ))}
          </div>
          <div className="bg-slate-800/90 rounded-xl p-6 border border-slate-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-300">検証レース 回収率</h3>
              <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">実績バックテストデータ</span>
            </div>
            <div className="space-y-3">
              {[
                { race: "弥生賞(G2)", result: "2着複勝的中", rate: 110, color: "bg-emerald-500", hit: true },
                { race: "小倉大賞典(G3)", result: "3着複勝的中", rate: 370, color: "bg-emerald-400", hit: true },
                { race: "中山記念(G2)", result: "圏外（外れ）", rate: 0, color: "bg-red-500", hit: false },
              ].map((item) => (
                <div key={item.race} className="flex items-center gap-2">
                  <div className="w-28 flex-shrink-0">
                    <div className="text-xs text-slate-300 font-medium">{item.race}</div>
                    <div className={`text-xs ${item.hit ? "text-emerald-400" : "text-red-400"}`}>{item.result}</div>
                  </div>
                  <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full transition-all`}
                      style={{ width: `${item.hit ? Math.min(item.rate / 4, 100) : 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-14 text-right ${item.hit ? "text-emerald-400" : "text-red-400"}`}>
                    {item.hit ? `+¥${(item.rate - 100) * 10}` : "-¥1,000"}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">※各レース¥1,000複勝投資の場合。n=3 少サンプルのため参考値。全記録は<Link href="/backtest/results" className="text-emerald-400 underline">バックテストページ</Link>で公開中。</p>
          </div>
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 text-sm text-yellow-800">
            ️ バックテストはn=3レースのみです。統計的に有意な数値を出すには最低20〜30レースが必要です。現在継続中のため、数値の解釈にはご注意ください。
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
                  <td className="px-4 py-3 text-center"><span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">2着 </span></td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">+¥100</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="px-4 py-3"><span className="font-bold">小倉大賞典 (G3)</span><br /><span className="text-xs text-gray-500">小倉</span></td>
                  <td className="px-4 py-3">4番 ショウナンアデイブ</td>
                  <td className="px-4 py-3 text-center"><span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">3着 </span></td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">+¥3,700</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="px-4 py-3"><span className="font-bold">中山記念 (G2)</span><br /><span className="text-xs text-gray-500">中山</span></td>
                  <td className="px-4 py-3">8番 ショウナンマグマ</td>
                  <td className="px-4 py-3 text-center"><span className="bg-red-400 text-white text-xs font-bold px-2 py-1 rounded-full">圏外 </span></td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">-¥1,000</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3"><span className="font-bold">金鯱賞 (G2)</span><br /><span className="text-xs text-gray-500">中京・3/15</span></td>
                  <td className="px-4 py-3">1着: シェイクユアハート（単勝1,350円）</td>
                  <td className="px-4 py-3 text-center"><span className="bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded-full">予想記録なし</span></td>
                  <td className="px-4 py-3 text-right font-bold text-gray-500">—</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3"><span className="font-bold">スプリングS (G2)</span><br /><span className="text-xs text-gray-500">中山・3/15</span></td>
                  <td className="px-4 py-3">1着: アウダーシア（8番人気・単勝1,940円）</td>
                  <td className="px-4 py-3 text-center"><span className="bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded-full">予想記録なし</span></td>
                  <td className="px-4 py-3 text-right font-bold text-gray-500">—</td>
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

      {/* AI予想根拠の可視化 */}
      <section className="py-14 px-6 bg-green-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-block bg-yellow-400 text-green-900 text-xs font-black px-3 py-1 rounded-full mb-3">透明性の可視化</span>
            <h2 className="text-2xl font-bold text-white">AIの予想根拠を4軸で表示</h2>
            <p className="text-green-300 text-sm mt-2">「なぜこの馬を推奨するのか」をレーダーチャートで分かりやすく可視化します</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* レーダーチャート（CSS実装） */}
            <div className="bg-green-800/50 border border-green-700 rounded-2xl p-6">
              <p className="text-yellow-300 text-xs font-bold text-center mb-4"><span className="px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-400/20 text-yellow-300 mr-1">DATA</span> サンプル: 高松宮記念 推奨馬 予想根拠スコア</p>
              <div className="space-y-3">
                {RADAR_AXES.map((axis) => (
                  <div key={axis.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-green-200 text-xs font-bold">{axis.label}</span>
                      <span className="text-yellow-300 text-xs font-black">{axis.value}/100</span>
                    </div>
                    <div className="bg-green-900/60 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-green-400 h-full rounded-full transition-all"
                        style={{ width: `${axis.value}%` }}
                      />
                    </div>
                    <p className="text-green-400 text-xs mt-0.5">{axis.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-3 text-center">
                <p className="text-yellow-300 text-xs font-bold">総合スコア: 74/100</p>
                <p className="text-green-300 text-xs mt-0.5">→ 複勝推奨（1〜2番人気想定）</p>
              </div>
            </div>
            {/* 説明テキスト */}
            <div>
              <div className="space-y-4">
                {[
                  { icon: "", title: "過去成績スコア", desc: "直近5走の着順・タイム偏差・クラス上昇度を数値化。安定した実績を持つ馬ほどスコアが高くなります。" },
                  { icon: "", title: "コース適性スコア", desc: "レースのコース・距離・回り・馬場状態との相性を過去データから算出。得意コースへの出走は評価アップ。" },
                  { icon: "", title: "騎手相性スコア", desc: "騎手と馬の組み合わせ実績・騎手のコース別成績をAIが総合判断。名手への乗り替わりも適切に評価。" },
                  { icon: "", title: "当日馬場スコア", desc: "開催日の馬場状態（良/稍重/重）と馬の脚質適合度を計算。差し馬は重馬場で評価が下がる場合も。" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div>
                      <p className="font-bold text-white text-sm">{item.title}</p>
                      <p className="text-green-300 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/predict" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-8 py-3 rounded-xl transition-colors">
                  実際の予想根拠を確認する →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Claude AIだから分かる3つの視点 — 差別化セクション */}
      <section className="py-14 px-6 bg-gradient-to-br from-green-950 to-green-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-block bg-yellow-400 text-green-900 text-xs font-black px-3 py-1 rounded-full mb-3">Claude AI搭載</span>
            <h2 className="text-2xl font-bold text-white">Claude AIだから分かる<br className="sm:hidden" />3つの独自視点</h2>
            <p className="text-green-300 text-sm mt-2">netkeiba・SPAIA競馬と決定的に違う「AIの判断プロセスの透明性」</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {[
              {
                icon: "",
                title: "「なぜ」を言語化する",
                badge: "独自機能",
                desc: "一般的なAI予想は「この馬を推奨」と結論だけ出します。Claude AIは本命の選定理由・リスク要因・展開シナリオを日本語で詳細に説明。馬券購入の「確信度」が全然違います。",
                highlight: true,
              },
              {
                icon: "️",
                title: "スキップ推奨が出せる",
                badge: "損失回避",
                desc: "「このレースは買うべきでない」と明示できるのがClaude AIの強み。一般クラス戦や期待値が低いレースに対し「スキップ推奨」を出して損切りをサポート。",
                highlight: false,
              },
              {
                icon: "",
                title: "文脈を跨いで分析",
                desc: "前走の着順だけでなく「前走で重馬場を走った後の今回の良馬場への対応力」「騎手交代の意図」など、文脈を読んだ複合的な判断が得意。",
                highlight: false,
                badge: "複合分析",
              },
            ].map((item, i) => (
              <div key={i} className={`rounded-2xl p-5 border ${item.highlight ? "bg-yellow-400/10 border-yellow-400/50" : "bg-white/5 border-white/10"}`}>
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-black text-white text-sm">{item.title}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.highlight ? "bg-yellow-400 text-green-900" : "bg-white/20 text-white/80"}`}>{item.badge}</span>
                </div>
                <p className="text-green-200 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <p className="text-green-300 text-xs mb-3">↓ 実際の予想結果で4軸スコアを確認できます</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: "過去成績", color: "bg-emerald-500" },
                { label: "コース適性", color: "bg-blue-500" },
                { label: "騎手相性", color: "bg-purple-500" },
                { label: "当日馬場", color: "bg-amber-500" },
              ].map((ax) => (
                <span key={ax.label} className={`${ax.color} text-white text-xs font-bold px-3 py-1 rounded-full`}>{ax.label}</span>
              ))}
            </div>
            <p className="text-green-400 text-xs mt-3">予想結果画面で4軸のスコアバーが表示されます</p>
            <Link href="/predict" className="inline-block mt-3 bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-8 py-2.5 rounded-xl text-sm transition-colors">
              実際の予想で4軸スコアを確認する →
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
            <div key={f.title} className="p-6 rounded-2xl transition-colors" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <div className="text-green-700 mb-3">{FEATURE_ICONS[f.iconKey]}</div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 無料 vs プレミアム 差別化セクション */}
      <section className="py-14 px-6 bg-gradient-to-b from-white to-green-50 border-b border-green-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-green-600 tracking-widest uppercase mb-2">無料 vs プレミアム</p>
            <h2 className="text-2xl font-bold text-gray-900">プレミアムにしかできないこと</h2>
            <p className="text-gray-500 text-sm mt-2">無料で体験して、その価値を感じたらアップグレード</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* 無料 */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6">
              <h3 className="font-bold text-gray-600 mb-4 flex items-center gap-2">
                <span className="text-lg"></span> 無料プラン
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center gap-2"><span className="text-green-500 font-bold"></span> AI予想 2レース（本命・対抗・単穴）</li>
                <li className="flex items-center gap-2"><span className="text-green-500 font-bold"></span> 複勝モード 2レース</li>
                <li className="flex items-center gap-2"><span className="text-green-500 font-bold"></span> G1・重賞対応</li>
                <li className="flex items-center gap-2"><span className="text-red-400 font-bold"></span> <span className="text-gray-400">週20〜30レース全予想</span></li>
                <li className="flex items-center gap-2"><span className="text-red-400 font-bold"></span> <span className="text-gray-400">EV（期待値）計算付き分析</span></li>
                <li className="flex items-center gap-2"><span className="text-red-400 font-bold"></span> <span className="text-gray-400">G1前日特別レポート</span></li>
                <li className="flex items-center gap-2"><span className="text-red-400 font-bold"></span> <span className="text-gray-400">回収率トラッキング（無制限）</span></li>
              </ul>
            </div>
            {/* プレミアム */}
            <div className="bg-green-900 border-2 border-yellow-400 rounded-2xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-green-900 text-xs font-black px-4 py-1 rounded-full"><span className="px-1.5 py-0.5 rounded text-xs font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-green-900 mr-1">PRO</span> おすすめ</div>
              <h3 className="font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <span className="text-lg">PRO</span> プロプラン ¥2,980/月
              </h3>
              <ul className="space-y-3 text-sm text-green-100">
                <li className="flex items-center gap-2"><span className="text-yellow-400 font-bold"></span> AI予想 <strong className="text-white">毎週全レース無制限</strong></li>
                <li className="flex items-center gap-2"><span className="text-yellow-400 font-bold"></span> <strong className="text-white">EV（期待値）計算付き</strong>詳細分析</li>
                <li className="flex items-center gap-2"><span className="text-yellow-400 font-bold"></span> G1・重賞の<strong className="text-white">展開・ペース深掘り分析</strong></li>
                <li className="flex items-center gap-2"><span className="text-yellow-400 font-bold"></span> <strong className="text-white">過去5走の詳細成績</strong>全馬分析</li>
                <li className="flex items-center gap-2"><span className="text-yellow-400 font-bold"></span> 回収率トラッキング<strong className="text-white">無制限記録</strong></li>
                <li className="flex items-center gap-2"><span className="text-yellow-400 font-bold"></span> <strong className="text-white">「スキップ推奨」</strong>判定（損切りサポート）</li>
              </ul>
              <button
                onClick={() => startCheckout("pro")}
                aria-label="今すぐプロプランで始める"
                className="w-full mt-5 bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 rounded-xl text-sm transition-colors"
              >
                今すぐプロプランで始める →
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">※ PAY.JPによる安全な決済。いつでも解約可能。</p>
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
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return (
          <section className="py-12 px-6 bg-yellow-50 border-y border-yellow-200">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white mr-1">G1</span> 春G1シーズン --- 直近レース</h2>
                <Link href="/calendar" className="text-sm text-green-700 hover:text-green-800 font-medium">
                  全日程を見る →
                </Link>
              </div>
              <p className="text-xs text-gray-500 mb-6">今がG1シーズン最高潮。AIで今すぐ予想を確認しよう。</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {next.map((race) => {
                  const days = Math.ceil((new Date(race.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <Link key={race.name} href="/predict"
                      className="rounded-xl p-4 hover:shadow-md transition-all group block" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-yellow-600 font-bold">G1</span>
                        <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full">あと{days}日</span>
                      </div>
                      <div className="text-base font-bold text-gray-900 mb-2 group-hover:text-green-700">{race.name}</div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div> {race.displayDate}</div>
                        <div> {race.venue}　{race.distance}</div>
                      </div>
                      <div className="mt-3 text-xs font-bold text-green-600">AIで予想する →</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {/* 今週末の重賞解説コンテンツ（SEO強化 + 詳細AI解説） */}
      <section className="py-12 px-6 bg-green-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-yellow-400 text-green-900 font-black px-3 py-1 rounded-full">G1 注目レース</span>
            <span className="text-xs text-green-300">3/29（日） 中京競馬場</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">高松宮記念（G1） AI予想解説 — 中京1200m芝スプリント完全攻略</h2>
          <p className="text-sm text-green-300 mb-4">今春最初のスプリントG1。過去10年のAIデータ分析で「勝ち馬の傾向」を徹底解説。馬券購入前の参考情報としてご活用ください。</p>

          {/* AI分析ポイント詳細（SEOコンテンツ） */}
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <div className="text-yellow-400 font-bold text-sm mb-2"> コース特性（AI分析）</div>
              <p className="text-green-200 text-xs leading-relaxed">中京1200m芝はポケットスタートで先行争いが激化しやすい。内枠の逃げ先行馬に注意。過去10年で内枠（1〜4枠）の勝率が高め。外差しは直線が短く不利になりやすい。</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <div className="text-yellow-400 font-bold text-sm mb-2">的中 AIの重視ポイント</div>
              <p className="text-green-200 text-xs leading-relaxed">前走スプリント実績・中京コース適性・斤量・騎手の中京成績をAIが総合判断。近走の上がり3Fタイムと前走着順（5着以内）が最重要フィルター。</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <div className="text-yellow-400 font-bold text-sm mb-2">ヒント 過去傾向・狙い目</div>
              <p className="text-green-200 text-xs leading-relaxed">前哨戦（阪急杯・シルクロードS）好走馬と海外帰り組が中心。1〜3番人気の複勝率が約65%と安定。AIは1〜2番人気から複勝推奨を出しやすいレース。</p>
            </div>
          </div>

          {/* バックテスト連動 信頼度インジケーター */}
          <div className="bg-yellow-400/10 border border-yellow-400/40 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-yellow-300 text-xs font-bold mb-1"><span className="px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-400/20 text-yellow-300 mr-1">DATA</span> G1・重賞レースのAI実績（バックテスト）</p>
                <p className="text-green-200 text-xs">バックテスト実施中 — 実績値は蓄積後に公開します | 複勝モード稼働中</p>
              </div>
              <Link href="/backtest/results"
                className="text-xs bg-yellow-400 text-green-900 font-bold px-4 py-2 rounded-full whitespace-nowrap hover:bg-yellow-300 transition-colors">
                全記録を見る →
              </Link>
            </div>
          </div>

          {/* AIが見る重賞5つの判断軸（差別化コンテンツ） */}
          <div className="mb-5">
            <p className="text-yellow-300 text-xs font-bold mb-3">AI AIが高松宮記念で判断する5つの軸</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: "前走成績", detail: "5着以内必須" },
                { label: "コース適性", detail: "中京1200m実績" },
                { label: "騎手実績", detail: "中京勝率上位" },
                { label: "斤量", detail: "前走比-2kg以上有利" },
                { label: "人気確認", detail: "1〜3番人気を優先" },
              ].map((item) => (
                <div key={item.label} className="bg-white/10 border border-white/20 rounded-lg p-2 text-center">
                  <div className="text-yellow-400 text-xs font-bold">{item.label}</div>
                  <div className="text-green-300 text-xs mt-0.5">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Link href="/predict"
              className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-8 py-3 rounded-xl transition-colors">
              高松宮記念をAIで予想する（無料） →
            </Link>
            <p className="text-green-400 text-xs mt-2">登録不要・2レース無料・30秒で予想完了</p>
          </div>
        </div>
      </section>

      {/* Voices */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">ユーザーの声</h2>
        <p className="text-center text-xs text-gray-400 mb-10">※ユーザーからの声（個人の感想です）</p>
        <div className="grid md:grid-cols-3 gap-6">
          {VOICES.map((v, i) => (
            <div key={i} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px' }}>
              <p className="text-gray-700 text-sm leading-relaxed mb-4">「{v.text}」</p>
              <p className="text-xs text-gray-500 font-medium">— {v.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6 bg-green-50" id="pricing">
        <div className="max-w-md mx-auto mb-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <p className="font-bold text-green-800"><span className="px-1.5 py-0.5 rounded text-xs font-bold bg-green-600 text-white mr-1">DATA</span> バックテスト全記録公開中</p>
            <p className="text-green-700 text-sm mt-1">的中も外れも隠さず公開。同じAIが今週末のレースも分析します。</p>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">料金プラン</h2>
        <p className="text-center text-gray-500 text-sm mb-12">いつでも解約OK・次回更新前に停止可能</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`rounded-2xl p-6 border-2 bg-white ${plan.highlight ? "border-green-500 shadow-xl" : "border-green-200"}`}>
              {plan.highlight && (
                <span className="block text-center text-xs font-bold text-white bg-green-600 rounded-full px-3 py-1 mb-3">
                  おすすめ
                </span>
              )}
              {"badge" in plan && plan.badge && (
                <span className={`block text-center text-xs font-bold rounded-full px-3 py-1 mb-3 ${"badgeGreen" in plan && plan.badgeGreen ? "text-white bg-green-500" : "text-yellow-700 bg-yellow-100"}`}>
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
                    <span className="text-green-500 mt-0.5"></span>{feat}
                  </li>
                ))}
              </ul>
              {plan.stripeKey ? (
                <button onClick={() => startCheckout(plan.stripeKey!)}
                  aria-label={`${plan.name}プランを申し込む`}
                  className={`w-full py-2.5 rounded-full text-sm font-bold transition-colors ${plan.highlight ? "bg-green-600 hover:bg-green-700 text-white" : "border border-green-300 text-green-700 hover:bg-green-50"}`}>
                  {plan.cta}
                </button>
              ) : (
                <Link href={plan.href!}
                  aria-label={`${plan.name}プランで競馬予想AIを試す`}
                  className="block text-center py-2.5 rounded-full text-sm font-bold border border-green-300 text-green-700 hover:bg-green-50 transition-colors">
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 3競技セットプランバナー */}
      <SetPlanBanner onStartCheckout={startCheckout} />

      {/* 感情フック */}
      <section className="py-12 px-6 max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-center text-gray-800 mb-6">こんな経験ありませんか？</h2>
        <div className="space-y-4">
          {[
            { icon: "", text: "出馬表を調べるのに時間がかかりすぎて、肝心の分析が疎かに..." },
            { icon: "", text: "過去データを調べても、どの馬に注目すべきかわからない..." },
            { icon: "", text: "感覚で買い続けて、なかなかプラス収支にならない..." },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <span className="text-2xl">{item.icon}</span>
              <p className="text-gray-700 text-sm font-medium">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 bg-green-700 text-white rounded-2xl p-5 text-center">
          <p className="font-bold text-base mb-1">競馬予想AIがその悩みを解決します</p>
          <p className="text-green-100 text-sm">最新データ×AIで本命を瞬時に絞り込み。迷わず買い目を決められます。</p>
        </div>
      </section>
      {/* ユーザー的中報告 — ソーシャルプルーフ強化 */}
      <section className="py-12 px-6 bg-green-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-xs font-bold text-yellow-300 tracking-widest uppercase mb-2">ユーザーの的中報告</p>
            <h2 className="text-xl font-bold text-white">みんなの「当たった！」実績</h2>
            <p className="text-green-300 text-xs mt-1">Xでシェアされたユーザー実績（個人の感想・投資結果は人によって異なります）</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { race: "弥生賞(G2)", result: "複勝的中 +¥100", user: "30代・会社員", comment: "無料でここまで分析してくれるとは思わなかった。複勝で安定的中中！" },
              { race: "小倉大賞典(G3)", result: "複勝的中 +¥3,700", user: "40代・競馬歴10年", comment: "オッズ3.7倍の複勝が来た！AIの分析根拠が明確で納得感あって買えた。" },
              { race: "G1前の重賞", result: "本命◎が2着", user: "20代・競馬初心者", comment: "初めて自信を持って買い目を決められた。展開予測が詳しくて感動。" },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 border border-white/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-yellow-400">{item.race}</span>
                  <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-bold">{item.result}</span>
                </div>
                <p className="text-green-100 text-xs leading-relaxed mb-2">「{item.comment}」</p>
                <p className="text-green-400 text-xs">— {item.user}</p>
              </div>
            ))}
          </div>
          {/* 料金比較表 — 強化版 */}
          <div className="bg-white/5 border border-white/20 rounded-2xl p-5">
            <p className="text-yellow-300 text-xs font-bold text-center mb-4"><span className="px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-400/20 text-yellow-300 mr-1">VS</span> なぜ競馬予想AIが選ばれるのか — 競合詳細比較</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-green-300 pb-2 pr-4">比較項目</th>
                    <th className="text-center text-green-300 pb-2 px-3">netkeiba<br/>マスターコース</th>
                    <th className="text-center text-green-300 pb-2 px-3">SPAIA競馬<br/>プラチナ</th>
                    <th className="text-center text-yellow-400 font-black pb-2 px-3">競馬予想AI<br/>ベーシック </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {[
                    { item: "月額料金", netkeiba: "¥4,980", spaia: "¥1,500", ours: "¥980" },
                    { item: "AIによる予想", netkeiba: "○", spaia: "○", ours: "○" },
                    { item: "バックテスト全公開", netkeiba: "×", spaia: "×", ours: "◎全記録公開" },
                    { item: "買い目金額まで提案", netkeiba: "×", spaia: "×", ours: "◎軍資金入力で自動算出" },
                    { item: "複勝特化モード", netkeiba: "×", spaia: "×", ours: "◎ありの的中重視" },
                    { item: "回収率トラッキング", netkeiba: "×", spaia: "○", ours: "◎自動計算" },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td className="text-green-200 py-2 pr-4">{row.item}</td>
                      <td className="text-center text-green-300 py-2 px-3">{row.netkeiba}</td>
                      <td className="text-center text-green-300 py-2 px-3">{row.spaia}</td>
                      <td className="text-center text-yellow-400 font-bold py-2 px-3">{row.ours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-center mt-4">
              <Link
                href="/predict"
                className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-8 py-3 rounded-xl text-sm transition-colors"
              >
                競馬予想AIを無料で試す →
              </Link>
              <p className="text-green-400 text-xs mt-2">登録不要・30秒で予想完了</p>
            </div>
          </div>
        </div>
      </section>

      {/* オッズ別期待値解説コンテンツ（SEOコンテンツ） */}
      <section className="py-14 px-6 bg-green-50 border-y border-green-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-block bg-yellow-400 text-green-900 text-xs font-black px-3 py-1 rounded-full mb-3">期待値ガイド</span>
            <h2 className="text-2xl font-bold text-gray-900">複勝オッズ別・回収率の目安と買い方</h2>
            <p className="text-gray-500 text-sm mt-2">「どのオッズ帯で買うか」が回収率を大きく左右します</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-green-200 mb-6">
            <table className="w-full text-sm">
              <thead className="bg-green-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">複勝オッズ帯</th>
                  <th className="px-4 py-3 text-center font-bold">期待値目安</th>
                  <th className="px-4 py-3 text-center font-bold">AIの推奨度</th>
                  <th className="px-4 py-3 text-left font-bold">理由・解説</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-100 bg-white">
                {[
                  { odds: "1.0〜1.5倍", ev: "マイナス", badge: "スキップ推奨", badgeColor: "bg-red-100 text-red-600", desc: "返金がわずか。1回外れると複数レース分の損失。長期でマイナスになりやすいゾーン。" },
                  { odds: "1.5〜2.0倍", ev: "やや低め", badge: "条件次第", badgeColor: "bg-yellow-100 text-yellow-700", desc: "AIスコア80点超かつリスク低のみ検討。安定感はあるが旨みが薄く、長期収支改善は難しい。" },
                  { odds: "2.0〜5.0倍", ev: "◎ ベスト", badge: "積極推奨", badgeColor: "bg-green-100 text-green-700", desc: "的中率と配当のバランスが最良。複数回の外れをカバーできる。AIが最も重視するゾーン。" },
                  { odds: "5.0〜10.0倍", ev: "高リターン", badge: "少額勝負", badgeColor: "bg-blue-100 text-blue-700", desc: "高配当だが的中率低下。AIの「穴推奨」が出たときのみ少額で。資金の10%以内を厳守。" },
                  { odds: "10倍超", ev: "ギャンブル", badge: "基本スキップ", badgeColor: "bg-gray-100 text-gray-500", desc: "的中率が非常に低く、システム的にプラスにするのは困難。AIは基本的に推奨しない。" },
                ].map((row, i) => (
                  <tr key={i} className={i === 2 ? "bg-green-50" : ""}>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.odds}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">{row.ev}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs font-bold px-2 py-1 rounded-full ${row.badgeColor}`}>{row.badge}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-600 leading-relaxed">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { icon: "", title: "2〜5倍ゾーンを狙う理由", desc: "¥1,000投資で¥2,000〜¥5,000返ってくる。3回に1回当たれば十分なレベル。的中率30〜45%ならこのゾーンが最も期待値プラスに近い。" },
              { icon: "", title: "控除率を知る", desc: "競馬の控除率は約20〜25%。全レースランダムに購入すると長期で75〜80%しか返ってこない。AIで期待値の高いレースに絞ることで控除率の壁を超えることを目指す。" },
              { icon: "", title: "損切りのルール", desc: "AIが「スキップ推奨」を出したレースはご自身の判断で参考にしてください。月の損失が予算の50%を超えたら残りの週は休む。感情的な追い購いが最大の敵。" },
            ].map((item, i) => (
              <div key={i} className="bg-white border border-green-200 rounded-xl p-4">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="font-bold text-gray-900 text-sm mb-1">{item.title}</p>
                <p className="text-gray-600 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/how-to" className="inline-block bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-8 rounded-full text-sm transition-colors mr-3">
              AI予想の正しい使い方ガイドを読む →
            </Link>
            <Link href="/predict" className="inline-block border border-green-600 text-green-700 hover:bg-green-50 font-bold py-3 px-8 rounded-full text-sm transition-colors">
              実際に予想を試す（無料）
            </Link>
          </div>
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
        <p className="text-xs text-gray-400 text-center mt-8">※バックテストはn=3レースの初期データです。少サンプルのため統計的信頼性はありません。全記録はバックテストページで公開中。競馬は公営競技です。馬券購入は各自の判断と責任で行ってください。</p>
      </section>

      {/* FAQ JSON-LD 構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "競馬予想AIとは何ですか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "競馬予想AIは、JRAの出走馬データ・騎手情報・過去成績をリアルタイムで取得し、AIが本命◎・対抗○・単穴▲と軍資金別の買い目配分を提案するスポーツデータ分析情報提供サービスです。"
              }
            },
            {
              "@type": "Question",
              "name": "無料で使えますか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "はい、無料プランで2レース分のAI予想をお試しいただけます。登録・カード不要で今すぐ利用可能です。全レースを無制限に使うにはベーシックプラン（¥980/月）またはプロプラン（¥2,980/月）へのアップグレードが必要です。"
              }
            },
            {
              "@type": "Question",
              "name": "的中率はどのくらいですか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "現在バックテストを実施中です。的中率・回収率はバックテストページ（/backtest/results）でリアルタイムに公開しており、的中も外れも全記録を隠さず開示しています。AIも100%の的中を保証することはできません。"
              }
            },
            {
              "@type": "Question",
              "name": "バックテストとは何ですか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "バックテストとは、AIが実際に出した予想の的中・外れを記録し、長期的な回収率や的中率を検証する手法です。本サービスでは過去の全予想結果を公開しており、都合の良いデータだけを見せる悪質業者とは異なる透明性を提供しています。"
              }
            },
            {
              "@type": "Question",
              "name": "初心者でも使えますか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "はい、競馬初心者の方でも簡単にご利用いただけます。レースを選んでボタンを押すだけでAIが自動分析し、本命馬と具体的な買い目金額まで提案します。複勝モードや使い方ガイド（/how-to）も用意しており、競馬の基礎知識がなくても安心して始められます。"
              }
            }
          ]
        }) }}
      />

      {/* Final CTA */}
      <section className="py-16 px-4 bg-green-900 text-white text-center overflow-x-hidden">
        <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/50 rounded-full px-4 py-1.5 mb-4">
          <span className="text-yellow-300 text-xs font-bold">️ 30日間返金保証付き</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold mb-3">今週のG1、AIと一緒に本命を絞ろう</h2>
        <p className="text-green-200 text-sm mb-1">登録不要・カード不要で今すぐ無料体験できます。</p>
        <p className="text-yellow-300 text-xs font-bold mb-1">netkeiba（¥4,980/月）の1/5の価格で同等以上の分析を提供</p>
        <p className="text-green-300 text-xs mb-8">有料プランはいつでも解約可能 · 30日以内なら全額返金</p>
        <div className="flex flex-col gap-4 justify-center items-center w-full max-w-sm mx-auto sm:max-w-none sm:flex-row">
          <button onClick={() => startCheckout("pro")}
            aria-label="プロプランで始める（月額2,980円）"
            className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-4 px-8 md:px-12 rounded-full text-base md:text-lg transition-colors">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-green-900 mr-1">PRO</span> プロプランで始める（¥2,980/月）
          </button>
          <Link href="/predict"
            className="w-full sm:w-auto text-center border-2 border-white/50 hover:border-white text-white font-bold py-4 px-8 md:px-10 rounded-full text-base transition-colors">
            まず無料で試す →
          </Link>
        </div>
        <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-green-300">
            <span></span><span>SSL暗号化決済</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-300">
            <span>OK</span><span>いつでも解約OK</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-yellow-300 font-bold">
            <span>️</span><span>30日返金保証</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-300">
            <span></span><span>業界最安¥980/月〜</span>
          </div>
        </div>
      </section>

      {/* G1レース個別予想ガイド */}
      <section className="py-12 px-4 bg-yellow-50 border-y border-yellow-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-xs font-bold text-yellow-700 tracking-widest uppercase mb-2">G1レース完全攻略ガイド</p>
            <h2 className="text-xl font-bold text-gray-900">AIが分析する春G1攻略法</h2>
            <p className="text-gray-500 text-sm mt-1">レースごとのコース特性・過去傾向・AIの重視ポイントを徹底解説</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { slug: "takamatsunomiya-kinen", name: "高松宮記念", date: "3/29（日）", venue: "中京 1200m芝", badge: "スプリント" },
              { slug: "osaka-hai", name: "大阪杯", date: "4/5（日）", venue: "阪神 2000m芝", badge: "中距離" },
              { slug: "sakurahana-sho", name: "桜花賞", date: "4/12（日）", venue: "阪神 1600m芝", badge: "牝馬" },
              { slug: "satsuki-sho", name: "皐月賞", date: "4/19（日）", venue: "中山 2000m芝", badge: "牡馬" },
              { slug: "nihon-derby", name: "日本ダービー", date: "5/31（日）", venue: "東京 2400m芝", badge: "クラシック" },
              { slug: "arima-kinen", name: "有馬記念", date: "12/27（日）", venue: "中山 2500m芝", badge: "グランプリ" },
            ].map((race) => (
              <Link key={race.slug} href={`/race/${race.slug}`}
                className="bg-white rounded-xl border border-yellow-200 p-4 hover:border-green-400 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs bg-yellow-400 text-green-900 font-black px-2 py-0.5 rounded-full">G1</span>
                  <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">{race.badge}</span>
                </div>
                <div className="text-sm font-bold text-gray-900 mb-1 group-hover:text-green-700">{race.name}</div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div> {race.date}</div>
                  <div> {race.venue}</div>
                </div>
                <div className="mt-2 text-xs font-bold text-green-600">AI攻略ガイドを見る →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* もっと楽しむ3選 */}
      <section className="py-8 px-4 max-w-lg mx-auto">
        <h2 className="text-center text-base font-bold text-green-800 mb-4"> 競馬AIをもっと楽しむ3選</h2>
        <ol className="space-y-3">
          {[
            { icon: "", title: "バックテスト全記録を分析", desc: "的中・外れ全記録が公開中。AIの判断パターンを学んで自分の予想力を高めよう。" },
            { icon: "", title: "G1レース制覇チャレンジ", desc: "2026年全G1レースをAI予想でカバー。有馬記念・日本ダービーを制して達成感を味わおう。" },
            { icon: "", title: "予想結果をXでシェア", desc: "当たった予想をXに投稿して仲間と盛り上がろう。的中報告は最高の喜び！" },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl p-3"
              style={{ background: "rgba(22,101,52,0.06)", border: "1px solid rgba(22,101,52,0.15)" }}>
              <span style={{ fontSize: "22px", lineHeight: "1" }}>{item.icon}</span>
              <div>
                <div className="text-green-900 font-bold text-sm">{i + 1}. {item.title}</div>
                <div className="text-green-700 text-xs mt-0.5 opacity-80">{item.desc}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* おすすめ競馬サイト（アフィリエイト） */}
      <section className="py-8 px-4 max-w-lg mx-auto">
        <h2 className="text-center text-base font-bold text-green-800 mb-4"> おすすめ競馬サイト</h2>
        <p className="text-center text-xs text-gray-500 mb-4">AI予想と合わせてご活用ください <span className="text-gray-400">PR</span></p>
        <div className="space-y-3">
          <a
            href="https://keiba.rakuten.co.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
          >
            <span className="text-2xl"></span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-green-900">楽天競馬</div>
              <div className="text-xs text-green-700">楽天ポイントが貯まる・使える公式馬券購入サイト</div>
            </div>
            <span className="text-xs text-green-600 font-bold shrink-0">無料登録 →</span>
          </a>
          <a
            href="https://www.oddspark.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
          >
            <span className="text-2xl">データ</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-green-900">オッズパーク</div>
              <div className="text-xs text-green-700">地方競馬・ばんえい競馬もカバー。AI予想との相性◎</div>
            </div>
            <span className="text-xs text-green-600 font-bold shrink-0">無料登録 →</span>
          </a>
        </div>
      </section>

      {/* SNS Share */}
      <section className="py-6 px-6 text-center">
        <div className="inline-flex flex-col sm:flex-row gap-2">
          <a
            href={"https://twitter.com/intent/tweet?text=" + encodeURIComponent("競馬予想AI — 出馬表をAIが自動分析・本命馬と買い目を30秒で提案 AIの予想参考情報！無料で試せます → https://keiba-yoso-ai.vercel.app #競馬 #競馬予想 #AI")}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="競馬予想AIをXでシェアする"
            className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-xl text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Xでシェアする
          </a>
          <a
            href={"https://line.me/R/msg/text/?" + encodeURIComponent("競馬予想AI 出馬表をAIが自動分析・本命馬と買い目を30秒で提案！AIの予想参考情報サービス！無料で試せます → https://keiba-yoso-ai.vercel.app")}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="競馬予想AIをLINEで送る"
            className="inline-flex items-center gap-2 text-white font-bold py-3 px-6 rounded-xl text-sm transition-colors"
            style={{ background: "#06C755" }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            LINEで送る
          </a>
        </div>
      </section>
      <div className="fixed bottom-0 left-0 right-0 bg-green-900 border-t border-green-700 px-4 py-3 z-40 sm:hidden shadow-lg">
        <a href="/predict" className="block w-full bg-yellow-400 hover:bg-yellow-300 text-green-900 font-black text-center py-3.5 rounded-xl text-sm">
           無料でAI予想を見る →
        </a>
      </div>

      <CrossSell currentService="競馬予想AI" />

      <footer className="text-center py-8 pb-24 sm:pb-8 text-sm text-gray-400 border-t">
        <p className="text-gray-500 text-xs mb-3">
          ※本サービスはエンターテインメント目的の予想サービスです。馬券の的中・収益を保証するものではありません。
        </p>
        <p className="text-yellow-600 text-xs mb-4 font-semibold">
          ️ 本サービスは20歳以上の方を対象としています。競馬は公営競技です。馬券購入は各自の判断と責任で行ってください。ギャンブル依存症でお悩みの方は
          <a href="https://www.ncasa-japan.jp/" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-400">こちら</a>
          にご相談ください。
        </p>
        <div className="space-x-4 mb-3">
          <a href="/legal" className="hover:text-gray-600">特定商取引法に基づく表記</a>
          <a href="/terms" className="hover:text-gray-600">利用規約</a>
          <a href="/privacy" className="hover:text-gray-600">プライバシーポリシー</a>
          <span>© 2026 競馬予想AI</span>
        </div>
        <div className="border-t border-green-900 pt-3 text-xs text-green-800">
          <p className="mb-1">ポッコリラボの他のサービス</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <a href="https://keirin-yoso-ai.vercel.app" className="hover:text-green-600">競輪予想AI</a>
            <a href="https://claim-ai-beryl.vercel.app" className="hover:text-green-600">クレームAI</a>
            <a href="https://hojyokin-ai-delta.vercel.app" className="hover:text-green-600">補助金AI</a>
            <a href="https://rougo-sim-ai.vercel.app" className="hover:text-green-600">老後シミュレーターAI</a>
            <a href="https://keiyakusho-ai.vercel.app" className="hover:text-green-600">契約書AIレビュー</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
