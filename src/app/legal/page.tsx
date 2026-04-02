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
    <div className="min-h-screen bg-white">
      <nav className="bg-green-900 px-6 py-4">
        <Link href="/" className="text-white font-bold flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
          競馬予想AI
        </Link>
      </nav>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">特定商取引法に基づく表記</h1>
        <p className="text-gray-500 text-sm mb-8">Act on Specified Commercial Transactions</p>
        <dl className="space-y-4">
          {ITEMS.map((item) => (
            <div key={item.label} className="border-b border-gray-100 pb-4">
              <dt className="text-sm font-semibold text-gray-500 mb-1">{item.label}</dt>
              <dd className="text-gray-800 text-sm leading-relaxed">{item.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-gray-400 mt-8">
          ※ 本サービスはエンターテインメント目的の予想サービスです。馬券の的中を保証するものではありません。
        </p>
      </div>
    </div>
  );
}
