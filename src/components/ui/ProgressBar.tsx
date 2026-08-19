import clsx from 'clsx';

export function ProgressBar({
  percent,
  tone = 'blue',
  height = 3,
}: {
  percent: number;
  tone?: 'blue' | 'red';
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-[var(--color-line-2)]"
      style={{ height }}
    >
      <div
        className={clsx('h-full rounded-full', tone === 'red' ? 'bg-[var(--color-red)]' : 'bg-[var(--color-blue)]')}
        style={{
          width: `${clamped}%`,
          transition: 'width 500ms cubic-bezier(.2,.8,.2,1)',
        }}
      />
    </div>
  );
}
