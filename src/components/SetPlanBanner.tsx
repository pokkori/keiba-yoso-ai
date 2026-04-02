"use client";

interface Props {
  onStartCheckout: (plan: string) => void;
}

/**
 * 3競技セット割引バナー
 * 競馬 + 競輪 + ボートレース 通常¥9,000/月 → ¥6,980/月（22%オフ）
 */
export function SetPlanBanner({ onStartCheckout }: Props) {
  return (
    <section
      className="py-10 px-6"
      aria-labelledby="set-plan-heading"
      data-testid="set-plan-banner"
    >
      <div className="max-w-2xl mx-auto rounded-2xl border-2 border-yellow-400 bg-gradient-to-br from-green-900 to-emerald-800 p-7 shadow-xl">
        {/* バッジ */}
        <div className="flex justify-center mb-4">
          <span className="bg-yellow-400 text-green-900 text-xs font-black px-4 py-1.5 rounded-full tracking-wide uppercase">
            期間限定 22%OFF
          </span>
        </div>

        {/* タイトル */}
        <h2
          id="set-plan-heading"
          className="text-xl font-black text-white text-center mb-2 leading-snug"
        >
          3競技セットプラン
        </h2>
        <p className="text-emerald-200 text-sm text-center mb-5">
          競馬 + 競輪 + ボートレース — 土日に3競技分のチャンス！
        </p>

        {/* 価格比較 */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="text-center">
            <p className="text-emerald-300 text-xs mb-0.5">通常合計</p>
            <p className="text-white/50 line-through text-lg font-bold">¥9,000/月</p>
          </div>
          <div className="text-yellow-400 text-2xl font-black">→</div>
          <div className="text-center">
            <p className="text-yellow-300 text-xs mb-0.5">セット価格</p>
            <p className="text-yellow-300 text-3xl font-black">¥6,980<span className="text-base font-normal">/月</span></p>
          </div>
        </div>

        {/* 特典リスト */}
        <ul className="text-sm text-emerald-100 space-y-1.5 mb-7 max-w-sm mx-auto">
          {[
            "競馬・競輪・ボートレース 全AI予想が使い放題",
            "3競技分の的中チャンスで回収率アップ",
            "いつでも解約OK（次回更新前に停止可能）",
          ].map((feat) => (
            <li key={feat} className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5 shrink-0">✓</span>
              {feat}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={() => onStartCheckout(process.env.NEXT_PUBLIC_KOMOJU_SET_PLAN_ID ?? "set-plan")}
          aria-label="3競技セットプランを申し込む（月額6,980円・22%オフ）"
          data-testid="set-plan-cta"
          className="block w-full text-center bg-yellow-400 hover:bg-yellow-300 text-green-900 font-black py-4 rounded-full text-base transition-colors min-h-[52px]"
        >
          3競技セットプランを申し込む
        </button>

        <p className="text-emerald-300 text-xs text-center mt-3">
          月¥6,980 — 3サービス個別加入（¥9,000/月）より¥2,020お得
        </p>
      </div>
    </section>
  );
}
