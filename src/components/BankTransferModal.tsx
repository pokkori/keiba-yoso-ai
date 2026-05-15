"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  defaultPlan?: string;
}

const PLANS = [
  { id: "basic", label: "ベーシックプラン", price: "¥980/月", desc: "AI予想・的中率公開" },
  { id: "pro", label: "プロプラン", price: "¥1,980/月", desc: "全機能 + 詳細分析レポート" },
];

export default function BankTransferModal({ onClose, defaultPlan = "basic" }: Props) {
  const [plan, setPlan] = useState(defaultPlan);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("お名前を入力してください"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("正しいメールアドレスを入力してください"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bank-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, plan }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "エラーが発生しました"); return; }
      setDone(true);
    } catch {
      setError("通信エラーが発生しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", maxWidth: "480px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
            <h2 style={{ fontSize: "20px", color: "#1e40af", marginBottom: "12px" }}>お申し込みを受け付けました</h2>
            <p style={{ color: "#555", fontSize: "14px", marginBottom: "16px" }}>
              振込先口座をメールでお送りしました。<br />
              ご入金確認後、24時間以内にアクセスURLをご連絡します。
            </p>
            <button
              onClick={onClose}
              style={{ background: "#1e40af", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 32px", fontSize: "16px", cursor: "pointer" }}
            >
              閉じる
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", color: "#1e40af", margin: 0 }}>銀行振込でお申し込み</h2>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#9ca3af" }}>×</button>
            </div>

            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px", marginBottom: "20px", fontSize: "13px", color: "#1e40af" }}>
              クレジットカード不要。振込確認後24時間以内に有効化します。
            </div>

            {/* プラン選択 */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#374151", marginBottom: "8px" }}>プランを選択</label>
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  style={{
                    border: `2px solid ${plan === p.id ? "#1e40af" : "#e5e7eb"}`,
                    borderRadius: "8px",
                    padding: "12px 16px",
                    marginBottom: "8px",
                    cursor: "pointer",
                    background: plan === p.id ? "#eff6ff" : "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold", color: "#111", fontSize: "15px" }}>{p.label}</div>
                    <div style={{ color: "#6b7280", fontSize: "12px" }}>{p.desc}</div>
                  </div>
                  <div style={{ fontWeight: "bold", color: "#1e40af", fontSize: "16px" }}>{p.price}</div>
                </div>
              ))}
            </div>

            {/* 氏名 */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#374151", marginBottom: "6px" }}>お名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="山田 太郎"
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "6px", padding: "10px 12px", fontSize: "15px", boxSizing: "border-box" }}
              />
            </div>

            {/* メール */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#374151", marginBottom: "6px" }}>メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "6px", padding: "10px 12px", fontSize: "15px", boxSizing: "border-box" }}
              />
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#9ca3af" }}>振込先口座とアクセスURLをこちらに送信します</p>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", padding: "10px 12px", marginBottom: "16px", color: "#dc2626", fontSize: "13px" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: "100%", background: loading ? "#93c5fd" : "#1e40af", color: "#fff", border: "none", borderRadius: "8px", padding: "14px", fontSize: "16px", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "送信中..." : "申し込む（振込先を受け取る）"}
            </button>

            <p style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af", marginTop: "12px" }}>
              送信後、振込先口座をメールでお知らせします
            </p>
          </>
        )}
      </div>
    </div>
  );
}
