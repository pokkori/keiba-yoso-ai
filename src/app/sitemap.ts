import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://keiba-yoso-ai.vercel.app";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/predict`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/race/takamatsunomiya-kinen`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/race/osaka-hai`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/race/sakurahana-sho`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/race/satsuki-sho`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/race/nihon-derby`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
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
  ];
}
