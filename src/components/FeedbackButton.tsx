'use client';
import { useState } from 'react';

export default function FeedbackButton({ serviceName }: { serviceName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim() || !rating) return;

    const existing = JSON.parse(localStorage.getItem('feedbacks') || '[]');
    existing.push({ service: serviceName, rating, feedback, date: new Date().toISOString() });
    localStorage.setItem('feedbacks', JSON.stringify(existing));

    setSubmitted(true);
    setTimeout(() => { setIsOpen(false); setSubmitted(false); setFeedback(''); setRating(null); }, 2000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="フィードバックを送る"
        className="text-sm text-gray-400 hover:text-white transition-colors underline min-h-[44px] px-2"
      >
        フィードバック
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="フィードバックモーダル"
        >
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            {submitted ? (
              <p className="text-center text-green-400 py-4">ありがとうございます！</p>
            ) : (
              <>
                <h3 className="text-white font-bold mb-4">フィードバック</h3>
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      aria-label={`${n}点`}
                      className={`flex-1 py-2 rounded-lg min-h-[44px] text-sm font-bold transition-colors ${
                        rating === n
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="ご意見をお聞かせください"
                  aria-label="フィードバックテキスト"
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 resize-none h-24 mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    aria-label="キャンセル"
                    className="flex-1 py-3 rounded-xl bg-white/10 text-gray-400 min-h-[44px]"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSubmit}
                    aria-label="送信する"
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold min-h-[44px]"
                  >
                    送信
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
