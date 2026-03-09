import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "G1レースカレンダー2026【AI予想対応】｜競馬予想AI",
  description: "2026年のG1レース全25戦の日程・開催場・距離一覧。各G1レース前日にAIが予想を公開。無料で3回試せる競馬予想AIで的中率アップ。",
  openGraph: {
    title: "G1レースカレンダー2026【AI予想対応】",
    description: "2026年G1レース全日程。各G1前日にAI予想を公開。",
    locale: "ja_JP",
    type: "article",
  },
};

const g1Races2026 = [
  // Q1
  { month: "1月", date: "1/5（月）", name: "フェアリーS", grade: "G3", venue: "中山", distance: "芝1600m", status: "終了" },
  { month: "1月", date: "1/11（日）", name: "京成杯", grade: "G3", venue: "中山", distance: "芝2000m", status: "終了" },
  { month: "1月", date: "1/18（日）", name: "日経新春杯", grade: "G2", venue: "京都", distance: "芝2400m", status: "終了" },
  { month: "1月", date: "1/25（日）", name: "東海S", grade: "G2", venue: "中京", distance: "ダ1800m", status: "終了" },
  { month: "2月", date: "2/1（日）", name: "きさらぎ賞", grade: "G3", venue: "中京", distance: "芝2000m", status: "終了" },
  { month: "2月", date: "2/8（日）", name: "共同通信杯", grade: "G3", venue: "東京", distance: "芝1800m", status: "終了" },
  { month: "2月", date: "2/15（日）", name: "クイーンC", grade: "G3", venue: "東京", distance: "芝1600m", status: "終了" },
  { month: "2月", date: "2/22（日）", name: "フェブラリーS", grade: "G1", venue: "東京", distance: "ダ1600m", status: "終了" },
  { month: "3月", date: "3/8（日）", name: "弥生賞", grade: "G2", venue: "中山", distance: "芝2000m", status: "終了" },
  { month: "3月", date: "3/15（日）", name: "スプリングS", grade: "G2", venue: "中山", distance: "芝1800m", status: "今週" },
  { month: "3月", date: "3/22（日）", name: "若葉S", grade: "L", venue: "中京", distance: "芝2000m", status: "近日" },
  { month: "3月", date: "3/22（日）", name: "阪神大賞典", grade: "G2", venue: "阪神", distance: "芝3000m", status: "近日" },
  { month: "3月", date: "3/29（日）", name: "マーチS", grade: "G3", venue: "中山", distance: "ダ1800m", status: "近日" },
  // Q2
  { month: "4月", date: "4/5（日）", name: "大阪杯", grade: "G1", venue: "阪神", distance: "芝2000m", status: "近日", highlight: true },
  { month: "4月", date: "4/5（日）", name: "ニュージーランドT", grade: "G2", venue: "中山", distance: "芝1600m", status: "近日" },
  { month: "4月", date: "4/12（日）", name: "桜花賞", grade: "G1", venue: "阪神", distance: "芝1600m", status: "近日", highlight: true },
  { month: "4月", date: "4/19（日）", name: "皐月賞", grade: "G1", venue: "中山", distance: "芝2000m", status: "近日", highlight: true },
  { month: "4月", date: "4/26（日）", name: "フローラS", grade: "G2", venue: "東京", distance: "芝2000m", status: "近日" },
  { month: "5月", date: "5/3（日）", name: "天皇賞（春）", grade: "G1", venue: "京都", distance: "芝3200m", status: "予定", highlight: true },
  { month: "5月", date: "5/10（日）", name: "NHKマイルC", grade: "G1", venue: "東京", distance: "芝1600m", status: "予定", highlight: true },
  { month: "5月", date: "5/17（日）", name: "ヴィクトリアマイル", grade: "G1", venue: "東京", distance: "芝1600m", status: "予定", highlight: true },
  { month: "5月", date: "5/24（日）", name: "優駿牝馬（オークス）", grade: "G1", venue: "東京", distance: "芝2400m", status: "予定", highlight: true },
  { month: "5月", date: "5/31（日）", name: "日本ダービー", grade: "G1", venue: "東京", distance: "芝2400m", status: "予定", highlight: true },
  // Q3
  { month: "6月", date: "6/7（日）", name: "安田記念", grade: "G1", venue: "東京", distance: "芝1600m", status: "予定", highlight: true },
  { month: "6月", date: "6/14（日）", name: "エプソムC", grade: "G3", venue: "東京", distance: "芝1800m", status: "予定" },
  { month: "6月", date: "6/21（日）", name: "宝塚記念", grade: "G1", venue: "阪神", distance: "芝2200m", status: "予定", highlight: true },
  { month: "10月", date: "10/4（日）", name: "スプリンターズS", grade: "G1", venue: "中山", distance: "芝1200m", status: "予定", highlight: true },
  { month: "10月", date: "10/11（日）", name: "秋華賞", grade: "G1", venue: "京都", distance: "芝2000m", status: "予定", highlight: true },
  { month: "10月", date: "10/18（日）", name: "菊花賞", grade: "G1", venue: "京都", distance: "芝3000m", status: "予定", highlight: true },
  { month: "10月", date: "10/25（日）", name: "天皇賞（秋）", grade: "G1", venue: "東京", distance: "芝2000m", status: "予定", highlight: true },
  // Q4
  { month: "11月", date: "11/1（日）", name: "アルゼンチン共和国杯", grade: "G2", venue: "東京", distance: "芝2500m", status: "予定" },
  { month: "11月", date: "11/8（日）", name: "エリザベス女王杯", grade: "G1", venue: "京都", distance: "芝2200m", status: "予定", highlight: true },
  { month: "11月", date: "11/15（日）", name: "マイルCS", grade: "G1", venue: "阪神", distance: "芝1600m", status: "予定", highlight: true },
  { month: "11月", date: "11/22（日）", name: "ジャパンC", grade: "G1", venue: "東京", distance: "芝2400m", status: "予定", highlight: true },
  { month: "11月", date: "11/29（日）", name: "チャンピオンズC", grade: "G1", venue: "中京", distance: "ダ1800m", status: "予定", highlight: true },
  { month: "12月", date: "12/13（日）", name: "阪神JF", grade: "G1", venue: "阪神", distance: "芝1600m", status: "予定", highlight: true },
  { month: "12月", date: "12/20（日）", name: "朝日杯FS", grade: "G1", venue: "阪神", distance: "芝1600m", status: "予定", highlight: true },
  { month: "12月", date: "12/27（日）", name: "有馬記念", grade: "G1", venue: "中山", distance: "芝2500m", status: "予定", highlight: true },
];

