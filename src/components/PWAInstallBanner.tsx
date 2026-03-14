"use client";
import { useState, useEffect } from "react";

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 flex items-center gap-3 z-50 max-w-sm mx-auto">
      <div className="text-2xl">📱</div>
      <div className="flex-1">
        <p className="font-bold text-sm text-gray-900">ホーム画面に追加</p>
        <p className="text-xs text-gray-500">アプリとして使えます（無料）</p>
      </div>
      <button
        onClick={async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            setShow(false);
          }
        }}
        className="bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-lg"
      >
        追加
      </button>
      <button onClick={() => setShow(false)} className="text-gray-400 text-sm">✕</button>
    </div>
  );
}
