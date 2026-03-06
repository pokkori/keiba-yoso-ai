import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-green-900 px-6 py-4">
        <Link href="/" className="text-white font-bold">🏇 競馬予想AI</Link>
      </nav>
      <div className="max-w-2xl mx-auto px-6 py-12 text-sm text-gray-700 leading-relaxed space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">プライバシーポリシー</h1>

        <section>
          <h2 className="font-bold text-base mb-2">1. 収集する情報</h2>
          <p>本サービスでは、サービス提供のために以下の情報を取得することがあります。</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
            <li>お問い合わせ時に入力いただいたメールアドレス</li>
            <li>決済時にStripe社が収集する支払情報（当社はカード番号を保持しません）</li>
            <li>ブラウザのCookieおよびlocalStorage（利用回数の管理）</li>
            <li>アクセスログ（IPアドレス・ブラウザ種別・閲覧ページ）</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">2. 利用目的</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>サービスの提供・運営・改善</li>
            <li>お問い合わせへの回答</li>
            <li>不正利用の検知と防止</li>
            <li>利用状況の分析（匿名・統計的処理）</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">3. 第三者提供</h2>
          <p>当社は、以下の場合を除き、取得した個人情報を第三者に提供しません。</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
            <li>ご本人の同意がある場合</li>
            <li>法令に基づき開示が必要な場合</li>
            <li>決済処理のためStripe, Inc.に提供する場合（Stripe社のプライバシーポリシーに従います）</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">4. Cookieの使用</h2>
          <p>本サービスでは、無料利用回数の管理・セッション管理のためにCookieを使用しています。ブラウザの設定からCookieを無効にすることができますが、一部機能が利用できなくなる場合があります。</p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">5. 安全管理</h2>
          <p>個人情報への不正アクセス・紛失・漏洩等を防止するため、適切なセキュリティ対策を講じています。</p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">6. お問い合わせ</h2>
          <p>個人情報の取扱いに関するお問い合わせは support@example.com までご連絡ください。</p>
        </section>

        <p className="text-gray-400 text-xs pt-4 border-t">制定日：2025年1月1日</p>
      </div>
    </div>
  );
}
