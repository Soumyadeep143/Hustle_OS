import type { Tone } from '../../lib/types';
import clsx from 'clsx';

const TONE_STYLES: Record<Tone, string> = {
  blue: 'bg-[var(--color-blue-soft)] text-[var(--color-blue)]',
  yellow: 'bg-[var(--color-yellow-soft)] text-[var(--color-yellow)]',
  red: 'bg-[var(--color-red-soft)] text-[var(--color-red)]',
  neutral: 'bg-[var(--color-line-2)] text-[var(--color-ink-2)]',
};

export function Chip({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-[var(--radius-chip)] px-2 py-1 text-[9.5px] font-semibold uppercase leading-none tracking-[.13em]',
        TONE_STYLES[tone]
      )}
    >
      {children}
    </span>
  );
}
