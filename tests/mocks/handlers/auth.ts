import { http, HttpResponse } from 'msw';

export const authHandlers = [
  // 認証状態確認
  http.get('/api/auth/status', () => {
    return HttpResponse.json({ authenticated: false, plan: 'free' });
  }),

  // 認証済みユーザー
  http.get('/api/auth/status/premium', () => {
    return HttpResponse.json({ authenticated: true, plan: 'premium' });
  }),
];
