"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Payjp: any;
  }
}

interface Props {
  publicKey: string;
  planLabel: string;
  onSuccess: () => void;
  onClose: () => void;
  apiPath?: string;
  /** plan key to send to API (for multi-plan apps) */
  plan?: string;
}

export default function PayjpModal({
  publicKey,
  planLabel,
  onSuccess,
  onClose,
  apiPath = "/api/payjp/checkout",
  plan,
}: Props) {
  const [cardReady, setCardReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payjpRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardRef = useRef<any>(null);

  useEffect(() => {
    function initCard() {
      if (!window.Payjp) return;
      const payjp = window.Payjp(publicKey);
      payjpRef.current = payjp;
      const elements = payjp.elements();
      const card = elements.create("card");
      card.mount("#payjp-card-element");
      cardRef.current = card;
      setCardReady(true);
    }

    if (window.Payjp) {
      initCard();
    } else {
      const existing = document.getElementById("payjp-js");
      if (existing) {
        existing.addEventListener("load", initCard);
        return () => existing.removeEventListener("load", initCard);
      }
      const script = document.createElement("script");
      script.id = "payjp-js";
      script.src = "https://js.pay.jp/v2/pay.js";
      script.onload = initCard;
      document.head.appendChild(script);
    }

    return () => {
      cardRef.current?.unmount?.();
    };
  }, [publicKey]);

  const handlePay = async () => {
    if (!payjpRef.current || !cardRef.current) return;
    setLoading(true);
    setError("");
    try {
      const result = await payjpRef.current.createToken(cardRef.current);
      if (result.error) {
        setError(result.error.message ?? "カード情報の取得に失敗しました");
        return;
      }
      const body: Record<string, string> = { token: result.token.id };
      if (plan) body.plan = plan;

      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "決済に失敗しました。カード情報をご確認ください。");
        return;
      }
      onSuccess();
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">カード決済</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none font-light"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6 bg-gray-50 rounded-lg px-4 py-3">
          {planLabel}
        </p>

        <div
          id="payjp-card-element"
          className="border border-gray-300 rounded-lg p-4 mb-2 min-h-[52px] bg-white"
        />
        {!cardReady && (
          <p className="text-xs text-gray-400 mb-4">カードフォームを読み込み中...</p>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={!cardReady || loading}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4"
        >
          {loading ? "処理中..." : "支払う"}
        </button>

        <p className="text-xs text-gray-400 mt-4 text-center">
          🔒 カード情報はPAY.JP（PCI DSS準拠）で安全に処理されます。当サービスには保存されません。
        </p>
      </div>
    </div>
  );
}
