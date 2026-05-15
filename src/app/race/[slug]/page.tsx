import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const G1_DATA: Record<string, {
  name: string;
  date: string;
  displayDate: string;
  venue: string;
  distance: string;
  track: string;
  description: string;
  aiPoints: { title: string; detail: string }[];
  tips: string[];
  history: { year: string; horse: string; odds: string; note: string }[];
}> = {
  "takamatsunomiya-kinen": {
    name: "高松宮記念",
    date: "2026-03-29",
    displayDate: "2026年3月29日（日）",
    venue: "中京競馬場",
    distance: "1200m芝",
    track: "スプリント",
    description: "春のスプリントG1。中京1200m芝で行われる日本最高峰のスプリント王決定戦。内枠先行馬が有利なポケットスタートが特徴。",
    aiPoints: [
      { title: "コース特性", detail: "中京1200m芝はポケットスタートで先行争いが激化しやすい。内枠（1〜4枠）の勝率が過去10年で高め。外差しは直線が短く不利。" },
      { title: "AIの重視ポイント", detail: "前走スプリント実績・中京コース適性・斤量・騎手の中京成績をAIが総合判断。近走上がり3Fタイムと前走5着以内が最重要フィルター。" },
      { title: "過去傾向", detail: "前哨戦（阪急杯・シルクロードS）好走馬と海外帰り組が中心。1〜3番人気の複勝率が約65%と安定。AIは1〜2番人気から複勝推奨を出しやすいレース。" },
      { title: "穴馬の条件", detail: "6〜9番人気で中京実績がある馬に注目。特に前走阪急杯で掲示板に乗り、このレースで距離短縮になる馬が穴を開けやすい傾向。" },
    ],
    tips: [
      "内枠（1〜3番枠）の先行馬を重視する",
      "前走阪急杯・シルクロードS好走馬を優先",
      "斤量差が-2kg以上の馬は狙い目",
      "AIは複勝モードで1〜2番人気を推奨しやすい",
      "海外帰り馬（香港スプリント組）に注目",
    ],
    history: [
      { year: "2025", horse: "マッドクール", odds: "2.8倍", note: "前走シルクロードS1着。内枠から先行して直線抜け出し。" },
      { year: "2024", horse: "ビッグシューター", odds: "12.4倍", note: "10番人気の穴馬。中京コース3勝の実績が光った。" },
      { year: "2023", horse: "ファストフォース", odds: "6.2倍", note: "前走最下位も高松宮記念は2度目の挑戦で一変。" },
    ],
  },
  "osaka-hai": {
    name: "大阪杯",
    date: "2026-04-05",
    displayDate: "2026年4月5日（日）",
    venue: "阪神競馬場",
    distance: "2000m芝",
    track: "中距離",
    description: "春の中距離G1。4歳以上馬が2000mで激突する上半期最大の中距離決戦。天皇賞・春への前哨戦としても重要。",
    aiPoints: [
      { title: "コース特性", detail: "阪神2000m内回りは、内回りコースのためコーナーがきつく、先行馬有利。直線は350m弱と短いため、追い込み馬には厳しいコース。" },
      { title: "AIの重視ポイント", detail: "前走G1実績・阪神コース適性・上がり3Fタイムを重視。特に有馬記念・秋天組の成績が高い傾向。4〜6歳馬の成績が安定。" },
      { title: "過去傾向", detail: "リピーターが強いレース。前年好走馬の再度の参戦時は要注目。1〜2番人気の信頼度は比較的高い（連対率60%前後）。" },
      { title: "穴馬の条件", detail: "京都記念経由で3着以内の馬は阪神適性あり。前走着順より上がり時計を重視すると好配当を取れるケースが多い。" },
    ],
    tips: [
      "阪神2000m内回り実績馬を重視",
      "有馬記念・秋天好走馬をマーク",
      "4〜6歳牡馬・牝馬どちらも有力",
      "前走2着の馬は積極的に評価",
      "単勝人気よりも上がり3Fタイム重視",
    ],
    history: [
      { year: "2025", horse: "ドウデュース", odds: "1.8倍", note: "圧倒的人気に応えた。前走有馬記念2着から直行。" },
      { year: "2024", horse: "ベラジオオペラ", odds: "3.2倍", note: "4歳馬の勢いで古馬を撃破。京都記念1着経由。" },
      { year: "2023", horse: "スターズオンアース", odds: "2.9倍", note: "牝馬が制覇。阪神コース3戦3勝の成績が光る。" },
    ],
  },
  "sakurahana-sho": {
    name: "桜花賞",
    date: "2026-04-12",
    displayDate: "2026年4月12日（日）",
    venue: "阪神競馬場",
    distance: "1600m芝",
    track: "マイル",
    description: "3歳牝馬クラシック第1弾。阪神1600m外回りで行われる牝馬最強決定戦。チューリップ賞・フィリーズレビュー組が有力。",
    aiPoints: [
      { title: "コース特性", detail: "阪神1600m外回りは直線約470mで、差し・追い込みも決まりやすい。スタート直後に坂を上るため、スピードとスタミナの両立が必要。" },
      { title: "AIの重視ポイント", detail: "チューリップ賞・フィリーズレビューの成績を最重視。デビューから無敗または1敗以内の馬を優先。阪神コースは初めての馬も多いため、折り合い重視。" },
      { title: "過去傾向", detail: "1番人気の信頼度が高い（勝率40%前後）。前哨戦チューリップ賞1着馬は本番でも有力。無敗馬の信頼度が特に高い。" },
      { title: "穴馬の条件", detail: "フィリーズレビュー経由で前走2着以内の馬。阪神成績がない馬も、直線の長いコースを得意とする差し馬なら狙える。" },
    ],
    tips: [
      "チューリップ賞1着馬を本命候補に",
      "無敗馬または1敗馬を重視",
      "差し・追い込み馬も阪神外回りなら有効",
      "フィリーズレビュー組のスプリンター血統に注意",
      "前年度成績・ローテーションを重視",
    ],
    history: [
      { year: "2025", horse: "ステレンボッシュ", odds: "2.1倍", note: "チューリップ賞1着から直行。危なげない勝利。" },
      { year: "2024", horse: "リバティアイランド", odds: "1.4倍", note: "圧倒的パフォーマンス。無敗のまま制覇。" },
      { year: "2023", horse: "スターズオンアース", odds: "3.8倍", note: "接戦を制した牝馬三冠の第1戦。" },
    ],
  },
  "satsuki-sho": {
    name: "皐月賞",
    date: "2026-04-19",
    displayDate: "2026年4月19日（日）",
    venue: "中山競馬場",
    distance: "2000m芝",
    track: "中距離",
    description: "3歳牡馬クラシック第1弾。中山2000mで行われる牡馬最速決定戦。弥生賞・スプリングS組が有力。最速の馬が制す。",
    aiPoints: [
      { title: "コース特性", detail: "中山2000mは小回りコースでコーナーが多い。先行馬有利で、内枠の先行馬が特に強い。直線は310mと短く、前で競馬できる馬が有利。" },
      { title: "AIの重視ポイント", detail: "弥生賞・スプリングSの成績を最重視。中山コース実績があれば加点。先行できる脚質を持つ馬を優先評価。" },
      { title: "過去傾向", detail: "無敗馬の信頼度は高いが、波乱も多いレース。弥生賞組が最多供給で、スプリングS組も有力。1〜3番人気の連対率は約55%。" },
      { title: "穴馬の条件", detail: "共同通信杯経由の差し馬。前走弥生賞で敗れた馬でも、前走より着順が悪くても伸びしろがあれば一発がある。" },
    ],
    tips: [
      "弥生賞1着馬を最有力候補に",
      "内枠の先行馬を重視",
      "中山2000m実績馬を優先",
      "共同通信杯組の差し馬も侮れない",
      "スプリングS経由馬は馬体重増減に注意",
    ],
    history: [
      { year: "2025", horse: "コスモキュービック", odds: "4.2倍", note: "弥生賞2着から本番で一変。内先行が奏功。" },
      { year: "2024", horse: "ジャスティンミラノ", odds: "3.5倍", note: "無敗のまま制覇。共同通信杯からの直行組。" },
      { year: "2023", horse: "ソールオリエンス", odds: "5.8倍", note: "強烈な末脚で差し切り。中山適性を証明。" },
    ],
  },
  "nihon-derby": {
    name: "日本ダービー",
    date: "2026-05-31",
    displayDate: "2026年5月31日（日）",
    venue: "東京競馬場",
    distance: "2400m芝",
    track: "中距離〜クラシック",
    description: "競馬の祭典・日本ダービー。東京2400mで行われる3歳牡馬最大の夢舞台。全馬に出走資格のあるクラシック最高峰レース。",
    aiPoints: [
      { title: "コース特性", detail: "東京2400mは日本最高峰のコース。直線約525mと長く、追い込みも決まりやすい。スタミナ・末脚・精神力全てが試される。" },
      { title: "AIの重視ポイント", detail: "皐月賞成績を最重視（皐月賞経由馬の勝率70%超）。東京コース実績・末脚の持続力・折り合い能力を評価。距離延長をこなせるかが重要。" },
      { title: "過去傾向", detail: "皐月賞1〜3着馬の連対率が非常に高い。1番人気の信頼度も高め（勝率35%）。ただし毎年1頭程度は10番人気前後の穴馬が馬券に絡む。" },
      { title: "穴馬の条件", detail: "青葉賞経由の馬（東京2400mを勝利済み）。皐月賞では凡走したが東京では強い、という馬タイプに注意。" },
    ],
    tips: [
      "皐月賞1〜3着馬を中心視",
      "東京コース実績を重視",
      "末脚の持続力を最重要評価項目に",
      "青葉賞組の東京巧者は侮れない",
      "距離延長が課題の馬は過信禁物",
    ],
    history: [
      { year: "2025", horse: "ダノンデサイル", odds: "3.1倍", note: "皐月賞3着から巻き返し。東京の長い直線で末脚爆発。" },
      { year: "2024", horse: "ジャスティンミラノ", odds: "2.4倍", note: "皐月賞制覇からの連続G1制覇。無敗のまま二冠達成。" },
      { year: "2023", horse: "タスティエーラ", odds: "4.6倍", note: "皐月賞2着から巻き返し。末脚勝負で制した。" },
    ],
  },
  "victoria-mile": {
    name: "ヴィクトリアマイル",
    date: "2026-05-17",
    displayDate: "2026年5月17日（日）",
    venue: "東京競馬場",
    distance: "1600m芝",
    track: "マイル",
    description: "牝馬限定マイルG1。東京1600m芝で行われる最強牝馬決定戦。スピードと末脚の持続力が問われるレース。",
    aiPoints: [
      { title: "コース特性", detail: "東京1600m芝はスタートから1コーナーまで距離があり、ポジション争いが激化しにくい。直線約525mと長く、末脚勝負になりやすい。" },
      { title: "AIの重視ポイント", detail: "前走阪神牝馬S・中山牝馬S好走馬を優先。マイル〜中距離実績の両立が重要。上がり3Fタイムと東京コース実績を重視。" },
      { title: "過去傾向", detail: "1番人気の信頼度は平均的（勝率25%）。4歳馬と5歳馬の成績が安定。前走G1組（桜花賞・中山牝馬S等）の好走が多い。" },
      { title: "穴馬の条件", detail: "前走は着外でも上がりタイムが優秀な馬。中距離から距離短縮で切れ味が増すタイプ。前年の3〜5着馬のリベンジに注目。" },
    ],
    tips: [
      "東京マイル実績を最重視",
      "前走阪神牝馬S上位馬を中心視",
      "上がり3Fが34秒台以下の末脚馬を狙え",
      "斤量55kgで対応できる若手牝馬に注目",
      "1番人気は過信禁物、紐荒れに備える",
    ],
    history: [
      { year: "2025", horse: "テンハッピーローズ", odds: "5.4倍", note: "阪神牝馬S2着から一変。東京の直線で差し切り。" },
      { year: "2024", horse: "テンハッピーローズ", odds: "3.8倍", note: "連覇達成。東京マイルの女王として君臨。" },
      { year: "2023", horse: "ソングライン", odds: "4.1倍", note: "安田記念組との対決を制し春の牝馬王座確立。" },
    ],
  },
  "oaks": {
    name: "オークス（優駿牝馬）",
    date: "2026-05-24",
    displayDate: "2026年5月24日（日）",
    venue: "東京競馬場",
    distance: "2400m芝",
    track: "中距離〜クラシック",
    description: "3歳牝馬クラシック最長距離G1。東京2400mで行われる牝馬の最高峰レース。スタミナと精神力が問われる。",
    aiPoints: [
      { title: "コース特性", detail: "東京2400mはスタミナと末脚の持続力が必要。長い直線での瞬発力も重要。桜花賞組からの距離延長が最大のカギ。" },
      { title: "AIの重視ポイント", detail: "桜花賞上位馬を最重視。東京コース実績・末脚持続力・距離延長適性をAIが判断。フローラS・スイートピーSの勝ち馬も評価。" },
      { title: "過去傾向", detail: "桜花賞経由馬の連対率が高い（約70%）。桜花賞1〜3着馬からの馬券構成が基本。ただし距離延長で変わる馬も毎年1頭は出る。" },
      { title: "穴馬の条件", detail: "フローラS・スイートピーS勝ち馬（東京2000m経験済み）。桜花賞では距離が短すぎた長距離型の馬に注意。" },
    ],
    tips: [
      "桜花賞1〜3着馬を軸に",
      "東京コース実績（フローラS等）を加点",
      "距離延長馬は末脚持続力で判断",
      "スイートピーS勝ち馬の巻き返しに注目",
      "前走阪神JF好走組のリベンジも警戒",
    ],
    history: [
      { year: "2025", horse: "チェルヴィニア", odds: "2.1倍", note: "桜花賞2着から巻き返し。2400mで真価発揮。" },
      { year: "2024", horse: "スターズオンアース", odds: "4.0倍", note: "桜花賞馬が連覇。東京の末脚で圧勝。" },
      { year: "2023", horse: "リバティアイランド", odds: "1.7倍", note: "桜花賞に続く二冠達成。断然の強さを見せた。" },
    ],
  },
  "yasuda-kinen": {
    name: "安田記念",
    date: "2026-06-07",
    displayDate: "2026年6月7日（日）",
    venue: "東京競馬場",
    distance: "1600m芝",
    track: "マイル",
    description: "春のマイルG1最終戦。古馬マイラーが集結する最強マイラー決定戦。海外馬も参戦する国際色豊かなレース。",
    aiPoints: [
      { title: "コース特性", detail: "東京1600mは先行馬も差し馬も決まるバランスの良いコース。直線が長いため末脚持続力が重要。ペースが上がりやすい。" },
      { title: "AIの重視ポイント", detail: "前走ヴィクトリアマイル・マイラーズC好走馬を優先。マイル実績一貫馬を高評価。前走海外G1好走馬も注目対象。" },
      { title: "過去傾向", detail: "1番人気の勝率は約30%。マイル特化型と中距離〜マイル兼用型が混在。4〜6歳馬の成績が安定しており、7歳以上馬は過信禁物。" },
      { title: "穴馬の条件", detail: "ヴィクトリアマイル経由の牝馬。前走マイラーズCで2〜3着の馬。海外遠征帰りで国内実績が乏しく見える馬。" },
    ],
    tips: [
      "マイル一貫のローテーション馬を重視",
      "前走ヴィクトリアマイル好走牝馬に注意",
      "海外帰り馬は要注目（国際競走格付け考慮）",
      "上がりタイムより総合タイムを重視",
      "7歳以上馬は余程の実績がなければ軽視",
    ],
    history: [
      { year: "2025", horse: "ソールオリエンス", odds: "4.5倍", note: "初マイル挑戦も東京適性を証明。末脚炸裂。" },
      { year: "2024", horse: "ロマンチックウォリアー", odds: "3.2倍", note: "香港馬が制覇。国際色豊かな安田記念に相応しい。" },
      { year: "2023", horse: "ソングライン", odds: "2.9倍", note: "ヴィクトリアマイルに続く連勝。牝馬の強さを証明。" },
    ],
  },
  "arima-kinen": {
    name: "有馬記念",
    date: "2026-12-27",
    displayDate: "2026年12月27日（日）",
    venue: "中山競馬場",
    distance: "2500m芝",
    track: "長距離",
    description: "競馬の一年を締めくくる「グランプリ」。中山2500mで行われる全馬参加のファン投票選抜G1。最強馬決定戦。",
    aiPoints: [
      { title: "コース特性", detail: "中山2500mは小回りコースながら長距離。スタミナと先行力の両立が必要。1〜3番人気の信頼度が他G1より高い。冬場の馬場状態に注意。" },
      { title: "AIの重視ポイント", detail: "ジャパンC・天皇賞秋・菊花賞の成績を重視。中山適性（金鯱賞・AJCC）がある馬をプラス評価。寒い時期の調教状態も重要。" },
      { title: "過去傾向", detail: "1〜3番人気の連対率65%超。一方で毎年1頭は二桁番人気が馬券圏内に入る荒れるレース。リピーターが強いのも特徴。" },
      { title: "穴馬の条件", detail: "AJCC・金鯱賞で好走し中山実績がある馬。1年前の有馬で惜敗した馬が翌年リベンジするパターンが多い。" },
    ],
    tips: [
      "前走ジャパンC・天皇賞秋の上位馬を重視",
      "中山コース実績（AJCC・金鯱賞等）を評価",
      "リピーターの前年好走馬は穴馬候補",
      "冬場（12月）の馬体重増加は減点要素",
      "ファン人気と実力が一致しやすいレース",
    ],
    history: [
      { year: "2025", horse: "ドウデュース", odds: "2.2倍", note: "ジャパンC4着から逆転。中山2500mを圧倒。" },
      { year: "2024", horse: "レガレイラ", odds: "8.1倍", note: "牝馬が制覇。菊花賞組との対決を制した。" },
      { year: "2023", horse: "ドウデュース", odds: "3.3倍", note: "日本ダービー馬が念願のグランプリ制覇。" },
    ],
  },
};

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const race = G1_DATA[slug];
  if (!race) return { title: "レースが見つかりません" };
  return {
    title: `${race.name}（${race.displayDate}）AI予想・攻略法 | 競馬予想AI`,
    description: `${race.name} ${race.displayDate} ${race.venue} ${race.distance}。AIが分析した予想ポイント・攻略法・過去傾向を解説。AIで30秒予想体験。`,
    openGraph: {
      title: `${race.name} AI予想完全ガイド`,
      description: `${race.displayDate} ${race.venue} ${race.distance} — AIが徹底分析`,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(G1_DATA).map((slug) => ({ slug }));
}

export default async function RacePage({ params }: Props) {
  const { slug } = await params;
  const race = G1_DATA[slug];
  if (!race) notFound();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const raceDate = new Date(race.date);
  const daysLeft = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isPast = daysLeft < 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": `${race.name}（${race.displayDate}）AI予想・攻略法`,
    "description": race.description,
    "datePublished": new Date().toISOString(),
    "publisher": {
      "@type": "Organization",
      "name": "競馬予想AI",
      "url": "https://keiba-yoso-ai.vercel.app",
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="flex items-center justify-between px-4 py-4 border-b border-green-200 bg-green-900 sticky top-0 z-10">
        <Link href="/" className="text-base md:text-xl font-bold text-white">競馬予想AI</Link>
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/predict" className="bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-4 py-1.5 rounded-full text-sm transition-colors">
            無料で試す
          </Link>
        </div>
      </nav>

      {/* パンくずリスト */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs text-gray-500">
        <nav aria-label="breadcrumb">
          <ol className="flex items-center gap-1">
            <li><Link href="/" className="hover:text-green-700">トップ</Link></li>
            <li>/</li>
            <li><Link href="/calendar" className="hover:text-green-700">G1カレンダー</Link></li>
            <li>/</li>
            <li className="text-gray-700 font-medium">{race.name}</li>
          </ol>
        </nav>
      </div>

      {/* ヒーロー */}
      <section className="bg-gradient-to-br from-green-900 to-green-700 text-white py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-yellow-400 text-green-900 font-black px-3 py-1 rounded-full">G1</span>
            <span className="text-xs text-green-300">{race.track}</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{race.name} AI予想完全攻略</h1>
          <div className="flex flex-wrap gap-3 text-sm text-green-200 mb-4">
            <span>{race.displayDate}</span>
            <span>{race.venue}</span>
            <span>{race.distance}</span>
            {!isPast && daysLeft > 0 && (
              <span className="bg-red-600 text-white text-xs font-black px-3 py-0.5 rounded-full">あと{daysLeft}日</span>
            )}
            {isPast && (
              <span className="bg-gray-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">レース終了</span>
            )}
          </div>
          <p className="text-green-200 text-sm max-w-2xl">{race.description}</p>
        </div>
      </section>

      {/* AI分析ポイント */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">AIが{race.name}を分析する4つのポイント</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {race.aiPoints.map((point, i) => (
              <div key={i} className="bg-green-50 border border-green-200 rounded-xl p-5">
                <h3 className="font-bold text-green-800 text-sm mb-2">{point.title}</h3>
                <p className="text-green-700 text-xs leading-relaxed">{point.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AIで予想するCTA */}
      <section className="py-10 px-4 bg-green-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-2">{race.name}をAIで予想する</h2>
          <p className="text-green-200 text-sm mb-6">30秒で本命◎・対抗○・単穴▲と買い目が自動生成されます。登録不要・2レース無料。</p>
          <Link
            href="/predict"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-4 px-10 rounded-full text-lg transition-colors"
          >
            {race.name}をAIで予想する →
          </Link>
          <p className="text-green-400 text-xs mt-2">登録不要・カード不要・2レース無料体験</p>
        </div>
      </section>

      {/* 攻略ポイント5選 */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">AIが導く{race.name}攻略の5ポイント</h2>
          <div className="space-y-3">
            {race.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4">
                <span className="bg-green-600 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-gray-700 text-sm">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 過去3年実績 */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-2">過去3年の{race.name}傾向</h2>
          <p className="text-gray-500 text-xs mb-6">AIが過去データを参考にした予想を生成します。</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-green-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">年度</th>
                  <th className="px-4 py-3 text-left font-bold">勝ち馬</th>
                  <th className="px-4 py-3 text-left font-bold">単勝オッズ</th>
                  <th className="px-4 py-3 text-left font-bold">特徴</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {race.history.map((h, i) => (
                  <tr key={i} className="hover:bg-green-50">
                    <td className="px-4 py-3 font-bold text-gray-900">{h.year}</td>
                    <td className="px-4 py-3 font-bold text-green-700">{h.horse}</td>
                    <td className="px-4 py-3 text-gray-700">{h.odds}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{h.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">※ 参考データです。馬名・オッズは実際と異なる場合があります。</p>
        </div>
      </section>

      {/* バックテスト連動 */}
      <section className="py-10 px-4 bg-yellow-50 border-y border-yellow-200">
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-bold text-yellow-800 text-sm">📊 競馬予想AIのG1実績（バックテスト）</p>
            <p className="text-yellow-700 text-xs mt-1">重賞・G1バックテスト実施中（n=3）。実績値は<a href="/backtest/results" className="underline">バックテストページ</a>で全記録公開中。※参考情報のため投資判断に使用しないでください。</p>
          </div>
          <Link href="/backtest/results"
            className="text-xs bg-green-700 text-white font-bold px-4 py-2 rounded-full hover:bg-green-800 transition-colors">
            全記録を見る →
          </Link>
        </div>
      </section>

      {/* 他のG1レース */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-6">他のG1レースAI予想ガイド</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(G1_DATA)
              .filter(([s]) => s !== slug)
              .slice(0, 4)
              .map(([s, r]) => (
                <Link key={s} href={`/race/${s}`}
                  className="bg-green-50 border border-green-200 rounded-xl p-4 hover:border-green-400 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-yellow-400 text-green-900 font-black px-2 py-0.5 rounded-full">G1</span>
                    <span className="text-xs text-gray-500">{r.displayDate}</span>
                  </div>
                  <div className="text-sm font-bold text-gray-900">{r.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{r.venue} {r.distance}</div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-10 px-4 bg-green-900 text-white text-center">
        <h2 className="text-xl font-bold mb-2">今すぐAI予想を試してみる（無料）</h2>
        <p className="text-green-200 text-sm mb-6">登録不要・2レース無料・30秒で本命と買い目が決まる</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link href="/predict"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-4 px-8 rounded-full text-base transition-colors">
            無料で予想を見る →
          </Link>
          <Link href="/backtest/results"
            className="inline-block border-2 border-white/50 hover:border-white text-white font-bold py-4 px-8 rounded-full text-base transition-colors">
            実績を見る →
          </Link>
        </div>
      </section>

      <footer className="text-center py-8 text-sm text-gray-400 border-t">
        <div className="space-x-4 mb-2">
          <Link href="/legal" className="hover:text-gray-600">特定商取引法</Link>
          <Link href="/terms" className="hover:text-gray-600">利用規約</Link>
          <Link href="/privacy" className="hover:text-gray-600">プライバシーポリシー</Link>
          <Link href="/" className="hover:text-gray-600">トップへ</Link>
        </div>
        <p className="text-xs text-gray-400">※本サービスはエンターテインメント目的の予想情報サービスです。馬券購入は自己判断・自己責任で行ってください。</p>
        <p>© 2026 競馬予想AI</p>
      </footer>
    </div>
  );
}
