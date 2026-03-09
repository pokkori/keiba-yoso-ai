import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-yellow-400 text-sm hover:opacity-80 mb-8 block">← トップに戻る</Link>
        <h1 className="text-2xl font-bold mb-2">利用規約</h1>
        <p className="text-yellow-400 text-sm mb-8">Terms of Service</p>
        <div className="space-y-8 text-sm text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-white font-bold mb-2">第1条（適用）</h2>
            <p>競馬予想AI（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本規約に同意の上、本サービスをご利用ください。</p>
          </section>
          <section>
            <h2 className="text-white font-bold mb-2">第2条（サービス内容）</h2>
            <p>本サービスは、AIを活用した情報提供サービスです。AIの回答はあくまで参考情報であり、正確性・完全性を保証するものではありません。</p>
          </section>
          <section>
            <h2 className="text-white font-bold mb-2">第3条（禁止事項）</h2>
            <p>以下の行為を禁止します：法令違反、他者への迷惑行為、サービスの逆コンパイル・改ざん、不正アクセス、商業目的での無断転載。</p>
          </section>
          <section>
            <h2 className="text-white font-bold mb-2">第4条（免責事項）</h2>
            <p>本サービスの利用によって生じた損害について、運営者は一切の責任を負いません。AIの分析結果を参考にした行動の結果についても同様です。</p>
          </section>
          <section>
            <h2 className="text-white font-bold mb-2">第5条（サービスの変更・停止）</h2>
            <p>運営者は予告なく本サービスの内容を変更・停止することがあります。</p>
          </section>
          <section>
            <h2 className="text-white font-bold mb-2">第6条（準拠法）</h2>
            <p>本規約は日本法に準拠し、東京地方裁判所を専属的合意管轄裁判所とします。</p>
          </section>
        </div>
        <p className="text-xs opacity-40 mt-12">制定日：2026年1月1日</p>
      </div>
    </main>
  );
}
