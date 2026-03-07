import Anthropic from "@anthropic-ai/sdk";
import { TwitterApi } from "twitter-api-v2";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

const APP_URL = "https://keiba-yoso-ai.vercel.app";

function getJSTHour(): number {
  return (new Date().getUTCHours() + 9) % 24;
}

function getJSTDayOfWeek(): number {
  const now = new Date();
  const jstMs = now.getTime() + 9 * 60 * 60 * 1000;
  return new Date(jstMs).getUTCDay(); // 0=日, 5=金, 6=土
}

const MORNING_TOPICS = [
  { title: "今日の競馬、AI予想で楽しもう", body: "今日のJRAレース、AIが出走馬の過去成績・騎手・斤量を自動分析して本命◎・対抗○・単穴▲を提案。軍資金を入れれば具体的な購入金額まで出ます。" },
  { title: "競馬の勝率を上げる3つのポイント", body: "①騎手の近況（乗り替わりは要注意）②馬場状態との適性③前走からの距離変化。AIはこれらを全馬分まとめて分析します。" },
  { title: "今日の注目馬はどれ？", body: "AIが出走表から直近5走の成績を自動取得して分析。「前走1着の逃げ馬が有利なら距離短縮狙い」など、自分では時間がかかる分析を30秒で。" },
  { title: "軍資金3,000円の配分どうする？", body: "三連複ボックスに全部突っ込む？それとも馬連の軸流し？AIに軍資金を入れると「本命を軸に三連複○○円＋単勝○○円」と具体的に配分提案してくれます。" },
  { title: "差し馬が決まるのはどんな日？", body: "重い馬場・長距離・多頭数のレースは後ろから来る馬が有利になりやすい。AIはレース展開予想も出してくれるので参考に。" },
];

const AFTERNOON_TOPICS = [
  { title: "午後のメインレース、AIで最終確認", body: "午後のレースはもう決まった？AIの予想はレース直前でも使えます。出走馬データをリアルタイム取得して分析するので今すぐチェックを。" },
  { title: "前半の結果はどうだった？", body: "前半外れても後半で取り返せる。AIがレースごとに独立して分析するので、後半のレースを改めて予想してみましょう。" },
  { title: "重賞レースほどAIが得意な理由", body: "重賞は出走馬の過去成績が豊富。前走G1組・格上げ挑戦馬・叩き2戦目など、AIが複合的なパターンを分析して穴馬も探します。" },
];

const FRIDAY_TOPICS = [
  { title: "今週末の競馬、AIと一緒に楽しもう", body: "土日のJRA全開催レースをAIが予想します。登録不要・今すぐ無料で1レース体験できます。軍資金別の買い目まで提案。" },
  { title: "週末競馬の予習はもう済んだ？", body: "AI競馬予想なら出馬表が出た瞬間から予想OK。騎手・過去成績・斤量を全自動分析して本命◎・対抗○・単穴▲を提案します。今週末も一緒に楽しみましょう。" },
  { title: "競馬ファンに朗報。AI予想が無料で試せます", body: "生成AIが出走馬の直近5走をリアルタイム取得して分析。本命・対抗・単穴と買い目を30秒で提案。無料1レース試してみてください。" },
];

async function generateTweet(topicTitle: string, topicBody: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `競馬AIサービスのX(Twitter)投稿を作成してください。

【テーマ】${topicTitle}
【ポイント】${topicBody}
【URL】${APP_URL}

条件:
- 全体で120文字以内（URLを含む）
- 冒頭で興味を引く
- 絵文字を2〜3個使う
- ハッシュタグは #競馬予想AI #競馬 の2個のみ
- URLは末尾に一行で

投稿文のみ出力してください。説明不要。`,
    }],
  });
  return message.content[0].type === "text" ? message.content[0].text.trim() : "";
}

async function postTweet(text: string): Promise<{ id: string }> {
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
  });
  const result = await client.v2.tweet(text);
  return { id: result.data.id };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hour = getJSTHour();
  const dow = getJSTDayOfWeek();

  // トピック選択
  let topics: typeof MORNING_TOPICS;
  if (dow === 5) {
    topics = FRIDAY_TOPICS; // 金曜
  } else if (hour < 10) {
    topics = MORNING_TOPICS; // 朝（レース前）
  } else {
    topics = AFTERNOON_TOPICS; // 昼〜午後
  }

  const topic = topics[Math.floor(Math.random() * topics.length)];

  try {
    const tweetText = await generateTweet(topic.title, topic.body);
    if (!tweetText) {
      return NextResponse.json({ error: "Tweet generation failed" }, { status: 500 });
    }
    const result = await postTweet(tweetText);
    return NextResponse.json({ ok: true, id: result.id, topic: topic.title, text: tweetText });
  } catch (err) {
    console.error("Tweet error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
