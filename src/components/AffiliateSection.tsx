// 競馬予想AI向け A8.net アフィリエイトセクション
// 環境変数:
//   NEXT_PUBLIC_A8_MATSUI_URL — 松井証券（口座開設¥1,000）
//   NEXT_PUBLIC_A8_FP_URL     — FPカフェ（無料FP相談¥11,700）

interface AffiliateItem {
  title: string;
  desc: string;
  cta: string;
  href: string;
  badge: string;
  color: string;
}

export function AffiliateSection() {
  const matsuiUrl = process.env.NEXT_PUBLIC_A8_MATSUI_URL ?? '';
  const fpUrl = process.env.NEXT_PUBLIC_A8_FP_URL ?? '';

  const items: AffiliateItem[] = [
    ...(matsuiUrl ? [{
      title: '松井証券',
      desc: '老舗ネット証券。株・先物・投資信託を手数料最安水準で。口座開設無料。',
      cta: '無料で口座開設',
      href: matsuiUrl,
      badge: '口座開設無料',
      color: 'from-blue-600 to-blue-800',
    }] : []),
    ...(fpUrl ? [{
      title: 'FPカフェ',
      desc: '資産形成・保険・老後資金をプロのFPに無料相談。競馬の配当も含めた資産計画に。',
      cta: '無料FP相談を予約',
      href: fpUrl,
      badge: '完全無料',
      color: 'from-green-600 to-emerald-700',
    }] : []),
  ];

  if (items.length === 0) return null;

  return (
    <section className="px-4 py-10" aria-label="おすすめサービス">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-base font-bold text-center text-gray-500 mb-4 tracking-wider uppercase">
          競馬収益を資産に変える
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <a
              key={item.title}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={`block rounded-2xl bg-gradient-to-br ${item.color} p-4 text-white hover:opacity-90 transition-opacity`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-bold text-sm">{item.title}</span>
                <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{item.badge}</span>
              </div>
              <p className="text-xs text-white/80 mb-3 leading-relaxed">{item.desc}</p>
              <span className="inline-block text-xs font-semibold bg-white text-gray-800 rounded-full px-3 py-1">
                {item.cta} →
              </span>
            </a>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">※広告を含みます</p>
      </div>
    </section>
  );
}
