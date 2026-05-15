import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://keiba-yosou-ai.vercel.app";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(`${APP_URL}/?error=invalid_claim`);
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("bank_transfer_applications")
    .select("email, is_active")
    .eq("activation_token", token)
    .eq("email", email.toLowerCase())
    .eq("app_id", "keiba")
    .single();

  if (error || !data || !data.is_active) {
    return NextResponse.redirect(`${APP_URL}/?error=claim_failed`);
  }

  // user_email クッキーを設定（isActiveSubscription が参照）
  const res = NextResponse.redirect(`${APP_URL}/predict`);
  res.cookies.set("user_email", data.email, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 31,
    path: "/",
  });

  return res;
}
