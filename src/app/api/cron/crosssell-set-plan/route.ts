import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@keiba-yoso-ai.vercel.app";
const SET_PLAN_URL = "https://keiba-yoso-ai.vercel.app/#pricing";

/**
 * CRON: 毎日1回、登録7日後のユーザーに3競技セットプランのクロスセルメールを送信
 * Vercel CRON schedule: "0 10 * * *" (UTC 10:00 = JST 19:00)
 */
export async function GET(req: NextRequest) {
  // CRON_SECRET による認証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();

  // 7日前のタイムスタンプ範囲を計算
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const rangeStart = new Date(sevenDaysAgo);
  rangeStart.setUTCHours(0, 0, 0, 0);
  const rangeEnd = new Date(sevenDaysAgo);
  rangeEnd.setUTCHours(23, 59, 59, 999);

  // 7日前に登録したアクティブな競馬予想AIユーザーを取得
  const { data: users, error } = await supabase
    .from("subscriptions")
    .select("email, app_id, created_at")
    .eq("app_id", "keiba-yoso-ai")
    .eq("status", "active")
    .gte("created_at", rangeStart.toISOString())
    .lte("created_at", rangeEnd.toISOString());

  if (error) {
    console.error("[crosssell-set-plan] supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0, message: "No eligible users today" });
  }

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: user.email,
          subject: "競輪・ボートレースも予想AIで！3競技セットで22%オフ",
          html: buildEmailHtml(user.email),
        }),
      });
      if (res.ok) {
        sent++;
      } else {
        const body = await res.text();
        console.error(`[crosssell-set-plan] resend error for ${user.email}: ${body}`);
        failed++;
      }
    } catch (e) {
      console.error(`[crosssell-set-plan] fetch failed for ${user.email}:`, e);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: users.length });
}

function buildEmailHtml(email: string): string {
  const unsubUrl = `https://keiba-yoso-ai.vercel.app/api/unsubscribe?email=${encodeURIComponent(email)}`;
  const featureRows = [
    "競馬（土日）・競輪（毎日365日）・ボートレース（毎日全24場）の全AI予想が使い放題",
    "3競技分の的中チャンスで月の回収率がアップ",
    "いつでも解約OK（次回更新前に停止可能）",
  ]
    .map(
      (feat) => `
      <tr>
        <td style="padding:6px 0;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="color:#16a34a;font-size:16px;padding-right:8px;vertical-align:top;">&#10003;</td>
            <td style="color:#374151;font-size:14px;line-height:1.6;">${feat}</td>
          </tr></table>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3競技セットプラン 22%オフのご案内</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#1a4c2e 0%,#166534 100%);padding:32px 32px 24px;text-align:center;">
            <p style="margin:0;color:#86efac;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">期間限定</p>
            <h1 style="margin:8px 0 4px;color:#ffffff;font-size:24px;font-weight:900;line-height:1.3;">3競技セットプラン</h1>
            <p style="margin:0;color:#bbf7d0;font-size:14px;">競馬 + 競輪 + ボートレース</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 20px;text-align:center;background:#f0fdf4;">
            <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">通常合計</p>
            <p style="margin:0 0 8px;color:#9ca3af;font-size:20px;text-decoration:line-through;">&#165;9,000/月</p>
            <p style="margin:0 0 4px;color:#166534;font-size:13px;font-weight:700;">セット価格</p>
            <p style="margin:0;color:#166534;font-size:40px;font-weight:900;line-height:1;">&#165;6,980<span style="font-size:18px;font-weight:400;">/月</span></p>
            <p style="margin:8px 0 0;display:inline-block;background:#fef08a;color:#713f12;font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px;">22%オフ・月¥2,020お得</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">
              競馬予想AIをご利用いただきありがとうございます。<br>
              土日の競馬だけでなく、<strong>毎日開催の競輪・ボートレース</strong>もAIで分析してみませんか？
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${featureRows}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <a href="${SET_PLAN_URL}" style="display:inline-block;background:#ca8a04;color:#ffffff;font-size:16px;font-weight:900;padding:16px 40px;border-radius:999px;text-decoration:none;">3競技セットプランを申し込む</a>
            <p style="margin:12px 0 0;color:#9ca3af;font-size:12px;">月&#165;6,980 — 通常&#165;9,000から22%オフ</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
              このメールは競馬予想AIにご登録のアドレスに送信しています。<br>
              配信停止は<a href="${unsubUrl}" style="color:#6b7280;">こちら</a>からお手続きください。
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
