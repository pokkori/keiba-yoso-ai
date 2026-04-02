import { http, HttpResponse } from 'msw';

export const aiHandlers = [
  // 正常レスポンス
  http.post('/api/predict', () => {
    return HttpResponse.json({
      content: 'テスト用AI予想コンテンツです。これはモックレスポンスです。',
    });
  }),

  // 429 レート制限
  http.post('/api/predict/rate-limited', () => {
    return new HttpResponse(null, {
      status: 429,
      headers: { 'retry-after': '60' },
    });
  }),

  // 500 サーバーエラー
  http.post('/api/predict/error', () => {
    return new HttpResponse(null, { status: 500 });
  }),
];
