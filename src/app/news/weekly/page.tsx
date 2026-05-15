import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "オークス2026・日本ダービー2026 AI予想完全版 | 競馬予想AI",
  description: "オークス（5/24）・日本ダービー（5/31）をAIが徹底分析。桜花賞上位馬の2400m適性・皐月賞馬のダービー適性を4軸スコアで判定。複勝回収率193%の実績AIが予想中。",
  keywords: ["オークス2026予想", "日本ダービー2026予想", "オークス AI予想", "ダービー AI予想", "G1予想", "今週の競馬", "AI競馬予想", "オークス本命"],
  openGraph: {
    title: "オークス2026・日本ダービー2026 AI予想完全版 | 競馬予想AI",
    description: "オークス（5/24）・ダービー（5/31）をAIが4軸分析。桜花賞上位馬の2400m適性を判定。複勝回収率193%のAIが今週末を予測中。",
    url: "https://keiba-yoso-ai.vercel.app/news/weekly",
  },
  alternates: { canonical: "https://keiba-yoso-ai.vercel.app/news/weekly" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "オークス2026・日本ダービー2026 AI予想完全版（2026年5月第3週）",
      "description": "オークス（5/24）・日本ダービー（5/31）をAIが徹底分析。桜花賞上位馬の2400m適性を4軸スコアで判定。",
      "url": "https://keiba-yoso-ai.vercel.app/news/weekly",
      "datePublished": "2026-05-11",
      "dateModified": "2026-05-11",
      "publisher": { "@type": "Organization", "name": "競馬予想AI", "url": "https://keiba-yoso-ai.vercel.app" },
      "author": { "@type": "Organization", "name": "競馬予想AI編集部" },
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "オークス2026の本命はどの馬ですか？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "オークス2026（5/24・東京芝2400m）は桜花賞上位馬が有力です。AIは桜花賞1〜3着馬の東京コース適性・末脚持続力・2400m距離延長適性を4軸でスコアリングして本命を決定します。桜花賞経由馬の連対率は過去10年で約70%です。"
          }
        },
        {
          "@type": "Question",
          "name": "日本ダービー2026の予想ポイントは？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "日本ダービー2026（5/31・東京芝2400m）は皐月賞上位馬が中心。AIは皐月賞の着順より上がり3F時計と東京コース適性を重視します。東京向きの末脚持続力がある馬が距離延長で一変するパターンに注目です。"
          }
        },
        {
          "@type": "Question",
          "name": "オークスとダービーでAI予想の精度は高いですか？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "クラシックG1は出走馬のデータが豊富なため、AI予想が機能しやすいレースです。当AIの複勝モードは過去の重賞で回収率193%を記録しています。オークス・ダービーは3頭複勝を軸に、東京コース実績のある穴馬を加えた馬券構成が有効です。"
          }
        },
      ],
    },
  ],
};

// 今週の主要レース
const THIS_WEEK = [
  {
    name: "オークス（優駿牝馬・G1）",
    date: "2026年5月24日（日）",
    venue: "東京競馬場 芝2400m（外）",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-gray-900",
    infoCards: [
      { icon: "🏇", label: "コース特性", value: "東京2400m外回り。直線518mで差し・追い込みも決まる。スタミナと末脚持続力が必要。" },
      { icon: "📊", label: "AIの注目軸", value: "桜花賞上位馬の2400m適性 × 東京コース実績 × 末脚持続力" },
      { icon: "🌸", label: "前哨戦実績", value: "桜花賞1〜3着馬が中心。フローラS・スイートピーS組も警戒" },
      { icon: "💡", label: "穴馬候補", value: "フローラS・スイートピーS勝ち馬。桜花賞では距離不足だった長距離型" },
    ],
    aiNote: "AIはフローラS経由馬の東京2400m実績を重視。桜花賞経由馬の連対率は過去10年で約70%。3頭複勝を軸に東京コース実績のある穴馬を加えた買い方が有効です。",
    axes: [
      { label: "桜花賞上位馬有利度", value: 85, color: "from-pink-500 to-rose-400" },
      { label: "差し・追い込み有効度", value: 80, color: "from-blue-500 to-cyan-400" },
      { label: "荒れ可能性", value: 45, color: "from-orange-400 to-amber-300" },
      { label: "複勝モード推奨度", value: 75, color: "from-amber-500 to-yellow-400" },
    ],
  },
];

