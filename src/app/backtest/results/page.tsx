import Link from "next/link";

export const metadata = {
  title: "バックテスト実績公開 | 競馬予想AI",
  description:
    "競馬予想AIの複勝モードによる実際の予想実績を全公開（参考値）。的中も外れも隠しません。過去の実績は将来の的中・収益を保証するものではありません。",
};

const SUMMARY_STATS = [
  { num: "38%", label: "複勝的中率", sub: "13レース中5レース的中" },
  { num: "61%", label: "複勝回収率", sub: "¥1,300投資 → ¥790回収" },
  { num: "-¥510", label: "収支合計", sub: "2026年1〜3月実績（13レース）", negative: true },
];

const RACE_RESULTS: {
  date: string; race: string; venue: string; horse: string;
  result: string; hit: boolean; pnl: string; note: string;
}[] = [
  {
    date: "2026/1/4",
    race: "招福S",
    venue: "中山 9R",
    horse: "1番",
    result: "圏外",
    hit: false,
    pnl: "-¥100",
    note: "初戦外れ。少頭数だったが展開が合わず。",
  },
  {
    date: "2026/1/4",
    race: "中山金杯 (G3)",
    venue: "中山 11R",
    horse: "7番",
    result: "圏外",
    hit: false,
    pnl: "-¥100",
    note: "重賞レース。人気馬を推奨したが展開不利。",
  },
  {
    date: "2026/1/4",
    race: "天ケ瀬特別",
    venue: "京都 9R",
    horse: "9番 グランドプラージュ",
    result: "複勝的中",
    hit: true,
    pnl: "+¥10",
    note: "的中だが複勝オッズが低く微益。安定度の高い馬を選定。",
  },
  {
    date: "2026/1/4",
    race: "寿S",
    venue: "京都 10R",
    horse: "5番",
    result: "圏外",
    hit: false,
    pnl: "-¥100",
    note: "特別戦。複数の有力馬がいる混戦で外れ。",
  },
  {
    date: "2026/1/5",
    race: "中山新春JS (障害)",
    venue: "中山 8R",
    horse: "6番 フォージドブリック",
    result: "複勝的中",
    hit: true,
    pnl: "+¥120",
    note: "障害レースでの的中。競走得点と安定度を重視した推奨。複勝¥220回収。",
  },
  {
    date: "2026/1/5",
    race: "初茜賞",
    venue: "中山 9R",
    horse: "7番",
    result: "圏外",
    hit: false,
    pnl: "-¥100",
    note: "展開不利で圏外。",
  },
  {
    date: "2026/1/5",
    race: "初日の出賞",
    venue: "中山 10R",
    horse: "1番 ダンツファイター",
    result: "複勝的中",
    hit: true,
    pnl: "+¥50",
    note: "人気馬が順当に的中。複勝¥150。安定重視の推奨が奏功。",
  },
  {
    date: "2026/1/5",
    race: "サンライズS",
    venue: "中山 11R",
    horse: "10番",
    result: "圏外",
    hit: false,
    pnl: "-¥100",
    note: "特別戦。外枠推奨が裏目に。",
  },
  {
    date: "2026/1/5",
    race: "逢坂山特別",
    venue: "京都 9R",
    horse: "4番 ナイトスラッガー",
    result: "複勝的中",
    hit: true,
    pnl: "+¥60",
    note: "的中。安定度スコアが高い馬を推奨。複勝¥160。",
  },
  {
    date: "2026/1/5",
    race: "万葉S",
    venue: "京都 11R",
    horse: "8番",
    result: "圏外",
    hit: false,
    pnl: "-¥100",
    note: "長距離重賞。展開読みが外れ。",
  },
  {
    date: "2026/1/11",
    race: "初咲賞",
    venue: "中山 9R",
    horse: "2番 ビターグラッセ",
    result: "複勝的中",
    hit: true,
    pnl: "+¥50",
    note: "安定的中。複勝¥150。安定度重視の推奨が有効。",
  },
  {
    date: "2026/1/11",
    race: "五条坂特別",
    venue: "京都 9R",
    horse: "10番",
    result: "圏外",
    hit: false,
    pnl: "-¥100",
    note: "特別戦。推奨馬が伸びず。",
  },
  {
    date: "2026/1/12",
    race: "琵琶湖特別",
    venue: "京都 9R",
    horse: "12番",
    result: "圏外",
    hit: false,
    pnl: "-¥100",
    note: "大外枠推奨が裏目。枠順の影響を再検討必要。",
  },
];

const TOTAL_INVEST = 1300;
const TOTAL_RETURN = 790;
const TOTAL_PNL = TOTAL_RETURN - TOTAL_INVEST;
const SKIP_COUNT = 16;

const ALGORITHM_POINTS = [
  {
    title: "リアル出走表データで分析",
    desc: "netkeibaから出走馬・騎手・過去5走成績・斤量をリアルタイム取得。感覚ではなく実データで判断します。",
  },
  {
    title: "複勝安定度スコアで絞り込み",
    desc: "「3着以内に来やすい馬」を独自スコアで評価。人気に関係なく安定して複勝圏に来る馬を選定します。",
  },
  {
    title: "荒れレースは積極スキップ",
    desc: "40レース中16レースをスキップ判定。大荒れが予測されるレースはベット対象外として無駄な損失を防ぎます。",
  },
];

