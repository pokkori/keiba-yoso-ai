import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const BANK_NAME = process.env.BANK_NAME ?? "[BANK_NAME]";
const BRANCH_NAME = process.env.BRANCH_NAME ?? "[BRANCH_NAME]";
const ACCOUNT_NUMBER = process.env.ACCOUNT_NUMBER ?? "[ACCOUNT_NUMBER]";
const ACCOUNT_HOLDER = process.env.ACCOUNT_HOLDER ?? "[ACCOUNT_HOLDER]";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://keiba-yosou-ai.vercel.app";

const PLANS: Record<string, { label: string; price: string; amount: number }> = {
  basic: { label: "ベーシックプラン", price: "¥980/月", amount: 980 },
  pro: { label: "プロプラン", price: "¥1,980/月", amount: 1980 },
};

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
    }
    const { name, email, plan } = body as { name?: string; email?: string; plan?: string };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "お名前を入力してください" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "正しいメールアドレスを入力してください" }, { status: 400 });
    }
    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: "プランを選択してください" }, { status: 400 });
    }

    const planInfo = PLANS[plan];
    const activationToken = generateToken();
    const supabase = getSupabaseAdmin();

    const { error: dbError } = await supabase.from("bank_transfer_applications").insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      plan,
      plan_label: planInfo.label,
      amount: planInfo.amount,
      is_active: false,
      activation_token: activationToken,
      app_id: "keiba",
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("[bank-transfer] DB insert error:", dbError.message);
    }

    const resend = getResend();
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email.toLowerCase().trim(),
          subject: "【競馬予想AI】お申し込みありがとうございます - 振込先のご案内",
          html: buildUserEmailHtml({ name: name.trim(), planInfo }),
        });
        if (ADMIN_EMAIL) {
          const activateUrl = `${APP_URL}/api/bank-transfer/activate?token=${activationToken}&email=${encodeURIComponent(email.toLowerCase().trim())}`;
          await resend.emails.send({
            from: FROM_EMAIL,
            to: ADMIN_EMAIL,
            subject: `【要対応】銀行振込申し込み: ${name.trim()} (${planInfo.label})`,
            html: buildAdminEmailHtml({ name: name.trim(), email, planInfo, activateUrl }),
          });
        }
      } catch (emailErr) {
        console.error("[bank-transfer] email error:", emailErr);
      }
    } else {
      console.warn("[bank-transfer] RESEND_API_KEY not set — email skipped. token:", activationToken);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[bank-transfer] unexpected error:", err);
    return NextResponse.json({ error: "申し込み処理に失敗しました。しばらくしてから再度お試しください。" }, { status: 500 });
  }
}

function buildUserEmailHtml(params: { name: string; planInfo: (typeof PLANS)[string] }): string {
  const { name, planInfo } = params;
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>振込先のご案内</title></head>
<body style="font-family: sans-serif; color: #222; background: #f9fafb; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.07);">
    <h1 style="font-size: 20px; color: #1e40af; margin-bottom: 4px;">お申し込みありがとうございます</h1>
    <p style="color: #555; font-size: 14px; margin-bottom: 24px;">競馬予想AI</p>
    <p>${name} 様</p>
    <p>このたびは競馬予想AIにお申し込みいただき、誠にありがとうございます。</p>
    <p>以下の口座へお振込みをお願いいたします。ご入金確認後、24時間以内にアクセスURLをお送りします。</p>
    <div style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h2 style="font-size: 15px; color: #1e40af; margin-bottom: 12px;">振込先口座</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #555; width: 120px;">銀行名</td><td style="font-weight: bold;">${BANK_NAME}</td></tr>
        <tr><td style="padding: 6px 0; color: #555;">支店名</td><td style="font-weight: bold;">${BRANCH_NAME}</td></tr>
        <tr><td style="padding: 6px 0; color: #555;">口座種別</td><td style="font-weight: bold;">普通</td></tr>
        <tr><td style="padding: 6px 0; color: #555;">口座番号</td><td style="font-weight: bold;">${ACCOUNT_NUMBER}</td></tr>
        <tr><td style="padding: 6px 0; color: #555;">口座名義</td><td style="font-weight: bold;">${ACCOUNT_HOLDER}</td></tr>
      </table>
    </div>
    <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px;"><strong>お申し込みプラン:</strong> ${planInfo.label}（${planInfo.price}）</p>
      <p style="margin: 6px 0 0; font-size: 14px;"><strong>振込金額:</strong> ${planInfo.price.replace("/月", "")}（初月分）</p>
      <p style="margin: 6px 0 0; font-size: 13px; color: #92400e;">※お振込み名義に「お名前」をご入力ください</p>
    </div>
    <p style="font-size: 13px; color: #6b7280;">ご入金確認後、このメールアドレスにアクセスURLをお送りします（通常24時間以内）。</p>
    <p style="font-size: 13px; color: #6b7280;">ご不明な点は <a href="mailto:${FROM_EMAIL}" style="color: #1e40af;">${FROM_EMAIL}</a> までお問い合わせください。</p>
  </div>
</body>
</html>`;
}

function buildAdminEmailHtml(params: {
  name: string;
  email: string;
  planInfo: (typeof PLANS)[string];
  activateUrl: string;
}): string {
  const { name, email, planInfo, activateUrl } = params;
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>銀行振込申し込み通知</title></head>
<body style="font-family: sans-serif; color: #222; padding: 24px;">
  <h2>【競馬予想AI】銀行振込申し込みがありました</h2>
  <table style="border-collapse: collapse; font-size: 14px;">
    <tr><td style="padding: 6px 12px 6px 0; color: #555;">氏名</td><td><strong>${name}</strong></td></tr>
    <tr><td style="padding: 6px 12px 6px 0; color: #555;">メール</td><td>${email}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; color: #555;">プラン</td><td>${planInfo.label}（${planInfo.price}）</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; color: #555;">金額</td><td>${planInfo.amount.toLocaleString()}円</td></tr>
  </table>
  <p style="margin-top: 20px;">入金確認後、以下のURLをクリックしてアクティベートしてください:</p>
  <a href="${activateUrl}" style="background: #1e40af; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">アカウントをアクティベート</a>
  <p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">URL: ${activateUrl}</p>
</body>
</html>`;
}
