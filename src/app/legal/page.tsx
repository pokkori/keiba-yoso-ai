import Link from "next/link";

const ITEMS = [
  { label: "販売業者", value: "新美諭" },
  { label: "電話番号", value: "090-6093-5290" },
  { label: "運営責任者", value: "ポッコリラボ 代表 新美諭" },
  { label: "所在地", value: "請求があれば遅滞なく開示します" },
  { label: "お問い合わせ", value: "levonadesign@gmail.com（X: @levona_design）" },
  { label: "販売価格", value: "ベーシックプラン ¥980/月、プロプラン ¥2,980/月、年間プラン ¥19,800/年（税込）" },
  { label: "支払方法", value: "クレジットカード（オンライン決済サービス経由）（Visa・Mastercard・American Express・JCB）" },
  { label: "支払時期", value: "お申込み時に即時決済。以降、毎月同日に自動更新" },
  { label: "サービス提供時期", value: "決済完了後、即時ご利用いただけます" },
  { label: "返品・キャンセル", value: "デジタルコンテンツの性質上、決済完了後の返金は承っておりません。解約はいつでもマイページより行えます。解約後は次回更新日まで引き続きご利用いただけます" },
  { label: "動作環境", value: "インターネット接続環境および最新版ブラウザが必要です" },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen relative" style={{ background: "linear-gradient(135deg, #0a1a0e 0%, #0f1f15 25%, #0a1a0e 50%, #0d2010 75%, #0a1a0e 100%)" }}>
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, #16a34a, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #22c55e, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm mb-8 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ホームに戻る
        </Link>

        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">特定商取引法に基づく表記</h1>
        <p className="text-gray-500 text-sm mb-8">Act on Specified Commercial Transactions</p>

        <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <dl className="space-y-4">
            {ITEMS.map((item) => (
              <div key={item.label} className="border-b border-white/10 pb-4">
                <dt className="text-xs font-semibold text-emerald-400 mb-1">{item.label}</dt>
                <dd className="text-gray-300 text-sm leading-relaxed">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-6 rounded-xl p-4 space-y-3" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <p className="text-yellow-300 text-xs leading-relaxed font-bold">【重要事項・景品表示法に基づく表示】</p>
          <p className="text-yellow-200 text-xs leading-relaxed">
            本サービスはエンターテインメント目的のAI競馬予想情報提供サービスです。馬券の購入・的中・収益を保証するものではありません。
          </p>
          <p className="text-yellow-200 text-xs leading-relaxed">
            【過去実績について】当サービスが表示する的中率・回収率等の数値は、特定の測定期間・特定の馬券種・特定の購入条件のもとで算出された過去の統計値です。サンプル数が少ない場合は統計的信頼性が低く、実際の成績と大きく乖離する可能性があります。過去の実績は将来の成果を一切保証するものではありません。
          </p>
          <p className="text-yellow-200 text-xs leading-relaxed">
            【AI予想の根拠】本サービスのAI予想は、公開データを用いた機械学習モデルによる確率的な推定です。予想根拠・モデルの詳細はバックテストページをご参照ください。予想は情報提供を目的とするものであり、馬券購入の最終判断はお客様ご自身が行ってください。
          </p>
          <p className="text-yellow-200 text-xs leading-relaxed">
            ギャンブル等依存症でお困りの方は公益財団法人 日本依存症対策協会（0570-064-556）にご相談ください。18歳未満の方のご利用はお断りしています。
          </p>
        </div>
      </div>
    </div>
  );
}
