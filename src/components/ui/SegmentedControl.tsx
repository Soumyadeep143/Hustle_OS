import clsx from 'clsx';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'rounded-[calc(var(--radius-control)-2px)] px-4 py-1.5 text-[13px] font-medium transition-all',
            value === opt.value
              ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm'
              : 'text-[var(--color-ink-2)]'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
