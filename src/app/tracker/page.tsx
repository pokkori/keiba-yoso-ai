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

  const totalInvestment = records.reduce((s, r) => s + r.investment, 0);
  const totalRecovery = records.reduce((s, r) => s + r.recovery, 0);
  const recoveryRate = totalInvestment > 0 ? ((totalRecovery / totalInvestment) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-green-200 bg-green-900">
        <Link href="/" className="text-xl font-bold text-white">🏇 競馬予想AI</Link>
        <Link href="/predict" className="text-sm text-green-200 hover:text-white transition-colors">予想する →</Link>
      </nav>

      <div className="max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">回収率トラッカー</h1>
        <p className="text-gray-500 text-sm mb-8">馬券成績を記録して回収率を管理しましょう</p>

        {/* 集計 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
            <p className="text-sm text-gray-500">累計投資</p>
            <p className="text-2xl font-bold text-gray-900">¥{totalInvestment.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
            <p className="text-sm text-gray-500">累計回収</p>
            <p className="text-2xl font-bold text-gray-900">¥{totalRecovery.toLocaleString()}</p>
          </div>
          <div className={`rounded-xl p-4 text-center border ${Number(recoveryRate) >= 100 ? "bg-yellow-50 border-yellow-300" : "bg-red-50 border-red-200"}`}>
            <p className="text-sm text-gray-500">回収率</p>
            <p className={`text-2xl font-bold ${Number(recoveryRate) >= 100 ? "text-yellow-600" : "text-red-600"}`}>
              {recoveryRate}%
            </p>
          </div>
        </div>

        {/* 入力フォーム */}
        <div className="bg-green-50 rounded-2xl p-6 border border-green-200 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">記録を追加</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">日付</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">レース名</label>
              <input type="text" value={race} onChange={(e) => setRace(e.target.value)}
                placeholder="例：東京11R 天皇賞"
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">投資額（円）</label>
              <input type="number" value={investment} onChange={(e) => setInvestment(e.target.value)}
                placeholder="3000"
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">回収額（円）</label>
              <input type="number" value={recovery} onChange={(e) => setRecovery(e.target.value)}
                placeholder="5400"
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-green-500" />
            </div>
          </div>
          <button onClick={addRecord}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl transition-colors">
            記録する
          </button>
        </div>

        {/* 履歴 */}
        {records.length > 0 ? (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">履歴</h2>
            <div className="space-y-3">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">{r.race}</p>
                    <p className="text-sm text-gray-500">{r.date}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-sm text-gray-500">投資 ¥{r.investment.toLocaleString()} → 回収 ¥{r.recovery.toLocaleString()}</p>
                    <p className={`font-bold ${r.recovery >= r.investment ? "text-green-600" : "text-red-500"}`}>
                      {r.investment > 0 ? ((r.recovery / r.investment) * 100).toFixed(0) : "0"}%
                    </p>
                  </div>
                  <button onClick={() => deleteRecord(r.id)} className="text-gray-400 hover:text-red-500 text-sm">削除</button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🏇</p>
            <p>まだ記録がありません</p>
            <p className="text-sm mt-1">レース結果を記録して回収率を管理しましょう</p>
          </div>
        )}
      </div>
    </div>
  );
}
