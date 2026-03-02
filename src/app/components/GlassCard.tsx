import { type ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** Use "lg" for main containers (stronger blur), "md" for inner cards */
  blur?: 'md' | 'lg';
  /** Extra hover interactivity */
  hoverable?: boolean;
  /** Render as a different HTML element */
  as?: 'div' | 'section' | 'article';
}

/**
 * GlassCard — Reusable glassmorphism container.
 *
 * Visual rules:
 *  - bg-white/10 + backdrop-blur-md (or lg for main containers)
 *  - border border-white/20
 *  - rounded-2xl + shadow-xl
 *  - Optional hover state: hover:bg-white/20 hover:shadow-2xl transition-all
 */
export function GlassCard({
  children,
  className = '',
  blur = 'md',
  hoverable = false,
  as: Tag = 'div',
}: GlassCardProps) {
  const blurClass = blur === 'lg' ? 'backdrop-blur-lg' : 'backdrop-blur-md';
  const hoverClass = hoverable
    ? 'hover:bg-white/20 hover:shadow-2xl hover:-translate-y-0.5'
    : '';

  return (
    <Tag
      className={`
        bg-white/10 ${blurClass} border border-white/20 rounded-2xl shadow-xl
        bg-gradient-to-br from-white/20 to-white/5
        transition-all duration-300 ease-out
        ${hoverClass}
        ${className}
      `}
    >
      {children}
    </Tag>
  );
}

/** Lighter inner card — rounded-xl, less opacity */
export function GlassInner({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white/5 border border-white/10 rounded-xl ${className}`}
    >
      {children}
    </div>
  );
}
