import type { Metadata } from "next";
import Link from "next/link";

interface KeywordData {
  title: string;
  h1: string;
  description: string;
  features: { icon: string; title: string; text: string }[];
  faqs: { q: string; a: string }[];
  lastUpdated: string;
}

const KEYWORDS: Record<string, KeywordData> = {
  "keiba-yoso-ai-muryou": {
    title: "競馬 予想 AI 無料 独自分析 | 競馬予想AI",
    h1: "競馬 予想 AI 無料 独自分析",
    description: "無料で使える競馬AI予想（参考情報）。過去データ・血統・馬場状態を総合分析してAIが買い目を提案します。的中・収益を保証するものではありません。",
    features: [
      { icon: "🐎", title: "AI予想エンジン", text: "過去10年以上のレースデータをAIが独自分析。統計的アプローチで買い目を参考提案（的中を保証するものではありません）" },
      { icon: "📊", title: "複合要因分析", text: "馬の実力・騎手・調教・馬場・展開を総合的に分析して予想スコアを算出" },
      { icon: "🆓", title: "無料で利用可能", text: "基本的なAI予想は無料で利用可能。プレミアムプランでさらに詳細な分析が可能" },
    ],
    faqs: [
      { q: "競馬AI予想の的中率は？", a: "AIはデータを統計的に分析しますが、的中率・収益を保証するものではありません。本サービスはエンターテインメント目的の参考情報サービスです。バックテストページにて外れも含めた全実績を公開しています。" },
      { q: "AI予想はどのデータを使っている？", a: "JRAの過去レース結果・調教タイム・騎手成績・馬場状態・血統データなど多角的なデータをAIが分析します。" },
      { q: "初心者でも使いやすい？", a: "レース名を入力するだけでAIが予想を提示します。初心者でも直感的に使える設計になっています。" },
    ],
    lastUpdated: "2026-03-31",
  },
  "keiba-fukusho-yoso-houhou": {
    title: "競馬 複勝 予想 方法 AI | 競馬予想AI",
    h1: "競馬 複勝 予想 方法 AI",
    description: "複勝予想の方法をAIが分析。3着以内に入る馬をAIが統計的に予測して回収率を高める戦略を提案します。",
    features: [
      { icon: "🎯", title: "複勝確率算出", text: "各馬の3着以内確率をAIが数値化。複勝オッズとの比較で期待値の高い馬を特定" },
      { icon: "📈", title: "回収率最適化", text: "長期的な複勝回収率を最大化するための資金管理と馬選びをAIが提案" },
      { icon: "🔢", title: "統計的アプローチ", text: "感情に左右されない統計的な複勝予想手法をAIが提供" },
    ],
    faqs: [
      { q: "複勝予想で利益を出せる？", a: "複勝は的中率が高い分オッズが低いため、オッズの歪みを見つけることが重要です。AIが期待値の高い複勝候補を提案します。" },
      { q: "複勝で狙うべき馬の条件は？", a: "実力が安定している・コース適性がある・騎手が上手い・調教状態が良好などの条件を複合的にAIが判断します。" },
      { q: "複勝と単勝どちらが儲かる？", a: "単勝は高オッズ期待、複勝は安定的な的中が特徴です。AIが両方の期待値を計算して最適な選択を提案します。" },
    ],
    lastUpdated: "2026-03-31",
  },
  "uma-win5-yoso-strategy": {
    title: "WIN5 予想 戦略 AI分析 | 競馬予想AI",
    h1: "WIN5 予想 戦略 AI分析",
    description: "WIN5予想の戦略をAIが分析。5レース全ての1着馬をAIが予測して億超えの高額配当を狙う戦略を提案します。",
    features: [
      { icon: "💰", title: "WIN5全レース分析", text: "WIN5対象5レースを一括でAIが分析。各レースの本命・対抗・穴馬を予測" },
      { icon: "🎲", title: "買い目最適化", text: "的中確率と期待値を考慮した最適な買い目の組み合わせをAIが算出" },
      { icon: "📊", title: "過去WIN5データ分析", text: "過去のWIN5結果パターンをAIが分析。高配当が出やすい条件を特定" },
    ],
    faqs: [
      { q: "WIN5で当てるコツは？", a: "5レース全て当てる必要があるため、各レースの信頼度の高い馬を選ぶことが重要です。AIが各レースの予想精度を数値化して提示します。" },
      { q: "WIN5の予算はどれくらい必要？", a: "最低100円から参加可能ですが、複数の組み合わせを抑えるには5,000円〜10,000円程度が現実的です。AIが予算に応じた買い目を提案します。" },
      { q: "AIはWIN5に有効？", a: "5レースの複合予想はAIの得意分野です。各レースの独立した分析と組み合わせの最適化をAIが行います。" },
    ],
    lastUpdated: "2026-03-31",
  },
  "keiba-tanshuku-yoso": {
    title: "競馬 単勝 予想 AIランキング | 競馬予想AI",
    h1: "競馬 単勝 予想 AIランキング",
    description: "単勝予想のAIランキングを提供。1着馬をAIが予測して高回収率の単勝馬券戦略をサポートします。",
    features: [
      { icon: "🥇", title: "単勝AIランキング", text: "各馬の1着確率をAIがランキング形式で表示。信頼度の高い本命馬を明示" },
      { icon: "💡", title: "穴馬発掘", text: "オッズの歪みを利用した高配当単勝候補をAIが特定" },
      { icon: "📈", title: "長期回収率追跡", text: "AIの単勝予想の長期的な回収率実績をデータで公開" },
    ],
    faqs: [
      { q: "単勝で高回収率を出すには？", a: "オッズと実力の乖離を見つけることが重要です。AIが過小評価されている馬（期待値プラスの馬）を特定します。" },
      { q: "人気馬の単勝は買いか？", a: "人気馬は的中しやすいですが回収率が下がりやすいです。AIが人気と実力のバランスを分析して最適な単勝馬を提案します。" },
      { q: "単勝のみで利益を出せる？", a: "単勝は馬券の基本形で、長期的な回収率管理が重要です。AIが統計的に期待値プラスの単勝馬を選別します。" },
    ],
    lastUpdated: "2026-03-31",
  },
  "keiba-g1-yoso-2026": {
    title: "競馬 G1 予想 2026 AI | 競馬予想AI",
    h1: "競馬 G1 予想 2026 AI",
    description: "2026年の競馬G1レースをAIが予想。有馬記念・日本ダービー・天皇賞など主要G1の詳細な予想と分析を提供します。",
    features: [
      { icon: "🏆", title: "G1特化分析", text: "G1レース特有の要素（強豪同士の激突・距離適性・コース適性）をAIが重点的に分析" },
      { icon: "📅", title: "G1スケジュール対応", text: "2026年のG1スケジュールに合わせた事前予想と最終予想をAIが提供" },
      { icon: "🌟", title: "有力馬詳細分析", text: "G1有力候補馬の詳細プロフィールと過去実績をAIが総合評価" },
    ],
    faqs: [
      { q: "G1予想で注目すべきポイントは？", a: "G1は強豪馬が集まるため、コース適性・距離・展開・当日の馬場状態が特に重要です。AIが全要素を総合分析します。" },
      { q: "2026年の注目G1は？", a: "有馬記念・日本ダービー・天皇賞（春/秋）・ジャパンカップなどが注目G1です。各レースのAI予想は本サービスで随時更新されます。" },
      { q: "G1は荒れやすい？", a: "G1は実力馬が揃うため荒れにくい傾向ですが、展開次第で波乱もあります。AIが波乱可能性も含めて予想します。" },
    ],
    lastUpdated: "2026-03-31",
  },
  "keiba-odds-bunseki": {
    title: "競馬 オッズ 分析 AI 予想精度 | 競馬予想AI",
    h1: "競馬 オッズ 分析 AI 予想精度",
    description: "競馬オッズの分析方法をAIが解説。オッズの歪みを見つけて期待値プラスの馬券を選ぶ戦略をAIがサポートします。",
    features: [
      { icon: "📊", title: "オッズ歪み検出", text: "実際の実力とオッズの乖離をAIが数値化。期待値プラスの馬を自動特定" },
      { icon: "⏱️", title: "オッズ変動追跡", text: "締め切りまでのオッズ変動をAIが追跡。大口投票の動向から情報を読み取る" },
      { icon: "🎯", title: "馬連・馬単オッズ分析", text: "複数の馬券種類のオッズを横断比較してAIが最もお得な買い方を提案" },
    ],
    faqs: [
      { q: "オッズ分析で勝てるの？", a: "オッズは大衆の予想を反映しており、その歪みを見つけることが長期的な利益につながります。AIが統計的にオッズの歪みを特定します。" },
      { q: "単勝1倍台の馬は買い？", a: "圧倒的人気馬は的中率は高いですが回収率が下がりやすいです。AIが人気馬の期待値を計算して購入判断をサポートします。" },
      { q: "オッズから馬の状態が分かる？", a: "急激なオッズ変動は情報（調教・体調）を反映することがあります。AIがオッズ変動パターンを分析します。" },
    ],
    lastUpdated: "2026-03-31",
  },
  "keiba-kikou-track-bunseki": {
    title: "競馬 馬場 騎手 コース 分析 AI | 競馬予想AI",
    h1: "競馬 馬場 騎手 コース 分析 AI",
    description: "馬場状態・騎手・コース適性をAIが総合分析。当日の馬場や騎手との相性から勝率の高い馬をAIが予測します。",
    features: [
      { icon: "🏇", title: "馬場状態分析", text: "良・稍重・重・不良の馬場状態別の各馬のパフォーマンスをAIが分析" },
      { icon: "👤", title: "騎手相性分析", text: "馬と騎手の過去のコンビ成績・騎手の得意コースをAIが詳細分析" },
      { icon: "🗺️", title: "コース適性判定", text: "各競馬場のコース特性と馬の過去成績からコース適性をAIが数値化" },
    ],
    faqs: [
      { q: "馬場状態は予想にどれくらい影響する？", a: "馬場が変わると有利な馬が大きく変わります。AIが過去の馬場状態別成績から当日の有利馬を特定します。" },
      { q: "騎手の差はそんなに大きい？", a: "G1クラスの騎手は技術・判断力で差が出ます。AIが騎手×馬の相性と過去の成績を分析します。" },
      { q: "初めて走るコースの馬は判断が難しい？", a: "初コースは不確定要素が増えます。AIが血統・似たコース特性での実績から適性を予測します。" },
    ],
    lastUpdated: "2026-03-31",
  },
  "keiba-tenkai-yoso-katsuritu": {
    title: "競馬 展開 予想 勝率 向上 AI | 競馬予想AI",
    h1: "競馬 展開 予想 勝率 向上 AI",
    description: "レース展開の予想をAIが分析。逃げ・先行・差し・追い込みの脚質と展開を予測して勝率向上をサポートします。",
    features: [
      { icon: "🏃", title: "展開シミュレーション", text: "各馬の脚質から当日の展開をAIがシミュレーション。有利な馬を事前特定" },
      { icon: "🔄", title: "ペース分析", text: "ハイペース・スローペースでの有利馬の変化をAIが予測" },
      { icon: "🎯", title: "展開ベスト馬選定", text: "予測展開から最も有利になる馬をAIが自動的に選定" },
    ],
    faqs: [
      { q: "展開予想の重要性は？", a: "同じ馬でも展開次第で結果が大きく変わります。展開を読むことが予想精度向上の鍵です。AIが客観的な展開予想を提供します。" },
      { q: "逃げ馬が有利な条件は？", a: "スローペースに持ち込める・競合逃げ馬が少ない・コーナーが多いコースなどが逃げ馬有利の条件です。" },
      { q: "差し・追い込み馬の狙い目は？", a: "ハイペース・直線が長いコース・馬場が締まっている時に差し馬が台頭しやすいです。AIが展開から差し馬の期待度を算出します。" },
    ],
    lastUpdated: "2026-03-31",
  },
  "keiba-blood-pedigree-analysis": {
    title: "競馬 血統 分析 AI 予想 | 競馬予想AI",
    h1: "競馬 血統 分析 AI 予想",
    description: "競馬の血統分析をAIが実施。父・母父・配合パターンから距離適性・馬場適性・成長曲線をAIが予測します。",
    features: [
      { icon: "🧬", title: "血統データベース", text: "主要種牡馬の産駒特性・得意距離・馬場適性をAIが詳細に分析" },
      { icon: "📈", title: "成長曲線予測", text: "血統から古馬になってからの成長パターンをAIが予測。長期投資の馬を特定" },
      { icon: "🔬", title: "配合評価", text: "父×母父の黄金配合パターンをAIが学習。強い馬が生まれやすい配合を分析" },
    ],
    faqs: [
      { q: "血統は予想にどれくらい重要？", a: "特に距離適性・馬場適性・成長時期に血統が大きく影響します。AIが血統データを定量的に分析して予想に組み込みます。" },
      { q: "初出走の馬の血統分析は可能？", a: "初出走馬は実績がないため血統分析が特に重要です。AIが父・母父の産駒傾向から能力を推測します。" },
      { q: "社台系・ノーザンファーム生産馬の特性は？", a: "日本の主要生産牧場の馬は一定のパターンがあります。AIが生産者・調教師・血統の組み合わせを分析します。" },
    ],
    lastUpdated: "2026-03-31",
  },
  "keiba-tokubetsu-kyuusou": {
    title: "競馬 重賞 予想 特別競走 AI | 競馬予想AI",
    h1: "競馬 重賞 予想 特別競走 AI",
    description: "重賞・特別競走の予想をAIが提供。G1・G2・G3の重賞レースを中心に精度の高いAI予想をお届けします。",
    features: [
      { icon: "🏅", title: "重賞専用モデル", text: "重賞レース特有の要素（格上挑戦・強豪対決）に特化したAI予想モデルを適用" },
      { icon: "📋", title: "出走馬全頭分析", text: "重賞出走全頭の詳細分析をAIが実施。取捨選択の根拠を明確に提示" },
      { icon: "🎰", title: "馬連・ワイドフォーメーション", text: "重賞では馬連・ワイドの複数買いが有効。AIが最適なフォーメーションを提案" },
    ],
    faqs: [
      { q: "重賞で穴馬を見つけるコツは？", a: "前走が参考外だった馬・コース替わりで一変する馬・出走馬中で最も適性が高い馬などが穴候補です。AIが系統的に穴候補を特定します。" },
      { q: "特別競走と重賞の違いは？", a: "重賞はG1〜G3の特別なレース、特別競走はオープンクラスや条件付きの重賞以外のレースです。AIがクラス別の予想精度を提供します。" },
      { q: "重賞は難しい？", a: "実力馬が集まる重賞は難易度が高いですが、AIが全データを分析することで一般的な予想より精度の高い予想を提供します。" },
    ],
    lastUpdated: "2026-03-31",
  },
};

