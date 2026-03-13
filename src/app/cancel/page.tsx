"use client";

import { useState } from "react";
import Link from "next/link";

const REASONS = [
  "レースを予想する機会が減った",
  "期待していた的中率ではなかった",
  "料金が高いと感じた",
  "他のサービスに乗り換えた",
  "一時的に利用を停止したい",
  "その他",
];

export default function CancelPage() {
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [reason, setReason] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      await fetch("/api/payjp/cancel", { method: "POST" });
      setStep("done");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">解約手続きが完了しました</h1>
          <p className="text-sm text-gray-500 mb-6">
            プレミアム機能のご利用ありがとうございました。<br />
            PAY.JP上の定期課金停止の確認として、以下からご連絡をお送りください。
          </p>
          <a
            href="mailto:support@pokkorilab.com?subject=競馬予想AI%20解約のご連絡&body=解約を希望します。%0D%0A登録メールアドレス：%0D%0A"
            className="block w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 text-sm mb-4"
          >
            📧 解約確認メールを送る
          </a>
          <p className="text-xs text-gray-400 mb-6">
            ※ 課金停止の手続きはサポートが確認次第対応いたします（通常1営業日以内）
          </p>
          <Link href="/" className="text-sm text-blue-500 underline hover:text-blue-700">
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">本当に解約しますか？</h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            解約すると、次回更新日以降はプレミアム機能が利用できなくなります。
          </p>

          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-sm text-blue-800">
            <p className="font-bold mb-1">解約前に確認</p>
            <ul className="space-y-1 text-xs">
              <li>・競輪開催は毎日365日。また使いたい日に再登録できます</li>
              <li>・解約後も当月末まで引き続き利用できます</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              {loading ? "処理中..." : "解約する"}
            </button>
            <button
              onClick={() => setStep("form")}
              className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 text-sm"
            >
              やめる（解約しない）
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🚴</div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">解約手続き</h1>
          <p className="text-sm text-gray-500">ご利用いただきありがとうございました</p>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">解約理由を教えてください（任意）</p>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label key={r} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">{r}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ご意見・ご要望（任意）
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="サービス改善のためにお聞かせください"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-300"
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setStep("confirm")}
            className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 text-sm"
          >
            解約手続きに進む
          </button>
          <Link
            href="/predict"
            className="block w-full text-center bg-blue-700 text-white font-bold py-3 rounded-xl hover:bg-blue-800 text-sm"
          >
            やめる（予想を続ける）
          </Link>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          解約後も当月末まで引き続きご利用いただけます
        </p>
      </div>
    </div>
  );
}
