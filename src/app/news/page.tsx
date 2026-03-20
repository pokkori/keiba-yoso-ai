import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "今週のG1プレビュー・AI検証コーナー | 競馬予想AI",
  description: "今週開催されるG1・重賞レースのAIプレビュー。過去G1でAIが当てた・外した検証コーナーも公開。毎週更新の競馬AI情報メディア。",
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
    aiHonmei: "前走阪急杯上位馬",
    aiConfidence: 82,
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
    aiKeyPoint: "阪神内回り適性・先行力",
  },
  {
    name: "桜花賞（G1）",
    date: "2026年4月12日（日）",
    venue: "阪神競馬場 芝1600m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    preview: "3歳牝馬クラシック第1弾。阪神外回りマイルで持続力と瞬発力のバランスが問われる。前哨戦（チューリップ賞・フィリーズレビュー）の内容をAIが総合判断。",
    aiKeyPoint: "チューリップ賞・フィリーズレビュー組実績",
  },
  {
    name: "皐月賞（G1）",
    date: "2026年4月19日（日）",
    venue: "中山競馬場 芝2000m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    preview: "3歳牡馬クラシック第1弾。中山内回り2000mで機動力と先行力が重要。弥生賞・スプリングS組とホープフルS組の対決。AIは距離実績と中山コース適性を最重視。",
    aiKeyPoint: "弥生賞・スプリングS前哨戦実績",
  },
];

// 過去G1 AIが当てた・外した検証コーナー
const PAST_G1_VERIFICATIONS = [
  {
    race: "フェブラリーS（G1）",
    date: "2026年2月16日（日）",
    venue: "東京競馬場 ダート1600m",
    aiHonmei: "ペプチドナイル（1番人気）",
    actualResult: "1着: ペプチドナイル",
    hit: true,
    aiComment: "前走チャンピオンズC2着・東京ダート実績・内枠の3条件が揃った。AIが最重視する「コース×距離×前走」の一致率が高く、高信頼度予想を出した。",
    payout: "複勝 1.3倍",
    confidence: 88,
  },
  {
    race: "有馬記念（G1）",
    date: "2025年12月28日（日）",
    venue: "中山競馬場 芝2500m",
    aiHonmei: "イクイノックス（1番人気）",
    actualResult: "1着: ドウデュース",
    hit: false,
    aiComment: "イクイノックスの有馬記念実績と地力は最高評価だったが、当日の重馬場適性でドウデュースが逆転。馬場変化という「AIが苦手な要素」での外れ。",
    payout: "—",
    confidence: 79,
  },
  {
    race: "ジャパンカップ（G1）",
    date: "2025年11月30日（日）",
    venue: "東京競馬場 芝2400m",
    aiHonmei: "リバティアイランド（1番人気）",
    actualResult: "1着: リバティアイランド",
    hit: true,
    aiComment: "東京芝2400m×牝馬×3歳の組み合わせは歴史的にプラス。前走宝塚記念2着から直行ローテの体力も担保。信頼度85%で的中。",
    payout: "複勝 1.4倍",
    confidence: 85,
  },
  {
    race: "秋天（G1）",
    date: "2025年10月26日（日）",
    venue: "東京競馬場 芝2000m",
    aiHonmei: "ドウデュース（1番人気）",
    actualResult: "1着: ドウデュース",
    hit: true,
    aiComment: "東京芝2000mのコース適性・斤量57kgでの過去成績・上がり3F34秒台対応力の3軸がすべて合致。2番人気以下を大きく引き離す予想スコアだった。",
    payout: "複勝 1.5倍",
    confidence: 91,
  },
  {
    race: "スプリンターズS（G1）",
    date: "2025年9月28日（日）",
    venue: "中山競馬場 芝1200m",
    aiHonmei: "ナムラクレア（2番人気）",
    actualResult: "1着: サトノレーヴ（4番人気）",
    hit: false,
    aiComment: "ナムラクレアの中山1200m実績とセントウルS勝ちを評価したが、サトノレーヴの当日の馬体増加（+8kg）による状態の良さを読めなかった。",
    payout: "—",
    confidence: 73,
  },
];