const ALL_SLUGS = Object.keys(KEYWORDS);

export function generateStaticParams() {
  return ALL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = KEYWORDS[slug];
  if (!data) return { title: "Not Found" };

  return {
    title: data.title,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      type: "article",
      modifiedTime: data.lastUpdated,
      url: `https://keiba-yoso-ai.vercel.app/keywords/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description: data.description,
    },
    alternates: {
      canonical: `https://keiba-yoso-ai.vercel.app/keywords/${slug}`,
    },
    other: {
      "article:modified_time": data.lastUpdated,
    },
  };
}

export default async function KeywordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = KEYWORDS[slug];

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>ページが見つかりません</h1>
          <Link href="/" style={{ color: "#10b981" }}>トップページへ戻る</Link>
        </div>
      </div>
    );
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "dateModified": data.lastUpdated,
    "mainEntity": data.faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": { "@type": "Answer", "text": faq.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #0f172a 100%)", color: "#e2e8f0", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🐎</div>
            <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", fontWeight: "bold", marginBottom: "1rem", background: "linear-gradient(90deg, #10b981, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {data.h1}
            </h1>
            <p style={{ fontSize: "1.1rem", color: "#94a3b8", marginBottom: "2rem" }}>{data.description}</p>
            <Link href="/" style={{ display: "inline-block", background: "linear-gradient(135deg, #10b981, #f59e0b)", color: "#fff", padding: "1rem 2.5rem", borderRadius: "50px", fontWeight: "bold", fontSize: "1.1rem", textDecoration: "none" }}>
              今すぐ無料でAI予想を試す →
            </Link>
          </div>

          <div style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem", textAlign: "center", color: "#10b981" }}>AIが分析する3つのポイント</h2>
            <div style={{ display: "grid", gap: "1rem" }}>
              {data.features.map((f, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px", padding: "1.5rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "2rem" }}>{f.icon}</span>
                  <div>
                    <h3 style={{ fontWeight: "bold", marginBottom: "0.5rem", color: "#10b981" }}>{f.title}</h3>
                    <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem", textAlign: "center", color: "#10b981" }}>よくある質問</h2>
            <div style={{ display: "grid", gap: "1rem" }}>
              {data.faqs.map((faq, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px", padding: "1.5rem" }}>
                  <h3 style={{ fontWeight: "bold", marginBottom: "0.75rem", color: "#10b981", fontSize: "1rem" }}>Q: {faq.q}</h3>
                  <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>A: {faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "3rem", padding: "2rem", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "16px" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem", color: "#10b981" }}>AIで競馬予想の精度を上げる</h2>
            <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>データに基づいたAI予想で的中率向上をサポート（※投資は自己責任で）</p>
            <Link href="/" style={{ display: "inline-block", background: "linear-gradient(135deg, #10b981, #f59e0b)", color: "#fff", padding: "1rem 2.5rem", borderRadius: "50px", fontWeight: "bold", textDecoration: "none" }}>
              無料でAI予想を始める →
            </Link>
          </div>

          <p style={{ textAlign: "center", color: "#475569", fontSize: "0.8rem", marginBottom: "2rem" }}>最終更新: {data.lastUpdated}</p>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "2rem" }}>
            <h3 style={{ textAlign: "center", color: "#94a3b8", marginBottom: "1rem" }}>他のAI予想ツールも試してみる</h3>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="https://keirin-yoso-ai.vercel.app" style={{ color: "#10b981", textDecoration: "none", fontSize: "0.9rem" }}>競輪予想AI</Link>
              <Link href="https://boat-yoso-ai.vercel.app" style={{ color: "#10b981", textDecoration: "none", fontSize: "0.9rem" }}>ボートレース予想AI</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
