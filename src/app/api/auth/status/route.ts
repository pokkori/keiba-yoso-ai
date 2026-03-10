import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isActiveSubscription } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const APP_ID = "keiba";

export async function GET() {
  const cookieStore = await cookies();
  const email = cookieStore.get("user_email")?.value;

  if (email) {
    const isPremium = await isActiveSubscription(email, APP_ID);
    return NextResponse.json({ isPremium, email });
  }

  const stripePremium = cookieStore.get("stripe_premium")?.value === "1";
  const payjpPremium = !!cookieStore.get("premium")?.value;
  const isPremium = stripePremium || payjpPremium;
  return NextResponse.json({ isPremium });
}
