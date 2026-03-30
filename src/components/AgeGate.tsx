'use client';
import { useState, useEffect } from 'react';

export function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const flag = localStorage.getItem('age_verified');
    if (flag === 'true') setVerified(true);
    setLoading(false);
  }, []);

  const handleVerify = () => {
    localStorage.setItem('age_verified', 'true');
    setVerified(true);
  };

  if (loading) return null;
  if (verified) return <>{children}</>;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)' }}>
      <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 32, maxWidth: 420, width: '90%', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>年齢確認</h2>
        <p style={{ fontSize: 14, marginBottom: 8, color: '#ccc' }}>
          本サービスは公営競技の予想情報を提供しています。
        </p>
        <p style={{ fontSize: 16, marginBottom: 24, fontWeight: 'bold' }}>
          あなたは20歳以上ですか？
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={handleVerify}
            style={{ padding: '12px 32px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', minHeight: 44 }}
            aria-label="はい、20歳以上です"
          >
            はい（20歳以上）
          </button>
          <button
            onClick={() => window.location.href = 'https://www.google.com'}
            style={{ padding: '12px 32px', background: '#666', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', minHeight: 44 }}
            aria-label="いいえ、20歳未満です"
          >
            いいえ
          </button>
        </div>
        <p style={{ fontSize: 11, marginTop: 16, color: '#999' }}>
          ※ギャンブル依存症でお悩みの方は、リカバリーサポート・ネットワーク（0120-874-536）にご相談ください。
        </p>
      </div>
    </div>
  );
}
