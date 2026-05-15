import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://keiba-yosou-ai.vercel.app";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return new NextResponse(buildHtml("エラー", "tokenとemailは必須です。", false), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const supabase = getSupabaseAdmin();

  const { data, error: fetchError } = await supabase
    .from("bank_transfer_applications")
    .select("*")
    .eq("activation_token", token)
    .eq("email", email.toLowerCase())
    .eq("app_id", "keiba")
    .single();

  if (fetchError || !data) {
    return new NextResponse(buildHtml("エラー", "申し込み情報が見つかりませんでした。", false), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (data.is_active) {
    return new NextResponse(buildHtml("確認", `${data.email} はすでにアクティベート済みです。`, true), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // is_active を true に更新
  const { error: updateError } = await supabase
    .from("bank_transfer_applications")
    .update({ is_active: true, activated_at: new Date().toISOString() })
    .eq("activation_token", token)
    .eq("email", email.toLowerCase());

  if (updateError) {
    console.error("[bank-transfer/activate] update error:", updateError.message);
    return new NextResponse(buildHtml("エラー", "アクティベートに失敗しました。", false), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // subscriptions テーブルに挿入（isActiveSubscription が参照するテーブル）
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 31);
  await supabase.from("subscriptions").upsert({
    email: data.email,
    app_id: "keiba",
    plan: data.plan,
    status: "active",
    current_period_end: periodEnd.toISOString(),
    created_at: new Date().toISOString(),
  }, { onConflict: "email,app_id" });

  // ユーザーにクレームURLを送信
  const claimUrl = `${APP_URL}/api/bank-transfer/claim?token=${token}&email=${encodeURIComponent(data.email)}`;
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "【競馬予想AI】アカウントが有効化されました - アクセスはこちら",
      html: buildActivationEmailHtml({ name: data.name, planLabel: data.plan_label, claimUrl }),
    });
  } catch (emailErr) {
    console.error("[bank-transfer/activate] email send error:", emailErr);
  }

  return new NextResponse(
    buildHtml("アクティベート完了", `${data.name} 様（${data.email}）のアカウントを有効化しました。アクセスURLをメール送信しました。`, true),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function buildHtml(title: string, message: string, success: boolean): string {
  const color = success ? "#1e40af" : "#dc2626";
  const bg = success ? "#eff6ff" : "#fef2f2";
  const border = success ? "#93c5fd" : "#fca5a5";
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>${title} - 競馬予想AI 管理</title></head>
<body style="font-family: sans-serif; background: #f9fafb; padding: 40px; text-align: center;">
  <div style="max-width: 480px; margin: 0 auto; background: ${bg}; border: 1px solid ${border}; border-radius: 12px; padding: 32px;">
    <h1 style="color: ${color}; font-size: 22px; margin-bottom: 12px;">${title}</h1>
    <p style="color: #374151; font-size: 15px;">${message}</p>
    <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">競馬予想AI 管理画面</p>
  </div>
</body>
</html>`;
}

function buildActivationEmailHtml(params: { name: string; planLabel: string; claimUrl: string }): string {
  const { name, planLabel, claimUrl } = params;
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>アカウント有効化完了</title></head>
<body style="font-family: sans-serif; color: #222; background: #f9fafb; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.07);">
    <h1 style="font-size: 20px; color: #1e40af; margin-bottom: 4px;">アカウントが有効化されました</h1>
    <p style="color: #555; font-size: 14px; margin-bottom: 24px;">競馬予想AI</p>
    <p>${name} 様</p>
    <p>ご入金を確認いたしました。${planLabel}のアカウントが有効化されました。</p>
    <p>以下のボタンをクリックするとすぐにご利用いただけます:</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${claimUrl}" style="background: #1e40af; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        競馬予想AIを使う →
      </a>
    </div>
    <p style="font-size: 12px; color: #9ca3af;">このリンクは1回のみ有効です。ご利用開始後は毎回このリンクは不要です。</p>
    <p style="font-size: 13px; color: #6b7280;">ご不明な点は <a href="mailto:${FROM_EMAIL}" style="color: #1e40af;">${FROM_EMAIL}</a> までお問い合わせください。</p>
  </div>
</body>
</html>`;
}
