import Link from 'next/link';

const TOOLS = [
  { name: 'クレームAI', desc: 'クレーム対応文を自動生成', url: 'https://claim-ai-nine.vercel.app', category: 'business' },
  { name: '契約書AIレビュー', desc: '契約書のリスクをAI診断', url: 'https://keiyakusho-ai.vercel.app', category: 'legal' },
  { name: '補助金AI', desc: '最適な補助金をAI診断', url: 'https://hojyokin-ai.vercel.app', category: 'business' },
  { name: '確定申告AI', desc: '確定申告書類をAI作成', url: 'https://kakutei-shinkoku-ai.vercel.app', category: 'finance' },
  { name: 'パワハラ対策AI', desc: 'ハラスメント対応をAI支援', url: 'https://pawahara-ai.vercel.app', category: 'legal' },
  { name: '相続AI', desc: '相続手続きをAI診断', url: 'https://soukoku-ai.vercel.app', category: 'finance' },
  { name: 'AI美肌診断', desc: '肌状態をAIが無料診断', url: 'https://hada-ai.vercel.app', category: 'health' },
  { name: '婚活AI', desc: 'プロフィール・メッセージをAI添削', url: 'https://konkatsu-ai.vercel.app', category: 'life' },
  { name: '告白LINE返信AI', desc: 'モテる返信をAIが生成', url: 'https://kokuhaku-line-ai.vercel.app', category: 'life' },
  { name: '占いAI', desc: '毎日の運勢をAIが鑑定', url: 'https://uranai-ai.vercel.app', category: 'life' },
  { name: 'SNS投稿生成AI', desc: 'バズるSNS投稿を自動生成', url: 'https://sns-post-generator.vercel.app', category: 'business' },
  { name: 'EC説明文生成AI', desc: '売れる商品説明を自動生成', url: 'https://ec-description-generator.vercel.app', category: 'business' },
  { name: '就活AI', desc: 'エンディングノートをAI作成', url: 'https://shukatsu-ai.vercel.app', category: 'life' },
  { name: '老後シミュレーターAI', desc: '老後の資金をAI診断', url: 'https://rougo-sim-ai.vercel.app', category: 'finance' },
  { name: 'Google口コミ返信AI', desc: '口コミ返信をAI生成', url: 'https://google-review-ai.vercel.app', category: 'business' },
  { name: '医療クレームAI', desc: '医療クレーム対応文を生成', url: 'https://iryou-claim-ai.vercel.app', category: 'business' },
  { name: '介護カスハラAI', desc: '介護現場の対応文を生成', url: 'https://kaigo-custharass-ai.vercel.app', category: 'business' },
  { name: '共同親権サポートAI', desc: '親権問題をAIがサポート', url: 'https://kyodo-shinken-ai.vercel.app', category: 'legal' },
  { name: 'AI経営計画書', desc: '経営計画書をAI自動作成', url: 'https://ai-keiei-keikaku.vercel.app', category: 'business' },
  { name: '経営レーダー', desc: '経営指標をAI分析', url: 'https://keiei-radar.vercel.app', category: 'business' },
  { name: 'LifeCompassAI', desc: '人生の悩みをAIに相談', url: 'https://lifecompass-ai.vercel.app', category: 'life' },
  { name: '競馬予想AI', desc: 'AIが競馬を分析・予想', url: 'https://keiba-yoso-ai.vercel.app', category: 'prediction' },
  { name: '競輪予想AI', desc: 'AIが競輪を分析・予想', url: 'https://keirin-yoso-ai.vercel.app', category: 'prediction' },
  { name: 'ボートレース予想AI', desc: 'AIがボートレースを予想', url: 'https://boat-yoso-ai.vercel.app', category: 'prediction' },
];

export function CrossSell({ currentService }: { currentService: string }) {
  const others = TOOLS.filter(t => t.name !== currentService);
  const currentTool = TOOLS.find(t => t.name === currentService);
  const currentCategory = currentTool?.category || '';

  const sameCategory = others.filter(t => t.category === currentCategory).slice(0, 3);
  const remaining = others.filter(t => !sameCategory.includes(t));
  const display = [...sameCategory, ...remaining].slice(0, 4);

  return (
    <section className="px-4 py-12" aria-labelledby="cross-sell-heading">
      <div className="max-w-4xl mx-auto">
        <h2 id="cross-sell-heading" className="text-xl font-bold text-center mb-6 text-gray-900">他のAIツールも試してみる</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {display.map((tool) => (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 text-center"
            >
              <p className="font-medium text-sm text-gray-900">{tool.name}</p>
              <p className="text-xs text-gray-500 mt-1">{tool.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
