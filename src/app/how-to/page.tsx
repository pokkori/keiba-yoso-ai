import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI予想の正しい使い方・買い方・資金管理 | 競馬予想AI",
  description: "競馬予想AIの正しい活用法を解説。複勝中心の買い方、資金管理の基本、オッズ別の期待値、AIが苦手なレースのスキップ方法まで徹底ガイド。",
};

export default function HowToPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-4 py-4 border-b border-green-200 bg-green-900 sticky top-0 z-10">
        <Link href="/" className="text-base md:text-xl font-bold text-white">競馬予想AI</Link>
        <div className="flex items-center gap-3">
          <Link href="/predict" className="bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-4 py-1.5 rounded-full text-sm transition-colors">
            無料で試す
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* タイトル */}
        <div className="text-center mb-10">
          <span className="inline-block bg-yellow-400 text-green-900 text-xs font-black px-3 py-1 rounded-full mb-3">活用ガイド</span>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">AI予想の正しい使い方・買い方・資金管理</h1>
          <p className="text-gray-500 text-sm">AIは「予想の道具」です。このガイドを読んで、賢く活用しましょう。</p>
        </div>

        {/* 目次 */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-10">
          <p className="font-bold text-green-800 text-sm mb-3">このページの内容</p>
          <ol className="space-y-1 text-sm text-green-700">
            <li><a href="#step1" className="hover:underline">1. AI予想を使う前に知っておくべきこと</a></li>
            <li><a href="#step2" className="hover:underline">2. 複勝モードを使った買い方の基本</a></li>
            <li><a href="#step3" className="hover:underline">3. オッズ別・期待値の考え方</a></li>
            <li><a href="#step4" className="hover:underline">4. 資金管理の鉄則</a></li>
            <li><a href="#step5" className="hover:underline">5. スキップすべきレースの見分け方</a></li>
            <li><a href="#step6" className="hover:underline">6. AIが苦手なパターンと対処法</a></li>
          </ol>
        </div>

        {/* Step 1 */}
        <section id="step1" className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
            <h2 className="text-xl font-bold text-gray-900">AI予想を使う前に知っておくべきこと</h2>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <p className="text-yellow-800 text-sm font-bold mb-1">⚠️ 重要：AIは「参考情報」です</p>
            <p className="text-yellow-700 text-sm">本サービスはAIによる分析情報の提供サービスです。的中・収益を保証するものではありません。馬券購入は必ず自己判断で。</p>
          </div>
          <div className="space-y-3">
            {[
              { icon: "◎", title: "AIが得意なこと", desc: "出走馬の過去成績・騎手相性・コース適性・馬場状態のデータ分析。人間が30分かかる情報収集を30秒で完了。" },
              { icon: "△", title: "AIが苦手なこと", desc: "当日のパドック気配・馬の体調変化・レース中のアクシデント・オーナー・調教師の内情など、データに現れない要素。" },
              { icon: "→", title: "正しい使い方", desc: "AIの分析結果を「参考データ」として使い、最終判断は自分で行う。分析根拠を読んで「なぜこの馬か」を理解してから購入。" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                <span className="text-xl shrink-0">{item.icon}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Step 2 */}
        <section id="step2" className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
            <h2 className="text-xl font-bold text-gray-900">複勝モードを使った買い方の基本</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">初心者〜中級者には「複勝モード」をおすすめします。3着以内に入れば的中なので、単勝・馬連より的中率が高く安定しやすいからです。</p>
          <div className="bg-green-900 text-white rounded-xl p-5 mb-4">
            <p className="text-yellow-300 text-xs font-bold mb-3">複勝の的中条件比較</p>
            <div className="space-y-2 text-xs">
              {[
                { bet: "単勝", condition: "1着のみ", prob: "約10〜15%", note: "高配当だが難しい" },
                { bet: "複勝", condition: "3着以内", prob: "約30〜45%", note: "◎ 初心者向け・安定" },
                { bet: "馬連", condition: "1・2着（順不同）", prob: "約10〜15%", note: "複勝×複勝の組み合わせ" },
                { bet: "三連複", condition: "1〜3着（順不同）", prob: "約5〜8%", note: "高配当・上級者向け" },
              ].map((row, i) => (
                <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 ${row.bet === "複勝" ? "bg-yellow-400/20 border border-yellow-400/50" : "bg-white/10"}`}>
                  <span className={`font-bold ${row.bet === "複勝" ? "text-yellow-300" : "text-green-200"}`}>{row.bet}</span>
                  <span className="text-green-300">{row.condition}</span>
                  <span className={`font-black ${row.bet === "複勝" ? "text-yellow-300" : "text-white"}`}>{row.prob}</span>
                  <span className="text-green-400 text-[10px]">{row.note}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-green-800 font-bold text-sm mb-2">複勝モードの使い方 3ステップ</p>
            <ol className="space-y-2 text-sm text-green-700">
              <li className="flex items-start gap-2"><span className="font-black">①</span> <span>予想画面で「複勝モード」を選択。本命馬◎が自動で1頭選ばれます。</span></li>
              <li className="flex items-start gap-2"><span className="font-black">②</span> <span>AIが「複勝オッズ想定」「安定度スコア」「リスク要因」を表示。内容を確認します。</span></li>
              <li className="flex items-start gap-2"><span className="font-black">③</span> <span>「リスク高」判定のレースはスキップ。「安定」「やや安定」のレースだけを購入。</span></li>
            </ol>
          </div>
        </section>

        {/* Step 3 */}
        <section id="step3" className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
            <h2 className="text-xl font-bold text-gray-900">オッズ別・期待値の考え方</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">期待値（EV）とは「このオッズで何度も購入したとき、長期的に利益が出るか」を数値化したものです。複勝ではオッズ帯によって期待値の傾向が大きく変わります。</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 mb-4">
            <table className="w-full text-sm">
              <thead className="bg-green-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">複勝オッズ帯</th>
                  <th className="px-4 py-3 text-center font-bold">期待値目安</th>
                  <th className="px-4 py-3 text-center font-bold">AIの推奨</th>
                  <th className="px-4 py-3 text-left font-bold">解説</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-red-50">
                  <td className="px-4 py-3 font-bold text-red-600">1.0〜1.5倍</td>
                  <td className="px-4 py-3 text-center text-red-500 font-bold">低〜マイナス</td>
                  <td className="px-4 py-3 text-center"><span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">スキップ推奨</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600">断然人気馬。返ってくる金額がわずか。1回外れると複数レース分の損失。</td>
                </tr>
                <tr className="bg-yellow-50">
                  <td className="px-4 py-3 font-bold text-yellow-700">1.5〜2.0倍</td>
                  <td className="px-4 py-3 text-center text-yellow-600 font-bold">やや低め</td>
                  <td className="px-4 py-3 text-center"><span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">条件次第</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600">AIのスコアが80点以上かつ「リスク低」の場合のみ検討。安定感は高いが旨みは薄い。</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="px-4 py-3 font-bold text-green-700">2.0〜5.0倍</td>
                  <td className="px-4 py-3 text-center text-green-600 font-bold">◎ ベスト</td>
                  <td className="px-4 py-3 text-center"><span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">積極推奨</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600">的中率と配当のバランスが最も良い帯域。AIが最も重視するゾーン。複数回の外れをカバーできる。</td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="px-4 py-3 font-bold text-blue-700">5.0〜10.0倍</td>
                  <td className="px-4 py-3 text-center text-blue-600 font-bold">高リターン</td>
                  <td className="px-4 py-3 text-center"><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">少額勝負</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600">高配当だが的中率が下がる。AIが「穴推奨」を出したときのみ、少額で勝負する使い方がおすすめ。</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-500">10倍超</td>
                  <td className="px-4 py-3 text-center text-gray-400 font-bold">ギャンブル</td>
                  <td className="px-4 py-3 text-center"><span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-full">基本スキップ</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600">的中率が非常に低い。AIは基本的にこの馬の推奨は出さない。</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 font-bold text-sm mb-1">期待値ポイント</p>
            <p className="text-amber-700 text-xs leading-relaxed">競馬の控除率は約20〜25%です。つまり「全レースをランダムに購入し続けると長期的には75〜80%しか返ってきません」。AIを使うことで、期待値の高いレース・馬に絞り込み、控除率の壁を越えることを目指します。</p>
          </div>
        </section>

        {/* Step 4 */}
        <section id="step4" className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
            <h2 className="text-xl font-bold text-gray-900">資金管理の鉄則</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">どんなに精度の高い予想も、資金管理が甘いとマイナスになります。以下のルールを守ることが長期的なプラス収支への近道です。</p>
          <div className="space-y-4">
            {[
              {
                rule: "1レースの賭け金は総資金の5〜10%以内",
                detail: "例：月の競馬予算が10,000円なら、1レースは500〜1,000円まで。大きく賭けると一度の外れで再起不能になる。",
                badge: "鉄則 ①",
                color: "bg-green-700",
              },
              {
                rule: "「必ず取り返そう」と思ったらその日は終了",
                detail: "負けを取り戻そうとして賭け金を増やすのは最悪のパターン。冷静な判断ができなくなった時点でやめることが資産を守る最善策。",
                badge: "鉄則 ②",
                color: "bg-green-700",
              },
              {
                rule: "週の最大損失額を事前に決める",
                detail: "「今週は最大5,000円まで」と決めてから始める。損失上限に達したらその週は終了。回収率トラッキングで記録することで客観視できる。",
                badge: "鉄則 ③",
                color: "bg-green-700",
              },
              {
                rule: "AIが「スキップ推奨」を出したレースは買わない",
                detail: "混戦・ハイリスク判定のレースはAIが自信を持って推奨できないレース。「強い馬がいないから全馬に可能性」という状況は複勝でも危険。",
                badge: "鉄則 ④",
                color: "bg-green-700",
              },
            ].map((item, i) => (
              <div key={i} className="bg-white border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <span className={`${item.color} text-white text-xs font-black px-2 py-1 rounded-full shrink-0 whitespace-nowrap`}>{item.badge}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm mb-1">{item.rule}</p>
                  <p className="text-gray-600 text-xs leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Step 5 */}
        <section id="step5" className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">5</div>
            <h2 className="text-xl font-bold text-gray-900">スキップすべきレースの見分け方</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">「買わない」という選択が回収率を大きく改善します。以下に当てはまるレースはスキップを推奨します。</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: "×", title: "フルゲート（18頭立て）のハンデ戦", desc: "頭数が多くハンデ差があるレースは波乱率が高い。AIの精度が落ちるパターン。" },
              { icon: "×", title: "新馬戦・未勝利の初出走組多数", desc: "過去成績データが少ない馬が多く、AIの分析根拠が薄くなる。" },
              { icon: "×", title: "雨天後の重・不良馬場", desc: "馬場が荒れると脚質・適性が大きく変わり、通常の分析が通用しにくい。" },
              { icon: "×", title: "長期休み明けの有力馬多数", desc: "休み明けの馬の仕上がりはデータに現れない。パドック確認が必須。" },
              { icon: "×", title: "AIのリスクスコアが「高」", desc: "AIが自信を持てないレースは「スキップ推奨」を表示。この判断を信頼する。" },
              { icon: "×", title: "騎手・調教師の乗替わりが多いレース", desc: "コンビの変更が多いほどデータの信頼性が下がる。" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-3">
                <span className="text-lg shrink-0">{item.icon}</span>
                <div>
                  <p className="font-bold text-gray-900 text-xs mb-0.5">{item.title}</p>
                  <p className="text-gray-600 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Step 6 */}
        <section id="step6" className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">6</div>
            <h2 className="text-xl font-bold text-gray-900">AIが苦手なパターンと対処法</h2>
          </div>
          <div className="space-y-3">
            {[
              { pattern: "大穴馬（10番人気以下）の激走", howto: "人気薄の馬は過去実績が少なく、AIスコアが低くなりがち。馬場変化や騎手変更など「プラス要因」が重なっているかは自分で確認。" },
              { pattern: "パドック気配の異変", howto: "AIはデータ分析のみ。当日の馬の様子（発汗・歩様・毛艶）は現地・映像で確認。AIの本命馬でも気配が悪ければスキップが賢明。" },
              { pattern: "レース中の展開・ペース", howto: "スローペースになると差し馬が有利になる。AIは傾向を分析するが「この日のペース」は不確定要素。展開予測も一つの参考として使う。" },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-bold text-gray-800 mb-1">注意: {item.pattern}</p>
                <p className="text-xs text-gray-600 leading-relaxed">対処法: {item.howto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* まとめCTA */}
        {/* 過去G1検証コーナーへの導線 */}
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-2xl font-bold text-green-700">→</span>
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">「AIが当てた・外した」検証コーナー（平日も読める）</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                直近G1でAIが的中・外れした全レースを公開しています。なぜ当たったか・なぜ外れたかの解説付き。
                土日のレースがない平日でも、分析力を磨くために読んでおきましょう。
              </p>
              <Link href="/news#ai-verification" className="inline-block bg-green-700 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-green-800 transition-colors">
                AI的中検証コーナーを見る →
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-green-900 text-white rounded-2xl p-6 text-center">
          <p className="text-yellow-300 text-xs font-bold mb-2 tracking-widest uppercase">まとめ</p>
          <h2 className="text-lg font-bold mb-3">AIと自分の判断を組み合わせて、賢く楽しもう</h2>
          <p className="text-green-200 text-sm mb-6 leading-relaxed">AIは「データ収集と分析」を担当し、あなたは「最終判断と資金管理」を担当する。このパートナーシップが長期的なプラス収支への道です。</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/predict" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-8 rounded-full text-sm transition-colors">
              実際に予想を試してみる →
            </Link>
            <Link href="/backtest" className="inline-block border border-white/50 hover:border-white text-white font-bold py-3 px-8 rounded-full text-sm transition-colors">
              バックテスト実績を確認する
            </Link>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-8">※本ページの情報は競馬予想AIの活用方法に関する一般的な解説です。馬券購入の判断はご自身の責任で行ってください。競馬は公営競技です。ギャンブル依存症でお悩みの方は<a href="https://www.ncasa-japan.jp/" target="_blank" rel="noopener noreferrer" className="underline">こちら</a>にご相談ください。</p>
      </div>
    </div>
  );
}
