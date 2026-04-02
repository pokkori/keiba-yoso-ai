import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import FeedbackButton from "@/components/FeedbackButton";
import { AgeGate } from "@/components/AgeGate";
import CookieBanner from "@/components/CookieBanner";

const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });

const SITE_URL = "https://keiba-yoso-ai.vercel.app";
const TITLE = "競馬予想AI｜AIが30秒分析・本命◎対抗○単穴▲を即提案（参考情報）";
const DESC = "netkeiba出走馬データをAIが自動取得・分析。本命◎対抗○単穴▲と推奨買い目を30秒で提案。軍資金別配分・回収率トラッキング付き。無料1レースから。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["競馬予想", "競馬予想AI", "競馬 AI", "競馬 買い目", "競馬 本命", "複勝 AI", "競馬 回収率", "JRA予想 AI", "G1予想 AI", "競馬 初心者", "netkeiba AI分析", "競馬 無料予想"],
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏇</text></svg>" },
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: SITE_URL,
    siteName: "競馬予想AI",
    locale: "ja_JP",
    type: "website",
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: "競馬予想AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    site: "@levona_design",
    images: [`${SITE_URL}/og.png`],
  },
  metadataBase: new URL(SITE_URL),
  other: { "theme-color": "#0F0F1A" },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "ホーム", "item": SITE_URL },
    { "@type": "ListItem", "position": 2, "name": "競馬予想AIツール", "item": `${SITE_URL}/predict` },
  ],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "競馬予想AI",
      "url": SITE_URL,
      "applicationCategory": "SportApplication",
      "operatingSystem": "Web",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "JPY", "description": "無料1レースから" },
      "description": DESC,
      "inLanguage": "ja",
      "featureList": [
        "AIによる本命◎対抗○単穴▲の自動提案",
        "出走馬リアルタイムデータ取得",
        "軍資金別配分シミュレーション",
        "回収率トラッキング",
        "JRA全開催対応"
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "予想は毎週使えますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい。ベーシック・プロプランは毎週土日の全レースが無制限で使えます。JRA全開催（最大3場×12R）に対応。" } },
        { "@type": "Question", "name": "必ず当たりますか？", "acceptedAnswer": { "@type": "Answer", "text": "AIも100%の的中を保証することはできません。競馬の楽しみ方として活用いただき、余裕資金でお楽しみください。" } },
        { "@type": "Question", "name": "どのくらいのデータを使いますか？", "acceptedAnswer": { "@type": "Answer", "text": "出走馬の直近5走の成績、騎手情報、斤量、調教師などをリアルタイムで取得して分析します。" } },
        { "@type": "Question", "name": "いつでも解約できますか？", "acceptedAnswer": { "@type": "Answer", "text": "マイページから次回更新日前にいつでも解約できます。" } },
        { "@type": "Question", "name": "バックテストの的中率はどうやって計算していますか？", "acceptedAnswer": { "@type": "Answer", "text": "過去レースデータを用いて、本AIの予想ロジックを適用した場合の的中率・回収率を算出しています。単勝・複勝・馬連・ワイドの券種別に集計し、サービス内の「バックテスト結果」ページで公開しています。なお、過去の的中率は将来を保証するものではありません。" } },
        { "@type": "Question", "name": "G1レース以外にも対応していますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい。G1・G2・G3・リステッド・オープン・3勝クラス以下の条件戦まで、JRAの全レース種別に対応しています。ベーシックプラン以上で土日開催の全レースを無制限でご利用いただけます。" } },
        { "@type": "Question", "name": "地方競馬にも対応していますか？", "acceptedAnswer": { "@type": "Answer", "text": "現時点ではJRA（中央競馬）のみ対応しています。地方競馬（NAR：大井・川崎・船橋・浦和等）への対応は今後のアップデートで予定しています。" } },
        { "@type": "Question", "name": "予想が外れても返金はありますか？", "acceptedAnswer": { "@type": "Answer", "text": "予想の的中・不的中に関わらず返金はできません。本サービスは競馬の予想参考情報を提供するサービスであり、馬券の的中を保証するものではありません。余裕資金の範囲内でお楽しみください。" } },
        { "@type": "Question", "name": "どのデータを使って予想を生成していますか？", "acceptedAnswer": { "@type": "Answer", "text": "出走馬の直近5走成績・騎手情報・斤量・調教師・馬体重・コース適性・天候・馬場状態などを総合的に分析します。データはレース当日の公開情報をリアルタイムで取得・処理しています。" } },
        { "@type": "Question", "name": "本サービスの予想は投資の根拠になりますか？", "acceptedAnswer": { "@type": "Answer", "text": "なりません。本サービスの予想は参考情報であり、馬券購入の投資判断根拠として使用することは推奨していません。公営競技（競馬）は射幸性を伴うため、余裕資金の範囲内で楽しむことを強くお勧めします。ギャンブル依存でお困りの方は「公益財団法人 日本依存症対策協会（0570-064-556）」にご相談ください。" } },
        { "@type": "Question", "name": "騎手・調教師の得意コース傾向は分析していますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい。AIは騎手の騎乗コース別勝率・調教師のトラック別成績・厩舎の仕上がり傾向を分析データに組み込んでいます。「この騎手はこのコースで強い」といった傾向を統計的に反映した予想を生成します。" } },
        { "@type": "Question", "name": "複勝・ワイド・馬連など買い目の種類は選べますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい。単勝・複勝・ワイド・馬連・馬単・三連複・三連単の7券種に対応しています。軍資金に応じた推奨配分額も自動計算し、期待値が高い買い目を優先的に表示します。" } },
        { "@type": "Question", "name": "スマートフォンでも使えますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい。スマートフォン・タブレット・PCすべてに対応したレスポンシブデザインです。PWA（プログレッシブウェブアプリ）対応のため、ホーム画面に追加するとアプリのように快適に利用できます。" } },
        { "@type": "Question", "name": "回収率トラッキング機能とは何ですか？", "acceptedAnswer": { "@type": "Answer", "text": "実際に購入した馬券の結果を入力することで、ご自身の累計投資額・払戻額・回収率を自動集計する機能です。「どの予想パターンが自分に合っているか」を可視化し、馬券戦略の改善に役立てていただけます。" } },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "競馬予想AIの使い方",
      "description": "AIがレース情報を分析して本命◎対抗○単穴▲と推奨買い目を30秒で提案する手順（20歳以上限定）",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "レース情報を選択する",
          "text": "開催場・レース番号・出走馬情報を選択または入力します。netkeiba出走馬データをAIが自動取得し、分析対象レースをセットします。"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "AIが予想を生成する",
          "text": "直近5走成績・騎手情報・斤量・馬場状態などをAIが総合分析し、本命◎対抗○単穴▲と推奨買い目・軍資金別配分を30秒で生成します。"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "バックテスト実績を確認する",
          "text": "予想結果を参考にする前に、サービス内「バックテスト結果」ページで過去の的中率・回収率実績をご確認ください。本サービスの予想は参考情報であり、馬券の的中を保証するものではありません。"
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "競馬予想AI",
      "description": "AIが競馬レース情報を自動分析し本命◎対抗○単穴▲と推奨買い目を提案する競馬予想支援サービス。20歳以上限定。バックテスト実績公開済み。",
      "provider": {
        "@type": "Organization",
        "name": "競馬予想AI運営事務局",
        "url": SITE_URL
      },
      "serviceType": "AI Software",
      "areaServed": "JP",
      "audience": {
        "@type": "Audience",
        "audienceType": "20歳以上の競馬ファン"
      },
      "offers": {
        "@type": "Offer",
        "price": "5000",
        "priceCurrency": "JPY",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "5000",
          "priceCurrency": "JPY",
          "unitText": "月額〜"
        },
        "description": "無料1レースから・ベーシックプラン¥5,000/月〜"
      }
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className={`${notoSansJP.className} bg-[#0F0F1A] text-slate-100 antialiased`}>
        <AgeGate>
        {children}
        <PWAInstallBanner />
        {/* 関連AIサービス */}
        <section className="mt-8 pt-6 border-t border-white/10 px-4 max-w-2xl mx-auto">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            関連サービス
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <a
              href="https://keirin-yoso-ai.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition text-sm"
            >
              <span className="block font-medium text-gray-200">競輪予想AI</span>
              <span className="block text-xs text-gray-400 mt-0.5">AIが競輪の買い目を即提案</span>
            </a>
            <a
              href="https://boat-yoso-ai.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition text-sm"
            >
              <span className="block font-medium text-gray-200">ボートレース予想AI</span>
              <span className="block text-xs text-gray-400 mt-0.5">ボートレース予想をAI分析</span>
            </a>
          </div>
        </section>
        <footer className="flex justify-center py-2">
          <FeedbackButton serviceName="競馬予想AI" />
        </footer>
        </AgeGate>
        <Analytics />
        <SpeedInsights />
        {process.env.NEXT_PUBLIC_CLARITY_ID && process.env.NODE_ENV === 'production' && (
          <Script
            id="clarity-init"
            strategy="afterInteractive"
          >
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${process.env.NEXT_PUBLIC_CLARITY_ID}");`}
          </Script>
        )}
        <CookieBanner />
      </body>
    </html>
  );
}
