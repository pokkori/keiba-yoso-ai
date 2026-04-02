'use client';
import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookie-notice-accepted')) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      role="banner"
      aria-label="Cookie使用通知"
      className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50 shadow-lg"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm">
          当サービスではサービス改善のためGoogle Analytics等の外部ツールを使用しています。詳細は
          <a href="/privacy" className="underline ml-1">プライバシーポリシー</a>
          をご確認ください。
        </p>
        <button
          onClick={() => {
            localStorage.setItem('cookie-notice-accepted', '1');
            setShow(false);
          }}
          className="bg-white text-gray-900 px-4 py-2 text-sm rounded font-medium whitespace-nowrap flex-shrink-0"
          style={{ minHeight: '44px' }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
