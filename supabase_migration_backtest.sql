-- Supabase migration: バックテストDB用テーブル作成
-- Supabase SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS keiba_prediction_logs (
  id BIGSERIAL PRIMARY KEY,
  race_id TEXT NOT NULL,
  race_name TEXT NOT NULL DEFAULT '',
  race_date DATE NOT NULL,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('buy', 'skip')),
  horse_num INTEGER,
  horse_name TEXT,
  ev NUMERIC(5, 2),
  odds NUMERIC(6, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actual_pos INTEGER,
  hit BOOLEAN,
  return_amount INTEGER, -- 100円購入時の払い戻し金額
  updated_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX IF NOT EXISTS keiba_prediction_logs_race_date_idx ON keiba_prediction_logs (race_date);
CREATE INDEX IF NOT EXISTS keiba_prediction_logs_recommendation_idx ON keiba_prediction_logs (recommendation);

-- RLS（Row Level Security）
ALTER TABLE keiba_prediction_logs ENABLE ROW LEVEL SECURITY;

-- サービスロールキーは全操作可（API Route から使用）
-- 公開読み取りは許可しない（APIルート経由で集計値のみ公開）
CREATE POLICY "service_role_full_access" ON keiba_prediction_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
