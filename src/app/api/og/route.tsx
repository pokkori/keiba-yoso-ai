import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const race = searchParams.get("race") ?? "レース";
  const horse = searchParams.get("horse") ?? "";
  const confidence = searchParams.get("confidence") ?? "";
  const mode = searchParams.get("mode") ?? "standard";
  const hit = searchParams.get("hit") === "1"; // 的中フラグ
  const odds = searchParams.get("odds") ?? ""; // オッズ
  const payout = searchParams.get("payout") ?? ""; // 払戻金額
  const venue = searchParams.get("venue") ?? ""; // 競馬場名

  const isFukusho = mode === "fukusho";

  // 的中時は特別デザイン（緑背景・大きな的中バッジ）
  if (hit) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "linear-gradient(135deg, #14532d 0%, #166534 40%, #15803d 100%)",
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
          {/* 背景の光エフェクト */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(250,204,21,0.25) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(74,222,128,0.15) 0%, transparent 50%)",
              display: "flex",
            }}
          />

          {/* 大きな「AI的中！」バッジ */}
          <div
            style={{
              background: "#facc15",
              color: "#14532d",
              fontSize: 44,
              fontWeight: 900,
              padding: "12px 56px",
              borderRadius: 60,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: "0 4px 24px rgba(250,204,21,0.5)",
            }}
          >
            <span>🎉</span>
            <span>AI的中！</span>
            <span>🎉</span>
          </div>

          {/* レース名 */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {venue && <span style={{ fontSize: 26, color: "#86efac" }}>{venue}</span>}
            {venue && <span style={{ color: "#4ade80" }}>|</span>}
            <span>{race}</span>
          </div>

          {/* 馬名・大きく表示 */}
          {horse && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  color: "#86efac",
                  display: "flex",
                }}
              >
                {isFukusho ? "複勝推奨馬" : "◎ 本命馬"}
              </div>
              <div
                style={{
                  fontSize: 88,
                  fontWeight: 900,
                  color: "#ffffff",
                  display: "flex",
                  lineHeight: 1,
                  textShadow: "0 2px 12px rgba(0,0,0,0.3)",
                }}
              >
                {horse}
              </div>
            </div>
          )}

          {/* オッズ・払戻情報 */}
          {(odds || payout) && (
            <div
              style={{
                display: "flex",
                gap: 20,
                marginBottom: 16,
              }}
            >
              {odds && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 16,
                    padding: "10px 28px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 16, color: "#86efac" }}>オッズ</span>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "#facc15" }}>{odds}倍</span>
                </div>
              )}
              {payout && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 16,
                    padding: "10px 28px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 16, color: "#86efac" }}>払戻</span>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "#facc15" }}>{payout}</span>
                </div>
              )}
              {confidence && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 16,
                    padding: "10px 28px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 16, color: "#86efac" }}>信頼度</span>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "#facc15" }}>{confidence}%</span>
                </div>
              )}
            </div>
          )}

          {/* 的中なのに odds/payout なし時は信頼度だけ */}
          {!odds && !payout && confidence && (
            <div
              style={{
                background: "rgba(250,204,21,0.15)",
                border: "1px solid rgba(250,204,21,0.4)",
                borderRadius: 20,
                padding: "8px 32px",
                fontSize: 28,
                color: "#facc15",
                fontWeight: 700,
                marginBottom: 16,
                display: "flex",
              }}
            >
              信頼度 {confidence}%
            </div>
          )}

          {/* フッター */}
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingLeft: 40,
              paddingRight: 40,
            }}
          >
            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.7)",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>🏇</span>
              <span>競馬予想AI</span>
            </div>
            <div
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.45)",
                display: "flex",
              }}
            >
              keiba-yoso-ai.vercel.app
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // 通常予想OGP（的中フラグなし）
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
