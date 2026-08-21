import { Globe } from 'lucide-react';
import type { RecallSource } from '../../services/api';

// lucide-react dropped brand/logo icons, so each recognized source gets a
// small hand-drawn monochrome badge instead of a borrowed brand asset —
// legible at a glance, not a trademarked logo reproduction.
const SOURCE_STYLE: Record<Exclude<RecallSource, 'other'>, { bg: string; fg: string }> = {
  linkedin: { bg: '#0A66C2', fg: '#fff' },
  x: { bg: '#0A0A0A', fg: '#fff' },
  instagram: { bg: '#C13584', fg: '#fff' },
  reddit: { bg: '#FF4500', fg: '#fff' },
};

export function SourceIcon({ source, size = 22 }: { source: RecallSource; size?: number }) {
  if (source === 'other') {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-[7px]"
        style={{ width: size, height: size, background: 'var(--color-line-2)' }}
      >
        <Globe size={Math.round(size * 0.62)} className="text-[var(--color-ink-3)]" />
      </div>
    );
  }

  const { bg, fg } = SOURCE_STYLE[source];
  const glyph: Record<Exclude<RecallSource, 'other'>, React.ReactNode> = {
    linkedin: (
      <span style={{ fontSize: size * 0.5, fontWeight: 800, letterSpacing: '-0.03em' }}>in</span>
    ),
    x: <span style={{ fontSize: size * 0.5, fontWeight: 700 }}>𝕏</span>,
    instagram: (
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth={2}>
        <rect x="2" y="2" width="20" height="20" rx="6" />
        <circle cx="12" cy="12" r="4.6" />
        <circle cx="17.2" cy="6.8" r="1.1" fill={fg} stroke="none" />
      </svg>
    ),
    reddit: <span style={{ fontSize: size * 0.55, fontWeight: 800 }}>r</span>,
  };

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[7px]"
      style={{ width: size, height: size, background: bg, color: fg, lineHeight: 1 }}
    >
      {glyph[source]}
    </div>
  );
}

export function sourceLabel(source: RecallSource, sourceDisplay: string): string {
  return sourceDisplay || source;
}
