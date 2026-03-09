import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "競馬予想AI | AIが本命・穴馬・複勝を瞬時に予想";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a2a1a 50%, #0a0a0a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 80, marginBottom: 16 }}>🐎</div>
        <div style={{ fontSize: 52, fontWeight: 700, color: "#fcd34d", marginBottom: 16, textAlign: "center" }}>
          競馬予想AI
        </div>
        <div style={{ fontSize: 28, color: "#fef3c7", textAlign: "center", maxWidth: 900 }}>
          レース名を入力するだけ
        </div>
        <div style={{ fontSize: 24, color: "#fbbf24", marginTop: 12, textAlign: "center" }}>
          本命・穴馬・複勝をAIが瞬時に予想 🏆
        </div>
        <div
          style={{
            marginTop: 40,
            padding: "12px 32px",
            background: "#d97706",
            borderRadius: 40,
            fontSize: 22,
            color: "#fff",
            fontWeight: 600,
          }}
        >
          ¥980/月〜 無料プランあり
        </div>
      </div>
    ),
    { ...size }
  );
}
