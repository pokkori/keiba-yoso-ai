import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import PWAInstallBanner from "@/components/PWAInstallBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const SITE_URL = "https://keiba-yoso-ai.vercel.app";
const TITLE = "競馬予想AI｜複勝回収率193%・AIが30秒分析・本命◎対抗○単穴▲を即提案";
const DESC = "netkeiba出走馬データをAIが自動取得・分析。本命◎対抗○単穴▲と推奨買い目を30秒で提案。軍資金別配分・回収率トラッキング付き。無料1レースから。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏇</text></svg>" },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: SITE_URL,
    siteName: "競馬予想AI",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "競馬予想AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    site: "@levona_design",
  },
  metadataBase: new URL(SITE_URL),
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        <PWAInstallBanner />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