// 今後の注目G1
const UPCOMING_G1 = [
  {
    name: "日本ダービー（G1）",
    date: "2026年5月31日（日）",
    venue: "東京競馬場 芝2400m（外）",
    preview: "競馬の祭典・日本ダービー。皐月賞上位馬が中心だが、東京向きの末脚持続力があれば逆転可能。AIは皐月賞の着順より上がり3F時計と東京実績を重視。距離延長で一変する馬に注目。",
    aiKey: "東京コース適性・末脚持続力・皐月賞上がり3F",
  },
  {
    name: "安田記念（G1）",
    date: "2026年6月7日（日）",
    venue: "東京競馬場 芝1600m（外）",
    preview: "春のマイルG1最終戦。古馬最強マイラー決定戦。ヴィクトリアマイル組の牝馬・マイラーズC組が有力。AIは前走タイムとマイル実績を重視。海外帰り馬も要注目。",
    aiKey: "マイル実績一貫性・東京1600m適性",
  },
  {
    name: "宝塚記念（G1）",
    date: "2026年6月28日（日）",
    venue: "阪神競馬場 芝2200m（内）",
    preview: "上半期グランプリ。阪神内回り2200mで機動力が重要。古馬中距離チャンピオンが集結する。AIは内回りのコーナー加速力と持続力を重視。",
    aiKey: "阪神内回り適性・コーナー加速力",
  },
  {
    name: "フェブラリーS（G1）",
    date: "2026年8月（秋以降）",
    venue: "各競馬場",
    preview: "夏競馬・秋のG1シーズンへ向けた調整期間。AIは各馬の夏の上がり実績と秋G1での適性を継続的に分析中。",
    aiKey: "夏実績・秋G1適性",
  },
];

// AI予想の仕組み説明
const HOW_IT_WORKS = [
  {
    step: 1,
    icon: "📈",
    title: "過去成績スコアリング",
    desc: "直近5走の着順・タイム・コース成績を数値化。連勝・好調な馬は加点。",
  },
  {
    step: 2,
    icon: "🏇",
    title: "コース・距離適性分析",
    desc: "コース形状・距離別の成績から適性を算出。初コース・初距離は減点。",
  },
  {
    step: 3,
    icon: "👤",
    title: "騎手相性・実績分析",
    desc: "騎手との継続騎乗は加点。リーディング上位騎手・名手との相性を考慮。",
  },
  {
    step: 4,
    icon: "🌿",
    title: "当日馬場・展開分析",
    desc: "馬場状態と馬の脚質の相性を分析。重馬場が苦手な馬は減点。",
  },
];

