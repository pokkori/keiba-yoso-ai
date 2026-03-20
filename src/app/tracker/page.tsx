"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Record = {
  id: string;
  date: string;
  race: string;
  investment: number;
  recovery: number;
};

export default function TrackerPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [race, setRace] = useState("");
  const [investment, setInvestment] = useState("");
  const [recovery, setRecovery] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  // URLパラメータからレース情報を自動入力
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raceParam = params.get("race");
    const dateParam = params.get("date");
    if (raceParam) setRace(raceParam);
    if (dateParam) setDate(dateParam);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("keiba-records");
    if (saved) setRecords(JSON.parse(saved));
  }, []);

  const save = (newRecords: Record[]) => {
    setRecords(newRecords);
    localStorage.setItem("keiba-records", JSON.stringify(newRecords));
  };

  const addRecord = () => {
    if (!race || !investment || !recovery) return;
    const newRecord: Record = {
      id: Date.now().toString(),
      date,
      race,
      investment: Number(investment),
      recovery: Number(recovery),
    };
    save([newRecord, ...records]);
    setRace("");
    setInvestment("");
    setRecovery("");
  };

  const deleteRecord = (id: string) => {
    save(records.filter((r) => r.id !== id));
  };

  // フィルタ済みレコード
  const filteredRecords = filterMonth
    ? records.filter(r => r.date.startsWith(filterMonth))
    : records;

  const totalInvestment = filteredRecords.reduce((s, r) => s + r.investment, 0);
  const totalRecovery = filteredRecords.reduce((s, r) => s + r.recovery, 0);
  const totalProfit = totalRecovery - totalInvestment;
  const recoveryRate = totalInvestment > 0 ? ((totalRecovery / totalInvestment) * 100).toFixed(1) : "0.0";

  // 月別リスト
  const months = [...new Set(records.map(r => r.date.slice(0, 7)))].sort().reverse();

  // SVGグラフデータ（直近20件）
  const graphRecords = [...records].reverse().slice(0, 20);
  const graphPoints = (() => {
    let cumBet = 0, cumRet = 0;
    return graphRecords.map((r, i) => {
      cumBet += r.investment;
      cumRet += r.recovery;
      return { x: i, roi: cumBet > 0 ? Math.round((cumRet / cumBet) * 100) : 100 };
    });
  })();

  const renderSvgGraph = () => {
    if (graphPoints.length < 2) return null;
    const W = 600, H = 120, PAD = { l: 40, r: 10, t: 10, b: 30 };
    const chartW = W - PAD.l - PAD.r;
    const chartH = H - PAD.t - PAD.b;
    const n = graphPoints.length;
    const maxY = Math.max(200, ...graphPoints.map(p => p.roi));
    const minY = Math.min(0, ...graphPoints.map(p => p.roi));
    const rangeY = maxY - minY || 1;
    const toX = (i: number) => PAD.l + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
    const toY = (roi: number) => PAD.t + (1 - (roi - minY) / rangeY) * chartH;
    const y100 = toY(100);
    const pathD = graphPoints.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(p.roi).toFixed(1)}`).join(" ");
    const areaD = `${pathD} L${toX(n - 1).toFixed(1)},${(PAD.t + chartH).toFixed(1)} L${toX(0).toFixed(1)},${(PAD.t + chartH).toFixed(1)} Z`;
    const lastRoi = graphPoints[graphPoints.length - 1]?.roi ?? 100;
    const lineColor = lastRoi >= 100 ? "#16a34a" : "#ef4444";
    const fillColor = lastRoi >= 100 ? "#bbf7d080" : "#fecaca80";

    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-900">📈 回収率推移グラフ（直近{n}レース）</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lastRoi >= 100 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            現在 {lastRoi}%
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
          <line x1={PAD.l} y1={y100} x2={W - PAD.r} y2={y100} stroke="#d1fae5" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x={PAD.l - 3} y={y100 + 4} fontSize="8" fill="#6b7280" textAnchor="end">100%</text>
          <path d={areaD} fill={fillColor} />
          <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {graphPoints.map((p, i) => (
            <circle key={i} cx={toX(i)} cy={toY(p.roi)} r={n > 10 ? 2.5 : 3.5}
              fill={p.roi >= 100 ? "#16a34a" : "#ef4444"} stroke="white" strokeWidth="1" />
          ))}
          {graphPoints.map((p, i) => {
            if (n > 10 && i % 5 !== 0 && i !== n - 1) return null;
            const label = graphRecords[i]?.race?.replace(/^\S+ /, "").slice(0, 4) ?? "";
            return <text key={i} x={toX(i)} y={H - 5} fontSize="7" fill="#9ca3af" textAnchor="middle">{label}</text>;
          })}
          {[50, 100, 150].map(v => {
            if (v < minY || v > maxY) return null;
            const yv = toY(v);
            return (
              <g key={v}>
                <line x1={PAD.l - 3} y1={yv} x2={PAD.l} y2={yv} stroke="#d1d5db" />
                <text x={PAD.l - 5} y={yv + 3} fontSize="7" fill="#9ca3af" textAnchor="end">{v}</text>
              </g>
            );
          })}
        </svg>
        <p className="text-xs text-gray-400 text-center mt-1">※累積回収率の推移（100%以上 = プラス収支）</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-green-200 bg-green-900">
        <Link href="/" className="text-xl font-bold text-white">🏇 競馬予想AI</Link>
        <div className="flex items-center gap-4">
          <Link href="/predict" className="text-sm text-green-200 hover:text-white transition-colors">予想する</Link>
          <Link href="/backtest" className="text-sm text-green-200 hover:text-white transition-colors">的中検証</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">📊 回収率トラッカー</h1>
          <p className="text-gray-500 text-sm">馬券成績を記録して回収率を管理・可視化しましょう</p>
        </div>

        {/* 月別フィルタ */}
        {months.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-xs text-gray-500 font-medium">月別表示:</span>
            <button
              onClick={() => setFilterMonth("")}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${!filterMonth ? "bg-green-700 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"}`}
            >
              全期間
            </button>
            {months.map(m => (
              <button key={m}
                onClick={() => setFilterMonth(m)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${filterMonth === m ? "bg-green-700 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"}`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* 集計サマリー */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "試行回数", value: `${filteredRecords.length}R`, color: "text-gray-800" },
            { label: "累計投資", value: `¥${totalInvestment.toLocaleString()}`, color: "text-gray-800" },
            { label: "累計回収", value: `¥${totalRecovery.toLocaleString()}`, color: totalRecovery >= totalInvestment ? "text-green-700" : "text-gray-700" },
            { label: "回収率", value: `${recoveryRate}%`, color: Number(recoveryRate) >= 100 ? "text-yellow-600" : "text-red-600" },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
              <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>

        {/* 損益バッジ */}
        {filteredRecords.length > 0 && (
          <div className={`rounded-xl p-3 mb-5 text-center font-bold text-sm ${totalProfit >= 0 ? "bg-green-50 border border-green-300 text-green-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {totalProfit >= 0
              ? `✅ 現在 +¥${totalProfit.toLocaleString()} のプラス収支（${filteredRecords.length}レース集計）`
              : `📉 現在 -¥${Math.abs(totalProfit).toLocaleString()} のマイナス収支（${filteredRecords.length}レース集計）`
            }
            <p className="text-xs font-normal mt-0.5 opacity-70">※統計的有意性には30件以上のサンプルが必要です</p>
          </div>
        )}

        {/* SVGグラフ */}
        {renderSvgGraph()}

        {/* 入力フォーム */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">+ 記録を追加</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">日付</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">レース名</label>
              <input type="text" value={race} onChange={(e) => setRace(e.target.value)}
                placeholder="例: 東京11R 高松宮記念"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">投資額（円）</label>
              <input type="number" value={investment} onChange={(e) => setInvestment(e.target.value)}
                placeholder="3000"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">回収額（円）</label>
              <input type="number" value={recovery} onChange={(e) => setRecovery(e.target.value)}
                placeholder="5400（外れは0）"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
          </div>
          <button onClick={addRecord}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl transition-colors text-sm">
            📝 記録する
          </button>
        </div>

        {/* 履歴一覧 */}
        {filteredRecords.length > 0 ? (
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-3">記録一覧 ({filteredRecords.length}件)</h2>
            <div className="space-y-2">
              {filteredRecords.map((r) => {
                const profit = r.recovery - r.investment;
                const rate = r.investment > 0 ? ((r.recovery / r.investment) * 100).toFixed(0) : "0";
                return (
                  <div key={r.id}
                    className={`flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm ${r.recovery >= r.investment ? "border-green-200" : "border-red-100"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{r.race}</p>
                      <p className="text-xs text-gray-400">{r.date}</p>
                    </div>
                    <div className="text-right mr-4 shrink-0">
                      <p className="text-xs text-gray-500">¥{r.investment.toLocaleString()} → ¥{r.recovery.toLocaleString()}</p>
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${Number(rate) >= 100 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {rate}%
                        </span>
                        <span className={`text-sm font-bold ${profit >= 0 ? "text-green-700" : "text-red-500"}`}>
                          {profit >= 0 ? `+¥${profit.toLocaleString()}` : `-¥${Math.abs(profit).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => deleteRecord(r.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
                      title="削除">×</button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-200">
            <p className="text-4xl mb-3">🏇</p>
            <p className="font-medium text-gray-600 mb-1">まだ記録がありません</p>
            <p className="text-sm">レース結果を記録して回収率を管理しましょう</p>
            <Link href="/predict" className="inline-block mt-4 bg-green-700 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-green-800 transition-colors">
              AI予想を試す →
            </Link>
          </div>
        )}

        {/* 免責 */}
        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-bold mb-1">⚠️ 重要な免責事項</p>
          <p>記録データはこのデバイスのブラウザ（localStorage）にのみ保存されます。回収率の結果は過去の参考情報であり、将来の的中・収益を保証するものではありません。競馬は公営競技です。18歳未満の方のご利用はできません。馬券購入は余裕資金でご自身の判断と責任で行ってください。</p>
        </div>
      </div>
    </div>
  );
}
