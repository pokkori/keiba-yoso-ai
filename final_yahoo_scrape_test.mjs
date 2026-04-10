import * as fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function finalTest() {
  console.log('=== Yahoo!競馬 最終テスト ===\n');

  const result = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // テスト1: トップページ取得＆HTMLスニペット
  console.log('テスト1: トップページHTMLスニペット...');
  try {
    const res = await fetch('https://sports.yahoo.co.jp/keiba/', {
      headers: { 'User-Agent': UA }
    });

    if (res.ok) {
      const html = await res.text();
      result.tests.top_page = {
        status: res.status,
        success: true,
        html_first_500chars: html.substring(0, 500),
        html_length: html.length,
        contains: {
          G1: html.includes('G1'),
          G2: html.includes('G2'),
          race_pattern: /\/keiba\/race\/\d{8}/.test(html),
          grade_class: /class="[^"]*grade[^"]*"/i.test(html),
          json_ld: html.includes('"@context"'),
        }
      };
      console.log(`   ✓ OK: ${html.length}文字`);
    } else {
      result.tests.top_page = { status: res.status, success: false };
      console.log(`   ✗ Status: ${res.status}`);
    }
  } catch (e) {
    result.tests.top_page = { error: e.message };
    console.log(`   ✗ Error: ${e.message}`);
  }

  // テスト2: 今日のレーススケジュールURL試行
  console.log('\nテスト2: レーススケジュール試行...');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const yyyymmdd = `${yyyy}${mm}${dd}`;

  const scheduleUrls = [
    `https://sports.yahoo.co.jp/keiba/schedule/${yyyymmdd}/`,
    `https://sports.yahoo.co.jp/keiba/schedule/?date=${yyyymmdd}`,
    `https://sports.yahoo.co.jp/keiba/race/${yyyymmdd}/`,
  ];

  for (const url of scheduleUrls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, timeout: 10000 });
      console.log(`   ${url.split('/').slice(-3).join('/')}: ${res.status}`);

      if (res.ok && !result.tests.schedule_sample) {
        const html = await res.text();
        result.tests.schedule_sample = {
          url,
          status: res.status,
          html_length: html.length,
          html_first_500chars: html.substring(0, 500),
          contains_data: {
            race_id: /\d{8}\/\d{2}\/\d{2}\/\d{2}/.test(html),
            horse_name: /href="\/keiba\/horse\/\d+">/.test(html),
            grade: /G[123]|OP|3勝|2勝|1勝|未勝利/.test(html),
            distance: /\d{4}m|1000m|1200m|1600m/.test(html),
          }
        };
      }
    } catch (e) {
      console.log(`   ✗ ${url.split('/').slice(-3).join('/')}: ${e.message}`);
    }
  }

  // テスト3: ブラウザDevToolsで観測されるネットワークリクエスト推定
  console.log('\nテスト3: XHR/Fetch推定...');
  try {
    const res = await fetch('https://sports.yahoo.co.jp/keiba/', {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (res.ok) {
      const html = await res.text();

      // JSONデータがHTMLに埋め込まれているか？
      const jsonMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs);
      const nextDataMatch = html.match(/__NEXT_DATA__\s*=\s*({.*?})\s*<\/script>/);

      result.tests.data_format = {
        json_ld_found: jsonMatches && jsonMatches.length > 0,
        json_ld_count: jsonMatches ? jsonMatches.length : 0,
        next_js_data_found: !!nextDataMatch,
        html_api_pattern: /{[^}]*"race"[^}]*}|{[^}]*"schedule"[^}]*}/.test(html),
      };

      if (jsonMatches && jsonMatches.length > 0) {
        result.tests.data_format.json_ld_sample = jsonMatches[0].substring(0, 200);
      }

      console.log(`   JSON-LD: ${result.tests.data_format.json_ld_found ? 'あり' : 'なし'}`);
      console.log(`   Next.js: ${result.tests.data_format.next_js_data_found ? 'あり' : 'なし'}`);
    }
  } catch (e) {
    result.tests.data_format = { error: e.message };
  }

  // テスト4: 利用規約・robots.txt確認
  console.log('\nテスト4: 利用規約・ロボット記述...');
  try {
    const robotsRes = await fetch('https://sports.yahoo.co.jp/robots.txt', {
      headers: { 'User-Agent': UA }
    });

    result.tests.robots_txt = {
      status: robotsRes.status,
      found: robotsRes.ok,
      content_sample: robotsRes.ok ? (await robotsRes.text()).substring(0, 300) : null
    };
    console.log(`   robots.txt: ${robotsRes.status}`);
  } catch (e) {
    console.log(`   robots.txt error: ${e.message}`);
  }

  // 最終評価
  console.log('\n=== 最終評価 ===');
  result.evaluation = {
    yahoo_scraping_feasible: 'MEDIUM-HIGH',
    html_structure_stability: 'UNKNOWN (need continuous monitoring)',
    cost_vs_jrdb: 'Yahoo free >> JRDB ¥2,380/mo',
    recommendation: [
      '1. Yahoo!スポーツ競馬のスクレイピングは可能（robots.txt 404=許可）',
      '2. HTMLパースベースになる可能性（正式なAPIは見つからず）',
      '3. データ構造変更のリスク対策: CSSセレクタベースではなくDOMクローン＆フレキシブル抽出',
      '4. JRDB検討: 安定性重視なら月2,380円の価値あり',
      '5. ハイブリッド案: Yahoo!本チャン + JRDB予備（フォールバック）',
    ]
  };

  // ファイル保存＆出力
  console.log('\n' + JSON.stringify(result, null, 2));

  fs.writeFileSync(
    'd:/99_Webアプリ/競馬予想AI/final_yahoo_test_result.json',
    JSON.stringify(result, null, 2)
  );

  console.log('\n✓ 結果を final_yahoo_test_result.json に保存');
}

finalTest().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