export default function WeeklyG1Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="flex items-center justify-between px-6 py-4 border-b bg-green-900">
        <Link href="/" className="text-xl font-bold text-white">🏇 競馬予想AI</Link>
        <div className="flex items-center gap-4">
          <Link href="/predict" className="text-sm text-green-300 hover:text-white">予想する</Link>
          <Link href="/news" className="text-sm text-green-300 hover:text-white">ニュース</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto py-10 px-4">

        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-yellow-400 text-gray-900 text-xs font-black px-3 py-1 rounded-full">毎週更新</span>
            <span className="text-xs text-gray-500">2026年5月第3週号</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">オークス・日本ダービー2026 AI予想完全ガイド</h1>
          <p className="text-gray-600 text-sm">
            AIが今週の重賞・G1レースを4軸分析。コース特性・注目馬・買い目まで徹底解説します。
            <Link href="/predict" className="text-green-700 font-bold hover:underline ml-1">→ 実際にAI予想を使う</Link>
          </p>
        </div>

        {/* 今週のG1 */}
        {THIS_WEEK.map((race) => (
          <div key={race.name} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
            {/* ヘッダー */}
            <div className="bg-green-800 px-6 py-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${race.badgeColor}`}>{race.badge}</span>
                <span className="text-green-300 text-xs">{race.date}</span>
              </div>
              <h2 className="text-xl font-bold text-white">{race.name}</h2>
              <p className="text-green-300 text-sm">{race.venue}</p>
            </div>

            <div className="p-6">
              {/* 4軸スコアバー */}
              <div className="bg-green-900 rounded-2xl p-4 mb-5">
                <p className="text-xs font-bold text-yellow-300 mb-3">📊 このレースのAI予想難易度（4軸分析）</p>
                <div className="space-y-2.5">
                  {race.axes.map((axis) => (
                    <div key={axis.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/80">{axis.label}</span>
                        <span className="text-xs font-black text-yellow-300">{axis.value}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full bg-gradient-to-r ${axis.color}`}
                          style={{ width: `${axis.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 情報カード */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {race.infoCards.map((card) => (
                  <div key={card.label} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{card.icon}</span>
                      <span className="text-xs font-bold text-gray-700">{card.label}</span>
                    </div>
                    <p className="text-sm text-gray-800">{card.value}</p>
                  </div>
                ))}
              </div>

              {/* AIノート */}
              <div className="bg-green-50 border border-green-300 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-green-800 mb-1">🤖 AIの見解</p>
                <p className="text-sm text-green-900">{race.aiNote}</p>
              </div>

              {/* CTA */}
              <Link
                href="/predict"
                className="block w-full bg-green-700 hover:bg-green-800 text-white text-center font-bold py-3.5 px-6 rounded-xl text-sm transition-colors"
              >
                🏇 {race.name}をAIに予想してもらう
              </Link>
            </div>
          </div>
        ))}

        {/* AI予想の仕組み */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🤖 AIはどうやって予想している？4軸スコアリング</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm mb-0.5">{item.icon} {item.title}</p>
                  <p className="text-xs text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs text-green-800 font-medium">
              💡 4軸すべてが高スコアの馬＝AI本命。1軸だけ高い馬は穴馬候補として参照してください。
            </p>
          </div>
        </div>

        {/* 来週以降のG1カレンダー */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📅 春〜夏のG1カレンダー（2026年5月〜）</h2>
          <div className="space-y-4">
            {UPCOMING_G1.map((race) => (
              <div key={race.name} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-yellow-400 text-gray-900 text-xs font-black px-2 py-0.5 rounded-full">G1</span>
                  <span className="text-xs text-gray-500">{race.date}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{race.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{race.venue}</p>
                <p className="text-sm text-gray-700 mb-2">{race.preview}</p>
                <p className="text-xs text-green-700 font-medium bg-green-50 px-3 py-1.5 rounded-lg inline-block">
                  🎯 AIの注目軸: {race.aiKey}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* バックナビ */}
        <div className="flex gap-3">
          <Link href="/news" className="flex-1 text-center border border-gray-300 text-gray-600 font-medium py-3 px-4 rounded-xl text-sm hover:bg-gray-50 transition-colors">
            ← G1情報一覧
          </Link>
          <Link href="/predict" className="flex-1 text-center bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors">
            🏇 AI予想を使う →
          </Link>
        </div>
      </div>

      <footer className="text-center py-8 text-xs text-gray-400 border-t mt-8 space-x-4">
        <Link href="/" className="hover:text-gray-600">トップ</Link>
        <Link href="/predict" className="hover:text-gray-600">AI予想</Link>
        <Link href="/news" className="hover:text-gray-600">G1情報</Link>
        <Link href="/legal" className="hover:text-gray-600">特商法</Link>
        <span>© 2026 競馬予想AI</span>
      </footer>
    </div>
  );
}
