"use client";

import { useState } from "react";

interface Props {
  planId: string;
  planLabel: string;
  monthlyPrice?: number;
  className?: string;
  showAnnualToggle?: boolean;
  annualMultiplier?: number; // default 8 (2ヶ月分無料)
}

export default function KomojuButton({
  planId,
  planLabel,
  monthlyPrice = 980,
  className,
  showAnnualToggle = false,
  annualMultiplier = 8,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [planType, setPlanType] = useState<"monthly" | "annual">("monthly");

  const annualTotal = monthlyPrice * annualMultiplier;
  const annualMonthly = Math.floor(annualTotal / 12);

  const handleClick = async () => {
    setLoading(true);
    setError("");
    try {
      const body =
        planType === "annual"
          ? { planId: planId + "_annual", amount: annualTotal }
          : { planId };

      const res = await fetch("/api/komoju/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("決済の準備中です。しばらくお待ちください。");
        setLoading(false);
      }
    } catch {
      setError("通信エラーが発生しました。再度お試しください。");
      setLoading(false);
    }
  };

  return (
    <div>
      {showAnnualToggle && (
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setPlanType("monthly")}
            className={`flex-1 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
              planType === "monthly"
                ? "border-green-500 bg-green-500/10 text-white"
                : "border-white/20 text-white/50 hover:border-white/40"
            }`}
          >
            <div className="text-xs text-white/60 mb-0.5">月額</div>
            <div className="font-bold text-sm">
              ¥{monthlyPrice.toLocaleString()}/月
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPlanType("annual")}
            className={`flex-1 p-2.5 rounded-lg border text-xs font-medium relative transition-colors ${
              planType === "annual"
                ? "border-yellow-400 bg-yellow-400/10 text-white"
                : "border-white/20 text-white/50 hover:border-white/40"
            }`}
          >
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-yellow-400 text-green-900 text-xs px-2 py-0.5 rounded-full whitespace-nowrap leading-tight font-bold">
              2ヶ月分お得
            </div>
            <div className="text-xs text-white/60 mb-0.5">年額</div>
            <div className="font-bold text-sm">
              ¥{annualMonthly.toLocaleString()}/月
            </div>
            <div className="text-xs text-white/50">
              年額¥{annualTotal.toLocaleString()}一括
            </div>
          </button>
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={loading ? "決済ページへ移動中" : `${planLabel}を始める`}
        className={
          className ??
          "w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px] shadow-lg shadow-green-600/30"
        }
      >
        {loading
          ? "決済ページへ移動中..."
          : planType === "annual"
          ? `${planLabel}（年額）を始める`
          : `${planLabel}を始める`}
      </button>
      {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
    </div>
  );
}
