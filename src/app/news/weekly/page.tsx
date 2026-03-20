import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "今週のG1予想・AIプレビュー完全版 | 競馬予想AI",
  description: "今週開催のG1・重賞レースをAIが徹底分析。コース別傾向・出走予定馬・AIの注目軸・買い目提案まで毎週更新。高松宮記念・桜花賞・皐月賞の完全予想。",
  keywords: ["G1予想", "今週の競馬", "高松宮記念予想", "桜花賞予想", "皐月賞予想", "AI競馬予想", "今週G1"],
  openGraph: {
    title: "今週のG1予想・AIプレビュー完全版 | 競馬予想AI",
    description: "今週のG1・重賞をAIが徹底分析。コース別傾向・注目軸・買い目提案まで毎週更新。",
    url: "https://keiba-yoso-ai.vercel.app/news/weekly",
  },
  alternates: { canonical: "https://keiba-yoso-ai.vercel.app/news/weekly" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "今週のG1予想・AIプレビュー完全版（2026年3月第5週）",
      "description": "今週開催のG1・重賞レースをAIが徹底分析。高松宮記念の完全予想。",
      "url": "https://keiba-yoso-ai.vercel.app/news/weekly",
      "datePublished": "2026-03-20",
      "dateModified": "2026-03-20",
      "publisher": { "@type": "Organization", "name": "競馬予想AI", "url": "https://keiba-yoso-ai.vercel.app" },
      "author": { "@type": "Organization", "name": "競馬予想AI編集部" },
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "高松宮記念2026はインコースが有利ですか？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "高松宮記念が行われる中京競馬場の芝1200mは内枠先行有利の傾向が強く、特に1〜4枠の先行馬が優位です。ただし前日までの降雨で外差しが決まりやすくなるケースもあります。"
          }
        },
        {
          "@type": "Question",
          "name": "AIはどのような根拠で本命を選んでいますか？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AI予想は過去成績・コース適性・騎手との組み合わせ・当日馬場の4軸でスコアリングします。4軸すべてが高スコアの馬を本命に推奨します。"
          }
        },
        {
          "@type": "Question",
          "name": "複勝モードと通常モードはどちらが的中しやすいですか？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "複勝モードは3着以内で的中となるため的中率が高く、初心者向けです。通常モードは◎○▲と買い目提案で単勝・馬連を狙います。資金に余裕があれば両方試すことをおすすめします。"
          }
        },
      ],
    },
  ],
};

// 今週の主要レース
const THIS_WEEK = [
  {
    name: "高松宮記念（G1）",
    date: "2026年3月29日（日）",
    venue: "中京競馬場 芝1200m（外）",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-gray-900",
    infoCards: [
      { icon: "🏇", label: "コース特性", value: "直線が短く先行・逃げ馬が有利。内枠が圧倒的に強い。" },
      { icon: "📊", label: "AIの注目軸", value: "前走スプリント実績 × 中京1200m適性 × 斤量差" },
      { icon: "🌧️", label: "馬場注意", value: "開催前日の降雨次第で外枠アウトサイダーが台頭しやすい" },
      { icon: "💡", label: "穴馬候補", value: "1〜3番人気の複勝率65%と安定。人気薄の台頭は少ない傾向" },
    ],
    aiNote: "AIは前走上がり3Fタイム上位かつ中京1200m実績のある馬を高評価。人気サイドの複勝推奨になりやすいレース。予想する際は複勝モードが有効です。",
    axes: [
      { label: "インコース有利度", value: 90, color: "from-green-500 to-emerald-400" },
      { label: "スプリント適性重要度", value: 85, color: "from-blue-500 to-cyan-400" },
      { label: "荒れ可能性", value: 30, color: "from-gray-400 to-gray-300" },
      { label: "複勝モード推奨度", value: 80, color: "from-amber-500 to-yellow-400" },
    ],
  },
];

// 来週以降の注目G1
const UPCOMING_G1 = [
  {
    name: "大阪杯（G1）",
    date: "2026年4月5日（日）",
    venue: "阪神競馬場 芝2000m（内）",
    preview: "古馬中距離チャンピオン決定戦。阪神内回り2000mで機動力が問われる。AIは前走着順と阪神コース実績を重視。宝塚記念への重要なステップレース。",
    aiKey: "阪神内回り適性・先行力",
  },
  {
    name: "桜花賞（G1）",
    date: "2026年4月12日（日）",
    venue: "阪神競馬場 芝1600m（外）",
    preview: "3歳牝馬クラシック第1弾。阪神外回りマイルで持続力と瞬発力のバランスが問われる。前哨戦（チューリップ賞・フィリーズレビュー）の内容をAIが総合判断。",
    aiKey: "チューリップ賞・フィリーズレビュー組実績",
  },
  {
    name: "皐月賞（G1）",
    date: "2026年4月19日（日）",
    venue: "中山競馬場 芝2000m（内）",
    preview: "3歳牡馬クラシック第1弾。中山の急坂・内回り2000mで切れより持続力が問われる。弥生賞・スプリングS組が中心。AIは中山コース適性を最重要視。",
    aiKey: "中山コース適性・前走コーナー加速力",
  },
  {
    name: "天皇賞（春）（G1）",
    date: "2026年4月26日（日）",
    venue: "京都競馬場 芝3200m（外）",
    preview: "長距離チャンピオン決定戦。京都の外回り長距離コースでスタミナが最重要。阪神大賞典組・日経賞組が有力。AIはペース耐性と前走距離実績を重視。",
    aiKey: "長距離適性・スタミナ・ペース耐性",
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
            <span className="text-xs text-gray-500">2026年3月第5週号</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">今週のG1完全予想ガイド</h1>
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
          <h2 className="text-lg font-bold text-gray-900 mb-4">📅 春のG1カレンダー（2026年4月〜）</h2>
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
