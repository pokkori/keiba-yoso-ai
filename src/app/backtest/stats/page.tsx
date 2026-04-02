"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BacktestStats {
  totalPredictions: number;
  buyCount: number;
  skipCount: number;
  hitCount: number;
  hitRate: number;
  hitRateLow: number;
  hitRateHigh: number;
  totalReturn: number;
  totalInvested: number;
  recoveryRate: number;
  period: { from: string; to: string };
}

const MIN_SAMPLES = 100;

export default function BacktestStatsPage() {
  const [stats, setStats] = useState<BacktestStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/backtest/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasEnoughData = stats && stats.buyCount >= MIN_SAMPLES;
  const completedBuy = stats ? stats.buyCount - (stats.buyCount - stats.hitCount - (stats.buyCount - stats.hitCount)) : 0;
  void completedBuy;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-green-800 bg-green-950 sticky top-0 z-10">
        <Link href="/" className="text-xl font-bold text-white">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="inline-block mr-2 -mt-1">
            <circle cx="14" cy="14" r="13" stroke="#22c55e" strokeWidth="2" fill="none" />
            <path d="M8 18 Q10 10 14 14 Q18 18 20 10" stroke="#fbbf24" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
          競馬予想AI
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/predict" className="text-sm text-green-300 hover:text-white transition-colors">予想する</Link>
          <Link
            href="/#pricing"
            className="bg-yellow-400 hover:bg-yellow-300 text-green-950 font-bold px-4 py-1.5 rounded-full text-sm transition-colors"
          >
            プランを見る
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 px-6 text-center bg-gradient-to-b from-green-950 to-gray-950 border-b border-green-900">
        <p className="text-xs font-bold text-green-400 tracking-widest uppercase mb-3">景表法準拠・全件公開</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
          AI予想バックテスト結果
        </h1>
        <p className="text-green-300 text-base max-w-lg mx-auto">
          AIが実際に出力した予想結果を自動記録しています。的中も外れも隠しません。
        </p>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {loading && (
          <div className="text-center text-gray-400 py-20">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mb-4" />
            <p>統計データを読み込み中...</p>
          </div>
        )}

        {!loading && !stats && (
          <div className="text-center text-gray-500 py-20">
            統計データの取得に失敗しました。
          </div>
        )}

        {!loading && stats && (
          <>
            {/* 集計概要カード */}
            <section className="mb-10">
              <h2 className="text-lg font-bold text-gray-300 mb-5">集計概要</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{stats.totalPredictions}</div>
                  <div className="text-xs text-gray-500 mt-1">総レース数</div>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{stats.buyCount}</div>
                  <div className="text-xs text-gray-500 mt-1">買い推奨数</div>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-400">{stats.skipCount}</div>
                  <div className="text-xs text-gray-500 mt-1">スキップ数</div>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-400">
                    {stats.period.from !== "-" ? stats.period.from : "—"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">集計開始日</div>
                </div>
              </div>
              {stats.period.from !== "-" && stats.period.to !== "-" && (
                <p className="text-xs text-gray-600 text-center mt-3">
                  集計期間: {stats.period.from} 〜 {stats.period.to}
                </p>
              )}
            </section>

            {/* 的中率・回収率 */}
            {!hasEnoughData ? (
              <section className="mb-10">
                <div className="bg-yellow-950/40 border border-yellow-700/60 rounded-2xl p-8 text-center">
                  <div className="text-yellow-400 font-bold text-lg mb-2">バックテスト実施中</div>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">
                    現在 <span className="text-white font-bold">{stats.buyCount}</span> 件のデータを蓄積中です。
                    <br />
                    統計的信頼性を確保するため、
                    <span className="text-yellow-400 font-bold">買い推奨{MIN_SAMPLES}件</span>
                    蓄積後に的中率・回収率を公開予定です。
                  </p>
                  <div className="bg-gray-900 rounded-full h-3 max-w-xs mx-auto overflow-hidden">
                    <div
                      className="h-3 bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (stats.buyCount / MIN_SAMPLES) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    {stats.buyCount} / {MIN_SAMPLES} 件
                  </p>
                </div>
              </section>
            ) : (
              <section className="mb-10">
                <h2 className="text-lg font-bold text-gray-300 mb-5">
                  的中率・回収率（買い推奨{stats.buyCount}件）
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-900 border border-green-800 rounded-2xl p-6 text-center">
                    <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-1">
                      {Math.round(stats.hitRate * 100)}%
                    </div>
                    <div className="text-sm font-bold text-white mb-1">複勝的中率</div>
                    <div className="text-xs text-gray-500">
                      95%CI: {Math.round(stats.hitRateLow * 100)}〜{Math.round(stats.hitRateHigh * 100)}%
                    </div>
                  </div>
                  <div className="bg-gray-900 border border-green-800 rounded-2xl p-6 text-center">
                    <div className={`text-3xl md:text-4xl font-bold mb-1 ${stats.recoveryRate >= 100 ? "text-green-400" : "text-red-400"}`}>
                      {Math.round(stats.recoveryRate)}%
                    </div>
                    <div className="text-sm font-bold text-white mb-1">回収率</div>
                    <div className="text-xs text-gray-500">100%以上が収支プラス</div>
                  </div>
                  <div className="bg-gray-900 border border-green-800 rounded-2xl p-6 text-center">
                    <div className={`text-3xl md:text-4xl font-bold mb-1 ${stats.totalReturn - stats.totalInvested >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {stats.totalReturn - stats.totalInvested >= 0 ? "+" : ""}
                      {(stats.totalReturn - stats.totalInvested).toLocaleString()}円
                    </div>
                    <div className="text-sm font-bold text-white mb-1">収支合計</div>
                    <div className="text-xs text-gray-500">100円/レース投資時</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                    <div className="text-xl font-bold text-white">{stats.hitCount}件</div>
                    <div className="text-xs text-gray-500 mt-1">的中数</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                    <div className="text-xl font-bold text-white">{stats.totalReturn.toLocaleString()}円</div>
                    <div className="text-xs text-gray-500 mt-1">払い戻し総額</div>
                  </div>
                </div>
              </section>
            )}

            {/* 免責文言 */}
            <section className="mb-8">
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                <p className="text-gray-400 text-xs leading-relaxed">
                  ※本ページのデータはAIが出力した予想結果を自動集計したものです。100円/レース投資・複勝買いを想定した参考値であり、
                  <strong className="text-gray-200">過去の実績は将来の的中を保証するものではありません。</strong>
                  馬券購入は各自の判断と責任で行ってください。競馬は公営競技であり、未成年の方の馬券購入は法律で禁止されています。
                </p>
              </div>
            </section>
          </>
        )}

        {/* CTA */}
        <section className="text-center pt-4">
          <h2 className="text-2xl font-bold text-white mb-3">
            このAIを、あなたの予想に使いませんか？
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            毎週土日・全レース対応。無料で3レース試せます。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/predict"
              className="inline-block bg-yellow-400 hover:bg-yellow-300 text-green-950 font-bold py-4 px-10 rounded-full text-base transition-colors"
            >
              まず無料で試す
            </Link>
            <Link
              href="/backtest/results"
              className="inline-block border-2 border-gray-600 hover:border-gray-400 text-gray-300 font-bold py-4 px-8 rounded-full text-base transition-colors"
            >
              詳細実績を見る
            </Link>
          </div>
        </section>
      </div>

      <footer className="text-center py-8 text-xs text-gray-600 border-t border-gray-800 space-x-4">
        <Link href="/" className="hover:text-gray-400">トップ</Link>
        <a href="/legal" className="hover:text-gray-400">特定商取引法に基づく表記</a>
        <a href="/privacy" className="hover:text-gray-400">プライバシーポリシー</a>
        <span>&copy; 2026 競馬予想AI</span>
      </footer>
    </div>
  );
}
