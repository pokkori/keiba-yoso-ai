import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const SITE_URL = "https://keiba-yoso-ai.vercel.app";

type Props = {
  children: React.ReactNode;
  params: Promise<Record<string, string>>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;

  const race = (Array.isArray(sp.race) ? sp.race[0] : sp.race) ?? "";
  const horse = (Array.isArray(sp.horse) ? sp.horse[0] : sp.horse) ?? "";
  const confidence = (Array.isArray(sp.confidence) ? sp.confidence[0] : sp.confidence) ?? "";
  const mode = (Array.isArray(sp.mode) ? sp.mode[0] : sp.mode) ?? "standard";
  const hit = (Array.isArray(sp.hit) ? sp.hit[0] : sp.hit) === "1";

  // 動的OGP URLを構築
  const ogParams = new URLSearchParams();
  if (race) ogParams.set("race", race);
  if (horse) ogParams.set("horse", horse);
  if (confidence) ogParams.set("confidence", confidence);
  if (mode !== "standard") ogParams.set("mode", mode);
  if (hit) ogParams.set("hit", "1");
  const ogImageUrl = `${SITE_URL}/api/og?${ogParams.toString()}`;

  const isFukusho = mode === "fukusho";

  const title = hit
    ? horse
      ? `AI的中！${race} 本命${horse} | 競馬予想AI`
      : `AI的中！${race} | 競馬予想AI`
    : horse
    ? `${race} ${isFukusho ? "複勝推奨" : "本命◎"}${horse} | 競馬予想AI`
    : race
    ? `${race} AI予想結果 | 競馬予想AI`
    : "競馬予想AI｜AIが30秒分析・本命◎対抗○単穴▲を即提案（参考情報）";

  const description = hit
    ? `${race}でAIの予想が的中！${horse ? `本命${horse}の的中` : ""}。的中率・回収率をバックテストで公開中。`
    : horse
    ? `${race} ${isFukusho ? "複勝推奨" : "本命◎"}${horse}${confidence ? `（信頼度${confidence}%）` : ""}。AIがデータ分析した予想結果（参考情報）。`
    : "AIが競馬レース情報を自動分析。本命◎対抗○単穴▲と推奨買い目を30秒で提案（参考情報）。";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/predict`,
      siteName: "競馬予想AI",
      locale: "ja_JP",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function PredictLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
