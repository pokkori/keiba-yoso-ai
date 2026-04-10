import * as fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function analyzeYahooKeiba() {
  console.log('=== Yahoo!スポーツ競馬 詳細分析開始 ===\n');

  const analysis = {
    timestamp: new Date().toISOString(),
    schedule_and_results: {},
    race_detail: {},
    api_endpoints: {},
    scraping_feasibility: {}
  };

  // 1. スケジュール・結果ページ
  console.log('1. スケジュール・結果ページ分析...');
  try {
    const schedRes = await fetch('https://sports.yahoo.co.jp/keiba/schedule/', {
      headers: { 'User-Agent': UA },
      timeout: 15000
    });

    if (schedRes.ok) {
      const html = await schedRes.text();
      console.log(`   ✓ Status: ${schedRes.status}`);

      // 重要なURLパターンを抽出
      const patterns = {
        race_urls: (html.match(/\/keiba\/race\/(\d{8}\/\d{2}\/\d{2}\/\d{2})/g) || []).slice(0, 5),
        horse_urls: (html.match(/\/keiba\/horse\/(\d+)/g) || []).slice(0, 5),
        jockey_urls: (html.match(/\/keiba\/jockey\/(\d+)/g) || []).slice(0, 5),
      };

      analysis.schedule_and_results.url_patterns = patterns;
      console.log(`   - レースURL例: ${patterns.race_urls[0] || 'なし'}`);
      console.log(`   - 馬URL例: ${patterns.horse_urls[0] || 'なし'}`);
      console.log(`   - 騎手URL例: ${patterns.jockey_urls[0] || 'なし'}`);

      // データ属性やJSON-LDの確認
      const hasJsonLd = html.includes('<script type="application/ld+json">');
      const hasDataAttrs = /data-(?:grade|course|distance)/i.test(html);

      analysis.schedule_and_results.has_json_ld = hasJsonLd;
      analysis.schedule_and_results.has_data_attributes = hasDataAttrs;

      console.log(`   - JSON-LD: ${hasJsonLd ? 'あり' : 'なし'}`);
      console.log(`   - data属性: ${hasDataAttrs ? 'あり' : 'なし'}`);

      // コンテンツのサンプル（最初の3000文字から抽出）
      const contentSample = html.substring(0, 10000);
      analysis.schedule_and_results.html_contains = {
        grade_info: /G[123]|OP|3勝|2勝|1勝|未勝利/.test(contentSample),
        course_info: /芝|ダート/.test(contentSample),
        distance_info: /\d{3,4}m/.test(contentSample),
        track_condition: /良|稍重|重|不良/.test(contentSample),
        horse_count: /\d+頭/.test(contentSample),
        weather: /晴|曇|雨|小雨/.test(contentSample)
      };

      Object.entries(analysis.schedule_and_results.html_contains).forEach(([key, val]) => {
        console.log(`   - ${key}: ${val ? '✓' : '✗'}`);
      });
    }
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}`);
    analysis.schedule_and_results.error = e.message;
  }

  // 2. API エンドポイント探索
  console.log('\n2. API エンドポイント探索...');
  const apiUrls = [
    'https://sports.yahoo.co.jp/keiba/api/schedule/',
    'https://sports.yahoo.co.jp/keiba/api/race/',
    'https://sports.yahoo.co.jp/keiba/api/races/',
    'https://api.sports.yahoo.co.jp/keiba/schedule/',
    'https://api.sports.yahoo.co.jp/keiba/races/',
  ];

  for (const apiUrl of apiUrls) {
    try {
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': UA },
        timeout: 5000
      });
      console.log(`   ${apiUrl}: ${res.status}`);
      analysis.api_endpoints[apiUrl] = res.status;
    } catch (e) {
      // Timeout or network errorは記録
      analysis.api_endpoints[apiUrl] = 'timeout/error';
    }
  }

  // 3. ネットワークリクエスト（XHRまたはFetch）パターン推定
  console.log('\n3. 推定: ページロード時のデータ取得方式...');
  try {
    const mainRes = await fetch('https://sports.yahoo.co.jp/keiba/', {
      headers: { 'User-Agent': UA },
      timeout: 15000
    });

    if (mainRes.ok) {
      const html = await mainRes.text();

      // JavaScriptの非同期ロード方式を調査
      const hasNextJs = /next\.js|__NEXT_DATA__|_app\.js/i.test(html);
      const hasReact = /React|ReactDOM|react\.js/i.test(html);
      const hasVue = /Vue|vue\.js/i.test(html);
      const hasAjaxCalls = /<script[^>]*src[^>]*>(.*?)<\/script>/i.test(html);

      analysis.scraping_feasibility.framework = {
        nextjs: hasNextJs,
        react: hasReact,
        vue: hasVue
      };

      // APIまたは非同期ロードのヒント
      if (html.includes('__NEXT_DATA__')) {
        const match = html.match(/__NEXT_DATA__[^<]+/);
        if (match) {
          analysis.scraping_feasibility.initial_data = 'Next.js初期データあり（JSON-LD形式）';
        }
      }

      console.log(`   - Next.js: ${hasNextJs ? '〇' : '〇かも'}`);
      console.log(`   - React: ${hasReact ? '〇' : '×'}`);
      console.log(`   - Vue: ${hasVue ? '〇' : '×'}`);

      // JavaScriptリソースの概要
      const scriptCount = (html.match(/<script/g) || []).length;
      console.log(`   - スクリプトタグ数: ${scriptCount}`);
    }
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}`);
  }

  // 4. スクレイピング・API利用の推奨度
  console.log('\n4. スクレイピング・API利用推奨度の判定...');

  const recommendation = {
    scraping: 'moderate',
    api: 'not_confirmed',
    recommendation: []
  };

  // 判定ロジック
  if (analysis.schedule_and_results.has_json_ld || analysis.schedule_and_results.has_data_attributes) {
    recommendation.scraping = 'good';
    recommendation.recommendation.push('JSON-LDまたはdata属性によるスクレイピングが可能の可能性高い');
  }

  if (Object.values(analysis.api_endpoints).some(status => status === 200 || status === 404)) {
    recommendation.api = 'possible';
    recommendation.recommendation.push('APIエンドポイントが存在する可能性あり（詳細調査が必要）');
  }

  if (!analysis.schedule_and_results.error && analysis.schedule_and_results.html_contains && analysis.schedule_and_results.html_contains.grade_info) {
    recommendation.recommendation.push('レースグレード・距離・コース・馬場状態の取得: ✓ 可能（HTML解析で）');
  }

  analysis.scraping_feasibility.recommendation = recommendation.recommendation;

  // 5. JRDB代替案の検討
  console.log('\n5. JRDB（月2,380円）との比較...');
  analysis.scraping_feasibility.jrdb_alternative = {
    yahoo_cost: '0円（スクレイピング/公開API）',
    jrdb_cost: '¥2,380/月',
    yahoo_pros: [
      'コスト0円',
      'リアルタイムデータ',
      'Yahoo!と同じリソース'
    ],
    yahoo_cons: [
      'スクレイピング頼り（データ構造変更のリスク）',
      'レート制限の可能性',
      'robots.txt確認必要'
    ],
    jrdb_pros: [
      '公式API・信頼性高い',
      '過去データ完備',
      '高度な分析機能',
      '競馬予想AIに特化'
    ],
    jrdb_cons: [
      '月額費用',
      'APIドキュメント確認必要'
    ]
  };

  // 結果出力
  console.log('\n=== 分析完了 ===\n');
  console.log(JSON.stringify(analysis, null, 2));

  fs.writeFileSync(
    'd:/99_Webアプリ/競馬予想AI/yahoo_keiba_deep_analysis.json',
    JSON.stringify(analysis, null, 2)
  );

  console.log('\n✓ 詳細分析を yahoo_keiba_deep_analysis.json に保存しました');

  return analysis;
}

analyzeYahooKeiba().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
