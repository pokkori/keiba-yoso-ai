import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("keiba_predict_count", "0", {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    httpOnly: true,
    secure: true,
  });
  return response;
}
