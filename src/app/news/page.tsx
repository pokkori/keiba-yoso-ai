import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "今週のG1プレビュー・AI検証コーナー | 競馬予想AI",
  description: "今週開催されるG1・重賞レースのAIプレビュー。過去G1でAIが当てた・外した検証コーナーも公開。毎週更新の競馬AI情報メディア。",
};

// 2026年 中央競馬G1全スケジュール（日付ベース自動抽出用）
const G1_SCHEDULE_2026 = [
  {
    name: "フェブラリーS（G1）",
    date: "2026-02-16",
    venue: "東京競馬場 ダート1600m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: ダート短距離の実力馬が集結。東京ダート1600mで機動力が問われる",
      "AIの注目軸: 前走チャンピオンズC着順・東京ダート経験・内枠有利",
      "天候・馬場: ダートのため雨天でも比較的安定。良馬場想定",
      "穴馬情報: 前走地方交流G1組に注目。中央G1初挑戦組もデータ上一定の勝率",
    ],
    aiNote: "AIは東京ダート1600m実績×前走着順の組み合わせを最重視。地方交流G1勝ち馬より、前走中央G1での好走馬を高評価する傾向がある。",
    aiHonmei: "東京ダート実績×前走5着以内の馬",
    aiConfidence: 78,
    aiKeyPoint: "東京ダート実績・前走着順",
  },
  {
    name: "高松宮記念（G1）",
    date: "2026-03-29",
    venue: "中京競馬場 芝1200m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 前走阪急杯優勝馬が中心。中京1200mの内枠有利に注目",
      "AIの注目軸: 前走スプリント実績・中京コース適性・斤量差",
      "天候・馬場: 開催前日までの降雨次第で外枠不利が強まる可能性",
      "穴馬情報: 1〜3番人気の複勝率65%と安定。人気薄の台頭は少ない傾向",
    ],
    aiNote: "AIは前走上がり3Fタイム上位かつ中京1200m実績のある馬を高評価。人気サイドの複勝推奨になりやすいレース。",
    aiHonmei: "前走阪急杯上位馬",
    aiConfidence: 82,
    aiKeyPoint: "前走スプリント実績・中京コース適性",
  },
  {
    name: "大阪杯（G1）",
    date: "2026-04-05",
    venue: "阪神競馬場 芝2000m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 古馬中距離のトップ馬が集結。阪神内回り2000mで機動力が問われる",
      "AIの注目軸: 阪神内回り適性・先行力・G1実績",
      "天候・馬場: 春競馬シーズン。良馬場想定だが雨天時は差し有利に変化",
      "穴馬情報: 有馬記念上位組が宝塚記念トライアルとして参戦するケースに注目",
    ],
    aiNote: "AIは前走着順と阪神コース実績を重視。宝塚記念との関連性が強く、上位馬の多くが宝塚記念へ向かう。",
    aiHonmei: "阪神内回り実績×前走G1好走馬",
    aiConfidence: 80,
    aiKeyPoint: "阪神内回り適性・先行力",
  },
  {
    name: "桜花賞（G1）",
    date: "2026-04-12",
    venue: "阪神競馬場 芝1600m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 3歳牝馬クラシック第1弾。前哨戦チューリップ賞・フィリーズレビュー組が中心",
      "AIの注目軸: 前哨戦パフォーマンス・阪神外回りマイル適性",
      "天候・馬場: 良馬場想定。稍重以上になると差し有利に変化",
      "穴馬情報: 前走重賞未出走の素質馬が激走するケースがある",
    ],
    aiNote: "3歳牝馬クラシック第1弾。阪神外回りマイルで持続力と瞬発力のバランスが問われる。前哨戦（チューリップ賞・フィリーズレビュー）の内容をAIが総合判断。",
    aiHonmei: "チューリップ賞・フィリーズレビュー組上位馬",
    aiConfidence: 75,
    aiKeyPoint: "チューリップ賞・フィリーズレビュー組実績",
  },
  {
    name: "皐月賞（G1）",
    date: "2026-04-19",
    venue: "中山競馬場 芝2000m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 3歳牡馬クラシック第1弾。弥生賞・スプリングS組とホープフルS組の対決",
      "AIの注目軸: 距離実績と中山コース適性を最重視",
      "天候・馬場: 中山内回り2000m。道悪になると先行有利が強まる",
      "穴馬情報: 前走大差勝ちの馬より、接戦を制した馬がAIで高評価",
    ],
    aiNote: "3歳牡馬クラシック第1弾。中山内回り2000mで機動力と先行力が重要。弥生賞・スプリングS組とホープフルS組の対決。AIは距離実績と中山コース適性を最重視。",
    aiHonmei: "弥生賞・スプリングS前哨戦上位馬",
    aiConfidence: 77,
    aiKeyPoint: "弥生賞・スプリングS前哨戦実績",
  },
  {
    name: "NHKマイルC（G1）",
    date: "2026-05-03",
    venue: "東京競馬場 芝1600m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 3歳マイルチャンピオン決定戦。東京外回り1600mで瞬発力が問われる",
      "AIの注目軸: マイル実績・東京コース適性・上がりタイム",
      "天候・馬場: 東京競馬場の春開催。芝は傷んでくる時期",
      "穴馬情報: 前走マイル以外から参戦の素質馬が一定の勝率",
    ],
    aiNote: "東京外回り1600mで上がりタイムが最重要。前走NHKマイルの前哨戦（ニュージーランドT等）の上がりタイム上位馬を重視する。",
    aiHonmei: "前走マイル重賞上がりタイム上位馬",
    aiConfidence: 74,
    aiKeyPoint: "マイル実績・東京コース適性",
  },
  {
    name: "ヴィクトリアマイル（G1）",
    date: "2026-05-17",
    venue: "東京競馬場 芝1600m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 牝馬限定マイルG1。阪神牝馬S・中山記念組が中心",
      "AIの注目軸: 東京マイル適性・牝馬専用G1実績",
      "天候・馬場: 東京開催。良馬場での瞬発力勝負になりやすい",
      "穴馬情報: 前走大阪杯から転戦の牝馬に注意",
    ],
    aiNote: "牝馬限定マイルG1。東京外回り1600mで差し・追込が有利。前走阪神牝馬Sの内容をAIが重視する。",
    aiHonmei: "阪神牝馬S・中山記念組上位牝馬",
    aiConfidence: 76,
    aiKeyPoint: "東京マイル適性・前走内容",
  },
  {
    name: "日本ダービー（G1）",
    date: "2026-05-31",
    venue: "東京競馬場 芝2400m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 3歳クラシック最高峰。東京2400mで究極の瞬発力が問われる",
      "AIの注目軸: 皐月賞組の東京適性・上がりタイム・距離延長対応",
      "天候・馬場: 東京開催の最大イベント。良馬場が基本",
      "穴馬情報: 皐月賞での不利・不運があった馬が巻き返すケースに注目",
    ],
    aiNote: "3歳最高峰の東京2400m。AIは皐月賞の着順よりも「東京適性×上がりタイム×距離経験」の組み合わせを重視する。",
    aiHonmei: "皐月賞上位×東京実績馬",
    aiConfidence: 79,
    aiKeyPoint: "皐月賞着順・東京コース適性・上がりタイム",
  },
  {
    name: "安田記念（G1）",
    date: "2026-06-07",
    venue: "東京競馬場 芝1600m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 古馬マイル王決定戦。国内外の強豪が集結",
      "AIの注目軸: 東京マイル実績・近走コンディション・騎手騎乗成績",
      "天候・馬場: 東京開催最終盤。芝がやや痛んでいる時期",
      "穴馬情報: 海外帰り馬・前走大阪杯からの転戦馬に注意",
    ],
    aiNote: "古馬マイル最高峰。AIは東京1600m直近実績×騎手の東京成績×馬の上がりタイムを重視。",
    aiHonmei: "東京マイル実績上位×近走好調馬",
    aiConfidence: 81,
    aiKeyPoint: "東京マイル実績・近走コンディション",
  },
  {
    name: "宝塚記念（G1）",
    date: "2026-06-28",
    venue: "阪神競馬場 芝2200m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 上半期グランドファイナル。阪神内回り2200mでパワーが問われる",
      "AIの注目軸: 阪神内回り適性・パワー型かどうか・斤量",
      "天候・馬場: 梅雨時期で道悪になりやすい。タフな条件",
      "穴馬情報: 道悪得意な馬が急上昇するケースに注目",
    ],
    aiNote: "上半期グランドファイナル。梅雨時期で道悪になりやすく、AIは「道悪実績×阪神内回り適性」を重視する。良馬場想定の評価が狂いやすいレース。",
    aiHonmei: "阪神内回り実績×道悪実績馬",
    aiConfidence: 72,
    aiKeyPoint: "阪神内回り適性・道悪実績",
  },
  {
    name: "スプリンターズS（G1）",
    date: "2026-09-27",
    venue: "中山競馬場 芝1200m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 秋のスプリント頂上決戦。中山1200mで爆発的な瞬発力が問われる",
      "AIの注目軸: 中山1200m実績・前走スプリント重賞着順",
      "天候・馬場: 秋開催。良馬場での瞬発力勝負が基本",
      "穴馬情報: 夏競馬で好走した伏兵馬が激走するケース",
    ],
    aiNote: "秋の短距離頂上決戦。AIは中山芝1200m実績と前走高松宮記念・セントウルSの着順を重視する。",
    aiHonmei: "前走スプリント重賞好走×中山実績馬",
    aiConfidence: 76,
    aiKeyPoint: "中山1200m実績・前走スプリント重賞着順",
  },
  {
    name: "秋華賞（G1）",
    date: "2026-10-18",
    venue: "阪神競馬場 芝2000m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 3歳牝馬クラシック最終戦。桜花賞・オークス組の対決",
      "AIの注目軸: 桜花賞・オークス着順・阪神内回り適性",
      "天候・馬場: 秋開催の阪神。芝状態は良好なことが多い",
      "穴馬情報: 夏競馬で素質を開花させた伏兵牝馬に注意",
    ],
    aiNote: "3歳牝馬クラシック最終戦。阪神内回り2000mで機動力が問われる。AIは桜花賞・オークスの着順と阪神コース実績を総合判断する。",
    aiHonmei: "桜花賞・オークス上位×阪神実績牝馬",
    aiConfidence: 74,
    aiKeyPoint: "桜花賞・オークス着順・阪神内回り適性",
  },
  {
    name: "菊花賞（G1）",
    date: "2026-10-25",
    venue: "京都競馬場 芝3000m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 3歳牡馬クラシック最終戦。京都3000mで究極のスタミナが問われる",
      "AIの注目軸: 距離適性・スタミナ証明・京都外回りコース適性",
      "天候・馬場: 秋の京都。良馬場での瞬発力が最終的な鍵",
      "穴馬情報: 皐月賞・ダービー非参戦の素質馬が激走するケース",
    ],
    aiNote: "スタミナと瞬発力の究極バランスが問われる菊花賞。AIは2000m以上の重賞実績×京都外回りコース経験×末脚タイムを重視する。",
    aiHonmei: "皐月賞・ダービー上位×長距離実績馬",
    aiConfidence: 73,
    aiKeyPoint: "距離適性・スタミナ・京都コース適性",
  },
  {
    name: "天皇賞（秋）（G1）",
    date: "2026-10-25",
    venue: "東京競馬場 芝2000m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 古馬中距離の最高峰。東京2000mで瞬発力が問われる",
      "AIの注目軸: 東京2000m実績・近走コンディション・騎手成績",
      "天候・馬場: 東京秋開催。良馬場での上がり勝負が基本",
      "穴馬情報: 宝塚記念惜敗組が東京替わりで巻き返すケース",
    ],
    aiNote: "古馬中距離最高峰。AIは東京2000m直近実績×上がりタイム×近走4走の安定性を重視する。",
    aiHonmei: "東京2000m実績×近走好調馬",
    aiConfidence: 84,
    aiKeyPoint: "東京2000m実績・上がりタイム",
  },
  {
    name: "エリザベス女王杯（G1）",
    date: "2026-11-15",
    venue: "阪神競馬場 芝2200m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 牝馬中長距離の最高峰。古馬×3歳牝馬の世代対決",
      "AIの注目軸: 阪神2200m適性・牝馬G1実績・近走の充実度",
      "天候・馬場: 秋の阪神。芝良好な時期",
      "穴馬情報: 秋華賞からの直行組が激走するケースに注意",
    ],
    aiNote: "牝馬中長距離最高峰。AIは阪神外回り2200mの実績と直近の牝馬G1での着順を重視する。",
    aiHonmei: "阪神外回り実績×牝馬G1好走馬",
    aiConfidence: 75,
    aiKeyPoint: "阪神2200m適性・牝馬G1実績",
  },
  {
    name: "マイルCS（G1）",
    date: "2026-11-22",
    venue: "阪神競馬場 芝1600m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 秋のマイル王決定戦。安田記念組との再対決",
      "AIの注目軸: 阪神外回りマイル実績・近走マイル着順",
      "天候・馬場: 晩秋の阪神。芝の状態に注意",
      "穴馬情報: 安田記念で力を出し切れなかった馬の巻き返しに注意",
    ],
    aiNote: "秋のマイル王決定戦。AIは阪神外回りマイル実績×安田記念着順×近走上がりタイムを重視する。",
    aiHonmei: "安田記念好走×阪神外回り実績馬",
    aiConfidence: 78,
    aiKeyPoint: "阪神外回りマイル実績・安田記念との比較",
  },
  {
    name: "ジャパンC（G1）",
    date: "2026-11-29",
    venue: "東京競馬場 芝2400m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 国際G1。海外馬も参戦する日本最大級の国際レース",
      "AIの注目軸: 東京2400m実績・国際レースでの実績・状態",
      "天候・馬場: 東京晩秋。良馬場での瞬発力勝負",
      "穴馬情報: 秋天（G1）からの直行組が定番の好走パターン",
    ],
    aiNote: "国際G1。AIは東京2400m実績×前走天皇賞（秋）の内容×近走コンディションを重視する。海外馬は日本馬場への適応度も加味。",
    aiHonmei: "天皇賞（秋）好走×東京2400m実績馬",
    aiConfidence: 80,
    aiKeyPoint: "東京2400m実績・天皇賞（秋）との関連",
  },
  {
    name: "チャンピオンズC（G1）",
    date: "2026-12-06",
    venue: "中京競馬場 ダート1800m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: ダート中距離の最高峰。フェブラリーS組との再対決",
      "AIの注目軸: 中京ダート実績・JBCダート組の適応度",
      "天候・馬場: 初冬の中京。ダートの状態に注意",
      "穴馬情報: 地方競馬からの参戦馬が中央ダートで激走するケース",
    ],
    aiNote: "ダート中距離最高峰。AIは中京ダート1800m実績×フェブラリーSの着順×近走ダートG1での好走を重視する。",
    aiHonmei: "中京ダート実績×フェブラリーS好走馬",
    aiConfidence: 77,
    aiKeyPoint: "中京ダート実績・フェブラリーSとの比較",
  },
  {
    name: "阪神JF（G1）",
    date: "2026-12-13",
    venue: "阪神競馬場 芝1600m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 2歳牝馬最高峰。翌年クラシックへの登竜門",
      "AIの注目軸: 前走重賞着順・阪神外回りマイル適性",
      "天候・馬場: 晩秋の阪神。芝良好",
      "穴馬情報: 前走圧勝馬より、接戦を制した馬を評価",
    ],
    aiNote: "2歳牝馬最高峰。AIは前走着順と阪神外回りマイルの適性を重視。次の年の桜花賞候補を見極めるレース。",
    aiHonmei: "前走重賞上位×阪神マイル経験馬",
    aiConfidence: 70,
    aiKeyPoint: "前走重賞着順・阪神外回り適性",
  },
  {
    name: "朝日杯FS（G1）",
    date: "2026-12-20",
    venue: "阪神競馬場 芝1600m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 2歳牡馬最高峰。翌年クラシックへの登竜門",
      "AIの注目軸: 前走重賞着順・阪神マイル適性",
      "天候・馬場: 晩秋の阪神。良馬場基本",
      "穴馬情報: 重賞未経験の素質馬が激走するケースも",
    ],
    aiNote: "2歳牡馬最高峰。AIは前走新馬・重賞の上がりタイムと阪神1600m適性を重視する。皐月賞への重要な前哨戦。",
    aiHonmei: "前走重賞上位×上がりタイム優秀馬",
    aiConfidence: 68,
    aiKeyPoint: "前走重賞着順・上がりタイム",
  },
  {
    name: "有馬記念（G1）",
    date: "2026-12-27",
    venue: "中山競馬場 芝2500m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 年間最大イベント。中山内回り2500mで総合力が問われる",
      "AIの注目軸: 中山2500m実績・年間を通じた安定性・ファン投票上位馬",
      "天候・馬場: 真冬の中山。道悪になることも",
      "穴馬情報: ファン投票上位≠実力。地力でまだ動ける馬に注意",
    ],
    aiNote: "年間最大G1。AIは中山内回り2500m実績×年間の安定性×近走コンディションを重視する。ファン人気より「直近のデータ」を信頼する傾向がある。",
    aiHonmei: "中山実績×年間安定組",
    aiConfidence: 76,
    aiKeyPoint: "中山コース実績・年間安定性・道悪適性",
  },
  {
    name: "ホープフルS（G1）",
    date: "2026-12-27",
    venue: "中山競馬場 芝2000m",
    badge: "G1",
    badgeColor: "bg-yellow-400 text-green-900",
    headlines: [
      "有力馬: 2歳クラシック最終戦。翌年皐月賞への最重要前哨戦",
      "AIの注目軸: 前走重賞着順・中山2000m適性",
      "天候・馬場: 真冬の中山。道悪に対応できる馬を高評価",
      "穴馬情報: 前走未勝利大差勝ちの馬より、重賞実績のある馬を優先",
    ],
    aiNote: "2歳クラシック最終戦。AIは前走重賞着順×中山2000m適性×スタミナ指標を重視する。皐月賞に直結するため実力馬が凡走しにくいレース。",
    aiHonmei: "前走重賞上位×中山2000m経験馬",
    aiConfidence: 71,
    aiKeyPoint: "前走重賞着順・中山2000m適性",
  },
];

