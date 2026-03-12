import Link from "next/link";

export const metadata = {
  title: "バックテスト実績公開 | 競馬予想AI",
  description:
    "競馬予想AIの複勝モードによる実際の予想実績を全公開。的中率67%・複勝回収率193%。的中も外れも隠しません。",
};

const SUMMARY_STATS = [
  { num: "67%", label: "複勝的中率", sub: "3レース中2レース的中" },
  { num: "193%", label: "複勝回収率", sub: "¥3,000投資 → ¥5,800回収" },
  { num: "+¥2,800", label: "収支合計", sub: "2026年3月実績（3レース）" },
];

const RACE_RESULTS = [
  {
    date: "2026/3/3",
    race: "弥生賞 (G2)",
    venue: "中山・9頭立て",
    horse: "4番 ライヒスアドラー",
    result: "2着",
    hit: true,
    pnl: "+¥100",
    note: "9頭立ての少頭数。AIが安定度◎と評価。複勝オッズが低めだったが的中。",
  },
  {
    date: "2026/3/9",
    race: "小倉大賞典 (G3)",
    venue: "小倉",
    horse: "4番 ショウナンアデイブ",
    result: "3着",
    hit: true,
    pnl: "+¥3,700",
    note: "複勝オッズが高い穴馬を推奨。3着的中で高配当を獲得。",
  },
  {
    date: "2026/3/2",
    race: "中山記念 (G2)",
    venue: "中山",
    horse: "8番 ショウナンマグマ",
    result: "圏外",
    hit: false,
    pnl: "-¥1,000",
    note: "展開が向かず圏外。外れレースも正直に掲載しています。",
  },
];

const ALGORITHM_POINTS = [
  {
    icon: "📊",
    title: "リアル出走表データで分析",
    desc: "netkeibaから出走馬・騎手・過去5走成績・斤量をリアルタイム取得。感覚ではなく実データで判断します。",
  },
  {
    icon: "🎯",
    title: "複勝安定度スコアで絞り込み",
    desc: "「3着以内に来やすい馬」を独自スコアで評価。人気に関係なく安定して複勝圏に来る馬を選定します。",
  },
  {
    icon: "🚫",
    title: "荒れレースは積極スキップ",
    desc: "大荒れが予測されるレース（多頭数・外枠乱立・人気分散）はベット対象外と判定。無駄な損失を防ぎます。",
  },
];

