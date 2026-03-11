import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const APP_ID = "keiba";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "No session_id" }, { status: 400 });

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "Not paid" }, { status: 402 });
    }

    const email = session.customer_details?.email;
    if (!email) return NextResponse.json({ ok: false });

    const subId = session.subscription as string | null;
    let currentPeriodEnd: string | null = null;
    let plan = "basic";
    if (subId) {
      const stripeSub = await stripe.subscriptions.retrieve(subId);
      currentPeriodEnd = new Date((stripeSub as any).current_period_end * 1000).toISOString();
      // Determine plan from price
      const priceId = stripeSub.items.data[0]?.price.id;
      if (priceId === process.env.STRIPE_PRICE_PRO) plan = "pro";
      else if (priceId === process.env.STRIPE_PRICE_ANNUAL) plan = "annual";
    }

    const supabase = getSupabaseAdmin();
    await supabase.from("subscriptions").upsert(
      {
        email,
        app_id: APP_ID,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subId,
        stripe_session_id: sessionId,
        plan,
        status: "active",
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_session_id" }
    );

    const res = NextResponse.json({ ok: true });
    res.cookies.set("user_email", email, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 366,
      path: "/",
    });
    res.cookies.set("stripe_premium", "1", {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 366,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false });
  }
}
