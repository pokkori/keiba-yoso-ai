'use client';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'keiba_ai_streak';

function getStreakData() {
  if (typeof window === 'undefined') return { count: 0, lastDate: '' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, lastDate: '' };
    return JSON.parse(raw);
  } catch { return { count: 0, lastDate: '' }; }
}

function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const data = getStreakData();
  if (data.lastDate === today) return data;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newCount = data.lastDate === yesterday ? data.count + 1 : 1;
  const newData = { count: newCount, lastDate: today };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  return newData;
}

const MILESTONES = [
  { days: 3, label: '3日連続', color: '#CD7F32' },
  { days: 7, label: '1週間', color: '#C0C0C0' },
  { days: 14, label: '2週間', color: '#FFD700' },
  { days: 30, label: '1ヶ月', color: '#E5E4E2' },
];

export function StreakBanner() {
  const [streak, setStreak] = useState(0);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    const before = getStreakData();
    const after = updateStreak();
    setStreak(after.count);
    if (before.lastDate !== after.lastDate) setIsNew(true);
  }, []);

  if (streak === 0) return null;

  const currentMilestone = [...MILESTONES].reverse().find(m => streak >= m.days);

  return (
    <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm" role="status" aria-label={`${streak}日連続利用中`}>
      <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 23c-3.866 0-7-3.134-7-7 0-3.866 3.134-9 7-15 3.866 6 7 11.134 7 15 0 3.866-3.134 7-7 7zm0-2c2.761 0 5-2.239 5-5 0-2.38-1.826-5.632-5-10.708C8.826 8.368 7 11.62 7 14c0 2.761 2.239 5 5 5z"/>
      </svg>
      <span className="font-medium">{streak}日連続利用中</span>
      {isNew && streak > 1 && <span className="text-orange-500 font-bold animate-pulse">+1</span>}
      {currentMilestone && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${currentMilestone.color}22`, color: currentMilestone.color, border: `1px solid ${currentMilestone.color}44` }}>
          {currentMilestone.label}達成
        </span>
      )}
    </div>
  );
}
