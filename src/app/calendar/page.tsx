import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://keiba-yoso-ai.vercel.app";

const TITLE = "2026年 G1レース日程＆AI予想カレンダー｜競馬予想AI";
const DESC =
  "2026年の中央競馬G1全22レースの日程・会場・距離を一覧掲載。AIが出走馬データを自動分析し本命◎対抗○単穴▲を提案。高松宮記念・日本ダービー・有馬記念など主要G1の予想を今すぐ確認。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "G1 予想 AI 2026",
    "競馬 G1 日程 2026",
    "2026年 G1 スケジュール",
    "競馬予想 AI",
    "G1 予想",
    "有馬記念 2026",
    "日本ダービー 2026",
    "宝塚記念 2026",
  ],
  openGraph: {
    title: TITLE,
    description: DESC,
    url: `${SITE_URL}/calendar`,
    siteName: "競馬予想AI",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    site: "@levona_design",
  },
  alternates: {
    canonical: `${SITE_URL}/calendar`,
  },
};

type Race = {
  name: string;
  date: string; // YYYY-MM-DD
  displayDate: string;
  venue: string;
  distance: string;
  surface: "芝" | "ダート";
  done?: boolean;
};

const G1_RACES: Race[] = [
  { name: "フェブラリーS", date: "2026-02-22", displayDate: "2/22（日）", venue: "東京", distance: "1600m", surface: "ダート", done: true },
  { name: "高松宮記念", date: "2026-03-29", displayDate: "3/29（日）", venue: "中京", distance: "1200m", surface: "芝" },
  { name: "大阪杯", date: "2026-04-05", displayDate: "4/5（日）", venue: "阪神", distance: "2000m", surface: "芝" },
  { name: "桜花賞", date: "2026-04-12", displayDate: "4/12（日）", venue: "阪神", distance: "1600m", surface: "芝" },
  { name: "皐月賞", date: "2026-04-19", displayDate: "4/19（日）", venue: "中山", distance: "2000m", surface: "芝" },
  { name: "天皇賞（春）", date: "2026-05-03", displayDate: "5/3（日）", venue: "京都", distance: "3200m", surface: "芝" },
  { name: "NHKマイルC", date: "2026-05-10", displayDate: "5/10（日）", venue: "東京", distance: "1600m", surface: "芝" },
  { name: "ヴィクトリアM", date: "2026-05-17", displayDate: "5/17（日）", venue: "東京", distance: "1600m", surface: "芝" },
  { name: "日本ダービー", date: "2026-05-31", displayDate: "5/31（日）", venue: "東京", distance: "2400m", surface: "芝" },
  { name: "安田記念", date: "2026-06-07", displayDate: "6/7（日）", venue: "東京", distance: "1600m", surface: "芝" },
  { name: "宝塚記念", date: "2026-06-28", displayDate: "6/28（日）", venue: "阪神", distance: "2200m", surface: "芝" },
  { name: "スプリンターズS", date: "2026-10-04", displayDate: "10/4（日）", venue: "中山", distance: "1200m", surface: "芝" },
  { name: "秋華賞", date: "2026-10-12", displayDate: "10/12（月）", venue: "京都", distance: "2000m", surface: "芝" },
  { name: "菊花賞", date: "2026-10-19", displayDate: "10/19（月）", venue: "京都", distance: "3000m", surface: "芝" },
  { name: "天皇賞（秋）", date: "2026-11-01", displayDate: "11/1（日）", venue: "東京", distance: "2000m", surface: "芝" },
  { name: "エリザベス女王杯", date: "2026-11-15", displayDate: "11/15（日）", venue: "京都", distance: "2200m", surface: "芝" },
  { name: "マイルCS", date: "2026-11-22", displayDate: "11/22（日）", venue: "京都", distance: "1600m", surface: "芝" },
  { name: "ジャパンC", date: "2026-11-29", displayDate: "11/29（日）", venue: "東京", distance: "2400m", surface: "芝" },
  { name: "チャンピオンズC", date: "2026-12-07", displayDate: "12/7（月）", venue: "中京", distance: "1800m", surface: "ダート" },
  { name: "阪神JF", date: "2026-12-14", displayDate: "12/14（日）", venue: "阪神", distance: "1600m", surface: "芝" },
  { name: "朝日杯FS", date: "2026-12-21", displayDate: "12/21（日）", venue: "阪神", distance: "1600m", surface: "芝" },
  { name: "有馬記念", date: "2026-12-28", displayDate: "12/28（月）", venue: "中山", distance: "2500m", surface: "芝" },
];