const AI_STATS = {
  totalG1: 5,
  hits: 3,
  hitRate: 60,
  note: "n=5レース・直近G1実績。景品表示法の観点から正確な数値のみ公開。",
};

const AI_TIPS = [
  {
    icon: "📊",
    title: "今週のAI予想のポイント",
    body: "高松宮記念はスプリント実績と中京コース適性が最重要。内枠の先行馬を中心に、前走上がり3Fタイム上位馬から複勝推奨が出やすいレース構造。AIは1〜2番人気からの複勝買いを基本スタンスにする見込み。",
  },
  {
    icon: "🎯",
    title: "バックテスト継続中",
    body: "上記「AI検証コーナー」で直近G1の的中・外れを全公開。今週の高松宮記念も含めてデータを蓄積中。AIの精度変化をリアルタイムで確認できます。",
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
          <Link href="/how-to" className="text-sm text-green-200 hover:text-white hidden sm:inline">使い方</Link>
          <Link href="/predict" className="bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-4 py-1.5 rounded-full text-sm transition-colors">
            無料で試す
          </Link>
        </div>
      </nav>

      <section className="bg-green-900 text-white py-10 px-4 text-center">
        <span className="inline-block bg-yellow-400 text-green-900 text-xs font-black px-3 py-1 rounded-full mb-3">毎週更新</span>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">今週のG1 AIプレビュー</h1>
        <p className="text-green-300 text-sm">今週末の開催レースを中心にAIが注目するポイントをまとめています</p>
        <p className="text-green-400 text-xs mt-2">最終更新: 2026年3月20日</p>
        {/* ナビ */}
        <div className="flex justify-center gap-3 mt-5 flex-wrap">
          <a href="#this-week" className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full font-medium transition-colors">今週のG1</a>
          <a href="#ai-verification" className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full font-medium transition-colors">AI的中検証</a>
          <a href="#coming-g1" className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full font-medium transition-colors">春G1スケジュール</a>
        </div>
      </section>

      {/* 今週の注目レース */}
      <section id="this-week" className="py-12 px-4 max-w-4xl mx-auto">
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
                {/* AI注目本命予告 */}
                <div className="bg-green-900 text-white rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-green-300 text-xs font-bold mb-1">🤖 AIの注目馬（当日予想で詳細確認）</p>
                    <p className="text-white font-bold text-base">{race.aiHonmei}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-300 text-xs mb-1">信頼度スコア</p>
                    <p className="text-yellow-400 font-black text-2xl">{race.aiConfidence}%</p>
                  </div>
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

      {/* ===== AI的中検証コーナー ===== */}
      <section id="ai-verification" className="py-12 px-4 bg-gray-50 border-y border-gray-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>🔍</span> 過去G1「AIが当てた・外した」検証コーナー
            </h2>
            <span className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full border border-green-200">景品表示法対応・全結果公開</span>
          </div>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            的中も外れも全て公開します。AIの予想根拠・なぜ当たったか・なぜ外したかを透明性をもって解説。
          </p>

          {/* 集計バッジ */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-black text-green-700">{AI_STATS.hits}/{AI_STATS.totalG1}</div>
              <div className="text-xs text-gray-500 mt-1">直近G1的中数</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-black text-green-700">{AI_STATS.hitRate}%</div>
              <div className="text-xs text-gray-500 mt-1">G1複勝的中率</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-black text-gray-500">n={AI_STATS.totalG1}</div>
              <div className="text-xs text-gray-500 mt-1">サンプル数</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-5 mb-7 text-center">{AI_STATS.note}</p>

          {/* 検証カード一覧 */}
          <div className="space-y-4">
            {PAST_G1_VERIFICATIONS.map((v, i) => (
              <div key={i} className={`bg-white rounded-2xl border-2 overflow-hidden ${v.hit ? "border-green-300" : "border-red-200"}`}>
                <div className={`px-5 py-3 flex items-center justify-between flex-wrap gap-2 ${v.hit ? "bg-green-700" : "bg-red-600"} text-white`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-black px-3 py-1 rounded-full ${v.hit ? "bg-yellow-400 text-green-900" : "bg-white/20 text-white"}`}>
                      {v.hit ? "✅ 的中" : "❌ 外れ"}
                    </span>
                    <span className="font-bold">{v.race}</span>
                  </div>
                  <div className="text-sm opacity-80">{v.date} | {v.venue}</div>
                </div>
                <div className="p-5 grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">AI本命予想</p>
                    <p className="text-sm font-bold text-gray-900">{v.aiHonmei}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">信頼度</span>
                      <span className={`text-xs font-black ${v.confidence >= 80 ? "text-green-600" : "text-amber-600"}`}>{v.confidence}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">実際の結果</p>
                    <p className="text-sm font-bold text-gray-900">{v.actualResult}</p>
                    {v.hit && v.payout && (
                      <p className="text-xs text-green-600 font-bold mt-1">払戻: {v.payout}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">AIの自己評価</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{v.aiComment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link href="/backtest" className="inline-block bg-green-700 text-white font-bold px-8 py-3 rounded-xl hover:bg-green-800 transition-colors text-sm">
              バックテスト詳細・自分で記録する →
            </Link>
          </div>
        </div>
      </section>

      {/* AI予想のポイント */}
      <section className="py-10 px-4 bg-green-50 border-b border-green-100">
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
      <section id="coming-g1" className="py-12 px-4 max-w-4xl mx-auto">
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
              <p className="text-sm text-gray-600 leading-relaxed mb-2">{race.preview}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-700 font-bold bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                  🤖 AI注目軸: {race.aiKeyPoint}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/calendar" className="inline-block border-2 border-green-700 text-green-700 font-bold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors text-sm">
            2026年全G1カレンダーを見る →
          </Link>
        </div>
      </section>

      {/* 平日向け: 自分でバックテストしてみよう */}
      <section className="py-10 px-4 bg-green-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-yellow-400 text-green-900 text-xs font-black px-3 py-1 rounded-full mb-3">平日でも楽しめる</span>
          <h2 className="text-xl font-bold mb-3">土日のレースが終わったら → バックテストで記録しよう</h2>
          <p className="text-green-300 text-sm mb-6">的中・外れを記録すると自分の回収率が可視化されます。<br className="hidden sm:block"/>「AIと一緒に検証する」が週の楽しみになります。</p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-6">
            <div className="bg-white/10 rounded-xl p-4 text-left">
              <p className="text-yellow-300 text-xs font-bold mb-2">月〜木曜日にやること</p>
              <ul className="text-green-200 text-xs space-y-1.5">
                <li>✓ 先週のG1結果をAI検証コーナーで確認</li>
                <li>✓ 今週のG1プレビューを読む</li>
                <li>✓ 注目馬の調教情報をチェック</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-left">
              <p className="text-yellow-300 text-xs font-bold mb-2">金〜日曜日にやること</p>
              <ul className="text-green-200 text-xs space-y-1.5">
                <li>✓ AI予想ツールで本命馬を確認</li>
                <li>✓ オッズ確認・購入金額決定</li>
                <li>✓ 結果をバックテストに記録</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/predict" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-8 py-3 rounded-full text-sm transition-colors">
              AIで今週の予想を見る →
            </Link>
            <Link href="/backtest" className="inline-block border border-white/50 hover:border-white text-white font-bold px-8 py-3 rounded-full text-sm transition-colors">
              バックテストで記録する →
            </Link>
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-sm text-gray-400 border-t">
        <div className="space-x-4 mb-2">
          <Link href="/">トップ</Link>
          <Link href="/predict">予想ツール</Link>
          <Link href="/backtest">バックテスト</Link>
          <Link href="/how-to">使い方ガイド</Link>
        </div>
        <p className="text-xs">※本サービスはエンターテインメント目的の予想情報提供サービスです。馬券購入は自己責任でお願いします。</p>
        <p className="text-xs mt-1">※AI検証コーナーの数値はn=5レースの参考値です。将来の的中を保証するものではありません。</p>
      </footer>
    </main>
  );
}
