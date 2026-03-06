import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const isPremium = cookieStore.get("stripe_premium")?.value === "1";
  return NextResponse.json({ isPremium });
}
