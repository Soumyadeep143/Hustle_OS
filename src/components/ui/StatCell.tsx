import type { Tone } from '../../lib/types';
import clsx from 'clsx';

const TONE_TEXT: Record<Tone, string> = {
  blue: 'text-[var(--color-blue)]',
  yellow: 'text-[var(--color-yellow)]',
  green: 'text-[var(--color-green)]',
  red: 'text-[var(--color-red)]',
  neutral: 'text-[var(--color-ink)]',
};

export function StatCell({
  value,
  label,
  tone = 'neutral',
  size = 34,
}: {
  value: string | number;
  label: string;
  tone?: Tone;
  size?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className={clsx('font-[var(--font-display)] font-semibold leading-none tracking-[-.03em]', TONE_TEXT[tone])}
        style={{ fontSize: size }}
      >
        {value}
      </div>
      <div className="text-[13px] text-[var(--color-ink-2)]">{label}</div>
    </div>
  );
}
