import clsx from 'clsx';

const TONE_BG: Record<'blue' | 'red' | 'yellow', string> = {
  blue: 'bg-[var(--color-blue)]',
  red: 'bg-[var(--color-red)]',
  yellow: 'bg-[var(--color-yellow-ink)]',
};

export function ProgressBar({
  percent,
  tone = 'blue',
  height = 3,
}: {
  percent: number;
  tone?: 'blue' | 'red' | 'yellow';
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-[var(--color-line-2)]"
      style={{ height }}
    >
      <div
        className={clsx('h-full rounded-full', TONE_BG[tone])}
        style={{
          width: `${clamped}%`,
          transition: 'width 500ms cubic-bezier(.2,.8,.2,1)',
        }}
      />
    </div>
  );
}
