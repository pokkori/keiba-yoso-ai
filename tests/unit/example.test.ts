import { describe, it, expect } from 'vitest';

describe('基本テスト', () => {
  it('環境が正しく設定されている', () => {
    expect(true).toBe(true);
  });

  it('数値計算が正確', () => {
    expect(1 + 1).toBe(2);
  });
});