function isUpcoming(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const raceDate = new Date(dateStr);
  const diff = (raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 14;
}

function isPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header Nav */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-green-400 font-bold text-lg tracking-tight hover:text-green-300 transition-colors">
            🏇 競馬予想AI
          </Link>
          <Link
            href="/predict"
            className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            AI予想を使う
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Page Title */}
        <div className="text-center mb-10">
          <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-2">2026 G1 Calendar</p>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
            2026年 G1レース日程
            <br />
            <span className="text-green-400">＆AI予想カレンダー</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl mx-auto">
            中央競馬G1全22レースの開催日・会場・距離を一覧表示。
            AIが出走馬データをリアルタイム分析し、本命◎・対抗○・単穴▲と買い目を提案します。
          </p>
        </div>

        {/* Top CTA */}
        <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-700/50 rounded-2xl p-6 mb-10 text-center">
          <p className="text-green-300 font-bold text-lg mb-1">🎯 G1レースの予想を今すぐ確認</p>
          <p className="text-gray-400 text-sm mb-4">
            netkeibaの出走馬データをAIが自動取得・分析。登録不要・無料3回から。
          </p>
          <Link
            href="/predict"
            className="inline-block bg-green-500 hover:bg-green-400 text-black font-extrabold px-8 py-3 rounded-xl text-base transition-colors shadow-lg shadow-green-900/50"
          >
            AI予想を今すぐ見る（無料3回）→
          </Link>
        </div>

        {/* How AI Works Section */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
            <span>⚡</span> AIはどうやってG1レースを予想するのか
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                title: "リアルデータ自動取得",
                body: "netkeibaから出走馬・騎手・調教師・過去成績・オッズなどのデータを自動収集。手入力不要。",
              },
              {
                step: "02",
                title: "多角的AI分析",
                body: "脚質・コース適性・距離適性・騎手リーディング・馬場状態など20以上の指標をAIが総合評価。",
              },
              {
                step: "03",
                title: "買い目まで自動提案",
                body: "本命◎・対抗○・単穴▲の根拠を明示し、軍資金に合わせた三連複・馬連・単勝の金額まで提案。",
              },
            ].map((item) => (
              <div key={item.step} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-green-400 font-black text-2xl mb-2">{item.step}</p>
                <p className="font-bold text-white mb-2">{item.title}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* G1 Race Calendar */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span>📅</span> 2026年 G1レース全日程
          </h2>

          <div className="space-y-3">
            {G1_RACES.map((race) => {
              const past = race.done || isPast(race.date);
              const upcoming = !past && isUpcoming(race.date);

              return (
                <div
                  key={race.name}
                  className={`
                    border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3
                    transition-colors
                    ${past
                      ? "bg-gray-900/50 border-gray-800 opacity-60"
                      : upcoming
                      ? "bg-amber-950/40 border-amber-600/60 shadow-lg shadow-amber-900/20"
                      : "bg-gray-900 border-gray-800 hover:border-gray-700"
                    }
                  `}
                >
                  {/* Date */}
                  <div className="min-w-[100px]">
                    <p className={`font-bold text-base ${past ? "text-gray-500" : upcoming ? "text-amber-300" : "text-green-400"}`}>
                      {race.displayDate}
                    </p>
                  </div>

                  {/* Race Info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`font-extrabold text-lg ${past ? "text-gray-400" : "text-white"}`}>
                        {race.name}
                      </span>
                      {upcoming && (
                        <span className="bg-amber-500 text-black text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
                          🔥 直近
                        </span>
                      )}
                      {past && (
                        <span className="bg-gray-700 text-gray-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                          済
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                      <span>📍 {race.venue}</span>
                      <span
                        className={`font-semibold ${race.surface === "ダート" ? "text-amber-500" : "text-green-500"}`}
                      >
                        {race.surface} {race.distance}
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="sm:ml-auto">
                    {past ? (
                      <span className="inline-block text-gray-600 text-sm border border-gray-700 px-4 py-2 rounded-lg">
                        終了
                      </span>
                    ) : (
                      <Link
                        href="/predict"
                        className={`inline-block font-bold text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap
                          ${upcoming
                            ? "bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-900/40"
                            : "bg-green-600 hover:bg-green-500 text-white"
                          }
                        `}
                      >
                        AI予想を見る →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ for SEO */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span>❓</span> よくある質問
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "2026年のG1レースはいくつありますか？",
                a: "中央競馬のG1レースは2026年も全22レース開催されます。フェブラリーSから始まり、有馬記念で年末を締めくくります。",
              },
              {
                q: "AIはどのG1レースでも予想できますか？",
                a: "はい。出走登録が行われたレースであれば、netkeibaから出走馬データが取得できるため、AIが自動分析して予想を提供します。G1に限らず全レース対応しています。",
              },
              {
                q: "無料で何レース試せますか？",
                a: "登録なしで3レースまで無料で予想できます。4レース目以降はベーシックプラン（月額¥980）またはプロプラン（月額¥2,980）でご利用いただけます。",
              },
              {
                q: "G1予想の的中率はどのくらいですか？",
                a: "AIは確率的に最も可能性が高い馬を提示しますが、競馬に100%の的中は存在しません。回収率トラッキング機能で自分の成績を記録しながらご活用ください。",
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="font-bold text-green-400 mb-2">Q. {faq.q}</p>
                <p className="text-gray-300 text-sm leading-relaxed">A. {faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-8 text-center">
          <p className="text-2xl font-extrabold mb-2">
            次のG1レース、AIで予想してみませんか？
          </p>
          <p className="text-gray-400 text-sm mb-6 max-w-xl mx-auto">
            登録不要・無料3回から。AIが本命◎・対抗○・単穴▲と軍資金別の買い目を自動提案します。
          </p>
          <Link
            href="/predict"
            className="inline-block bg-green-500 hover:bg-green-400 text-black font-extrabold px-10 py-4 rounded-xl text-lg transition-colors shadow-xl shadow-green-900/40"
          >
            AI予想を今すぐ見る（無料3回）→
          </Link>
          <p className="text-gray-600 text-xs mt-4">クレジットカード不要・いつでも解約可能</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-600 text-sm">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center gap-4 mb-4">
          <Link href="/" className="hover:text-gray-400 transition-colors">トップ</Link>
          <Link href="/predict" className="hover:text-gray-400 transition-colors">AI予想</Link>
          <Link href="/tracker" className="hover:text-gray-400 transition-colors">回収率トラッカー</Link>
          <Link href="/legal" className="hover:text-gray-400 transition-colors">特定商取引法</Link>
          <Link href="/privacy" className="hover:text-gray-400 transition-colors">プライバシーポリシー</Link>
        </div>
        <p>© 2026 競馬予想AI. All rights reserved.</p>
        <p className="mt-1 text-xs text-gray-700">※ 本サービスは競馬の勝利を保証するものではありません。お楽しみの範囲内でご利用ください。</p>
      </footer>
    </div>
  );
}
