import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PAYJP_API = "https://api.pay.jp/v1";

function auth() {
  return "Basic " + Buffer.from(process.env.PAYJP_SECRET_KEY! + ":").toString("base64");
}

async function payjpPost(path: string, body: Record<string, string>) {
  const res = await fetch(`${PAYJP_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: auth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  return res.json();
}

const PLANS: Record<string, string> = {
  basic: process.env.PAYJP_PLAN_BASIC!,
  pro: process.env.PAYJP_PLAN_PRO!,
};

export async function POST(req: NextRequest) {
  const { token, plan } = await req.json();
  if (!token) return NextResponse.json({ error: "No token" }, { status: 400 });

  try {
    if (plan === "annual") {
      // 年間一回払い: charge ¥19,800
      const charge = await payjpPost("/charges", {
        card: token,
        amount: "19800",
        currency: "jpy",
        capture: "true",
      });
      if (charge.error) {
        return NextResponse.json({ error: charge.error.message }, { status: 400 });
      }
    } else {
      // サブスクリプション (basic / pro)
      const planId = PLANS[plan ?? "basic"];
      if (!planId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

      const customer = await payjpPost("/customers", { card: token });
      if (customer.error) {
        return NextResponse.json({ error: customer.error.message }, { status: 400 });
      }

      const sub = await payjpPost("/subscriptions", {
        customer: customer.id,
        plan: planId,
      });
      if (sub.error) {
        return NextResponse.json({ error: sub.error.message }, { status: 400 });
      }
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("premium", plan === "pro" || plan === "annual" ? "pro" : "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 366,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "決済処理に失敗しました" }, { status: 500 });
  }
}
