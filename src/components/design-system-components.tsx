'use client';
/**
 * Design System 2026 -- 共有UIコンポーネント
 *
 * 使い方:
 *   1. このファイルを各アプリの components/ にコピー
 *   2. import { GlassCard, GradientButton, ... } from '@/components/design-system-components';
 */

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppTheme } from '@/lib/design-system-themes';

/* ================================================================
   A. レイアウト
   ================================================================ */

/** メッシュグラデーション背景 + パーティクル */
export function AppShell({
  theme,
  children,
}: {
  theme: AppTheme;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen text-white relative" style={{ background: theme.bg }}>
      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {[
          { size: 4, x: '10%', y: '20%', dur: '6s', delay: '0s' },
          { size: 3, x: '85%', y: '15%', dur: '8s', delay: '1s' },
          { size: 5, x: '70%', y: '60%', dur: '7s', delay: '2s' },
          { size: 3, x: '25%', y: '75%', dur: '9s', delay: '0.5s' },
          { size: 4, x: '50%', y: '40%', dur: '10s', delay: '3s' },
          { size: 6, x: '90%', y: '80%', dur: '7s', delay: '1.5s' },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: p.size,
              height: p.size,
              left: p.x,
              top: p.y,
              background: theme.particleColor,
              animationDuration: p.dur,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </main>
  );
}

/** セクションラッパー（交互背景） */
export function Section({
  children,
  alt = false,
  className = '',
}: {
  children: ReactNode;
  alt?: boolean;
  className?: string;
}) {
  return (
    <section className={`py-16 relative ${className}`}>
      {alt && <div className="absolute inset-0 bg-white/[0.04] border-y border-white/5" />}
      {!alt && <div className="absolute inset-0 bg-white/[0.02]" />}
      <div className="relative z-10 max-w-4xl mx-auto px-6">{children}</div>
    </section>
  );
}

/** セクション見出し */
export function SectionHeader({
  label,
  title,
  subtitle,
  theme,
}: {
  label?: string;
  title: string;
  subtitle?: string;
  theme: AppTheme;
}) {
  return (
    <div className="text-center mb-10">
      {label && (
        <span
          className="inline-flex items-center text-xs font-bold px-3 py-1 rounded-full bg-white/10 border border-white/15 mb-3"
          style={{ color: theme.primary }}
        >
          {label}
        </span>
      )}
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{title}</h2>
      {subtitle && <p className="text-sm text-white/50">{subtitle}</p>}
    </div>
  );
}

/* ================================================================
   B. カード
   ================================================================ */

/** グラスモーフィズムカード S / M / L */
export function GlassCard({
  size = 'M',
  children,
  className = '',
  hover = false,
}: {
  size?: 'S' | 'M' | 'L';
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  const base = {
    S: 'backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4 shadow-lg',
    M: 'backdrop-blur-md bg-white/[0.07] border border-white/15 rounded-2xl p-6 shadow-xl',
    L: 'backdrop-blur-lg bg-white/[0.08] border border-white/20 rounded-3xl p-8 shadow-2xl',
  }[size];

  const hoverCls = hover
    ? 'hover:bg-white/10 hover:border-white/25 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out'
    : '';

  return <div className={`${base} ${hoverCls} ${className}`}>{children}</div>;
}

/* ================================================================
   C. ボタン
   ================================================================ */

/** グラデーション + グローボタン */
export function GradientButton({
  theme,
  size = 'M',
  children,
  className = '',
  onClick,
  href,
  ariaLabel,
  type = 'button',
}: {
  theme: AppTheme;
  size?: 'S' | 'M' | 'L';
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit';
}) {
  const sizeClass = {
    S: 'text-sm px-6 py-2.5 rounded-lg',
    M: 'text-sm font-bold px-8 py-3.5 rounded-xl',
    L: 'text-lg font-bold px-10 py-4 rounded-full',
  }[size];

  const cls = `inline-flex items-center justify-center gap-2 text-white
    ${sizeClass}
    transition-all duration-300 ease-out
    hover:scale-105 active:scale-95
    min-h-[44px] min-w-[44px]
    ${className}`;

  const style = {
    background: theme.gradientBtn,
    boxShadow: theme.glowBtn,
  };

  if (href) {
    return (
      <a href={href} className={cls} style={style} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={cls} style={style} aria-label={ariaLabel} type={type}>
      {children}
    </button>
  );
}

/** ゴーストボタン */
export function GhostButton({
  children,
  className = '',
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5
        text-white/80 font-medium text-sm px-6 py-2.5 rounded-full
        backdrop-blur-sm bg-white/5 border border-white/10
        hover:bg-white/10 hover:border-white/25 hover:text-white
        transition-all duration-300 ease-out
        min-h-[44px] min-w-[44px]
        ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

/* ================================================================
   D. テキスト
   ================================================================ */

/** グラデーション見出しテキスト */
export function GradientText({
  theme,
  children,
  as: Tag = 'h1',
  className = '',
}: {
  theme: AppTheme;
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'span';
  className?: string;
}) {
  const defaultSize = {
    h1: 'text-4xl md:text-5xl font-extrabold leading-tight',
    h2: 'text-2xl md:text-3xl font-bold',
    h3: 'text-xl font-bold',
    span: '',
  }[Tag];

  return (
    <Tag className={`${defaultSize} ${className}`}>
      <span
        style={{
          background: theme.gradientText,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {children}
      </span>
    </Tag>
  );
}

/* ================================================================
   E. バッジ
   ================================================================ */

export function Badge({
  theme,
  children,
  variant = 'primary',
}: {
  theme?: AppTheme;
  children: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error';
}) {
  const colors = {
    primary: { bg: 'bg-white/10', text: theme?.primary ?? '#3B82F6', border: `border-[${theme?.primary ?? '#3B82F6'}]/20` },
    success: { bg: 'bg-emerald-500/10', text: '#34D399', border: 'border-emerald-500/20' },
    warning: { bg: 'bg-amber-500/10', text: '#FBBF24', border: 'border-amber-500/20' },
    error: { bg: 'bg-rose-500/10', text: '#FB7185', border: 'border-rose-500/20' },
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full
        ${colors.bg} border backdrop-blur-sm`}
      style={{ color: colors.text, borderColor: `${colors.text}33` }}
    >
      {children}
    </span>
  );
}

/* ================================================================
   F. 統計カウンター
   ================================================================ */

export function StatsBar({ items }: { items: { num: string; label: string }[] }) {
  return (
    <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
      <div className="flex flex-wrap justify-center gap-8 text-center">
        {items.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center min-w-[80px]">
            <span className="text-2xl font-black text-white">{stat.num}</span>
            <span className="text-xs text-white/50 mt-1">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   G. フォーム要素
   ================================================================ */

export function DarkInput({
  theme,
  ...props
}: {
  theme: AppTheme;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl px-4 py-3
        bg-white/5 border border-white/10 text-white placeholder-white/30
        focus:outline-none focus:ring-2 focus:border-transparent
        transition-all duration-200 ${props.className ?? ''}`}
      style={{ ...props.style, '--tw-ring-color': `${theme.primary}80` } as React.CSSProperties}
    />
  );
}

export function DarkTextarea({
  theme,
  ...props
}: {
  theme: AppTheme;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl px-4 py-3 min-h-[120px]
        bg-white/5 border border-white/10 text-white placeholder-white/30
        focus:outline-none focus:ring-2 focus:border-transparent
        transition-all duration-200 resize-y ${props.className ?? ''}`}
      style={{ ...props.style, '--tw-ring-color': `${theme.primary}80` } as React.CSSProperties}
    />
  );
}

export function DarkSelect({
  theme,
  children,
  ...props
}: {
  theme: AppTheme;
  children: ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl px-4 py-3
        bg-white/5 border border-white/10 text-white
        focus:outline-none focus:ring-2 focus:border-transparent
        appearance-none transition-all duration-200 ${props.className ?? ''}`}
      style={{ ...props.style, '--tw-ring-color': `${theme.primary}80` } as React.CSSProperties}
    >
      {children}
    </select>
  );
}

/* ================================================================
   H. スクロールアニメーション Hook
   ================================================================ */

export function useScrollAnimation(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

/** スクロールで表示されるラッパー */
export function ScrollReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <div
      ref={ref}
      className={`${isVisible ? 'animate-fade-in-up' : 'opacity-0'} ${className}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

/* ================================================================
   I. ナビゲーション
   ================================================================ */

export function NavBar({
  theme,
  serviceName,
  ctaText = '無料で使う',
  ctaHref = '/tool',
  logo,
}: {
  theme: AppTheme;
  serviceName: string;
  ctaText?: string;
  ctaHref?: string;
  logo?: ReactNode;
}) {
  return (
    <nav className="px-6 py-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <span className="font-bold text-lg flex items-center gap-2 text-white">
          {logo}
          {serviceName}
        </span>
        <a
          href={ctaHref}
          className="text-white text-sm font-medium px-5 py-2.5 rounded-full
            transition-all duration-300 hover:scale-105 min-h-[44px] flex items-center"
          style={{
            background: theme.gradientBtn,
            boxShadow: `0 0 20px ${theme.primary}4D`,
          }}
          aria-label={`${serviceName}を${ctaText}`}
        >
          {ctaText}
        </a>
      </div>
    </nav>
  );
}

/* ================================================================
   J. フッター
   ================================================================ */

export function AppFooter({
  serviceName,
  disclaimer,
  legalHref = '/legal',
  privacyHref = '/privacy',
}: {
  serviceName: string;
  disclaimer?: string;
  legalHref?: string;
  privacyHref?: string;
}) {
  return (
    <footer className="py-12 px-6 border-t border-white/5">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-white/30 text-xs mb-4">
          &copy; {new Date().getFullYear()} {serviceName}.{' '}
          {disclaimer ?? 'AI生成結果は参考情報です。専門家への相談を推奨します。'}
        </p>
        <div className="flex justify-center gap-6 text-xs">
          <a
            href={legalHref}
            className="text-white/40 hover:text-white/70 transition-colors min-h-[44px] flex items-center"
          >
            特定商取引法に基づく表記
          </a>
          <a
            href={privacyHref}
            className="text-white/40 hover:text-white/70 transition-colors min-h-[44px] flex items-center"
          >
            プライバシーポリシー
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================
   K. 社会的証明（お客様の声）
   ================================================================ */

export function TestimonialCard({
  role,
  text,
}: {
  role: string;
  text: string;
}) {
  return (
    <div className="backdrop-blur-md bg-white/[0.07] border border-white/15 rounded-2xl p-6">
      <div className="flex gap-0.5 mb-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <p className="text-sm text-white/70 leading-relaxed mb-3">{text}</p>
      <p className="text-xs text-white/40">{role}</p>
    </div>
  );
}

/* ================================================================
   L. ステップ（使い方）
   ================================================================ */

export function HowToSteps({
  theme,
  steps,
}: {
  theme: AppTheme;
  steps: { step: string; title: string; desc: string }[];
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {steps.map((s, i) => (
        <div
          key={s.step}
          className={`backdrop-blur-md bg-white/[0.07] border border-white/15 rounded-2xl p-6
            animate-fade-in-up stagger-${i + 1}`}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{ background: theme.gradientBtn }}
            >
              {s.step}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">{s.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
