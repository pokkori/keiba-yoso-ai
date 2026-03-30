import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import FeedbackButton from "@/components/FeedbackButton";
import { AgeGate } from "@/components/AgeGate";

const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });

const SITE_URL = "https://keiba-yoso-ai.vercel.app";
const TITLE = "競馬予想AI｜複勝回収率193%・AIが30秒分析・本命◎対抗○単穴▲を即提案";
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
      "@type": "WebApplication",
      "name": "競馬予想AI",
      "url": SITE_URL,
      "applicationCategory": "SportApplication",
      "operatingSystem": "Web",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "JPY", "description": "無料1レースから" },
      "description": DESC,
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "予想は毎週使えますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい。ベーシック・プロプランは毎週土日の全レースが無制限で使えます。JRA全開催（最大3場×12R）に対応。" } },
        { "@type": "Question", "name": "必ず当たりますか？", "acceptedAnswer": { "@type": "Answer", "text": "AIも100%の的中を保証することはできません。競馬の楽しみ方として活用いただき、余裕資金でお楽しみください。" } },
        { "@type": "Question", "name": "どのくらいのデータを使いますか？", "acceptedAnswer": { "@type": "Answer", "text": "出走馬の直近5走の成績、騎手情報、斤量、調教師などをリアルタイムで取得して分析します。" } },
        { "@type": "Question", "name": "いつでも解約できますか？", "acceptedAnswer": { "@type": "Answer", "text": "マイページから次回更新日前にいつでも解約できます。" } },
      ],
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
        <footer className="flex justify-center py-2">
          <FeedbackButton serviceName="競馬予想AI" />
        </footer>
        </AgeGate>
        <Analytics />
        <SpeedInsights />
        {/* Microsoft Clarity — pokkoriがhttps://clarity.microsoft.com/でプロジェクト登録後にIDを設定 */}
        <Script id="clarity-script" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "CLARITY_PROJECT_ID_HERE");
          `}
        </Script>
      </body>
    </html>
  );
}