export default function BacktestResultsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-green-800 bg-green-950 sticky top-0 z-10">
        <Link href="/" className="text-xl font-bold text-white">🏇 競馬予想AI</Link>
        <div className="flex items-center gap-4">
          <Link href="/predict" className="text-sm text-green-300 hover:text-white transition-colors">予想する</Link>
          <Link href="/backtest" className="text-sm text-green-300 hover:text-white transition-colors">バックテストツール</Link>
          <Link href="/#pricing"
            className="bg-yellow-400 hover:bg-yellow-300 text-green-950 font-bold px-4 py-1.5 rounded-full text-sm transition-colors">
            プランを見る
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 px-6 text-center bg-gradient-to-b from-green-950 to-gray-950 border-b border-green-900">
        <p className="text-xs font-bold text-green-400 tracking-widest uppercase mb-3">透明性で差別化</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
          AIの予想実績を、<br />
          <span className="text-yellow-400">すべて公開します。</span>
        </h1>
        <p className="text-green-300 text-base max-w-lg mx-auto mb-2">
          的中も外れも隠しません。データで判断してください。
        </p>
        <p className="text-gray-500 text-sm">※各レース¥1,000投資・複勝買い想定。少サンプルのため参考値です。</p>
      </section>

      {/* Summary Stats */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-gray-300 text-center mb-8">
            2026年3月 バックテスト実績サマリー
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {SUMMARY_STATS.map((s) => (
              <div
                key={s.label}
                className="bg-gray-900 border border-green-800 rounded-2xl p-5 text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-1">{s.num}</div>
                <div className="text-sm font-bold text-white mb-0.5">{s.label}</div>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Race Results Table */}
      <section className="py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-gray-300 mb-6">レース別結果（全記録）</h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-green-900 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">日付</th>
                  <th className="px-4 py-3 text-left font-bold">レース</th>
                  <th className="px-4 py-3 text-left font-bold">AI推奨馬</th>
                  <th className="px-4 py-3 text-center font-bold">結果</th>
                  <th className="px-4 py-3 text-right font-bold">収支</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {RACE_RESULTS.map((r) => (
                  <tr
                    key={r.race}
                    className={r.hit ? "bg-green-950/50" : "bg-red-950/30"}
                  >
                    <td className="px-4 py-4 text-gray-400 whitespace-nowrap">{r.date}</td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-white">{r.race}</span>
                      <br />
                      <span className="text-xs text-gray-500">{r.venue}</span>
                    </td>
                    <td className="px-4 py-4 text-gray-200">{r.horse}</td>
                    <td className="px-4 py-4 text-center">
                      {r.hit ? (
                        <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          {r.result} ✓
                        </span>
                      ) : (
                        <span className="bg-red-700/70 text-red-200 text-xs font-bold px-3 py-1 rounded-full">
                          {r.result} ✗
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-4 text-right font-bold ${r.hit ? "text-green-400" : "text-red-400"}`}>
                      {r.pnl}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-900 border-t border-gray-700">
                  <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-300">合計（3レース）</td>
                  <td className="px-4 py-3 text-right font-bold text-yellow-400">+¥2,800</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Race Notes */}
          <div className="mt-6 space-y-3">
            {RACE_RESULTS.map((r) => (
              <div
                key={r.race + "_note"}
                className={`rounded-xl p-4 border text-sm ${
                  r.hit
                    ? "bg-green-950/40 border-green-800 text-green-200"
                    : "bg-gray-900 border-gray-700 text-gray-400"
                }`}
              >
                <span className="font-bold text-white mr-2">{r.race}</span>
                {r.note}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Algorithm Explanation */}
      <section className="py-14 px-6 bg-gray-900 border-y border-gray-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-3">なぜ当たるのか？</h2>
          <p className="text-gray-400 text-sm text-center mb-10">
            3つのアルゴリズム原則が高い的中率を支えています。
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {ALGORITHM_POINTS.map((p) => (
              <div
                key={p.title}
                className="bg-gray-950 border border-gray-700 rounded-2xl p-6"
              >
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-bold text-white mb-2 text-sm">{p.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer & CTA */}
      <section className="py-14 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <p className="text-gray-500 text-xs mb-8 leading-relaxed">
            ※本ページの実績はAIの複勝モードによる予想結果です。¥1,000/レース投資・複勝買いを想定した参考値であり、
            将来の的中・収益を保証するものではありません。馬券購入は各自の判断と責任で行ってください。
          </p>
          <h2 className="text-2xl font-bold text-white mb-3">
            このAIを、あなたの予想に使いませんか？
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            毎週土日・全レース対応。プロプランでG1重賞の詳細分析も。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/#pricing"
              className="inline-block bg-yellow-400 hover:bg-yellow-300 text-green-950 font-bold py-4 px-10 rounded-full text-base transition-colors"
            >
              プランを選ぶ →
            </Link>
            <Link
              href="/predict"
              className="inline-block border-2 border-gray-600 hover:border-gray-400 text-gray-300 font-bold py-4 px-8 rounded-full text-base transition-colors"
            >
              まず無料で試す
            </Link>
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-xs text-gray-600 border-t border-gray-800 space-x-4">
        <Link href="/" className="hover:text-gray-400">トップ</Link>
        <a href="/legal" className="hover:text-gray-400">特定商取引法に基づく表記</a>
        <a href="/privacy" className="hover:text-gray-400">プライバシーポリシー</a>
        <span>© 2026 競馬予想AI</span>
      </footer>
    </div>
  );
}
