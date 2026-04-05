import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 本番環境では開発用エンドポイントを無効化
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  void req;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<script>
  localStorage.removeItem("keiba_predict_count");
  document.write("リセット完了。<a href='/predict'>予想ページへ</a>");
</script>
</body></html>`;

  const response = new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  response.cookies.set("keiba_predict_count", "0", {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    httpOnly: true,
    secure: true,
  });
  return response;
}