const statusColor: Record<string, string> = {
  終了: "bg-gray-700 text-gray-400",
  今週: "bg-yellow-600 text-yellow-100",
  近日: "bg-orange-700 text-orange-100",
  予定: "bg-blue-800 text-blue-200",
};

const months = [...new Set(g1Races2026.map((r) => r.month))];

export default function CalendarPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-emerald-400 font-bold text-sm hover:text-emerald-300">
            ← 競馬予想AI トップ
          </Link>
          <span className="text-gray-500 text-xs">G1カレンダー2026</span>
        </div>
      </header>

      {/* Hero */}
      <section className="py-14 px-4 text-center bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block bg-emerald-900 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full mb-6">
            🏆 2026年 競馬G1レース全日程
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
            G1レースカレンダー<span className="text-emerald-400">2026</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-6">
            2026年の重賞・G1レース全日程を一覧表示。<br />
            <strong className="text-white">G1前日にAIが本命・対抗・穴馬を予想して公開</strong>します。
          </p>
          <Link
            href="/tool"
            className="inline-block bg-emerald-500 hover:bg-emerald-400 text-black font-black text-lg px-10 py-4 rounded-xl transition"
          >
            AIで予想する（無料3回）→
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gray-900 py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { label: "G1レース数", value: "25戦" },
            { label: "AI予想公開", value: "前日正午" },
            { label: "無料試用", value: "3回" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-emerald-400 text-2xl font-black">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Calendar Table */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          {months.map((month) => {
            const races = g1Races2026.filter((r) => r.month === month);
            return (
              <div key={month} className="mb-12">
                <h2 className="text-xl font-bold mb-4 text-emerald-300 border-b border-gray-800 pb-2">
                  {month}
                </h2>
                <div className="space-y-3">
                  {races.map((race, i) => (
                    <div
                      key={i}
                      className={`flex flex-wrap md:flex-nowrap items-center gap-3 rounded-xl p-4 ${
                        race.highlight
                          ? "bg-gray-800 border border-emerald-800"
                          : "bg-gray-900"
                      }`}
                    >
                      <div className="text-gray-400 text-sm w-28 shrink-0">{race.date}</div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {race.highlight && (
                          <span className="bg-emerald-700 text-emerald-100 text-xs font-bold px-1.5 py-0.5 rounded shrink-0">
                            {race.grade}
                          </span>
                        )}
                        {!race.highlight && (
                          <span className="bg-gray-700 text-gray-300 text-xs px-1.5 py-0.5 rounded shrink-0">
                            {race.grade}
                          </span>
                        )}
                        <span className={`font-bold ${race.highlight ? "text-white" : "text-gray-300"}`}>
                          {race.name}
                        </span>
                      </div>
                      <div className="text-gray-400 text-sm shrink-0">{race.venue} {race.distance}</div>
                      <div className="shrink-0">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${statusColor[race.status]}`}>
                          {race.status}
                        </span>
                      </div>
                      {race.highlight && race.status !== "終了" && (
                        <Link
                          href="/tool"
                          className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                        >
                          AI予想 →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI CTA */}
      <section className="bg-gray-900 py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">G1前日にAI予想をチェック</h2>
          <p className="text-gray-400 mb-8">
            本命・対抗・穴馬・馬券戦略・信頼度スコアを自動生成。<br />
            <strong className="text-white">無料で3回試せます。</strong>登録不要。
          </p>
          <Link
            href="/tool"
            className="inline-block bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xl px-12 py-5 rounded-xl transition"
          >
            今すぐAI予想を試す →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4 text-center text-gray-500 text-xs">
        <p>© 2026 競馬予想AI</p>
        <p className="mt-2">
          <Link href="/legal" className="hover:text-gray-300 underline">特定商取引法に基づく表記</Link>
        </p>
        <p className="mt-3 text-gray-600">※ 当サイトのAI予想は参考情報です。馬券購入は自己責任でお願いします。競馬は20歳以上の方のみご利用ください。</p>
      </footer>
    </main>
  );
}
