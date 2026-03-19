import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "今週のG1ニュース | 競馬予想AI",
  description: "今週開催されるG1・重賞レースの注目情報、出走予定馬、AIが注目するポイントをまとめています。毎週更新。",
};

// 週次更新用の静的コンテンツテンプレート
const THIS_WEEK_RACES = [
  {
    name: "高松宮記念（G1）",
    date: "2026年3月29日（日）",
    venue: "中京競馬場 芝1200m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 前走阪急杯優勝馬が中心。中京1200mの内枠有利に注目",
      "AIの注目軸: 前走スプリント実績・中京コース適性・斤量差",
      "天候・馬場: 開催前日までの降雨次第で外枠不利が強まる可能性",
      "穴馬情報: 1〜3番人気の複勝率65%と安定。人気薄の台頭は少ない傾向",
    ],
    aiNote: "AIは前走上がり3Fタイム上位かつ中京1200m実績のある馬を高評価。人気サイドの複勝推奨になりやすいレース。",
  },
];

const NEXT_RACES = [
  {
    name: "大阪杯（G1）",
    date: "2026年4月5日（日）",
    venue: "阪神競馬場 芝2000m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    preview: "古馬中距離チャンピオン決定戦。阪神内回り2000mで機動力が問われる。宝塚記念との関連性が強く、上位馬の多くが宝塚記念へ向かう。AIは前走着順と阪神コース実績を重視。",
  },
  {
    name: "桜花賞（G1）",
    date: "2026年4月12日（日）",
    venue: "阪神競馬場 芝1600m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    preview: "3歳牝馬クラシック第1弾。阪神外回りマイルで持続力と瞬発力のバランスが問われる。前哨戦（チューリップ賞・フィリーズレビュー）の内容をAIが総合判断。",
  },
  {
    name: "皐月賞（G1）",
    date: "2026年4月19日（日）",
    venue: "中山競馬場 芝2000m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    preview: "3歳牡馬クラシック第1弾。中山内回り2000mで機動力と先行力が重要。弥生賞・スプリングS組とホープフルS組の対決。AIは距離実績と中山コース適性を最重視。",
  },
];

const AI_TIPS = [
  {
    icon: "📊",
    title: "今週のAI予想のポイント",
    body: "高松宮記念はスプリント実績と中京コース適性が最重要。内枠の先行馬を中心に、前走上がり3Fタイム上位馬から複勝推奨が出やすいレース構造。AIは1〜2番人気からの複勝買いを基本スタンスにする見込み。",
  },
  {
    icon: "🎯",
    title: "バックテスト継続中",
    body: "現在n=3レースのバックテストを継続中。今週の高松宮記念も含めてデータを蓄積していきます。的中も外れも全記録公開しているので、AIの精度変化をリアルタイムで確認できます。",
  },
  {
    icon: "💡",
    title: "馬場状態の確認を忘れずに",
    body: "開催日前日〜当日の馬場発表を必ず確認してください。特に芝の良・稍重・重で有利な脚質が変わります。AIは基本的に良馬場前提の分析ですが、雨天時は買い目を保守的に調整することを推奨します。",
  },
];

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-4 py-4 border-b border-green-200 bg-green-900 sticky top-0 z-10">
        <Link href="/" className="text-base md:text-xl font-bold text-white">🏇 競馬予想AI</Link>
        <div className="flex items-center gap-3">
          <Link href="/predict" className="text-sm text-green-200 hover:text-white">予想する</Link>
          <Link href="/predict" className="bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-4 py-1.5 rounded-full text-sm transition-colors">
            無料で試す
          </Link>
        </div>
      </nav>

      <section className="bg-green-900 text-white py-10 px-4 text-center">
        <span className="inline-block bg-yellow-400 text-green-900 text-xs font-black px-3 py-1 rounded-full mb-3">毎週更新</span>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">今週のG1・重賞 注目ニュース</h1>
        <p className="text-green-300 text-sm">今週末の開催レースを中心にAIが注目するポイントをまとめています</p>
        <p className="text-green-400 text-xs mt-2">最終更新: 2026年3月20日</p>
      </section>

      {/* 今週の注目レース */}
      <section className="py-12 px-4 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="text-yellow-500">🏆</span> 今週の注目レース
        </h2>
        <div className="space-y-6">
          {THIS_WEEK_RACES.map((race) => (
            <div key={race.name} className="border-2 border-green-200 rounded-2xl overflow-hidden">
              <div className="bg-green-800 text-white px-6 py-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black px-2 py-1 rounded-full ${race.badgeColor}`}>{race.badge}</span>
                    <span className="font-bold text-lg">{race.name}</span>
                  </div>
                  <div className="text-green-300 text-sm">
                    <span>{race.date}</span>
                    <span className="mx-2">|</span>
                    <span>{race.venue}</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {race.headlines.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-yellow-500 font-bold shrink-0">▶</span>
                      <p className="text-sm text-gray-700 leading-relaxed">{h}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-green-700 mb-1">🤖 AIのコメント</p>
                  <p className="text-sm text-green-800 leading-relaxed">{race.aiNote}</p>
                </div>
                <div className="mt-4 text-center">
                  <Link href="/predict" className="inline-block bg-green-700 text-white font-bold px-8 py-3 rounded-xl hover:bg-green-800 transition-colors text-sm">
                    このレースをAIで予想する →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI予想のポイント */}
      <section className="py-10 px-4 bg-green-50 border-y border-green-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">今週のAI予想ポイント</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {AI_TIPS.map((tip, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-green-200">
                <div className="text-2xl mb-2">{tip.icon}</div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">{tip.title}</h3>
                <p className="text-gray-600 text-xs leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 次週以降のレース */}
      <section className="py-12 px-4 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span>📅</span> 今後の春G1スケジュール
        </h2>
        <div className="space-y-4">
          {NEXT_RACES.map((race) => (
            <div key={race.name} className="border border-gray-200 rounded-xl p-5 bg-white hover:border-green-300 transition-colors">
              <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${race.badgeColor}`}>{race.badge}</span>
                  <span className="font-bold text-gray-900">{race.name}</span>
                </div>
                <div className="text-xs text-gray-500">
                  <span>{race.date}</span>
                  <span className="mx-1">|</span>
                  <span>{race.venue}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{race.preview}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/calendar" className="inline-block border-2 border-green-700 text-green-700 font-bold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors text-sm">
            2026年全G1カレンダーを見る →
          </Link>
        </div>
      </section>

      <section className="py-12 px-4 bg-green-900 text-white text-center">
        <h2 className="text-xl font-bold mb-3">AIで今週の予想を確認する</h2>
        <p className="text-green-300 text-sm mb-6">登録不要・2レース無料で試せます</p>
        <Link href="/predict" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-10 py-4 rounded-full text-lg transition-colors">
          無料でAI予想を見る →
        </Link>
      </section>

      <footer className="text-center py-8 text-sm text-gray-400 border-t">
        <div className="space-x-4 mb-2">
          <Link href="/">トップ</Link>
          <Link href="/predict">予想ツール</Link>
          <Link href="/backtest/results">バックテスト</Link>
        </div>
        <p className="text-xs">※本サービスはエンターテインメント目的の予想情報提供サービスです。馬券購入は自己責任でお願いします。</p>
      </footer>
    </main>
  );
}
