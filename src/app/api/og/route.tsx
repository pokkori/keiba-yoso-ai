import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const race = searchParams.get("race") ?? "レース";
  const horse = searchParams.get("horse") ?? "";
  const confidence = searchParams.get("confidence") ?? "";
  const mode = searchParams.get("mode") ?? "standard";

  const isFukusho = mode === "fukusho";
  const accentColor = isFukusho ? "#f59e0b" : "#fbbf24";
  const headerLabel = isFukusho ? "複勝予想" : "AI予想";
  const headerIcon = isFukusho ? "🎯" : "◎";

  return new ImageResponse(
    (
      <div
        style={{
          background: isFukusho
            ? "linear-gradient(135deg, #451a03 0%, #92400e 100%)"
            : "linear-gradient(135deg, #052e16 0%, #14532d 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          color: "white",
          position: "relative",
        }}
      >
        {/* 背景装飾 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 20% 60%, rgba(255,255,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 40%)",
            display: "flex",
          }}
        />

        {/* ヘッダー */}
        <div
          style={{
            fontSize: 26,
            color: "rgba(255,255,255,0.7)",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>🏇</span>
          <span>競馬予想AI — {headerLabel}結果</span>
        </div>

        {/* レース名 */}
        <div
          style={{
            background: "rgba(255,255,255,0.12)",
            border: `1px solid ${accentColor}55`,
            borderRadius: 32,
            padding: "10px 40px",
            fontSize: 32,
            color: accentColor,
            fontWeight: 700,
            marginBottom: 24,
            display: "flex",
          }}
        >
          {race}
        </div>

        {/* 本命馬 */}
        {horse && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div
              style={{
                fontSize: 28,
                color: "rgba(255,255,255,0.75)",
                display: "flex",
              }}
            >
              {isFukusho ? "複勝推奨馬" : "本命馬（◎）"}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span style={{ fontSize: 56, display: "flex" }}>{headerIcon}</span>
              <span
                style={{
                  fontSize: 80,
                  fontWeight: 900,
                  color: "#ffffff",
                  display: "flex",
                }}
              >
                {horse}
              </span>
            </div>
            {confidence && (
              <div
                style={{
                  background: `${accentColor}22`,
                  border: `1px solid ${accentColor}66`,
                  borderRadius: 20,
                  padding: "6px 24px",
                  fontSize: 26,
                  color: accentColor,
                  fontWeight: 700,
                  marginTop: 8,
                  display: "flex",
                }}
              >
                信頼度 {confidence}%
              </div>
            )}
          </div>
        )}

        {!horse && (
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: "#ffffff",
              display: "flex",
            }}
          >
            AIがレースを分析中
          </div>
        )}

        {/* フッター */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            right: 40,
            fontSize: 20,
            color: "rgba(255,255,255,0.4)",
            display: "flex",
          }}
        >
          keiba-yoso-ai.vercel.app
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 40,
            fontSize: 20,
            color: "rgba(255,255,255,0.6)",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>🏇</span>
          <span>回収率193% AIの予想</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
