import * as fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function researchAlternatives() {
  console.log('=== JRDB・代替データソース調査 ===\n');

  const research = {
    timestamp: new Date().toISOString(),
    sources: {}
  };

  // 1. JRDB トライアル有無
  console.log('1. JRDB.jp チェック...');
  try {
    const res = await fetch('https://jrdb.jp', {
      headers: { 'User-Agent': UA },
      timeout: 10000
    });

    if (res.ok) {
      const html = await res.text();
      const hasTrial = html.includes('無料') || html.includes('トライアル') || html.includes('体験');
      const pricing = html.match(/\d+,\d+円|月額|¥/g) || [];

      research.sources.jrdb = {
        accessible: true,
        status: res.status,
        has_trial_mention: hasTrial,
        pricing_found: pricing.slice(0, 5),
        html_snippet: html.substring(0, 300)
      };
      console.log(`   ✓ アクセス可能: ${hasTrial ? 'トライアル記載あり' : 'なし'}`);
      console.log(`   - 価格表記: ${pricing.slice(0, 3).join(', ') || 'なし'}`);
    } else {
      research.sources.jrdb = { accessible: false, status: res.status };
      console.log(`   ✗ Status: ${res.status}`);
    }
  } catch (e) {
    research.sources.jrdb = { error: e.message };
    console.log(`   ✗ Error: ${e.message}`);
  }

  // 2. netkeiba.com のHTTP 400確認
  console.log('\n2. netkeiba.com HTTP 400確認...');
  try {
    const res = await fetch('https://www.netkeiba.com/?pid=race_list&date=2026-04-09', {
      headers: { 'User-Agent': UA },
      timeout: 10000,
      redirect: 'follow'
    });

    research.sources.netkeiba = {
      status: res.status,
      ok: res.ok,
      error: res.status === 400 ? 'HTTP 400 確認' : '正常',
      final_url: res.url
    };
    console.log(`   netkeiba.com: ${res.status} (${res.ok ? 'OK' : 'NG'})`);
  } catch (e) {
    research.sources.netkeiba = { error: e.message };
    console.log(`   ✗ Error: ${e.message}`);
  }

  // 3. 他の競馬情報サイト
  console.log('\n3. 代替データソース確認...');
  const alternatives = [
    { name: 'JRA公式', url: 'https://www.jra.go.jp/keiba/index.html' },
    { name: '競馬情報サイト', url: 'https://www.keiba.go.jp/' },
    { name: 'Rakuten Bet', url: 'https://betting.rakuten.co.jp/keiba/' },
    { name: '豊富な競馬情報', url: 'https://www.gamble.jp/' },
  ];

  for (const alt of alternatives) {
    try {
      const res = await fetch(alt.url, {
        headers: { 'User-Agent': UA },
        timeout: 5000,
        redirect: 'follow'
      });

      research.sources[alt.name] = {
        url: alt.url,
        status: res.status,
        accessible: res.ok
      };
      console.log(`   ${alt.name}: ${res.status} ${res.ok ? '✓' : '✗'}`);
    } catch (e) {
      research.sources[alt.name] = { url: alt.url, error: e.message };
      console.log(`   ${alt.name}: ✗ (${e.message})`);
    }
  }

  // 4. API方式による他サイトリサーチ
  console.log('\n4. API/JSON形式でのデータ提供サイト...');
  research.sources.api_alternatives = {
    description: '以下のサイトはJSON APIを提供している可能性あり',
    candidates: [
      {
        name: 'JRDB',
        url: 'https://jrdb.jp/',
        cost: '¥2,380/月',
        pros: '公式・最安定',
        cons: '有料'
      },
      {
        name: 'Yahoo!スポーツ競馬',
        url: 'https://sports.yahoo.co.jp/keiba/',
        cost: '0円（スクレイピング）',
        pros: 'リアルタイム・無料',
        cons: 'HTMLパース必要'
      },
      {
        name: 'Rakuten Bet',
        url: 'https://betting.rakuten.co.jp/keiba/',
        cost: '0円（スクレイピング）',
        pros: '日本大手・リアルタイム',
        cons: 'スクレイピング禁止の可能性'
      },
      {
        name: 'Open API（競馬関連）',
        url: 'GitHub/公開API検索',
        cost: '不明',
        pros: '公式API',
        cons: '存在不明'
      }
    ]
  };

  // 5. 最終推奨案
  console.log('\n5. 最終推奨案...');
  research.recommendation = {
    immediate_action: [
      'Yahoo!スポーツ競馬 HTMLスクレイピング導入（コスト0円）',
      'Puppeteer/Cheerio を使用してHTMLパース',
      'レート制限・robots.txt尊重で実装'
    ],
    medium_term: [
      'JRDB トライアル申し込み（無料期間の有無確認）',
      'netkeiba の代替検討（APIが復旧するまで）',
      'スクレイピング＋JRDBでハイブリッド構成'
    ],
    risk_mitigation: [
      'データソース複数化（Yahoo! + JRDB トライアル + 手動更新）',
      'HTMLパーサーの定期メンテナンス',
      '月1回の構造変更チェック'
    ]
  };

  console.log('\n=== リサーチ完了 ===\n');
  console.log(JSON.stringify(research, null, 2));

  fs.writeFileSync(
    'd:/99_Webアプリ/競馬予想AI/jrdb_alternatives_research.json',
    JSON.stringify(research, null, 2)
  );

  console.log('\n✓ 結果を jrdb_alternatives_research.json に保存');
}

researchAlternatives().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
