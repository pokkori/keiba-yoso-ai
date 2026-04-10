import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const SITE_URL = "https://keiba-yoso-ai.vercel.app";

export const metadata: Metadata = {
  title: "競馬予想AI｜AIが30秒分析・本命◎対抗○単穴▲を即提案（参考情報）",
  description: "AIが競馬レース情報を自動分析。本命◎対抗○単穴▲と推奨買い目を30秒で提案（参考情報）。",
  openGraph: {
    title: "競馬予想AI｜AIが30秒分析・本命◎対抗○単穴▲を即提案（参考情報）",
    description: "AIが競馬レース情報を自動分析。本命◎対抗○単穴▲と推奨買い目を30秒で提案（参考情報）。",
    url: `${SITE_URL}/predict`,
    siteName: "競馬予想AI",
    locale: "ja_JP",
    type: "website",
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: "競馬予想AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "競馬予想AI｜AIが30秒分析・本命◎対抗○単穴▲を即提案（参考情報）",
    description: "AIが競馬レース情報を自動分析。本命◎対抗○単穴▲と推奨買い目を30秒で提案（参考情報）。",
    images: [`${SITE_URL}/og.png`],
  },
};

export default function PredictLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
