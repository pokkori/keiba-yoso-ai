/**
 * Design System 2026 -- カテゴリ別テーマ定義
 *
 * 使い方:
 *   1. このファイルを各アプリの lib/ にコピー
 *   2. import { THEMES } from '@/lib/design-system-themes';
 *   3. const T = THEMES.legal;  // カテゴリを選択
 *   4. <main style={{ background: T.bg }} className="min-h-screen text-white">
 */

export interface AppTheme {
  /** メッシュグラデーション背景（main の style.background に設定） */
  bg: string;
  /** プライマリカラー（ボタン・アクセント） */
  primary: string;
  /** アクセントカラー（グラデーションの終点） */
  accent: string;
  /** ボタン用グラデーション */
  gradientBtn: string;
  /** ボタン用グローシャドウ */
  glowBtn: string;
  /** 見出し用グラデーションテキスト */
  gradientText: string;
  /** パーティクル色 */
  particleColor: string;
  /** 本文テキスト色 */
  textSecondary: string;
  /** 薄いテキスト色 */
  textMuted: string;
}

export const THEMES = {
  /** クレームAI / 契約書 / 相続 / パワハラ / 介護カスハラ / 医療クレーム */
  legal: {
    bg: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(37,99,235,0.08) 0%, transparent 50%), #0B0F1E',
    primary: '#3B82F6',
    accent: '#818CF8',
    gradientBtn: 'linear-gradient(135deg, #3B82F6, #818CF8)',
    glowBtn: '0 0 30px rgba(59,130,246,0.4), 0 0 60px rgba(129,140,248,0.15)',
    gradientText: 'linear-gradient(135deg, #BFDBFE, #FFFFFF, #C7D2FE)',
    particleColor: 'rgba(59,130,246,0.3)',
    textSecondary: 'rgba(147,197,253,0.8)',
    textMuted: 'rgba(147,197,253,0.5)',
  },

  /** 競馬 / 競輪 / ボートレース */
  betting: {
    bg: 'radial-gradient(ellipse at 20% 50%, rgba(220,38,38,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(234,179,8,0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(185,28,28,0.08) 0%, transparent 50%), #0F0A1E',
    primary: '#EF4444',
    accent: '#FBBF24',
    gradientBtn: 'linear-gradient(135deg, #EF4444, #FBBF24)',
    glowBtn: '0 0 30px rgba(239,68,68,0.4), 0 0 60px rgba(251,191,36,0.15)',
    gradientText: 'linear-gradient(135deg, #FECACA, #FFFFFF, #FDE68A)',
    particleColor: 'rgba(239,68,68,0.3)',
    textSecondary: 'rgba(252,165,165,0.8)',
    textMuted: 'rgba(252,165,165,0.5)',
  },

  /** 婚活 / 就活 / 老後 / 確定申告 / 補助金 / AI経営 / LifeCompass / 共同親権 */
  life: {
    bg: 'radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.10) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(5,150,105,0.08) 0%, transparent 50%), #0B1120',
    primary: '#10B981',
    accent: '#F59E0B',
    gradientBtn: 'linear-gradient(135deg, #10B981, #F59E0B)',
    glowBtn: '0 0 30px rgba(16,185,129,0.4), 0 0 60px rgba(245,158,11,0.15)',
    gradientText: 'linear-gradient(135deg, #A7F3D0, #FFFFFF, #FDE68A)',
    particleColor: 'rgba(16,185,129,0.3)',
    textSecondary: 'rgba(167,243,208,0.8)',
    textMuted: 'rgba(167,243,208,0.5)',
  },

  /** 占いAI / 告白LINE返信AI */
  romance: {
    bg: 'radial-gradient(ellipse at 20% 50%, rgba(120,80,200,0.18) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(200,80,180,0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(80,100,220,0.1) 0%, transparent 50%), #0B0B1E',
    primary: '#A855F7',
    accent: '#EC4899',
    gradientBtn: 'linear-gradient(135deg, #A855F7, #EC4899)',
    glowBtn: '0 0 30px rgba(168,85,247,0.4), 0 0 60px rgba(236,72,153,0.15)',
    gradientText: 'linear-gradient(135deg, #E9D5FF, #FFFFFF, #FBCFE8)',
    particleColor: 'rgba(168,85,247,0.3)',
    textSecondary: 'rgba(216,180,254,0.8)',
    textMuted: 'rgba(216,180,254,0.5)',
  },

  /** EC説明文 / SNS投稿 / SNS自動投稿 / Google口コミ / ECレビュー / バズるポスト / AI美肌 / ショートドラマ */
  aiWriter: {
    bg: 'radial-gradient(ellipse at 20% 50%, rgba(45,212,191,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.10) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(20,184,166,0.08) 0%, transparent 50%), #0A0F1E',
    primary: '#2DD4BF',
    accent: '#818CF8',
    gradientBtn: 'linear-gradient(135deg, #2DD4BF, #818CF8)',
    glowBtn: '0 0 30px rgba(45,212,191,0.4), 0 0 60px rgba(129,140,248,0.15)',
    gradientText: 'linear-gradient(135deg, #99F6E4, #FFFFFF, #C7D2FE)',
    particleColor: 'rgba(45,212,191,0.3)',
    textSecondary: 'rgba(153,246,228,0.8)',
    textMuted: 'rgba(153,246,228,0.5)',
  },
} as const satisfies Record<string, AppTheme>;

/**
 * サービス名 → テーマカテゴリのマッピング
 */
export const SERVICE_THEME_MAP: Record<string, keyof typeof THEMES> = {
  // 法律系
  'クレームAI': 'legal',
  '契約書AIレビュー': 'legal',
  '相続AI': 'legal',
  'パワハラ対策AI': 'legal',
  '介護カスハラAI': 'legal',
  '医療クレームAI': 'legal',
  '共同親権サポートAI': 'legal',

  // 予想系
  '競馬予想AI': 'betting',
  '競輪予想AI': 'betting',
  'ボートレース予想AI': 'betting',

  // ライフ系
  '婚活AI': 'life',
  '就活AI': 'life',
  '老後シミュレーターAI': 'life',
  '確定申告AI': 'life',
  '補助金AI': 'life',
  'AI経営計画書': 'life',
  'LifeCompassAI': 'life',

  // 恋愛系
  '占いAI': 'romance',
  '告白LINE返信AI': 'romance',

  // AI文章系
  'EC説明文生成AI': 'aiWriter',
  'SNS投稿生成AI': 'aiWriter',
  'SNS自動投稿管理': 'aiWriter',
  'Google口コミ返信AI': 'aiWriter',
  'ECレビュー返信AI': 'aiWriter',
  'バズるポスト生成アプリ': 'aiWriter',
  'AI美肌診断': 'aiWriter',
  'ショートドラマ台本AI': 'aiWriter',
  '経営レーダー': 'aiWriter',
};

/**
 * パーティクル設定（全ページ共通）
 */
export const PARTICLES = [
  { size: 4, x: '10%', y: '20%', dur: '6s', delay: '0s' },
  { size: 3, x: '85%', y: '15%', dur: '8s', delay: '1s' },
  { size: 5, x: '70%', y: '60%', dur: '7s', delay: '2s' },
  { size: 3, x: '25%', y: '75%', dur: '9s', delay: '0.5s' },
  { size: 4, x: '50%', y: '40%', dur: '10s', delay: '3s' },
  { size: 6, x: '90%', y: '80%', dur: '7s', delay: '1.5s' },
] as const;
