import { MetadataRoute } from "next";

const keywordSlugs = [
  "keiba-yoso-ai-muryou",
  "keiba-fukusho-yoso-houhou",
  "uma-win5-yoso-strategy",
  "keiba-tanshuku-yoso",
  "keiba-g1-yoso-2026",
  "keiba-odds-bunseki",
  "keiba-kikou-track-bunseki",
  "keiba-tenkai-yoso-katsuritu",
  "keiba-blood-pedigree-analysis",
  "keiba-tokubetsu-kyuusou",
  "oaks-2026-yoso-ai",
  "nihon-derby-2026-yoso-ai",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://keiba-yoso-ai.vercel.app";

  const keywordPages: MetadataRoute.Sitemap = keywordSlugs.map((slug) => ({
    url: `${base}/keywords/${slug}`,
    lastModified: new Date("2026-03-31"),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/predict`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/race/takamatsunomiya-kinen`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/race/osaka-hai`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/race/sakurahana-sho`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/race/satsuki-sho`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/race/nihon-derby`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/race/victoria-mile`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/race/oaks`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/race/yasuda-kinen`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/race/arima-kinen`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/news`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/news/weekly`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/how-to`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/tracker`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/backtest`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/legal`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    ...keywordPages,
  ];
}
