import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen relative" style={{ background: "linear-gradient(135deg, #0a1a0e 0%, #0f1f15 25%, #0a1a0e 50%, #0d2010 75%, #0a1a0e 100%)" }}>
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, #16a34a, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #22c55e, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12 text-sm text-gray-300 leading-relaxed space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ホームに戻る
        </Link>

        <h1 className="text-2xl font-bold text-white">プライバシーポリシー</h1>

        <section>
          <h2 className="font-bold text-base mb-2 text-emerald-300">1. 収集する情報</h2>
          <p>本サービスでは、サービス提供のために以下の情報を取得することがあります。</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>お問い合わせ時に入力いただいたメールアドレス</li>
            <li>決済時にKOMOJU / PAY.JP が収集する支払情報（当社はカード番号を保持しません）</li>
            <li>ブラウザのCookieおよびlocalStorage（利用回数の管理）</li>
            <li>アクセスログ（IPアドレス・ブラウザ種別・閲覧ページ）</li>
            <li>競馬予想のためにユーザーが入力したレース情報・条件等</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-emerald-300">2. 利用目的</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>サービスの提供・運営・改善</li>
            <li>お問い合わせへの回答</li>
            <li>不正利用の検知と防止</li>
            <li>利用状況の分析（匿名・統計的処理）</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-emerald-300">3. 第三者提供</h2>
          <p>当社は、以下の場合を除き、取得した個人情報を第三者に提供しません。</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>ご本人の同意がある場合</li>
            <li>法令に基づき開示が必要な場合</li>
            <li>決済処理のためKOMOJU / PAY.JPに提供する場合</li>
            <li>AI予想生成のためAnthropic社のClaude APIに送信する場合</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-emerald-300">4. Cookieの使用</h2>
          <p>本サービスでは、無料利用回数の管理・セッション管理のためにCookieを使用しています。ブラウザの設定からCookieを無効にすることができますが、一部機能が利用できなくなる場合があります。</p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-emerald-300">5. 外部送信規律に基づく情報送信</h2>
          <p className="mb-3">電気通信事業法の外部送信規律に基づき、以下の外部サービスにデータを送信しています。</p>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "rgba(22,163,74,0.15)" }}>
                  <th className="text-left px-4 py-3 text-emerald-300 font-semibold">送信先</th>
                  <th className="text-left px-4 py-3 text-emerald-300 font-semibold">目的</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Anthropic（Claude API）", "AI競馬予想の生成"],
                  ["KOMOJU / PAY.JP", "決済処理"],
                  ["Vercel Inc.", "ホスティング・アクセス解析"],
                ].map(([dest, purpose]) => (
                  <tr key={dest} className="border-t border-white/10">
                    <td className="px-4 py-3 text-gray-300">{dest}</td>
                    <td className="px-4 py-3 text-gray-400">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-emerald-300">6. 安全管理</h2>
          <p>個人情報への不正アクセス・紛失・漏洩等を防止するため、適切なセキュリティ対策を講じています。</p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-emerald-300">7. お問い合わせ</h2>
          <p>個人情報の取扱いに関するお問い合わせは X(Twitter) @levona_design へのDM までご連絡ください。</p>
        </section>

        <p className="text-gray-500 text-xs pt-4 border-t border-white/10">制定日：2025年1月1日</p>
      </div>
    </div>
  );
}
