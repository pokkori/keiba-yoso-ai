import Link from "next/link";

export default function TermsPage() {
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

        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">利用規約</h1>
        <p className="text-gray-500 text-sm mb-8">Terms of Service</p>

        <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="space-y-8 text-sm text-gray-300 leading-relaxed">
            <section>
              <h2 className="font-bold text-base mb-2 text-emerald-300">第1条（適用）</h2>
              <p>競馬予想AI（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本規約に同意の上、本サービスをご利用ください。</p>
            </section>
            <section>
              <h2 className="font-bold text-base mb-2 text-emerald-300">第2条（サービス内容）</h2>
              <p>本サービスは、AIを活用した競馬予想情報提供サービスです。AIの回答はあくまで参考情報であり、正確性・完全性を保証するものではありません。</p>
            </section>
            <section>
              <h2 className="font-bold text-base mb-2 text-emerald-300">第3条（利用資格）</h2>
              <p>本サービスは20歳以上の方のみご利用いただけます。20歳未満の方のご利用はお断りします。</p>
            </section>
            <section>
              <h2 className="font-bold text-base mb-2 text-emerald-300">第4条（禁止事項）</h2>
              <p>以下の行為を禁止します：法令違反、他者への迷惑行為、サービスの逆コンパイル・改ざん、不正アクセス、商業目的での無断転載。</p>
            </section>
            <section>
              <h2 className="font-bold text-base mb-2 text-emerald-300">第5条（免責事項）</h2>
              <p className="mb-3">本サービスの利用によって生じた損害について、運営者は一切の責任を負いません。AIの分析結果を参考にした行動の結果についても同様です。</p>
              <div className="rounded-xl p-4" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                <ul className="space-y-2 text-yellow-200 text-sm">
                  <li>本サービスはエンターテインメント目的の予想情報提供サービスです。</li>
                  <li>馬券の購入を推奨するものではありません。</li>
                  <li>投票の結果生じた損失について当社は一切責任を負いません。</li>
                  <li>過去の予想成績は将来の成績を保証するものではありません。</li>
                </ul>
              </div>
            </section>
            <section>
              <h2 className="font-bold text-base mb-2 text-emerald-300">第6条（サービスの変更・停止）</h2>
              <p>運営者は予告なく本サービスの内容を変更・停止することがあります。</p>
            </section>
            <section>
              <h2 className="font-bold text-base mb-2 text-emerald-300">第7条（準拠法）</h2>
              <p>本規約は日本法に準拠し、東京地方裁判所を専属的合意管轄裁判所とします。</p>
            </section>
          </div>
        </div>

        <p className="text-gray-500 text-xs pt-6 mt-6 border-t border-white/10">制定日：2026年1月1日</p>
      </div>
    </div>
  );
}