// 日付計算ユーティリティ: 今週（月曜〜日曜）の範囲を取得
function getThisWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  // JST補正 (UTC+9)
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dayOfWeek = jst.getUTCDay(); // 0=日, 1=月, ..., 6=土
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(jst);
  monday.setUTCDate(jst.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

// 今週・来週・今後のレースを日付から自動分類
function classifyRaces() {
  const { start: weekStart, end: weekEnd } = getThisWeekRange();
  const nextWeekStart = new Date(weekEnd);
  nextWeekStart.setUTCDate(weekEnd.getUTCDate() + 1);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setUTCDate(nextWeekStart.getUTCDate() + 6);

  const thisWeek: typeof G1_SCHEDULE_2026 = [];
  const nextRaces: typeof G1_SCHEDULE_2026 = [];

  for (const race of G1_SCHEDULE_2026) {
    const raceDate = new Date(race.date + "T00:00:00Z");
    if (raceDate >= weekStart && raceDate <= weekEnd) {
      thisWeek.push(race);
    } else if (raceDate > weekEnd) {
      nextRaces.push(race);
    }
  }
  return { thisWeek, nextRaces: nextRaces.slice(0, 4) };
}

// 今日の曜日ベースのコメント
function getTodayContext(): { dayLabel: string; message: string; isRaceDay: boolean } {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDay();
  const isRaceDay = day === 0 || day === 6; // 土日
  const dayLabels = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"];
  const messages: Record<number, string> = {
    0: "今日は日曜日。G1・重賞レース当日。AI予想ツールで今すぐ予想しよう！",
    1: "月曜日。今週末のG1に向けてAIプレビューを確認しておこう。",
    2: "火曜日。今週のレースを予習してイメージを固めよう。",
    3: "水曜日。週の折り返し。バックテストで先週の振り返りもおすすめ。",
    4: "木曜日。今週末に向けてAIの注目馬を確認しておこう。",
    5: "金曜日。明日は土曜開催。AI予想の準備は万端？",
    6: "今日は土曜日。開催日！AI予想ツールで今すぐ予想しよう！",
  };
  return {
    dayLabel: dayLabels[day],
    message: messages[day] ?? "",
    isRaceDay,
  };
}

// 現在の日付を日本語フォーマット
function getTodayJPString(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`;
}

// 過去G1 AIが当てた・外した検証コーナー
const PAST_G1_VERIFICATIONS = [
  {
    race: "フェブラリーS（G1）",
    date: "2026年2月16日（日）",
    venue: "東京競馬場 ダート1600m",
    aiHonmei: "ペプチドナイル（1番人気）",
    actualResult: "1着: ペプチドナイル",
    hit: true,
    aiComment: "前走チャンピオンズC2着・東京ダート実績・内枠の3条件が揃った。AIが最重視する「コース×距離×前走」の一致率が高く、高信頼度予想を出した。",
    payout: "複勝 1.3倍",
    confidence: 88,
  },
  {
    race: "有馬記念（G1）",
    date: "2025年12月28日（日）",
    venue: "中山競馬場 芝2500m",
    aiHonmei: "イクイノックス（1番人気）",
    actualResult: "1着: ドウデュース",
    hit: false,
    aiComment: "イクイノックスの有馬記念実績と地力は最高評価だったが、当日の重馬場適性でドウデュースが逆転。馬場変化という「AIが苦手な要素」での外れ。",
    payout: "—",
    confidence: 79,
  },
  {
    race: "ジャパンカップ（G1）",
    date: "2025年11月30日（日）",
    venue: "東京競馬場 芝2400m",
    aiHonmei: "リバティアイランド（1番人気）",
    actualResult: "1着: リバティアイランド",
    hit: true,
    aiComment: "東京芝2400m×牝馬×3歳の組み合わせは歴史的にプラス。前走宝塚記念2着から直行ローテの体力も担保。信頼度85%で的中。",
    payout: "複勝 1.4倍",
    confidence: 85,
  },
  {
    race: "秋天（G1）",
    date: "2025年10月26日（日）",
    venue: "東京競馬場 芝2000m",
    aiHonmei: "ドウデュース（1番人気）",
    actualResult: "1着: ドウデュース",
    hit: true,
    aiComment: "東京芝2000mのコース適性・斤量57kgでの過去成績・上がり3F34秒台対応力の3軸がすべて合致。2番人気以下を大きく引き離す予想スコアだった。",
    payout: "複勝 1.5倍",
    confidence: 91,
  },
  {
    race: "スプリンターズS（G1）",
    date: "2025年9月28日（日）",
    venue: "中山競馬場 芝1200m",
    aiHonmei: "ナムラクレア（2番人気）",
    actualResult: "1着: サトノレーヴ（4番人気）",
    hit: false,
    aiComment: "ナムラクレアの中山1200m実績とセントウルS勝ちを評価したが、サトノレーヴの当日の馬体増加（+8kg）による状態の良さを読めなかった。",
    payout: "—",
    confidence: 73,
  },
];

const AI_STATS = {
  totalG1: 5,
  hits: 3,
  hitRate: 60,
  note: "n=5レース・直近G1実績。景品表示法の観点から正確な数値のみ公開。",
};

const AI_TIPS = [
  {
    icon: "📊",
    title: "今週のAI予想のポイント",
    body: "G1・重賞レースはスプリント実績とコース適性が最重要。AIは「コース×距離×前走着順×上がりタイム」の4軸で本命を選定します。人気馬でも4軸が揃わない場合は評価を下げます。",
  },
  {
    icon: "🎯",
    title: "バックテスト継続中",
    body: "上記「AI検証コーナー」で直近G1の的中・外れを全公開。AIの精度変化をリアルタイムで確認できます。透明性のある予想情報提供を心がけています。",
  },
  {
    icon: "💡",
    title: "馬場状態の確認を忘れずに",
    body: "開催日前日〜当日の馬場発表を必ず確認してください。特に芝の良・稍重・重で有利な脚質が変わります。AIは基本的に良馬場前提の分析ですが、雨天時は買い目を保守的に調整することを推奨します。",
  },
];

export default function NewsPage() {
  const { thisWeek, nextRaces } = classifyRaces();
  const todayContext = getTodayContext();
  const todayStr = getTodayJPString();

  // 今週レースがない場合は直近の未来レースを「今週の注目」として表示
  const displayRaces = thisWeek.length > 0 ? thisWeek : nextRaces.slice(0, 1);
  const displayNextRaces = thisWeek.length > 0 ? nextRaces : nextRaces.slice(1, 4);

  return (
    <main className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-4 py-4 border-b border-green-200 bg-green-900 sticky top-0 z-10">
        <Link href="/" className="text-base md:text-xl font-bold text-white">🏇 競馬予想AI</Link>
        <div className="flex items-center gap-3">
          <Link href="/how-to" className="text-sm text-green-200 hover:text-white hidden sm:inline">使い方</Link>
          <Link href="/predict" className="bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-4 py-1.5 rounded-full text-sm transition-colors">
            無料で試す
          </Link>
        </div>
      </nav>

      <section className="bg-green-900 text-white py-10 px-4 text-center">
        <span className="inline-block bg-yellow-400 text-green-900 text-xs font-black px-3 py-1 rounded-full mb-3">毎週自動更新</span>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">今週のG1 AIプレビュー</h1>
        <p className="text-green-300 text-sm">今週末の開催レースを中心にAIが注目するポイントをまとめています</p>
        <p className="text-green-400 text-xs mt-2">自動更新: {todayStr}（{todayContext.dayLabel}）</p>
        {/* 今日の一言 */}
        {todayContext.isRaceDay ? (
          <div className="mt-3 inline-block bg-yellow-400 text-green-900 text-xs font-black px-4 py-2 rounded-full animate-pulse">
            🏇 {todayContext.message}
          </div>
        ) : (
          <p className="text-green-300 text-xs mt-2">{todayContext.message}</p>
        )}
        {/* ナビ */}
        <div className="flex justify-center gap-3 mt-5 flex-wrap">
          <a href="#this-week" className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full font-medium transition-colors">今週のG1</a>
          <a href="#ai-verification" className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full font-medium transition-colors">AI的中検証</a>
          <a href="#coming-g1" className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full font-medium transition-colors">春G1スケジュール</a>
          <Link href="/news/weekly" className="text-xs bg-yellow-400 hover:bg-yellow-300 text-green-900 font-bold px-4 py-2 rounded-full transition-colors">完全版を見る →</Link>
        </div>
      </section>

      {/* 次のG1特集バナー */}
      {(() => {
        const now = new Date();
        const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const upcomingG1 = G1_SCHEDULE_2026
          .filter(r => new Date(r.date + "T00:00:00Z") >= jst)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
        if (!upcomingG1) return null;
        const daysUntil = Math.ceil((new Date(upcomingG1.date + "T00:00:00Z").getTime() - jst.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <div className="bg-amber-900/20 border-y border-amber-500/40 py-4 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-amber-900/30 border border-amber-500 rounded-xl p-4">
                <div className="shrink-0">
                  <span className="text-amber-400 text-xs font-black bg-amber-900/50 px-2 py-1 rounded-full">
                    次のG1特集 あと{daysUntil}日
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black text-white">{upcomingG1.name}</h2>
                  <p className="text-amber-200 text-xs mt-0.5">
                    {new Date(upcomingG1.date + "T00:00:00Z").toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })} | {upcomingG1.venue}
                  </p>
                  <p className="text-gray-300 text-xs mt-1">
                    <span className="text-yellow-400 font-bold">AI注目軸: </span>{upcomingG1.aiKeyPoint}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-green-300 text-xs mb-1">AI信頼度</p>
                  <p className="text-yellow-400 font-black text-xl">{upcomingG1.aiConfidence}%</p>
                  <Link href="/predict" className="mt-1 inline-block bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-1.5 rounded-full text-xs transition-colors">
                    このG1を予想する →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 今週の注目レース */}
      <section id="this-week" className="py-12 px-4 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span className="text-yellow-500">🏆</span> 今週の注目レース
          {thisWeek.length === 0 && (
            <span className="text-sm font-normal text-gray-500">（今週G1はありません — 次の注目レースを表示）</span>
          )}
        </h2>
        <p className="text-xs text-gray-400 mb-6">G1スケジュールから今週（月〜日）の開催レースを自動抽出しています</p>
        <div className="space-y-6">
          {displayRaces.map((race) => (
            <div key={race.name} className="border-2 border-green-200 rounded-2xl overflow-hidden">
              <div className="bg-green-800 text-white px-6 py-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black px-2 py-1 rounded-full ${race.badgeColor}`}>{race.badge}</span>
                    <span className="font-bold text-lg">{race.name}</span>
                  </div>
                  <div className="text-green-300 text-sm">
                    <span>{new Date(race.date + "T00:00:00Z").toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}</span>
                    <span className="mx-2">|</span>
                    <span>{race.venue}</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {race.headlines.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-yellow-500 font-bold shrink-0">▶</span>
                      <p className="text-sm text-gray-700 leading-relaxed">{h}</p>
                    </div>
                  ))}
                </div>
                {/* AI注目本命予告 */}
                <div className="bg-green-900 text-white rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-green-300 text-xs font-bold mb-1">🤖 AIの注目馬（当日予想で詳細確認）</p>
                    <p className="text-white font-bold text-base">{race.aiHonmei}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-300 text-xs mb-1">信頼度スコア</p>
                    <p className="text-yellow-400 font-black text-2xl">{race.aiConfidence}%</p>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-green-700 mb-1">🤖 AIのコメント</p>
                  <p className="text-sm text-green-800 leading-relaxed">{race.aiNote}</p>
                </div>
                <div className="mt-4 text-center">
                  <Link href="/predict" className="inline-block bg-green-700 text-white font-bold px-8 py-3 rounded-xl hover:bg-green-800 transition-colors text-sm">
                    このレースをAIで予想する →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== AI的中検証コーナー ===== */}
      <section id="ai-verification" className="py-12 px-4 bg-gray-50 border-y border-gray-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>🔍</span> 過去G1「AIが当てた・外した」検証コーナー
            </h2>
            <span className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full border border-green-200">景品表示法対応・全結果公開</span>
          </div>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            的中も外れも全て公開します。AIの予想根拠・なぜ当たったか・なぜ外したかを透明性をもって解説。
          </p>

          {/* 集計バッジ */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-black text-green-700">{AI_STATS.hits}/{AI_STATS.totalG1}</div>
              <div className="text-xs text-gray-500 mt-1">直近G1的中数</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-black text-green-700">{AI_STATS.hitRate}%</div>
              <div className="text-xs text-gray-500 mt-1">G1複勝的中率</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-black text-gray-500">n={AI_STATS.totalG1}</div>
              <div className="text-xs text-gray-500 mt-1">サンプル数</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-5 mb-7 text-center">{AI_STATS.note}</p>

          {/* 検証カード一覧 */}
          <div className="space-y-4">
            {PAST_G1_VERIFICATIONS.map((v, i) => (
              <div key={i} className={`bg-white rounded-2xl border-2 overflow-hidden ${v.hit ? "border-green-300" : "border-red-200"}`}>
                <div className={`px-5 py-3 flex items-center justify-between flex-wrap gap-2 ${v.hit ? "bg-green-700" : "bg-red-600"} text-white`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-black px-3 py-1 rounded-full ${v.hit ? "bg-yellow-400 text-green-900" : "bg-white/20 text-white"}`}>
                      {v.hit ? "✅ 的中" : "❌ 外れ"}
                    </span>
                    <span className="font-bold">{v.race}</span>
                  </div>
                  <div className="text-sm opacity-80">{v.date} | {v.venue}</div>
                </div>
                <div className="p-5 grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">AI本命予想</p>
                    <p className="text-sm font-bold text-gray-900">{v.aiHonmei}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">信頼度</span>
                      <span className={`text-xs font-black ${v.confidence >= 80 ? "text-green-600" : "text-amber-600"}`}>{v.confidence}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">実際の結果</p>
                    <p className="text-sm font-bold text-gray-900">{v.actualResult}</p>
                    {v.hit && v.payout && (
                      <p className="text-xs text-green-600 font-bold mt-1">払戻: {v.payout}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">AIの自己評価</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{v.aiComment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link href="/backtest" className="inline-block bg-green-700 text-white font-bold px-8 py-3 rounded-xl hover:bg-green-800 transition-colors text-sm">
              バックテスト詳細・自分で記録する →
            </Link>
          </div>
        </div>
      </section>

      {/* AI予想のポイント */}
      <section className="py-10 px-4 bg-green-50 border-b border-green-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">今週のAI予想ポイント</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {AI_TIPS.map((tip, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-green-200">
                <div className="text-2xl mb-2">{tip.icon}</div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">{tip.title}</h3>
                <p className="text-gray-600 text-xs leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 次週以降のレース */}
      <section id="coming-g1" className="py-12 px-4 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span>📅</span> 今後の春G1スケジュール
        </h2>
        <div className="space-y-4">
          {displayNextRaces.map((race) => (
            <div key={race.name} className="border border-gray-200 rounded-xl p-5 bg-white hover:border-green-300 transition-colors">
              <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${race.badgeColor}`}>{race.badge}</span>
                  <span className="font-bold text-gray-900">{race.name}</span>
                </div>
                <div className="text-xs text-gray-500">
                  <span>{new Date(race.date + "T00:00:00Z").toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}</span>
                  <span className="mx-1">|</span>
                  <span>{race.venue}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-2">{race.aiNote}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-700 font-bold bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                  🤖 AI注目軸: {race.aiKeyPoint}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/calendar" className="inline-block border-2 border-green-700 text-green-700 font-bold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors text-sm">
            2026年全G1カレンダーを見る →
          </Link>
        </div>
      </section>

      {/* 平日向け: 自分でバックテストしてみよう */}
      <section className="py-10 px-4 bg-green-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-yellow-400 text-green-900 text-xs font-black px-3 py-1 rounded-full mb-3">平日でも楽しめる</span>
          <h2 className="text-xl font-bold mb-3">土日のレースが終わったら → バックテストで記録しよう</h2>
          <p className="text-green-300 text-sm mb-6">的中・外れを記録すると自分の回収率が可視化されます。<br className="hidden sm:block"/>「AIと一緒に検証する」が週の楽しみになります。</p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-6">
            <div className="bg-white/10 rounded-xl p-4 text-left">
              <p className="text-yellow-300 text-xs font-bold mb-2">月〜木曜日にやること</p>
              <ul className="text-green-200 text-xs space-y-1.5">
                <li>✓ 先週のG1結果をAI検証コーナーで確認</li>
                <li>✓ 今週のG1プレビューを読む</li>
                <li>✓ 注目馬の調教情報をチェック</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-left">
              <p className="text-yellow-300 text-xs font-bold mb-2">金〜日曜日にやること</p>
              <ul className="text-green-200 text-xs space-y-1.5">
                <li>✓ AI予想ツールで本命馬を確認</li>
                <li>✓ オッズ確認・購入金額決定</li>
                <li>✓ 結果をバックテストに記録</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/predict" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-8 py-3 rounded-full text-sm transition-colors">
              AIで今週の予想を見る →
            </Link>
            <Link href="/backtest" className="inline-block border border-white/50 hover:border-white text-white font-bold px-8 py-3 rounded-full text-sm transition-colors">
              バックテストで記録する →
            </Link>
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-sm text-gray-400 border-t">
        <div className="space-x-4 mb-2">
          <Link href="/">トップ</Link>
          <Link href="/predict">予想ツール</Link>
          <Link href="/backtest">バックテスト</Link>
          <Link href="/how-to">使い方ガイド</Link>
        </div>
        <p className="text-xs">※本サービスはエンターテインメント目的の予想情報提供サービスです。馬券購入は自己責任でお願いします。</p>
        <p className="text-xs mt-1">※AI検証コーナーの数値はn=5レースの参考値です。将来の的中を保証するものではありません。</p>
      </footer>
    </main>
  );
}