export default function BacktestResultsPage() {
  const hitCount = RACE_RESULTS.filter((r) => r.hit).length;
  const betCount = RACE_RESULTS.length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-green-800 bg-green-950 sticky top-0 z-10">
        <Link href="/" className="text-xl font-bold text-white">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="inline-block mr-2 -mt-1">
            <circle cx="14" cy="14" r="13" stroke="#22c55e" strokeWidth="2" fill="none" />
            <path d="M8 18 Q10 10 14 14 Q18 18 20 10" stroke="#fbbf24" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
          競馬予想AI
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/predict" className="text-sm text-green-300 hover:text-white transition-colors">予想する</Link>
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
        <p className="text-gray-500 text-sm">※各レース¥100投資・複勝買い想定。2026年1月の特別戦以上を対象にテスト。</p>
      </section>

      {/* Summary Stats */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-gray-300 text-center mb-2">
            2026年1〜3月 バックテスト実績サマリー
          </h2>
          <p className="text-xs text-yellow-600 text-center mb-6 bg-yellow-950/30 border border-yellow-700/30 rounded-lg px-4 py-2">
            過去13件のバックテストに基づく参考値です。投資・回収を保証するものではありません。
          </p>
          <div className="grid grid-cols-3 gap-4">
            {SUMMARY_STATS.map((s) => (
              <div
                key={s.label}
                className="bg-gray-900 border border-green-800 rounded-2xl p-5 text-center"
              >
                <div className={`text-3xl md:text-4xl font-bold mb-1 ${
                  "negative" in s && s.negative ? "text-red-400" : "text-yellow-400"
                }`}>{s.num}</div>
                <div className="text-sm font-bold text-white mb-0.5">{s.label}</div>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">{SKIP_COUNT}</div>
              <div className="text-xs text-gray-500">スキップ判定レース</div>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">40</div>
              <div className="text-xs text-gray-500">対象レース総数</div>
            </div>
          </div>
        </div>
      </section>

      {/* Race Results Table */}
      <section className="py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-gray-300 mb-6">レース別結果（全{betCount}レース）</h2>
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
                {RACE_RESULTS.map((r, i) => (
                  <tr
                    key={`${r.race}-${i}`}
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
                          {r.result}
                        </span>
                      ) : (
                        <span className="bg-red-700/70 text-red-200 text-xs font-bold px-3 py-1 rounded-full">
                          {r.result}
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
                  <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-300">
                    合計（{betCount}レース / スキップ{SKIP_COUNT}レース）
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${TOTAL_PNL >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                    {TOTAL_PNL >= 0 ? "+" : ""}&yen;{TOTAL_PNL.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Race Notes */}
          <div className="mt-6 space-y-3">
            {RACE_RESULTS.filter(r => r.note).map((r, i) => (
              <div
                key={`${r.race}_note_${i}`}
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

      {/* Analysis Section */}
      <section className="py-10 px-6 bg-gray-900/50 border-y border-gray-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-3">バックテスト分析</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-950 border border-gray-700 rounded-xl p-5">
              <h3 className="font-bold text-yellow-400 mb-2">的中パターン</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>- 安定度重視の推奨が的中に繋がりやすい</li>
                <li>- 人気馬推奨時は低配当だが的中率高</li>
                <li>- 障害戦でも分析が有効</li>
              </ul>
            </div>
            <div className="bg-gray-950 border border-gray-700 rounded-xl p-5">
              <h3 className="font-bold text-red-400 mb-2">改善ポイント</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>- 外枠推奨の精度向上が必要</li>
                <li>- 展開予測の精度を強化</li>
                <li>- 中穴馬の選定精度を改善</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Algorithm Explanation */}
      <section className="py-14 px-6 bg-gray-900 border-y border-gray-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-3">予測アルゴリズムの3原則</h2>
          <p className="text-gray-400 text-sm text-center mb-10">
            データドリブンな予想で長期的な収益を目指します。
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {ALGORITHM_POINTS.map((p) => (
              <div
                key={p.title}
                className="bg-gray-950 border border-gray-700 rounded-2xl p-6"
              >
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
          <div className="bg-yellow-950/30 border border-yellow-700/50 rounded-xl p-4 mb-8">
            <p className="text-yellow-300 text-sm font-bold mb-1">現在のバックテスト状況</p>
            <p className="text-gray-400 text-xs">
              テスト中（13/40レース完了）。追加データを順次収集中です。
              サンプル数が増えるほど統計的信頼性が向上します。
            </p>
          </div>
          <p className="text-gray-500 text-xs mb-8 leading-relaxed">
            ※本ページの実績はAIの複勝モードによる予想結果です。¥100/レース投資・複勝買いを想定した参考値であり、
            将来の的中・収益を保証するものではありません。馬券購入は各自の判断と責任で行ってください。
            競馬は公営競技であり、未成年の方の馬券購入は法律で禁止されています。
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
              プランを選ぶ
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
        <span>&copy; 2026 競馬予想AI</span>
      </footer>
    </div>
  );
}
