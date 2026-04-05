import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 認証チェック: premium Cookieを持つユーザーのみキャンセル可能
  const premiumCookie = req.cookies.get("premium")?.value;
  if (!premiumCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // プレミアムcookieを削除して即時アクセス停止
  res.cookies.set("premium", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  res.cookies.set("stripe_premium", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
