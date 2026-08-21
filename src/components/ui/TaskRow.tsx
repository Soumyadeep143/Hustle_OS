import { Check } from 'lucide-react';
import clsx from 'clsx';

export function TaskRow({
  title,
  meta,
  done,
  urgent,
  onToggle,
}: {
  title: string;
  meta: string;
  done: boolean;
  urgent?: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 border-b border-[var(--color-line-2)] py-3 last:border-b-0 transition-opacity',
        done && 'opacity-45'
      )}
    >
      <button
        onClick={onToggle}
        className={clsx(
          'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90',
          done
            ? 'border-[var(--color-blue)] bg-[var(--color-blue)] text-white'
            : urgent
              ? 'border-[var(--color-red)]'
              : 'border-[var(--color-line)]'
        )}
        style={{ transitionDuration: '220ms' }}
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
      >
        {done && <Check size={13} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={clsx(
            'truncate text-[15.5px] font-medium leading-[1.35] text-[var(--color-ink)]',
            done && 'line-through'
          )}
        >
          {title}
        </div>
        <div className={clsx('truncate text-[13px]', urgent && !done ? 'text-[var(--color-red)]' : 'text-[var(--color-ink-2)]')}>
          {meta}
        </div>
      </div>
    </div>
  );
}
