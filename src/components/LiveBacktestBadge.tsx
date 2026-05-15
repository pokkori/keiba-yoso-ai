"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LiveStats {
  buyCount: number;
  hitRate: number;
  hitRateLow: number;
  hitRateHigh: number;
  recoveryRate: number;
}

const MIN_COUNT = 50;

export function LiveBacktestBadge() {
  const [stats, setStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    fetch("/api/backtest/stats")
      .then((r) => r.json())
      .then((data: LiveStats) => setStats(data))
      .catch(() => {});
  }, []);

  if (!stats || stats.buyCount < MIN_COUNT) return null;

  const hitPct = Math.round(stats.hitRate * 100);
  const ciLow = Math.round(stats.hitRateLow * 100);
  const ciHigh = Math.round(stats.hitRateHigh * 100);
  const rrPct = Math.round(stats.recoveryRate);
  const rrColor = rrPct >= 100 ? "text-green-400" : "text-yellow-400";

  return (
    <div className="bg-white/10 backdrop-blur border border-green-500/40 rounded-2xl p-4 mb-6 max-w-md mx-auto">
      <p className="text-green-300 text-xs font-bold mb-3 tracking-widest uppercase text-center">
        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-300 mr-1">
          LIVE
        </span>
        AIバックテスト実績（リアルタイム・参考値）
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white/10 rounded-xl px-3 py-3 text-center">
          <p className="text-yellow-300 font-black text-2xl">
            {hitPct}
            <span className="text-sm">%</span>
          </p>
          <p className="text-green-200 text-xs mt-0.5">複勝的中率</p>
          <p className="text-gray-400 text-xs">
            95%CI: {ciLow}〜{ciHigh}%
          </p>
        </div>
        <div className="bg-white/10 rounded-xl px-3 py-3 text-center">
          <p className={`font-black text-2xl ${rrColor}`}>
            {rrPct}
            <span className="text-sm">%</span>
          </p>
          <p className="text-green-200 text-xs mt-0.5">回収率</p>
          <p className="text-gray-400 text-xs">100%以上が収支プラス</p>
        </div>
      </div>
      <p className="text-green-400 text-xs text-center">
        ※<Link href="/backtest/stats" className="underline">詳細バックテストページ</Link>
        で{stats.buyCount}件の全記録を確認できます
      </p>
      <p className="text-gray-500 text-xs text-center mt-1">
        ※参考値・将来の的中・回収を保証するものではありません
      </p>
    </div>
  );
}
