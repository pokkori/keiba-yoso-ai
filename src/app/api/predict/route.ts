import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { venue, raceNo, raceClass, surface, distance, horses } = await req.json();

    if (!horses) {
      return NextResponse.json({ error: "出走馬情報を入力してください" }, { status: 400 });
    }

    const prompt = `以下の競馬レース情報を分析して、予想を提供してください。

開催場: ${venue}
レース: ${raceNo}R
クラス: ${raceClass}
コース: ${surface}${distance}m
出走馬情報:
${horses}

以下の形式で回答してください：
【本命（◎）】馬名と選んだ理由
【対抗（○）】馬名と選んだ理由
【単穴（▲）】馬名と選んだ理由
【推奨買い目】馬券種別と組み合わせ（例：馬連1-3、三連複1-3-5）
【レース展開予想】逃げ・先行・差しの展開予測
【注意点】荒れる可能性や注意すべき馬`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system:
        "あなたは20年以上の経験を持つ競馬予想のプロフェッショナルです。データに基づいた分析と独自の視点で、的中率の高い予想を提供します。",
      messages: [{ role: "user", content: prompt }],
    });

    const prediction = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ prediction });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "予想中にエラーが発生しました" }, { status: 500 });
  }
}
