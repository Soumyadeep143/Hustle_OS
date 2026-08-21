import type { Tone } from '../../lib/types';
import { Chip } from './Chip';
import clsx from 'clsx';

const DOT_TONE: Record<Tone, string> = {
  blue: 'bg-[var(--color-blue)]',
  yellow: 'bg-[var(--color-yellow-ink)]',
  green: 'bg-[var(--color-green-ink)]',
  red: 'bg-[var(--color-red)]',
  neutral: 'bg-[var(--color-ink-3)]',
};

export function TimelineRow({
  at,
  title,
  subtitle,
  tone = 'neutral',
  flag,
}: {
  at: string;
  title: string;
  subtitle: string;
  tone?: Tone;
  flag?: string;
}) {
  return (
    <div className="grid grid-cols-[62px_1px_1fr] gap-x-[14px]">
      <div className="pt-0.5 text-right font-[var(--font-mono)] text-[11px] font-medium tracking-[.06em] text-[var(--color-ink-3)] whitespace-nowrap">
        {at}
      </div>
      <div className="relative flex justify-center">
        <div className="w-px bg-[var(--color-line)]" />
        <span
          className={clsx('absolute top-0.5 h-2 w-2 rounded-full ring-[3px] ring-[var(--color-bg)]', DOT_TONE[tone])}
        />
      </div>
      <div className="pb-5">
        <div className="font-[var(--font-display)] text-[16px] font-semibold leading-[1.25] text-[var(--color-ink)]">
          {title}
        </div>
        <div className="mt-0.5 text-[13px] text-[var(--color-ink-2)]">{subtitle}</div>
        {flag && (
          <div className="mt-1.5">
            <Chip tone={tone === 'red' ? 'red' : 'blue'}>{flag}</Chip>
          </div>
        )}
      </div>
    </div>
  );
}
